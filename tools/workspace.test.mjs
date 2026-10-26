import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import '../dist/workspace-model.js';
import '../dist/workspace-assets.js';
import '../dist/workspace-code.js';

const M = globalThis.DraftmangoModel;
const C = globalThis.DraftmangoCode;

test('workspace controls and icon symbols have unique IDs', async () => {
  const html = await readFile(new URL('../dist/workspace.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'A duplicate ID can route an event handler to an SVG instead of its button');
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), 'Missing ' + match[1]);
});

test('homepage ideas select an appropriate starter and carry the name into the project', () => {
  const draft = M.createProject('A cozy café called Mango Lane. A warm place for good coffee.');
  assert.equal(draft.design.kind, 'cafe');
  assert.equal(draft.design.brand, 'Mango Lane');
  assert.equal(draft.title, 'Mango Lane');
  assert.equal(draft.messages[0].text, draft.prompt);
  assert.equal(draft.history[0].design.brand, 'Mango Lane');
  assert.equal(M.inferTemplate('An artist portfolio'), 'portfolio');
  assert.equal(M.inferTemplate('An online ceramic store'), 'store');
  assert.equal(M.inferTemplate('My next big idea'), 'custom');
});

test('sample conversation changes update real design properties without mutating the previous draft', () => {
  const before = M.createProject('', 'cafe').design;
  const after = M.applyRequest(before, 'Try sage tones, use a bold font, make the header smaller, and add a contact section.');
  assert.equal(after.recognized, true);
  assert.equal(after.design.theme, 'sage');
  assert.equal(after.design.font, 'sans');
  assert.equal(after.design.headerSize, 'compact');
  assert.equal(after.design.sections.contact, true);
  assert.equal(before.theme, 'warm');
  assert.equal(before.sections.contact, false);
  assert.equal(after.changes.length, 4);
});

test('copy edits keep the requested wording and unsupported AI requests are explained honestly', () => {
  const draft = M.createProject('', 'cafe');
  const updated = M.applyRequest(draft.design, 'Change the headline to "A little joy, every day."');
  assert.equal(updated.design.heading, 'A little joy, every day.');
  const unsupported = M.applyRequest(draft.design, 'Connect Stripe and build an appointment scheduler');
  assert.equal(unsupported.recognized, false);
  assert.deepEqual(unsupported.design, draft.design);
  assert.match(unsupported.summary, /AI editing is the next step/);
});

test('undo, redo, and a new direction keep the expected snapshots', () => {
  const first = M.createProject('', 'cafe');
  const second = M.commit(first, { ...first.design, theme: 'sage' }, 'Sage tones');
  const third = M.commit(second, { ...second.design, font: 'sans' }, 'Bold typography');
  assert.equal(first.history.length, 1);
  assert.equal(third.history.length, 3);
  const back = M.restore(third, 1);
  assert.equal(back.design.font, 'serif');
  assert.equal(back.history.length, 3);
  assert.equal(M.restore(back, 2).design.font, 'sans');
  const branch = M.commit(back, { ...back.design, theme: 'rose' }, 'A peach direction');
  assert.equal(branch.history.length, 3);
  assert.equal(branch.history[2].label, 'A peach direction');
  assert.equal(third.history[2].label, 'Bold typography');
  assert.equal(branch.cursor, 2);
  assert.equal(M.restore(branch, -1), branch);
  assert.equal(M.restore(branch, 99), branch);
});

test('unchanged edits do not create extra history entries', () => {
  const draft = M.createProject('', 'cafe');
  assert.equal(M.commit(draft, structuredClone(draft.design), 'No change'), draft);
  assert.equal(M.applyRequest(draft.design, 'Make it warmer').changes.length, 0);
});

test('saved projects resume at the restored version, not the newest version', () => {
  let draft = M.createProject('', 'store');
  draft = M.commit(draft, { ...draft.design, theme: 'ink' }, 'After hours');
  draft = M.restore(draft, 0);
  const other = M.createProject('', 'portfolio');
  const saved = JSON.stringify({ schema: 1, activeId: draft.id, projects: [other, draft] });
  const loaded = M.readStore(saved);
  const resumed = loaded.projects.find(p => p.id === loaded.activeId);
  assert.equal(resumed.cursor, 0);
  assert.equal(resumed.design.theme, 'sage');
  assert.equal(resumed.history[1].design.theme, 'ink');
  assert.equal(loaded.projects.length, 2);
});

test('invalid or obsolete storage recovers without crashing', () => {
  for (const serialized of ['bad json', 'null', '{}', '{"schema":9,"projects":[]}', '{"schema":1,"projects":[{"id":"broken","history":[]}]}']) assert.equal(M.readStore(serialized), null);
  const draft = M.createProject('', 'cafe');
  const saved = M.readStore(JSON.stringify({ schema: 1, activeId: 'missing', projects: [draft] }));
  assert.equal(saved.activeId, draft.id);
});

test('user-provided HTML and CSS-like settings cannot execute in a preview or export', () => {
  const dangerous = '</h1><script>alert(1)</script><img src=x onerror=alert(2)>';
  const html = M.renderDocument({ kind: 'custom', brand: dangerous, heading: dangerous, description: dangerous, button: dangerous, theme: 'red;}</style><script>alert(3)</script>' });
  assert.doesNotMatch(html, /<script|<img src=x/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /--accent:#efb34c/);
  assert.doesNotMatch(html, /alert\(3\)/);
});

test('standalone export embeds trusted images and ignores external image URLs', () => {
  const design = M.createProject('', 'cafe').design;
  const html = M.renderDocument(design, globalThis.DraftmangoImages);
  assert.match(html, /<style>/);
  assert.equal((html.match(/src="data:image\/jpeg;base64,/g) || []).length, 4);
  assert.doesNotMatch(html, /src="(?:https?:|file:|\.\/)/);
  const unsafe = M.renderDocument(design, { coffee: 'https://untrusted.example/tracker.jpg' });
  assert.doesNotMatch(unsafe, /untrusted\.example/);
});

test('navigation remains valid for every section combination', () => {
  for (let combination = 0; combination < 8; combination++) {
    const design = { kind: 'custom', sections: { story: !!(combination & 1), collection: !!(combination & 2), contact: !!(combination & 4) } };
    const html = M.renderDocument(design);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `Missing #${match[1]} in combination ${combination}`);
  }
});

test('section visibility instructions change what is actually rendered', () => {
  const draft = M.createProject('', 'cafe');
  const edited = M.applyRequest(draft.design, 'Remove the story section and show the contact section');
  const html = M.renderDocument(edited.design);
  assert.doesNotMatch(html, /id="story"/);
  assert.match(html, /id="contact"/);
});

test('code drafts survive reload without changing the applied preview', () => {
  const initial = M.createProject('', 'store');
  const files = C.createFiles(initial.design);
  const applied = M.commitFiles(initial, files);
  const draft = { ...applied, codeDraft: { ...files, 'app.js': 'console.log("still editing");' } };
  const loaded = M.readStore(JSON.stringify({ schema: 1, activeId: draft.id, projects: [draft] })).projects[0];
  assert.equal(loaded.files['app.js'], files['app.js']);
  assert.equal(loaded.codeDraft['app.js'], 'console.log("still editing");');
  assert.equal(loaded.history.length, 2);
});

test('code versions undo, redo, and branch together with visual history', () => {
  const initial = M.createProject('', 'portfolio');
  const files = C.createFiles(initial.design);
  const edited = M.commitFiles(initial, { ...files, 'styles.css': 'body { background: coral; }' });
  const restored = M.restore(edited, 0);
  assert.equal(restored.files, null);
  assert.equal(M.restore(restored, 1).files['styles.css'], 'body { background: coral; }');
  const branch = M.commit(restored, { ...restored.design, theme: 'sage' }, 'Sage');
  assert.equal(branch.history.length, 2);
  assert.equal(branch.files, null);
  const loaded = M.readStore(JSON.stringify({ schema: 1, activeId: restored.id, projects: [restored] })).projects[0];
  assert.equal(loaded.files, null);
  assert.equal(loaded.history[1].files['styles.css'], 'body { background: coral; }');
});

test('returning to visual design preserves even an unapplied code draft in History', () => {
  const initial = M.createProject('', 'cafe');
  const codeDraft = { ...C.createFiles(initial.design), 'app.js': 'console.log("Keep this");' };
  const reset = M.resetCode({ ...initial, codeDraft });
  assert.equal(reset.files, null);
  assert.equal(reset.codeDraft, null);
  assert.equal(reset.history.length, 3);
  assert.equal(M.restore(reset, 1).files['app.js'], codeDraft['app.js']);
  assert.equal(initial.history.length, 1);
});

test('editable files keep readable asset paths and export all code and bundled images offline', () => {
  const design = M.createProject('', 'cafe').design;
  const files = C.createFiles(design);
  assert.match(files['index.html'], /src="\.\/assets\/coffee.jpg"/);
  assert.doesNotMatch(files['index.html'], /data:image/);
  assert.match(files['styles.css'], /:root\{/);
  assert.doesNotMatch(files['styles.css'], /: root/);
  files['app.js'] = 'console.log("Mango 🥭 </script>");';
  files['styles.css'] += '\n.test:before { content: "</style>"; }';
  const html = C.buildDocument(files, globalThis.DraftmangoImages);
  assert.doesNotMatch(html, /(?:href="styles.css|src="app.js|src="\.\/assets\/coffee.jpg)/);
  assert.equal((html.match(/src="data:image\/jpeg;base64,/g) || []).length, 4);
  const js = html.match(/src="data:text\/javascript;charset=utf-8,([^"]*)"/)[1];
  const css = html.match(/href="data:text\/css;charset=utf-8,([^"]*)"/)[1];
  assert.equal(decodeURIComponent(js), files['app.js']);
  assert.equal(decodeURIComponent(css), files['styles.css']);
});

test('source checks detect missing links and repeated IDs, and highlighting escapes user HTML', () => {
  const files = C.createFiles(M.createProject('', 'custom').design);
  assert.ok(C.checkFiles(files).every(result => result.ok));
  files['index.html'] = '<!doctype html><div id="one"></div><div id="one"></div><a href="#missing">go</a>';
  const failures = C.checkFiles(files).filter(result => !result.ok).map(result => result.label);
  assert.ok(failures.includes('Unique HTML IDs'));
  assert.ok(failures.includes('Section links have matching IDs'));
  assert.ok(failures.includes('styles.css is linked'));
  const highlight = C.highlight('<img src=x onerror="alert(1)"><script>alert(2)</script>', 'index.html');
  assert.doesNotMatch(highlight, /<img|<script/);
  assert.match(highlight, /&lt;img/);
});

test('file storage rejects malformed and oversized source without adding arbitrary keys', () => {
  assert.equal(M.readFiles({ 'index.html': '<html>' }), null);
  const files = C.createFiles(M.createProject('', 'store').design);
  assert.deepEqual(M.readFiles({ ...files, unwanted: 'ignored' }), files);
  assert.equal(M.readFiles({ ...files, 'app.js': 'x'.repeat(500001) }), null);
  assert.deepEqual(M.readFiles({ ...files, 'app.js': '' })['app.js'], '');
});
