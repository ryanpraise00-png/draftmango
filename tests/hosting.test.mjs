import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer } from '../server/serve.mjs';
import { AIError } from '../server/ai.mjs';
import { publicOrigin, requestBoundary } from '../server/hosting.mjs';
import { upstreamHeaders, djangoSession } from '../server/django.mjs';

test('production origin rejects HTTP, credentials and paths', () => {
  for (const value of ['http://draftmango.com', 'https://draftmango.com/', 'https://draftmango.com/path', 'https://owner:secret@draftmango.com']) assert.throws(() => publicOrigin(value));
  assert.equal(publicOrigin('https://draftmango.com'), 'https://draftmango.com');
});

test('session lookup preserves canonical Host and HTTPS when backend has a private address', async t => {
  const captured = [];
  const backend=http.createServer((req,res)=>{captured.push(req.headers);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({user:req.headers.cookie ? {id:'owner'} : null}));});
  backend.listen(0,'127.0.0.1');await once(backend,'listening');
  const old=process.env.DJANGO_PORT;process.env.DJANGO_PORT=String(backend.address().port);
  t.after(()=>{backend.closeAllConnections();backend.close();if(old===undefined)delete process.env.DJANGO_PORT;else process.env.DJANGO_PORT=old;});
  const request={headers:{host:'draftmango.com','x-draftmango-account':'owner'},draftmangoOrigin:'https://draftmango.com',draftmangoClientIP:'198.51.100.1'};
  await assert.rejects(djangoSession(request),error=>error.code==='sign_in');
  request.headers.cookie='session=test-only';
  assert.equal(await djangoSession(request),'owner');
  assert.equal(captured[0].host,'draftmango.com');assert.equal(captured[0]['x-forwarded-proto'],'https');
});

test('only an explicitly trusted proxy can supply a client IP; protocol is server-owned', () => {
  const request = { headers: {host: 'draftmango.com', 'x-real-ip': '198.51.100.10', 'x-forwarded-proto': 'http', 'x-forwarded-for': 'evil', 'x-draftmango-client-ip': '203.0.113.4'}, socket: {remoteAddress: '172.20.0.2'} };
  requestBoundary(request, 'https://draftmango.com', []);
  let headers = upstreamHeaders(request);
  assert.equal(headers['x-draftmango-client-ip'], '172.20.0.2');
  assert.equal(headers['x-forwarded-proto'], 'https');
  assert.equal(headers['x-forwarded-for'], undefined);
  requestBoundary(request, 'https://draftmango.com', ['172.20.0.2']);
  assert.equal(upstreamHeaders(request)['x-draftmango-client-ip'], '198.51.100.10');
  request.headers['x-real-ip'] = '198.51.100.10, 1.2.3.4';
  requestBoundary(request, 'https://draftmango.com', ['172.20.0.2']);
  assert.equal(upstreamHeaders(request)['x-draftmango-client-ip'], '172.20.0.2');
});

test('HTTPS proxy accepts canonical host and same-origin API; rejects forged hosts and origins', async t => {
  const server = createServer({publicOrigin: 'https://draftmango.com', accountProxy: async (req, res) => {res.writeHead(200); res.end('ok');}});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => {server.closeAllConnections(); server.close();});
  const request = (host, origin, path = '/api/accounts/session', extra = {}) => new Promise((resolve, reject) => {
    const req = http.get({hostname:'127.0.0.1', port:server.address().port, path, headers:{Host:host, ...(origin ? {Origin:origin} : {}), ...extra}}, res => {res.resume(); res.on('end', () => resolve(res.statusCode));}); req.on('error', reject);
  });
  assert.equal(await request('draftmango.com', 'https://draftmango.com'), 200);
  assert.equal(await request('evil.example', 'https://draftmango.com'), 403);
  assert.equal(await request('draftmango.com', 'http://draftmango.com'), 403);
  assert.equal(await request('draftmango.com', 'https://evil.example'), 403);
  assert.equal(await request('draftmango.com', undefined, '/healthz'), 200);
  assert.equal(await request('draftmango.com', undefined, '/api/accounts/session', {'Sec-Fetch-Site':'cross-site'}), 403);
});

test('production generation allows two separate accounts, blocks overlap and releases both slots', async t => {
  const releases = [];
  const files = {'index.html':'<!doctype html><html><body><h1>Test</h1></body></html>','styles.css':'body{color:#111}','app.js':''};
  const server = createServer({publicOrigin:'https://draftmango.com', cooldownMs:0, limiter:null,
    accountSession:async req => req.headers['x-draftmango-account'],
    configLoader:async () => ({provider:'anthropic', key:'test-only', model:'claude-sonnet-5-5', maxTokens:1024}),
    fetchImpl:async () => new Promise(resolve => releases.push(() => resolve(Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({action:'update',title:'Test',message:'Updated.',files})}]}))))
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => {releases.forEach(release => release()); server.closeAllConnections(); server.close();});
  const post = owner => new Promise((resolve,reject) => {
    const req = http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/ai/generate',method:'POST',headers:{Host:'draftmango.com',Origin:'https://draftmango.com','Content-Type':'application/json','X-Draftmango-Account':owner}}, res => {res.resume();res.on('end',()=>resolve(res.statusCode));});
    req.on('error',reject);req.end(JSON.stringify({mode:'edit',prompt:'Update title',files}));
  });
  const waitFor = async count => {for(let n=0;n<100 && releases.length<count;n++) await new Promise(resolve=>setTimeout(resolve,10)); assert.equal(releases.length,count);};
  const a=post('a'); await waitFor(1);
  assert.equal(await post('a'),429);
  const b=post('b'); await waitFor(2);
  assert.equal(await post('c'),429);
  releases[0](); releases[1]();
  assert.deepEqual(await Promise.all([a,b]),[200,200]);
  const c=post('c'); await waitFor(3); releases[2](); assert.equal(await c,200);
});

test('production asks the shared limit service before generating and always releases afterwards', async t => {
  const calls = [], held = new Set(); let outcome = 'ok', serviceDown = false;
  const limiter = async (request, body) => {
    const owner = request.headers['x-draftmango-account']; calls.push(body.action + ':' + body.kind + ':' + owner);
    if (serviceDown) throw new AIError(503, 'limits_unavailable', 'Generation limits are unavailable. Please try again shortly.');
    if (body.action === 'release') { held.delete(owner); return {released:true}; }
    if (held.has(owner) || held.size >= 2) throw new AIError(429, 'busy', 'Please wait a little before generating again.');
    held.add(owner); return {acquired:true};
  };
  const files = {'index.html':'<!doctype html><html><body><h1>Test</h1></body></html>','styles.css':'body{color:#111}','app.js':''};
  const reply = () => outcome === 'ok'
    ? Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({action:'update',title:'Test',message:'Updated.',files})}]})
    : new Response('upstream failure', {status:500});
  const server = createServer({publicOrigin:'https://draftmango.com', limiter,
    accountSession:async req => req.headers['x-draftmango-account'],
    configLoader:async () => ({provider:'anthropic', key:'test-only', model:'claude-sonnet-5-5', maxTokens:1024}),
    fetchImpl:async () => reply()});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(() => {server.closeAllConnections(); server.close();});
  const post = owner => new Promise((resolve,reject) => {
    const req = http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/ai/generate',method:'POST',headers:{Host:'draftmango.com',Origin:'https://draftmango.com','Content-Type':'application/json','X-Draftmango-Account':owner}}, res => {res.resume();res.on('end',()=>resolve(res.statusCode));});
    req.on('error',reject);req.end(JSON.stringify({mode:'edit',prompt:'Update title',files}));
  });
  assert.equal(await post('a'), 200);
  assert.deepEqual(calls, ['acquire:generate:a','release:generate:a']);
  outcome = 'fail'; calls.length = 0;
  assert.notEqual(await post('a'), 200);
  assert.deepEqual(calls, ['acquire:generate:a','release:generate:a']);
  assert.equal(held.size, 0);
  held.add('x'); held.add('y'); calls.length = 0;
  assert.equal(await post('a'), 429);
  assert.deepEqual(calls, ['acquire:generate:a']);
  held.clear(); serviceDown = true;
  assert.equal(await post('a'), 503);
});
