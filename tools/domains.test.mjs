import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/domains-model.js';
const M = globalThis.DraftmangoDomainModel;

test('domain inputs reject URLs, scripts, malformed labels and overlong names', () => {
  for (const input of ['https://slowdays.com', 'slowdays.com/path', 'a@slowdays.com', 'javascript:alert(1)', '<img src=x>', 'slow days.com', '-a.com', 'a-.com', 'a..com', 'a.c', 'a.123', 'a'.repeat(64) + '.com', 42, null]) assert.equal(M.normalizeDomain(input), null, String(input));
  assert.equal(M.normalizeDomain(' SLOW-DAYS.COM '), 'slow-days.com');
  assert.equal(M.normalizeDomain('shop.slowdays.com'), 'shop.slowdays.com');
  assert.equal(M.normalizeDomain('slowdays'), null);
  assert.equal(M.normalizeDomain('slowdays', true), 'slowdays');
});

test('search candidates preserve the requested ending and never invent availability or prices', () => {
  const result = M.searchCandidates('mango.studio');
  assert.equal(result.error, '');
  assert.equal(result.candidates[0].domain, 'mango.studio');
  assert.equal(result.candidates.length, 4);
  assert.ok(result.candidates.every(item => !('cents' in item) && !('available' in item)));
  for (const input of ['mango.edu', 'shop.mango.com', 'name/another', '']) {
    assert.equal(M.searchCandidates(input).candidates.length, 0);
    assert.ok(M.searchCandidates(input).error);
  }
});

test('stored drafts cannot claim a completed purchase or retain payment/contact secrets', () => {
  const stored = M.readDrafts(JSON.stringify([{ domain: 'MANGO.COM', kind: 'purchase', projectId: 'project-a', autoRenew: true, state: 'registered', paymentToken: 'private', email: 'private@example.com' }, { domain: 'mango.com', kind: 'purchase' }, { domain: '<script>', kind: 'connect' }]));
  assert.deepEqual(stored, [{ domain: 'mango.com', kind: 'purchase', projectId: 'project-a', autoRenew: true, state: 'draft' }]);
  for (const corrupt of [null, '{broken', 'null', '42', '{}']) assert.deepEqual(M.readDrafts(corrupt), []);
  assert.equal(M.readDrafts(JSON.stringify([{ domain: 'mango.com', kind: 'connect', autoRenew: true }]))[0].autoRenew, false);
});

test('saving merges current drafts, deduplicates domains and enforces a bounded library', () => {
  const old = JSON.stringify([{ domain: 'mango.com', kind: 'purchase', projectId: 'one' }, { domain: 'other.com', kind: 'connect' }]);
  const next = M.upsertDraft(old, { domain: 'mango.com', kind: 'connect', projectId: 'two' });
  assert.equal(next.length, 2);
  assert.equal(next[0].projectId, 'two');
  assert.equal(next[1].domain, 'other.com');
  const full = JSON.stringify(Array.from({ length: 30 }, (_, index) => ({ domain: `site${index}.com`, kind: 'purchase' })));
  assert.throws(() => M.upsertDraft(full, { domain: 'new.com', kind: 'purchase' }), /30 domain drafts/);
  assert.equal(M.upsertDraft(full, { domain: 'site1.com', kind: 'connect' }).length, 30);
  assert.throws(() => M.upsertDraft(old, { domain: 'invalid/path', kind: 'purchase' }), /valid domain/);
});

test('custom-domain preview is restricted to the supported paid plan choices', () => {
  for (const plan of ['free', '', null, 'enterprise']) assert.equal(M.canUseCustomDomain(plan), false);
  for (const plan of ['basic', 'pro']) assert.equal(M.canUseCustomDomain(plan), true);
});
