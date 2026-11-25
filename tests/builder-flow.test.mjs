import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/workspace-model.js';
import '../web/builder-flow.js';
const B=globalThis.DraftmangoBuilderFlow,M=globalThis.DraftmangoModel;
const questions=[{id:'business',title:'Who are the socks for?',options:['Everyday wear','Sports and running'],recommended:0}];
const plan=()=>B.plan({kind:'store',name:'Everyday Socks',audience:'Adults buying comfortable everyday socks',goal:'Sell socks online',offering:'Cotton socks; the owner will supply the catalogue',region:'UK',content:'Owner product photos and prices are pending',brand:'Preserve the selected fashion template',templateId:'fashion-store-1',pages:[],workflows:['Choose a product, add to cart, check out, receive an order confirmation'],connections:[],assumptions:['Guest checkout is allowed']});

test('plan fills required store pages and separates owner payments from platform billing',()=>{
 const p=plan();for(const name of ['Cart','Checkout','Order confirmation','Order history','Sign in','Create account','Password reset','Privacy','Terms'])assert.ok(p.pages.includes(name));
 assert.ok(p.connections.some(x=>x.includes('Draftmango-managed')));assert.ok(p.connections.some(x=>x.includes('site owner')));
 assert.equal(B.plan({...p,templateId:'../../private'}),null);assert.equal(B.plan({...p,name:''}),null);
 assert.equal(B.questions([{...questions[0],options:['Yes','Yes']}]),null);
 assert.equal(B.questions(Array(4).fill(questions[0])),null);
});

test('saved brief, answers and progress survive reload; manual source changes invalidate old checks',()=>{
 let p=M.createProject('Sell socks');p.workspace={builder:{version:1,phase:'built',plan:plan(),questions:[],checks:[{status:'passed',label:'Internal navigation',detail:'Checked source'}]}};
 p.messages.push({role:'assistant',text:'Working',activity:{durationMs:2000,phases:['discovering','building'],plan:'Checking',updates:['Reading the brief','Adapting inner pages']}});
 p=M.readStore(JSON.stringify({schema:1,activeId:p.id,projects:[p]})).projects[0];
 assert.equal(B.read(p.workspace.builder).plan.name,'Everyday Socks');assert.equal(p.messages.at(-1).activity.updates.length,2);
 const edited=M.commitFiles(p,{'index.html':'<h1>Socks</h1>','styles.css':'','app.js':''});assert.equal(edited.workspace.builder.checks[0].label,'Source changed');
 assert.equal(M.restore(p,0).workspace.builder.checks[0].label,'Source changed');
});

test('planned pages merge common aliases without discarding distinct requested pages',()=>{
 const p=B.plan({...plan(),kind:'services',pages:['homepage','About us','Our Services','Service detail','Contact us','Privacy policy','Terms and conditions','Case studies','Support']});
 assert.deepEqual(p.pages,['Home','About','Services','Service details','Contact','Privacy','Terms','Case studies','Support']);
 assert.deepEqual(B.plan(p).pages,p.pages);
});
