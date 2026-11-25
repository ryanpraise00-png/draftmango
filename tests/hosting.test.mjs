import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer } from '../server/serve.mjs';
import { HttpError } from '../server/http-error.mjs';
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

test('isolated template previews can load public icon fonts without exposing API responses', async t => {
 const server=createServer({publicOrigin:'https://draftmango.com',accountProxy:async(_req,res)=>{res.writeHead(200);res.end('{}');}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const get=pathname=>new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port:server.address().port,path:pathname,headers:{Host:'draftmango.com',Origin:'null'}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));});req.on('error',reject);
 });
 const font=await get('/framo/assets/fonts/Phosphor.woff2');
 assert.equal(font.status,200);assert.equal(font.headers['access-control-allow-origin'],'*');assert.equal(font.headers['content-type'],'font/woff2');
 assert.equal(font.headers['access-control-allow-credentials'],undefined);
 const api=await get('/api/accounts/session');assert.equal(api.status,403);assert.equal(api.headers['access-control-allow-origin'],undefined);
 const page=await get('/');assert.equal(page.headers['access-control-allow-origin'],undefined);
});

test('retired library URLs return to the brief while builder design assets remain available', async t => {
  const server = createServer();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  for (const path of ['/templates', '/templates/', '/templates.html', '/templates/preview?template=cafe-1', '/templates/preview.html', '/templates/preview/']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(origin + path, {method, redirect:'manual'});
      assert.equal(response.status, 307, method + ' ' + path);
      assert.equal(response.headers.get('location'), '/#idea');
    }
  }
  for (const path of ['/templates-model.js', '/template-catalog.json', '/framo/previews/demo-cafe-1.html']) {
    assert.equal((await fetch(origin + path, {redirect:'manual'})).status, 200, path);
  }
});
