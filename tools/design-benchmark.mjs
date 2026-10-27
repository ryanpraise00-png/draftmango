// Design benchmark: generate a site from a fixed brief, look at it, score it,
// repair it once, score it again, and write a before/after report.
//
//   npm run benchmark:design                      Dreadbyte Studios brief, one repair round
//   npm run benchmark:design -- --no-repair       score the first draft only
//   npm run benchmark:design -- --brief "..."     a different brief
//   npm run benchmark:design -- --files <folder>  score existing React source instead of generating
//   npm run benchmark:design -- --target 8        repair until overall >= 8 (max --rounds, default 1)
//
// Uses the AI provider in .env (API usage is billed to that account). Reports go to
// data/benchmarks/<time>-<name>/report.html.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readConfig, generate, publicConfig } from '../ai.mjs';
import { capture, scanSource, checkMetrics, critique, repairPrompt, reviewCriteria, designTokens, regressions, acceptRepair } from '../design-review.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// The fixed benchmark brief: Ryan's confirmed facts about Dreadbyte Studios. Edit the file to change it.
export const DEFAULT_BRIEF_FILE = path.join(root, 'tools', 'benchmark-briefs', 'dreadbyte-studios.md');

export function parseArgs(argv) {
  const value = name => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined; };
  const rounds = Number(value('--rounds') ?? 1), target = Number(value('--target') ?? 7);
  if (!Number.isInteger(rounds) || rounds < 0 || rounds > 3) throw new Error('--rounds must be 0 to 3.');
  if (!Number.isFinite(target) || target < 1 || target > 10) throw new Error('--target must be 1 to 10.');
  return { brief: value('--brief'), briefFile: value('--brief-file') || DEFAULT_BRIEF_FILE, files: value('--files'), label: value('--label'), rounds: argv.includes('--no-repair') ? 0 : rounds, target };
}

async function readFolder(folder) {
  const files = {};
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name), rel = path.relative(folder, full).split(path.sep).join('/');
      if (entry.isDirectory()) { if (!['node_modules', 'dist', '.git'].includes(entry.name)) await walk(full); }
      else if (/\.(jsx?|tsx?|css|html|json|svg|md)$/.test(entry.name)) files[rel] = await readFile(full, 'utf8');
    }
  }
  await walk(folder);
  return files;
}

const slug = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
const seconds = ms => Math.round(ms / 100) / 10;

// Score one version of the site. Writes screenshots and source into its round folder.
export async function scoreRound({ files, brief, config, folder, index, deps = {} }) {
  const started = Date.now();
  const shot = await (deps.capture || capture)(files);
  const captureMs = Date.now() - started;
  const findings = [...scanSource(files), ...checkMetrics(shot.metrics)];
  const tokens = designTokens(files);
  const reviewStarted = Date.now();
  const review = await (deps.critique || critique)({ brief, shots: shot.shots, findings }, config, { signal: AbortSignal.timeout(config.timeoutSeconds * 1000) });
  const dir = path.join(folder, 'round-' + index);
  await mkdir(path.join(dir, 'source'), { recursive: true });
  for (const [name, view] of Object.entries(shot.shots)) await writeFile(path.join(dir, name + '.png'), view.full);
  for (const [name, text] of Object.entries(files)) { await mkdir(path.dirname(path.join(dir, 'source', name)), { recursive: true }); await writeFile(path.join(dir, 'source', name), text); }
  return { index, review, findings, tokens, metrics: shot.metrics, regressions: [], accepted: true, decision: index === 0 ? 'First draft.' : '', timings: { captureSeconds: seconds(captureMs), reviewSeconds: seconds(Date.now() - reviewStarted) } };
}

export async function runBenchmark(options, deps = {}) {
  options = { ...options, brief: (options.brief || (await readFile(options.briefFile || DEFAULT_BRIEF_FILE, 'utf8'))).trim() };
  const config = await (deps.readConfig || readConfig)();
  if (!config.key) throw new Error('Add your AI provider key to .env first (see .env.example).');
  if (!['openai', 'anthropic'].includes(config.provider)) throw new Error('The visual review needs AI_PROVIDER=openai or anthropic.');
  const make = deps.generate || generate;
  const folder = path.join(deps.outDir || path.join(root, 'data', 'benchmarks'), stamp() + '-' + slug(options.label || (options.files ? path.basename(options.files) : options.brief.split('\n')[0].replace(/^build an? (professional )?(website|site) for /i, ''))));
  await mkdir(folder, { recursive: true });
  const log = deps.log || (message => console.log(message));
  const report = { version: 2, createdAt: new Date().toISOString(), brief: options.brief, model: publicConfig(config), target: options.target, rounds: [], generation: [], finalRound: null, error: null };
  const save = async () => { await writeFile(path.join(folder, 'report.json'), JSON.stringify(report, null, 1)); await writeFile(path.join(folder, 'report.html'), renderReport(report)); };
  try {
    let files, designBrief = null;
    if (options.files) { files = await readFolder(path.resolve(options.files)); log('Scoring existing source from ' + options.files); }
    else {
      log('Generating the first draft (' + config.provider + ' · ' + config.model + ')… this usually takes 1–3 minutes.');
      const started = Date.now();
      const created = await make({ mode: 'create', framework: 'react', prompt: options.brief, history: [], creationPreferences: [] }, config, { signal: AbortSignal.timeout(config.timeoutSeconds * 1000) });
      if (created.action !== 'update') throw new Error('The AI replied instead of building a site: ' + created.message);
      files = created.files; designBrief = created.designBrief;
      report.designBrief = designBrief;
      report.generation.push({ step: 'create', seconds: seconds(Date.now() - started), stages: created.designProcess?.stages || [], message: created.message });
    }
    let best = null, bestFiles = files, bestBrief = designBrief;
    for (let round = 0; ; round++) {
      log(`Round ${round}: rendering at desktop, tablet and mobile, then reviewing…`);
      const scored = await scoreRound({ files, brief: options.brief, config, folder, index: round, deps });
      if (best) {
        scored.regressions = regressions(best, scored);
        const verdict = acceptRepair(best, scored);
        scored.accepted = verdict.accepted; scored.decision = verdict.reason;
      }
      report.rounds.push(scored);
      if (scored.accepted) { best = scored; bestFiles = files; bestBrief = designBrief; }
      report.finalRound = best.index;
      await save();
      log(`Round ${round}: overall ${scored.review.overall}/10 · ${scored.findings.filter(f => f.severity === 'high').length} high-severity check(s)` + (round ? ` · ${scored.decision}` : '') + '.');
      if (!scored.accepted) break;
      if (round >= options.rounds || (scored.review.overall >= options.target && !scored.findings.some(f => f.severity === 'high'))) break;
      log(`Repairing (round ${round + 1}): top ${Math.min(3, scored.review.fixes.length)} fixes, fonts and palette locked…`);
      const started = Date.now();
      const repaired = await make({ mode: 'edit', framework: 'react', prompt: repairPrompt(scored.review, scored.findings, scored.tokens), files: bestFiles, designBrief: bestBrief, history: [] }, config, { signal: AbortSignal.timeout(config.timeoutSeconds * 1000) });
      if (repaired.action !== 'update') { log('The repair step replied without changing files; stopping.'); break; }
      files = repaired.files; designBrief = repaired.designBrief || bestBrief;
      report.generation.push({ step: 'repair-' + (round + 1), seconds: seconds(Date.now() - started), stages: repaired.designProcess?.stages || [], message: repaired.message });
    }
  } catch (error) {
    report.error = error.message || String(error);
    log('Stopped: ' + report.error);
  }
  await save();
  log('Report: ' + path.join(folder, 'report.html'));
  return { folder, report };
}

// ---------- Report -----------------------------------------------------------

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const label = key => ({ brandFit: 'Brand fit' })[key] || key[0].toUpperCase() + key.slice(1);

export function renderReport(report) {
  const rounds = report.rounds;
  const first = rounds[0]?.review, last = rounds.at(-1)?.review;
  const delta = (a, b) => { const d = b - a; return d ? `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>` : '<span class="flat">±0</span>'; };
  const head = rounds.map(r => `<th>Round ${r.index}${r.index === 0 ? ' · first draft' : ' · after repair'}</th>`).join('') + (rounds.length > 1 ? '<th>Change</th>' : '');
  const rows = ['overall', ...reviewCriteria].map(key => {
    const values = rounds.map(r => key === 'overall' ? r.review.overall : r.review.scores[key]);
    return `<tr class="${key === 'overall' ? 'total' : ''}"><td>${key === 'overall' ? 'Overall' : label(key)}</td>${values.map(v => `<td><b>${v}</b><span class="bar"><i style="width:${v * 10}%"></i></span></td>`).join('')}${rounds.length > 1 ? `<td>${delta(values[0], values.at(-1))}</td>` : ''}</tr>`;
  }).join('');
  const roundSections = rounds.map(r => `
  <section class="round">
    <h2>Round ${r.index} <small>${r.index === 0 ? 'First draft' : 'After repair ' + r.index}</small><span class="score">${r.review.overall}/10</span></h2>
    ${r.index ? `<p class="decision ${r.accepted ? 'ok' : 'no'}">${r.accepted ? 'Repair kept' : 'Repair rejected'} — ${esc(r.decision)}</p>` : ''}
    <p class="verdict">${esc(r.review.verdict)}</p>
    <div class="grid2">
      <div><h3>Looks AI-generated because</h3>${r.review.aiTells.length ? '<ul>' + r.review.aiTells.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<p class="muted">No obvious tells noted.</p>'}</div>
      <div><h3>Strengths</h3>${r.review.strengths.length ? '<ul>' + r.review.strengths.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : '<p class="muted">None noted.</p>'}</div>
    </div>
    <h3>Reviewer's fixes</h3><ol>${r.review.fixes.map(f => `<li><b>${esc(f.where)}</b> — ${esc(f.problem)}<br><span class="change">→ ${esc(f.change)}</span></li>`).join('')}</ol>
    ${r.regressions?.length ? '<h3>Lost in this repair</h3><ul class="checks">' + r.regressions.map(f => `<li class="${f.severity}"><span>${f.severity}</span>${esc(f.detail)}</li>`).join('') + '</ul>' : ''}
    <h3>Automatic checks</h3>${r.findings.length ? '<ul class="checks">' + r.findings.map(f => `<li class="${f.severity}"><span>${f.severity}</span>${esc(f.detail)}</li>`).join('') + '</ul>' : '<p class="muted">All checks passed.</p>'}
    <div class="shots"><figure><figcaption>Desktop 1440</figcaption><a href="round-${r.index}/desktop.png"><img src="round-${r.index}/desktop.png" alt="Desktop screenshot, round ${r.index}" loading="lazy"></a></figure>
    <figure class="phone"><figcaption>Mobile 390</figcaption><a href="round-${r.index}/mobile.png"><img src="round-${r.index}/mobile.png" alt="Mobile screenshot, round ${r.index}" loading="lazy"></a></figure></div>
    <p class="muted">Tablet: <a href="round-${r.index}/tablet.png">round-${r.index}/tablet.png</a> · Source: round-${r.index}/source/ · Capture ${r.timings.captureSeconds}s · Review ${r.timings.reviewSeconds}s</p>
  </section>`).join('');
  const gen = report.generation.map(g => `<li><b>${esc(g.step)}</b> · ${g.seconds}s${g.stages?.length ? ' (' + g.stages.map(s => `${esc(s.stage)} ${Math.round(s.elapsedMs / 1000)}s${s.outputTokens ? ', ' + s.outputTokens + ' output tokens' : ''}`).join('; ') + ')' : ''}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Design benchmark — ${esc(report.brief.slice(0, 60))}</title><style>
:root{--ink:#171717;--muted:#6b6b6b;--line:#e4e4e4;--bg:#fafafa;--card:#fff;--up:#1a7f37;--down:#c0362c;--accent:#efb34c}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:1180px;margin:auto;padding:40px 20px 80px}h1{font-size:30px;letter-spacing:-.6px;margin:0 0 6px}h2{font-size:22px;margin:0 0 8px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}h2 small{color:var(--muted);font-size:14px;font-weight:400}h3{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:22px 0 8px}
.meta{color:var(--muted);margin:0 0 24px}.card,.round{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:24px;margin:20px 0}
.brief{font-size:17px;margin:0}.score{margin-left:auto;font-size:28px;font-weight:600}
table{width:100%;border-collapse:collapse}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}th{color:var(--muted);font-weight:500}tr.total td{font-size:16px;border-bottom:2px solid var(--ink)}
td b{display:inline-block;width:22px}.bar{display:inline-block;width:120px;height:6px;background:#eee;border-radius:3px;vertical-align:middle;margin-left:6px}.bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.up{color:var(--up);font-weight:600}.down{color:var(--down);font-weight:600}.flat{color:var(--muted)}
.verdict{font-size:16px;margin:0 0 6px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}ul,ol{margin:0;padding-left:20px}li{margin:4px 0}.change{color:#1f5f99}
.checks{list-style:none;padding:0}.checks li{display:flex;gap:10px;align-items:baseline}.checks span{font-size:11px;text-transform:uppercase;letter-spacing:.05em;padding:1px 7px;border-radius:9px;background:#eee;flex:none}.checks .high span{background:#fde2df;color:var(--down)}.checks .medium span{background:#fff1d6;color:#8a5a00}
.shots{display:grid;grid-template-columns:1fr 260px;gap:20px;margin-top:20px;align-items:start}figure{margin:0}figcaption{font-size:12px;color:var(--muted);margin-bottom:6px}.shots img{width:100%;max-height:900px;object-fit:cover;object-position:top;border:1px solid var(--line);border-radius:8px;display:block}
.muted{color:var(--muted);font-size:13px}.decision{display:inline-block;padding:6px 12px;border-radius:8px;font-size:14px;margin:0 0 10px}.decision.ok{background:#e6f4ea;color:var(--up)}.decision.no{background:#fde2df;color:var(--down)}.final{font-size:16px;margin:10px 0 0}.error{border-color:#f0b4ae;background:#fff6f5}
@media(max-width:760px){.grid2,.shots{grid-template-columns:1fr}.bar{width:60px}}
</style></head><body><main>
<h1>Design benchmark</h1><p class="meta">${esc(new Date(report.createdAt).toLocaleString())} · ${esc(report.model.service)} ${esc(report.model.model)} · target ${report.target}/10</p>
<div class="card"><h3 style="margin-top:0">Brief</h3><p class="brief" style="white-space:pre-line">${esc(report.brief)}</p>${report.designBrief ? `<p class="muted">Creative direction: ${esc(report.designBrief.concept)}</p>` : ''}</div>
${report.error ? `<div class="card error"><b>Stopped early:</b> ${esc(report.error)}</div>` : ''}
${rounds.length ? `<div class="card"><h3 style="margin-top:0">Scores</h3><table><thead><tr><th>Criterion</th>${head}</tr></thead><tbody>${rows}</tbody></table>${first && last && rounds.length > 1 ? `<p class="muted">Overall ${first.overall} → ${last.overall} after ${rounds.length - 1} repair round(s).</p>` : ''}${report.finalRound != null ? `<p class="final"><b>Final version: round ${report.finalRound}</b> (overall ${rounds.find(r => r.index === report.finalRound)?.review.overall}/10)</p>` : ''}</div>` : ''}
${roundSections}
${gen ? `<div class="card"><h3 style="margin-top:0">Generation</h3><ul>${gen}</ul></div>` : ''}
</main></body></html>`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runBenchmark(parseArgs(process.argv.slice(2))); }
  catch (error) { console.error(error.message || error); process.exitCode = 1; }
}
