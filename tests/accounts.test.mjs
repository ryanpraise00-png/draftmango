import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../server/serve.mjs';
import { AIError } from '../server/ai.mjs';
import '../web/workspace-model.js';
import '../web/account-store.js';
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
test('server-deleted projects leave the device cache, but unsynced drafts are always kept', () => {
  const synced = project(), edited = project(), fresh = project(), kept = project();
  const library = S.empty();
  for (const p of [synced, edited, fresh, kept]) S.put(library, p);
  library.cloud[synced.id] = { version: 3, seq: 1, dirty: false };
  library.cloud[edited.id] = { version: 2, seq: 2, dirty: true };
  library.cloud[kept.id] = { version: 1, seq: 1, dirty: false };
  library.activeId = synced.id;
  const { removed } = S.prune(library, [kept.id]);
  assert.deepEqual(removed, [synced.id]);
  assert.deepEqual(library.projects.map(p => p.id), [edited.id, fresh.id, kept.id]);
  assert.equal(library.cloud[synced.id], undefined);
  assert.equal(library.activeId, edited.id);
});
test('the reset tool creates one valid blank project the browser reads unchanged', async () => {
  const { blankProject } = await import('../scripts/reset-projects.mjs');
  const doc = blankProject('Test');
  assert.equal(doc.title, 'Test');
  assert.equal(doc.design.kind, 'blank');
  assert.ok(globalThis.DraftmangoProject.isReact(doc.files));
  const again = M.readStore(JSON.stringify({ schema: 1, projects: [doc] })).projects[0];
  assert.deepEqual(again, doc);
  assert.deepEqual(doc.messages.map(m => m.role), ['assistant']);
});
