import test from 'node:test';
import assert from 'node:assert/strict';
import '../dist/workspace-model.js';
import '../dist/dashboard-model.js';

const D = globalThis.DraftmangoDashboard;
const M = globalThis.DraftmangoModel;

test('account continuation goes to the dashboard unless there is an incoming idea', () => {
  assert.equal(D.accountDestination(new URLSearchParams('mode=login')), './dashboard.html');
  assert.equal(D.accountDestination(new URLSearchParams('idea=+++')), './dashboard.html');
  const params = new URLSearchParams({ idea: 'A café called Mango & Co. ☀', template: 'cafe', color: 'sage', email: 'private@example.com', password: 'do-not-carry', next: 'https://example.com' });
  const target = D.accountDestination(params);
  assert.ok(target.startsWith('./workspace.html#'));
  const route = new URLSearchParams(target.split('#')[1]);
  assert.deepEqual([...route.keys()], ['idea', 'template', 'color']);
  assert.equal(route.get('idea'), 'A café called Mango & Co. ☀');
  assert.equal(route.get('color'), 'sage');
});

test('builder handoff limits input and rejects unknown style values', () => {
  const target = D.builderDestination('x'.repeat(1500), '<script>', 'not-a-palette');
  const route = new URLSearchParams(target.split('#')[1]);
  assert.equal(route.get('idea').length, 1200);
  assert.equal(route.has('template'), false);
  assert.equal(route.has('color'), false);
});

test('opening a project selects its own saved history and conversation, never another active project', () => {
  const cafe = M.createProject('A café called Morning Light.', 'cafe');
  const portfolio = M.createProject('A portfolio called North Star.', 'portfolio');
  const edited = M.commit(cafe, { ...cafe.design, theme: 'sage' }, 'Sage tones');
  const library = M.readStore(JSON.stringify({ schema: 1, activeId: portfolio.id, projects: [edited, portfolio] }));
  const route = new URLSearchParams(D.projectDestination(cafe.id).split('#')[1]);
  const selected = D.selectProject(library, route.get('project'));
  assert.equal(selected.title, 'Morning Light');
  assert.equal(selected.design.theme, 'sage');
  assert.equal(selected.history.length, 2);
  assert.equal(selected.messages[0].text, cafe.prompt);
  assert.equal(library.activeId, portfolio.id);
  assert.equal(D.selectProject(library, 'missing'), null);
  assert.equal(D.selectProject(null, cafe.id), null);
});

test('preferences recover from invalid storage and keep only bounded supported values', () => {
  const defaults = { name: '', starter: 'auto', color: 'auto', device: 'auto' };
  for (const value of [null, '{broken', 'null', '42', '[]']) assert.deepEqual(D.readPreferences(value), defaults);
  assert.deepEqual(D.readPreferences(JSON.stringify({ name: '  Mango Maker  ', starter: 'store', color: 'sage', device: 'tablet', password: 'discarded' })), { name: 'Mango Maker', starter: 'store', color: 'sage', device: 'tablet' });
  const invalid = D.readPreferences(JSON.stringify({ name: 'x'.repeat(90), starter: 'unknown', color: {}, device: 'giant' }));
  assert.equal(invalid.name.length, 60);
  assert.equal(invalid.starter, 'auto');
  assert.equal(invalid.color, 'auto');
  assert.equal(invalid.device, 'auto');
});
