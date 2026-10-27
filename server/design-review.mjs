// Design review loop: compile a project, look at it in a real browser, measure it,
// have a vision model critique the screenshots, and turn the result into one
// targeted repair request. Used by scripts/design-benchmark.mjs; the builder can
// adopt the same steps once the benchmark shows they are worth their cost.
import { compileProject } from './compiler.mjs';
import { AIError, requestModel, readProviderObject } from './ai.mjs';

export const VIEWPORTS = Object.freeze([
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 }
]);
const ORIGIN = 'https://preview.draftmango.test';
const TILE = 1200;            // px of page height per screenshot tile sent to the reviewer
const TILES = { desktop: 4, mobile: 3 };

async function loadPlaywright() {
  try { return (await import('playwright')).chromium; }
  catch { throw new Error('Playwright is not installed. Run: npm install, then npx playwright install chromium'); }
}

// ---------- 1. Capture -------------------------------------------------------

export async function capture(files, { compile = compileProject, chromium, timeoutMs = 20000 } = {}) {
  const built = await compile(files);
  chromium = chromium || await loadPlaywright();
  const browser = await chromium.launch();
  const shots = {}, metrics = {};
  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const consoleErrors = [];
      page.on('pageerror', error => consoleErrors.push(String(error.message).slice(0, 300)));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 300)); });
      // Serve the compiled site from a private origin; remote https assets (images, fonts) load normally.
      await page.route(ORIGIN + '/**', route => {
        const path = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html';
        const body = built.files[path];
        if (body == null) return route.fulfill({ status: 404, body: 'Not found' });
        const type = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'text/javascript' : 'text/html';
        return route.fulfill({ status: 200, contentType: type + '; charset=utf-8', body });
      });
      await page.goto(ORIGIN + '/', { waitUntil: 'load', timeout: timeoutMs });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      // Scroll through once so scroll-triggered reveals run, as they would for a visitor.
      await page.evaluate(async () => {
        const step = innerHeight * 0.7;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
      });
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      metrics[viewport.name] = { ...(await page.evaluate(measurePage)), consoleErrors };
      const height = Math.min(metrics[viewport.name].pageHeight, 12000);
      shots[viewport.name] = { full: await page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height } }), tiles: [] };
      const count = TILES[viewport.name] || 0;
      for (let i = 0; i < count && i * TILE < height; i++) {
        shots[viewport.name].tiles.push(await page.screenshot({ fullPage: true, clip: { x: 0, y: i * TILE, width: viewport.width, height: Math.min(TILE, height - i * TILE) } }));
      }
      await page.close();
    }
  } finally { await browser.close(); }
  return { shots, metrics, html: built.files['index.html'] };
}

// Runs inside the page. Pure DOM measurements; no network.
function measurePage() {
  const parse = value => { const m = value.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  function background(el) {
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== 'none') return null; // image/gradient: cannot judge reliably
      const color = parse(style.backgroundColor);
      if (color && color.a > 0.9) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const textEls = [...document.body.querySelectorAll('*')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1));
  const contrastFailures = [], hidden = [], fonts = new Map(), sizes = new Set();
  let smallText = 0;
  for (const el of textEls) {
    const s = getComputedStyle(el);
    const text = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
    let opacity = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) opacity *= Number(getComputedStyle(n).opacity);
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height || s.display === 'none') continue; // intentionally removed (closed menus etc.)
    // Laid out but invisible: usually a scroll-reveal animation that never ran.
    if (opacity < 0.05 || s.visibility === 'hidden') { if (!el.closest('[aria-hidden="true"], dialog:not([open]), [hidden]')) hidden.push(text); continue; }
    const size = parseFloat(s.fontSize); sizes.add(Math.round(size));
    if (size < 12) smallText++;
    const family = s.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    fonts.set(family, (fonts.get(family) || 0) + 1);
    const fg = parse(s.color), bg = background(el);
    if (fg && bg) {
      const value = ratio(fg, bg), large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (value < (large ? 3 : 4.5)) contrastFailures.push({ text, ratio: Math.round(value * 100) / 100, size: Math.round(size) });
    }
  }
  const images = [...document.images];
  const targets = [...document.querySelectorAll('a[href], button, [role="button"], input, select, textarea')].filter(visible);
  const smallTargets = targets.filter(el => { const r = el.getBoundingClientRect(); return r.width < 32 || r.height < 32; }).length;
  const backgroundImages = [...document.querySelectorAll('*')].filter(el => /url\(/.test(getComputedStyle(el).backgroundImage)).length;
  return {
    pageHeight: Math.ceil(document.documentElement.scrollHeight),
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    title: document.title,
    h1Count: document.querySelectorAll('h1').length,
    sectionCount: document.querySelectorAll('main > section, body section').length,
    headings: [...document.querySelectorAll('h2')].map(h => (h.innerText || h.textContent).trim().replace(/\s+/g, ' ').slice(0, 80)).filter(Boolean).slice(0, 20),
    images: { total: images.length, broken: images.filter(img => img.complete && img.naturalWidth === 0).map(img => img.src.slice(0, 120)), missingAlt: images.filter(img => !img.hasAttribute('alt')).length, backgroundImages, inlineSvgs: document.querySelectorAll('svg').length },
    fonts: [...fonts.entries()].sort((a, b) => b[1] - a[1]).map(([family, count]) => ({ family, count })),
    distinctFontSizes: sizes.size,
    smallText,
    contrastFailures: contrastFailures.slice(0, 15),
    contrastFailureCount: contrastFailures.length,
    hiddenText: hidden.slice(0, 10),
    hiddenTextCount: hidden.length,
    targets: targets.length, smallTargets
  };
}

// ---------- 2. Automatic checks ----------------------------------------------

const GENERIC_COPY = ['unleash', 'elevate', 'seamless', 'cutting-edge', 'cutting edge', 'next-level', 'next level', 'revolutioniz', 'empower', 'unlock the', 'game-changer', 'game changer', 'world-class', 'welcome to', 'in today\'s', 'look no further', 'take it to the next', 'lorem ipsum', 'your journey', 'crafted with passion', 'pushing the boundaries', 'state-of-the-art', 'innovative solutions'];

// Messages meant for the site owner that leaked into visitor-facing copy.
const EDITOR_NOTES = /[^.<>{}"'`]*\b(?:replace (?:this|it|with)|(?:haven'?t|has(?:n'?t| not)|have not) been (?:added|shared|provided)|not (?:yet )?(?:been )?(?:added|shared|provided) (?:here|yet)|\bno\b[^.<>{}]{0,60}?\b(?:has|have) been (?:shared|added|provided)|add your (?:email|contact|details|logo|copy|content)|your (?:email|logo|text) here|insert (?:your|the)|\bTBD\b|\bTODO\b)[^.<>{}"'`]*/gi;
// JSX text and string literals only: comments and code are not visible.
function visibleText(files) {
  return Object.entries(files).filter(([name]) => /\.(jsx|tsx|html)$/.test(name)).map(([, text]) => text
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\b(?:placeholder|className|href|src|alt|aria-[a-z]+|id|key)=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, ' ')).join('\n');
}

export function scanSource(files) {
  const source = Object.entries(files).filter(([name]) => /\.(jsx?|tsx?|css|html)$/.test(name)).map(([, text]) => text).join('\n');
  const lower = source.toLowerCase();
  const count = pattern => (source.match(pattern) || []).length;
  const findings = [];
  const add = (id, severity, detail, n = 1) => { if (n) findings.push({ id, severity, detail, count: n }); };
  add('gradient-text', 'high', 'Gradient-filled text (background-clip: text) — a common AI-design tell.', count(/background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/gi));
  add('purple-gradient', 'high', 'Purple/indigo gradients — the default "AI startup" palette.', count(/(linear|radial|conic)-gradient\([^;]*(#(?:6366f1|7c3aed|8b5cf6|a855f7|9333ea|6d28d9|4f46e5|818cf8|c084fc)|purple|violet|indigo)/gi));
  add('emoji-icons', 'medium', 'Emoji used as icons or decoration.', count(/\p{Emoji_Presentation}/gu));
  add('transition-all', 'low', '"transition: all" animates layout properties; name the properties instead.', count(/transition\s*:\s*all\b/gi));
  add('glass', 'medium', 'Frosted-glass panels (backdrop-filter: blur).', count(/backdrop-filter\s*:\s*blur/gi) > 2 ? count(/backdrop-filter\s*:\s*blur/gi) : 0);
  add('glow', 'medium', 'Neon glow shadows.', count(/(box|text)-shadow\s*:[^;]*0\s+0\s+\d{2,}px/gi) > 2 ? count(/(box|text)-shadow\s*:[^;]*0\s+0\s+\d{2,}px/gi) : 0);
  add('three-card-grid', 'low', 'Repeated three-column card grids.', count(/repeat\(\s*3\s*,\s*(1fr|minmax)/gi) > 1 ? count(/repeat\(\s*3\s*,\s*(1fr|minmax)/gi) : 0);
  const notes = visibleText(files).match(EDITOR_NOTES) || [];
  add('editor-note', 'high', 'Note to the site owner or missing-information message visible on the page: "' + (notes[0] || '').slice(0, 80) + '".', notes.length);
  const phrases = GENERIC_COPY.filter(phrase => lower.includes(phrase));
  add('generic-copy', 'high', 'Generic marketing phrases: ' + phrases.join(', ') + '.', phrases.length);
  add('invented-proof', 'high', 'Possible invented social proof (stats, star ratings or testimonials) — never fabricate facts.', count(/\b\d{1,3}(?:[.,]\d)?\s?[kKmM]\+|\b\d{2,}\+\s+(?:players|clients|users|downloads|reviews|games)|★{4,}|\btestimonial/gi));
  return findings;
}

export function checkMetrics(metrics) {
  const findings = [];
  const add = (id, severity, detail) => findings.push({ id, severity, detail });
  for (const [name, m] of Object.entries(metrics)) {
    if (m.horizontalOverflow) add('overflow-' + name, 'high', `Content is wider than the ${name} screen (sideways scrolling).`);
    if (m.images.broken.length) add('broken-images-' + name, 'high', `${m.images.broken.length} broken image(s) at ${name}.`);
    if (m.consoleErrors.length) add('errors-' + name, 'high', `${m.consoleErrors.length} JavaScript error(s) at ${name}: ${m.consoleErrors[0]}`);
    if (m.hiddenTextCount) add('hidden-' + name, m.hiddenTextCount > 3 ? 'high' : 'medium', `${m.hiddenTextCount} piece(s) of text stay invisible after scrolling at ${name}, e.g. "${m.hiddenText[0]}" (stuck reveal animation?).`);
    if (m.contrastFailureCount) add('contrast-' + name, m.contrastFailureCount > 5 ? 'high' : 'medium', `${m.contrastFailureCount} text element(s) below WCAG contrast at ${name}, e.g. "${m.contrastFailures[0].text}" (${m.contrastFailures[0].ratio}:1).`);
    if (name === 'mobile' && m.smallText > 3) add('small-text-mobile', 'medium', `${m.smallText} text elements smaller than 12px on mobile.`);
    if (name === 'mobile' && m.smallTargets > 2) add('tap-targets-mobile', 'medium', `${m.smallTargets} links/buttons smaller than 32px on mobile.`);
  }
  const d = metrics.desktop;
  if (d) {
    if (d.h1Count !== 1) add('h1', 'low', `Page has ${d.h1Count} h1 headings (expected 1).`);
    if (d.distinctFontSizes > 12) add('type-scale', 'medium', `${d.distinctFontSizes} different font sizes — no consistent type scale.`);
    if (d.images.total + d.images.backgroundImages === 0) add('no-imagery', 'medium', 'No images at all: only text, shapes or SVG.');
  }
  return findings;
}

// ---------- 3. Vision critique -----------------------------------------------

const CRITERIA = ['hierarchy', 'typography', 'layout', 'spacing', 'color', 'imagery', 'copy', 'polish', 'distinctiveness', 'brandFit'];
const reviewSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    scores: { type: 'object', additionalProperties: false, properties: Object.fromEntries(CRITERIA.map(key => [key, { type: 'integer' }])), required: CRITERIA },
    overall: { type: 'integer' },
    verdict: { type: 'string' },
    aiTells: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    fixes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { priority: { type: 'integer' }, where: { type: 'string' }, problem: { type: 'string' }, change: { type: 'string' } }, required: ['priority', 'where', 'problem', 'change'] } }
  },
  required: ['scores', 'overall', 'verdict', 'aiTells', 'strengths', 'fixes']
};
export const reviewSystem = [
  'You are a senior web designer reviewing a generated website from screenshots, the way an art director reviews a junior designer\'s work. Be specific, visual and honest. Judge only what is visible.',
  'Score each criterion from 1 to 10 against professional work: 10 = award-winning studio site (Awwwards, Godly); 8 = excellent bespoke professional site; 7 = polished premium template (Framer marketplace quality); 5 = competent but generic; 3 = amateur or broken. Most AI-generated sites score 4–6. Do not inflate. overall is your holistic score, not an average.',
  'Criteria: hierarchy (clear focal point and reading order), typography (type choice, scale, pairing, line length, rag), layout (composition, grid, variety between sections), spacing (rhythm, alignment, density), color (palette, contrast, restraint), imagery (relevance and quality of photos/illustration/art direction), copy (specific, credible, non-generic voice), polish (details, consistency, states, mobile), distinctiveness (would a designer recognise this as AI-generated or template-like? 10 = clearly bespoke), brandFit (suits this specific subject and audience).',
  'aiTells: concrete visual signs that this was produced by an AI site generator (for example generic hero with centered gradient headline, three identical feature cards, glassmorphism, neon glows, emoji icons, filler copy, invented statistics, stock-like abstract shapes instead of real imagery). Empty if none.',
  'fixes: up to 6 changes that would raise the score most, highest impact first. Each names where (section or element), the problem, and the exact change (values, layout, type sizes, colours or content approach). Fixes must keep the subject, brand name and factual claims; never ask for invented facts, testimonials or statistics. Prefer removing clichés and strengthening composition, type and imagery over adding decoration.',
  'Automated measurements are supplied as text. Treat them as facts. The screenshots are tiles of one page from top to bottom.'
].join('\n\n');

function imagePart(provider, png) {
  const data = png.toString('base64');
  return provider === 'anthropic'
    ? { type: 'image', source: { type: 'base64', media_type: 'image/png', data } }
    : { type: 'input_image', image_url: 'data:image/png;base64,' + data, detail: 'high' };
}
function textPart(provider, text) { return provider === 'anthropic' ? { type: 'text', text } : { type: 'input_text', text }; }

export async function critique({ brief, shots, findings }, config, options = {}) {
  if (!['openai', 'anthropic'].includes(config.provider)) throw new AIError(400, 'review_provider', 'Visual design review needs AI_PROVIDER=openai or anthropic (image input).');
  const content = [textPart(config.provider, JSON.stringify({ task: 'Review this website design.', brief, automatedFindings: findings.map(f => `[${f.severity}] ${f.detail}`) }))];
  shots.desktop.tiles.forEach((png, i) => { content.push(textPart(config.provider, `Desktop 1440px, tile ${i + 1}`)); content.push(imagePart(config.provider, png)); });
  shots.mobile.tiles.forEach((png, i) => { content.push(textPart(config.provider, `Mobile 390px, tile ${i + 1}`)); content.push(imagePart(config.provider, png)); });
  const result = await requestModel({}, { ...config, maxTokens: Math.min(config.maxTokens, 8192) }, {
    ...options, systemPrompt: reviewSystem, outputSchema: reviewSchema, schemaName: 'draftmango_design_review',
    messages: [{ role: 'user', content }]
  });
  return readReview(readProviderObject(result, config), result?.usage);
}

export function readReview(value, usage) {
  const clamp = n => Math.max(1, Math.min(10, Math.round(Number(n) || 1)));
  if (!value || typeof value !== 'object' || !value.scores) throw new AIError(502, 'invalid_review', 'The design review could not be read.');
  const strings = list => (Array.isArray(list) ? list : []).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim().slice(0, 400)).slice(0, 10);
  return {
    scores: Object.fromEntries(CRITERIA.map(key => [key, clamp(value.scores[key])])),
    overall: clamp(value.overall),
    verdict: String(value.verdict || '').slice(0, 1200),
    aiTells: strings(value.aiTells), strengths: strings(value.strengths),
    fixes: (Array.isArray(value.fixes) ? value.fixes : []).filter(fix => fix && fix.change).slice(0, 6).map((fix, i) => ({ priority: Number(fix.priority) || i + 1, where: String(fix.where).slice(0, 200), problem: String(fix.problem).slice(0, 500), change: String(fix.change).slice(0, 800) })),
    usage: usage ? { inputTokens: usage.input_tokens ?? null, outputTokens: usage.output_tokens ?? null } : null
  };
}

// ---------- 4. Locked design and regressions --------------------------------

// The parts of the visual identity a repair must not lose.
export function designTokens(files) {
  const css = Object.entries(files).filter(([name]) => /\.(css|html|jsx)$/.test(name)).map(([, text]) => text).join('\n');
  const imports = [...new Set([...css.matchAll(/@import\s+url\(\s*['"]?(https:\/\/[^'")\s]+)['"]?\s*\)/g), ...css.matchAll(/<link[^>]+href=["'](https:\/\/fonts\.[^"']+)["']/g)].map(m => m[1]))];
  const families = [...new Set([...css.matchAll(/font-family\s*:\s*([^;}]+)/g), ...css.matchAll(/--[\w-]*(?:font|mono|sans|serif|display|body|heading)[\w-]*\s*:\s*([^;}]+)/g)]
    .map(m => m[1].split(',')[0].replace(/["']/g, '').trim())
    .filter(name => name && !/^(var\(|inherit|initial|unset|system-ui|ui-|sans-serif|serif|monospace|-apple-system)/i.test(name)))];
  const colors = [...new Set([...css.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\))/g)].map(m => `${m[1]}: ${m[2]}`))].slice(0, 16);
  return { imports, families, colors };
}

// Compare a repaired version with the one it replaced.
export function regressions(before, after) {
  const found = [];
  const add = (id, severity, detail) => found.push({ id, severity, detail });
  const fonts = round => (round.metrics.desktop?.fonts || []).filter(f => f.count >= 3).map(f => f.family.toLowerCase());
  const lost = fonts(before).filter(family => !fonts(after).includes(family) && !/^(arial|helvetica|times|georgia|system-ui|ui-)/.test(family));
  if (lost.length) add('font-regression', 'high', `Lost the typefaces ${lost.join(', ')} (the page fell back to ${after.metrics.desktop.fonts[0]?.family || 'a default font'}).`);
  const droppedImports = before.tokens.imports.filter(url => !after.tokens.imports.includes(url));
  if (droppedImports.length) add('font-import-removed', 'high', 'Removed the web-font import ' + droppedImports.map(url => url.slice(0, 90)).join(', ') + '.');
  const b = before.metrics.desktop, a = after.metrics.desktop;
  if (b && a) {
    const gone = (b.headings || []).filter(h => !(a.headings || []).includes(h));
    if (a.sectionCount < b.sectionCount) add('section-removed', 'high', `Removed ${b.sectionCount - a.sectionCount} section(s)` + (gone.length ? ': ' + gone.map(h => `"${h}"`).join(', ') : '') + '.');
    const visuals = m => m.images.total + m.images.backgroundImages + m.images.inlineSvgs;
    if (visuals(a) < visuals(b)) add('imagery-removed', 'medium', `Fewer images or illustrations (${visuals(b)} → ${visuals(a)}).`);
  }
  return found;
}

const weight = { high: 3, medium: 1, low: 0 };
const penalty = findings => findings.reduce((total, f) => total + (weight[f.severity] || 0), 0);
// Keep a repair only if it is better: a higher score, or the same score with fewer problems and nothing lost.
export function acceptRepair(before, after) {
  const lostHigh = after.regressions.some(r => r.severity === 'high');
  if (after.review.overall > before.review.overall && !lostHigh) return { accepted: true, reason: `Score rose ${before.review.overall} → ${after.review.overall}.` };
  if (after.review.overall === before.review.overall && !lostHigh && penalty([...after.findings, ...after.regressions]) < penalty(before.findings)) return { accepted: true, reason: 'Same score with fewer problems.' };
  const why = after.review.overall < before.review.overall ? `score fell ${before.review.overall} → ${after.review.overall}` : lostHigh ? 'it lost part of the design (' + after.regressions.filter(r => r.severity === 'high').map(r => r.id).join(', ') + ')' : `no improvement (${after.review.overall}/10, ${penalty([...after.findings, ...after.regressions])} vs ${penalty(before.findings)} problem points)`;
  return { accepted: false, reason: 'Rejected: ' + why + `. Kept round ${before.index}.` };
}

// ---------- 5. Repair request ------------------------------------------------

export function repairPrompt(review, findings, tokens = { imports: [], families: [], colors: [] }, limit = 3) {
  const blocking = findings.filter(f => f.severity === 'high');
  const keep = [
    tokens.imports.length ? 'Web-font imports (keep exactly): ' + tokens.imports.join(' , ') : '',
    tokens.families.length ? 'Typefaces: ' + tokens.families.join(', ') : '',
    tokens.colors.length ? 'Palette: ' + tokens.colors.join('; ') : ''
  ].filter(Boolean);
  return [
    'Design review of the current website. Make ONLY the changes listed below; leave everything else exactly as it is. Do not remove sections, images, illustrations or content that the changes do not mention. Keep the subject, brand name, factual content and overall concept. Do not add invented facts, statistics or testimonials, and never write notes to the site owner on the page. Return every source file.',
    keep.length ? 'Locked visual identity — keep these unchanged unless a change below names them:\n' + keep.map(line => '- ' + line).join('\n') : '',
    'Changes, highest impact first:\n' + review.fixes.slice(0, limit).map((fix, i) => `${i + 1}. ${fix.where}: ${fix.problem} → ${fix.change}`).join('\n'),
    blocking.length ? 'Measured problems that must also be fixed:\n' + blocking.map(f => '- ' + f.detail).join('\n') : ''
  ].filter(Boolean).join('\n\n').slice(0, 11000);
}

export const reviewCriteria = CRITERIA;
