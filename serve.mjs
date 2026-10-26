import { publicOrigin as validateOrigin, requestBoundary } from './hosting.mjs';
import { djangoSession, proxyDjango, sharedLimit } from './django.mjs';
import http from 'node:http';
import {buildRemote,BuildError} from './compiler.mjs';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { AIError, readConfig, publicConfig, validateInput, generate } from './ai.mjs';
import { DomainError, readDomainConfig, validateDomainSearch, searchDomains } from './namecom.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.ico': 'image/x-icon' };
function json(response, status, value) {
  if (response.destroyed) return;
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}
async function readJSON(request, max = 2 * 1024 * 1024) {
  if (Number(request.headers['content-length']) > max) throw new AIError(413, 'too_large', 'This project is too large for a single request. Keep the request below 2 MB.');
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > max) throw new AIError(413, 'too_large', 'This project is too large for a single request. Keep the request below 2 MB.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AIError(400, 'invalid_json', 'The request was not valid JSON.'); }
}
export function createServer({ root = fileURLToPath(new URL('./out/', import.meta.url)), configLoader = readConfig, fetchImpl = fetch, timeoutMs, heartbeatMs = 5000, cooldownMs = 1500, maxRequests = 20, domainConfigLoader = readDomainConfig, domainFetchImpl = fetch, domainTimeoutMs = 25000, domainMaxRequests = 30, accountSession = djangoSession, accountProxy = proxyDjango, publicOrigin = process.env.DRAFTMANGO_PUBLIC_ORIGIN || '', buildProject = buildRemote, limiter, trustedProxyIPs = (process.env.DRAFTMANGO_TRUSTED_PROXY_IPS || '').split(',').filter(Boolean) } = {}) {
  publicOrigin = validateOrigin(publicOrigin);
  // One process locally: in-memory limits. Production may run several web
  // containers, so limits are held in Django's shared Redis cache instead.
  if (limiter === undefined) limiter = publicOrigin ? sharedLimit : null;
  const traffic = new Map(); let activeGenerations = 0;
  const trafficFor = identity => {
    const now = Date.now();
    for (const [key, value] of traffic) if (!value.busy && now - value.lastStarted > 600000) traffic.delete(key);
    const key = publicOrigin ? identity : 'local';
    if (!traffic.has(key)) traffic.set(key, { busy: false, lastStarted: 0, recent: [] });
    return traffic.get(key);
  };
  let domainActive = 0, domainRecent = [];
  const server = http.createServer(async (request, response) => {
    try {
      const host = request.headers.host;
      const expectedOrigin = requestBoundary(request, publicOrigin, trustedProxyIPs);
      const url = new URL(request.url, expectedOrigin);
      if (url.pathname === '/healthz' && request.method === 'GET') { json(response, 200, {status: 'ok'}); return; }
      if (url.pathname.startsWith('/api/')) {
        const origin = request.headers.origin;
        if ((origin && origin !== expectedOrigin) || request.headers['sec-fetch-site'] === 'cross-site') throw new AIError(403, 'origin', 'Only the Draftmango workspace can use this API.');
        if (url.pathname.startsWith('/api/accounts/') || url.pathname === '/api/projects' || url.pathname.startsWith('/api/billing/') || url.pathname.startsWith('/api/publishing/')) {
          await accountProxy(request, response); return;
        }
        if (url.pathname === '/api/build') {
          if(request.method!=='POST')throw new AIError(405,'method','Use POST for builds.');
          if(origin!==expectedOrigin || !/^application\/json(?:;|$)/i.test(request.headers['content-type']||''))throw new AIError(403,'origin','Build from the Draftmango workspace.');
          const identity=await accountSession(request);
          if(limiter){
            await limiter(request,{action:'acquire',kind:'build',hold:60});
            try {const input=await readJSON(request,6*1024*1024);json(response,200,await buildProject(input.files));}
            finally {limiter(request,{action:'release',kind:'build'}).catch(()=>{});}
            return;
          }
          const traffic=trafficFor(identity),now=Date.now();
          traffic.builds=(traffic.builds||[]).filter(at=>now-at<60000);
          if(traffic.buildBusy || traffic.builds.length>=30)throw new AIError(429,'build_busy','Wait a moment before rebuilding.');
          traffic.builds.push(now);traffic.buildBusy=true;
          try {const input=await readJSON(request,6*1024*1024);json(response,200,await buildProject(input.files));}
          finally {traffic.buildBusy=false;}
          return;
        }
        if (url.pathname === '/api/domains/search') {
          if (request.method !== 'POST') throw new DomainError(405, 'method', 'Use POST for domain search.');
          if (origin !== expectedOrigin || !/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw new DomainError(403, 'origin', 'Search from the Draftmango workspace.');
          await accountSession(request);
          const input = validateDomainSearch(await readJSON(request, 8192));
          const now = Date.now(); domainRecent = domainRecent.filter(at => now - at < 60000);
          if (domainActive >= 3 || domainRecent.length >= domainMaxRequests) throw new DomainError(429, 'domain_busy', 'Please wait a little before searching again.');
          domainActive++; domainRecent.push(now);
          const controller = new AbortController(); let timedOut = false;
          const timer = setTimeout(() => { timedOut = true; controller.abort(); }, domainTimeoutMs);
          const disconnect = () => { if (!response.writableEnded) controller.abort(); };
          response.on('close', disconnect);
          try {
            const config = await domainConfigLoader();
            const result = await searchDomains(input, config, { fetchImpl: domainFetchImpl, signal: controller.signal });
            if (controller.signal.aborted) throw new Error('Aborted domain search');
            json(response, 200, result);
          } catch (error) {
            if (timedOut) throw new DomainError(504, 'domain_timeout', 'Name.com took too long to respond. Try the search again.');
            if (!controller.signal.aborted) throw error;
          } finally { clearTimeout(timer); controller.abort(); response.off('close', disconnect); domainActive--; }
          return;
        }
        if (url.pathname === '/api/ai/status' && request.method === 'GET') {
          const config = await configLoader();
          json(response, 200, publicConfig(config)); return;
        }
        if (url.pathname !== '/api/ai/generate') throw new AIError(404, 'not_found', 'API route not found.');
        if (request.method !== 'POST') throw new AIError(405, 'method', 'Use POST for generation.');
        if (origin !== expectedOrigin || !/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw new AIError(403, 'origin', 'Submit requests from the Draftmango workspace.');
        const identity = await accountSession(request);
        const accountTraffic = trafficFor(identity);
        const input = validateInput(await readJSON(request, 6 * 1024 * 1024));
        const config = await configLoader();
        if (!config.key) throw new AIError(503, 'missing_key', 'Add ' + publicConfig(config).keyVariable + ' to the local .env file, save it, then try again.');
        const now = Date.now();
        const deadlineMs = timeoutMs ?? (config.timeoutSeconds ?? 900) * 1000;
        if (limiter) await limiter(request, { action: 'acquire', kind: 'generate', hold: Math.ceil(deadlineMs / 1000) });
        else {
          accountTraffic.recent = accountTraffic.recent.filter(at => now - at < 600000);
          if (accountTraffic.busy || activeGenerations >= 2 || now - accountTraffic.lastStarted < cooldownMs || accountTraffic.recent.length >= maxRequests) throw new AIError(429, 'busy', accountTraffic.busy ? 'Another draft is being generated. Wait for it to finish or cancel it first.' : 'Please wait a little before generating again.');
          accountTraffic.busy = true; accountTraffic.lastStarted = now; accountTraffic.recent.push(now); activeGenerations++;
        }
        const controller = new AbortController(); let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, deadlineMs);
        const disconnect = () => { if (!response.writableEnded) controller.abort(); };
        response.on('close', disconnect);
        const streaming = request.headers.accept?.includes('application/x-ndjson');
        let phase = 'connecting';
        const send = value => {
          if (!response.destroyed && !response.writableEnded) response.write(JSON.stringify(value) + '\n');
        };
        const progress = () => send({type:'progress', phase, elapsedSeconds:Math.floor((Date.now() - now) / 1000)});
        let heartbeat;
        if (streaming) {
          response.writeHead(200, {'Content-Type':'application/x-ndjson; charset=utf-8', 'Cache-Control':'no-store, no-transform', 'X-Content-Type-Options':'nosniff', 'X-Accel-Buffering':'no'});
          send({type:'start', timeoutSeconds:deadlineMs / 1000});
          progress();
          heartbeat = setInterval(progress, heartbeatMs);
        }
        try {
          const result = await generate(input, config, {
            signal:controller.signal, fetchImpl,
            onProgress:update => { phase = update.phase; if (streaming) { if (typeof update.message === 'string') send({type:'progress',phase,message:update.message.slice(0,3000),elapsedSeconds:Math.floor((Date.now()-now)/1000)}); else progress(); } }
          });
          if(result.action==='update' && globalThis.DraftmangoProject.isReact(result.files)) {phase='checking';if(streaming)progress();await buildProject(result.files);}
          if (controller.signal.aborted) throw new Error('Aborted');
          if (streaming) { send({type:'result', result}); response.end(); }
          else json(response, 200, result);
        } catch (error) {
          if(error instanceof BuildError)error=new AIError(error.status,error.code,error.message+' Your draft is unchanged.');
          if (timedOut) error = new AIError(504, 'timeout', 'The AI did not finish within the generation time limit. Your draft is unchanged. You can try again.');
          if (timedOut || !controller.signal.aborted) {
            if (!streaming) throw error;
            send({type:'error', error:{code:error instanceof AIError ? error.code : 'server_error', message:error instanceof AIError ? error.message : 'The server could not complete this request. Your draft is unchanged.'}});
            response.end();
          }
        } finally { clearTimeout(timer); clearInterval(heartbeat); response.off('close', disconnect);
          if (limiter) limiter(request, { action: 'release', kind: 'generate' }).catch(() => {});
          else { accountTraffic.busy = false; activeGenerations--; } }
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end('Method not allowed'); return; }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\0') || pathname.split(/[\\/]/).some(part => part.startsWith('.'))) throw new AIError(404, 'not_found', 'Not found');
      if (['/pricings/', '/pricing', '/pricing/'].includes(pathname)) {
        response.writeHead(308, { Location: '/pricings' + url.search, 'Cache-Control': 'no-store' }); response.end(); return;
      }
      const pages=['auth','dashboard','workspace','about','help','legal','pricings'];
      const legacy=pathname.match(/^\/(index|auth|dashboard|workspace|about|help|legal|pricings)\.html$/);
      if(legacy) {response.writeHead(308,{Location:(legacy[1]==='index'?'/':'/'+legacy[1])+url.search,'Cache-Control':'no-store'});response.end();return;}
      const publicPath = pathname==='/' ? '/index.html' : pages.includes(pathname.slice(1)) ? pathname+'.html' : pathname;
      const resolvedRoot = await realpath(root);
      let file;
      try { file = await realpath(path.resolve(root, '.' + publicPath)); } catch { throw new AIError(404, 'not_found', 'Not found'); }
      const relative = path.relative(resolvedRoot, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new AIError(403, 'forbidden', 'Forbidden');
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      if(error instanceof BuildError)error=new AIError(error.status,error.code,error.message);
      json(response, error instanceof AIError ? error.status : error instanceof URIError ? 400 : 500,
        { error: { code: error instanceof AIError ? error.code : 'server_error', message: error instanceof AIError ? error.message : 'The server could not complete this request.' } });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 4175);
  const server = createServer();
  server.listen(port, process.env.DRAFTMANGO_BIND || '127.0.0.1', () => console.log('Draftmango: http://127.0.0.1:' + port));
  server.on('error', () => { console.error('Draftmango could not start. Check that the port is available.'); process.exitCode = 1; });
}

