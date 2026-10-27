import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanSource, checkMetrics, critique, readReview, repairPrompt, capture, designTokens, regressions, acceptRepair } from '../design-review.mjs';
import { runBenchmark, parseArgs, renderReport, DEFAULT_BRIEF_FILE } from './design-benchmark.mjs';
import { clicheSite } from './fixtures/cliche-site.mjs';
import '../dist/project-format.js';

const calmSite = globalThis.DraftmangoProject.scaffold({
  'src/App.jsx': 'export default function App(){return <main><h1>Dreadbyte Studios</h1><p>We make small, strange games.</p><a href="#games">See our games</a></main>}',
  'src/styles.css': 'body{margin:0;font:18px/1.6 Georgia,serif;color:#1b1b1b;background:#f4f1ea}main{max-width:40rem;margin:auto;padding:6rem 1.5rem}'
});
const review = {
  scores: { hierarchy: 5, typography: 4, layout: 4, spacing: 5, color: 3, imagery: 2, copy: 3, polish: 4, distinctiveness: 2, brandFit: 4 },
  overall: 4, verdict: 'Generic AI landing page.', aiTells: ['Purple gradient hero', 'Emoji icons'], strengths: ['Readable body text'],
  fixes: [{ priority: 1, where: 'Hero', problem: 'Purple gradient and gradient headline', change: 'Use a dark, desaturated palette with a single accent; solid headline at 88px' }]
};
const metric = over => ({ pageHeight: 2000, horizontalOverflow: false, h1Count: 1, sectionCount: 4, headings: ['Games', 'Studio'], fonts: [{ family: 'Space Grotesk', count: 15 }, { family: 'DM Mono', count: 30 }], images: { total: 2, broken: [], backgroundImages: 0, inlineSvgs: 1 }, distinctFontSizes: 6, smallText: 0, contrastFailures: [], contrastFailureCount: 0, hiddenText: [], hiddenTextCount: 0, smallTargets: 0, consoleErrors: [], ...over });

test('source scan flags AI-design clichés and leaves a plain site alone', () => {
  const ids = scanSource(clicheSite).map(f => f.id);
  for (const id of ['gradient-text', 'purple-gradient', 'emoji-icons', 'generic-copy', 'invented-proof', 'transition-all']) assert.ok(ids.includes(id), id);
  assert.deepEqual(scanSource(calmSite).filter(f => f.severity === 'high'), []);
  // Typographic marks such as ✳ ★ → are not emoji icons.
  assert.ok(!scanSource({ 'src/App.jsx': '<p>✳ Studio ★ notes →</p>' }).some(f => f.id === 'emoji-icons'));
});

test('notes to the site owner that leak onto the page are caught, but code and attributes are ignored', () => {
  const leaked = [
    "<p>Studio contact details haven't been added yet. Replace this note with the studio's email.</p>",
    '<p>No project title or game details have been shared here.</p>',
    '<span>Add your email here</span>'
  ];
  for (const text of leaked) assert.ok(scanSource({ 'src/App.jsx': `export default () => ${text}` }).some(f => f.id === 'editor-note'), text);
  const fine = "// TODO: replace this with real data\nexport default () => <form><input placeholder=\"Add your email\" /><p>Car Parking is nearly ready for release.</p></form>";
  assert.ok(!scanSource({ 'src/App.jsx': fine }).some(f => f.id === 'editor-note'));
});

test('design tokens capture web fonts, typefaces and palette', () => {
  const tokens = designTokens({ 'src/styles.css': "@import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=Space+Grotesk&display=swap');:root{font-family:'Space Grotesk',Arial,sans-serif;--lime:#c4ff36;--ink:#11120f;--mono:'DM Mono',monospace}body{font-family:var(--mono)}" });
  assert.deepEqual(tokens.imports, ['https://fonts.googleapis.com/css2?family=DM+Mono&family=Space+Grotesk&display=swap']);
  assert.deepEqual(tokens.families.sort(), ['DM Mono', 'Space Grotesk']);
  assert.deepEqual(tokens.colors, ['--lime: #c4ff36', '--ink: #11120f']);
});

test('regressions catch what the first real repair lost: fonts, the font import, a section and artwork', () => {
  const before = { index: 0, metrics: { desktop: metric({ sectionCount: 5, headings: ['Games', 'Studio', 'Let’s make something matter.'] }) }, tokens: { imports: ['https://fonts.googleapis.com/x'] } };
  const after = { metrics: { desktop: metric({ sectionCount: 4, headings: ['Games', 'Studio'], fonts: [{ family: 'ui-monospace', count: 22 }, { family: 'Arial', count: 16 }], images: { total: 2, broken: [], backgroundImages: 0, inlineSvgs: 0 } }) }, tokens: { imports: [] } };
  const ids = regressions(before, after).map(r => r.id);
  assert.deepEqual(ids, ['font-regression', 'font-import-removed', 'section-removed', 'imagery-removed']);
  assert.match(regressions(before, after).find(r => r.id === 'section-removed').detail, /Let’s make something matter/);
  assert.deepEqual(regressions(before, before), []);
});

test('a repair is kept only when it is genuinely better', () => {
  const round = (overall, findings = [], regressionsList = [], index = 1) => ({ index, review: { overall }, findings, regressions: regressionsList });
  const before = round(6, [{ severity: 'medium' }, { severity: 'medium' }], [], 0);
  assert.equal(acceptRepair(before, round(7)).accepted, true);
  assert.equal(acceptRepair(before, round(6, [{ severity: 'medium' }])).accepted, true);
  assert.equal(acceptRepair(before, round(6, [{ severity: 'medium' }, { severity: 'medium' }])).accepted, false);
  assert.equal(acceptRepair(before, round(5)).accepted, false);
  const lost = acceptRepair(before, round(8, [], [{ id: 'font-regression', severity: 'high' }]));
  assert.equal(lost.accepted, false);
  assert.match(lost.reason, /font-regression.*Kept round 0/);
});

test('page measurements become findings with sensible severities', () => {
  const findings = checkMetrics({
    desktop: metric({ horizontalOverflow: true, h1Count: 3, distinctFontSizes: 15 }),
    mobile: metric({ hiddenTextCount: 2, hiddenText: ['Our games'], smallText: 6, smallTargets: 5, contrastFailureCount: 1, contrastFailures: [{ text: 'grey', ratio: 2.1, size: 14 }], consoleErrors: ['boom'] })
  });
  const by = Object.fromEntries(findings.map(f => [f.id, f.severity]));
  assert.equal(by['overflow-desktop'], 'high');
  assert.equal(by['errors-mobile'], 'high');
  assert.equal(by['hidden-mobile'], 'medium');
  assert.equal(by['contrast-mobile'], 'medium');
  assert.equal(by['small-text-mobile'], 'medium');
  assert.equal(by['tap-targets-mobile'], 'medium');
  assert.equal(by.h1, 'low');
  assert.equal(by['type-scale'], 'medium');
  assert.deepEqual(checkMetrics({ desktop: metric(), mobile: metric() }), []);
});

test('the review sends screenshots as images in each provider format and reads a clamped result', async () => {
  const shots = { desktop: { tiles: [Buffer.from('d1'), Buffer.from('d2')] }, mobile: { tiles: [Buffer.from('m1')] } };
  const seen = [];
  const fakeFetch = provider => async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) });
    const output = JSON.stringify({ ...review, overall: 14 });
    return provider === 'anthropic'
      ? Response.json({ stop_reason: 'end_turn', content: [{ type: 'text', text: output }], usage: { input_tokens: 10, output_tokens: 5 } })
      : Response.json({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: output }] }], usage: { input_tokens: 10, output_tokens: 5 } });
  };
  const openai = await critique({ brief: 'b', shots, findings: [] }, { provider: 'openai', key: 'k', model: 'gpt-x', maxTokens: 32768 }, { fetchImpl: fakeFetch('openai') });
  assert.equal(openai.overall, 10);
  const parts = seen[0].body.input[1].content;
  assert.equal(parts.filter(p => p.type === 'input_image').length, 3);
  assert.match(parts.find(p => p.type === 'input_image').image_url, /^data:image\/png;base64,/);
  assert.equal(seen[0].body.text.format.name, 'draftmango_design_review');
  assert.ok(seen[0].body.max_output_tokens <= 8192);
  await critique({ brief: 'b', shots, findings: [] }, { provider: 'anthropic', key: 'k', model: 'claude-x', maxTokens: 16384 }, { fetchImpl: fakeFetch('anthropic') });
  assert.equal(seen[1].body.messages[0].content.filter(p => p.type === 'image' && p.source.media_type === 'image/png').length, 3);
  await assert.rejects(critique({ brief: 'b', shots, findings: [] }, { provider: 'xai', key: 'k' }), /openai or anthropic/);
  assert.throws(() => readReview(null), /could not be read/);
});

test('the repair request carries the fixes and measured problems but forbids invented facts', () => {
  const prompt = repairPrompt(readReview(review), [{ id: 'overflow-mobile', severity: 'high', detail: 'Content is wider than the mobile screen.' }, { id: 'h1', severity: 'low', detail: 'low thing' }]);
  assert.match(prompt, /1\. Hero: .*→ Use a dark/);
  assert.match(prompt, /Make ONLY the changes listed below/);
  const locked = repairPrompt(readReview({ ...review, fixes: [1, 2, 3, 4, 5].map(n => ({ priority: n, where: 'S' + n, problem: 'p', change: 'c' })) }), [], { imports: ['https://fonts.googleapis.com/x'], families: ['Space Grotesk'], colors: ['--lime: #c4ff36'] });
  assert.match(locked, /keep exactly\): https:\/\/fonts\.googleapis\.com\/x/);
  assert.match(locked, /Typefaces: Space Grotesk/);
  assert.match(locked, /--lime: #c4ff36/);
  assert.match(locked, /3\. S3/);
  assert.doesNotMatch(locked, /4\. S4/);
  assert.match(prompt, /wider than the mobile screen/);
  assert.doesNotMatch(prompt, /low thing/);
  assert.match(prompt, /Do not add invented facts/);
  assert.ok(prompt.length <= 11000);
});

test('arguments default to the Dreadbyte brief file with one repair round', async () => {
  assert.deepEqual(parseArgs([]), { brief: undefined, briefFile: DEFAULT_BRIEF_FILE, files: undefined, label: undefined, rounds: 1, target: 7 });
  const brief = await readFile(DEFAULT_BRIEF_FILE, 'utf8');
  for (const fact of ['Dreadbyte Studios', 'Car Parking', 'Last Fuel', 'since 2016', 'no public contact address']) assert.match(brief, new RegExp(fact));
  assert.equal(parseArgs(['--no-repair']).rounds, 0);
  assert.equal(parseArgs(['--target', '8', '--rounds', '2']).target, 8);
  assert.throws(() => parseArgs(['--rounds', '9']), /0 to 3/);
});

test('a benchmark run generates, scores, repairs, rescores and writes a report', async () => {
  const outDir = await mkdtemp(path.join(tmpdir(), 'draftmango-bench-'));
  try {
    const calls = [];
    const deps = {
      outDir, log: () => {},
      readConfig: async () => ({ provider: 'openai', key: 'k', model: 'gpt-x', maxTokens: 32768, timeoutSeconds: 60 }),
      generate: async input => { calls.push(input.mode); return { action: 'update', message: 'ok', files: input.mode === 'create' ? clicheSite : calmSite, designBrief: { concept: 'Dark studio' }, designProcess: { stages: [{ stage: 'implementation', elapsedMs: 1000, outputTokens: 10 }] } }; },
      capture: async files => ({ shots: { desktop: { full: Buffer.from('png'), tiles: [] }, tablet: { full: Buffer.from('png'), tiles: [] }, mobile: { full: Buffer.from('png'), tiles: [] } }, metrics: { desktop: metric(), mobile: metric() }, files }),
      critique: async ({ findings }) => readReview({ ...review, overall: findings.some(f => f.id === 'purple-gradient') ? 4 : 8 })
    };
    const { folder, report } = await runBenchmark(parseArgs([]), deps);
    assert.deepEqual(calls, ['create', 'edit']);
    assert.deepEqual(report.rounds.map(r => r.review.overall), [4, 8]);
    assert.equal(report.rounds[1].accepted, true);
    assert.equal(report.finalRound, 1);
    assert.match(report.brief, /Last Fuel/);
    assert.equal(report.error, null);
    const html = await readFile(path.join(folder, 'report.html'), 'utf8');
    assert.match(html, /Overall 4 → 8/);
    assert.match(html, /round-1\/desktop\.png/);
    assert.equal(await readFile(path.join(folder, 'round-0', 'source', 'src', 'App.jsx'), 'utf8'), clicheSite['src/App.jsx']);
    assert.ok(JSON.parse(await readFile(path.join(folder, 'report.json'), 'utf8')).rounds.length === 2);
    // A repair that scores worse is rejected and the first draft stays final.
    const worse = await runBenchmark(parseArgs([]), { ...deps, critique: async ({ findings }) => readReview({ ...review, overall: findings.some(f => f.id === 'purple-gradient') ? 6 : 5 }) });
    assert.deepEqual(worse.report.rounds.map(r => r.accepted), [true, false]);
    assert.equal(worse.report.finalRound, 0);
    assert.match(await readFile(path.join(worse.folder, 'report.html'), 'utf8'), /Repair rejected.*Kept round 0/s);
    // A failing provider still leaves a readable report explaining why it stopped.
    const failed = await runBenchmark(parseArgs(['--no-repair']), { ...deps, generate: async () => { throw new Error('quota exceeded'); } });
    assert.match(failed.report.error, /quota exceeded/);
    assert.match(await readFile(path.join(failed.folder, 'report.html'), 'utf8'), /Stopped early/);
  } finally { await rm(outDir, { recursive: true, force: true }); }
});

test('report escapes model text', () => {
  const html = renderReport({ createdAt: new Date().toISOString(), brief: '<script>x</script>', model: { service: 'OpenAI', model: 'm' }, target: 7, generation: [], error: null,
    rounds: [{ index: 0, review: readReview({ ...review, verdict: '<img src=x onerror=alert(1)>' }), findings: [], timings: { captureSeconds: 1, reviewSeconds: 1 } }] });
  assert.doesNotMatch(html, /<script>x<\/script>|<img src=x/);
});

test('real browser capture measures the clichéd fixture (skipped when Chromium is not installed)', async t => {
  let chromium;
  try { chromium = (await import('playwright')).chromium; const b = await chromium.launch(); await b.close(); }
  catch { t.skip('Run npx playwright install chromium to enable this check.'); return; }
  const result = await capture(clicheSite, { chromium });
  assert.equal(result.metrics.desktop.horizontalOverflow, true);
  assert.equal(result.metrics.mobile.hiddenTextCount, 2);
  assert.ok(result.metrics.desktop.contrastFailures.some(f => /Barely readable/.test(f.text)));
  assert.ok(result.shots.desktop.tiles.length >= 1 && result.shots.mobile.tiles.length >= 1);
  assert.equal(result.shots.desktop.full.subarray(1, 4).toString(), 'PNG');
});
