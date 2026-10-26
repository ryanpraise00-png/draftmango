import { isIP } from 'node:net';
import { AIError } from './ai.mjs';

export function publicOrigin(value = '') {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) {
    throw new Error('DRAFTMANGO_PUBLIC_ORIGIN must be an HTTPS origin without a path.');
  }
  return url.origin;
}

export function requestBoundary(request, origin = '', trustedProxyIPs = []) {
  const host = request.headers.host;
  const allowed = origin ? [new URL(origin).host] : ['127.0.0.1:' + request.socket.localPort, 'localhost:' + request.socket.localPort];
  if (!allowed.includes(host)) throw new AIError(403, 'origin', 'Open Draftmango using its configured address.');
  const peer = (request.socket.remoteAddress || '').replace(/^::ffff:/, '');
  const forwarded = request.headers['x-real-ip'];
  request.draftmangoOrigin = origin || 'http://' + host;
  request.draftmangoClientIP = trustedProxyIPs.includes(peer) && typeof forwarded === 'string' && isIP(forwarded) ? forwarded : peer;
  return request.draftmangoOrigin;
}
