(async () => {
  'use strict';
  const A = globalThis.DraftmangoAccounts;
  if (!await A.protect()) return;
  const W = globalThis.DraftmangoWorkspace; await W.init();
  const M = globalThis.DraftmangoModel;
  const D = globalThis.DraftmangoDashboard;
  const C = globalThis.DraftmangoCode;
  const Chat = globalThis.DraftmangoConversation;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storageKey = A.key('projects');
  const defaultPrompt = 'A cozy neighborhood café called Slow Days. Warm earthy colors, lovely typography, and a welcoming place to tell our story.';
  const sizes = { desktop: 1280, tablet: 768, mobile: 390 };
  let library;
  let saveFailed = false;
  let toastTimer;
  let currentPanel = 'build';
  let view = 'preview';
  let device = 'responsive';
  let previewHtml = '';
  let previewSignature = '';
  let conversationProject = '';
  let conversationCount = 0;
  let resizeFrame;
  let codeSaveTimer;
  let sourceProject = '';
  let workingFiles;
  let selectedFile = 'index.html';
  let previewToken = '';
  let consoleLines = [];
  let diagnostic = '';
  let releaseEditorTab = false;
  try { library = M.readStore(localStorage.getItem(storageKey)); } catch { /* A session without storage remains usable. */ }
  try {
    const preference = D.readPreferences(localStorage.getItem(A.key('preferences')));
    if (preference.device !== 'auto') device = preference.device;
  } catch { /* Screen size remains the default when storage is unavailable. */ }
  const starting = new URLSearchParams(location.hash.slice(1));
  const initialIdea = starting.get('idea');
  const requestedProject = A.remapped[starting.get('project')] || starting.get('project');
  if (!initialIdea && requestedProject) {
    const selected = D.selectProject(library, requestedProject);
    if (selected?.workspace?.deleted) { location.replace('./dashboard.html#projects'); return; }
    if (!selected) { location.replace('./dashboard.html#projects'); return; }
    library.activeId = selected.id;
  }
  if (initialIdea) {
    const next = M.createProject(initialIdea, starting.get('template') || M.inferTemplate(initialIdea));
    next.creationPreferences = [];
    if (Object.hasOwn(M.templates, starting.get('template'))) next.creationPreferences.push('Selected website type: ' + starting.get('template') + '. Follow the written brief for the actual creative direction.');
    next.ai = { state: 'pending' };
    next.messages = [next.messages[0]];
    if (M.palettes[starting.get('color')]) {
      next.design.theme = starting.get('color');
      next.history[0].design.theme = next.design.theme;
      const palette = M.palettes[starting.get('color')];
      next.creationPreferences.push(`User-selected palette: ${palette.name}; background ${palette.paper}, text ${palette.ink}, accent ${palette.accent}.`);
    }
    library = library || { schema: 1, activeId: next.id, projects: [] };
    library.projects.push(next);
    library.activeId = next.id;
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* Some file viewers disallow history changes. */ }
  }
  if (!library) {
    const first = M.createProject(defaultPrompt, 'cafe');
    library = { schema: 1, activeId: first.id, projects: [first] };
  }
  let project = library.projects.find(p => p.id === library.activeId) || library.projects[0];
  const parentProject = W.get(project.workspace?.parentId);
  if (parentProject && !project.codeDraft && parentProject.files && JSON.stringify(parentProject.files) !== JSON.stringify(project.files)) project = M.commitFiles(project, parentProject.files, 'Loaded current project source', parentProject.designBrief);
  let sharedSource = JSON.stringify(parentProject?.files || project.files);
  device = W.preferences.device === 'auto' ? 'responsive' : W.preferences.device;
  let openFiles = ['index.html'];

  const icon = (name, className = 'icon') => `<svg class="${className}" aria-hidden="true"><use href="#${name}"/></svg>`;
  function announce(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  function save() {
    // Preserve projects updated in another tab while this builder was open.
    try {
      const latest = M.readStore(localStorage.getItem(storageKey));
      if (latest) library.projects = latest.projects;
    } catch { /* Keep the current session available for export. */ }
    library.activeId = project.id;
    const index = library.projects.findIndex(p => p.id === project.id);
    if (index < 0) library.projects.push(project); else library.projects[index] = project;
    const indicator = $('#save-status');
    try {
      A.saveLibrary(library, project.id);
      const parent = W.get(project.workspace?.parentId);
      if (parent && project.files && sharedSource !== JSON.stringify(project.files)) {
        if (JSON.stringify(parent.files) === sharedSource) {
          const next = M.commitFiles(parent, project.files, 'Updated from ' + project.title, project.designBrief);
          const merged = W.library(); const idx = merged.projects.findIndex(p => p.id === parent.id); merged.projects[idx] = next; A.saveLibrary(merged, next.id);
          sharedSource = JSON.stringify(project.files);
        } else {
          announce('The project source changed in another chat. This chat’s version is saved separately. Export or review it before replacing the project source.');
        }
      }
      indicator.textContent = A.user ? A.message : 'Saved in this browser';
      indicator.classList.remove('is-unsaved');
      indicator.title = A.user ? (A.issue || A.message) : 'Your drafts are saved locally in this browser. Export a copy to keep them elsewhere.';
      saveFailed = false;
    } catch {
      indicator.innerHTML = '<span></span>Unsaved session';
      indicator.classList.add('is-unsaved');
      indicator.title = 'Browser storage is unavailable or full. Export your site to keep a copy.';
      if (!saveFailed) announce('Browser storage is unavailable. Export your draft to keep a copy.');
      saveFailed = true;
    }
    try { history.replaceState(null, '', location.pathname + location.search + '#' + new URLSearchParams({ project: project.id })); } catch { /* Some file viewers disallow history changes. */ }
  }
  function flushCodeDraft() {
    clearTimeout(codeSaveTimer);
    save();
  }
  function switchProject(id) {
    stopAI(true);
    lastAIRequest = null;
    aiFeedback = { text: '', state: '', retry: false };
    flushCodeDraft();
    const selected = library.projects.find(item => item.id === id);
    if (!selected) return;
    project = selected;
    $('#chat-input').value = '';
    save(); render(); renderAI();
    closeNavigation();
  }
  function renderSidebar() { W.sidebar($('#project-sidebar'), W.isChat(project) ? 'chats' : 'projects', project.id); }
  function closeNavigation() {
    $('#project-sidebar').classList.remove('is-open');
    $('#navigation-scrim').hidden = true;
    $('.workspace-layout').inert = false;
    $('#project-sidebar').inert = matchMedia('(max-width:1000px)').matches;
    $('#toggle-navigation').setAttribute('aria-expanded', String(!matchMedia('(max-width:1000px)').matches && !$('.builder-shell').classList.contains('navigation-collapsed')));
  }
  $('#toggle-navigation').addEventListener('click', () => {
    if (matchMedia('(max-width:1000px)').matches) {
      const open = !$('#project-sidebar').classList.contains('is-open');
      $('#project-sidebar').classList.toggle('is-open', open);
      $('#project-sidebar').inert = !open;
      $('#navigation-scrim').hidden = !open;
      $('#toggle-navigation').setAttribute('aria-expanded', String(open));
      $('.workspace-layout').inert = open;
      if (open) $('#project-sidebar .ws-nav-close')?.focus();
    } else {
      const collapsed = $('.builder-shell').classList.toggle('navigation-collapsed');
      $('#toggle-navigation').setAttribute('aria-expanded', String(!collapsed));
    }
    scheduleCanvasSize();
  });
  $('#close-navigation').addEventListener('click', () => { closeNavigation(); $('#toggle-navigation').focus(); });
  $('#navigation-scrim').addEventListener('click', closeNavigation);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNavigation(); });
  matchMedia('(max-width:1000px)').addEventListener('change', closeNavigation);
  closeNavigation();
  function addMessage(role, text, extra = {}) {
    project = { ...project, messages: [...project.messages, { role, text, ...extra }] };
  }
  function stamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Saved draft' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  function calendarDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Saved in this browser' : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function renderConversation() {
    const log = $('#conversation');
    $('#agent-progress')?.remove();
    if (conversationProject !== project.id || conversationCount > project.messages.length) {
      log.replaceChildren();
      conversationCount = 0;
      conversationProject = project.id;
    }
    if (conversationCount === project.messages.length) return;
    project.messages.slice(conversationCount).forEach((message) => {
      const block = document.createElement('div');
      block.className = `message message-${message.role}`;
      const label = document.createElement('div');
      label.className = 'message-label';
      label.innerHTML = message.role === 'user' ? 'You <span class="avatar">Y</span>' : `<span class="avatar">${icon('mango')}</span>Draftmango`;
      const content = document.createElement(message.role === 'assistant' ? 'div' : 'p');
      content.className = 'message-content';
      const messageText = message.initial ? 'Your starter layout is ready. Describe a change, edit the files, or adjust the design settings.' : message.text;
      if (message.role === 'assistant') Chat.render(content,messageText); else content.textContent=messageText;
      block.append(label);
      const activity=Chat.renderActivity(message.activity);if(activity)block.append(activity);
      block.append(content);
      if (message.changed) {
        const tag = document.createElement('span');
        tag.className = 'change-tag';
        tag.innerHTML = `${icon('check')}Preview updated`;
        block.append(tag);
      }
      log.append(block);
    });
    conversationCount = project.messages.length;
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }

  function updateCanvasSize() {
    if (view === 'code') return;
    const stage = $('#canvas-stage');
    if (!stage.clientWidth || !stage.clientHeight) return;
    const style = getComputedStyle(stage);
    const availableWidth = Math.max(1, Math.floor(stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)));
    const availableHeight = Math.max(1, Math.floor(stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)));
    // Responsive preview uses the actual canvas width, without shrinking its text.
    // Fixed device widths stay at 100% unless the user explicitly chooses a zoom.
    const target = device === 'responsive' ? availableWidth : sizes[device];
    const zoom = $('#zoom-select').value;
    const scale = zoom === 'fit' ? Math.min(1, availableWidth / target) : Number(zoom);
    const wrap = $('#frame-wrap');
    wrap.style.width = `${target * scale}px`;
    wrap.style.height = `${availableHeight}px`;
    wrap.classList.toggle('is-mobile', device === 'mobile');
    wrap.classList.toggle('is-tablet', device === 'tablet');
    const frame = $('#website-frame');
    frame.style.width = `${target}px`;
    frame.style.height = `${availableHeight / scale}px`;
    frame.style.transform = scale === 1 ? 'none' : `scale(${scale})`;
    $('#frame-size').textContent = `${target} px · ${Math.round(scale * 100)}%${device === 'responsive' ? ' · Responsive' : zoom === 'fit' ? ' · Fit' : ''}`;
  }
  function scheduleCanvasSize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateCanvasSize);
  }
  function renderPreview(force = false) {
    const signature = project.id + JSON.stringify(project.files || project.design);
    if (signature !== previewSignature || force) {
      previewSignature = signature;
      previewHtml = C.buildDocument(project.files || C.createFiles(project.design), globalThis.DraftmangoImages);
      previewToken = crypto.randomUUID();
      consoleLines = [];
      renderConsole();
      $('#preview-status').innerHTML = '<i></i>Loading preview';
      $('#website-frame').srcdoc = previewDocument(previewHtml, previewToken);
      $('#website-frame').title = `${project.title} website preview`;
    }
    scheduleCanvasSize();
  }
  function previewDocument(html, token) {
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline' data: https:; font-src data: https:; script-src 'unsafe-inline' data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
    const bridge = `<script>(()=>{const token=${JSON.stringify(token)};const send=(level,text)=>parent.postMessage({draftmango:token,level,text:String(text).slice(0,2000)},'*');for(const level of ['log','info','warn','error']){const original=console[level];console[level]=(...args)=>{send(level,args.map(value=>{try{return typeof value==='string'?value:JSON.stringify(value)}catch{return String(value)}}).join(' '));original.apply(console,args)}}addEventListener('error',event=>send('error',event.message+' (line '+event.lineno+')'));addEventListener('unhandledrejection',event=>send('error',event.reason?.message||event.reason));addEventListener('load',()=>send('ready','Preview ready'));document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link){event.preventDefault();const target=document.getElementById(decodeURIComponent(link.hash.slice(1)));target?.scrollIntoView({behavior:'smooth'})}})})()<\/script>`;
    const start = policy + bridge;
    return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, match => match + start) : start + html;
  }
  function renderConsole() {
    const output = $('#console-output');
    output.replaceChildren();
    if (!consoleLines.length) output.textContent = 'No console messages yet. Run your draft to see its output.';
    consoleLines.forEach(entry => {
      const line = document.createElement('div');
      line.className = 'console-line';
      line.dataset.level = entry.level;
      line.textContent = entry.text;
      output.append(line);
    });
    $('#console-count').textContent = consoleLines.length;
  }
  window.addEventListener('message', event => {
    if (event.source !== $('#website-frame').contentWindow || event.data?.draftmango !== previewToken) return;
    if (event.data.level === 'ready') { $('#preview-status').innerHTML = '<i></i>Preview ready'; return; }
    if (!['log', 'info', 'warn', 'error'].includes(event.data.level) || typeof event.data.text !== 'string') return;
    consoleLines.push({ level: event.data.level, text: event.data.text.slice(0, 2000) });
    consoleLines = consoleLines.slice(-100);
    renderConsole();
  });
  $('#website-frame').addEventListener('load', () => { $('#preview-status').innerHTML = '<i></i>Preview ready'; });

  function syncSource() {
    const candidate = project.codeDraft || project.files || C.createFiles(project.design);
    if (!Object.hasOwn(candidate, selectedFile)) selectedFile = 'index.html';
    openFiles = openFiles.filter(name => Object.hasOwn(candidate, name)); if (!openFiles.includes(selectedFile)) openFiles.push(selectedFile);
    const changed = sourceProject !== project.id || JSON.stringify(candidate) !== JSON.stringify(workingFiles);
    if (sourceProject !== project.id) { selectedFile = 'index.html'; $('#file-search').value = ''; }
    sourceProject = project.id;
    workingFiles = structuredClone(candidate);
    if (changed) renderCode(); else renderFileButtons();
    renderCodeStatus();
  }
  function renderFileButtons() {
    const query = $('#file-search').value.trim().toLowerCase();
    for (const [id, filter] of [['file-list', true], ['file-tabs', false]]) {
      const list = $('#' + id);
      list.replaceChildren();
      (filter ? Object.keys(workingFiles).sort() : openFiles).filter(name => !filter || name.toLowerCase().includes(query) || ($('#search-contents')?.checked && workingFiles[name].toLowerCase().includes(query))).forEach(name => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.file = name;
        button.className = (name === selectedFile ? 'is-active' : '') + (project.codeDraft && project.codeDraft[name] !== (project.files || C.createFiles(project.design))[name] ? ' is-dirty' : '');
        button.setAttribute('aria-pressed', String(name === selectedFile));
        button.setAttribute('aria-label', `Open ${name}`);
        button.innerHTML = `<span class="file-symbol" aria-hidden="true">${name.endsWith('.html') ? '&lt;&gt;' : name.endsWith('.css') ? '#' : 'JS'}</span>`;
        button.append(document.createTextNode(name));
        button.addEventListener('click', event => {
          if (event.target.closest('[data-close-file]')) { openFiles = openFiles.filter(f => f !== name); if (selectedFile === name) selectedFile = openFiles.at(-1) || 'index.html'; if (!openFiles.includes(selectedFile)) openFiles.push(selectedFile); renderCode(); return; }
          selectedFile = name; if (!openFiles.includes(name)) openFiles.push(name); renderCode();
        });
        if (!filter) { const close = document.createElement('span'); close.dataset.closeFile = name; close.className = 'ws-tab-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close ' + name); button.append(close); }
        button.addEventListener('contextmenu', event => { event.preventDefault(); window.dispatchEvent(new CustomEvent('draftmango:file-menu', {detail:{name,anchor:button}})); });
        list.append(button);
      });
    }
    $('#no-files').hidden = !!$('#file-list').children.length;
  }
  function paintSource() {
    const input = $('#source-input');
    $('#source-highlight').innerHTML = C.highlight(input.value, selectedFile) + '\n';
    paintLineNumbers();
    syncCodeScroll();
    updateCursor();
  }
  function paintLineNumbers() {
    const input = $('#source-input'), lines = input.value.split('\n'), gutter = $('#line-numbers');
    if (!W.preferences.wordWrap || !input.clientWidth) { gutter.textContent = lines.map((_, i) => i + 1).join('\n'); return; }
    const style = getComputedStyle(input), measure = document.createElement('div');
    Object.assign(measure.style, {position:'fixed',left:'0',top:'0',visibility:'hidden',pointerEvents:'none',width:(input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight))+'px',font:style.font,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,whiteSpace:'pre-wrap',overflowWrap:'anywhere',wordBreak:'break-word',tabSize:String(W.preferences.indent)});
    for (const line of lines) { const span = document.createElement('div'); span.textContent = line || ' '; measure.append(span); }
    document.body.append(measure);
    gutter.innerHTML = [...measure.children].map((span,i)=>'<span style="display:block;height:'+span.getBoundingClientRect().height+'px">'+(i+1)+'</span>').join('');
    measure.remove();
  }
  function renderCode() {
    const input = $('#source-input');
    input.value = workingFiles[selectedFile];
    input.setSelectionRange(0, 0);
    input.setAttribute('aria-label', `Edit ${selectedFile}`);
    input.scrollTop = 0; input.scrollLeft = 0;
    $('#source-path').textContent = selectedFile;
    $('#editor-mode').textContent = selectedFile.endsWith('.html') ? 'HTML' : selectedFile.endsWith('.css') ? 'CSS' : 'JavaScript';
    renderFileButtons(); paintSource();
  }
  function syncCodeScroll() {
    const input = $('#source-input');
    $('.source-highlight').scrollTop = input.scrollTop;
    $('.source-highlight').scrollLeft = input.scrollLeft;
    $('.line-gutter').scrollTop = input.scrollTop;
  }
  function updateCursor() {
    const input = $('#source-input');
    const before = input.value.slice(0, input.selectionStart);
    const lines = before.split('\n');
    $('#cursor-position').textContent = `Ln ${lines.length}, Col ${lines.at(-1).length + 1}`;
  }
  function renderCodeStatus() {
    const dirty = !!project.codeDraft;
    $('#preview-pending').hidden = !dirty;
    $('#run-preview').classList.toggle('button-quiet', dirty);
    $('#run-preview').title = dirty ? 'Apply your code draft and update the preview · Ctrl/Cmd + S' : 'Run preview · Ctrl/Cmd + S';
    $('#undo').disabled = !dirty && project.cursor === 0;
    $('#redo').disabled = dirty || project.cursor >= project.history.length - 1;
    $('#custom-code-note').hidden = !(project.files || dirty);
    $('#design-fields').disabled = !!(project.files || dirty);
    if (diagnostic === 'checks') renderChecks();
  }
  function onCodeInput() {
    workingFiles[selectedFile] = $('#source-input').value;
    const applied = project.files || C.createFiles(project.design);
    project = { ...project, codeDraft: JSON.stringify(workingFiles) === JSON.stringify(applied) ? null : structuredClone(workingFiles), updatedAt: new Date().toISOString() };
    paintSource(); renderFileButtons(); renderCodeStatus();
    $('#save-status').innerHTML = '<span></span>Saving code draft…';
    clearTimeout(codeSaveTimer);
    codeSaveTimer = setTimeout(() => { save(); }, 450);
  }
  $('#source-input').addEventListener('input', onCodeInput);
  $('#source-input').addEventListener('scroll', syncCodeScroll);
  $('#source-input').addEventListener('click', updateCursor);
  $('#source-input').addEventListener('keyup', updateCursor);
  $('#source-input').addEventListener('keydown', event => {
    if (event.key === 'Escape') { releaseEditorTab = true; announce('Press Tab to move out of the code editor.'); return; }
    if (event.key === 'Tab' && releaseEditorTab) { releaseEditorTab = false; return; }
    releaseEditorTab = false;
    if (event.target.readOnly) return;
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const input = event.target, start = input.selectionStart, end = input.selectionEnd;
      if (event.shiftKey) {
        const lineStart = input.value.lastIndexOf('\n', start - 1) + 1;
        const count = input.value.slice(lineStart).match(new RegExp('^ {1,' + W.preferences.indent + '}'))?.[0].length || 0;
        input.setRangeText('', lineStart, lineStart + count, 'preserve');
      } else input.setRangeText(' '.repeat(W.preferences.indent), start, end, 'end');
      onCodeInput();
    }
  });
  $('#file-search').addEventListener('input', renderFileButtons);
  $('#toggle-files').addEventListener('click', () => {
    const code = $('#code-view');
    if (matchMedia('(max-width:760px)').matches) {
      const open = code.classList.toggle('files-open');
      code.classList.remove('files-collapsed');
      $('#toggle-files').setAttribute('aria-expanded', String(open));
    } else {
      const closed = code.classList.toggle('files-collapsed');
      $('#toggle-files').setAttribute('aria-expanded', String(!closed));
    }
  });
  function applyCode(run = true) {
    clearTimeout(codeSaveTimer);
    if (project.codeDraft) {
      project = M.commitFiles(project, project.codeDraft);
      save(); render();
    }
    if (run) { renderPreview(true); renderChecks(); W.recordActivity('build', project.id); announce('Your preview is up to date.'); }
  }
  $('#run-preview').addEventListener('click', () => applyCode());
  $('#run-pending').addEventListener('click', () => applyCode());
  $('#reset-code').addEventListener('click', () => {
    clearTimeout(codeSaveTimer);
    project = M.resetCode(project);
    save(); render();
    announce('Back to visual design. Your code is kept in History.');
  });
  window.addEventListener('pagehide', flushCodeDraft);
  window.addEventListener('beforeunload', event => {
    clearTimeout(codeSaveTimer); save();
    if (saveFailed) { event.preventDefault(); event.returnValue = ''; }
  });
  function renderChecks() {
    const output = $('#check-output');
    output.innerHTML = '<p class="diagnostic-note">Basic source checks. Use Console for runtime errors and Preview to check the design.</p>';
    const results = C.checkFiles(workingFiles);
    results.forEach(result => {
      const row = document.createElement('div');
      row.className = 'check-row' + (result.ok ? '' : ' is-warning');
      row.innerHTML = icon(result.ok ? 'check' : 'info');
      const label = document.createElement('span'); label.textContent = result.label;
      const file = document.createElement('small'); file.textContent = result.file;
      row.append(label, file); output.append(row);
    });
    $('#check-count').textContent = results.filter(r => r.ok).length + '/' + results.length;
  }
  function setDiagnostic(next) {
    diagnostic = diagnostic === next ? '' : next;
    $('#diagnostic-content').hidden = !diagnostic;
    $('#close-diagnostics').hidden = !diagnostic;
    $('#console-output').hidden = diagnostic !== 'console';
    $('#check-output').hidden = diagnostic !== 'checks';
    $$('[data-diagnostic]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.diagnostic === diagnostic)));
    if (diagnostic === 'checks') renderChecks();
    scheduleCanvasSize();
  }
  $$('[data-diagnostic]').forEach(button => button.addEventListener('click', () => setDiagnostic(button.dataset.diagnostic)));
  $('#close-diagnostics').addEventListener('click', () => setDiagnostic(''));
  function renderDesign() {
    const d = project.design;
    $('#template-select').value = d.kind;
    $('#font-select').value = d.font;
    $('#corners-select').value = d.corners;
    $('#spacing-select').value = d.spacing;
    $('#hero-size-select').value = d.heroSize;
    $('#brand-input').value = d.brand;
    $('#heading-input').value = d.heading;
    $('#description-input').value = d.description;
    $('#button-input').value = d.button;
    for (const name of ['story','collection','contact']) $(`#section-${name}`).checked = d.sections[name];
    $$('[data-palette]').forEach(button => {
      const active = button.dataset.palette === d.theme;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function collectDesign() {
    return {
      ...project.design, font: $('#font-select').value, corners: $('#corners-select').value,
      spacing: $('#spacing-select').value, heroSize: $('#hero-size-select').value,
      brand: $('#brand-input').value, heading: $('#heading-input').value,
      description: $('#description-input').value, button: $('#button-input').value,
      sections: { story: $('#section-story').checked, collection: $('#section-collection').checked, contact: $('#section-contact').checked }
    };
  }
  function commitDesign(design, label, notify = true) {
    const previous = project;
    project = M.commit(project, design, label);
    save();
    render();
    if (notify) announce(project === previous ? 'This draft is already up to date.' : label + '.');
  }
  function renderHistory() {
    const list = $('#history-list');
    list.replaceChildren();
    [...project.history].reverse().forEach((entry, reversed) => {
      const index = project.history.length - 1 - reversed;
      const palette = M.palettes[entry.design.theme];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-entry' + (index === project.cursor ? ' is-active' : '');
      button.setAttribute('aria-label', `${index === project.cursor ? 'Current draft' : 'Restore draft'}: ${entry.label}`);
      button.setAttribute('aria-pressed', String(index === project.cursor));
      const swatch = document.createElement('span');
      swatch.className = 'history-swatch';
      swatch.style.setProperty('--history-paper', palette.paper);
      swatch.style.setProperty('--history-accent', palette.accent);
      swatch.style.setProperty('--history-ink', palette.ink);
      swatch.setAttribute('aria-hidden', 'true');
      const words = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = entry.label;
      const caption = document.createElement('small');
      caption.textContent = `Draft ${index + 1} · ${stamp(entry.at)}${index === project.cursor ? ' · Current' : ''}`;
      words.append(title, caption);
      button.append(swatch, words);
      if (index === project.cursor) button.insertAdjacentHTML('beforeend', icon('check'));
      button.addEventListener('click', () => {
        if (index === project.cursor) return;
        applyCode(false);
        project = M.restore(project, index);
        save(); render();
        announce(`Restored “${entry.label}”.`);
      });
      list.append(button);
    });
  }
  function render() {
    $('#project-title').textContent = project.title;
    $('#canvas-project-name').textContent = project.title;
    document.title = `${project.title} — Draftmango`;
    $('#undo').disabled = project.cursor === 0;
    $('#redo').disabled = project.cursor >= project.history.length - 1;
    $('.history-dot').hidden = project.history.length < 2;
    renderConversation(); renderDesign(); renderHistory(); renderSidebar(); syncSource(); renderPreview(); renderAI();
    window.dispatchEvent(new Event('draftmango:editor-render'));
  }

  function setPanel(panel) {
    currentPanel = panel;
    for (const name of ['build','design','history']) $(`#panel-${name}`).hidden = name !== panel;
    $$('[data-panel]').forEach(button => {
      const active = button.dataset.panel === panel;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function setMobileView(next) {
    $('.workspace-layout').dataset.mobileView = next;
    $$('[data-mobile-view]').filter(element => element.tagName === 'BUTTON').forEach(button => {
      const active = button.dataset.mobileView === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    scheduleCanvasSize();
  }
  let aiJob = null;
  let aiStatus = null;
  let lastAIRequest = null;
  let aiFeedback = { text: '', state: '', retry: false };
  function fileRevision(item) {
    return JSON.stringify([item.design, item.files || null, item.codeDraft || null, item.designBrief || null, item.cursor]);
  }
  function renderAI() {
    const busy = !!aiJob;
    $('#ai-feedback').hidden = busy || !aiFeedback.text;
    renderAgentProgress();
    $('#ai-feedback').dataset.state = aiFeedback.state;
    $('#ai-message').textContent = aiFeedback.text;
    $('#cancel-ai').hidden = !busy;
    $('#retry-ai').hidden = busy || !aiFeedback.retry;
    $('#generate-site').hidden = busy || project.ai?.state !== 'pending' || aiFeedback.retry || project.messages.at(-1)?.role === 'assistant';
    $('#chat-form button[type=submit]').disabled = busy;
    $('#chat-form').setAttribute('aria-busy', String(busy));
    $$('[data-request]').forEach(button => { button.disabled = busy; });
    $('#source-input').readOnly = busy;
    $('#design-fields').disabled = busy || !!(project.files || project.codeDraft);
    $('#history-list').inert = busy;
    $('#reset-code').disabled = busy;
    $('#undo').disabled = busy || (!project.codeDraft && project.cursor === 0);
    $('#redo').disabled = busy || !!project.codeDraft || project.cursor >= project.history.length - 1;
    const name = aiStatus?.name || 'AI';
    $('#ai-connection').textContent = aiStatus?.configured ? name + ' · Ready' : aiStatus ? 'Set up ' + name : 'AI · Connection';
    $$('[data-ai-name]').forEach(element => { element.textContent = name; });
    $$('[data-ai-service]').forEach(element => { element.textContent = aiStatus?.service || 'your configured provider'; });
    $('#ai-key-variable').textContent = aiStatus?.keyVariable || 'OPENAI_API_KEY';
    $('#ai-model-variable').textContent = aiStatus?.modelVariable || 'OPENAI_MODEL';
  }
  function renderAgentProgress() {
    let pending=$('#agent-progress');
    if(!aiJob||aiJob.complete){pending?.remove();return;}
    const log=$('#conversation'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<90;
    if(!pending){
      pending=document.createElement('div');pending.id='agent-progress';pending.className='message message-assistant agent-progress';
      pending.innerHTML='<div class="agent-plan message-content"></div><div class="agent-live"><span class="agent-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="agent-phase" role="status" aria-live="polite"></span><span class="agent-time" aria-hidden="true"></span><button type="button" class="agent-stop">Stop</button></div>';
      pending.querySelector('button').onclick=()=>stopAI();log.append(pending);
    }
    const plan=pending.querySelector('.agent-plan');
    if(plan.dataset.text!==aiJob.plan){Chat.render(plan,aiJob.plan);plan.dataset.text=aiJob.plan;}
    plan.hidden=!aiJob.plan;
    const label=aiJob.plan&&aiJob.phase==='planning'?'Building the website':Chat.labels[aiJob.phase];
    const status=pending.querySelector('.agent-phase');if(status.textContent!==label)status.textContent=label;
    pending.querySelector('.agent-time').textContent=aiJob.elapsedSeconds>=10?Chat.duration(aiJob.elapsedSeconds*1000):'';
    if(atBottom)requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight;});
  }
  async function checkAI() {
    try {
      const response = await fetch('/api/ai/status', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Setup unavailable');
      aiStatus = await response.json();
      $('#ai-setup-status').textContent = aiStatus.configured
        ? 'A local API key is configured. Model: ' + aiStatus.model + '. The next generation will verify access.'
        : 'Add your API key to start generating.';
    } catch {
      aiStatus = null;
      $('#ai-setup-status').textContent = 'Start Draftmango with npm run dev, then open http://127.0.0.1:4175. AI generation needs the local server.';
    }
    renderAI();
    return aiStatus;
  }
  function stopAI(silent = false) {
    if (!aiJob) return;
    aiJob.controller.abort();
    aiJob = null;
    aiFeedback = silent ? { text: '', state: '', retry: false } : {
      text: 'Stopped. Your website is unchanged.', state: '', retry: true
    };
    renderAI();
  }
  async function requestChange(request, { mode, retry = false } = {}) {
    const text = request.trim();
    if (!text || aiJob) return;
    applyCode(false);
    mode = mode || Chat.requestMode(project,W.emptyFiles());
    if (!retry && !(project.messages.at(-1)?.role === 'user' && project.messages.at(-1)?.text === text)) addMessage('user', text);
    lastAIRequest = { text, mode };
    const job = { controller: new AbortController(), projectId: project.id, revision: fileRevision(project), startedAt:Date.now(), phase:'connecting', phases:['connecting'], plan:'', elapsedSeconds:0 };
    aiJob = job;
    aiFeedback = { text:'Thinking…', state:'busy', retry:false };
    const parentContext = W.get(project.workspace?.parentId);
    const payload = {
      mode, interaction:'conversation', prompt: text,
      references: project.workspace?.attachments || [],
      projectContext: [project.prompt ? 'Original brief: '+project.prompt : '', parentContext?.workspace?.brief, parentContext?.workspace?.instructions, project.workspace?.notes].filter(Boolean).join('\n\n').slice(0,12000),
      ...(mode === 'edit' ? { files: Object.fromEntries(C.names.map(name => [name, (project.files || C.createFiles(project.design))[name]])), designBrief: project.designBrief || null } : { creationPreferences: project.creationPreferences || [] }),
      history: Chat.history(project.messages,text)
    };
    save(); render(); renderAI();
    if (!retry) { $('#chat-input').value = ''; $('#chat-input').style.height = ''; }
    let clientTimedOut = false, connectionLost = false, timer, idleTimer;
    const armDeadline = seconds => {
      clearTimeout(timer);
      timer = setTimeout(() => { clientTimedOut = true; job.controller.abort(); }, (seconds + 30) * 1000);
    };
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { connectionLost = true; job.controller.abort(); }, 90000);
    };
    armDeadline(aiStatus?.timeoutSeconds || 900);
    resetIdle();
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/x-ndjson', ...await A.headers() }, body: JSON.stringify(payload), signal: job.controller.signal
      });
      const result = await globalThis.DraftmangoAI.readResponse(response, event => {
        resetIdle();
        if (aiJob !== job) return;
        if (event.type === 'start' && Number.isFinite(event.timeoutSeconds) && event.timeoutSeconds > 0 && event.timeoutSeconds <= 1800) armDeadline(event.timeoutSeconds);
        if (event.type === 'progress') {
          job.phase = Object.hasOwn(Chat.labels,event.phase) ? event.phase : job.phase;
          if (!job.phases.includes(job.phase)) job.phases.push(job.phase);
          if (typeof event.message === 'string') job.plan=event.message.slice(0,3000);
          job.elapsedSeconds=Math.max(0,Math.floor(event.elapsedSeconds||0));
          aiFeedback = {text:Chat.labels[job.phase]+'…', state:'busy', retry:false};
          renderAI();
        }
      });
      if (aiJob !== job || project.id !== job.projectId) return;
      // Another tab or an intervening edit must never be overwritten by a late reply.
      let latest;
      try { latest = M.readStore(localStorage.getItem(storageKey))?.projects.find(item => item.id === project.id); } catch { /* Current session remains usable. */ }
      if (fileRevision(project) !== job.revision || (latest && fileRevision(latest) !== job.revision)) {
        if (latest) { project = latest; conversationProject = ''; }
        throw new Error('This draft changed while the AI was working. Your newer edits are kept. Try again to use the latest files.');
      }
      if (result.action === 'update' && M.readFiles(result.files)) {
        project = M.commitFiles(project, {...(project.files || {}), ...result.files}, (mode === 'create' ? 'Created with ' : 'Edited with ') + (result.name || 'AI'), result.designBrief || project.designBrief);
        if (mode === 'create' && result.title) project = { ...project, title: result.title.slice(0,60) };
        project = { ...project, ai: { state: 'ready' } };
      } else if (result.action !== 'reply') { throw new Error('The AI returned invalid files. Your current draft is unchanged.'); }
      job.complete=true;
      addMessage('assistant', result.message, { changed: result.action === 'update', activity:{durationMs:Date.now()-job.startedAt,phases:job.phases,plan:job.plan} });
      W.recordActivity('ai', project.id); if (W.preferences.sound) W.chime();
      project.workspace = {...project.workspace, queuedPrompt:''};
      aiStatus = { configured: true, provider:result.provider, name:result.name, service:result.service, keyVariable:result.keyVariable, modelVariable:result.modelVariable, model:result.model, timeoutSeconds:result.timeoutSeconds };
      aiFeedback = { text: '', state: '', retry: false };
      lastAIRequest = null;
      save(); render();
      if(result.action === 'update')announce('Your website is updated. The previous draft is in History.');
    } catch (error) {
      if (aiJob !== job) return;
      if (error.code === 'missing_key' || error.code === 'invalid_key') aiStatus = {...aiStatus, configured:false};
      aiFeedback = {
        text: connectionLost ? 'The connection to the local server was interrupted. Your draft is unchanged. Try again.' : clientTimedOut ? 'The AI did not finish within the generation time limit. Your draft is unchanged. You can try again.' : error.name === 'AbortError' ? 'Generation stopped. Your website is unchanged.' : error.message || 'Could not connect. Please try again.',
        state: 'error', retry: true
      };
    } finally {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      if (aiJob === job) { aiJob = null; render(); renderAI(); }
    }
  }
  $('#cancel-ai').addEventListener('click', () => stopAI());
  $('#retry-ai').addEventListener('click', () => { if (lastAIRequest) requestChange(lastAIRequest.text, {mode: lastAIRequest.mode, retry:true}); });
  $('#generate-site').addEventListener('click', () => requestChange(project.prompt, {mode:'create'}));
  $('#ai-connection').addEventListener('click', () => { $('#ai-dialog').showModal(); checkAI(); });
  $('#check-ai').addEventListener('click', checkAI);
  window.addEventListener('pagehide', () => stopAI(true));


  $$('[data-panel]').forEach(button => button.addEventListener('click', () => setPanel(button.dataset.panel)));
  $$('button[data-mobile-view]').forEach(button => button.addEventListener('click', () => setMobileView(button.dataset.mobileView)));
  $('#canvas-design-shortcut').addEventListener('click', () => { setPanel('design'); setMobileView('editor'); });
  $('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#chat-input');
    if (!input.value.trim()) { input.setCustomValidity('Write a message to continue.'); input.reportValidity(); return; }
    requestChange(input.value);
  });
  $('#chat-input').addEventListener('input', event => {
    event.target.setCustomValidity('');
    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(120, Math.max(49, event.target.scrollHeight))}px`;
  });
  $('#chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#chat-form').requestSubmit(); }
  });
  $$('[data-request]').forEach(button => button.addEventListener('click', () => requestChange(button.dataset.request)));

  Object.entries(M.palettes).forEach(([key, palette]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-choice';
    button.dataset.palette = key;
    button.setAttribute('aria-label', `${palette.name} color palette`);
    const chip = document.createElement('span');
    chip.className = 'palette-chip';
    chip.style.setProperty('--swatch-paper', palette.paper);
    chip.style.setProperty('--swatch-accent', palette.accent);
    chip.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = palette.name;
    button.append(chip, name);
    button.addEventListener('click', () => {
      if (!$('#design-form').reportValidity()) return;
      commitDesign({ ...collectDesign(), theme: key }, `Changed the palette to ${palette.name.toLowerCase()}`);
    });
    $('#palette-options').append(button);
  });
  $('#design-form').addEventListener('submit', event => {
    event.preventDefault();
    commitDesign(collectDesign(), 'Updated your design');
  });
  $('#template-select').addEventListener('change', event => {
    commitDesign(M.sanitizeDesign({ kind: event.target.value }), `Tried the ${M.templates[event.target.value].title} starting point`);
  });
  const controlLabels = { 'brand-input': 'Updated the brand name', 'heading-input': 'Updated the headline', 'description-input': 'Updated the introduction', 'button-input': 'Updated the button text', 'font-select': 'Changed the heading style', 'corners-select': 'Changed the corners', 'spacing-select': 'Adjusted the spacing', 'hero-size-select': 'Adjusted the headline size', 'section-story': 'Updated the story section', 'section-collection': 'Updated the collection section', 'section-contact': 'Updated the contact section' };
  Object.entries(controlLabels).forEach(([id, label]) => $('#' + id).addEventListener('change', () => {
    if ($('#design-form').checkValidity()) commitDesign(collectDesign(), label, false);
  }));

  function moveHistory(offset) {
    if (aiJob) return;
    applyCode(false);
    const next = M.restore(project, project.cursor + offset);
    if (next === project) return;
    project = next; save(); render();
    announce(offset < 0 ? 'Previous version restored.' : 'Next version restored.');
  }
  $('#undo').addEventListener('click', () => moveHistory(-1));
  $('#redo').addEventListener('click', () => moveHistory(1));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); applyCode(); return; }
    if (event.target.closest('input,textarea,select') || event.target.isContentEditable || $('dialog[open]')) return;
    if (event.ctrlKey || event.metaKey) {
      if (!aiJob && event.key.toLowerCase() === 'z') { event.preventDefault(); moveHistory(event.shiftKey ? 1 : -1); }
      else if (event.key.toLowerCase() === 'y') { event.preventDefault(); moveHistory(1); }
    }
  });
  $$('.view-tabs [data-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view;
    $$('.view-tabs [data-view]').forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    $('#workbench').dataset.view = view;
    $('#canvas-view').hidden = view === 'code';
    $('#code-view').hidden = view === 'preview';
    scheduleCanvasSize();
  }));
  function updateDevice(next) {
    device = next;
    $$('[data-device]').forEach(button => {
      const active = button.dataset.device === device;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#zoom-select').value = '1';
    $('#canvas-stage').scrollLeft = 0;
    scheduleCanvasSize();
  }
  $$('[data-device]').forEach(button => button.addEventListener('click', () => updateDevice(button.dataset.device)));
  $('#zoom-select').addEventListener('change', scheduleCanvasSize);
  $('#refresh-preview').addEventListener('click', () => { renderPreview(true); announce('Preview refreshed.'); });
  new ResizeObserver(scheduleCanvasSize).observe($('#canvas-stage'));

  function documentLink(download = false) {
    applyCode(false);
    // Keep a separate-tab preview sandboxed too; exported files remain standalone.
    const content = download ? previewHtml : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${M.escapeHtml(project.title)} — Preview</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style></head><body><iframe sandbox="allow-scripts" referrerpolicy="no-referrer" title="Website preview" srcdoc="${M.escapeHtml(previewDocument(previewHtml, 'standalone'))}"></iframe></body></html>`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    if (download) link.download = 'draftmango-' + (project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-website') + '.html';
    else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  $('#open-preview').addEventListener('click', () => documentLink());
  $('#export-site').addEventListener('click', () => { documentLink(true); announce('Your HTML download includes the images, too.'); });
  $('#copy-code').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(workingFiles[selectedFile]);
      announce(`${selectedFile} is copied.`);
    } catch {
      announce('Copy is unavailable here. Export site downloads the same HTML.');
    }
  });

  function renderProjects() {
    $('#project-name-input').value = project.title;
    const list = $('#project-list');
    list.replaceChildren();
    [...library.projects].reverse().forEach(item => {
      const button = document.createElement('button');
      button.className = 'project-row' + (item.id === project.id ? ' is-active' : '');
      button.setAttribute('aria-label', `Open ${item.title}`);
      const thumb = document.createElement('span');
      thumb.style.setProperty('--project-color', M.palettes[item.design.theme].soft);
      thumb.textContent = '✳'; thumb.setAttribute('aria-hidden', 'true');
      const words = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = item.title;
      const meta = document.createElement('small'); meta.textContent = `${calendarDate(item.updatedAt)} · ${item.history.length} draft${item.history.length === 1 ? '' : 's'}`;
      words.append(title, meta); button.append(thumb, words);
      if (item.id === project.id) button.insertAdjacentHTML('beforeend', icon('check'));
      button.addEventListener('click', () => {
        switchProject(item.id);
        $('#projects-dialog').close();
        announce(`Back to ${project.title}.`);
      });
      list.append(button);
    });
  }
  $('#project-menu').addEventListener('click', () => {
    renderProjects();
    $('#projects-dialog').showModal();
  });
  $('#rename-form').addEventListener('submit', event => {
    event.preventDefault();
    const field = $('#project-name-input');
    const title = field.value.trim();
    if (!title) { field.setCustomValidity('Give this draft a name.'); field.reportValidity(); return; }
    project = { ...project, title, updatedAt: new Date().toISOString() };
    save(); render(); renderProjects();
    announce('Project renamed.');
  });
  $('#project-name-input').addEventListener('input', event => event.target.setCustomValidity(''));
  $('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
  $$('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  window.addEventListener('draftmango:sync', () => { if (A.user && !saveFailed) { $('#save-status').textContent = A.message; $('#save-status').title = A.issue || A.message; } });
  window.addEventListener('draftmango:session-ended', () => { stopAI(true); flushCodeDraft(); });
  save(); render(); updateDevice(device);
  globalThis.DraftmangoEditor = {
    get project(){return project;}, get files(){return workingFiles;}, get selectedFile(){return selectedFile;}, get busy(){return !!aiJob;},
    save, render, applyCode, setPanel, setMobileView, updateDevice, scheduleCanvasSize,
    selectFile(name){if(Object.hasOwn(workingFiles,name)){selectedFile=name;if(!openFiles.includes(name))openFiles.push(name);renderCode();}},
    setFiles(files,label='Updated source files'){if(aiJob)throw new Error('Wait for generation to finish before changing files.');project=M.commitFiles(project,files,label);save();render();},
    updateMeta(patch){project.workspace={...project.workspace,...patch};save();window.dispatchEvent(new Event('draftmango:editor-render'));},
    syncMeta(){const latest=W.get(project.id);if(latest){project={...project,title:latest.title,workspace:latest.workspace};render();}},
    clearConsole(){consoleLines=[];renderConsole();},
    stopPreview(){ $('#website-frame').srcdoc='';previewSignature='';$('#preview-status').textContent='Preview stopped';},
    exportHTML(){documentLink(true);}, openPreview(){documentLink();}, runRequest:requestChange,
    diagnostic: setDiagnostic, consoleLines:()=>consoleLines
  };
  window.dispatchEvent(new Event('draftmango:editor-ready'));
  new ResizeObserver(()=>{paintLineNumbers();syncCodeScroll();}).observe($('#source-scroll'));
  if(starting.get('view')) document.querySelector('.view-tabs [data-view="'+(['code','split'].includes(starting.get('view'))?starting.get('view'):'preview')+'"]').click();
  if(starting.get('file')) globalThis.DraftmangoEditor.selectFile(starting.get('file'));
  const queued = project.workspace?.queuedPrompt;
  if(queued) checkAI().then(status=>{if(status?.configured&&!aiJob){project.workspace={...project.workspace,queuedPrompt:''};save();requestChange(queued);}});

  const incomingProjectId = project.id;
  checkAI().then(status => {
    if (initialIdea && project.id === incomingProjectId && project.ai?.state === 'pending' && status?.configured && !aiJob && !lastAIRequest) requestChange(project.prompt, {mode:'create'});
  });
})();
