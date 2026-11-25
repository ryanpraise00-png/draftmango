import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {compileProject} from '../server/compiler.mjs';
import {createBuilder} from '../server/build-service.mjs';
import {createServer} from '../server/serve.mjs';
import '../web/workspace-model.js';
const P=globalThis.DraftmangoProject,M=globalThis.DraftmangoModel;
export const counter=()=>P.scaffold({'src/App.jsx':"import {useState} from 'react';\nimport Label from './Label.jsx';\nexport default function App(){const [n,setN]=useState(0);return <main><Label/><button onClick={()=>setN(n+1)}>Count {n}</button></main>}", 'src/Label.jsx':"export default function Label(){return <h1>A React website</h1>}"},'React check');
test('compiler bundles JSX, hooks, nested components and CSS without a remote React dependency',async()=>{
  const result=await compileProject(counter());
  assert.deepEqual(Object.keys(result.files),['index.html','assets/site.css','assets/site.js']);
  assert.match(result.files['assets/site.js'],/A React website/);assert.match(result.html,/data:text\/javascript;base64,/);
  assert.doesNotMatch(result.files['index.html'],/src\/main.jsx/);
});
test('compiler rejects source traversal, local filesystem modules, network imports and unsupported packages',async()=>{
  for(const specifier of ['node:fs','/etc/passwd','../../outside.js','https://example.com/evil.js','next/server','not-installed']){
    await assert.rejects(compileProject({...counter(),'src/App.jsx':`import x from ${JSON.stringify(specifier)}; export default x;`}),/Unsupported import|inside the project/);
  }
  await assert.rejects(compileProject({...counter(),'../private.js':'secret'}),/safe relative/);
});
test('compilation does not execute source, package scripts or build config and reports syntax errors',async()=>{
  const files=counter();files['package.json']='{"scripts":{"build":"exit 77"}}';files['vite.config.js']='throw new Error("DO NOT RUN")';
  files['src/App.jsx']='throw new Error("Only a browser may execute this"); export default function App(){return <h1>Hi</h1>}';
  assert.ok((await compileProject(files)).files['assets/site.js']);
  await assert.rejects(compileProject({...files,'src/App.jsx':'export default function ('}),/App.jsx/);
});
test('build API requires a session and same-origin POST; errors never replace saved source',async t=>{
  let calls=0;const server=createServer({accountSession:async req=>{if(req.headers['x-test-user']!=='owner'){const {HttpError}=await import('../server/http-error.mjs');throw new HttpError(401,'sign_in','Sign in');}return 'owner';},buildProject:async files=>{calls++;return compileProject(files);}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
  const base='http://127.0.0.1:'+server.address().port;
  const post=(headers={},files=counter())=>fetch(base+'/api/build',{method:'POST',headers:{'content-type':'application/json',origin:base,...headers},body:JSON.stringify({files})});
  assert.equal((await post()).status,401);assert.equal((await post({origin:'null','x-test-user':'owner'})).status,403);assert.equal(calls,0);
  assert.equal((await post({'x-test-user':'owner'})).status,200);
  assert.equal((await post({'x-test-user':'owner'},{...counter(),'src/App.jsx':'<bad'})).status,422);
});
test('private builder authenticates callers and does not expose source via public reads',async t=>{
  const token='test-private-builder-token-000000000000000000';const server=createBuilder({token});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});
  const url='http://127.0.0.1:'+server.address().port+'/build';
  assert.equal((await fetch(url)).status,404);
  assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,404);
  assert.equal((await fetch(url,{method:'POST',headers:{'X-Build-Token':token},body:JSON.stringify({files:counter()})})).status,200);
});
test('framework routes serve Next output; old bookmarks redirect preserving the browser fragment',async t=>{
  const server=createServer();server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{server.closeAllConnections();server.close();});const base='http://127.0.0.1:'+server.address().port;
  for(const route of ['','auth','dashboard','workspace','pricings','about','help','legal']){const response=await fetch(base+'/'+route);assert.equal(response.status,200);assert.match(await response.text(),/_next\/static/);}
  const old=await fetch(base+'/auth.html?next=workspace',{redirect:'manual'});assert.equal(old.status,308);assert.equal(old.headers.get('location'),'/auth?next=workspace');
});

test('starter preview detection tolerates a saved title but never hides edited source or extra files',()=>{
  const files=P.scaffold({},'Saved project');
  assert.equal(P.isStarter(files),true);
  assert.equal(P.isStarter(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,v.replace(/\n/g,'\r\n')]))),true);
  for(const name of ['src/App.jsx','src/styles.css','src/main.jsx','index.html','package.json']){
    assert.equal(P.isStarter({...files,[name]:files[name]+'<!-- customer edit -->'}),false,name);
  }
  assert.equal(P.isStarter({...files,'notes.md':'Keep this'}),false);
  assert.equal(P.isStarter({'src/App.jsx':files['src/App.jsx']}),false);
  assert.equal(P.isStarter(null),false);
});
