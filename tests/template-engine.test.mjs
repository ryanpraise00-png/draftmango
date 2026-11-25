import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {templateForPrompt} from '../server/template-library.mjs';
import {templateFiles,handle} from '../server/template-mcp.mjs';
import {createManifest,validateTemplateFiles,designFingerprint,hash} from '../server/template-engine/design-policy.mjs';
import {applyTemplateEdits,templateContentContext} from '../server/template-engine/personalization.mjs';
import {HttpError} from '../server/http-error.mjs';
import {createServer} from '../server/serve.mjs';

const hosted=await templateForPrompt('independent cafe','cafe-1');
const exported=await templateFiles('cafe-1','My Cafe');
const manifest=JSON.parse(hosted.files['template.lock.json']);
const update=(edits=[],colours=[])=>({action:'update',title:'My Cafe',message:'Updated the existing design.',edits,colours});

test('web and MCP adapters use one version of the template, source and vendor assets',()=>{
  assert.equal(hosted.version,exported.template.version);
  assert.deepEqual(manifest.assets,exported.manifest.assets);
  for(const [name,source] of Object.entries(hosted.files)) {
    if(['index.html','TEMPLATE.md','template.lock.json'].includes(name))continue;
    assert.equal(exported.files[name],source.replaceAll('https://draftmango.com/framo/assets/','/framo/assets/'),name);
  }
  for(const [name,record] of Object.entries(exported.manifest.assets)) {
    const bytes=exported.assetFiles[name]!==undefined?Buffer.from(exported.assetFiles[name]):Buffer.from(exported.binaryFiles[name],'base64');
    assert.equal(hash(bytes),record.sha256,name);
    assert.equal(bytes.length,record.bytes,name);
  }
  assert.equal(validateTemplateFiles(manifest,hosted.files).valid,true);
  assert.equal(validateTemplateFiles(exported.manifest,exported.files).valid,true);
});

test('personalization preserves layout fingerprints through repeated copy and colour edits',()=>{
  let files=hosted.files;
  for(const label of ['Cove Coffee','Cove Coffee & Bakery']) {
    const context=templateContentContext(files,'cafe',{creating:true});
    const field=context.fields.find(f=>f.kind==='text'&&f.value.trim().length>3);
    const result=applyTemplateEdits(files,update([{id:field.id,value:label,allMatching:false}],[{name:'primary',value:'#734a2e'}]),context,'');
    assert.equal(validateTemplateFiles(manifest,result.files).valid,true);
    assert.equal(result.files['template.lock.json'],hosted.files['template.lock.json']);
    files=result.files;
  }
});

test('design guard rejects class, routing, runtime, CSS, file deletion and extra executable changes',()=>{
  const page='src/pages/Page0.jsx';
  const changes=[
    {[page]:hosted.files[page].replace('className={"','className={"invented-layout ')},
    {'src/App.jsx':hosted.files['src/App.jsx']+'\n// changed routing'},
    {'src/template-runtime.jsx':'export default function runtime(){}'},
    {'src/styles.css':hosted.files['src/styles.css']+'\nbody{font-family:Comic Sans MS}'},
    {'src/pages/Invented.jsx':'export default ()=> <h1>New layout</h1>'},
    {'template.lock.json':'{}'},
    {[page]:null},
  ];
  for(const proposal of changes)assert.equal(validateTemplateFiles(manifest,proposal,{partial:true}).valid,false,JSON.stringify(Object.keys(proposal)));
  const missing={...hosted.files};delete missing[page];
  assert.equal(validateTemplateFiles(manifest,missing).valid,false);
  const route=Object.keys(hosted.files).find(n=>n.startsWith('src/shared/')&&hosted.files[n].includes('#page='));
  assert.equal(validateTemplateFiles(manifest,{[route]:hosted.files[route].replace('#page=','#invented=')},{partial:true}).valid,false);
});

test('JSX text edits remain text, while element and script injection fail the same guard',()=>{
  const name='src/pages/Page0.jsx',original='export default function Page(){return <main><h1>Hello</h1><img alt="Shop" src="https://example.test/a.png" /></main>}';
  const files={...hosted.files,[name]:original};
  const pinned=createManifest({id:'fixture',name:'Fixture'},files);
  files['template.lock.json']=JSON.stringify(pinned,null,2)+'\n';
  const context=templateContentContext(files,'Hello',{creating:true});
  const field=context.fields.find(f=>f.value==='Hello');
  const changed=applyTemplateEdits(files,update([{id:field.id,value:'<script>literal</script>',allMatching:false}]),context,'');
  assert.equal(validateTemplateFiles(pinned,changed.files).valid,true);
  assert.equal(designFingerprint(name,original),designFingerprint(name,changed.files[name]));
  assert.equal(validateTemplateFiles(pinned,{[name]:original.replace('Hello','<script>alert(1)</script>')},{partial:true}).valid,false);
  assert.equal(validateTemplateFiles(pinned,{[name]:original.replace('https://example.test/a.png','javascript:alert(1)')},{partial:true}).valid,false);
});

test('MCP validation reports the same violations and rejects malformed arguments',async()=>{
  const request=(name,args)=>handle({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});
  const result=await request('validate_template_files',{manifest,files:{'src/App.jsx':'new layout'},partial:true});
  assert.equal(result.result.structuredContent.valid,false);
  assert.equal((await request('get_template_files',{id:'cafe-1',unexpected:true})).result.isError,true);
  assert.equal((await request('search_templates',{brief:[],limit:100})).result.isError,true);
  assert.equal((await handle(null)).error.code,-32600);
});

test('authenticated browser import returns the same pinned package; unknown ids have no fallback',async t=>{
  let authenticated=false;
  const server=createServer({accountSession:async()=>{if(!authenticated)throw new HttpError(401,'unauthorized','Sign in.');return 'owner';}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const send=(body,headers={})=>fetch(origin+'/api/templates/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await send({brief:'cafe'})).status,401);
  authenticated=true;
  const response=await send({brief:'cafe'});
  assert.equal(response.status,200);const result=await response.json();
  assert.equal(result.id,'cafe-1');assert.equal(result.version,hosted.version);assert.deepEqual(result.files,hosted.files);
  assert.equal((await send({brief:'cafe',id:'non-existent'})).status,422);
  assert.equal((await send({brief:'cafe',id:'../private'})).status,400);
  assert.equal((await send({brief:'cafe'},{Origin:'https://untrusted.example'})).status,403);
});

test('browser template loader uses the shared authenticated endpoint without a raw-file fallback',async()=>{
  const source=await readFile(new URL('../web/templates-model.js',import.meta.url),'utf8');
  const calls=[];
  const context={DraftmangoProject:{valid:()=>true},DraftmangoAccounts:{request:async(url,options)=>{calls.push({url,options});return hosted;}}};
  runInNewContext(source,context);
  const result=await context.DraftmangoTemplates.load('auto','A cafe');
  assert.equal(result.version,hosted.version);
  assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/templates/start');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].options.body)),{brief:'A cafe'});
  context.DraftmangoAccounts.request=async()=>{throw new Error('Sign in to continue.');};
  await assert.rejects(context.DraftmangoTemplates.load('cafe-1','cafe'),/Sign in/);
});
