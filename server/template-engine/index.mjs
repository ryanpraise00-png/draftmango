// One library implementation, consumed by the web builder and MCP adapter.
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import {createManifest,hash,lockFile} from './design-policy.mjs';
import { fileURLToPath } from 'node:url';
import '../../web/templates-model.js';
import '../../web/project-format.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const web = path.join(root, 'web');
const assetsRoot = path.join(web, 'draftmango', 'assets');
const remoteAssets = 'https://draftmango.com/draftmango/assets/';
const localAssets = '/draftmango/assets/';
const textTypes = new Set(['.css', '.svg', '.js', '.json', '.txt', '.html', '.xml']);
const maxAssetBytes = 4 * 1024 * 1024, maxTotalAssetBytes = 24 * 1024 * 1024;

let catalog, runtime;
const packages = new Map();
const loadCatalog = async () => catalog ||= JSON.parse(await readFile(path.join(web, 'template-catalog.json'), 'utf8'));
const loadRuntime = async () => runtime ||= JSON.parse(await readFile(path.join(web, 'draftmango', 'starters', 'runtime.json'), 'utf8')).files ?? JSON.parse(await readFile(path.join(web, 'draftmango', 'starters', 'runtime.json'), 'utf8'));
const summary = item => ({ id: item.id, name: item.name, categories: item.categories, description: item.description, color: item.color, fonts: item.fonts, dark: item.dark, pages: item.pages });

// The builder's own picker chooses the first result; the rest are ranked by
// the same word scoring, extended to descriptions, so alternatives are useful.
export async function searchTemplates(brief, limit = 5) {
  const items = await loadCatalog();
  const query = String(brief || '').toLowerCase();
  const pick = globalThis.DraftmangoTemplates.choose(items, query);
  const words = query.match(/[a-z]{4,}/g) || [];
  const score = item => words.reduce((n, w) => n + (item.name.toLowerCase().includes(w) ? 4 : 0) + (item.categories.join(' ').toLowerCase().includes(w) ? 2 : 0) + (String(item.description).toLowerCase().includes(w) ? 1 : 0), 0);
  const ranked = items.filter(item => item.id !== pick.id).map(item => ({ item, score: score(item) })).sort((a, b) => b.score - a.score);
  const count = Math.min(10, Math.max(1, Number(limit) || 5));
  return [{ ...summary(pick), recommended: true }, ...ranked.slice(0, count - 1).map(({ item, score }) => ({ ...summary(item), score }))];
}

async function template(id) {
  const items = await loadCatalog();
  const chosen = items.find(item => item.id === id);
  if (!chosen) throw Object.assign(new Error(`Unknown template "${id}". Choose a design from the library.`), {status:422,code:'template_unavailable'});
  const starter = JSON.parse(await readFile(path.join(web, 'draftmango', 'starters', `${chosen.id}.json`), 'utf8'));
  return { chosen, starter };
}

export async function templateDetails(id) {
  const { chosen, starter } = await template(id);
  const files = starter.files;
  const pages = Object.keys(files).filter(name => name.startsWith('src/pages/')).map(name => {
    const source = files[name];
    const headings = [...source.matchAll(/<h[12][^>]*>(?:<[^>]+>)*{"([^"]{3,80})"}/g)].map(m => m[1].trim()).slice(0, 4);
    return { file: name, headings };
  });
  return { ...summary(chosen), files: Object.keys(files).length, pages, guide: files['TEMPLATE.md'] || '' };
}

// Copy every asset the template references (and assets those CSS files
// reference) into the project, and point the source at the local copies.
async function collectAssets(sources) {
  const queue = [], seen = new Set(), assets = {};
  let total = 0;
  const enqueue = relative => {
    const clean = path.posix.normalize(relative.split(/[?#]/)[0]);
    if (!clean || relative.endsWith('/') || clean.startsWith('..') || clean.startsWith('/') || seen.has(clean)) return;
    seen.add(clean); queue.push(clean);
  };
  for (const text of sources) for (const match of text.matchAll(/https:\/\/draftmango\.com\/draftmango\/assets\/([^\s"'`)<>]+)/g)) enqueue(match[1]);
  const missing = [];
  while (queue.length) {
    const relative = queue.shift();
    const filename = path.join(assetsRoot, ...relative.split('/'));
    if (!filename.startsWith(assetsRoot + path.sep)) continue;
    let info; try { info = await stat(filename); } catch { missing.push(relative); continue; }
    const resolved = await realpath(filename), allowedRoot = await realpath(assetsRoot);
    if (!resolved.startsWith(allowedRoot + path.sep)) throw new Error('Linked assets outside the template library are not allowed.');
    if (!info.isFile() || info.size > maxAssetBytes) { missing.push(relative); continue; }
    total += info.size;
    if (total > maxTotalAssetBytes) throw new Error('This template references more asset data than one transfer allows.');
    const ext = path.extname(filename).toLowerCase();
    const bytes = await readFile(filename);
    if (textTypes.has(ext)) {
      const text = bytes.toString('utf8');
      assets[relative] = { text };
      if (ext === '.css') for (const match of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
        const target = match[1];
        if (/^(data:|https?:|#|%23|\/\/)/i.test(target)) continue;
        enqueue(path.posix.join(path.posix.dirname(relative), target));
      }
    } else assets[relative] = { base64: bytes.toString('base64') };
  }
  return { assets, missing };
}

// Each process pins a complete package once. A restart can discover a new
// library revision; already-created projects retain their own source and lock.
async function packageFor(id) {
  if (!packages.has(id)) {
    const pending = (async()=>{
      const {chosen,starter} = await template(id);
      const source = globalThis.DraftmangoProject.scaffold({...starter.files,...await loadRuntime()},chosen.name);
      if (!globalThis.DraftmangoProject.valid(source)) throw new Error('Invalid template source.');
      const {assets,missing} = await collectAssets(Object.values(source));

      const assetManifest = Object.fromEntries(Object.entries(assets).sort(([a],[b])=>a.localeCompare(b)).map(([name,asset])=>{
        const bytes = asset.text !== undefined ? Buffer.from(asset.text) : Buffer.from(asset.base64,'base64');
        return ['public/draftmango/assets/'+name,{sha256:hash(bytes),bytes:bytes.length}];
      }));
      const manifest = createManifest(chosen,source,assetManifest);
      return {chosen,source,assets,manifest,missing};
    })();
    packages.set(id,pending);
    if (packages.size>8) packages.delete(packages.keys().next().value);
    pending.catch(()=>packages.delete(id));
  }
  return packages.get(id);
}

export async function templateForPrompt(prompt, templateId = '') {
  const chosen = templateId || globalThis.DraftmangoTemplates.choose(await loadCatalog(),prompt)?.id;
  const pkg = await packageFor(chosen);
  return {...pkg.chosen,version:pkg.manifest.template.version,missingAssets:[...pkg.missing],files:{...pkg.source,[lockFile]:JSON.stringify(pkg.manifest,null,2)+'\n'}};
}

export async function templateFiles(id, siteName) {
  const pkg = await packageFor(id);
  const local = Object.fromEntries(Object.entries(pkg.source).map(([name,text])=>[name,text.replaceAll(remoteAssets,localAssets)]));
  if (siteName && local['index.html']) {
    const escape = text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    local['index.html'] = local['index.html'].replace(/<title>[^<]*<\/title>/,()=>`<title>${escape(String(siteName).slice(0,120))}</title>`);
  }
  local['TEMPLATE.md'] = (local['TEMPLATE.md']||'').replace('https://draftmango.com/draftmango/.','public/draftmango/ in this project.');
  const manifest = createManifest(pkg.chosen,local,pkg.manifest.assets,'local',pkg.manifest.template.version);
  local[lockFile] = JSON.stringify(manifest,null,2)+'\n';
  const assetFiles = {}, binaryFiles = {};
  for (const [relative,asset] of Object.entries(pkg.assets)) {
    const target = `public/draftmango/assets/${relative}`;
    if (asset.text !== undefined) assetFiles[target] = asset.text;
    else binaryFiles[target] = asset.base64;
  }
  return {template:{...summary(pkg.chosen),version:manifest.template.version},manifest,files:local,assetFiles,binaryFiles,missingAssets:[...pkg.missing]};
}
