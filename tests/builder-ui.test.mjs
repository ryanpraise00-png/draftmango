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
plan.store=B.storeBrief({fulfilment:'physical',currency:'gbp',country:'GB',supportEmail:null,shippingCountries:['GB'],shippingAmount:null,taxBasisPoints:null,products:[{name:'Cotton socks',variants:[{label:'Medium',price:1500,stock:null}]}]});
const question={id:'audience',title:'Who are your socks for?',options:['Everyday wear','Sports and running'],recommended:0};
const provider=value=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});

test('browser: guided answers persist, confirmation gates building, and the send button cancels with an empty composer', {timeout:90000}, async t=>{
 const requests=[],errors=[];let releaseBuild,releaseAnswer,hold=true;
 const server=createServer({accountSession:async()=>null,cooldownMs:0,
  configLoader:async()=>({provider:'anthropic',key:'mock-key',model:'claude-sonnet-5-5',maxTokens:8192}),
  modelCatalogLoader:async()=>({defaultId:'anthropic:claude-sonnet-5-5',models:[{id:'anthropic:claude-sonnet-5-5',label:'Claude',provider:'anthropic',service:'Claude',configured:true}]}),
  buildProject:async()=>({html:'<!doctype html><html><body>Isolated preview fixture</body></html>'}),
  fetchImpl:async(_url,opts)=>{
   const messages=JSON.parse(opts.body).messages,input=JSON.parse(messages[0].content);if(input.interaction==='conversation')input.prompt=messages.at(-1).content;requests.push(input);
   if(input.libraryCandidates){if(String(input.prompt).includes('Everyday wear'))await new Promise(resolve=>{releaseAnswer=resolve;});return provider(String(input.prompt).includes('Everyday wear')?{message:'Here is the proposed site. Review it before building.',questions:[],plan}:{message:'Let’s clarify your audience.',questions:[question],plan:null});}
   if(hold)await new Promise(resolve=>{releaseBuild=resolve;});
   return provider({action:'reply',title:'Socks',message:'No field changes in this fixture.',edits:[],colours:[]});
  }
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{releaseBuild?.();releaseAnswer?.();server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(base+'/workspace?preview#idea=Sell+socks&template=fashion-store-1');
 try {await page.waitForSelector('.builder-questions',{timeout:12000});}catch(error){throw new Error(JSON.stringify({errors,requests:requests.length,url:page.url(),body:(await page.locator('body').innerText()).slice(-2500)}),{cause:error});}
 assert.equal(requests.length,1);assert.equal(await page.locator('.agent-stop,#cancel-ai').count(),0);
 const original=await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files));
 // Cards let the user review a choice; selecting it is never a request.
 assert.equal(await page.getByRole('radio',{name:'Everyday wear Recommended',exact:true}).isChecked(),true);
 await page.getByRole('radio',{name:'Sports and running',exact:true}).check();
 assert.equal(requests.length,1);
 await page.locator('.builder-questions').screenshot({path:path.join(tmpdir(),'draftmango-question-card-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('#project-sidebar').getBoundingClientRect().right<=1);
 await page.locator('.builder-questions').scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-question-card-mobile.png')});
 await page.setViewportSize({width:1440,height:1000});
 // A custom answer uses the same explicit submission action.
 await page.getByText('Something else',{exact:true}).click();
 await page.getByRole('textbox',{name:'Your answer: '+question.title}).fill('Everyday wear for adults in the UK');
 await page.getByRole('button',{name:'Submit answer',exact:true}).click();
 await page.waitForFunction(()=>DraftmangoEditor.busy);
 assert.equal(await page.locator('.builder-questions').isVisible(),false);
 assert.ok((await page.locator('.message-user').last().innerText()).includes('Everyday wear for adults in the UK'));
 for(let i=0;i<100&&!releaseAnswer;i++)await new Promise(resolve=>setTimeout(resolve,25));
 assert.ok(releaseAnswer);releaseAnswer();
 await page.waitForSelector('.builder-plan');assert.equal(requests.length,2);
 assert.ok(requests[1].prompt.includes('Everyday wear for adults in the UK'));
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 await page.reload();await page.waitForSelector('.builder-plan');assert.equal(requests.length,2);
 await page.getByText('Details',{exact:true}).click();
 assert.ok(await page.getByText('Order history',{exact:true}).isVisible());
 await page.getByText('Store details to review',{exact:true}).click();
 assert.ok(await page.getByRole('heading',{name:'Cotton socks',exact:true}).isVisible());assert.ok((await page.locator('.app-proposal-details').innerText()).includes('£15.00'));
 assert.ok((await page.locator('.app-proposal-details').innerText()).includes('Stock: Needs your confirmation'));
 assert.equal(await page.locator('.builder-primary').evaluate(el=>getComputedStyle(el).color!==getComputedStyle(el).backgroundColor),true);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-plan-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>document.querySelector('#project-sidebar').getBoundingClientRect().right<=1);
 await page.waitForFunction(()=>document.querySelector('#chat-form .send-button').getBoundingClientRect().right<=window.innerWidth);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-plan-mobile.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.getByRole('button',{name:'Build it',exact:true}).click();
 await page.waitForFunction(()=>DraftmangoEditor.busy&&document.querySelector('.agent-plan').textContent.includes('Content pass'));
 assert.equal(await page.locator('#chat-input').inputValue(),'');
 const stop=page.getByRole('button',{name:'Stop generation',exact:true});
 assert.equal(await stop.getAttribute('type'),'button');assert.equal(await stop.isEnabled(),true);
 await page.screenshot({path:path.join(tmpdir(),'draftmango-builder-working-mobile.png')});
 await stop.click();await page.waitForFunction(()=>!DraftmangoEditor.busy);
 assert.equal(await page.getByRole('button',{name:'Send message',exact:true}).getAttribute('type'),'submit');
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 releaseBuild?.();hold=false;
 await page.getByRole('button',{name:'Build it',exact:true}).click();
 await page.waitForSelector('.builder-checklist',{timeout:60000});
 await page.waitForFunction(()=>!DraftmangoEditor.busy);
 assert.ok((await page.locator('.builder-checklist').innerText()).includes('Connection needed'));
 assert.equal(await page.evaluate(()=>DraftmangoEditor.project.workspace.builder.phase),'built');
 await page.getByRole('region',{name:'Store handoff'}).getByText('Sign in to prepare and manage this store.',{exact:true}).waitFor();
 const savedFiles=await page.evaluate(()=>DraftmangoEditor.project.files);assert.equal(validateTemplateFiles(JSON.parse(savedFiles['template.lock.json']),savedFiles).valid,true);
 await page.reload();await page.waitForSelector('.builder-checklist');
 assert.ok(await page.evaluate(()=>DraftmangoEditor.project.messages.at(-1).activity.updates.length>1));
 assert.deepEqual(errors,[]);
});

async function questionPage(t,q=question){
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.setContent('<main id="root" class="builder-prompt"></main><button class="send-button" data-busy="true"><svg class="send-icon" width="16" height="16"></svg><span class="stop-icon"></span></button>');
 await page.addScriptTag({path:new URL('../web/builder-flow.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.addScriptTag({path:new URL('../web/builder-prompts.js',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.addStyleTag({path:new URL('../web/builder-flow.css',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')});
 await page.evaluate(q=>{globalThis.answers=[];globalThis.state={version:1,phase:'discovery',plan:null,checks:[],questions:[q]};globalThis.answer=v=>{answers.push(v);return false;};globalThis.paint=busy=>DraftmangoBuilderPrompts.render(document.querySelector('#root'),state,{answer:v=>answer(v)},busy);paint(false);},q);
 return page;
}

test('browser: question cards select without sending, validate custom answers and preserve input while busy', {timeout:20000},async t=>{
 const page=await questionPage(t),send=page.getByRole('button',{name:'Submit answer',exact:true});
 const recommended=page.getByRole('radio',{name:'Everyday wear Recommended',exact:true});
 assert.equal(await recommended.isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),0);
 // Native radio navigation changes the selected answer, not the conversation.
 await recommended.focus();await page.keyboard.press('ArrowDown');
 assert.equal(await page.getByRole('radio',{name:'Sports and running',exact:true}).isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),0);
 await send.click();assert.equal(await page.evaluate(()=>answers[0]),question.title+'\nSports and running');
 await page.getByRole('radio',{name:'Something else',exact:true}).check();
 assert.equal(await page.getByRole('textbox').evaluate(el=>el===document.activeElement),true);
 await page.getByRole('textbox').fill('  ');await send.click();assert.equal(await page.evaluate(()=>answers.length),1);
 // Leaving an invalid custom answer must not block a standard option.
 await recommended.check();await send.click();assert.equal(await page.evaluate(()=>answers[1]),question.title+'\nEveryday wear');
 await page.getByRole('radio',{name:'Something else',exact:true}).check();
 await page.getByRole('textbox').fill('Socks for hikers');await recommended.check();
 await page.getByRole('radio',{name:'Something else',exact:true}).check();
 assert.equal(await page.getByRole('textbox').inputValue(),'Socks for hikers');
 await page.evaluate(()=>paint(true));
 assert.equal(await send.isDisabled(),true);assert.equal(await page.getByRole('textbox').isDisabled(),true);
 assert.equal(await recommended.isDisabled(),true);
 await page.evaluate(()=>paint(false));assert.equal(await page.getByRole('textbox').inputValue(),'Socks for hikers');
 assert.equal(await page.getByRole('radio',{name:'Something else',exact:true}).isChecked(),true);
 await send.click();assert.equal(await page.evaluate(()=>answers[2]),question.title+'\nSocks for hikers');
 assert.equal(await page.locator('.stop-icon').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
});

test('browser: question cards prevent duplicate sends and let failed submissions retry', {timeout:20000},async t=>{
 const page=await questionPage(t),send=page.getByRole('button',{name:'Submit answer',exact:true});
 await page.evaluate(()=>{globalThis.answer=v=>{answers.push(v);return new Promise((resolve,reject)=>{globalThis.finish=resolve;globalThis.fail=reject;});};});
 await send.click();await page.evaluate(()=>{paint(false);document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));});
 assert.equal(await page.evaluate(()=>answers.length),1);assert.equal(await page.locator('form').isVisible(),false);
 await page.evaluate(()=>fail(new Error('offline')));
 await page.getByRole('alert').waitFor();assert.equal(await send.isEnabled(),true);
 assert.equal(await page.getByRole('radio',{name:'Everyday wear Recommended',exact:true}).isChecked(),true);
 await send.click();assert.equal(await page.evaluate(()=>answers.length),2);
 await page.evaluate(()=>finish());assert.equal(await page.locator('form').isVisible(),false);
 // A new question clears the previous selection and uses its own recommended answer.
 await page.evaluate(()=>{state.questions=[{id:'region',title:'Where will you sell?',options:['United Kingdom','Worldwide'],recommended:1}];paint(false);});
 assert.equal(await page.getByRole('group',{name:'Where will you sell?',exact:true}).count(),1);
 assert.equal(await page.getByRole('radio',{name:'Worldwide Recommended',exact:true}).isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),2);
});

test('browser: long question cards fit small screens and render answer content as text', {timeout:20000},async t=>{
 const q={...question,title:'Which customers and delivery region should this store support when you launch?',options:['<img src=x onerror="window.injected=true">', 'Locally produced socks for outdoor enthusiasts throughout the United Kingdom, including deliveries to rural addresses'],recommended:1};
 const page=await questionPage(t,q);await page.setViewportSize({width:320,height:740});
 assert.equal(await page.locator('.builder-questions img').count(),0);
 assert.equal(await page.getByRole('radio').first().isChecked(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('.builder-answer').evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().right<=innerWidth&&row.scrollWidth<=row.clientWidth)),true);
 await page.getByRole('radio',{name:'Something else',exact:true}).check();
 await page.getByRole('textbox').fill('Our own answer');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});
