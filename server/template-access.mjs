// Dedicated private-backend bridge. Browser cookies and caller-supplied
// forwarding/internal headers are never passed to the machine identity API.
import http from 'node:http';
import {upstreamHeaders} from './django.mjs';

export class RemoteError extends Error {
  constructor(status, code, message = code) {super(message); this.status = status; this.code = code;}
}
export function send(response, status, value, headers = {}) {
  if (response.destroyed) return;
  response.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store', 'Pragma':'no-cache', 'X-Content-Type-Options':'nosniff', ...headers});
  response.end(status === 202 ? undefined : JSON.stringify(value));
}
export async function readBody(request, limit) {
  if (Number(request.headers['content-length']) > limit) throw new RemoteError(413, 'too_large');
  const chunks = []; let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > limit) throw new RemoteError(413, 'too_large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function backendCall(request, endpoint, payload, type, extra = {}) {
  const base = upstreamHeaders({...request, headers:{host:request.headers.host}});
  return new Promise((resolve, reject) => {
    const unavailable = () => reject(new RemoteError(503, 'template_access_unavailable'));
    const upstream = http.request({hostname:process.env.DJANGO_HOST || '127.0.0.1', port:Number(process.env.DJANGO_PORT || 4176), path:endpoint, method:'POST',
      headers:{...base, 'content-type':type, 'content-length':Buffer.byteLength(payload), ...extra}, timeout:5000}, incoming => {
      let size = 0; const chunks = [];
      incoming.on('data', chunk => {size += chunk.length; if (size > 16384) incoming.destroy(); else chunks.push(chunk);});
      incoming.on('error', unavailable);
      incoming.on('aborted', unavailable);
      incoming.on('end', () => {
        try {resolve({status:incoming.statusCode, data:JSON.parse(Buffer.concat(chunks).toString('utf8')), headers:incoming.headers});}
        catch {unavailable();}
      });
    });
    upstream.on('error', unavailable);
    upstream.on('timeout', () => upstream.destroy());
    upstream.end(payload);
  });
}

export async function proxyTemplateToken(request, response) {
  const body = await readBody(request, 4096);
  const result = await backendCall(request, '/api/template-access/token', body, request.headers['content-type'] || '', {authorization:request.headers.authorization || ''});
  const headers = {};
  for (const name of ['www-authenticate','retry-after','allow']) if (result.headers[name]) headers[name] = result.headers[name];
  send(response, result.status, result.data, headers);
}

export async function authorizeTemplateRequest(request, token, operation) {
  const internal = process.env.DRAFTMANGO_BUILD_TOKEN || '';
  if (internal.length < 32) throw new RemoteError(503, 'template_access_unavailable');
  const result = await backendCall(request, '/internal/template-access/authorize', JSON.stringify({token, resource:request.draftmangoOrigin + '/mcp/templates', operation}), 'application/json', {'x-draftmango-internal':internal});
  if (result.status !== 200) throw new RemoteError([401,403,404,429].includes(result.status) ? result.status : 503, typeof result.data.error === 'string' ? result.data.error : 'template_access_unavailable');
  if (typeof result.data.client_id !== 'string' || !Array.isArray(result.data.scopes) || !result.data.scopes.every(s=>typeof s === 'string')) throw new RemoteError(503, 'template_access_unavailable');
  return result.data;
}
