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
