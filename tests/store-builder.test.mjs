import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../web/builder-flow.js';
import {templateForPrompt} from '../server/template-engine/index.mjs';
import {validateTemplateFiles} from '../server/template-engine/design-policy.mjs';
const B=globalThis.DraftmangoBuilderFlow;
const facts=()=>({fulfilment:'physical',currency:'gbp',country:'GB',supportEmail:'help@example.test',shippingCountries:['GB'],shippingAmount:400,taxBasisPoints:null,products:[{name:'Cotton socks',variants:[{label:'Medium',price:1500,stock:null}]}]});
test('store facts preserve unknowns, validate units and reject unsupported or malformed facts',()=>{
 const value=B.storeBrief(facts());assert.equal(value.products[0].variants[0].stock,null);assert.equal(value.taxBasisPoints,null);
 for(const patch of [{supportEmail:{}},{supportEmail:'x'.repeat(255)},{country:[]},{shippingAmount:-1},{shippingAmount:true},{currency:'dollars'},{taxBasisPoints:10001}])assert.equal(B.storeBrief({...facts(),...patch}),false);
 assert.equal(B.storeBrief({...facts(),products:[{name:'x',variants:[{label:'M',price:1,stock:2}]}]}),false);
 assert.equal(B.storeSupport({kind:'store',templateId:'fashion-store-1',store:{fulfilment:'digital'}}),false);
 assert.equal(B.storeSupport({kind:'store',templateId:'fashion-store-1',store:{fulfilment:null}}),false);
 assert.equal(B.storeSupport({kind:'store',templateId:'other',store:facts()}),false);
});
test('existing v1 store sources still pass template validation without mutation',async()=>{
 const {files}=await templateForPrompt('store','fashion-store-1');
 const legacy={...files,'storefront.json':JSON.stringify({schema:1,adapter:'fashion-store-v1',template:'fashion-store-1'},null,2)+'\n','src/storefront.jsx':await readFile(new URL('../server/storefront/fashion-store-v1.jsx',import.meta.url),'utf8'),'src/main.jsx':files['src/main.jsx'].replace("import App from './App.jsx';","import App from './storefront.jsx';")};
 assert.equal(validateTemplateFiles(JSON.parse(legacy['template.lock.json']),legacy).valid,true);
});
test('draft preparation waits for the exact saved version and forbids preview and changed-account writes',async()=>{
 const source=await readFile(new URL('../web/store-builder.js',import.meta.url),'utf8'),calls=[];
 let meta={seq:3,version:6,dirty:true};
 const A={user:{id:'owner'},preview:false,key:()=> 'projects',sync:async()=>{meta={...meta,version:7,dirty:false};},request:async(...args)=>{calls.push(args);return {store:{name:'Prepared'}};}};
 const c=vm.createContext({DraftmangoAccounts:A,DraftmangoBuilderFlow:B,localStorage:{getItem:()=>JSON.stringify({cloud:{p:meta}})},URLSearchParams,setTimeout});vm.runInContext(source,c);
 const helper=c.DraftmangoStoreBuilder,p={id:'p',workspace:{builder:{phase:'built',plan:{kind:'store',templateId:'fashion-store-1',store:facts()}}},files:{'storefront.json':JSON.stringify({adapter:'fashion-store-v2'})}};
 await helper.prepare(p);assert.equal(calls[0][1].body.expectedVersion,7);assert.equal(calls[0][1].body.action,'prepare');
 A.preview=true;await assert.rejects(helper.prepare(p),/Sign in/);A.preview=false;
 A.sync=async()=>meta.seq++;await assert.rejects(helper.prepare(p),/draft changed/);
 A.sync=async()=>A.user={id:'other'};await assert.rejects(helper.prepare(p),/account changed/);assert.equal(calls.length,1);
});
test('the preview bridge strips private operational fields and keeps unknown totals unknown',async()=>{
 const source=await readFile(new URL('../web/store-builder.js',import.meta.url),'utf8');
 const A={user:{id:'owner'},request:async()=>({store:{name:'Socks',currency:'gbp',shippingAmount:0,taxBasisPoints:0,stripeAccount:'secret',acceptingOrders:true},products:[],customer:{email:'private@example.test'},setup:{pendingProducts:['private']},missingSettings:['shippingAmount','taxBasisPoints']})};
 const c=vm.createContext({DraftmangoAccounts:A,DraftmangoBuilderFlow:B,URLSearchParams});vm.runInContext(source,c);
 const result=await c.DraftmangoStoreBuilder.catalogue({id:'p'});assert.equal(result.customer,null);assert.equal(result.store.acceptingOrders,false);assert.equal(result.store.shippingAmount,null);assert.equal(result.store.taxBasisPoints,null);assert.equal(result.store.stripeAccount,undefined);assert.equal(result.setup,undefined);
});

test('draft preview access requires the canonical template and exact reviewed store runtime',async()=>{
 const {attachStorefront,canPreviewStore}=await import('../server/storefront/index.mjs');
 const {files}=await templateForPrompt('','fashion-store-1'),store=await attachStorefront(files);
 assert.equal(await canPreviewStore(store),true);assert.equal(await canPreviewStore(files),false);
 assert.equal(await canPreviewStore({...store,'src/main.jsx':store['src/main.jsx']+'\nalert(1)'}),false);
 assert.equal(await canPreviewStore({...store,'src/storefront.jsx':store['src/storefront.jsx']+'\nalert(1)'}),false);
 const forged=JSON.parse(store['template.lock.json']);forged.template.version='forged';assert.equal(await canPreviewStore({...store,'template.lock.json':JSON.stringify(forged)}),false);
});
