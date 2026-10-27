import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createPublisher,publicRequest} from '../server/publisher.mjs';
import {createServer} from '../server/serve.mjs';
const token='test-only-private-publishing-service-token';
const call=(port,path='/',headers={},method='GET')=>new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,method,headers:{Host:'my-shop.draftmango.com',...headers}},res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('error',reject);req.end();});
test('publisher rejects path traversal, foreign hosts and write methods',()=>{
 for(const url of ['/../secret','/%2e%2e/file','/%252e%252e/file','//evil','/file%00','/a\\b','http://evil/'])assert.equal(publicRequest({method:'GET',url,headers:{host:'shop.draftmango.com'}},'draftmango.com').error,404,url);
 for(const host of ['draftmango.com','shop.draftmango.com.evil','shop.evil','shop.nested.draftmango.com'])assert.equal(publicRequest({method:'GET',url:'/',headers:{host}},'draftmango.com').error,404,host);
 assert.equal(publicRequest({method:'POST',url:'/',headers:{host:'shop.draftmango.com'}},'draftmango.com').error,405);
});
test('public gateway can only request published assets and never forwards visitor credentials',async t=>{
 let seen;
 const backend=http.createServer((req,res)=>{seen={url:req.url,headers:req.headers};res.writeHead(200,{'Content-Type':'text/html','Set-Cookie':'private=value','Access-Control-Allow-Credentials':'true'});res.end('<h1>Public site</h1>');});
 backend.listen(0,'127.0.0.1');await once(backend,'listening');
 const gateway=createPublisher({token,baseDomain:'draftmango.com',backendPort:backend.address().port,canonicalHost:'draftmango.com',production:true});gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 t.after(()=>{for(const server of [gateway,backend]){server.closeAllConnections();server.close();}});
 const r=await call(gateway.address().port,'/api/accounts/session',{Cookie:'account=secret',Authorization:'Bearer private','X-Publishing-Token':'visitor-controlled'});
 assert.equal(r.status,200);assert.ok(seen.url.startsWith('/internal/publishing/file?'));assert.ok(seen.url.includes('path=api%2Faccounts%2Fsession'));
 assert.equal(seen.headers.cookie,undefined);assert.equal(seen.headers.authorization,undefined);assert.equal(seen.headers['x-publishing-token'],token);assert.equal(seen.headers.host,'draftmango.com');
 assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.headers['access-control-allow-credentials'],undefined);assert.equal(r.headers['cache-control'],'no-store');assert.ok(r.headers['content-security-policy'].includes("worker-src 'none'"));
});
test('workspace proxy admits publishing API but never admits the private asset endpoint',async t=>{
 let calls=0;const server=createServer({accountProxy:async(req,res)=>{calls++;res.writeHead(200);res.end('{}');}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
 const port=server.address().port,headers={Host:'127.0.0.1:'+port};
 assert.equal((await call(port,'/api/publishing/sites',headers)).status,200);assert.equal(calls,1);
 assert.equal((await call(port,'/internal/publishing/file?host=shop.draftmango.com',headers)).status,404);assert.equal(calls,1);
});
