import test from 'node:test';
import assert from 'node:assert/strict';
import {gatherBrief,buildPlan,inspectSite} from '../server/builder-flow.mjs';
import {generate,validateInput} from '../server/ai.mjs';
import {templateForPrompt} from '../server/template-engine/index.mjs';
import {validateTemplateFiles} from '../server/template-engine/design-policy.mjs';
import {indexTemplate} from '../server/template-engine/personalization.mjs';
import '../web/workspace-model.js';
const B=globalThis.DraftmangoBuilderFlow,M=globalThis.DraftmangoModel;
const plan=()=>B.plan({kind:'store',name:'Everyday Socks',audience:'Adults buying comfortable everyday socks',goal:'Sell socks online',offering:'Cotton socks; the owner will supply the catalogue',region:'UK',content:'Owner product photos and prices are pending',brand:'Preserve the selected fashion template',templateId:'fashion-store-1',pages:[],workflows:['Choose a product, add to cart, check out, receive an order confirmation'],connections:[],assumptions:['Guest checkout is allowed']});
const questions=[{id:'business',title:'Who are the socks for?',options:['Everyday wear','Sports and running'],recommended:0}];
const config={provider:'anthropic',key:'test-only',model:'claude-sonnet-5-5',maxTokens:8192};
const provider=value=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});
const noop=()=>{};

test('plan fills required store pages and separates owner payments from platform billing',()=>{
 const p=plan();for(const name of ['Cart','Checkout','Order confirmation','Order history','Sign in','Create account','Password reset','Privacy','Terms'])assert.ok(p.pages.includes(name));
 assert.ok(p.connections.some(x=>x.includes('Draftmango-managed')));assert.ok(p.connections.some(x=>x.includes('site owner')));
 assert.equal(B.plan({...p,templateId:'../../private'}),null);assert.equal(B.plan({...p,name:''}),null);
 assert.equal(B.questions([{...questions[0],options:['Yes','Yes']}]),null);
 assert.equal(B.questions(Array(4).fill(questions[0])),null);
});

test('a vague initial request asks questions without loading or altering site files',async()=>{
 const events=[];
 const result=await generate({mode:'create',prompt:'Build a website for selling socks',builder:B.initial()},config,{onProgress:e=>events.push(e),fetchImpl:async(_url,opts)=>{
  const body=JSON.parse(opts.body),context=JSON.parse(body.messages[0].content);
  assert.equal(context.files,undefined);assert.ok(context.libraryCandidates.length);assert.equal(context.builder.phase,'discovery');
  assert.match(body.system,/payment provider/);return provider({message:'Let’s clarify who you sell to.',questions,plan:null});
 }});
 assert.equal(result.action,'reply');assert.equal(result.files,null);assert.equal(result.builder.phase,'discovery');assert.deepEqual(result.builder.questions,questions);
 assert.ok(events.some(x=>x.phase==='discovering'));assert.equal(result.designProcess.stages.length,1);
});

test('answers, saved questions, attachments and explicit template reach the next planning turn',async()=>{
 const input={mode:'create',prompt:'Everyday wear in the UK',templateId:'fashion-store-1',builder:{...B.initial(),questions},history:[{role:'user',text:'Sell socks'}],references:[{name:'catalogue.txt',type:'text/plain',data:'Organic cotton'}]};
 const result=await gatherBrief(input,async context=>{
  assert.equal(context.selectedTemplateId,input.templateId);assert.deepEqual(context.builder.questions,questions);assert.equal(context.references[0].data,'Organic cotton');assert.equal(context.history[0].text,'Sell socks');
  return {message:'Here is the plan for you to review.',questions:[],plan:plan()};
 },noop);
 assert.equal(result.builder.phase,'review');assert.equal(result.files,null);
});

test('ambiguous, malformed or template-switching plans are rejected without updates',async()=>{
 for(const output of [{message:'Ready',questions,plan:plan()},{message:'Ready',questions:[],plan:{...plan(),name:''}},{message:'Ready',questions:[],plan:{...plan(),templateId:'architecture-studio-1'}}]){
  await assert.rejects(gatherBrief({prompt:'Socks',templateId:'fashion-store-1',builder:B.initial()},async()=>output,noop),{code:'builder_brief'});
 }
 assert.throws(()=>validateInput({mode:'create',prompt:'Socks',builder:{phase:'review'}}),{code:'builder_brief'});
 assert.throws(()=>validateInput({mode:'create',prompt:'Socks',builder:B.initial(),builderAction:'deploy'}),{code:'builder_brief'});
 const edited=validateInput({mode:'edit',prompt:'Adjust this plan',files:{'index.html':'<h1>Socks</h1>','styles.css':'','app.js':''},builder:B.initial(),templateId:'fashion-store-1'});
 assert.equal(edited.templateId,'fashion-store-1');
});

test('a greeting gets a conversational reply with no questions or plan, and only one question is asked at a time',async()=>{
 const hello=await gatherBrief({prompt:'hey',builder:B.initial()},async()=>({message:'Hi! Tell me about the website you have in mind.',questions:[],plan:null}),noop);
 assert.equal(hello.action,'reply');assert.equal(hello.files,null);
 assert.deepEqual(hello.builder,{version:1,phase:'discovery',questions:[],plan:null,checks:[]});
 const two=[{id:'a',title:'Who is it for?',options:['Families','Professionals'],recommended:0},{id:'b',title:'Where are you based?',options:['UK','US'],recommended:0}];
 const asked=await gatherBrief({prompt:'A site for my bakery',builder:B.initial()},async()=>({message:'Nice. One thing first.',questions:two,plan:null}),noop);
 assert.equal(asked.builder.questions.length,1);assert.equal(asked.builder.questions[0].id,'a');
});

test('only an explicitly confirmed review can begin the complete template build',async()=>{
 let calls=0;
 for(const input of [{builder:B.initial(),builderAction:'build'},{builder:{version:1,phase:'review',questions:[],plan:plan()},builderAction:'respond'},{builder:{version:1,phase:'review',questions:[],plan:plan()},builderAction:'build',templateId:'architecture-studio-1'}])await assert.rejects(buildPlan(input,async()=>calls++,noop),{code:'builder_brief'});
 assert.equal(calls,0);
});

test('confirmed build covers every template content field, preserves design and reports incomplete workflows',async()=>{
 const original=await templateForPrompt('',plan().templateId),fields=indexTemplate(original.files),seen=new Set(),events=[];
 const result=await buildPlan({mode:'create',prompt:'Build this plan',builderAction:'build',builder:{version:1,phase:'review',questions:[],plan:plan(),checks:[]}},async context=>{
  assert.equal(context.files,undefined);assert.equal(context.approvedPlan.name,'Everyday Socks');context.fields.forEach(f=>seen.add(f.id));
  const field=context.fields.find(f=>f.kind==='text'&&f.context==='h1');
  return field?{action:'update',title:'Socks',message:'Updated this batch.',edits:[{id:field.id,value:'Everyday Socks',allMatching:false}],colours:[]}:{action:'reply',title:'Socks',message:'No change needed in this batch.',edits:[],colours:[]};
 },e=>events.push(e));
 assert.equal(seen.size,fields.length);assert.ok(result.designProcess.contentPasses>1);
 assert.equal(validateTemplateFiles(JSON.parse(original.files['template.lock.json']),result.files).valid,true);
 assert.ok(result.builder.checks.some(c=>c.status==='needs-connection'));assert.ok(result.builder.checks.some(c=>c.label==='Terms'&&c.status==='passed'));
 assert.doesNotMatch(result.message,/ready to publish|fully functional/i);assert.ok(events.some(e=>e.phase==='verifying'));
 assert.notDeepEqual(result.files,original.files);
 assert.ok(result.files['src/storefront.jsx']);assert.ok(result.builder.checks.some(c=>c.label==='Store setup'&&c.status==='needs-connection'));
});

test('cancellation after a completed batch never changes the cached library or returns partial files',async()=>{
 const original=await templateForPrompt('',plan().templateId),before=JSON.stringify(original.files),controller=new AbortController();
 await assert.rejects(buildPlan({builderAction:'build',builder:{version:1,phase:'review',plan:plan()}},async context=>{
  controller.abort();const field=context.fields.find(f=>f.kind==='text');return {action:'update',title:'Socks',message:'Updated.',edits:[{id:field.id,value:'Cancelled edit',allMatching:false}],colours:[]};
 },noop,controller.signal),{name:'AbortError'});
 assert.equal(JSON.stringify((await templateForPrompt('',plan().templateId)).files),before);
});

test('route checks use only imported shared frames and flag broken, placeholder and malformed links',()=>{
 const files={'src/App.jsx':'const pages={"demo-test":Page0,"demo-test-about":Page1};',
  'src/pages/Page0.jsx':'import Frame from "../shared/Frame0.jsx"; export default function P(){return <><Frame/><a href="#page=demo-test-about&anchor=team">About</a><a href="#%">Bad</a><a href="#">Empty</a><a href="#page=missing">Missing</a></>}',
  'src/pages/Page1.jsx':'export default function P(){return <main id="team"/>}',
  'src/shared/Frame0.jsx':'export default function P(){return <nav><a href="#page=demo-test">Home</a></nav>}',
  'src/shared/Unused.jsx':'export default function P(){return <a href="#page=unused-link">Unused</a>}'};
 const checks=inspectSite(files,{...plan(),pages:[],connections:[],workflows:[]});
 assert.ok(checks.some(c=>c.label==='Placeholder links'));const navigation=checks.find(c=>c.label==='Internal navigation');
 assert.equal(navigation.status,'needs-attention');assert.match(navigation.detail,/missing/);assert.doesNotMatch(navigation.detail,/unused-link|about#team/);
 assert.ok(inspectSite({},plan()).some(c=>c.label==='Page routes'&&c.status==='needs-attention'));
});

test('saved brief, answers and progress survive reload; manual source changes invalidate old checks',()=>{
 let p=M.createProject('Sell socks');p.workspace={builder:{version:1,phase:'built',plan:plan(),questions:[],checks:[{status:'passed',label:'Internal navigation',detail:'Checked source'}]}};
 p.messages.push({role:'assistant',text:'Working',activity:{durationMs:2000,phases:['discovering','building'],plan:'Checking',updates:['Reading the brief','Adapting inner pages']}});
 p=M.readStore(JSON.stringify({schema:1,activeId:p.id,projects:[p]})).projects[0];
 assert.equal(B.read(p.workspace.builder).plan.name,'Everyday Socks');assert.equal(p.messages.at(-1).activity.updates.length,2);
 const edited=M.commitFiles(p,{'index.html':'<h1>Socks</h1>','styles.css':'','app.js':''});assert.equal(edited.workspace.builder.checks[0].label,'Source changed');
 assert.equal(M.restore(p,0).workspace.builder.checks[0].label,'Source changed');
});

test('a review reply refreshes stale source checks without changing files',async()=>{
 const template=await templateForPrompt('',plan().templateId);
 const result=await generate({mode:'edit',prompt:'Review the current site against the plan',files:template.files,builder:{version:1,phase:'built',plan:plan(),questions:[],checks:[{status:'needs-attention',label:'Source changed',detail:'Please review'}]}},config,{fetchImpl:async()=>provider({action:'reply',title:'Socks',message:'Review the source checklist and the remaining connections.',edits:[],colours:[]})});
 assert.equal(result.action,'reply');assert.equal(result.files,null);
 assert.ok(result.builder.checks.some(x=>x.label==='Internal navigation'));
 assert.ok(!result.builder.checks.some(x=>x.label==='Source changed'));
 assert.ok(result.builder.checks.some(x=>x.status==='needs-connection'));
});
