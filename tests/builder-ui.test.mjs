import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createServer} from '../server/serve.mjs';
import '../web/builder-flow.js';
const B=globalThis.DraftmangoBuilderFlow;
const plan=B.plan({kind:'store',name:'Everyday Socks',audience:'Adults in the UK',goal:'Sell comfortable socks',offering:'Cotton socks',region:'United Kingdom',content:'Owner will supply products and prices',brand:'Preserve the fashion template',templateId:'fashion-store-1',pages:[],workflows:['Choose a product and complete checkout'],connections:[],assumptions:['Guest checkout is available']});
plan.store=B.storeBrief({fulfilment:'physical',currency:'gbp',country:'GB',supportEmail:null,shippingCountries:['GB'],shippingAmount:null,taxBasisPoints:null,products:[{name:'Cotton socks',variants:[{label:'Medium',price:1500,stock:null}]}]});
const question={id:'audience',title:'Who are your socks for?',options:['Everyday wear','Sports and running','Something else'],recommended:0};

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


test('browser: compact cards select without sending, accept custom answers and preserve input while busy', {timeout:20000},async t=>{
 const page=await questionPage(t),send=page.getByRole('button',{name:'Send answer',exact:true});
 const recommended=page.getByRole('radio',{name:'Everyday wear (Recommended)',exact:true});
 assert.equal(await recommended.isChecked(),true);assert.equal(await page.getByRole('textbox').isVisible(),true);
 assert.equal(await page.getByRole('radio').count(),2);assert.equal(await page.evaluate(()=>answers.length),0);
 await recommended.focus();await page.keyboard.press('ArrowDown');
 assert.equal(await page.getByRole('radio',{name:'Sports and running',exact:true}).isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),0);
 await send.click();assert.equal(await page.evaluate(()=>answers[0]),question.title+'\nSports and running');
 await page.getByRole('textbox').fill('  ');assert.equal(await send.isDisabled(),true);
 await page.getByRole('textbox').press('Enter');assert.equal(await page.evaluate(()=>answers.length),1);
 await page.getByRole('textbox').fill('Socks for hikers');
 assert.equal(await page.locator('input:checked').count(),0);
 await page.evaluate(()=>paint(true));assert.equal(await send.isDisabled(),true);assert.equal(await page.getByRole('textbox').isDisabled(),true);
 await page.evaluate(()=>paint(false));assert.equal(await page.getByRole('textbox').inputValue(),'Socks for hikers');
 await page.getByRole('textbox').press('Shift+Enter');await page.getByRole('textbox').pressSequentially('Made locally');
 await page.getByRole('textbox').press('Enter');assert.equal(await page.evaluate(()=>answers[1]),question.title+'\nSocks for hikers\nMade locally');
 // Selecting a suggestion clears the custom response so only one answer can be sent.
 await page.getByText('Everyday wear',{exact:true}).click();assert.equal(await page.getByRole('textbox').inputValue(),'');
 await send.click();assert.equal(await page.evaluate(()=>answers[2]),question.title+'\nEveryday wear');
 assert.equal(await page.locator('.stop-icon').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
});

test('browser: question cards prevent duplicate sends and restore answers after failed submission', {timeout:20000},async t=>{
 const page=await questionPage(t),send=page.getByRole('button',{name:'Send answer',exact:true});
 await page.evaluate(()=>{globalThis.answer=v=>{answers.push(v);return new Promise((resolve,reject)=>{globalThis.finish=resolve;globalThis.fail=reject;});};});
 await page.getByRole('textbox').fill('Socks for hikers');
 await send.click();await page.evaluate(()=>{paint(false);document.querySelector('form').dispatchEvent(new Event('submit',{cancelable:true}));});
 assert.equal(await page.evaluate(()=>answers.length),1);assert.equal(await page.locator('form').isVisible(),false);
 await page.evaluate(()=>fail(new Error('offline')));await page.getByRole('alert').waitFor();
 assert.equal(await send.isEnabled(),true);assert.equal(await page.getByRole('textbox').inputValue(),'Socks for hikers');
 await send.click();assert.equal(await page.evaluate(()=>answers.length),2);
 await page.evaluate(()=>finish());assert.equal(await page.locator('#root').isVisible(),false);
 // A new question clears the previous selection and uses its own recommended answer.
 await page.evaluate(()=>{state.questions=[{id:'region',title:'Where will you sell?',options:['United Kingdom','Worldwide'],recommended:1}];paint(false);});
 assert.equal(await page.getByRole('group',{name:'Where will you sell?',exact:true}).count(),1);
 assert.equal(await page.getByRole('radio',{name:'Worldwide (Recommended)',exact:true}).isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),2);
});

test('browser: close and reopen retain a draft answer; Skip records an unknown rather than the suggested choice', {timeout:20000},async t=>{
 const page=await questionPage(t);
 await page.getByRole('textbox').fill('Custom audience');await page.getByRole('button',{name:'Dismiss question',exact:true}).click();
 assert.equal(await page.locator('form').isVisible(),false);assert.equal(await page.evaluate(()=>answers.length),0);
 await page.evaluate(()=>paint(false));await page.getByRole('button',{name:'Answer question',exact:true}).click();
 assert.equal(await page.getByRole('textbox').inputValue(),'Custom audience');
 await page.getByRole('textbox').press('Escape');await page.getByRole('button',{name:'Answer question',exact:true}).click();
 await page.getByText('Everyday wear',{exact:true}).click();await page.getByRole('radio').first().focus();await page.keyboard.press('2');
 assert.equal(await page.getByRole('radio',{name:'Sports and running',exact:true}).isChecked(),true);
 assert.equal(await page.evaluate(()=>answers.length),0);
 await page.getByRole('button',{name:'Skip',exact:true}).click();assert.equal(await page.evaluate(()=>answers[0]),question.title+'\nSkip this question for now. Leave this detail unconfirmed.');
});

test('browser: long question cards fit small screens, filter fallback choices and render content as text', {timeout:20000},async t=>{
 const q={...question,title:'Which customers and delivery region should this store support when you launch?',options:['<img src=x onerror="window.injected=true">', 'Locally produced socks for outdoor enthusiasts throughout the United Kingdom, including deliveries to rural addresses','Other','Something else'],recommended:1};
 const page=await questionPage(t,q);await page.setViewportSize({width:320,height:740});
 assert.equal(await page.locator('.builder-questions img').count(),0);assert.equal(await page.getByRole('radio').count(),2);
 assert.equal(await page.getByRole('radio').first().isChecked(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('.builder-answer').evaluateAll(rows=>rows.every(row=>row.getBoundingClientRect().right<=innerWidth&&row.scrollWidth<=row.clientWidth)),true);
 await page.getByRole('textbox').fill('Our own answer');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:320,height:500});
 assert.equal(await page.getByRole('button',{name:'Send answer'}).evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),true);
});


test('browser: template review can retry, follows the selected design and never replaces edited source', {timeout:45000},async t=>{
 const server=createServer({accountSession:async()=>null});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const base='http://127.0.0.1:'+server.address().port;let fail=true;
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.route('**/template-catalog.json',route=>fail?route.fulfill({status:503,body:'Unavailable'}):route.continue());
 await page.goto(base+'/workspace?preview');await page.waitForFunction(()=>!!globalThis.DraftmangoEditor);
 const original=await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files));
 await page.evaluate(plan=>{DraftmangoEditor.project.workspace.builder={version:1,phase:'review',plan,questions:[],checks:[]};DraftmangoEditor.render();},plan);
 await page.getByRole('button',{name:'Retry preview',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 fail=false;await page.getByRole('button',{name:'Retry preview',exact:true}).click();
 await page.frameLocator('#template-review-frame').locator('html[data-demo="fashion-store-1"]').waitFor();
 assert.equal(await page.locator('#template-review-frame').evaluate(el=>el.contentDocument===null),true);
 await page.evaluate(()=>{DraftmangoEditor.project.workspace.builder.plan.templateId='consulting-1';DraftmangoEditor.render();});
 await page.frameLocator('#template-review-frame').locator('html[data-demo="consulting-1"]').waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(DraftmangoEditor.project.files)),original);
 await page.evaluate(()=>DraftmangoEditor.setFiles({'index.html':'<!doctype html><html><body><h1>My saved source</h1></body></html>','styles.css':'','app.js':''}));
 assert.equal(await page.locator('#template-review-note').isVisible(),false);
 await page.frameLocator('#website-frame').getByRole('heading',{name:'My saved source'}).waitFor();
 assert.equal(await page.locator('#template-review-frame').getAttribute('src'),null);
});

test('browser: a delayed catalog response cannot show a previously selected template', {timeout:30000},async t=>{
 const server=createServer({accountSession:async()=>null});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());
 const page=await browser.newPage();let release;const wait=new Promise(resolve=>release=resolve);t.after(()=>release());
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.route('**/template-catalog.json',async route=>{await wait;await route.continue();});
 await page.goto('http://127.0.0.1:'+server.address().port+'/workspace?preview');await page.waitForFunction(()=>!!globalThis.DraftmangoEditor);
 await page.evaluate(plan=>{DraftmangoEditor.project.workspace.builder={version:1,phase:'review',plan,questions:[],checks:[]};DraftmangoEditor.render();},plan);
 await page.evaluate(()=>{DraftmangoEditor.project.workspace.builder.plan.templateId='consulting-1';DraftmangoEditor.render();});
 release();await page.frameLocator('#template-review-frame').locator('html[data-demo="consulting-1"]').waitFor();
 assert.ok((await page.locator('#template-review-note').innerText()).startsWith('Consulting · Sample content'));
 assert.equal(await page.locator('#template-review-frame').getAttribute('src'),'/draftmango/previews/demo-consulting-1.html');
});
