import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../serve.mjs';
import { readConfig, parseResult, publicConfig } from '../ai.mjs';
import '../dist/workspace-model.js';
import '../dist/workspace-ai.js';

const key = 'test-only-secret-never-in-browser';
const config = { provider:'anthropic', key, model: 'claude-sonnet-5-5', maxTokens: 16384, workspace: '' };
const files = { 'index.html': '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hello Mango</h1><script src="app.js"></script></body></html>', 'styles.css': 'body{color:#292a24}', 'app.js': '' };
const output = { action:'update', title:'Mango', message:'Created a welcoming page.', files };
const providerResult = (value = output, stop_reason = 'end_turn') => ({ stop_reason, content:[{type:'text', text:JSON.stringify(value)}] });
// Transport and provider error tests use editing (one call); creation's two stages
// and failure boundaries are exercised separately in design-coordinator.test.mjs.
const input = { mode:'edit', prompt:'Build a warm website', files, history:[] };
async function fixture(t, options = {}) {
  const server = createServer({ accountSession: async () => null, configLoader: async () => config, fetchImpl: async () => Response.json(providerResult()), cooldownMs:0, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  return { base, server, post: (value=input, overrides={}) => fetch(base + '/api/ai/generate', { method:'POST', headers:{origin:base, 'content-type':'application/json'}, body:JSON.stringify(value), ...overrides }) };
}
test('environment loads locally, reloads on save, and process variables take precedence', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'draftmango-config-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const file = path.join(directory, '.env');
  await writeFile(file, '# configuration\nAI_PROVIDER=anthropic\nANTHROPIC_API_KEY="first"\nANTHROPIC_MODEL=claude-sonnet-5-5\n');
  assert.equal((await readConfig(file, {})).key, 'first');
  await writeFile(file, 'AI_PROVIDER=anthropic\nANTHROPIC_API_KEY=second # local change\n');
  assert.equal((await readConfig(file, {})).key, 'second');
  assert.equal((await readConfig(file, {ANTHROPIC_API_KEY:'process'})).key, 'process');
  await writeFile(file, 'AI_MAX_TOKENS=999999');
  await assert.rejects(readConfig(file, {}), error => error.code === 'configuration');
});
test('status exposes configuration only; source and environment files are not served', async t => {
  const {base} = await fixture(t);
  const status = await (await fetch(base + '/api/ai/status')).json();
  assert.deepEqual(status, publicConfig(config));
  for (const file of ['/.env', '/.env.example', '/ai.mjs', '/serve.mjs', '/%2e%2e%5c.env']) {
    const response = await fetch(base + file);
    assert.ok(response.status >= 400);
    assert.ok(!(await response.text()).includes(key));
  }
  assert.equal((await fetch(base + '/workspace.html')).status, 200);
});
test('generation authenticates only upstream and passes current files and context in structured output request', async t => {
  let received;
  const {post} = await fixture(t, {fetchImpl: async (url, request) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(request.headers.authorization, 'Bearer ' + key);
    received = JSON.parse(request.body);
    return Response.json(providerResult());
  }});
  const response = await post({...input, mode:'edit', history:[{role:'user', text:'Keep my colors'}]});
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(!body.includes(key));
  assert.deepEqual(JSON.parse(body).files, files);
  assert.equal(received.output_config.format.type, 'json_schema');
  assert.equal(JSON.parse(received.messages[0].content).history[0].text, 'Keep my colors');
  assert.deepEqual(JSON.parse(received.messages[0].content).files, files);
});
test('foreign origins, sandbox null origins, missing origin and wrong content types cannot generate', async t => {
  let calls = 0;
  const {post, base} = await fixture(t, {fetchImpl: async () => { calls++; return Response.json(providerResult()); }});
  for (const origin of ['https://untrusted.example', 'null', 'http://127.0.0.1:9999', undefined]) {
    const headers = {'content-type':'application/json'};
    if (origin) headers.origin = origin;
    assert.equal((await post(input, {headers})).status, 403);
  }
  assert.equal((await post(input, {headers:{origin:base, 'content-type':'text/plain'}})).status, 403);
  const rebindingStatus = await new Promise((resolve,reject) => {
    const request = http.get(base + '/api/ai/status', {headers:{host:'attacker.example'}}, response => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
  });
  assert.equal(rebindingStatus, 403);
  assert.equal(calls, 0);
});
test('invalid and oversized requests do not call the provider', async t => {
  let calls = 0;
  const {post} = await fixture(t, {fetchImpl: async () => { calls++; return Response.json(providerResult()); }});
  assert.equal((await post({...input, files:{'index.html':'<html>'}})).status, 400);
  assert.equal((await post(input, {body:'{ broken'})).status, 400);
  assert.equal((await post({...input, prompt:'a'.repeat(12001)})).status, 400);
  assert.equal((await post(input, {body:' '.repeat(6*1024*1024+1)})).status, 413);
  assert.equal(calls, 0);
});
test('missing key and upstream errors remain actionable without leaking upstream details', async t => {
  const missing = await fixture(t, {configLoader:async () => ({...config, key:''})});
  assert.equal((await (await missing.post()).json()).error.code, 'missing_key');
  for (const [status, code] of [[401,'invalid_key'],[402,'billing'],[404,'model'],[429,'rate_limit'],[529,'provider_unavailable']]) {
    const {post} = await fixture(t, {fetchImpl:async () => new Response(key, {status})});
    const response = await post();
    const body = await response.text();
    assert.equal(JSON.parse(body).error.code, code);
    assert.ok(!body.includes(key));
  }
});
test('truncated, malformed, incomplete and refused results never return replacement files', async t => {
  for (const result of [providerResult(output,'max_tokens'), providerResult(output,'refusal'), {stop_reason:'end_turn',content:[{type:'text',text:'invalid'}]}, providerResult({...output, files:{...files, 'index.html':'<html><body>unfinished'}})]) {
    const {post} = await fixture(t, {fetchImpl:async () => Response.json(result)});
    const response = await post();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).files, undefined);
  }
  const reply = parseResult(providerResult({...output,action:'reply',files:{'index.html':'','styles.css':'','app.js':''}}), config);
  assert.equal(reply.files, null);
});
test('timeout aborts provider work and concurrent generations are bounded', async t => {
  let aborted = false;
  const {post} = await fixture(t, {timeoutMs:80, fetchImpl:(_url,{signal}) => new Promise((resolve,reject) => {
    signal.addEventListener('abort', () => {aborted=true;reject(new Error('aborted'));}, {once:true});
  })});
  const first = post();
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal((await post()).status, 429);
  const response = await first;
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'timeout');
  assert.equal(aborted, true);
});
test('closing a generation cancels upstream and frees the local generation slot', async t => {
  let started;
  const began = new Promise(resolve => {started=resolve;});
  let aborted;
  const cancelled = new Promise(resolve => {aborted=resolve;});
  let calls = 0;
  const {post} = await fixture(t, {fetchImpl:(_url,{signal}) => {
    calls++;
    if (calls > 1) return Promise.resolve(Response.json(providerResult()));
    started();
    return new Promise((resolve,reject) => signal.addEventListener('abort', () => {aborted(); reject(new Error('aborted'));}, {once:true}));
  }});
  const controller = new AbortController();
  const request = post(input, {signal:controller.signal}).catch(error => error.name);
  await began; controller.abort(); await cancelled;
  assert.equal(await request, 'AbortError');
  assert.equal((await post()).status, 200);
});
test('AI versions and pending status survive reload and restore without mutating the prior draft', () => {
  const M = globalThis.DraftmangoModel;
  const original = {...M.createProject('Mango'), ai:{state:'pending'}};
  const updated = {...M.commitFiles(original, files, 'Created with Claude'), ai:{state:'ready'}};
  const library = M.readStore(JSON.stringify({schema:1, activeId:updated.id, projects:[updated]}));
  const restored = library.projects[0];
  assert.equal(restored.ai.state, 'ready');
  assert.equal(restored.history.at(-1).label, 'Created with Claude');
  assert.deepEqual(restored.files, files);
  assert.equal(M.restore(restored,0).files, null);
  assert.equal(original.history.length,1);
  assert.equal(original.files,undefined);
});


const grokConfig = {provider:'xai', key, model:'grok-4.7', maxTokens:16384, workspace:''};
const openaiConfig = {provider:'openai', key, model:'gpt-6-luna', maxTokens:32768, reasoningEffort:'medium', workspace:''};
const grokResult = (value = output) => ({
  status:'completed',
  output:[
    {type:'reasoning', encrypted_content:'never-a-visible-answer'},
    {type:'message', role:'assistant', content:[{type:'output_text',text:JSON.stringify(value)}]}
  ]
});
test('Grok uses xAI Responses with strict JSON output and no response storage or Anthropic headers', async t => {
  let captured;
  const {post,base} = await fixture(t, {
    configLoader:async () => grokConfig,
    fetchImpl:async (url, options) => {
      assert.equal(url,'https://api.x.ai/v1/responses');
      assert.equal(options.headers.authorization,'Bearer ' + key);
      assert.equal(options.headers['anthropic-version'],undefined);
      captured = JSON.parse(options.body);
      return Response.json(grokResult());
    }
  });
  assert.deepEqual(await (await fetch(base + '/api/ai/status')).json(),publicConfig(grokConfig));
  const response = await post({...input,mode:'edit',history:[{role:'user',text:'Keep the current colors'}]});
  assert.equal(response.status,200);
  const data = await response.json();
  assert.deepEqual(data.files,files);
  assert.equal(data.name,'Grok');
  assert.equal(data.provider,'xai');
  assert.equal(captured.store,false);
  assert.equal(captured.stream,true);
  assert.deepEqual(captured.reasoning,{effort:'low'});
  assert.equal(captured.max_output_tokens,16384);
  assert.equal(captured.text.format.strict,true);
  assert.equal(captured.text.format.type,'json_schema');
  assert.equal(captured.input[0].role,'system');
  assert.deepEqual(JSON.parse(captured.input[1].content).files,files);
  assert.equal(JSON.stringify(data).includes(key),false);
  assert.equal(JSON.stringify(data).includes('never-a-visible-answer'),false);
});
test('Grok incomplete, failed, malformed and refusal responses cannot replace the website', async t => {
  const cases = [
    {...grokResult(),status:'incomplete',incomplete_details:{reason:'max_output_tokens'}},
    {...grokResult(),status:'in_progress'},
    {...grokResult(),status:'failed',error:{message:'provider internals'}},
    {...grokResult(),output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'refused'}]}]},
    {...grokResult(),output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'{broken'}]}]},
    grokResult({...output,files:{...files,'index.html':'<html><body>unfinished'}})
  ];
  for (const result of cases) {
    const {post} = await fixture(t,{configLoader:async()=>grokConfig,fetchImpl:async()=>Response.json(result)});
    const response=await post();
    assert.equal(response.status,502);
    assert.equal((await response.json()).files,undefined);
  }
  const reply=parseResult(grokResult({...output,action:'reply',files:{'index.html':'','styles.css':'','app.js':''}}),grokConfig);
  assert.equal(reply.files,null);
});
test('provider selection keeps keys separate and rejects mismatched credentials before a request', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'draftmango-providers-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'.env');
  await writeFile(file,'AI_PROVIDER=xai\nXAI_API_KEY=xai-fake\nANTHROPIC_API_KEY=sk-ant-fake\n');
  const config=await readConfig(file,{});
  assert.equal(config.key,'xai-fake');
  assert.equal(config.model,'grok-4.7');
  const other=await readConfig(file,{AI_PROVIDER:'anthropic'});
  assert.equal(other.key,'sk-ant-fake');
  assert.equal(other.model,'claude-sonnet-5-5');
  const absent=await readConfig(file,{XAI_API_KEY:''});
  assert.equal(absent.key,'');
  for (const overrides of [{XAI_API_KEY:'sk-ant-fake'},{AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'xai-fake'},{AI_PROVIDER:'unknown'},{XAI_MODEL:'claude-model'}]) {
    await assert.rejects(readConfig(file,overrides),error=>error.code==='configuration');
  }
});
test('Grok errors name the xAI setup and never expose the provider body', async t => {
  const {post}=await fixture(t,{configLoader:async()=>grokConfig,fetchImpl:async()=>new Response(key,{status:401})});
  const result=await (await post()).json();
  assert.equal(result.error.code,'invalid_key');
  assert.match(result.error.message,/xAI.*XAI_API_KEY/);
  assert.equal(JSON.stringify(result).includes(key),false);
});

test('OpenAI configuration selects Luna and keeps provider keys and reasoning settings isolated', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'draftmango-openai-'));
  t.after(() => rm(directory, {recursive:true, force:true}));
  const file = path.join(directory, '.env');
  await writeFile(file, 'OPENAI_API_KEY="sk-test-openai"\nXAI_API_KEY=xai-test\nANTHROPIC_API_KEY=sk-ant-test\nXAI_REASONING_EFFORT=high\n');
  const current = await readConfig(file, {});
  assert.equal(current.provider, 'openai');
  assert.equal(current.model, 'gpt-6-luna');
  assert.equal(current.key, 'sk-test-openai');
  assert.equal(current.reasoningEffort, 'medium');
  assert.equal(current.maxTokens, 32768);
  assert.equal((await readConfig(file, {AI_PROVIDER:'xai'})).key, 'xai-test');
  assert.equal((await readConfig(file, {AI_PROVIDER:'anthropic'})).key, 'sk-ant-test');
  assert.equal((await readConfig(file, {OPENAI_API_KEY:''})).key, '');
  assert.equal((await readConfig(file, {OPENAI_REASONING_EFFORT:'none'})).reasoningEffort, 'none');
  for (const overrides of [
    {OPENAI_API_KEY:'xai-test'}, {OPENAI_API_KEY:'sk-ant-test'},
    {AI_PROVIDER:'xai', XAI_API_KEY:'sk-test-openai'},
    {AI_PROVIDER:'anthropic', ANTHROPIC_API_KEY:'sk-test-openai'},
    {OPENAI_MODEL:'grok-4.7'}, {OPENAI_REASONING_EFFORT:'minimal'}
  ]) await assert.rejects(readConfig(file, overrides), error => error.code === 'configuration');
});

test('OpenAI Luna uses its own Responses endpoint and streams a validated draft through the browser reader', async t => {
  let captured;
  const {post,base} = await fixture(t, {
    configLoader:async()=>openaiConfig,
    fetchImpl:async(url,options)=>{
      assert.equal(url, 'https://api.openai.com/v1/responses');
      assert.equal(options.headers.authorization, 'Bearer ' + key);
      assert.equal(options.headers['anthropic-version'], undefined);
      captured = JSON.parse(options.body);
      return sseResponse([
        {type:'response.reasoning_text.delta',delta:'private-thinking'},
        {type:'response.output_text.delta',delta:'partial-source'},
        {type:'response.completed',response:grokResult()}
      ]);
    }
  });
  const status = await (await fetch(base + '/api/ai/status')).json();
  assert.equal(status.model, 'gpt-6-luna');
  assert.equal(status.keyVariable, 'OPENAI_API_KEY');
  assert.equal(status.service, 'OpenAI');
  assert.ok(!JSON.stringify(status).includes(key));
  const body = await (await streamPost(post,base,{...input,mode:'edit',history:[{role:'user',text:'Keep my colors'}]})).text();
  assert.ok(!/private-thinking|partial-source|never-a-visible-answer|test-only-secret/.test(body));
  const result = await globalThis.DraftmangoAI.readResponse(new Response(body,{headers:{'content-type':'application/x-ndjson'}}));
  assert.deepEqual(result.files, files);
  assert.equal(result.provider, 'openai');
  assert.equal(captured.model, 'gpt-6-luna');
  assert.equal(captured.store, false);
  assert.equal(captured.stream, true);
  assert.equal(captured.max_output_tokens, 32768);
  assert.deepEqual(captured.reasoning, {effort:'medium'});
  assert.equal(captured.temperature, undefined);
  assert.equal(captured.text.format.type, 'json_schema');
  assert.equal(captured.text.format.strict, true);
  assert.deepEqual(JSON.parse(captured.input[1].content).files, files);
  assert.equal(JSON.parse(captured.input[1].content).history[0].text, 'Keep my colors');
});

test('OpenAI credentials and model errors have provider-specific messages without leaking details', async t => {
  for (const [status,code,pattern] of [[401,'invalid_key',/OpenAI.*OPENAI_API_KEY/],[404,'model',/OPENAI_MODEL/]]) {
    const {post}=await fixture(t,{configLoader:async()=>openaiConfig,fetchImpl:async()=>new Response(key,{status})});
    const result=await (await post()).json();
    assert.equal(result.error.code,code);
    assert.match(result.error.message,pattern);
    assert.equal(JSON.stringify(result).includes(key),false);
  }
});

function sseResponse(events, {chunkSize = 7, tail = true} = {}) {
  const bytes = new TextEncoder().encode(': keepalive\r\n\r\n' + events.map(event => 'event: ' + event.type + '\r\ndata: ' + JSON.stringify(event) + '\r\n\r\n').join('') + (tail ? 'data: [DONE]\r\n\r\n' : ''));
  let offset = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) { controller.close(); return; }
      controller.enqueue(bytes.slice(offset, offset += chunkSize));
    }
  }), {headers:{'content-type':'text/event-stream'}});
}
function streamPost(post, base, value = input, options = {}) {
  return post(value, {headers:{origin:base, 'content-type':'application/json', accept:'application/x-ndjson'}, ...options});
}

test('streamed Grok handles split UTF-8 and SSE frames; only complete validated files reach the browser', async t => {
  const value = {...output, message:'Socks for café days 🧦', files:{...files,'app.js':'const label = "🧦";'}};
  const {post,base} = await fixture(t, {
    configLoader:async()=>grokConfig,
    fetchImpl:async()=>sseResponse([
      {type:'response.reasoning_text.delta',delta:'private-thinking-do-not-forward'},
      {type:'response.output_text.delta',delta:'partial-source-do-not-forward'},
      {type:'response.completed',response:grokResult(value)}
    ])
  });
  const response = await streamPost(post,base);
  const bytes = await response.text();
  const events = bytes.trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(events[0].type,'start');
  assert.equal(events[0].timeoutSeconds,900);
  assert.ok(events.some(event=>event.phase==='writing'));
  assert.equal(events.filter(event=>event.type==='result').length,1);
  assert.deepEqual(events.at(-1).result.files,value.files);
  assert.ok(!/private-thinking|partial-source|never-a-visible-answer|test-only-secret/.test(bytes));
  const parsed = await globalThis.DraftmangoAI.readResponse(new Response(bytes, {headers:{'content-type':'application/x-ndjson'}}));
  assert.equal(parsed.message,value.message);
});

test('slow generation sends heartbeats and completes within the configured deadline', async t => {
  const {post,base} = await fixture(t,{
    timeoutMs:1000, heartbeatMs:10,
    fetchImpl:async()=>{await new Promise(resolve=>setTimeout(resolve,100));return Response.json(providerResult());}
  });
  const events = [];
  const started = Date.now();
  const result = await globalThis.DraftmangoAI.readResponse(await streamPost(post,base), event=>events.push({...event,at:Date.now()-started}));
  assert.deepEqual(result.files,files);
  assert.ok(events.filter(event=>event.type==='progress').length>=3);
  assert.equal(events[0].timeoutSeconds,1);
  assert.ok(events[0].at<100,'start arrives before generation completes');
});

test('stream timeout sends a terminal error, aborts upstream and releases the generation slot', async t => {
  let calls=0, aborted=false;
  const {post,base} = await fixture(t,{
    timeoutMs:60, heartbeatMs:10,
    fetchImpl:(_url,{signal})=>{
      if (++calls>1) return Promise.resolve(Response.json(providerResult()));
      return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}));
    }
  });
  const first = await streamPost(post,base);
  assert.equal((await post()).status,429);
  await assert.rejects(globalThis.DraftmangoAI.readResponse(first),error=>error.code==='timeout');
  assert.equal(aborted,true);
  assert.deepEqual((await (await post()).json()).files,files);
});

test('disconnecting the progress stream cancels a running provider stream', async t => {
  let aborted;
  const stopped=new Promise(resolve=>{aborted=resolve;});
  let calls=0;
  const {post,base} = await fixture(t,{
    configLoader:async()=>grokConfig,
    fetchImpl:async(_url,{signal})=>{
      if (++calls>1) return Response.json(grokResult());
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"type":"response.output_text.delta","delta":"partial"}\n\n'));
          signal.addEventListener('abort',()=>{controller.error(new Error('aborted'));aborted();},{once:true});
        }
      }),{headers:{'content-type':'text/event-stream'}});
    }
  });
  const controller=new AbortController();
  const response=await streamPost(post,base,input,{signal:controller.signal});
  await response.body.getReader().read();
  controller.abort();
  await stopped;
  // The cancellation signal is observed just before the server's finally releases busy.
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.deepEqual((await (await post()).json()).files,files);
});

for (const selected of [grokConfig,openaiConfig]) test(selected.provider + ' broken, failed, refused and incomplete streams never deliver replacement files', async t => {
  const cases = [
    [{type:'response.output_text.delta',delta:JSON.stringify(output)}],
    [{type:'error',message:key}],
    [{type:'response.incomplete',response:{...grokResult(),status:'incomplete',incomplete_details:{reason:'max_output_tokens'}}}],
    [{type:'response.failed',response:{status:'failed',error:{message:key}}}],
    [{type:'response.completed',response:{...grokResult(),output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:key}]}]}}],
    [{type:'response.completed',response:grokResult({...output,files:{...files,'index.html':'<html>partial'}})}]
  ];
  for (const events of cases) {
    const {post,base}=await fixture(t,{configLoader:async()=>selected,fetchImpl:async()=>sseResponse(events)});
    const body=await (await streamPost(post,base)).text();
    const messages=body.trim().split('\n').map(line=>JSON.parse(line));
    assert.equal(messages.at(-1).type,'error');
    assert.ok(!messages.some(event=>event.type==='result'));
    assert.ok(!body.includes(key));
  }
});

test('browser stream reader tolerates split Unicode but rejects a missing or malformed terminal result', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({type:'progress',phase:'writing'})+'\n'+JSON.stringify({type:'result',result:{...output,message:'Ready 🧦'}})+'\n');
  let i=0;
  const response=new Response(new ReadableStream({pull(controller){if(i===encoded.length)controller.close();else controller.enqueue(encoded.slice(i,++i));}}),{headers:{'content-type':'application/x-ndjson'}});
  const events=[];
  assert.equal((await globalThis.DraftmangoAI.readResponse(response,event=>events.push(event))).message,'Ready 🧦');
  assert.equal(events.length,1);
  for (const body of ['{"type":"progress"}\n','{"type":"result","result":','not json\n']) {
    await assert.rejects(globalThis.DraftmangoAI.readResponse(new Response(body,{headers:{'content-type':'application/x-ndjson'}})),/unchanged/);
  }
  await assert.rejects(globalThis.DraftmangoAI.readResponse(Response.json({error:{code:'invalid_key',message:'Check key'}},{status:502})),error=>error.code==='invalid_key');
});

test('generation deadline and reasoning effort have explicit validated defaults and overrides', async t => {
  const directory=await mkdtemp(path.join(tmpdir(),'draftmango-deadline-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'.env');
  await writeFile(file,'AI_PROVIDER=xai\n');
  const defaults=await readConfig(file,{});
  assert.equal(defaults.timeoutSeconds,900);
  assert.equal(defaults.reasoningEffort,'low');
  assert.equal(defaults.maxTokens,32768);
  const overrides=await readConfig(file,{AI_TIMEOUT_SECONDS:'1800',XAI_REASONING_EFFORT:'high'});
  assert.equal(overrides.timeoutSeconds,1800);
  assert.equal(overrides.reasoningEffort,'high');
  for(const invalid of [{AI_TIMEOUT_SECONDS:'0'},{AI_TIMEOUT_SECONDS:'1801'},{AI_TIMEOUT_SECONDS:'NaN'},{XAI_REASONING_EFFORT:'none'}]){
    await assert.rejects(readConfig(file,invalid),error=>error.code==='configuration');
  }
});
