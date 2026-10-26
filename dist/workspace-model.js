/* Pure project state and document rendering; shared by the workspace and its checks. */
(() => {
  'use strict';
  const templates = {
    cafe: { title: 'Slow Days', brand: 'slow days.', heading: 'Take life\none sip\nat a time.', description: 'Good coffee. Better company. A little corner of the neighborhood to slow down and stay a while.', button: 'Find your slow moment', theme: 'warm', eyebrow: 'COFFEE & GOOD COMPANY', story: 'A little slower. A little sweeter.', storyCopy: 'Some things are better when you take your time. A conversation, a good cup of coffee, an ordinary morning made a little more lovely.', collection: 'Good things, made slowly.', labels: ['The morning ritual', 'Something sweet', 'A moment to yourself'] },
    portfolio: { title: 'Studio North', brand: 'north®', heading: 'A different\npoint of view.', description: 'Independent minds. Original ideas. Thoughtful design with just the right amount of personality.', button: 'Explore selected work', theme: 'citrus', eyebrow: 'GOOD PEOPLE. BOLD IDEAS.', story: 'A small studio. An open mind.', storyCopy: 'The best work starts with a little curiosity. We make space for fresh perspectives, unexpected connections, and ideas worth exploring.', collection: 'A few things we’ve put into the world.', labels: ['Make some noise', 'From the ground up', 'Off script'] },
    store: { title: 'Form & Field', brand: 'form & field', heading: 'Objects for\nthe everyday\nritual.', description: 'Thoughtful objects for the moments that make a home. Made with care, meant to stay.', button: 'Explore the collection', theme: 'sage', eyebrow: 'LESS, BUT LOVELIER.', story: 'A home in the everyday.', storyCopy: 'A favorite bowl. The first cup of the morning. We believe the objects we live with should bring a little pleasure to the ordinary.', collection: 'Little objects. Lasting favorites.', labels: ['The everyday bowl', 'A place at the table', 'Your morning companion'] },
    custom: { title: 'My little idea', brand: 'your little idea.', heading: 'Something good\nstarts here.', description: 'A fresh home for your next big thing. Bring a little imagination, make a little room, and see where it takes you.', button: 'Explore the possibilities', theme: 'citrus', eyebrow: 'A LITTLE IDEA. A FRESH BEGINNING.', story: 'Made of ideas. Made for you.', storyCopy: 'Every good thing starts somewhere. This is a space to tell your story, share what you care about, and make something worth putting into the world.', collection: 'Room for a little possibility.', labels: ['A fresh perspective', 'A little personality', 'Your next chapter'] }
  };
  const palettes = {
    warm: { name: 'Warm sand', paper: '#faf4e7', ink: '#493b2c', accent: '#bd764c', soft: '#eee2cc', muted: '#8b7e6a' },
    citrus: { name: 'Mango hour', paper: '#fff9ef', ink: '#302e26', accent: '#efb34c', soft: '#f5e5c6', muted: '#8a8170' },
    sage: { name: 'Sage & stone', paper: '#f3f4ec', ink: '#354633', accent: '#8b9f70', soft: '#e0e5d5', muted: '#7d8974' },
    rose: { name: 'Peach please', paper: '#fff5f0', ink: '#533c3e', accent: '#ce958f', soft: '#f1dcd4', muted: '#9c8180' },
    ink: { name: 'After hours', paper: '#242b27', ink: '#f3eedf', accent: '#c8ba87', soft: '#343e37', muted: '#acb4a4' }
  };
  const enumValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const text = (value, fallback, max = 600) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || 'draft-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const timestamp = () => new Date().toISOString();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  const briefFields = ['concept', 'audience', 'primaryAction', 'composition', 'typography', 'palette', 'imagery', 'motion'];
  const briefLists = ['sections', 'constraints'];
  const designBriefSchema = {
    type: 'object', additionalProperties: false,
    properties: {
      version: { type: 'integer', enum: [1] },
      ...Object.fromEntries(briefFields.map(key => [key, { type: 'string' }])),
      ...Object.fromEntries(briefLists.map(key => [key, { type: 'array', items: { type: 'string' } }]))
    }, required: ['version', ...briefFields, ...briefLists]
  };
  function readDesignBrief(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return null;
    if (briefFields.some(key => typeof value[key] !== 'string' || !value[key].trim() || value[key].length > 2000)) return null;
    if (briefLists.some(key => !Array.isArray(value[key]) || value[key].length > 12 || value[key].some(item => typeof item !== 'string' || !item.trim() || item.length > 1000))) return null;
    if (!value.sections.length) return null;
    return { version: 1, ...Object.fromEntries(briefFields.map(key => [key, value[key].trim()])), ...Object.fromEntries(briefLists.map(key => [key, value[key].map(item => item.trim())])) };
  }

  function inferTemplate(prompt = '') {
    if (/café|cafe|coffee|restaurant|bakery|food/i.test(prompt)) return 'cafe';
    if (/shop|store|ceramic|product|sell|commerce/i.test(prompt)) return 'store';
    if (/portfolio|designer|design studio|photograph|artist|writer/i.test(prompt)) return 'portfolio';
    return 'custom';
  }

  function sanitizeDesign(value = {}) {
    const kind = enumValue(value.kind, Object.keys(templates), 'cafe');
    const base = templates[kind];
    return {
      kind, brand: text(value.brand, base.brand, 60), heading: text(value.heading, base.heading, 180),
      description: text(value.description, base.description, 600), button: text(value.button, base.button, 60),
      theme: enumValue(value.theme, Object.keys(palettes), base.theme), font: enumValue(value.font, ['serif', 'sans'], 'serif'),
      corners: enumValue(value.corners, ['soft', 'sharp'], 'soft'), spacing: enumValue(value.spacing, ['relaxed', 'compact'], 'relaxed'),
      heroSize: enumValue(value.heroSize, ['balanced', 'large'], 'balanced'), headerSize: enumValue(value.headerSize, ['normal', 'compact'], 'normal'),
      sections: { story: value.sections?.story !== false, collection: value.sections?.collection !== false, contact: value.sections?.contact === true }
    };
  }

  function createProject(prompt = '', kind = inferTemplate(prompt)) {
    kind = enumValue(kind, Object.keys(templates), 'custom');
    const design = sanitizeDesign({ kind });
    const named = String(prompt).match(/\b(?:called|named)\s+[“"']?([^.!?\n”"']{2,45})/i);
    const brandName = named?.[1]?.split(/\s+(?:with|using|that|featuring)\s+/i)[0]?.trim();
    if (brandName) design.brand = brandName;
    const now = timestamp();
    const title = brandName || templates[kind].title;
    return {
      id: id(), title, prompt: String(prompt).slice(0, 1200), createdAt: now, updatedAt: now,
      design, history: [{ id: id(), label: 'First draft', at: now, design: clone(design) }], cursor: 0,
      messages: [
        { role: 'user', text: String(prompt).slice(0, 1200) || 'A cozy café website with a little personality. Warm colors, lovely typography, and room to tell our story.' },
        { role: 'assistant', text: `Here’s a starting point for ${title}. I’ve set up a ${kind === 'custom' ? 'flexible starter' : kind === 'cafe' ? 'warm café' : kind === 'store' ? 'thoughtful storefront' : 'bold portfolio'} layout. Let’s make it feel like you.`, initial: true }
      ]
    };
  }

  function commit(project, candidate, label) {
    const design = sanitizeDesign(candidate);
    if (JSON.stringify(design) === JSON.stringify(project.design)) return project;
    const history = project.history.slice(0, project.cursor + 1);
    history.push({ id: id(), label: text(label, 'Design updated', 100), at: timestamp(), design: clone(design) });
    return { ...project, design, designBrief: null, files: null, codeDraft: null, history, cursor: history.length - 1, updatedAt: timestamp() };
  }

  const fileNames = ['index.html', 'styles.css', 'app.js'];
  function readFiles(value) {
    if (!value || typeof value !== 'object' || !fileNames.every(name => typeof value[name] === 'string' && value[name].length <= 500000)) return null;
    const entries = Object.entries(value).filter(([name]) => /\.(html?|css|[cm]?js|jsx|tsx?|json|md|txt|csv|svg|xml)$/i.test(name));
    if (entries.length > 100 || entries.some(([name, content]) => !/^[a-zA-Z0-9_@() .\/-]+$/.test(name) || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.')) || typeof content !== 'string' || content.length > 500000)) return null;
    return Object.fromEntries(entries);
  }
  function commitFiles(project, candidate, label = 'Updated website code', direction = project.designBrief) {
    const files = readFiles(candidate);
    if (!files) throw new Error('Use HTML, CSS, and JavaScript files of up to 500,000 characters each.');
    const designBrief = readDesignBrief(direction);
    if (JSON.stringify(files) === JSON.stringify(project.files) && JSON.stringify(designBrief) === JSON.stringify(project.designBrief || null)) return { ...project, codeDraft: null };
    const history = project.history.slice(0, project.cursor + 1);
    history.push({ id: id(), label: text(label, 'Updated website code', 100), at: timestamp(), design: clone(project.design), files: clone(files), designBrief });
    return { ...project, files, designBrief, codeDraft: null, history, cursor: history.length - 1, updatedAt: timestamp() };
  }
  function resetCode(project) {
    if (!project.files && !project.codeDraft) return project;
    if (project.codeDraft) project = commitFiles(project, project.codeDraft);
    const history = project.history.slice(0, project.cursor + 1);
    history.push({ id: id(), label: 'Returned to visual design', at: timestamp(), design: clone(project.design) });
    return { ...project, files: null, designBrief: null, codeDraft: null, history, cursor: history.length - 1, updatedAt: timestamp() };
  }

  function restore(project, index) {
    if (!Number.isInteger(index) || index < 0 || index >= project.history.length) return project;
    return { ...project, cursor: index, design: clone(project.history[index].design), files: readFiles(project.history[index].files), designBrief: readDesignBrief(project.history[index].designBrief), codeDraft: null, updatedAt: timestamp() };
  }

  function applyRequest(current, request) {
    const design = clone(sanitizeDesign(current));
    const lower = request.toLowerCase();
    const changes = [];
    const change = (key, value, description) => { if (design[key] !== value) { design[key] = value; changes.push(description); } };
    let recognized = false;
    const themes = [ [/sage|green tones|make it green/, 'sage'], [/warm|earthy|sand/, 'warm'], [/mango|citrus|yellow|orange/, 'citrus'], [/rose|pink|peach/, 'rose'], [/dark|midnight|after hours/, 'ink'] ];
    for (const [pattern, theme] of themes) if (pattern.test(lower)) { recognized = true; change('theme', theme, `Switched the palette to ${palettes[theme].name.toLowerCase()}`); break; }
    if (/sans|bold(?:er)? (?:type|font)|modern (?:type|font)/.test(lower)) { recognized = true; change('font', 'sans', 'Used a bolder sans-serif heading'); }
    else if (/serif|elegant (?:type|font)|editorial (?:type|font)/.test(lower)) { recognized = true; change('font', 'serif', 'Used editorial serif headings'); }
    if (/round|softer corner/.test(lower)) { recognized = true; change('corners', 'soft', 'Softened the corners'); }
    if (/sharp|square corner/.test(lower)) { recognized = true; change('corners', 'sharp', 'Made the corners crisp'); }
    if (/(?:smaller|compact|shorter) (?:nav|header)|(?:nav|header).*smaller/.test(lower)) { recognized = true; change('headerSize', 'compact', 'Made the header smaller'); }
    if (/larger header|normal header/.test(lower)) { recognized = true; change('headerSize', 'normal', 'Restored the roomier header'); }
    if (/(?:bigger|larger) (?:heading|headline|type)|(?:heading|headline).*bigger/.test(lower)) { recognized = true; change('heroSize', 'large', 'Made the hero heading larger'); }
    if (/(?:smaller|balanced) (?:heading|headline)|(?:heading|headline).*smaller/.test(lower)) { recognized = true; change('heroSize', 'balanced', 'Balanced the hero heading size'); }
    if (/breathing room|more (?:space|spacing)|roomier/.test(lower)) { recognized = true; change('spacing', 'relaxed', 'Added more breathing room'); }
    if (/less (?:space|spacing)|tighter|compact layout/.test(lower)) { recognized = true; change('spacing', 'compact', 'Tightened the section spacing'); }
    for (const section of ['story', 'collection', 'contact']) {
      const add = new RegExp('(?:add|show|include|bring back)\\s+(?:(?:a|the|our)\\s+)?' + section);
      const remove = new RegExp('(?:remove|hide|delete)\\s+(?:(?:a|the|our)\\s+)?' + section);
      if (add.test(lower) || remove.test(lower)) {
        recognized = true;
        const show = add.test(lower);
        if (design.sections[section] !== show) { design.sections[section] = show; changes.push(`${show ? 'Added' : 'Hidden'} the ${section} section`); }
      }
    }
    const replacement = request.match(/\b(?:change|set|make)\s+(?:the\s+)?(headline|heading|title|button(?: text)?|brand(?: name)?)\s+(?:to|say)\s+["“']?([\s\S]+)$/i);
    if (replacement) {
      recognized = true;
      const key = /^button/i.test(replacement[1]) ? 'button' : /^brand/i.test(replacement[1]) ? 'brand' : 'heading';
      change(key, replacement[2].replace(/["”']$/, '').trim(), `Updated the ${key === 'heading' ? 'headline' : key === 'button' ? 'button text' : 'brand name'}`);
    }
    return { recognized, design: sanitizeDesign(design), changes, summary: changes.length ? changes.join('. ') + '.' : recognized ? 'That’s already part of this draft. Try another direction, or open Design to fine-tune the details.' : 'Free-form AI editing is the next step. For now, try “make it sage,” “use a bold font,” “make the header smaller,” or “add a contact section.” You can also edit the copy and styling in Design.' };
  }

  function readActivity(value) {
    if (!value || !Number.isFinite(value.durationMs) || value.durationMs < 0 || !Array.isArray(value.phases)) return null;
    const phases = value.phases.filter(phase => ['connecting','directing','building','planning','writing','checking'].includes(phase));
    return {durationMs:Math.min(value.durationMs,86400000),phases:[...new Set(phases)].slice(0,8),plan:typeof value.plan === 'string' ? value.plan.slice(0,3000) : ''};
  }
  function readStore(serialized) {
    try {
      const value = JSON.parse(serialized);
      if (value.schema !== 1 || !Array.isArray(value.projects)) return null;
      const projects = value.projects.filter(p => p && typeof p.id === 'string' && Array.isArray(p.history) && p.history.length).map(p => {
        const history = p.history.filter(h => h && typeof h === 'object' && h.design).map(h => ({ id: text(h.id, id(), 80), label: text(h.label, 'Saved draft', 100), at: text(h.at, timestamp(), 40), design: sanitizeDesign(h.design), files: readFiles(h.files), designBrief: readDesignBrief(h.designBrief) }));
        if (!history.length) return null;
        const cursor = Number.isInteger(p.cursor) ? Math.max(0, Math.min(p.cursor, history.length - 1)) : history.length - 1;
        return { ...(p.workspace && typeof p.workspace === 'object' && !Array.isArray(p.workspace) && JSON.stringify(p.workspace).length < 6000000 ? {workspace: clone(p.workspace)} : {}), id: text(p.id, id(), 80), title: text(p.title, 'Untitled draft', 60), prompt: text(p.prompt, '', 1200), creationPreferences: Array.isArray(p.creationPreferences) ? p.creationPreferences.filter(item => typeof item === 'string' && item.length <= 600).slice(0, 8) : [], createdAt: text(p.createdAt, timestamp(), 40), updatedAt: text(p.updatedAt, timestamp(), 40), ai: p.ai && ['pending', 'ready'].includes(p.ai.state) ? { state: p.ai.state } : null, design: clone(history[cursor].design), designBrief: readDesignBrief(history[cursor].designBrief), files: readFiles(history[cursor].files), codeDraft: readFiles(p.codeDraft), history, cursor, messages: Array.isArray(p.messages) ? p.messages.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.text === 'string').map(m => ({ role: m.role, text: m.text.slice(0, m.role === 'user' ? 12000 : 6000), ...(readActivity(m.activity) ? {activity:readActivity(m.activity)} : {}), initial: m.initial === true, changed: m.changed === true })) : [] };
      }).filter(Boolean);
      if (!projects.length) return null;
      return { schema: 1, projects, activeId: projects.some(p => p.id === value.activeId) ? value.activeId : projects[0].id };
    } catch { return null; }
  }

  function renderDocument(candidate, images = {}, source = false) {
    const d = sanitizeDesign(candidate), t = templates[d.kind], p = palettes[d.theme];
    const e = escapeHtml;
    const photo = d.kind === 'cafe' ? images.coffee : d.kind === 'store' ? images.ceramics : null;
    const photoSafe = source && ['cafe', 'store'].includes(d.kind) ? `./assets/${d.kind === 'cafe' ? 'coffee' : 'ceramics'}.jpg` : typeof photo === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : null;
    const font = d.font === 'serif' ? 'Georgia,serif' : 'Arial,sans-serif';
    const target = d.sections.collection ? '#collection' : d.sections.story ? '#story' : d.sections.contact ? '#contact' : '#top';
    const artwork = photoSafe ? `<img src="${photoSafe}" alt="${d.kind === 'cafe' ? 'Pour-over coffee made with care' : 'A collection of handcrafted ceramics'}"><span class="image-stamp">${d.kind === 'cafe' ? 'SLOW IS<br>A GOOD THING.' : 'MADE<br>WITH CARE.'}</span>` : '<div class="art-star">✳</div><span class="art-note">A LITTLE DIFFERENT.<br>A LITTLE MORE YOU.</span><div class="art-orbit"></div>';
    const nav = [['story','Our story'],['collection',d.kind === 'portfolio' ? 'Selected work' : d.kind === 'cafe' ? 'The good things' : 'Collection'],['contact','Say hello']].filter(([key])=>d.sections[key]).map(([key,label])=>`<a href="#${key}">${label}</a>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${e(d.description)}"><title>${e(d.brand)}</title><style>
      :root{--paper:${p.paper};--ink:${p.ink};--accent:${p.accent};--soft:${p.soft};--muted:${p.muted};--radius:${d.corners === 'soft' ? '14px' : '0px'};--space:${d.spacing === 'relaxed' ? '88px' : '48px'}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Arial,sans-serif;-webkit-font-smoothing:antialiased}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid var(--accent);outline-offset:5px}img{max-width:100%;display:block}.wrap{width:min(1120px,calc(100% - 100px));margin:auto}.nav{display:flex;justify-content:space-between;align-items:center;gap:25px;padding:${d.headerSize === 'compact' ? '16px' : '30px'} 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 15%,transparent)}.logo{font-family:Georgia,serif;font-size:${d.headerSize === 'compact' ? '27px' : '33px'};letter-spacing:-1.3px;overflow-wrap:anywhere;max-width:55%}.logo span{font-size:26px;color:var(--accent);margin-left:10px}.nav-links{display:flex;gap:27px;align-items:center;font-size:11px}.nav-links a:hover{text-decoration:underline;text-underline-offset:5px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:65px;padding:var(--space) 0;align-items:center}.eyebrow{font-size:9px;font-weight:bold;letter-spacing:2px;color:var(--muted)}h1{font-family:${font};font-size:${d.heroSize === 'large' ? '100px' : '84px'};font-weight:${d.font === 'sans' ? '650' : '400'};line-height:1.02;letter-spacing:-4px;white-space:pre-line;margin:29px 0 25px;overflow-wrap:anywhere}.intro{font-size:14px;line-height:1.9;color:var(--muted);max-width:340px;margin:0}.cta{display:inline-flex;align-items:center;gap:30px;background:var(--ink);color:var(--paper);padding:17px 22px;border-radius:${d.corners === 'soft' ? '5px' : '0'};font-size:11px;margin-top:31px}.cta:hover{opacity:.85}.hero-art{height:515px;border-radius:${d.corners === 'soft' ? '240px 240px 12px 12px' : '0'};background:var(--accent);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:30px}.hero-art img{height:100%;width:100%;object-fit:cover;object-position:58% center}.image-stamp{position:absolute;right:20px;bottom:24px;width:99px;height:99px;border-radius:50%;background:var(--paper);color:var(--ink);display:flex;justify-content:center;align-items:center;text-align:center;font-size:9px;font-weight:bold;line-height:1.5;letter-spacing:1px;transform:rotate(12deg);outline:1px dashed var(--ink);outline-offset:-7px}.art-star{font-size:245px;line-height:1;transform:rotate(-13deg);position:relative;z-index:1}.art-note{font-size:12px;letter-spacing:2px;text-align:center;line-height:1.5;z-index:1}.art-orbit{position:absolute;border:1px solid var(--ink);width:500px;height:500px;border-radius:50%;bottom:-250px;opacity:.2}.ticker{padding:20px 0;border-block:1px solid color-mix(in srgb,var(--ink) 18%,transparent);display:flex;align-items:center;justify-content:space-between;gap:20px;font-size:9px;letter-spacing:1.5px}.ticker span:nth-child(2){font-size:24px;color:var(--accent)}.story{display:grid;grid-template-columns:1fr 1fr;gap:90px;padding:var(--space) 0}.story h2,.section-title,.contact h2{font-family:${font};font-weight:400;font-size:47px;letter-spacing:-1.9px;line-height:1.12;margin:18px 0 0;overflow-wrap:anywhere}.story p{align-self:center;font-size:14px;line-height:2;color:var(--muted)}.collection{padding:var(--space) 0;background:var(--soft)}.section-title{max-width:560px;margin-top:17px}.items{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:38px}.item-art{height:230px;border-radius:var(--radius);background:var(--accent);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center}.item-art img{width:100%;height:100%;object-fit:cover}.item:nth-child(2) img{object-position:15%;transform:scale(1.3);filter:sepia(.25)}.item:nth-child(3) img{object-position:90%;transform:scale(1.1)}.item:nth-child(2) .item-art{background:var(--ink);color:var(--paper)}.item:nth-child(3) .item-art{background:var(--paper)}.item-art span{font-family:Georgia,serif;font-size:78px;transform:rotate(-8deg)}.item h3{font-size:14px;font-weight:400;margin:15px 0 0}.item p{font-size:10px;color:var(--muted);margin:7px 0 0}.contact{margin-block:var(--space);background:var(--soft);padding:55px;border-radius:var(--radius);display:flex;align-items:center;justify-content:space-between;gap:30px}.contact h2{margin-top:15px;max-width:550px}.contact .cta{white-space:nowrap;margin-top:0}.footer{padding:30px 0;display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid color-mix(in srgb,var(--ink) 15%,transparent);font-size:10px;color:var(--muted)}.footer strong{font-family:Georgia,serif;font-size:24px;font-weight:400;color:var(--ink)}.footer a{white-space:nowrap}
      @media(max-width:900px){.wrap{width:calc(100% - 60px)}.hero{gap:30px}h1{font-size:${d.heroSize === 'large' ? '77px' : '64px'};letter-spacing:-3px}.hero-art{height:430px}.art-star{font-size:190px}.story{gap:40px}.story h2,.section-title,.contact h2{font-size:38px}.nav-links{gap:17px;font-size:10px}.item-art{height:180px}.contact{padding:35px}.ticker{font-size:7px}}
      @media(max-width:600px){:root{--space:${d.spacing === 'relaxed' ? '48px' : '30px'}}.wrap{width:calc(100% - 40px)}.nav{padding:${d.headerSize === 'compact' ? '14px' : '22px'} 0}.logo{font-size:25px;max-width:60%}.logo span{font-size:18px;margin-left:5px}.nav-links{gap:12px;font-size:8px}.nav-links a:nth-child(2){display:none}.hero{grid-template-columns:1fr;gap:35px}h1{font-size:${d.heroSize === 'large' ? '68px' : '58px'};letter-spacing:-2.5px;margin:23px 0 20px}.eyebrow{font-size:8px;letter-spacing:1.5px}.intro{font-size:12px;max-width:none}.cta{padding:14px 19px;font-size:10px;margin-top:24px}.hero-art{height:360px;max-width:420px;width:100%;margin:auto}.image-stamp{width:80px;height:80px;font-size:7px}.ticker{font-size:6px;letter-spacing:1px;gap:12px;padding-block:14px}.ticker span:last-child{display:none}.story{grid-template-columns:1fr;gap:8px}.story h2,.section-title,.contact h2{font-size:35px;letter-spacing:-1.2px}.story p{font-size:12px;line-height:1.9}.items{grid-template-columns:1fr;gap:28px;margin-top:30px}.item-art{height:245px}.item h3{font-size:14px}.contact{padding:30px 24px;display:block}.contact .cta{margin-top:25px}.footer{font-size:8px;flex-wrap:wrap}.footer strong{font-size:21px}.footer>span{order:3;width:100%;line-height:1.6}}
      @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
    </style></head><body id="top"><div class="wrap"><header class="nav"><a class="logo" href="#top">${e(d.brand)}<span aria-hidden="true">✳</span></a><nav class="nav-links" aria-label="Main navigation">${nav}</nav></header><main><section class="hero"><div><span class="eyebrow">${e(t.eyebrow)}</span><h1>${e(d.heading)}</h1><p class="intro">${e(d.description)}</p><a class="cta" href="${target}">${e(d.button)} <span aria-hidden="true">↗</span></a></div><div class="hero-art">${artwork}</div></section><div class="ticker"><span>A LITTLE PERSONALITY GOES A LONG WAY.</span><span aria-hidden="true">✳</span><span>GOOD THINGS START SMALL.</span></div>${d.sections.story ? `<section class="story" id="story"><div><span class="eyebrow">THE STORY SO FAR</span><h2>${e(t.story)}</h2></div><p>${e(t.storyCopy)}</p></section>` : ''}</main></div>${d.sections.collection ? `<section class="collection" id="collection"><div class="wrap"><span class="eyebrow">A FEW GOOD THINGS</span><h2 class="section-title">${e(t.collection)}</h2><div class="items">${t.labels.map((label,i)=>`<article class="item"><div class="item-art">${photoSafe ? `<img src="${photoSafe}" alt="${e(label)}" loading="lazy">` : `<span aria-hidden="true">${['✳','Aa','↗'][i]}</span>`}</div><h3>${e(label)}</h3><p>Thoughtfully made. A little out of the ordinary.</p></article>`).join('')}</div></div></section>` : ''}<div class="wrap">${d.sections.contact ? `<section class="contact" id="contact"><div><span class="eyebrow">THE NEXT CHAPTER</span><h2>Let’s make something good.</h2></div><a class="cta" href="#top">Get to know us <span aria-hidden="true">↗</span></a></section>` : ''}<footer class="footer"><strong>${e(d.brand)}</strong><span>A Draftmango starter · Customize the details before publishing.</span><a href="#top">Back to the top ↑</a></footer></div></body></html>`;
  }

  globalThis.DraftmangoModel = Object.freeze({ templates, palettes, inferTemplate, sanitizeDesign, createProject, commit, commitFiles, resetCode, readFiles, readDesignBrief, designBriefSchema, restore, applyRequest, readStore, renderDocument, escapeHtml });
})();
