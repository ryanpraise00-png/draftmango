(async()=>{
  'use strict';
  const A=globalThis.DraftmangoAccounts;if(!await A.protect())return;
  const W=globalThis.DraftmangoWorkspace,{e,icon}=W;await W.init();
  const main=document.querySelector('#main'),sidebar=document.querySelector('#sidebar'),scrim=document.querySelector('#sidebar-scrim');
  let voiceInput=null,references=[],notes='',build={level:'standard',starter:W.preferences.starter,color:W.preferences.color},current='home',projectFilter='',projectSort='updated',projectScope='active',chatFilter='',chatScope='active';
  const date=value=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  const relativeTime=new Intl.RelativeTimeFormat('en',{numeric:'always'});
  function editedTime(value,prefix='Edited'){
    const edited=new Date(value);
    if(!Number.isFinite(edited.getTime()))return prefix+' recently';
    const seconds=Math.max(0,Math.floor((Date.now()-edited.getTime())/1000));
    const label=seconds<60?'just now':seconds<3600?relativeTime.format(-Math.floor(seconds/60),'minute'):seconds<86400?relativeTime.format(-Math.floor(seconds/3600),'hour'):seconds<604800?relativeTime.format(-Math.floor(seconds/86400),'day'):'on '+date(edited);
    return `<time datetime="${edited.toISOString()}" title="${e(edited.toLocaleString())}">${e(prefix)} ${e(label)}</time>`;
  }
  const mobileNavigation=matchMedia('(max-width:760px)'),app=document.querySelector('.ws-app'),navTrigger=document.querySelector('#open-sidebar');
  navTrigger.setAttribute('aria-controls','sidebar');
  function closeNav(restoreFocus=false){
    const wasOpen=sidebar.classList.contains('is-open');
    W.closeMenu();sidebar.classList.remove('is-open');scrim.hidden=true;app.inert=false;
    sidebar.removeAttribute('role');sidebar.removeAttribute('aria-modal');
    navTrigger.setAttribute('aria-expanded','false');sidebar.inert=mobileNavigation.matches;
    if(wasOpen&&restoreFocus)navTrigger.focus({preventScroll:true});
  }
  function openNav(){
    if(!mobileNavigation.matches)return;
    sidebar.inert=false;sidebar.classList.add('is-open');scrim.hidden=false;
    sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');
    navTrigger.setAttribute('aria-expanded','true');app.inert=true;
    sidebar.querySelector('.ws-nav-close').focus({preventScroll:true});
  }
  navTrigger.onclick=openNav;scrim.onclick=()=>closeNav(true);
  document.addEventListener('keydown',event=>{
    if(!mobileNavigation.matches||!sidebar.classList.contains('is-open')||event.defaultPrevented)return;
    if(event.key==='Escape'){event.preventDefault();closeNav(true);return;}
    if(event.key!=='Tab'||document.querySelector('.ws-menu[role="menu"]'))return;
    const controls=[...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(node=>node.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  mobileNavigation.addEventListener('change',()=>{
    const active=document.activeElement,wasOpen=sidebar.classList.contains('is-open');closeNav();
    if(mobileNavigation.matches&&sidebar.contains(active))navTrigger.focus({preventScroll:true});
    else if(!mobileNavigation.matches&&(wasOpen||active===navTrigger))sidebar.querySelector('.ws-sidebar-collapse')?.focus({preventScroll:true});
  });
  sidebar.addEventListener('draftmango:sidebar-navigate',()=>{closeNav();main.focus({preventScroll:true});});
  sidebar.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const url=new URL(link.href);
    if(url.pathname===location.pathname&&url.hash===location.hash){event.preventDefault();route();}
  });
  function nav(){
    W.sidebar(sidebar,current);sidebar.querySelector('.ws-nav-close').onclick=()=>closeNav(true);
    if(mobileNavigation.matches&&!sidebar.classList.contains('is-open'))sidebar.inert=true;
  }
  function header(title,copy,actions='',eyebrow=''){return `<header class="ws-page-header"><div>${eyebrow?`<p class="ws-eyebrow">${eyebrow}</p>`:''}<h1>${title}</h1><p>${copy}</p></div>${actions}</header>`;}
  function list(items,kind='project',{recent=false,conversation=false}={}){
    const details=p=>{
      if(conversation){
        const context=W.meta(p).parentId?W.get(W.meta(p).parentId)?.title||'Project':'Standalone chat';
        return `<small class="ws-chat-meta"><span class="ws-chat-context" title="${e(context)}">${e(context)}</span><span class="ws-chat-meta-separator" aria-hidden="true">·</span>${editedTime(p.updatedAt,'Updated')}</small>`;
      }
      return `<small>${recent?editedTime(p.updatedAt):`${kind==='chat'?(W.meta(p).parentId?e(W.get(W.meta(p).parentId)?.title||'Project'):'Standalone chat'):e(W.meta(p).brief?.slice(0,110)||'Private project')} · ${date(p.updatedAt)}`}</small>`;
    };
    return `<div class="ws-record-list">${items.map(p=>`<article class="ws-record-row"><a class="ws-record-open" href="${kind==='chat'?W.href(p):'#project/'+p.id}">${icon(kind==='chat'?'chat':'folder')}<span><strong>${e(p.title)}${W.meta(p).pinned?' <span class="ws-badge">Pinned</span>':''}</strong>${details(p)}</span></a><button class="icon-button" aria-haspopup="menu" aria-expanded="false" data-menu="${e(p.id)}" aria-label="Manage ${kind} ${e(p.title)}">${icon('more')}</button></article>`).join('')}</div>`;
  }
  function wireMenus(){main.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>W.recordMenu(b,W.get(b.dataset.menu)));}
  const empty=(title,copy,action='',symbol='folder')=>`<div class="ws-empty">${icon(symbol)}<h2>${title}</h2><p>${copy}</p>${action}</div>`;
  function home(){
    main.className='ws-home';main.innerHTML=`<section class="ws-create"><h1>What would you like to build?</h1><p>From a first idea to your next release.</p><form id="idea-form" class="ws-composer"><label class="sr-only" for="idea-input">Describe what you would like to build</label><textarea id="idea-input" rows="3" maxlength="12000" placeholder="Describe a website, app, or feature you want to build…" required></textarea><div id="reference-chips" class="ws-reference-chips"></div><div class="ws-composer-tools"><button type="button" id="add-context" class="text-button" aria-haspopup="menu" aria-expanded="false" aria-label="Add files, images or GitHub" title="Attach files, images or project notes"><span class="ws-plus">${icon('plus')}</span><span>Attach context</span></button><div><button type="button" id="prompt-mic" class="text-button ws-voice-button" aria-label="Dictate prompt"></button><button type="submit" class="ws-send" aria-label="Send build request" disabled>${icon('up')}</button></div></div></form><p class="keyboard-hint"><kbd>Enter</kbd> to send <span aria-hidden="true">·</span> <kbd>Shift + Enter</kbd> for a new line</p></section><section class="ws-recent-projects" hidden><div class="ws-section-heading"><div><h2>Recent projects</h2></div><a class="text-link ws-view-all" href="#projects" aria-label="View all projects" hidden><span>View all</span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg></a></div><div id="home-recents"></div></section>`;
    const field=main.querySelector('#idea-input'),form=main.querySelector('#idea-form');field.value=sessionStorage.getItem('draftmango-prompt:'+A.user.id)||'';const refresh=()=>{form.querySelector('[type=submit]').disabled=!field.value.trim();sessionStorage.setItem('draftmango-prompt:'+A.user.id,field.value);};refresh();field.oninput=refresh;field.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(field.value.trim())form.requestSubmit();}};
    main.querySelector('#add-context').onclick=event=>W.attachmentMenu(event.currentTarget,async files=>{try{references=await W.references(files,references);chips();}catch(error){W.toast(error.message);}},()=>W.dialog('Project notes',`<label for="context-notes">Context for your request</label><textarea id="context-notes" rows="6" maxlength="6000">${e(notes)}</textarea>`,{submit:d=>{notes=d.querySelector('textarea').value;chips();}}));voiceInput=globalThis.DraftmangoVoice.mount({button:main.querySelector('#prompt-mic'),field,form});
    const modelPicker=globalThis.DraftmangoAI.mountModelPicker(main.querySelector('.ws-composer-tools>div'),{value:build.modelId||'',onChange:modelId=>build={...build,modelId}});
    main.querySelector('.ws-composer-tools>div').prepend(modelPicker.element);
    function chips(){main.querySelector('#reference-chips').innerHTML=references.map((r,i)=>`<span>${icon(r.type.startsWith('image')?'monitor':'file')}${e(r.name)}<button type="button" data-remove-reference="${i}" aria-label="Remove ${e(r.name)}">×</button></span>`).join('')+(notes?'<span>Project notes <button type="button" id="remove-notes" aria-label="Remove project notes">×</button></span>':'');main.querySelectorAll('[data-remove-reference]').forEach(b=>b.onclick=()=>{references.splice(Number(b.dataset.removeReference),1);chips();});if(main.querySelector('#remove-notes'))main.querySelector('#remove-notes').onclick=()=>{notes='';chips();};}chips();
    form.onsubmit=event=>{event.preventDefault();const prompt=field.value.trim();if(!prompt)return;const p=W.create('chat',prompt.slice(0,60),prompt.slice(0,1200));p.workspace={...p.workspace,queuedPrompt:prompt,attachments:references,notes,build,builder:{version:1,phase:'discovery',questions:[],plan:null,checks:[]}};p.creationPreferences=notes?[notes.slice(0,600)]:[];p.messages=[{role:'user',text:prompt.slice(0,3000)}];p.ai={state:'pending'};W.save(p);sessionStorage.removeItem('draftmango-prompt:'+A.user.id);location.href=W.href(p);};homeRecents();
  }
  function homeRecents(){
    const root=main.querySelector('#home-recents');if(!root)return;
    const projects=W.records('project'),items=projects.slice(0,3),hasProjects=items.length>0;
    main.classList.toggle('is-empty',!hasProjects);
    const section=root.closest('.ws-recent-projects');
    section.hidden=!hasProjects;
    section.querySelector('.ws-view-all').hidden=projects.length<=3;
    root.innerHTML=hasProjects?list(items,'project',{recent:true}):'';
    wireMenus();
  }
  function chats(){
    main.className='ws-page ws-chats-page ws-collection-page';
    main.innerHTML=`<header class="ws-collection-header"><h1>Chats</h1><a class="button primary" href="#new">${icon('plus')}New chat</a></header>
      <div class="ws-collection-controls ws-chat-controls"><label class="ws-collection-search">${icon('search')}<input type="search" id="chat-search" placeholder="Search chats" aria-label="Search chats" value="${e(chatFilter)}"></label></div>
      <div class="ws-collection-list-heading"><div class="ws-collection-filters" role="group" aria-label="Filter chats">${[['active','All chats'],['standalone','Standalone'],['archived','Archived']].map(([scope,label])=>`<button type="button" data-chat-scope="${scope}" aria-pressed="${scope===chatScope}">${label}</button>`).join('')}</div><p id="chat-results-count" class="ws-collection-count" role="status" aria-live="polite" aria-atomic="true"></p></div>
      <div id="chat-list"></div><p class="ws-collection-privacy">${icon('lock')}Private to your account</p>`;
    const search=main.querySelector('#chat-search'),filters=[...main.querySelectorAll('[data-chat-scope]')];
    filters.forEach(button=>button.onclick=()=>{W.closeMenu();chatScope=button.dataset.chatScope;paint();});
    function paint(){
      chatFilter=search.value;
      const query=chatFilter.trim().toLowerCase();
      const rows=W.records('chat',chatScope==='archived').filter(p=>p.title.toLowerCase().includes(query)&&(chatScope!=='standalone'||!W.meta(p).parentId));
      filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.chatScope===chatScope)));
      main.querySelector('#chat-results-count').textContent=rows.length+' chat'+(rows.length===1?'':'s');
      let content;
      if(rows.length)content=list(rows,'chat',{conversation:true});
      else if(query)content=empty('No matching chats','Try another name or clear your search.','<button type="button" class="button" id="clear-chat-search">Clear search</button>','chat');
      else if(chatScope==='standalone')content=empty('No standalone chats','Chats outside a project will appear here.','<button type="button" class="button" id="show-all-chats">View all chats</button>','chat');
      else if(chatScope==='archived')content=empty('No archived chats','Conversations you archive will appear here.','<button type="button" class="button" id="show-all-chats">View all chats</button>','chat');
      else content=empty('Start a conversation','Use New chat to describe what you would like to build.','','chat');
      main.querySelector('#chat-list').innerHTML=content;
      main.querySelector('#clear-chat-search')?.addEventListener('click',()=>{search.value='';paint();search.focus();});
      main.querySelector('#show-all-chats')?.addEventListener('click',()=>{chatScope='active';paint();filters[0].focus();});
      wireMenus();
    }
    search.oninput=()=>{W.closeMenu();paint();};paint();
  }
  function projects(){
    main.className='ws-page ws-projects-page ws-collection-page';
    const sortOptions=[['updated','Recently updated'],['created','Recently created'],['name','Name A–Z']];
    main.innerHTML=`<header class="ws-collection-header"><h1>Projects</h1><button type="button" class="button primary" id="create-project">${icon('plus')}New project</button></header>
      <div class="ws-collection-controls"><label class="ws-collection-search">${icon('search')}<input type="search" id="project-search" placeholder="Search projects" aria-label="Search projects" value="${e(projectFilter)}"></label><button type="button" id="project-sort" class="ws-collection-sort" aria-haspopup="menu" aria-expanded="false"><span></span>${icon('chevronDown')}</button></div>
      <div class="ws-collection-list-heading"><div class="ws-collection-filters" role="group" aria-label="Filter projects">${[['active','All projects'],['pinned','Pinned'],['archived','Archived']].map(([scope,label])=>`<button type="button" data-project-scope="${scope}" aria-pressed="${scope===projectScope}">${label}</button>`).join('')}</div><p id="results-count" class="ws-collection-count" role="status" aria-live="polite" aria-atomic="true"></p></div>
      <div id="all-projects"></div><p class="ws-collection-privacy">${icon('lock')}Private to your account</p>`;
    const search=main.querySelector('#project-search'),sort=main.querySelector('#project-sort'),filters=[...main.querySelectorAll('[data-project-scope]')];
    main.querySelector('#create-project').onclick=()=>W.newProject();
    sort.onclick=()=>W.menu(sort,sortOptions.map(([value,label])=>({label,checked:value===projectSort,run:()=>{projectSort=value;paint();}})),{record:true,title:'Sort projects'});
    filters.forEach(button=>button.onclick=()=>{W.closeMenu();projectScope=button.dataset.projectScope;paint();});
    function paint(){
      projectFilter=search.value;
      const query=projectFilter.trim().toLowerCase();
      const items=W.records('project',projectScope==='archived').filter(p=>p.title.toLowerCase().includes(query)&&(projectScope!=='pinned'||W.meta(p).pinned));
      items.sort((a,b)=>projectSort==='name'?a.title.localeCompare(b.title):projectSort==='created'?b.createdAt.localeCompare(a.createdAt):b.updatedAt.localeCompare(a.updatedAt));
      const sortLabel=sortOptions.find(([value])=>value===projectSort)[1];
      sort.querySelector('span').textContent=sortLabel;sort.setAttribute('aria-label','Sort projects: '+sortLabel);
      filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectScope===projectScope)));
      main.querySelector('#results-count').textContent=items.length+' project'+(items.length===1?'':'s');
      let content;
      if(items.length)content=list(items,'project',{recent:true});
      else if(query)content=empty('No matching projects','Try another name or clear your search.','<button type="button" class="button" id="clear-project-search">Clear search</button>');
      else if(projectScope==='pinned')content=empty('No pinned projects','Pin a project from its menu to keep it close.','<button type="button" class="button" id="show-all-projects">View all projects</button>');
      else if(projectScope==='archived')content=empty('No archived projects','Projects you archive will appear here.','<button type="button" class="button" id="show-all-projects">View all projects</button>');
      else content=empty('Your projects start here','Use New project to keep your files and conversations together.');
      main.querySelector('#all-projects').innerHTML=content;
      main.querySelector('#clear-project-search')?.addEventListener('click',()=>{search.value='';paint();search.focus();});
      main.querySelector('#show-all-projects')?.addEventListener('click',()=>{projectScope='active';paint();filters[0].focus();});
      wireMenus();
    }
    search.oninput=()=>{W.closeMenu();paint();};paint();
  }
  function project(id,tab='chats'){
    const p=W.get(id);if(!p){main.className='ws-page';main.innerHTML=empty('Project unavailable','Return to your projects to choose another.','<a class="button" href="#projects">Your projects</a>');return;}
    main.className='ws-page';main.innerHTML=`<a class="text-link" href="#projects">${icon('folder')}Your projects</a>`+header(e(p.title),e(W.meta(p).brief||'A space for your source files and related conversations.'),`<div class="ws-action-row"><a class="button primary" href="${W.href(p)}">Open editor ${icon('external')}</a><a class="button" href="#store/${e(id)}/overview">Manage store</a><button class="icon-button" id="project-options" aria-label="Manage project">${icon('more')}</button></div>`)+`<nav class="settings-tabs" aria-label="Project sections">${['chats','files','instructions','activity'].map(t=>`<a href="#project/${e(id)}/${t}" ${tab===t?'aria-current="page"':''}>${t[0].toUpperCase()+t.slice(1)}</a>`).join('')}</nav><div id="project-content"></div>`;main.querySelector('#project-options').onclick=event=>W.recordMenu(event.currentTarget,p);const area=main.querySelector('#project-content');
    if(tab==='files'){const files=p.codeDraft||p.files||{};area.innerHTML=`<div class="ws-section-heading"><h2>Source files</h2><a class="button" href="${W.href(p)}&view=code">Open file explorer</a></div>`+Object.keys(files).map(name=>`<a class="ws-file-row" href="${W.href(p)}&view=code&file=${encodeURIComponent(name)}">${icon('file')}<strong>${e(name)}</strong><span>${new TextEncoder().encode(files[name]).length.toLocaleString()} bytes</span>${icon('external')}</a>`).join('');}
    else if(tab==='instructions'){area.innerHTML=`<section class="settings-card"><h2>Project instructions</h2><p>Context shared with every new chat in this project.</p><form id="instructions-form"><label for="project-brief">Project brief</label><textarea id="project-brief" rows="3" maxlength="3000">${e(W.meta(p).brief||'')}</textarea><label for="project-instructions">Instructions</label><textarea id="project-instructions" rows="7" maxlength="6000" placeholder="Describe conventions, requirements, and what the agent should know…">${e(W.meta(p).instructions||'')}</textarea><div class="card-actions"><span>Saved to this project.</span><button class="button primary">Save instructions</button></div></form></section>`;area.querySelector('form').onsubmit=event=>{event.preventDefault();W.update(id,{workspace:{brief:area.querySelector('#project-brief').value,instructions:area.querySelector('#project-instructions').value}});W.toast('Project instructions saved.');};}
    else if(tab==='activity'){area.innerHTML='<p>Loading project activity…</p>';W.loadActivity().then(items=>{if(!document.contains(area))return;const related=new Set([p.id,...W.records('chat').filter(c=>W.meta(c).parentId===p.id).map(c=>c.id)]);const rows=items.filter(x=>related.has(x.projectId));area.innerHTML=rows.length?rows.map(x=>`<div class="ws-setting-row"><strong>${e(x.kind)} ${x.success?'completed':'failed'}</strong><span>${e(new Date(x.at).toLocaleString())}</span></div>`).join(''):empty('No activity yet','Run a preview or start a chat in this project.');}).catch(error=>area.textContent=error.message);}
    else{const related=W.records('chat').filter(c=>W.meta(c).parentId===id);area.innerHTML=`<div class="ws-section-heading"><div><h2>Chats</h2><p>Conversations in this project share its source files and instructions.</p></div><button class="button" id="project-new-chat">${icon('plus')}New chat</button></div>`+(related.length?list(related,'chat'):empty('Start a conversation','Describe what you would like to build or change.'));area.querySelector('#project-new-chat').onclick=()=>{const chat=W.create('chat','New chat','',id);location.href=W.href(chat);};wireMenus();}
  }
  function cli(){main.className='ws-page';main.innerHTML=header('CLI tasks','Follow the work happening in your terminal and review its proposed changes.','<a class="button" href="#settings/cli">CLI devices</a>','LOCAL DEVELOPMENT')+`<div class="ws-cli-layout"><section class="settings-card"><h2>Recent tasks</h2><p>No local tasks yet.</p><p class="muted">CLI pairing is postponed. When it is available, your local tasks will appear here.</p></section><section class="ws-empty"><h2>Your terminal, connected.</h2><p>Select a task to see progress, questions, local checks, and proposed source changes.</p></section></div>`;}
  function device(){main.className='ws-page';main.innerHTML=`<section class="ws-device"><h1>Connect your terminal</h1><p>Signed in as ${e(A.user.email)}</p><p>Match this code with the terminal where you started device pairing.</p><form id="device-form">${W.field('Terminal code','terminal-code','','text','required maxlength="20" placeholder="XXXX-XXXX"')}<button class="button primary">Look up code</button><p id="device-status" role="status"></p></form><a href="#home" class="text-link">Back to workspace</a></section>`;main.querySelector('form').onsubmit=event=>{event.preventDefault();main.querySelector('#device-status').textContent='CLI device pairing is not available yet. No terminal has been authorized.';};}
  function route(){const fromNavigation=sidebar.classList.contains('is-open')||sidebar.contains(document.activeElement);voiceInput?.dispose();voiceInput=null;globalThis.DraftmangoStores?.dispose();globalThis.DraftmangoDomains?.dispose();W.closeMenu();const [page,arg,tab]=location.hash.slice(1).split('/');current=['projects','chats','project','settings','domains','stores','store','cli','device'].includes(page)?page:'home';nav();closeNav();document.title=({home:'Workspace',project:'Project',projects:'Projects',chats:'Chats',settings:'Settings',domains:'Domains',stores:'Stores',store:'Store management',cli:'CLI tasks',device:'Connect terminal'})[current]+' | Draftmango';if(current==='home'){home();if(page==='new'){main.querySelector('#idea-input').value='';main.querySelector('#idea-input').dispatchEvent(new Event('input'));main.querySelector('#idea-input').focus();}if(page==='new-project')W.newProject();}else if(current==='projects')projects();else if(current==='chats')chats();else if(current==='project')project(arg,tab);else if(current==='settings'){main.className='ws-page';globalThis.DraftmangoSettings.render(main,arg);}else if(current==='domains'){main.className='ws-page ws-collection-page ws-domains-page';main.innerHTML='<section id="page-domains" class="domains-page"></section>';globalThis.DraftmangoDomains.mount({...W.library(),projects:W.records('project')});}else if(current==='stores'||current==='store')globalThis.DraftmangoStores.render(main,current==='store'?arg:undefined,tab);else if(current==='cli')cli();else device();window.scrollTo(0,0);if(fromNavigation&&page!=='new'&&page!=='new-project')main.focus({preventScroll:true});}
  window.addEventListener('hashchange',route);window.addEventListener('draftmango:records',()=>{nav();if(current==='home')homeRecents();else if(current==='projects')projects();else if(current==='chats')chats();else if(current==='project'){const [,id,tab]=location.hash.slice(1).split('/');project(id,tab);}});window.addEventListener('storage',event=>{if(event.key===A.key('projects')){nav();if(current==='home')homeRecents();}});route();A.paint();
})();
