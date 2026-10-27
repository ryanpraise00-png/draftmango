import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {compileProject} from '../server/compiler.mjs';
import {createBuilder} from '../server/build-service.mjs';
import {createServer} from '../server/serve.mjs';
import {validateInput,generate,parseResult} from '../server/ai.mjs';
import '../web/workspace-model.js';
const P=globalThis.DraftmangoProject,M=globalThis.DraftmangoModel;
export const counter=()=>P.scaffold({'src/App.jsx':"import {useState} from 'react';\nimport Label from './Label.jsx';\nexport default function App(){const [n,setN]=useState(0);return <main><Label/><button onClick={()=>setN(n+1)}>Count {n}</button></main>}", 'src/Label.jsx':"export default function Label(){return <h1>A React website</h1>}"},'React check');
const config={provider:'openai',key:'test-only',model:'gpt-6-luna',maxTokens:12000};
const wrapped=value=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const output=files=>({action:'update',title:'React check',message:'Created a React website.',designBrief:null,files:Object.entries(files).map(([path,content])=>({path,content}))});
test('new requests default to React, edits retain every file and existing HTML projects remain supported',()=>{
  assert.equal(validateInput({mode:'create',prompt:'A shop'}).framework,'react');
  const files=counter();const input=validateInput({mode:'edit',prompt:'Change title',files});
  assert.equal(input.framework,'react');assert.deepEqual(input.files,files);
  assert.equal(validateInput({mode:'edit',prompt:'Change title',files:{'index.html':'hello','styles.css':'','app.js':''}}).framework,'html');
  assert.ok(M.readFiles(files));
  const p=M.commitFiles(M.createProject('Counter'),files);assert.deepEqual(M.readStore(JSON.stringify({schema:1,activeId:p.id,projects:[p]})).projects[0].files,files);
});
test('React response validates duplicate paths, missing entries and traversal, and supplies runnable scaffold',()=>{
  const files=counter();const out=output(Object.fromEntries(Object.entries(files).filter(([n])=>n.startsWith('src/'))));
  const result=parseResult(wrapped(out),config,'react');assert.ok(JSON.parse(result.files['package.json']).dependencies.react);assert.ok(result.files['vite.config.js']);
  for(const invalid of [{...out,files:[...out.files,out.files[0]]},{...out,files:out.files.slice(1)},{...out,files:[...out.files,{path:'../secret.js',content:'no'}]}])assert.throws(()=>parseResult(wrapped(invalid),config,'react'));
  assert.equal(parseResult(wrapped({...out,action:'reply',files:[]}),config,'react').files,null);
});
test('model receives React component contract and strict array schema for edits',async()=>{
  const files=counter();let request;
  const result=await generate({mode:'edit',prompt:'Change title',files},config,{fetchImpl:async(url,options)=>{request=JSON.parse(options.body);return Response.json(wrapped(output(files)));}});
  assert.equal(request.text.format.name,'draftmango_react_project');assert.equal(request.text.format.schema.properties.files.type,'array');
  assert.match(request.input[0].content,/real React application/);assert.doesNotMatch(request.input[0].content,/ONLY three complete/);
  assert.deepEqual(result.files,files);
});
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
  let calls=0;const server=createServer({accountSession:async req=>{if(req.headers['x-test-user']!=='owner'){const {AIError}=await import('../server/ai.mjs');throw new AIError(401,'sign_in','Sign in');}return 'owner';},buildProject:async files=>{calls++;return compileProject(files);}});
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
