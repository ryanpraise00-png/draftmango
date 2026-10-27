import test from 'node:test';
import assert from 'node:assert/strict';
import {generate, validateInput} from '../server/ai.mjs';
import '../web/account-store.js';

const M = globalThis.DraftmangoModel;
const S = globalThis.DraftmangoAccountStore;
const config = {provider:'openai',key:'local-test-secret',model:'gpt-6-luna',maxTokens:12000};
const files = {'index.html':'<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Socks</h1><script src="app.js" defer></script></body></html>', 'styles.css':'body{color:#123}', 'app.js':''};
const brief = {version:1,concept:'Socks presented as collectible stamps.',audience:'People who collect playful everyday objects.',primaryAction:'Explore patterns and choose a pair.',composition:'An oversized stamp sheet opens into a tactile catalogue.',typography:'Condensed display headings with spacious readable body text.',palette:'Paper white, raspberry and indigo.',imagery:'Original inline SVG pattern artwork; no supplied product photographs.',motion:'Selecting a pair lifts the stamp; reduced-motion uses a static outline.',sections:['Stamp sheet: select a pattern.','Materials: explain the fabric.','Size guide: choose a fit.'],constraints:['Cart is a local demonstration; no payments.']};
const plan = {action:'plan',message:'A collectible stamp-shop direction.',designBrief:brief};
const output = {action:'update',message:'Created the catalogue.',title:'Stamp Socks',designBrief:brief,files};
const response = value => Response.json({status:'completed',usage:{input_tokens:100,output_tokens:200},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('creation discards legacy starter files and passes a validated original direction to implementation', async () => {
  const input = {mode:'create',framework:'html',prompt:'A playful socks shop',creationPreferences:['Use the user-selected blue palette.'],files:{...files,'styles.css':'OLD_STARTER_ANCHOR'},history:[],designBrief:{bad:'old direction'}};
  const before = structuredClone(input), requests = [], progress = [];
  const result = await generate(input,config,{onProgress:event=>progress.push(event.phase),fetchImpl:async (_url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    return response(body.text.format.name === 'draftmango_direction' ? plan : output);
  }});
  assert.equal(requests.length,2);
  assert.equal(requests[0].text.format.name,'draftmango_direction');
  assert.equal(requests[1].text.format.name,'draftmango_website');
  assert.equal(requests[0].max_output_tokens,8192);
  assert.equal(requests[1].max_output_tokens,12000);
  for(const request of requests){
    assert.equal(request.store,false);
    assert.equal(request.text.format.strict,true);
    const context=JSON.parse(request.input[1].content);
    assert.equal(context.files,undefined);
    assert.deepEqual(context.creationPreferences,input.creationPreferences);
    assert.equal(JSON.stringify(request).includes('OLD_STARTER_ANCHOR'),false);
  }
  assert.deepEqual(JSON.parse(requests[1].input[1].content).designBrief,brief);
  assert.deepEqual(result.designBrief,brief);
  assert.deepEqual(result.files,files);
  assert.deepEqual(input,before);
  assert.equal(result.designProcess.stages.length,2);
  assert.equal(result.designProcess.stages[0].inputTokens,100);
  assert.ok(progress.includes('directing'));
  assert.ok(!JSON.stringify(result).includes(config.key));
});

test('editing reuses the current files and direction in a single call and may update that direction',async()=>{
  const updated={...brief,palette:'Paper white, raspberry and forest green.'};
  const requests=[];
  const result=await generate({mode:'edit',prompt:'Replace indigo with forest green.',files,designBrief:brief,history:[]},config,{fetchImpl:async(_url,options)=>{
    const request=JSON.parse(options.body);requests.push(request);
    assert.deepEqual(JSON.parse(request.input[1].content).files,files);
    assert.deepEqual(JSON.parse(request.input[1].content).designBrief,brief);
    return response({...output,designBrief:updated});
  }});
  assert.equal(requests.length,1);
  assert.equal(result.designBrief.palette,updated.palette);
});

test('legacy projects can be edited without a brief, but malformed briefs and files are rejected',async()=>{
  assert.equal(validateInput({mode:'edit',prompt:'Change text',files}).designBrief,null);
  assert.equal(validateInput({mode:'create',framework:'html',prompt:'New site'}).files,undefined);
  for(const invalid of [{version:9},{...brief,concept:''},{...brief,sections:['x'.repeat(1001)]}]){
    assert.throws(()=>validateInput({mode:'edit',prompt:'Edit',files,designBrief:invalid}),error=>error.code==='invalid_brief');
  }
  assert.throws(()=>validateInput({mode:'edit',prompt:'Edit'}),error=>error.code==='invalid_request');
  for(const creationPreferences of ['not an array',[42],['x'.repeat(601)],Array(9).fill('x')]){
    assert.throws(()=>validateInput({mode:'create',framework:'html',prompt:'New site',creationPreferences}),error=>error.code==='invalid_request');
  }
});

test('invalid planning responses never start implementation',async()=>{
  for(const invalid of [{...plan,designBrief:null},{...plan,designBrief:{...brief,concept:''}},{...plan,action:'unexpected'}]){
    let calls=0;
    await assert.rejects(generate({mode:'create',framework:'html',prompt:'New site'},config,{fetchImpl:async()=>{calls++;return response(invalid);}}),error=>error.code==='invalid_brief');
    assert.equal(calls,1);
  }
});

test('a direct answer from the director has no files and does not trigger implementation',async()=>{
  let calls=0;
  const result=await generate({mode:'create',framework:'html',prompt:'Can you connect a backend?'},config,{fetchImpl:async()=>{calls++;return response({action:'reply',message:'This workspace currently supports frontend demos.',designBrief:null});}});
  assert.equal(calls,1);assert.equal(result.files,null);assert.equal(result.designBrief,null);assert.equal(result.action,'reply');
});

test('failed implementation never returns a planned brief as a completed draft',async()=>{
  let calls=0;
  const input={mode:'create',framework:'html',prompt:'New site',files};
  await assert.rejects(generate(input,config,{fetchImpl:async()=>++calls===1?response(plan):response({...output,files:{...files,'index.html':'<html>partial'}})}),error=>error.code==='invalid_output');
  assert.equal(calls,2);assert.deepEqual(input.files,files);
});

test('cancellation between stages stops before the second provider request',async()=>{
  let calls=0;const controller=new AbortController();
  await assert.rejects(generate({mode:'create',framework:'html',prompt:'New site'},config,{signal:controller.signal,fetchImpl:async()=>{
    calls++;controller.abort();return response(plan);
  }}),error=>error.name==='AbortError');
  assert.equal(calls,1);
});

test('Anthropic creation uses the same two-stage contract and carries the brief',async()=>{
  const bodies=[];
  const result=await generate({mode:'create',framework:'html',prompt:'New site'},{...config,provider:'anthropic',model:'claude-sonnet-5-5'}, {fetchImpl:async (_url,options)=>{
    const body=JSON.parse(options.body);bodies.push(body);
    const value=bodies.length===1?plan:output;
    return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});
  }});
  assert.equal(bodies.length,2);
  assert.deepEqual(JSON.parse(bodies[1].messages[0].content).designBrief,brief);
  assert.deepEqual(result.designBrief,brief);
});

test('design direction follows code through reload, undo, redo, branching and cloud merge',()=>{
  const initial=M.createProject('A socks shop');
  initial.creationPreferences=['Use the user-selected blue palette.'];
  const first=M.commitFiles(initial,files,'First original direction',brief);
  const nextBrief={...brief,palette:'White and green.'};
  const next=M.commitFiles(first,{...files,'styles.css':'body{color:green}'},'New colour',nextBrief);
  const restored=M.restore(next,1);
  const saved=M.readStore(JSON.stringify({schema:1,activeId:restored.id,projects:[restored]})).projects[0];
  assert.deepEqual(saved.designBrief,brief);
  assert.deepEqual(saved.creationPreferences,initial.creationPreferences);
  assert.deepEqual(M.restore(saved,2).designBrief,nextBrief);
  assert.equal(M.restore(saved,0).designBrief,null);
  const branch=M.commitFiles(saved,{...files,'app.js':'console.log("branch")'},'Manual edit');
  assert.deepEqual(branch.designBrief,brief);assert.equal(branch.history.length,3);
  const merged=S.merge(S.empty(),[{id:branch.id,document:branch,version:1}]).library;
  assert.deepEqual(merged.projects[0].designBrief,brief);
  assert.equal(M.resetCode(branch).designBrief,null);
  assert.equal(initial.designBrief,undefined);
});

test('a direction-only update receives its own history entry and invalid stored briefs are discarded',()=>{
  const first=M.commitFiles(M.createProject('Socks'),files,'Initial',brief);
  const second=M.commitFiles(first,files,'Clarify direction',{...brief,motion:'Static composition throughout.'});
  assert.equal(second.history.length,first.history.length+1);
  assert.equal(M.restore(second,first.cursor).designBrief.motion,brief.motion);
  const broken=structuredClone(second);broken.history.at(-1).designBrief.concept=42;
  const loaded=M.readStore(JSON.stringify({schema:1,projects:[broken]}));
  assert.equal(loaded.projects[0].designBrief,null);
  assert.deepEqual(loaded.projects[0].files,files);
});
