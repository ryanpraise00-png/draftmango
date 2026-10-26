import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../serve.mjs';
import { readDomainConfig, retailPrice, searchDomains, validateDomainSearch } from '../namecom.mjs';

const config = { environment: 'sandbox', username: 'mango-test', token: 'namecom-test-secret', markupPercent: 20, minFeeCents: 500 };
const input = validateDomainSearch({ query: 'mango' });
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
const availability = names => ({ results: names.map(domainName => ({ domainName, purchasable: true, purchaseType: 'registration' })) });
const fakeProvider = async (url, options) => url.endsWith(':checkAvailability') ? reply(availability(JSON.parse(options.body).domainNames)) : reply({ purchasePrice: 17.99, renewalPrice: 29.99 });
async function app(t, overrides = {}) {
  const server = createServer({ accountSession: async () => null, domainConfigLoader: async () => config, domainFetchImpl: fakeProvider, ...overrides });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const search = (body = { query: 'mango' }, headers = {}, options = {}) => fetch(base + '/api/domains/search', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), ...options });
  return { server, base, search };
}

test('domain configuration reloads, respects process overrides and stays isolated from AI credentials', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mango-domain-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, '.env');
  await writeFile(file, 'NAMECOM_ENVIRONMENT=sandbox\nNAMECOM_USERNAME="mango-test"\nNAMECOM_API_TOKEN=namecom-test-secret\nOPENAI_API_KEY=sk-do-not-use\nDOMAIN_MARKUP_PERCENT=20\nDOMAIN_MIN_FEE_CENTS=500');
  assert.deepEqual(await readDomainConfig(file, {}), config);
  assert.equal((await readDomainConfig(file, { DOMAIN_MARKUP_PERCENT: '0', DOMAIN_MIN_FEE_CENTS: '0' })).markupPercent, 0);
  await writeFile(file, 'NAMECOM_USERNAME=mango-test\nNAMECOM_API_TOKEN=changed-token');
  assert.equal((await readDomainConfig(file, {})).token, 'changed-token');
  for (const override of [{ NAMECOM_ENVIRONMENT: 'production' }, { NAMECOM_USERNAME: 'mango' }, { NAMECOM_USERNAME: 'mango-test-test' }, { NAMECOM_API_TOKEN: 'sk-openai' }, { DOMAIN_MARKUP_PERCENT: '-1' }, { DOMAIN_MARKUP_PERCENT: 'NaN' }, { DOMAIN_MIN_FEE_CENTS: '3.5' }]) await assert.rejects(readDomainConfig(file, override));
});

test('retail totals apply a minimum or percentage independently to registration and renewal, preserving cents', () => {
  assert.equal(retailPrice(10, config), 1500);
  assert.equal(retailPrice(50, config), 6000);
  assert.equal(retailPrice(17.99, config), 2299);
  assert.equal(retailPrice(29.99, config), 3599);
  assert.equal(retailPrice(50, { markupPercent: 0, minFeeCents: 500 }), 5500);
  assert.equal(retailPrice(10, { markupPercent: 20, minFeeCents: 0 }), 1200);
  for (const value of [null, undefined, '10', -1, 0, NaN, Infinity]) assert.equal(retailPrice(value, config), null);
});

test('search uses only the sandbox, registration filter and one-year quote endpoints; secrets never reach results', async () => {
  const calls = [];
  const result = await searchDomains(input, config, { fetchImpl: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from(config.username + ':' + config.token).toString('base64'));
    return fakeProvider(url, options);
  }});
  assert.equal(calls.length, 5);
  assert.deepEqual(JSON.parse(calls[0].options.body), { domainNames: ['mango.com', 'mango.co', 'mango.studio', 'mango.design'], purchaseType: 'registration' });
  assert.ok(calls.every(call => call.url.startsWith('https://api.dev.name.com/core/v1/')));
  assert.ok(calls.slice(1).every(call => call.options.method === 'GET' && call.url.endsWith(':getPricing?years=1')));
  assert.equal(result.environment, 'sandbox'); assert.equal(result.years, 1);
  assert.equal(result.offers[0].cents, 2299); assert.equal(result.offers[0].renewalCents, 3599);
  assert.equal(Date.parse(result.validUntil) - Date.parse(result.checkedAt), 300000);
  assert.ok(!JSON.stringify(result).includes(config.token)); assert.ok(!JSON.stringify(result).includes(config.username));
});

test('unavailable, unsupported and missing results never become available or receive fake prices', async () => {
  const result = await searchDomains(input, config, { fetchImpl: async url => {
    assert.ok(url.endsWith(':checkAvailability'));
    return reply({ results: [{ domainName: 'mango.com', purchasable: false }, { domainName: 'mango.co', purchasable: true, purchaseType: 'aftermarket_i' }, { domainName: 'mango.studio', purchasable: 'true' }, { domainName: 42 }, { domainName: 'other.com', purchasable: true }] });
  }});
  assert.deepEqual(result.offers.map(x => x.status), ['unavailable', 'unsupported', 'unknown', 'unknown']);
  assert.ok(result.offers.every(x => x.cents === null && x.renewalCents === null));
});

test('partial quote failures and null renewal prices are shown as unconfirmed without copying registration prices', async () => {
  const result = await searchDomains(input, config, { fetchImpl: async (url, options) => {
    if (url.endsWith(':checkAvailability')) return fakeProvider(url, options);
    if (url.includes('mango.com:')) return reply({ premium: true, purchasePrice: 100, renewalPrice: 45 });
    if (url.includes('mango.co:')) return reply({ purchasePrice: 5, renewalPrice: null });
    if (url.includes('mango.studio:')) return reply({ message: config.token }, 500);
    return new Response('broken-json');
  }});
  assert.equal(result.offers[0].premium, true); assert.equal(result.offers[0].cents, 12000); assert.equal(result.offers[0].renewalCents, 5400);
  assert.ok(result.offers.slice(1).every(x => x.status === 'price_unavailable' && x.cents === null));
  assert.ok(!JSON.stringify(result).includes(config.token));
});

test('domain API rejects foreign and missing origins, invalid queries, oversized input and unsupported methods before contacting provider', async t => {
  let calls = 0;
  const { base, search } = await app(t, { domainFetchImpl: async (...args) => { calls++; return fakeProvider(...args); } });
  for (const Origin of ['null', 'https://other.example', '']) assert.equal((await search(undefined, { Origin })).status, 403);
  assert.equal((await search(undefined, { 'Content-Type': 'text/plain' })).status, 403);
  for (const query of ['', 'https://mango.com', 'shop.mango.com', 'mango.edu', '<script>', 2]) assert.equal((await search({ query })).status, 400);
  assert.equal((await search({ query: 'x'.repeat(9000) })).status, 413);
  assert.equal((await fetch(base + '/api/domains/search')).status, 405);
  assert.equal((await fetch(base + '/api/domains/purchase', { method: 'POST' })).status, 404);
  assert.equal(calls, 0);
});

test('provider auth and malformed responses return useful errors without exposing provider bodies', async t => {
  for (const status of [401, 403, 429, 500]) {
    const { search } = await app(t, { domainFetchImpl: async () => reply({ message: config.token, details: config.username }, status) });
    const response = await search(); const text = await response.text();
    assert.equal(response.status, status === 429 ? 429 : [401, 403].includes(status) ? 503 : 502);
    assert.ok(!text.includes(config.token)); assert.ok(!text.includes(config.username));
  }
  const { search } = await app(t, { domainFetchImpl: async () => reply({ results: null }) });
  assert.equal((await search()).status, 502);
});

test('domain timeouts cancel provider work and release capacity for another search', async t => {
  let aborted = false, slow = true;
  const { search } = await app(t, { domainTimeoutMs: 30, domainFetchImpl: async (url, options) => {
    if (!slow) return fakeProvider(url, options);
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); }, { once: true }));
  }});
  assert.equal((await search()).status, 504); assert.equal(aborted, true);
  slow = false; assert.equal((await search()).status, 200);
});

test('search rate limits do not call the provider again after the budget is used', async t => {
  let calls = 0;
  const { search } = await app(t, { domainMaxRequests: 1, domainFetchImpl: async (...args) => { calls++; return fakeProvider(...args); } });
  assert.equal((await search()).status, 200); assert.equal(calls, 5);
  assert.equal((await search()).status, 429); assert.equal(calls, 5);
});
