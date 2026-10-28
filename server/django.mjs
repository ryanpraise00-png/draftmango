import http from 'node:http';
import { AIError } from './ai.mjs';
const port = () => Number(process.env.DJANGO_PORT || 4176);
const hostname = () => process.env.DJANGO_HOST || '127.0.0.1';
export function upstreamHeaders(request) {
  const headers = {};
  for (const name of ['host', 'cookie', 'origin', 'referer', 'user-agent', 'content-type', 'content-length', 'x-csrftoken', 'x-draftmango-account', 'stripe-signature']) if (request.headers[name]) headers[name] = request.headers[name];
  // Never forward caller-supplied proxy headers. The validated boundary supplies these.
  if (request.draftmangoOrigin) headers['x-forwarded-proto'] = new URL(request.draftmangoOrigin).protocol.slice(0, -1);
  if (request.draftmangoClientIP) headers['x-draftmango-client-ip'] = request.draftmangoClientIP;
  return headers;
}
export async function djangoSession(request) {
  let result;
  try {
    result = await new Promise((resolve, reject) => {
      // node:http preserves the canonical Host required by Django; fetch may
      // replace it with the private service name when connecting upstream.
      const headers = upstreamHeaders({ ...request, headers: { host: request.headers.host, cookie: request.headers.cookie || '' } });
      const upstream = http.get({hostname: hostname(), port: port(), path: '/api/accounts/session', headers, timeout: 5000}, response => {
        let size = 0; const chunks = [];
        response.on('data', chunk => {size += chunk.length; if (size > 65536) response.destroy(new Error('Session response too large')); else chunks.push(chunk);});
        response.on('end', () => {try {if (response.statusCode !== 200) throw new Error(); resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));} catch (error) {reject(error);}});
        response.on('error', reject);
      });
      upstream.on('timeout', () => upstream.destroy(new Error('Account service timeout')));
      upstream.on('error', reject);
    });
  } catch { throw new AIError(503, 'accounts_unavailable', 'The account service is unavailable. Start Draftmango with npm run dev.'); }
  if (!result.user?.id) throw new AIError(401, 'sign_in', 'Sign in to your Draftmango account to continue.');
  if (request.headers['x-draftmango-account'] !== result.user.id) throw new AIError(401, 'session_changed', 'Your account changed. Reload this page before continuing.');
  return result.user.id;
}
export function proxyDjango(request, response) {
  return new Promise(resolve => {
    let size = 0, completed = false;
    const fail = (status, message) => {
      if (completed) return; completed = true;
      if (!response.headersSent && !response.destroyed) {
        response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: { code: 'accounts_unavailable', message } }));
      } else if (!response.destroyed) response.destroy();
      resolve();
    };
    if (Number(request.headers['content-length']) > 9 * 1024 * 1024) { fail(413, 'This project is too large to sync. Your device copy is unchanged.'); return; }
    const headers = upstreamHeaders(request);
    const upstream = http.request({ hostname: hostname(), port: port(), path: request.url, method: request.method, headers, timeout: 30000 }, incoming => {
      const outgoing = { 'Content-Type': incoming.headers['content-type'] || 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
      if (incoming.headers['set-cookie']) outgoing['Set-Cookie'] = incoming.headers['set-cookie'];
      // Google sign-in redirects to Google or back to /auth.
      if (incoming.headers.location) outgoing.Location = incoming.headers.location;
      if (!response.destroyed) { response.writeHead(incoming.statusCode, outgoing); incoming.pipe(response); }
      incoming.on('end', () => { completed = true; resolve(); });
      incoming.on('error', () => fail(502, 'The account connection ended. Please try again.'));
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => fail(503, 'The account service is unavailable. Start Draftmango with npm run dev.'));
    request.on('data', chunk => { size += chunk.length; if (size > 9 * 1024 * 1024) { upstream.destroy(); fail(413, 'This project is too large to sync.'); } });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => { if (!response.writableEnded) upstream.destroy(); });
    request.pipe(upstream);
  });
}

// Shared generation/build limits held in Django's Redis cache (production).
// The private token comes from build.env; this route is never proxied publicly.
export function sharedLimit(request, body, token = process.env.DRAFTMANGO_BUILD_TOKEN || '') {
  return new Promise((resolve, reject) => {
    if (token.length < 32) { reject(new AIError(503, 'limits_unavailable', 'Generation is not configured on this server yet.')); return; }
    const payload = JSON.stringify(body);
    const base = upstreamHeaders({ ...request, headers: { host: request.headers.host, cookie: request.headers.cookie || '' } });
    const headers = { ...base, 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), 'x-draftmango-internal': token };
    const upstream = http.request({ hostname: hostname(), port: port(), path: '/internal/limits', method: 'POST', headers, timeout: 5000 }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 16384) response.destroy(new Error('Limit response too large')); else chunks.push(chunk); });
      response.on('end', () => {
        let data = {}; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* handled below */ }
        if (response.statusCode === 200) resolve(data);
        else if (response.statusCode === 429 || response.statusCode === 401) reject(new AIError(response.statusCode, data.error?.code || 'busy', data.error?.message || 'Please wait a little before trying again.'));
        else reject(new AIError(503, 'limits_unavailable', 'Generation limits are unavailable. Please try again shortly.'));
      });
      response.on('error', () => reject(new AIError(503, 'limits_unavailable', 'Generation limits are unavailable. Please try again shortly.')));
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Limit service timeout')));
    upstream.on('error', () => reject(new AIError(503, 'limits_unavailable', 'Generation limits are unavailable. Please try again shortly.')));
    upstream.end(payload);
  });
}
