import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import '../web/composer-intent.js';
import '../web/dashboard-model.js';
const H=globalThis.DraftmangoComposerIntent,D=globalThis.DraftmangoDashboard;
function storage(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('homepage draft retains full prompt, selected model and references through the auth destination',()=>{
 const s=storage(),idea='Build a thoughtful shop. '.repeat(120),reference={name:'brief.txt',type:'text/plain',data:'Local context',size:13};
 const id=H.save({idea,modelId:'openai:gpt-6-luna',notes:'Use our photography.',references:[reference]},s);
 const destination=D.accountDestination(new URLSearchParams({idea:idea.trim().slice(0,1200),draft:id}));
 const route=new URLSearchParams(destination.split('#')[1]);
 assert.equal(route.get('draft'),id);assert.ok(!destination.includes('Local context'));assert.ok(!destination.includes('photography'));
 const saved=H.read(id,route.get('idea'),s);assert.equal(saved.idea,idea.trim());assert.equal(saved.modelId,'openai:gpt-6-luna');assert.deepEqual(saved.references,[reference]);
 assert.ok(H.read(id,route.get('idea'),s),'reading does not delete an unsaved draft');H.remove(id,s);assert.equal(H.read(id,route.get('idea'),s),null);
});
test('drafts cannot be confused across tabs, unrelated prompts, invalid ids or expiry',()=>{
 const s=storage(),a=H.save({idea:'Shop'},s),b=H.save({idea:'Portfolio'},s);
 assert.equal(H.read(a,'Portfolio',s),null);assert.equal(H.read('../secret','Shop',s),null);assert.equal(H.read(b,'Portfolio',s).idea,'Portfolio');
 const key='draftmango-composer-intent-v1:'+a,value=JSON.parse(s.getItem(key));value.at=Date.now()-25*60*60*1000;s.setItem(key,JSON.stringify(value));assert.equal(H.read(a,'Shop',s),null);
 H.save({idea:'New idea'},s);assert.equal(s.getItem(key),null);
 assert.ok(!D.accountDestination(new URLSearchParams({idea:'Shop',draft:'invalid'})).includes('draft='));
});
test('unusable storage and oversized references fail before navigating away',()=>{
 assert.throws(()=>H.save({idea:'Shop'}, {...storage(),setItem(){throw new Error('Quota');}}),/Quota/);
 assert.throws(()=>H.save({idea:'Shop',references:[{name:'large.txt',type:'text/plain',data:'x'.repeat(3*1024*1024+1)}]},storage()),/references/);
 assert.throws(()=>H.save({idea:'Shop',references:[{name:'bad',type:'application/exe',data:'x'}]},storage()),/references/);
 assert.equal(H.read('00000000-0000-0000-0000-000000000000','Shop',{getItem(){throw new Error('Blocked');}}),null);
});

test('a browser that blocks storage access does not break opening the workspace',()=>{
 const context=vm.createContext({TextEncoder,Date});
 Object.defineProperty(context,'localStorage',{get(){throw new Error('SecurityError');}});
 vm.runInContext(readFileSync(new URL('../web/composer-intent.js',import.meta.url),'utf8'),context);
 const H=context.DraftmangoComposerIntent,id='00000000-0000-0000-0000-000000000000';
 assert.equal(H.read(id,'Shop'),null);assert.doesNotThrow(()=>H.remove(id));
});
