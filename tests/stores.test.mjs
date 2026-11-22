import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {templateForPrompt} from '../server/template-engine/index.mjs';
import {attachStorefront} from '../server/storefront/index.mjs';
import {validateTemplateFiles} from '../server/template-engine/design-policy.mjs';
import {compileProject} from '../server/compiler.mjs';
import {createPublisher} from '../server/publisher.mjs';
import {createServer} from '../server/serve.mjs';

test('store adapter keeps every template page and stylesheet unchanged and compiles',async()=>{
 const template=await templateForPrompt('store','fashion-store-1'),files=await attachStorefront(template.files);
 for(const [name,source]of Object.entries(template.files))if(name!=='src/main.jsx')assert.equal(files[name],source,name);
 assert.equal(validateTemplateFiles(JSON.parse(files['template.lock.json']),files).valid,true);
 const compiled=await compileProject(files);assert.match(compiled.files['assets/site.js'],/Continue to payment/);assert.doesNotMatch(files['src/storefront.jsx'],/card-number|card-cvc/);
});
test('trusted capability cannot be changed or used to bypass template preservation',async()=>{
 const template=await templateForPrompt('store','fashion-store-1'),files=await attachStorefront(template.files),manifest=JSON.parse(files['template.lock.json']);
 for(const changed of [{...files,'src/storefront.jsx':files['src/storefront.jsx']+'\nalert(1)'},{...files,'storefront.json':'{}'},{...files,'src/styles.css':files['src/styles.css']+'\nbody{color:red}'},{...files,'src/main.jsx':files['src/main.jsx']+'\nalert(1)'}])assert.equal(validateTemplateFiles(manifest,changed).valid,false);
 await assert.rejects(attachStorefront({...template.files,'template.lock.json':JSON.stringify({...manifest,template:{...manifest.template,id:'other'}})}),/supports/);
 assert.deepEqual(await attachStorefront(files),files);
});
test('publisher scopes customer API cookies and blocks cross-origin requests and platform routes',async t=>{
 let received;const upstream=http.createServer((req,res)=>{received={url:req.url,headers:req.headers};req.resume();res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':['draftmango_store=abc123; Path=/; HttpOnly; SameSite=Lax','draftmango_session=secret; Path=/']});res.end('{"ok":true}');});upstream.listen(0,'127.0.0.1');await once(upstream,'listening');
 const publisher=createPublisher({token:'private-test-publisher-token-123456789',backendPort:upstream.address().port,production:false});publisher.listen(0,'127.0.0.1');await once(publisher,'listening');t.after(()=>{publisher.closeAllConnections();publisher.close();upstream.closeAllConnections();upstream.close();});
 const fetch=(url,options={})=>new Promise((resolve,reject)=>{const req=http.request(url,{method:options.method||'GET',headers:options.headers},res=>{res.resume();resolve({status:res.statusCode,headers:{get:name=>Array.isArray(res.headers[name])?res.headers[name].join(', '):res.headers[name]}});});req.on('error',reject);req.end(options.body);});
 const base='http://127.0.0.1:'+publisher.address().port,host='shop-one.localhost:'+publisher.address().port;
 let r=await fetch(base+'/api/store/login',{method:'POST',headers:{Host:host,Origin:'http://'+host,'Content-Type':'application/json','X-Store-Request':'1',Cookie:'draftmango_session=private; draftmango_store=abc123',Authorization:'Bearer private','X-Store-Host':'other.localhost','X-Real-IP':'1.2.3.4'},body:'{}'});
 assert.equal(r.status,200);assert.equal(received.url,'/internal/store/login');assert.equal(received.headers.cookie,'draftmango_store=abc123');assert.equal(received.headers['x-store-host'],'shop-one.localhost');assert.equal(received.headers.authorization,undefined);assert.equal(received.headers['x-draftmango-client-ip'],'127.0.0.1');assert.doesNotMatch(r.headers.get('set-cookie'),/session/);
 r=await fetch(base+'/api/store/checkout',{method:'POST',headers:{Host:host,Origin:'https://evil.test','Content-Type':'application/json','X-Store-Request':'1'},body:'{}'});assert.equal(r.status,403);
 r=await fetch(base+'/api/store/accounts',{headers:{Host:host}});assert.equal(r.status,404);
 r=await fetch(base+'/api/store/login',{method:'POST',headers:{Host:host,Origin:'http://'+host,'Content-Type':'application/json','X-Store-Request':'1'},body:'x'.repeat(65537)});assert.equal(r.status,413);
});
test('owner API is proxied and adapter requires authenticated same-origin JSON',async t=>{
 let authenticated=0,proxied=0;const server=createServer({accountSession:async()=>{authenticated++;return 'test-owner';},accountProxy:async(req,res)=>{proxied++;res.end('{}');}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});const origin='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(origin+'/api/stores')).status,200);assert.equal(proxied,1);
 assert.equal((await fetch(origin+'/api/templates/store',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);assert.equal(authenticated,0);
 const template=await templateForPrompt('store','fashion-store-1');const r=await fetch(origin+'/api/templates/store',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({files:template.files})});assert.equal(r.status,200);assert.equal(authenticated,1);assert.ok((await r.json()).files['src/storefront.jsx']);
});
