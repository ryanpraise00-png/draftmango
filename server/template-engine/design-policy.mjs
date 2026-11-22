import {createHash} from 'node:crypto';
import {indexTemplate} from './personalization.mjs';

export const policyVersion = 'preserve-template-v1';
export const lockFile = 'template.lock.json';
export const hash = value => createHash('sha256').update(value).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
const textPath = /^src\/(pages|shared)\/[^/]+\.(jsx|tsx)$/;
const colours = /\n\/\* Draftmango template colours \*\/\nhtml,body\{((?:--color-(?:primary|bg|text):#[a-f0-9]{6};){1,3})\}\n\/\* End Draftmango template colours \*\/\n$/i;
const fail = message => { throw Object.assign(new Error(message), {code:'template_design',status:422}); };

// Content ranges are selected by the SAME parser used by Draftmango's editor.
// All executable code, element order, classes, routing, dimensions and styles
// outside those ranges are included in the fingerprint. This is deliberately
// stricter than visual similarity: a formatter cannot quietly rewrite a design.
export function designFingerprint(path, source) {
  if (typeof source !== 'string' || source.length > 500000) fail(`Invalid template source: ${path}`);
  if (textPath.test(path)) {
    const fields = indexTemplate({[path]: source});
    let masked = source;
    for (const field of fields.sort((a,b)=>b.start-a.start)) {
      // Normalise JSXText and quoted JSX attributes to the expression form
      // emitted by applyTemplateEdits, without allowing new JSX or scripts.
      const replacement = field.encoding === 'literal' ? '"__CONTENT__"' : '{"__CONTENT__"}';
      masked = masked.slice(0,field.start) + replacement + masked.slice(field.end);
    }
    return hash(masked);
  }
  if (path === 'src/styles.css') {
    const match = source.match(colours);
    if (match) {
      const names = [...match[1].matchAll(/--color-([a-z]+):/g)].map(m=>m[1]);
      if (new Set(names).size !== names.length) fail('Repeated template colour.');
      source = source.slice(0,match.index);
    }
  }
  if (path === 'index.html') source = source.replace(/<title>[^<]{0,1000}<\/title>/, '<title>__TITLE__</title>');
  return hash(source);
}

export function createManifest(template, files, assets = {}, assetMode = 'hosted', version) {
  const sources = Object.fromEntries(Object.entries(files).filter(([name])=>name !== lockFile).sort(([a],[b])=>a.localeCompare(b)).map(([name,source])=>[name,{sha256:hash(source),design:designFingerprint(name,source)}]));
  return {schema:1,policy:policyVersion,template:{id:template.id,name:template.name,version:version || hash(JSON.stringify({sources,assets}))},assetMode,sources,assets};
}

export function validateManifest(manifest) {
  const validPath = name => /^[a-zA-Z0-9_@() ./-]+$/.test(name) && name.length <= 180 && !name.startsWith('/') && name.split('/').every(p=>p && !p.startsWith('.'));
  if (!manifest || manifest.schema !== 1 || manifest.policy !== policyVersion || !hashPattern.test(manifest.template?.version) || !['local','hosted'].includes(manifest.assetMode)) fail('Unsupported template manifest.');
  for (const group of ['sources','assets']) {
    const files = manifest[group];
    if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 600) fail('Invalid template manifest files.');
    for (const [name,record] of Object.entries(files)) {
      if (!validPath(name) || !hashPattern.test(record?.sha256) || (group === 'sources' && !hashPattern.test(record.design))) fail('Invalid template manifest entry.');
    }
  }
  if (!manifest.sources['src/App.jsx'] || !manifest.sources['src/styles.css']) fail('Incomplete template manifest.');
  return manifest;
}

export function validateTemplateFiles(manifest, files, {partial = false} = {}) {
  validateManifest(manifest);
  if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 600) fail('Invalid template file proposal.');
  const violations = [];
  for (const [name,source] of Object.entries(files)) {
    if (name === lockFile) {
      if (source !== JSON.stringify(manifest,null,2)+'\n') violations.push({path:name,reason:'Template identity and design policy are protected.'});
      continue;
    }
    const expected = manifest.sources[name];
    if (!expected) {
      if (name.startsWith('src/') || name.startsWith('public/') || /\.(?:html|css|[cm]?js|jsx|tsx?)$/.test(name)) violations.push({path:name,reason:'New executable or design files require a separate implementation workflow.'});
      continue;
    }
    try {
      if (designFingerprint(name,source) !== expected.design) violations.push({path:name,reason:'Preserve the template layout, classes, routing and runtime; edit content fields only.'});
      // Avoid active URLs in editable src/href fields. Internal routing is
      // already protected because anchor links are not mutable content fields.
      if (typeof source === 'string' && textPath.test(name)) {
        for (const f of indexTemplate({[name]:source})) {
          const rasterPlaceholder=f.kind==='image' && /^data:image\/(?:gif|png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(f.value);
          if ((f.kind === 'image' || f.kind === 'link') && ((!rasterPlaceholder && /^(?:javascript|data|vbscript):/i.test(f.value.trim())) || /[\u0000-\u001f]/.test(f.value))) violations.push({path:name,reason:'Unsafe content URL.'});
        }
      }
    } catch { violations.push({path:name,reason:'Invalid or missing protected template source.'}); }
  }
  if (!partial) for (const name of Object.keys(manifest.sources)) if (!Object.hasOwn(files,name)) violations.push({path:name,reason:'A protected template file is missing.'});
  return {valid:!violations.length,policy:manifest.policy,template:manifest.template,violations};
}

export function assertTemplateFiles(manifest, files, options) {
  const result = validateTemplateFiles(manifest,files,options);
  if (!result.valid) fail(result.violations.slice(0,5).map(v=>`${v.path}: ${v.reason}`).join('\n'));
  return result;
}
