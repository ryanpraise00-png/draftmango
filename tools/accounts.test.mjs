import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../serve.mjs';
import { AIError } from '../ai.mjs';
import '../dist/workspace-model.js';
import '../dist/account-store.js';
const M = globalThis.DraftmangoModel, S = globalThis.DraftmangoAccountStore;
const project = () => M.readStore(JSON.stringify({ schema: 1, projects: [M.createProject('A mango shop', 'store')] })).projects[0];

test('account caches are isolated from guest drafts and other account identities', () => {
  assert.notEqual(S.key('account-a'), S.key('account-b'));
  assert.notEqual(S.key('account-a'), S.key(null));
  assert.notEqual(S.key('account-a', 'drafts', 'django'), S.key('account-a', 'drafts', 'other-service'));
});
test('a late save acknowledgement never marks newer edits as synced', () => {
  const p = project(), library = S.put(S.empty(), p), seq = library.cloud[p.id].seq;
  S.put(library, { ...p, title: 'A newer idea' });
  S.acknowledge(library, p.id, seq, 1);
  assert.equal(library.cloud[p.id].version, 1); assert.equal(library.cloud[p.id].dirty, true);
  S.acknowledge(library, p.id, library.cloud[p.id].seq, 2);
  assert.equal(library.cloud[p.id].dirty, false);
});
test('reopening a conflicting draft preserves local code and the remote version separately', () => {
  const p = project(), library = S.put(S.empty(), p); library.activeId = p.id;
  library.cloud[p.id].version = 1;
  const local = { ...p, title: 'My offline edit', codeDraft: { 'index.html': '<h1>Offline</h1>', 'styles.css': '', 'app.js': '' } };
  S.put(library, local);
  const result = S.merge(library, [{ id: p.id, document: { ...p, title: 'Other device' }, version: 2 }], () => 'recovered-id');
  assert.equal(result.library.projects.find(x => x.id === p.id).title, 'Other device');
  assert.equal(result.library.projects.find(x => x.id === 'recovered-id').codeDraft['index.html'], '<h1>Offline</h1>');
  assert.equal(result.library.activeId, 'recovered-id'); assert.equal(result.remapped[p.id], 'recovered-id');
});
test('lost save responses are recovered without creating duplicate projects', () => {
  const p = project(), library = S.put(S.empty(), p);
  S.merge(library, [{ id: p.id, document: p, version: 1 }]);
  assert.equal(library.projects.length, 1); assert.equal(library.cloud[p.id].dirty, false);
});
test('pending changes based on the current server version survive a pull', () => {
  const p = project(), library = S.put(S.empty(), p); library.cloud[p.id].version = 2;
  S.put(library, { ...p, title: 'Not uploaded yet' });
  S.merge(library, [{ id: p.id, document: p, version: 2 }]);
  assert.equal(library.projects[0].title, 'Not uploaded yet'); assert.equal(library.cloud[p.id].dirty, true);
});
test('AI and domain requests are rejected before provider access when the account session is missing', async t => {
  let providerLoaded = false;
  const server = createServer({ accountSession: async () => { throw new AIError(401, 'sign_in', 'Sign in first.'); }, configLoader: async () => { providerLoaded = true; }, domainConfigLoader: async () => { providerLoaded = true; } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/api/ai/generate', '/api/domains/search']) {
    const response = await fetch(base + path, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401);
  }
  assert.equal(providerLoaded, false);
});
