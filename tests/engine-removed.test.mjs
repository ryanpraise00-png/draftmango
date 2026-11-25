import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {readFile,access} from 'node:fs/promises';
import {createServer} from '../server/serve.mjs';
import {HttpError} from '../server/http-error.mjs';

async function listen(t, options={}) {
  const server=createServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>{server.closeAllConnections();server.close();});
  return 'http://127.0.0.1:'+server.address().port;
}

test('all retired AI routes refuse old clients without accessing accounts, providers or compilation',async t=>{
  const unexpected=()=>{assert.fail('Retired AI route touched a service');};
  const base=await listen(t,{accountSession:unexpected,accountProxy:unexpected,buildProject:unexpected,domainConfigLoader:unexpected});
  for(const route of ['/api/ai','/api/ai/status','/api/ai/models','/api/ai/generate','/api/ai/generate/stream']){
    for(const method of ['GET','POST']){
      const response=await fetch(base+route,{method,headers:{Origin:base,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({prompt:'Build a store',stream:true})}:{})});
      assert.equal(response.status,410,method+' '+route);
      assert.equal((await response.json()).error.code,'builder_removed');
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
  }
});

test('preview compilation still acquires and releases shared limits on success and errors, and fails closed',async t=>{
  const events=[];let compileError=false,limitError=null;
  const base=await listen(t,{
    accountSession:async()=>{events.push('session');return 'owner';},
    limiter:async(_request,{action,kind})=>{events.push(action+':'+kind);if(action==='acquire'&&limitError)throw limitError;},
    buildProject:async()=>{events.push('compile');if(compileError)throw new Error('Compile failed');return {html:'<h1>Saved source</h1>',files:{'index.html':'<h1>Saved source</h1>'}};}
  });
  const post=body=>fetch(base+'/api/build',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:body??JSON.stringify({files:{'index.html':'<h1>Saved source</h1>'}})});
  assert.equal((await post()).status,200);
  assert.deepEqual(events,['session','acquire:build','compile','release:build']);
  events.length=0;compileError=true;
  assert.equal((await post()).status,500);
  assert.deepEqual(events,['session','acquire:build','compile','release:build']);
  events.length=0;
  assert.equal((await post('{')).status,400);
  assert.deepEqual(events,['session','acquire:build','release:build']);
  for(const status of [429,503]){
    events.length=0;limitError=new HttpError(status,'limits_unavailable','Unavailable');
    assert.equal((await post()).status,status);
    assert.deepEqual(events,['session','acquire:build']);
  }
});

test('built pages use an inert model control and contain no provider client or AI background requests',async()=>{
  for(const name of ['workspace.js','workspace-extra.js','workspace-dashboard.js','workspace-settings.js','composer-model.js']){
    const source=await readFile(new URL('../out/'+name,import.meta.url),'utf8');
    assert.doesNotMatch(source,/fetch\(['"]\/api\/ai|DraftmangoAI|api\.openai\.com|api\.anthropic\.com|api\.x\.ai/);
  }
  for(const name of ['workspace.html','dashboard.html']){
    const page=await readFile(new URL('../out/'+name,import.meta.url),'utf8');
    assert.match(page,/composer-model\.js/);assert.doesNotMatch(page,/workspace-ai\.js/);
  }
  await assert.rejects(access(new URL('../out/workspace-ai.js',import.meta.url)),{code:'ENOENT'});
  for(const name of ['ai.mjs','builder-flow.mjs','conversation.mjs','design-coordinator.mjs','design-review.mjs']){
    await assert.rejects(access(new URL('../server/'+name,import.meta.url)),{code:'ENOENT'});
  }
});
