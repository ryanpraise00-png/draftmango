import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/auth.js',import.meta.url),'utf8');
const navigation=await readFile(new URL('../web/dashboard-model.js',import.meta.url),'utf8');
async function page(hash='',request=async()=>({}),options={}){
 const nodes=new Map(),events={},calls=[],redirects=[],storage=new Map();
 function node(){return {value:'',hidden:false,disabled:false,children:[],events:{},classList:{toggle(){}},setAttribute(){},focus(){},reset(){},addEventListener(name,fn){this.events[name]=fn},append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children;this._text=children.map(c=>c.textContent||'').join('')},set textContent(v){this._text=v;this.children=[]},get textContent(){return this._text||''}}}
 const $=s=>{if(options.legacyMarkup&&s==='#google-signin')return null;if(!nodes.has(s))nodes.set(s,node());return nodes.get(s)};
 const location={pathname:'/auth',hash:'#'+hash,replace:url=>redirects.push(url),assign:url=>redirects.push(url),reload:()=>redirects.push('reload')};
 const context={URLSearchParams,document:{querySelector:$,createElement:node,createTextNode:t=>({textContent:t})},window:{addEventListener:(n,fn)=>events[n]=fn},location,history:{replaceState:(_,__,url)=>location.hash=url.slice(url.indexOf('#'))},sessionStorage:{getItem:k=>{if(options.storageBlocked)throw Error('blocked');return storage.get(k)},setItem:(k,v)=>{if(options.storageBlocked)throw Error('blocked');storage.set(k,v)},removeItem:k=>storage.delete(k)},DraftmangoAccounts:{config:{providers:[],registrationOpen:options.open!==false},user:options.user,init:async()=>{},sessionChanged(){},request:async(path,opts)=>{calls.push({path,...structuredClone(opts)});return request(path,opts)}}};
 vm.createContext(context);vm.runInContext(navigation,context);await vm.runInContext(source,context);
 return {$,events,calls,redirects,location,submit:()=>$('#auth-form').events.submit({preventDefault(){}}),click:s=>$(s).events.click()};
}
test('signup carries template intent and offers resend before signing in',async()=>{
 const p=await page('mode=signup&idea=Flowers&template=cafe-1&draft=12345678-1234-1234-1234-123456789012',async()=>({confirmationRequired:true,emailDelivery:'smtp'}));
 p.$('#email').value='owner@example.test';await p.submit();p.$('#password').value='Secret-phrase!29';await p.submit();
 assert.equal(p.calls[0].path,'/api/accounts/signup');assert.equal(p.calls[0].body.intent.template,'cafe-1');assert.equal(p.calls[0].body.intent.draft,'12345678-1234-1234-1234-123456789012');
 assert.match(p.$('#auth-feedback').textContent,/Check your inbox/);assert.match(p.location.hash,/mode=login/);assert.equal(p.$('#password').value,'');
 const resend=p.$('#auth-feedback').children.find(n=>n.textContent==='Resend confirmation email');assert.ok(resend);assert.equal(resend.disabled,false);
 await resend.onclick();assert.equal(p.calls[1].path,'/api/accounts/resend-verification');assert.equal(p.calls[1].body.intent.idea,'Flowers');
});
test('verification opened in a fresh tab retains destination, strips token, and prefills email',async()=>{
 const p=await page('flow=verify&uid=id&token=single-use&email=owner%40example.test&idea=Flowers&template=cafe-1&draft=12345678-1234-1234-1234-123456789012',async()=>({verified:true}));
 assert.equal(p.calls[0].path,'/api/accounts/verify');assert.equal(p.calls[0].body.token,'single-use');assert.doesNotMatch(p.location.hash,/token=|uid=|flow=/);
 assert.equal(p.$('#email').value,'owner@example.test');await p.submit();p.$('#password').value='Secret-phrase!29';await p.submit();
 assert.match(p.redirects[0],/^\/workspace#idea=Flowers&template=cafe-1&draft=12345678-1234-1234-1234-123456789012/);
});
test('password reset returns to login and preserves the billing destination',async()=>{
 const p=await page('flow=recovery&uid=id&token=reset-secret&email=owner%40example.test&plan=pro&billing=yearly',async()=>({updated:true}));
 assert.equal(p.$('#password').disabled,false);p.$('#password').value='New-secret!29';await p.submit();
 assert.equal(p.calls[0].path,'/api/accounts/reset-confirm');assert.equal(p.calls[0].body.token,'reset-secret');assert.match(p.$('#auth-feedback').textContent,/password is updated/);
 await p.submit();p.$('#password').value='New-secret!29';await p.submit();assert.equal(p.redirects[0],'/dashboard#settings/billing');
});
test('signup closure is visible without blocking existing-member login',async()=>{
 const p=await page('mode=signup',undefined,{open:false});assert.equal(p.$('#submit-auth').disabled,true);assert.match(p.$('#auth-feedback').textContent,/not open/);
 await p.click('#switch-mode');assert.equal(p.$('#submit-auth').disabled,false);assert.match(p.location.hash,/mode=login/);
});
test('blocked browser storage does not prevent login or redirect',async()=>{
 const p=await page('mode=login&idea=Flowers',undefined,{storageBlocked:true});p.$('#email').value='owner@example.test';await p.submit();p.$('#password').value='Secret!29';await p.submit();assert.equal(p.redirects[0],'/workspace#idea=Flowers');
});
test('failed verification stays signed out and a later account-link hash is processed afresh',async()=>{
 const p=await page('flow=verify&uid=id&token=expired',async()=>{throw Error('This link has expired')});assert.match(p.$('#auth-feedback').textContent,/expired/);assert.equal(p.redirects.length,0);
 p.location.hash='#flow=recovery&uid=id&token=fresh';p.events.hashchange();assert.deepEqual(p.redirects,['reload']);
});

test('deployed legacy social-button markup does not prevent email authentication',async()=>{
 const p=await page('mode=signup',async()=>({confirmationRequired:true,emailDelivery:'smtp'}),{legacyMarkup:true});
 assert.match(p.$('#form-title').textContent,/Create an account/);assert.equal(p.$('#social-options').hidden,true);
 p.$('#email').value='owner@example.test';await p.submit();p.$('#password').value='Secret!29';await p.submit();
 assert.equal(p.calls[0].path,'/api/accounts/signup');assert.match(p.$('#auth-feedback').textContent,/Check your inbox/);
});
