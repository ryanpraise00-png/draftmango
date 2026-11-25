import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import http from 'node:http';
import {mkdtemp, rm, readdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createServer} from '../server/serve.mjs';
import {RemoteError, authorizeTemplateRequest} from '../server/template-access.mjs';
import {TemplatePackages} from '../server/template-engine/packages.mjs';
import {hash} from '../server/template-engine/design-policy.mjs';

const origin = 'https://draftmango.com', token = 't'.repeat(43);
const scopes = ['templates:read','templates:download','templates:validate'];
async function fixture(t, options={}) {
  const directory = await mkdtemp(path.join(os.tmpdir(),'dm-remote-'));
  const packages = new TemplatePackages({directory});
  const server = createServer({publicOrigin:origin,templateRemoteOptions:{enabled:true,packages,authorize:async(_req,raw)=>{
    if(raw!==token)throw new RemoteError(401,'invalid_token');return {client_id:'test',scopes};
  },...options}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});});
  const request = (route='/mcp/templates',message={jsonrpc:'2.0',id:1,method:'tools/list'},headers={},method=message===null?'GET':'POST')=>new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:route,method,headers:{Host:'draftmango.com',Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json, text/event-stream',...headers}},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const bytes=Buffer.concat(chunks);let data;try{data=JSON.parse(bytes);}catch{}resolve({status:res.statusCode,headers:res.headers,bytes,data});});
    });req.on('error',reject);req.end(message===null?undefined:typeof message==='string'?message:JSON.stringify(message));
  });
  const call=(name,args)=>request('/mcp/templates',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});
  return {request,call,packages,directory};
}

test('remote access is opt-in and discovery exposes no library or credentials',async t=>{
  const disabled=await fixture(t,{enabled:false});assert.equal((await disabled.request()).status,404);
  const {request}=await fixture(t);
  const metadata=await request('/.well-known/oauth-protected-resource/mcp/templates',null,{Authorization:''});
  assert.equal(metadata.status,200);assert.equal(metadata.data.resource,origin+'/mcp/templates');
  assert.deepEqual(metadata.data.authorization_servers,[origin+'/template-access']);
  const auth=await request('/.well-known/oauth-authorization-server/template-access',null);
  assert.deepEqual(auth.data.grant_types_supported,['client_credentials']);
});

test('bearer required; cookies, query tokens, forged hosts and origins are refused',async t=>{
  let checks=0;
  const {request}=await fixture(t,{authorize:async()=>{checks++;return {client_id:'test',scopes};}});
  assert.equal((await request(undefined,undefined,{Authorization:'',Cookie:'session=someone'})).status,401);
  assert.equal((await request('/mcp/templates?access_token='+token)).status,403);
  assert.equal((await request(undefined,undefined,{Origin:'https://evil.example'})).status,403);
  assert.equal((await request(undefined,undefined,{Origin:'null'})).status,403);
  assert.equal((await request(undefined,undefined,{Host:'evil.example'})).status,403);
  assert.equal(checks,0);
  const response=await request(undefined,undefined,{Authorization:''});
  assert.match(response.headers['www-authenticate'],/resource_metadata=/);
  assert.equal((await request('/internal/template-access/authorize')).status,404);
});

test('HTTP protocol initialization, notifications, content negotiation and method checks',async t=>{
  const {request}=await fixture(t);
  let r=await request('/mcp/templates',{jsonrpc:'2.0',id:'init',method:'initialize',params:{protocolVersion:'2025-06-18'}});
  assert.equal(r.data.result.protocolVersion,'2025-06-18');
  assert.equal(r.headers['mcp-session-id'],undefined,'stateless transport');
  r=await request('/mcp/templates',{jsonrpc:'2.0',method:'notifications/initialized'});
  assert.equal(r.status,202);assert.equal(r.bytes.length,0);
  assert.equal((await request('/mcp/templates',null)).status,405);
  assert.equal((await request(undefined,undefined,{'MCP-Protocol-Version':'not-supported'})).status,400);
  assert.equal((await request(undefined,undefined,{Accept:'application/json'})).status,406);
  assert.equal((await request(undefined,undefined,{'Content-Type':'text/plain'})).status,415);
  assert.equal((await request('/mcp/templates','{broken')).data.error.code,-32700);
  assert.equal((await request('/mcp/templates',[])).data.error.code,-32600);
  assert.equal((await request('/mcp/templates',{jsonrpc:'2.0',method:'tools/call',params:{name:'get_template_package'}})).status,400);
});

test('client scopes hide tools and also block direct calls and downloads',async t=>{
  const {request,call}=await fixture(t,{authorize:async()=>({client_id:'reader',scopes:['templates:read']})});
  assert.deepEqual((await request()).data.result.tools.map(x=>x.name),['search_templates','template_details']);
  const r=await call('get_template_package',{id:'cafe-1'});
  assert.equal(r.status,403);assert.match(r.headers['www-authenticate'],/templates:download/);
  assert.equal((await request('/api/template-packages/cafe-1/'+'a'.repeat(64),null)).status,403);
  const result=await call('search_templates',{brief:'coffee shop'});assert.equal(result.data.result.structuredContent.results[0].id,'cafe-1');
});

test('versioned authenticated download preserves package design and checksums',async t=>{
  const {request,call}=await fixture(t);
  const result=await call('get_template_package',{id:'cafe-1'});
  const descriptor=result.data.result.structuredContent;
  assert.equal(descriptor.files,undefined);assert.equal(descriptor.authentication,'Bearer');
  const route=new URL(descriptor.url).pathname;
  assert.equal((await request(route,null,{Authorization:''})).status,401);
  const downloaded=await request(route,null);
  assert.equal(downloaded.status,200);assert.equal(hash(downloaded.bytes),descriptor.sha256);
  assert.equal(downloaded.bytes.length,descriptor.bytes);assert.equal(downloaded.headers['cache-control'],'private, no-store');
  const bundle=JSON.parse(gunzipSync(downloaded.bytes));
  assert.equal(bundle.template.version,descriptor.template.version);
  assert.ok(bundle.binaryFiles['public/draftmango/assets/fonts/flaticon_multipurpose.woff2'] || Object.keys(bundle.binaryFiles).some(x=>x.endsWith('.woff2')));
  assert.ok(bundle.files['template.lock.json']);
  for(const [name,text] of Object.entries(bundle.assetFiles))assert.equal(hash(text),bundle.manifest.assets[name].sha256);
  for(const [name,data] of Object.entries(bundle.binaryFiles))assert.equal(hash(Buffer.from(data,'base64')),bundle.manifest.assets[name].sha256);
  const valid=await call('validate_template_files',{id:bundle.template.id,version:bundle.template.version,files:bundle.files});
  assert.equal(valid.data.result.structuredContent.valid,true);
  const changed={...bundle.files,'src/styles.css':bundle.files['src/styles.css']+'body{display:none}'};
  assert.equal((await call('validate_template_files',{id:bundle.template.id,version:bundle.template.version,files:changed})).data.result.structuredContent.valid,false);
  assert.equal((await call('validate_template_files',{id:bundle.template.id,version:bundle.template.version,files:changed,manifest:{}})).data.result.isError,true,'cannot substitute a client-authored manifest');
});

test('historical archive survives a new source version and is never overwritten',async t=>{
  const {packages,directory}=await fixture(t);
  const original=await packages.ensure('cafe-1');
  const changed=structuredClone(original.bundle);changed.template.version='c'.repeat(64);changed.manifest.template.version=changed.template.version;
  const later=new TemplatePackages({directory,load:async()=>changed});
  const old=await later.ensure('cafe-1',original.bundle.template.version);
  assert.equal(old.sha256,original.sha256);
  const current=await later.ensure('cafe-1');assert.equal(current.bundle.template.version,changed.template.version);
  assert.equal((await later.ensure('cafe-1',original.bundle.template.version)).sha256,original.sha256);
  await assert.rejects(later.ensure('cafe-1','d'.repeat(64)),e=>e.code==='template_version_unavailable');
  assert.ok((await readdir(directory)).every(name=>name.endsWith('.json.gz')));
});

test('package path traversal and storage exhaustion fail without deleting pinned exports',async t=>{
  const {directory}=await fixture(t);
  const store=new TemplatePackages({directory,quota:1});
  await assert.rejects(store.ensure('../../outside'),e=>e.code==='invalid_package');
  await assert.rejects(store.ensure('cafe-1','../outside'),e=>e.code==='invalid_package');
  await assert.rejects(store.ensure('cafe-1'),e=>e.code==='package_storage_full');
  assert.deepEqual(await readdir(directory),[]);
});

test('authentication outages and shared rate limits are returned without fallback',async t=>{
  for(const status of [401,429,503]) {
    const {request}=await fixture(t,{authorize:async()=>{throw new RemoteError(status,'refused');}});
    const result=await request();assert.equal(result.status,status);
    if(status===429)assert.equal(result.headers['retry-after'],'60');
  }
});

test('request size and per-process expensive work are bounded',async t=>{
  let release,started;
  const ready=new Promise(resolve=>started=resolve);
  const {request,call}=await fixture(t,{packages:{ensure:async()=>{started();await new Promise(resolve=>release=resolve);throw new RemoteError(404,'template_version_unavailable');}}});
  const running=call('get_template_package',{id:'cafe-1'});await ready;
  assert.equal((await call('get_template_package',{id:'cafe-1'})).status,429);
  release();await running;
  assert.equal((await request(undefined,undefined,{'Content-Length':String(9*1024*1024)})).status,413);
});

test('private bridge never forwards cookies or caller-supplied internal headers',async t=>{
  const captured=[];
  const backend=http.createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{captured.push({headers:req.headers,body:JSON.parse(body),path:req.url});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({client_id:'test',scopes}));});});
  backend.listen(0,'127.0.0.1');await once(backend,'listening');
  const old={port:process.env.DJANGO_PORT,token:process.env.DRAFTMANGO_BUILD_TOKEN};
  process.env.DJANGO_PORT=String(backend.address().port);process.env.DRAFTMANGO_BUILD_TOKEN='internal'.repeat(8);
  t.after(()=>{backend.closeAllConnections();backend.close();for(const [key,value] of [['DJANGO_PORT',old.port],['DRAFTMANGO_BUILD_TOKEN',old.token]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
  const req={headers:{host:'draftmango.com',cookie:'must-not-forward','x-draftmango-internal':'forged','x-draftmango-client-ip':'forged'},draftmangoOrigin:origin,draftmangoClientIP:'198.51.100.2'};
  assert.equal((await authorizeTemplateRequest(req,token,'mcp')).client_id,'test');
  assert.equal(captured[0].headers.cookie,undefined);assert.equal(captured[0].headers.authorization,undefined);
  assert.equal(captured[0].headers['x-draftmango-internal'],'internal'.repeat(8));
  assert.equal(captured[0].headers['x-draftmango-client-ip'],'198.51.100.2');
  assert.equal(captured[0].body.resource,origin+'/mcp/templates');
  assert.equal(captured[0].path,'/internal/template-access/authorize');
});
