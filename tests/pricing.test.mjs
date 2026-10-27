import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server/serve.mjs';
import '../web/pricing-model.js';
const P = globalThis.DraftmangoPricing;

test('monthly and yearly quotes keep annual totals and monthly credit allowances distinct', () => {
  assert.equal(P.quote('basic', 'monthly').amount, 15);
  assert.equal(P.quote('pro', 'monthly').amount, 39);
  const basic = P.quote('basic', 'yearly'), pro = P.quote('pro', 'yearly');
  assert.equal(basic.amount, 120); assert.equal(basic.monthlyEquivalent, 10); assert.equal(basic.annualSavings, 60);
  assert.equal(pro.amount, 360); assert.equal(pro.monthlyEquivalent, 30); assert.equal(pro.annualSavings, 108);
  assert.equal(basic.credits, 1000); assert.equal(pro.credits, 3000);
  assert.equal(basic.sites, 1); assert.equal(pro.sites, 3);
  assert.equal(P.quote('free', 'yearly').amount, 0); assert.equal(P.quote('free', 'yearly').credits, 500);
});

test('signup links preserve validated plan and billing choices without arbitrary redirects', () => {
  const selection = P.quote('pro', 'yearly');
  assert.equal(selection.signup, '/auth#mode=signup&plan=pro&billing=yearly');
  const unknown = P.quote('https://untrusted.example', '<script>');
  assert.equal(unknown.id, 'free'); assert.equal(unknown.cadence, 'monthly');
  assert.equal(unknown.signup, '/auth#mode=signup&plan=free&billing=monthly');
  assert.equal(P.quote('__proto__', 'yearly').id, 'free');
});

test('public pricing route supports GET, HEAD, query strings and safe canonical redirects', async t => {
  const server = createServer({ configLoader: async () => { throw new Error('Static pages must not load provider credentials'); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const route of ['/pricings', '/pricings?from=home', '/pricings.html']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /text\/html/);
    const html = await response.text(); assert.match(html, /Plans &amp; pricing|Plans & pricing/); assert.match(html, /pricing-model.js/);
  }
  const head = await fetch(base + '/pricings', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const route of ['/pricing', '/pricing/', '/pricings/']) {
    const response = await fetch(base + route + '?from=home', { redirect: 'manual' });
    assert.equal(response.status, 308); assert.equal(response.headers.get('location'), '/pricings?from=home');
  }
  assert.equal((await fetch(base + '/pricings', { method: 'POST' })).status, 405);
  for (const route of ['/pricings/.env', '/pricings/anything', '/pricing-unrelated', '/.env']) assert.equal((await fetch(base + route)).status, 404);
});
