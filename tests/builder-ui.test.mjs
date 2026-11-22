import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from '../server/serve.mjs';
import {validateTemplateFiles} from '../server/template-engine/design-policy.mjs';
import '../web/builder-flow.js';
const B=globalThis.DraftmangoBuilderFlow;
const plan=B.plan({kind:'store',name:'Everyday Socks',audience:'Adults in the UK',goal:'Sell comfortable socks',offering:'Cotton socks',region:'United Kingdom',content:'Owner will supply products and prices',brand:'Preserve the fashion template',templateId:'fashion-store-1',pages:[],workflows:['Choose a product and complete checkout'],connections:[],assumptions:['Guest checkout is available']});
const question={id:'audience',title:'Who are your socks for?',options:['Everyday wear','Sports and running'],recommended:0};
const provider=value=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});

test('browser: guided answers persist, confirmation gates building, and the send button cancels with an empty composer', {timeout:90000}, async t=>{
 const requests=[],errors=[];let releaseBuild,hold=true;
 const server=createServer({accountSession:async()=>null,cooldownMs:0,
  configLoader:async()=>({provider:'anthropic',key:'mock-key',model:'claude-sonnet-5-5',maxTokens:8192}),
  modelCatalogLoader:async()=>({defaultId:'anthropic:claude-sonnet-5-5',models:[{id:'anthropic:claude-sonnet-5-5',label:'Claude',provider:'anthropic',service:'Claude',configured:true}]}),
  buildProject:async()=>({html:'<!doctype html><html><body>Isolated preview fixture</body></html>'}),
  fetchImpl:async(_url,opts)=>{
   const messages=JSON.parse(opts.body).messages,input=JSON.parse(messages[0].content);if(input.interaction==='conversation')input.prompt=messages.at(-1).content;requests.push(input);
   if(input.libraryCandidates)return provider(String(input.prompt).includes('Everyday wear')?{message:'Here is the proposed site. Review it before building.',questions:[],plan}:{message:'Let’s clarify your audience.',questions:[question],plan:null});
   if(hold)await new Promise(resolve=>{releaseBuild=resolve;});
   return provider({action:'reply',title:'Socks',message:'No field changes in this fixture.',edits:[],colours:[]});
  }
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{releaseBuild?.();server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(base+'/workspace?preview#idea=Sell+socks&template=fashion-store-1');
 try {await page.waitForSelector('.builder-questions',{timeout:12000});}catch(error){throw new Error(JSON.stringify({errors,requests:requests.length,url:page.url(),body:(await page.locator('body').innerText()).slice(-2500)}),{cause:error});}
 assert.equal(requests.length,1);assert.equal(await page.locator('.agent-stop,#cancel-ai').count(),0);
 const original=await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files));
 // Custom answers are available and survive progress rerenders without being auto-submitted.
 await page.getByText('Something else',{exact:true}).click();
 await page.getByRole('textbox',{name:'Custom answer: '+question.title}).fill('Everyday wear for adults in the UK');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.waitForSelector('.builder-plan');assert.equal(requests.length,2);
 assert.ok(requests[1].prompt.includes('Everyday wear for adults in the UK'));
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 await page.reload();await page.waitForSelector('.builder-plan');assert.equal(requests.length,2);
 await page.locator('.builder-plan-section').filter({has:page.locator('summary',{hasText:'Pages'})}).locator('summary').click();
 assert.ok(await page.getByText('Order history',{exact:true}).isVisible());
 assert.equal(await page.locator('.builder-primary').evaluate(el=>getComputedStyle(el).color!==getComputedStyle(el).backgroundColor),true);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-plan-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('#project-sidebar').getBoundingClientRect().right<=1);
 await page.waitForFunction(()=>document.querySelector('#chat-form .send-button').getBoundingClientRect().right<=window.innerWidth);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-plan-mobile.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.getByRole('button',{name:'Build this plan',exact:true}).click();
 await page.waitForFunction(()=>DraftmangoEditor.busy&&document.querySelector('.agent-plan').textContent.includes('Content pass'));
 assert.equal(await page.locator('#chat-input').inputValue(),'');
 const stop=page.getByRole('button',{name:'Stop generation',exact:true});
 assert.equal(await stop.getAttribute('type'),'button');assert.equal(await stop.isEnabled(),true);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-working-mobile.png')});
 await stop.click();await page.waitForFunction(()=>!DraftmangoEditor.busy);
 assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).getAttribute('type'),'submit');
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 releaseBuild?.();hold=false;
 await page.getByRole('button',{name:'Build this plan',exact:true}).click();
 await page.waitForSelector('.builder-checklist',{timeout:60000});
 await page.waitForFunction(()=>!DraftmangoEditor.busy);
 assert.ok((await page.locator('.builder-checklist').innerText()).includes('Connection needed'));
 assert.equal(await page.evaluate(()=>DraftmangoEditor.project.workspace.builder.phase),'built');
 const savedFiles=await page.evaluate(()=>DraftmangoEditor.project.files);assert.equal(validateTemplateFiles(JSON.parse(savedFiles['template.lock.json']),savedFiles).valid,true);
 await page.reload();await page.waitForSelector('.builder-checklist');
 assert.ok(await page.evaluate(()=>DraftmangoEditor.project.messages.at(-1).activity.updates.length>1));
 assert.deepEqual(errors,[]);
});

test('browser: question rendering handles custom validation, disabled controls and reduced motion', {timeout:20000},async t=>{
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.setContent('<main id="root"></main><button class="send-button" data-busy="true"><svg class="send-icon"></svg><span class="stop-icon"></span></button>');
 await page.addScriptTag({path:new URL('../web/builder-flow.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.addScriptTag({path:new URL('../web/builder-prompts.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.addStyleTag({path:new URL('../web/builder-flow.css',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.evaluate(q=>{globalThis.answers=[];globalThis.state={version:1,phase:'discovery',plan:null,checks:[],questions:[q]};globalThis.paint=busy=>DraftmangoBuilderPrompts.render(document.querySelector('#root'),state,{answer:v=>answers.push(v)},busy);paint(false);},question);
 await page.getByText('Something else',{exact:true}).click();
 await page.getByRole('textbox').fill('  ');await page.getByRole('button',{name:'Continue'}).click();assert.equal(await page.evaluate(()=>answers.length),0);
 await page.getByRole('textbox').fill('Socks for hikers');await page.evaluate(()=>paint(true));assert.equal(await page.getByRole('button',{name:'Continue'}).isDisabled(),true);
 await page.evaluate(()=>paint(false));assert.equal(await page.getByRole('textbox').inputValue(),'Socks for hikers');
 await page.getByRole('button',{name:'Continue'}).click();assert.ok((await page.evaluate(()=>answers[0])).includes('Socks for hikers'));
 assert.equal(await page.locator('.stop-icon').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
});
