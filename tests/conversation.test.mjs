import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/workspace-model.js';
import '../web/conversation.js';
const Chat=globalThis.DraftmangoConversation,M=globalThis.DraftmangoModel;
const files={'index.html':'<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Flowers</h1><script src="app.js" defer></script></body></html>','styles.css':'body{color:#123}','app.js':''};
test('follow-ups create from untouched starters but preserve existing and manually edited source',()=>{
 const empty={'index.html':'<html><body></body></html>','styles.css':'','app.js':''};
 assert.equal(Chat.requestMode({files:empty,ai:{state:'pending'}},empty),'create');
 assert.equal(Chat.requestMode({files:null},empty),'create');
 assert.equal(Chat.requestMode({files:empty,ai:{state:'ready'}},empty),'edit');
 assert.equal(Chat.requestMode({files:{...empty,'styles.css':'body{color:red}'},ai:{state:'pending'}},empty),'edit');
 assert.equal(Chat.requestMode({files:empty,codeDraft:files},empty),'edit');
 assert.equal(Chat.requestMode({files:{...empty,'notes.md':'Keep this'}},empty),'edit');
});
test('message activity survives loading through the model without the chat renderer',()=>{
 const p=M.createProject('Flowers');p.messages=[{role:'assistant',text:'Ready',activity:{durationMs:34000,phases:['directing','building','bogus','building','checking'],plan:'A botanical storefront.'}}];
 const renderer=globalThis.DraftmangoConversation;delete globalThis.DraftmangoConversation;
 try{const saved=M.readStore(JSON.stringify({schema:1,projects:[p],activeId:p.id})).projects[0];assert.deepEqual(saved.messages[0].activity,{durationMs:34000,phases:['directing','building','checking'],plan:'A botanical storefront.'});}finally{globalThis.DraftmangoConversation=renderer;}
});
