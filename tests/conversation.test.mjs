import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,validateInput,modelContent} from '../server/ai.mjs';
import {conversationMessages} from '../server/conversation.mjs';
import '../web/conversation.js';
const Chat=globalThis.DraftmangoConversation,M=globalThis.DraftmangoModel;
const config={provider:'openai',key:'fake-test-key',model:'gpt-6-luna',maxTokens:12000};
const brief={version:1,concept:'An editorial flower shop.',audience:'Local flower buyers.',primaryAction:'Browse bouquets.',composition:'A large bouquet beside a spare headline.',typography:'Expressive display type and clear labels.',palette:'Cream, green and pink.',imagery:'Inline botanical illustrations.',motion:'Subtle hover states.',sections:['Seasonal bouquets.','Delivery details.'],constraints:['Checkout is a demonstration.']};
const files={'index.html':'<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Flowers</h1><script src="app.js" defer></script></body></html>','styles.css':'body{color:#123}','app.js':''};
const response=value=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
test('follow-ups create from untouched starters but preserve existing and manually edited source',()=>{
 const empty={'index.html':'<html><body></body></html>','styles.css':'','app.js':''};
 assert.equal(Chat.requestMode({files:empty,ai:{state:'pending'}},empty),'create');
 assert.equal(Chat.requestMode({files:null},empty),'create');
 assert.equal(Chat.requestMode({files:empty,ai:{state:'ready'}},empty),'edit');
 assert.equal(Chat.requestMode({files:{...empty,'styles.css':'body{color:red}'},ai:{state:'pending'}},empty),'edit');
 assert.equal(Chat.requestMode({files:empty,codeDraft:files},empty),'edit');
 assert.equal(Chat.requestMode({files:{...empty,'notes.md':'Keep this'}},empty),'edit');
});
test('native conversational roles preserve follow-ups without duplicating the current request',()=>{
 const input=validateInput({mode:'create',framework:'html',interaction:'conversation',prompt:'Use the second one',history:[{role:'user',text:'Suggest two directions'},{role:'assistant',text:'1. A catalog.\n2. A botanical journal.'},{role:'user',text:'Use the second one'}]});
 const messages=conversationMessages(input,'openai',modelContent);
 assert.deepEqual(messages.map(m=>m.role),['user','user','assistant','user']);
 assert.equal(messages.at(-1).content,'Use the second one');assert.equal(messages.filter(m=>m.content==='Use the second one').length,1);
 assert.equal(JSON.parse(messages[0].content).history,undefined);
});
test('conversation context is bounded and excludes initial placeholders and the current turn',()=>{
 const history=Array.from({length:50},(_,i)=>({role:i%2?'assistant':'user',text:'Message '+i}));
 history.push({role:'assistant',text:'Starter shown',initial:true},{role:'user',text:'Build it'});
 const selected=Chat.history(history,'Build it');assert.equal(selected.length,40);assert.equal(selected.at(-1).text,'Message 49');assert.equal(selected[0].text,'Message 10');
 assert.throws(()=>validateInput({mode:'create',framework:'html',prompt:'hello',history:Array.from({length:40},()=>({role:'user',text:'a'.repeat(12000)}))}),/too long/);
});
test('a conversational answer does not emit a build plan or generate files',async()=>{
 const updates=[],requests=[];
 const result=await generate({mode:'create',framework:'html',interaction:'conversation',prompt:'Hello'},config,{onProgress:event=>updates.push(event),fetchImpl:async(_,options)=>{
  requests.push(JSON.parse(options.body));return response({action:'reply',message:'Hi! What would you like to build?',designBrief:null});
 }});
 assert.equal(requests.length,1);assert.equal(result.action,'reply');assert.equal(result.files,null);assert.ok(!updates.some(e=>e.message));
 assert.equal(requests[0].input.at(-1).content,'Hello');
});
test('the validated plan is delivered before implementation; partial files and reasoning stay private',async()=>{
 const events=[],requests=[];
 const plan={action:'plan',message:'I’ll build a botanical storefront with seasonal bouquets and delivery details.',designBrief:brief};
 const result=await generate({mode:'create',framework:'html',interaction:'conversation',prompt:'Build a flower shop'},config,{onProgress:e=>events.push(e),fetchImpl:async(_,options)=>{
  const body=JSON.parse(options.body);requests.push(body);
  if(requests.length===1)return response(plan);
  assert.ok(events.some(e=>e.phase==='building'&&e.message===plan.message));
  return response({action:'update',title:'Little Bloom',message:'The storefront is ready.',designBrief:brief,files});
 }});
 assert.equal(result.action,'update');assert.equal(requests.length,2);
 assert.ok(!JSON.stringify(events).includes('<html>'));assert.ok(!JSON.stringify(events).includes('fake-test-key'));
});
test('invalid plans never appear in the chat as an accepted build',async()=>{
 const events=[];await assert.rejects(generate({mode:'create',framework:'html',interaction:'conversation',prompt:'Build'},config,{onProgress:e=>events.push(e),fetchImpl:async()=>response({action:'plan',message:'Broken plan',designBrief:null})}));
 assert.ok(!events.some(e=>e.message));
});
test('message activity survives loading through the model without the chat renderer',()=>{
 const p=M.createProject('Flowers');p.messages=[{role:'assistant',text:'Ready',activity:{durationMs:34000,phases:['directing','building','bogus','building','checking'],plan:'A botanical storefront.'}}];
 const renderer=globalThis.DraftmangoConversation;delete globalThis.DraftmangoConversation;
 try{const saved=M.readStore(JSON.stringify({schema:1,projects:[p],activeId:p.id})).projects[0];assert.deepEqual(saved.messages[0].activity,{durationMs:34000,phases:['directing','building','checking'],plan:'A botanical storefront.'});}finally{globalThis.DraftmangoConversation=renderer;}
});
