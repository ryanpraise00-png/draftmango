(async () => {
  'use strict';
  const A = globalThis.DraftmangoAccounts;
  if (!await A.protect()) return;
  const W = globalThis.DraftmangoWorkspace; await W.init();
  const M = globalThis.DraftmangoModel;
  const D = globalThis.DraftmangoDashboard;
  const C = globalThis.DraftmangoCode;
  const P = globalThis.DraftmangoProject;
  let buildController, buildPromise, buildSequence=0, compiledSignature='';
  const Chat = globalThis.DraftmangoConversation;
  const B = globalThis.DraftmangoBuilderFlow;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const storageKey = A.key('projects');
  const sizes = { desktop: 1280, tablet: 768, mobile: 390 };
  let library;
  let saveFailed = false;
  let toastTimer;
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
    if (selected?.workspace?.deleted) { location.replace('/dashboard#projects'); return; }
    if (!selected) { location.replace('/dashboard#projects'); return; }
    library.activeId = selected.id;
  }
  if (initialIdea) {
    const next = M.createProject(initialIdea, 'blank');
    const selectedTemplateId = starting.get('template');
    next.files=W.emptyFiles();next.history[0].files=structuredClone(next.files);
    next.workspace={...next.workspace,builder:B.initial(),...(selectedTemplateId && !['blank','auto'].includes(selectedTemplateId)?{templateId:selectedTemplateId}:{})};
    next.ai={state:'pending'};
    next.creationPreferences=[];
    next.messages=[{role:'user',text:initialIdea}];
    library = library || { schema: 1, activeId: next.id, projects: [] };
    library.projects.push(next);
    library.activeId = next.id;
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* Some file viewers disallow history changes. */ }
  }
  if (!library) {
    const first = M.createProject('', 'blank');
    first.files=W.emptyFiles();first.history[0].files=structuredClone(first.files);first.workspace={...first.workspace,builder:B.initial()};
    library = { schema: 1, activeId: first.id, projects: [first] };
  }
  let project = library.projects.find(p => p.id === library.activeId) || library.projects[0];
  if(!project.workspace?.builder && project.ai?.state==='pending' && !project.files?.['template.lock.json'])project.workspace={...project.workspace,builder:B.initial()};
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
  const mobileNavigation = matchMedia('(max-width:1000px)');
  const navigation = $('#project-sidebar'), navTrigger = $('#toggle-navigation');
  function renderSidebar() {
    W.sidebar(navigation, W.isChat(project) ? 'chats' : 'projects', project.id);
    navigation.querySelector('.ws-nav-close').onclick = () => closeNavigation(true);
    syncNavigation();
  }
  function syncNavigation() {
    const open = navigation.classList.contains('is-open');
    navigation.inert = mobileNavigation.matches && !open;
    navTrigger.setAttribute('aria-expanded', String(mobileNavigation.matches ? open : document.body.dataset.sidebarCollapsed !== 'true'));
    navTrigger.setAttribute('aria-label', mobileNavigation.matches ? 'Open workspace navigation' : 'Toggle sidebar');
  }
  function closeNavigation(restoreFocus = false) {
    const wasOpen = navigation.classList.contains('is-open');
    W.closeMenu();navigation.classList.remove('is-open');
    navigation.removeAttribute('role');navigation.removeAttribute('aria-modal');
    $('#navigation-scrim').hidden = true;
    $('.workspace-layout').inert = false;
    syncNavigation();
    if(wasOpen && restoreFocus)navTrigger.focus({preventScroll:true});
  }
  navTrigger.addEventListener('click', () => {
    if (mobileNavigation.matches) {
      if(navigation.classList.contains('is-open')) { closeNavigation(true); return; }
      navigation.inert = false;navigation.classList.add('is-open');
      navigation.setAttribute('role','dialog');navigation.setAttribute('aria-modal','true');
      $('#navigation-scrim').hidden = false;
      $('.workspace-layout').inert = true;
      syncNavigation();navigation.querySelector('.ws-nav-close')?.focus({preventScroll:true});
    } else navigation.querySelector('.ws-sidebar-collapse')?.click();
    scheduleCanvasSize();
  });
  navigation.addEventListener('draftmango:sidebar-layout', () => { syncNavigation();scheduleCanvasSize(); });
  navigation.addEventListener('draftmango:sidebar-navigate', () => closeNavigation());
  navigation.addEventListener('click', event => {
    const link=event.target.closest('a[href]');
    if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
    const url=new URL(link.href);
    if(url.origin!==location.origin || url.pathname!==location.pathname)return;
    const id=new URLSearchParams(url.hash.slice(1)).get('project');
    if(!id || !library.projects.some(item=>item.id===id))return;
    event.preventDefault();
    const wasOpen=navigation.classList.contains('is-open');
    if(id!==project.id)switchProject(id);
    else closeNavigation();
    if(wasOpen)navTrigger.focus({preventScroll:true});
  });
  $('#navigation-scrim').addEventListener('click', () => closeNavigation(true));
  document.addEventListener('keydown', event => {
    if(!mobileNavigation.matches || !navigation.classList.contains('is-open') || event.defaultPrevented || $('dialog[open]'))return;
    if(event.key==='Escape'){event.preventDefault();closeNavigation(true);return;}
    if(event.key!=='Tab' || $('.ws-menu[role="menu"]'))return;
    const controls=[...navigation.querySelectorAll('a[href],button:not([disabled])')].filter(node=>node.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
  });
  mobileNavigation.addEventListener('change', () => {
    const active=document.activeElement,wasOpen=navigation.classList.contains('is-open');closeNavigation();
    if(mobileNavigation.matches && navigation.contains(active))navTrigger.focus({preventScroll:true});
    else if(!mobileNavigation.matches && (wasOpen || active===navTrigger))navigation.querySelector('.ws-sidebar-collapse')?.focus({preventScroll:true});
    scheduleCanvasSize();
  });
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
      block.setAttribute('role','group');
      block.setAttribute('aria-label',message.role==='user'?'You':'Draftmango');
      const label = document.createElement('div');
      label.className = 'message-label';
      label.innerHTML = message.role === 'user' ? 'You <span class="avatar">Y</span>' : `<span class="avatar">${icon('mango')}</span>Draftmango`;
      const content = document.createElement(message.role === 'assistant' ? 'div' : 'p');
      content.className = 'message-content';
      const messageText = message.initial ? 'Tell me what you want to build. I’ll help clarify the details, agree a plan with you, and adapt a design from the template library.' : message.text;
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
    for(const frame of $$('#website-frame,#template-review-frame')){
      frame.style.width = `${target}px`;
      frame.style.height = `${availableHeight / scale}px`;
      frame.style.transform = scale === 1 ? 'none' : `scale(${scale})`;
    }
    $('#frame-size').textContent = `${target} px · ${Math.round(scale * 100)}%${device === 'responsive' ? ' · Responsive' : zoom === 'fit' ? ' · Fit' : ''}`;
  }
  function scheduleCanvasSize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(updateCanvasSize);
  }
  let storePreviewTrusted=false,storePreviewPort=null;
  let reviewPreviewKey='',reviewPreviewSequence=0,reviewPreviewPromise=null;
  function templateReview(){
    const workflow=B.read(project.workspace?.builder);
    // Reviewing a design must never cover up manually edited or already-built source.
    return workflow?.phase==='review'&&!project.codeDraft&&Chat.requestMode(project,W.emptyFiles())==='create'?workflow.plan:null;
  }
  function clearTemplateReview(){
    if(!reviewPreviewKey)return;
    reviewPreviewKey='';reviewPreviewSequence++;reviewPreviewPromise=null;
    const frame=$('#template-review-frame');if(frame){frame.onload=null;frame.hidden=true;frame.removeAttribute('src');}
    $('#template-review-note').hidden=true;$('#website-frame').hidden=false;
    $('#canvas-project-name').textContent=project.title;
    $('#preview-status').textContent=compiledSignature?'Preview ready':'Loading preview';
  }
  function renderTemplateReview(plan,force){
    const key=project.id+':'+plan.templateId;
    if(key===reviewPreviewKey&&!force)return reviewPreviewPromise||Promise.resolve(true);
    reviewPreviewKey=key;const sequence=++reviewPreviewSequence;
    buildController?.abort();buildSequence++;buildPromise=null;
    storePreviewTrusted=false;storePreviewPort?.close();storePreviewPort=null;previewToken='';
    let note=$('#template-review-note'),frame=$('#template-review-frame');
    if(!note){
      note=document.createElement('div');note.id='template-review-note';note.className='template-review-note';note.setAttribute('role','status');
      note.append(document.createElement('span'));
      const retry=document.createElement('button');retry.type='button';retry.textContent='Retry preview';retry.className='text-button';retry.onclick=()=>renderPreview(true);note.append(retry);
      $('#canvas-stage').before(note);
      frame=document.createElement('iframe');frame.id='template-review-frame';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';$('#frame-wrap').append(frame);
    }
    note.hidden=false;note.firstElementChild.textContent='Loading the selected template preview…';note.lastElementChild.hidden=true;
    frame.hidden=true;frame.onload=null;frame.removeAttribute('src');$('#website-frame').hidden=true;
    $('#preview-status').textContent='Loading template preview';
    reviewPreviewPromise=(async()=>{
      try{
        const catalog=await globalThis.DraftmangoTemplates.catalog();
        if(sequence!==reviewPreviewSequence||key!==reviewPreviewKey)return false;
        const template=catalog.find(item=>item.id===plan.templateId);
        if(!template||!/^demo-[a-z0-9-]+\.html$/.test(template.file))throw new Error('Template preview unavailable');
        note.firstElementChild.textContent=template.name+' template · Sample content, not customised.';
        $('#canvas-project-name').textContent=template.name+' · Template preview';
        frame.title=template.name+' template preview — sample content';
        frame.onload=()=>{if(sequence===reviewPreviewSequence&&key===reviewPreviewKey)$('#preview-status').textContent='Template preview · Awaiting your approval';};
        frame.src='/framo/previews/'+template.file;frame.hidden=false;scheduleCanvasSize();
        return true;
      }catch{
        if(sequence!==reviewPreviewSequence||key!==reviewPreviewKey)return false;
        note.firstElementChild.textContent='The selected template preview could not be loaded. Your draft is unchanged.';note.lastElementChild.hidden=false;
        $('#preview-status').textContent='Template preview unavailable';return false;
      }finally{if(sequence===reviewPreviewSequence)reviewPreviewPromise=null;}
    })();
    return reviewPreviewPromise;
  }
  function showPreviewPlaceholder(state = '') {
    const empty = $('#preview-empty');
    empty.hidden = !state;
    empty.dataset.state = state;
    $('#canvas-stage').classList.toggle('has-placeholder', !!state);
    if (!state) return;
    const paused = state === 'paused';
    $('#preview-empty-title').textContent = paused ? 'Preview paused' : 'Your website will appear here';
    $('#preview-empty-copy').textContent = paused ? 'Resume whenever you’re ready. Your work is saved.' : 'Start with an idea in the chat. We’ll bring it to life here.';
    $('#preview-empty-action').textContent = paused ? 'Resume preview' : 'Describe your website';
  }
  $('#preview-empty-action').addEventListener('click', () => {
    if ($('#preview-empty').dataset.state === 'paused') { renderPreview(true); return; }
    setMobileView('editor');
    $('#chat-input').focus();
  });
  function renderPreview(force = false) {
    const review=templateReview();
    if(review){showPreviewPlaceholder();scheduleCanvasSize();return renderTemplateReview(review,force);}
    clearTemplateReview();
    // Cover only the untouched starter, never customer code or a selected template.
    const empty = !project.codeDraft && (project.files ? Chat.requestMode(project,W.emptyFiles()) === 'create' : project.design?.kind === 'blank');
    showPreviewPlaceholder(empty ? 'empty' : '');
    const signature = project.id + JSON.stringify(project.files || project.design);
    scheduleCanvasSize();
    if (signature===previewSignature && buildPromise) return buildPromise;
    if (signature===compiledSignature && !force) return Promise.resolve(true);
    buildController?.abort();
    const sequence=++buildSequence;
    previewSignature=signature;
    const files=structuredClone(project.files || C.createFiles(project.design));
    const title=project.title;
    buildController=new AbortController();
    const signal=buildController.signal;
    $('#preview-status').textContent=P.isReact(files)?'Building React…':'Loading preview';
    buildPromise=(async()=>{
      await Promise.resolve();
      try {
        let html,trusted=false;
        if(P.isReact(files)) {
          const response=await fetch('/api/build',{method:'POST',headers:{'Content-Type':'application/json',...await A.headers()},body:JSON.stringify({files}),signal});
          const result=await response.json();
          if(!response.ok)throw new Error(result.error?.message || 'The React build failed.');
          html=result.html;trusted=result.storePreview===true;
        } else html=C.buildDocument(files,globalThis.DraftmangoImages);
        if(sequence!==buildSequence || signal.aborted)return false;
        previewHtml=html;compiledSignature=signature;storePreviewTrusted=trusted;
        storePreviewPort?.close();storePreviewPort=null;previewToken=crypto.randomUUID();consoleLines=[];renderConsole();
        $('#website-frame').srcdoc=previewDocument(html,previewToken);
        $('#website-frame').title=`${title} website preview`;
        return true;
      } catch(error) {
        if(sequence!==buildSequence || signal.aborted)return false;
        $('#preview-status').textContent='Build failed · last successful preview kept';
        consoleLines=[{level:'error',text:error.message}];renderConsole();
        if(diagnostic!=='console')setDiagnostic('console');
        return false;
      } finally {if(sequence===buildSequence)buildPromise=null;}
    })();
    return buildPromise;
  }
  function previewDocument(html, token) {
    const localAssets = ['127.0.0.1','localhost'].includes(location.hostname);
    if(localAssets){
      const rewrite=value=>value.replaceAll('https://draftmango.com/framo/',location.origin+'/framo/');
      html=rewrite(html).replace(/data:(text\/javascript|text\/css);base64,([A-Za-z0-9+/=]+)/g,(_all,type,data)=>{
        try{return 'data:'+type+';base64,'+btoa(rewrite(atob(data)))}catch{return _all}
      });
    }
    // Alpine's supplied interactions evaluate local expressions. The opaque-origin
    // iframe still forbids parent access, connections, forms and remote scripts.
    const templateRuntime=!!project.files?.['src/framo/vendor.txt'];
    const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https: ${localAssets?location.origin:''}; style-src 'unsafe-inline' data: https: ${localAssets?location.origin:''}; font-src data: https: ${localAssets?location.origin:''}; script-src 'unsafe-inline' data: ${templateRuntime?"'unsafe-eval'":''}; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
    const bridge = `<script>(()=>{const token=${JSON.stringify(token)};window.__draftmangoPreviewNonce=token;const send=(level,text)=>parent.postMessage({draftmango:token,level,text:String(text).slice(0,2000)},'*');for(const level of ['log','info','warn','error']){const original=console[level];console[level]=(...args)=>{send(level,args.map(value=>{try{return typeof value==='string'?value:JSON.stringify(value)}catch{return String(value)}}).join(' '));original.apply(console,args)}}addEventListener('error',event=>send('error',event.message+' (line '+event.lineno+')'));addEventListener('unhandledrejection',event=>send('error',event.reason?.message||event.reason));addEventListener('load',()=>send('ready','Preview ready'));document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link&&!link.hash.startsWith('#page=')){event.preventDefault();const target=document.getElementById(decodeURIComponent(link.hash.slice(1)));target?.scrollIntoView({behavior:'smooth'})}})})()<\/script>`;
    const start = policy + bridge;
    return /<head\b[^>]*>/i.test(html) ? html.replace(/<head\b[^>]*>/i, match => match + start) : start + html;
  }
  function renderConsole() {
    const output = $('#console-output');
    output.replaceChildren();
    if (!consoleLines.length) output.innerHTML = '<div class="diagnostic-empty"><h3>No console messages</h3><p>Messages from your website will appear here when you run the preview.</p></div>';
    consoleLines.forEach(entry => {
      const line = document.createElement('div');
      line.className = 'console-line';
      line.dataset.level = entry.level;
      const level = document.createElement('span'); level.className = 'console-level'; level.textContent = {error:'Error',warn:'Warning',info:'Info',log:'Log'}[entry.level] || 'Log';
      const message = document.createElement('span'); message.className = 'console-message'; message.textContent = entry.text;
      line.append(level, message);
      output.append(line);
    });
    $('#console-count').textContent = consoleLines.length;
  }
  window.addEventListener('message', event => {
    if (event.source !== $('#website-frame').contentWindow) return;
    if(event.data?.type==='draftmango:store-preview-ready'){if(event.data.draftmango!==previewToken||!storePreviewTrusted||!event.ports[0])return;storePreviewPort?.close();storePreviewPort=event.ports[0];sendStorePreview(storeNavigation);storeNavigation='';return;}
    if(event.data?.draftmango !== previewToken) return;
    if (event.data.level === 'ready') { $('#preview-status').innerHTML = '<i></i>Preview ready'; return; }
    if (!['log', 'info', 'warn', 'error'].includes(event.data.level) || typeof event.data.text !== 'string') return;
    consoleLines.push({ level: event.data.level, text: event.data.text.slice(0, 2000) });
    consoleLines = consoleLines.slice(-100);
    renderConsole();
  });

  function syncSource() {
    const candidate = project.codeDraft || project.files || C.createFiles(project.design);
    if (!Object.hasOwn(candidate, selectedFile)) selectedFile = 'index.html';
    openFiles = openFiles.filter(name => Object.hasOwn(candidate, name)); if (!openFiles.includes(selectedFile)) openFiles.push(selectedFile);
    const changed = sourceProject !== project.id || JSON.stringify(candidate) !== JSON.stringify(workingFiles);
    if (sourceProject !== project.id) { selectedFile = P.isReact(candidate) ? 'src/App.jsx' : 'index.html'; if(!openFiles.includes(selectedFile))openFiles.push(selectedFile); $('#file-search').value = ''; }
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
      (filter ? Object.keys(workingFiles).sort() : openFiles).filter(name => Object.hasOwn(workingFiles,name) && (!filter || name.toLowerCase().includes(query) || ($('#search-contents')?.checked && workingFiles[name].toLowerCase().includes(query)))).forEach(name => {
        const button = document.createElement('button');
        const dirty = project.codeDraft && project.codeDraft[name] !== (project.files || C.createFiles(project.design))[name];
        button.type = 'button'; button.dataset.file = name;
        button.className = (name === selectedFile ? 'is-active' : '') + (dirty ? ' is-dirty' : '');
        button.setAttribute('aria-pressed', String(name === selectedFile));
        button.setAttribute('aria-label', `Open ${name}`); button.title = name;
        const extension = name.split('.').at(-1).toLowerCase();
        const symbol = {html:'<>',css:'#',js:'JS',mjs:'JS',cjs:'JS',jsx:'JSX',ts:'TS',tsx:'TSX',json:'{}',md:'MD',svg:'SVG',txt:'TXT'}[extension] || 'FILE';
        const badge = document.createElement('span'); badge.className = 'file-symbol'; badge.setAttribute('aria-hidden','true'); badge.textContent = symbol;
        const label = document.createElement('span'); label.className = 'file-name'; label.textContent = name.split('/').at(-1);
        button.append(badge,label);
        button.addEventListener('click', () => {
          selectedFile = name; if (!openFiles.includes(name)) openFiles.push(name); renderCode();
          if (compactExplorer()) { closeFileExplorer(); $('#source-input').focus({preventScroll:true}); }
        });
        button.addEventListener('contextmenu', event => { event.preventDefault(); window.dispatchEvent(new CustomEvent('draftmango:file-menu', {detail:{name,anchor:button}})); });
        if (filter) list.append(button);
        else {
          const tab = document.createElement('div'); tab.className = 'file-tab' + (name === selectedFile ? ' is-active' : '') + (dirty ? ' is-dirty' : '');
          button.classList.add('file-tab-open');
          const close = document.createElement('button'); close.type = 'button'; close.dataset.closeFile = name; close.className = 'ws-tab-close'; close.innerHTML = icon('close'); close.setAttribute('aria-label','Close ' + name); close.title = 'Close ' + name;
          close.addEventListener('click', () => {
            openFiles = openFiles.filter(f => f !== name);
            if (selectedFile === name) selectedFile = openFiles.at(-1) || 'index.html';
            if (!openFiles.includes(selectedFile)) openFiles.push(selectedFile);
            renderCode(); $('#file-tabs .is-active .file-tab-open')?.focus({preventScroll:true});
          });
          tab.append(button,close); list.append(tab);
        }
      });
    }
    $('#no-files').hidden = !!$('#file-list').children.length;
    window.dispatchEvent(new Event('draftmango:files-render'));
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
    $('#source-path').title = selectedFile;
    $('#editor-mode').textContent = {jsx:'React JSX',tsx:'React TSX',html:'HTML',css:'CSS',js:'JavaScript',mjs:'JavaScript',cjs:'JavaScript',ts:'TypeScript',json:'JSON',md:'Markdown',svg:'SVG',txt:'Plain text',csv:'CSV'}[selectedFile.split('.').at(-1).toLowerCase()] || 'Plain text';
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
  function compactExplorer() { return matchMedia('(max-width:760px)').matches || view === 'split'; }
  function syncExplorerToggle() {
    const code = $('#code-view'), open = compactExplorer() ? code.classList.contains('files-open') : !code.classList.contains('files-collapsed');
    $('#toggle-files').setAttribute('aria-expanded',String(open));
    $('#toggle-files').title = open ? 'Hide file explorer' : 'Show file explorer';
  }
  function closeFileExplorer() { $('#code-view').classList.remove('files-open'); syncExplorerToggle(); }
  $('#toggle-files').addEventListener('click', () => {
    const code = $('#code-view');
    if (compactExplorer()) { code.classList.toggle('files-open'); code.classList.remove('files-collapsed'); }
    else code.classList.toggle('files-collapsed');
    syncExplorerToggle();
  });
  $('#file-explorer-scrim').addEventListener('click',closeFileExplorer);
  $('#code-view').addEventListener('keydown',event=>{if(event.key==='Escape' && compactExplorer() && $('#code-view').classList.contains('files-open')){closeFileExplorer();$('#toggle-files').focus();}});
  matchMedia('(max-width:760px)').addEventListener('change',syncExplorerToggle);
  syncExplorerToggle();
  function applyCode(run = true) {
    clearTimeout(codeSaveTimer);
    if (project.codeDraft) {
      project = M.commitFiles(project, project.codeDraft);
      save(); render();
    }
    if (run) { renderPreview(true).then(ok=>{if(ok){W.recordActivity('build',project.id);announce('Your preview is up to date.');}}); renderChecks(); }
  }
  $('#run-preview').addEventListener('click', () => applyCode());
  $('#run-pending').addEventListener('click', () => applyCode());
  window.addEventListener('pagehide', flushCodeDraft);
  window.addEventListener('beforeunload', event => {
    clearTimeout(codeSaveTimer); save();
    if (saveFailed) { event.preventDefault(); event.returnValue = ''; }
  });
  function renderChecks() {
    const output = $('#check-output');
    const results = C.checkFiles(workingFiles);
    const warnings = results.filter(result => !result.ok).length;
    const reactFiles = P.isReact(workingFiles);
    const checkDescription = reactFiles ? 'Checks required React files. Run preview to check compilation.' : 'Checks for missing files, links and page structure. Runtime errors appear in Console.';
    const reactLabels = { 'src/App.jsx': 'App component', 'src/main.jsx': 'Entry point', 'src/styles.css': 'Stylesheet' };
    output.innerHTML = `<div class="diagnostic-summary"><h3>${warnings ? warnings + (warnings === 1 ? ' item needs attention' : ' items need attention') : 'Source checks passed'}</h3><p>${checkDescription}</p></div>`;
    results.forEach(result => {
      const row = document.createElement('div');
      row.className = 'check-row' + (result.ok ? ' is-ok' : ' is-warning');
      row.innerHTML = icon(result.ok ? 'check' : 'info');
      const label = document.createElement('span'); label.textContent = reactFiles && reactLabels[result.file] ? reactLabels[result.file] + (result.ok ? ' is present' : ' is missing') : result.label;
      const file = document.createElement('small'); file.textContent = result.file;
      row.append(label, file); output.append(row);
    });
    $('#check-count').textContent = warnings;
    $('#check-count').classList.toggle('has-issues', warnings > 0);
  }
  function setDiagnostic(next) {
    diagnostic = diagnostic === next ? '' : next;
    $('#diagnostic-content').hidden = !diagnostic;
    $('#close-diagnostics').hidden = !diagnostic;
    $('#console-output').hidden = diagnostic !== 'console';
    $('#check-output').hidden = diagnostic !== 'checks';
    const testOutput = $('#test-output'); if (testOutput) testOutput.hidden = diagnostic !== 'tests';
    $$('[data-diagnostic]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.diagnostic === diagnostic)));
    if (diagnostic === 'checks') renderChecks();
    if (diagnostic === 'tests') window.dispatchEvent(new Event('draftmango:show-tests'));
    scheduleCanvasSize();
  }
  $$('[data-diagnostic]').forEach(button => button.addEventListener('click', () => setDiagnostic(button.dataset.diagnostic)));
  $('#close-diagnostics').addEventListener('click', () => { const active = $('[data-diagnostic][aria-expanded="true"]'); setDiagnostic(''); active?.focus({preventScroll:true}); });
  function renderHistory() {
    const list = $('#history-list');
    list.replaceChildren();
    [...project.history].reverse().forEach((entry, reversed) => {
      const index = project.history.length - 1 - reversed;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-entry' + (index === project.cursor ? ' is-active' : '');
      button.setAttribute('aria-label', `${index === project.cursor ? 'Current draft' : 'Restore draft'}: ${entry.label}`);
      button.setAttribute('aria-pressed', String(index === project.cursor));
      const swatch = document.createElement('span');
      swatch.className = 'history-index';
      swatch.textContent = String(index + 1);
      swatch.setAttribute('aria-hidden', 'true');
      const words = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = entry.label;
      const caption = document.createElement('small');
      caption.textContent = `Version ${index + 1} · ${calendarDate(entry.at)} · ${stamp(entry.at)}`;
      words.append(title, caption);
      const state = document.createElement('span');
      state.className = 'history-state';
      state.textContent = index === project.cursor ? 'Current' : 'Restore';
      state.setAttribute('aria-hidden', 'true');
      button.append(swatch, words, state);
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
    document.title = `${project.title} | Draftmango`;
    $('#undo').disabled = project.cursor === 0;
    $('#redo').disabled = project.cursor >= project.history.length - 1;
    renderConversation(); renderHistory(); renderSidebar(); syncSource(); renderPreview(); renderAI();
    window.dispatchEvent(new Event('draftmango:editor-render'));
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
    return JSON.stringify([item.design, item.files || null, item.codeDraft || null, item.designBrief || null, item.cursor, item.workspace?.builder || null]);
  }
  function renderAI() {
    const busy = !!aiJob;
    $('#ai-feedback').hidden = busy || !aiFeedback.text;
    $('#ai-feedback').dataset.state = aiFeedback.state;
    $('#ai-message').textContent = aiFeedback.text;
    const sendButton=$('#chat-form .send-button');
    sendButton.disabled=!busy&&!$('#chat-input').value.trim();sendButton.type=busy?'button':'submit';sendButton.dataset.busy=String(busy);
    sendButton.setAttribute('aria-label',busy?'Stop generation':'Send message');
    sendButton.onclick=event=>{if(aiJob){event.preventDefault();stopAI();}};
    renderBuilderPrompt();
    renderAgentProgress();
    $('#retry-ai').hidden = busy || !aiFeedback.retry;
    $('#generate-site').hidden = busy || project.ai?.state !== 'pending' || aiFeedback.retry || project.messages.at(-1)?.role === 'assistant';

    $('#chat-form').setAttribute('aria-busy', String(busy));
    $$('[data-request]').forEach(button => { button.disabled = busy; });
    $('#source-input').readOnly = busy;
    $('#history-list').inert = busy;
    $('#undo').disabled = busy || (!project.codeDraft && project.cursor === 0);
    $('#redo').disabled = busy || !!project.codeDraft || project.cursor >= project.history.length - 1;
    const picker = $('#ai-model-select'); if (picker?.options.length && picker.options[0].value) picker.disabled = busy;
    const name = aiStatus?.name || 'AI';
    $$('[data-ai-name]').forEach(element => { element.textContent = name; });
    $$('[data-ai-service]').forEach(element => { element.textContent = aiStatus?.service || 'your configured provider'; });
    $('#ai-key-variable').textContent = aiStatus?.keyVariable || 'OPENAI_API_KEY';
    $('#ai-model-variable').textContent = aiStatus?.modelVariable || 'OPENAI_MODEL';
  }
  const storeStates=new Map(),storeLoads=new Map();
  let storeNavigation='';
  window.addEventListener('draftmango:session-ended',()=>{storeStates.clear();storeNavigation='';storePreviewPort?.close();storePreviewPort=null;});
  async function sendStorePreview(page=''){
    const captured=project,token=previewToken,port=storePreviewPort,account=A.user?.id;
    if(!port||!storePreviewTrusted||compiledSignature!==captured.id+JSON.stringify(captured.files||captured.design)||!globalThis.DraftmangoStoreBuilder?.supported(captured)||A.preview)return;
    try{const catalogue=await globalThis.DraftmangoStoreBuilder.catalogue(captured);
      if(project.id===captured.id&&previewToken===token&&A.user?.id===account&&storePreviewPort===port&&catalogue)port.postMessage({type:'draftmango:store-preview',catalogue,page});
    }catch{/* Owner handoff reports unavailable store services; the preview remains isolated. */}
  }
  async function loadStore(prepare=false){
    const captured=project,id=captured.id,helper=globalThis.DraftmangoStoreBuilder;
    if(!helper?.supported(captured)||storeLoads.has(id))return;
    const task={},account=A.user?.id;storeLoads.set(id,task);
    storeStates.set(id,{busy:true,message:prepare?'Saving the confirmed build and preparing your draft catalogue…':'Checking your store setup…'});renderBuilderPrompt();
    try{const value=await (prepare?helper.prepare(captured):helper.status(captured));
      if(A.user?.id!==account)return;
      storeStates.set(id,value);if(project.id===id)sendStorePreview();
    }catch(error){storeStates.set(id,{message:error.message});}
    finally{storeLoads.delete(id);if(project.id===id)renderBuilderPrompt();}
  }
  window.addEventListener('focus',()=>{if(!aiJob&&globalThis.DraftmangoStoreBuilder?.supported(project))loadStore();});
  function renderBuilderPrompt(){
    let root=$('#builder-prompt');
    if(!root){root=document.createElement('div');root.id='builder-prompt';root.className='builder-prompt';$('#conversation').append(root);}
    if(root.dataset.project!==project.id){delete root.dataset.signature;root.dataset.project=project.id;}
    globalThis.DraftmangoBuilderPrompts.render(root,project.workspace?.builder,{
      answer:text=>requestChange(text),
      build:()=>requestChange('Build the website using this agreed plan.',{mode:'create',builderAction:'build'}),
      revise:()=>{$('#chat-input').value='Change the plan: ';$('#chat-input').dispatchEvent(new Event('input',{bubbles:true}));$('#chat-input').focus();},
      prepare:()=>loadStore(true),
      preview:()=>{storeNavigation='shop';document.querySelector('[data-view="preview"]').click();setMobileView('preview');sendStorePreview('shop');},
      publish:()=>globalThis.DraftmangoPublishing?.open()
    },!!aiJob||!!storeStates.get(project.id)?.busy,storeStates.get(project.id));
    if(globalThis.DraftmangoStoreBuilder?.supported(project)&&!storeStates.has(project.id))queueMicrotask(()=>loadStore());
    const isQuestion=['discovery','review'].includes(B.read(project.workspace?.builder)?.phase);
    root.classList.toggle('is-question',isQuestion);
    if(isQuestion){const dock=$('#panel-build .composer-area');if(root.parentElement!==dock)dock.prepend(root);}
    else{const log=$('#conversation');if(root.parentElement!==log||(root!==log.lastElementChild&&!$('#agent-progress')))log.append(root);}
  }
  function renderAgentProgress() {
    let pending=$('#agent-progress');
    if(!aiJob||aiJob.complete){pending?.remove();return;}
    const log=$('#conversation'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<90;
    if(!pending){
      pending=document.createElement('div');pending.id='agent-progress';pending.className='message message-assistant agent-progress';
      pending.innerHTML='<div class="agent-plan message-content"></div><div class="agent-live"><span class="agent-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="agent-phase" role="status" aria-live="polite"></span><span class="agent-time" aria-hidden="true"></span></div>';
      const updates=document.createElement('ul');updates.className='agent-updates';pending.prepend(updates);log.append(pending);
    }
    const updates=pending.querySelector('.agent-updates');
    if(updates.dataset.count!==String(aiJob.updates.length)){updates.replaceChildren();for(const text of aiJob.updates.slice(0,-1).slice(-4)){const li=document.createElement('li');li.textContent=text;updates.append(li);}updates.dataset.count=String(aiJob.updates.length);}
    const plan=pending.querySelector('.agent-plan');
    if(plan.dataset.text!==aiJob.plan){Chat.render(plan,aiJob.plan);plan.dataset.text=aiJob.plan;}
    plan.hidden=!aiJob.plan;
    const label=aiJob.plan&&aiJob.phase==='planning'?'Building the website':Chat.labels[aiJob.phase];
    const status=pending.querySelector('.agent-phase');if(status.textContent!==label)status.textContent=label;
    pending.querySelector('.agent-time').textContent=aiJob.elapsedSeconds>=10?Chat.duration(aiJob.elapsedSeconds*1000):'';
    if(atBottom)requestAnimationFrame(()=>{log.scrollTop=log.scrollHeight;});
  }
  const selectedModel = () => project.workspace?.build?.modelId || '';
  let connectionCheck = 0;
  async function checkAI() {
    const check = ++connectionCheck;
    try {
      const response = await fetch('/api/ai/status' + (selectedModel() ? '?model=' + encodeURIComponent(selectedModel()) : ''), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Setup unavailable');
      const status = await response.json();
      if (check !== connectionCheck) return;
      aiStatus = status;
      $('#ai-setup-status').textContent = aiStatus.configured
        ? 'A local API key is configured. Model: ' + aiStatus.model + '. The next generation will verify access.'
        : 'Add your API key to start generating.';
    } catch {
      if (check !== connectionCheck) return;
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
  async function requestChange(request, { mode, retry = false, builderAction = 'respond' } = {}) {
    const text = request.trim();
    if (!text || aiJob) return false;
    applyCode(false);
    mode = mode || Chat.requestMode(project,W.emptyFiles());
    if(project.files?.['TEMPLATE.md']) mode='edit';
    if (!retry && !(project.messages.at(-1)?.role === 'user' && project.messages.at(-1)?.text === text)) addMessage('user', text);
    const workflow=B.read(project.workspace?.builder) || (mode==='create'?B.initial():null);
    lastAIRequest = { text, mode, builderAction };
    const job = { controller: new AbortController(), projectId: project.id, revision: fileRevision(project), startedAt:Date.now(), phase:'connecting', phases:['connecting'], plan:'', updates:[], elapsedSeconds:0 };
    aiJob = job;
    aiFeedback = { text:'Thinking…', state:'busy', retry:false };
    const parentContext = W.get(project.workspace?.parentId);
    const payload = {
      mode, interaction:'conversation', prompt: project.files?.['TEMPLATE.md'] ? text+'\n\nPreserve the supplied Framo design, page routing and shared styles. Personalise the existing React pages; do not replace them with a new generic design.' : text,
      ...(workflow ? {builder:workflow,builderAction} : {}),
      ...(project.workspace?.templateId ? {templateId:project.workspace.templateId} : {}),
      ...(selectedModel() ? {modelId:selectedModel()} : {}),
      references: project.workspace?.attachments || [],
      projectContext: [project.prompt ? 'Original brief: '+project.prompt : '', parentContext?.workspace?.brief, parentContext?.workspace?.instructions, project.workspace?.notes].filter(Boolean).join('\n\n').slice(0,12000),
      ...(mode === 'edit' ? { files: structuredClone(project.files || C.createFiles(project.design)), designBrief: project.designBrief || null } : { creationPreferences: project.creationPreferences || [] }),
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
        if (aiJob !== job) return false;
        if (event.type === 'start' && Number.isFinite(event.timeoutSeconds) && event.timeoutSeconds > 0 && event.timeoutSeconds <= 1800) armDeadline(event.timeoutSeconds);
        if (event.type === 'progress') {
          job.phase = Object.hasOwn(Chat.labels,event.phase) ? event.phase : job.phase;
          if (!job.phases.includes(job.phase)) job.phases.push(job.phase);
          if (typeof event.message === 'string') {job.plan=event.message.slice(0,3000);if(job.updates.at(-1)!==job.plan)job.updates.push(job.plan);}
          job.elapsedSeconds=Math.max(0,Math.floor(event.elapsedSeconds||0));
          aiFeedback = {text:Chat.labels[job.phase]+'…', state:'busy', retry:false};
          renderAI();
        }
      });
      if (aiJob !== job || project.id !== job.projectId) return false;
      // Another tab or an intervening edit must never be overwritten by a late reply.
      let latest;
      try { latest = M.readStore(localStorage.getItem(storageKey))?.projects.find(item => item.id === project.id); } catch { /* Current session remains usable. */ }
      if (fileRevision(project) !== job.revision || (latest && fileRevision(latest) !== job.revision)) {
        if (latest) { project = latest; conversationProject = ''; }
        throw new Error('This draft changed while the AI was working. Your newer edits are kept. Try again to use the latest files.');
      }
      const nextBuilder=result.builder?B.read(result.builder):null;
      if(result.builder&&!nextBuilder)throw new Error('The website plan could not be read. Your draft is unchanged.');
      if (result.action === 'update' && M.readFiles(result.files)) {
        project = M.commitFiles(project, {...(builderAction==='build'?{}:project.files || {}), ...result.files}, (mode === 'create' ? 'Created with ' : 'Edited with ') + (result.name || 'AI'), result.designBrief || project.designBrief);
        if (mode === 'create' && result.title) project = { ...project, title: result.title.slice(0,60) };
        project = { ...project, ai: { state: 'ready' } };
      } else if (result.action !== 'reply') { throw new Error('The AI returned invalid files. Your current draft is unchanged.'); }
      if(nextBuilder){project.workspace={...project.workspace,builder:nextBuilder,...(result.designProcess?.templateId?{templateId:result.designProcess.templateId,templateVersion:result.designProcess.templateVersion}:{})};}
      job.complete=true;
      addMessage('assistant', result.message, { changed: result.action === 'update', activity:{durationMs:Date.now()-job.startedAt,phases:job.phases,plan:job.plan,updates:job.updates.slice(-20)} });
      W.recordActivity('ai', project.id); if (W.preferences.sound) W.chime();
      project.workspace = {...project.workspace, queuedPrompt:''};
      aiStatus = { configured: true, provider:result.provider, name:result.name, service:result.service, keyVariable:result.keyVariable, modelVariable:result.modelVariable, model:result.model, timeoutSeconds:result.timeoutSeconds };
      aiFeedback = { text: '', state: '', retry: false };
      lastAIRequest = null;
      save(); render();
      if(result.action === 'update')announce('Your website is updated. The previous draft is in History.');
      return true;
    } catch (error) {
      if (aiJob !== job) return false;
      if (error.code === 'missing_key' || error.code === 'invalid_key') aiStatus = {...aiStatus, configured:false};
      aiFeedback = {
        text: connectionLost ? 'The connection to the local server was interrupted. Your draft is unchanged. Try again.' : clientTimedOut ? 'The AI did not finish within the generation time limit. Your draft is unchanged. You can try again.' : error.name === 'AbortError' ? 'Generation stopped. Your website is unchanged.' : error.message || 'Could not connect. Please try again.',
        state: 'error', retry: true
      };
      return false;
    } finally {
      clearTimeout(timer);
      clearTimeout(idleTimer);
      if (aiJob === job) { aiJob = null; render(); renderAI(); }
      if(job.complete&&builderAction==='build'&&project.id===job.projectId&&globalThis.DraftmangoStoreBuilder?.supported(project)){
        // Finish the generation job first: stopping a build never hides a committed store mutation.
        const deadline=Date.now()+20000;
        const wait=()=>project.id!==job.projectId||Date.now()>deadline?undefined:storeLoads.has(job.projectId)?setTimeout(wait,100):loadStore(true);
        wait();
      }
    }
  }

  $('#retry-ai').addEventListener('click', () => { if (lastAIRequest) requestChange(lastAIRequest.text, {mode: lastAIRequest.mode, builderAction:lastAIRequest.builderAction, retry:true}); });
  $('#generate-site').addEventListener('click', () => requestChange(project.prompt, {mode:'create'}));
  $('#check-ai').addEventListener('click', checkAI);
  window.addEventListener('pagehide', () => stopAI(true));


  $$('button[data-mobile-view]').forEach(button => button.addEventListener('click', () => setMobileView(button.dataset.mobileView)));
  $('#chat-form').addEventListener('submit', event => {
    event.preventDefault();
    if(aiJob){stopAI();return;}
    const input = $('#chat-input');
    if (!input.value.trim()) { input.setCustomValidity('Write a message to continue.'); input.reportValidity(); return; }
    requestChange(input.value);
  });
  $('#chat-input').addEventListener('input', event => {
    event.target.setCustomValidity('');
    const field=event.target,style=getComputedStyle(field);
    field.style.height = 'auto';
    field.style.height = `${Math.min(parseFloat(style.maxHeight)||280, Math.max(parseFloat(style.minHeight)||88, field.scrollHeight))}px`;
    $('#chat-form .send-button').disabled=!aiJob&&!field.value.trim();
  });
  $('#chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if(!aiJob)$('#chat-form').requestSubmit(); }
  });
  $$('[data-request]').forEach(button => button.addEventListener('click', () => requestChange(button.dataset.request)));

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
    closeFileExplorer();
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
    $('#zoom-select').dispatchEvent(new Event('change'));
    $('#canvas-stage').scrollLeft = 0;
    scheduleCanvasSize();
  }
  $$('[data-device]').forEach(button => button.addEventListener('click', () => updateDevice(button.dataset.device)));
  $('#zoom-select').addEventListener('change', scheduleCanvasSize);
  $('#refresh-preview').addEventListener('click', () => { renderPreview(true); announce('Preview refreshed.'); });
  new ResizeObserver(scheduleCanvasSize).observe($('#canvas-stage'));

  async function documentLink(download = false) {
    const review=templateReview();
    if(review){
      if(download)announce('Approve and build your website before exporting it.');
      else window.open('/templates/preview?template='+encodeURIComponent(review.templateId),'_blank','noopener');
      return;
    }
    const tab=download?null:window.open('about:blank','_blank');
    if(tab)tab.opener=null;
    applyCode(false);
    if(!await renderPreview()){tab?.close();announce('Fix the build errors before exporting this version.');return;}
    // Keep a separate-tab preview sandboxed too; exported files remain standalone.
    const content = download ? previewHtml : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${M.escapeHtml(project.title)} | Preview</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}</style></head><body><iframe sandbox="allow-scripts" referrerpolicy="no-referrer" title="Website preview" srcdoc="${M.escapeHtml(previewDocument(previewHtml, 'standalone'))}"></iframe></body></html>`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    if (download) link.download = 'draftmango-' + (project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-website') + '.html';
    else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    document.body.append(link);
    if(!download && tab)tab.location.href=url;else link.click();
    if(download)announce('Your HTML download includes the images, too.');
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  $('#open-preview').addEventListener('click', () => documentLink());
  $('#export-site').addEventListener('click', () => documentLink(true));
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
  $('#help-button')?.addEventListener('click', () => $('#help-dialog').showModal());
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
    save, render, applyCode, setMobileView, updateDevice, scheduleCanvasSize,
    showAISetup(){ $('#ai-dialog').showModal(); checkAI(); },
    showHistory(){ renderHistory(); $('#history-dialog').showModal(); },
    selectModel(modelId){if(aiJob)return;project.workspace={...project.workspace,build:{...project.workspace?.build,modelId}};aiStatus=null;save();render();checkAI();},
    selectFile(name){if(Object.hasOwn(workingFiles,name)){selectedFile=name;if(!openFiles.includes(name))openFiles.push(name);renderCode();}},
    setFiles(files,label='Updated source files'){if(aiJob)throw new Error('Wait for generation to finish before changing files.');project=M.commitFiles(project,files,label);save();render();},
    updateMeta(patch){project.workspace={...project.workspace,...patch};save();window.dispatchEvent(new Event('draftmango:editor-render'));},
    syncMeta(){const latest=W.get(project.id);if(latest){project={...project,title:latest.title,workspace:latest.workspace};render();}},
    clearConsole(){consoleLines=[];renderConsole();},
    stopPreview(){ clearTemplateReview();storePreviewPort?.close();storePreviewPort=null;buildSequence++;buildController?.abort();buildPromise=null;compiledSignature='';previewToken='';$('#website-frame').srcdoc='';previewSignature='';$('#preview-status').textContent='Preview paused';showPreviewPlaceholder('paused');},
    exportHTML(){documentLink(true);}, openPreview(){documentLink();}, runRequest:requestChange,
    diagnostic: setDiagnostic, consoleLines:()=>consoleLines
  };
  window.dispatchEvent(new Event('draftmango:editor-ready'));
  new ResizeObserver(()=>{paintLineNumbers();syncCodeScroll();}).observe($('#source-scroll'));
  if(starting.get('view')) document.querySelector('.view-tabs [data-view="'+(['code','split'].includes(starting.get('view'))?starting.get('view'):'preview')+'"]').click();
  if(starting.get('file')) globalThis.DraftmangoEditor.selectFile(starting.get('file'));
  const queued = project.workspace?.queuedPrompt;
  const incomingProjectId = project.id;
  checkAI().then(status => {
    if (!status?.configured || project.id !== incomingProjectId || aiJob || lastAIRequest) return;
    if (queued) {project.workspace={...project.workspace,queuedPrompt:''};save();requestChange(queued);}
    else if (initialIdea && project.ai?.state === 'pending') requestChange(project.prompt, {mode:'create'});
  });
})();
