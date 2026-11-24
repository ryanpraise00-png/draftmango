/* Shared workspace behavior. All records remain scoped to the signed-in account. */
(() => {
  'use strict';
  const A = globalThis.DraftmangoAccounts, M = globalThis.DraftmangoModel;
  const e = M.escapeHtml, $ = s => document.querySelector(s);
  const paths = {image:'M3 4h18v16H3ZM3 15l5-5 5 5 3-3 5 5M16 8h.01',notes:'M8 3H5v18h14V9M9 15l1-4L19 2l3 3-9 9-4 1Z',branch:'M6 3v13a3 3 0 1 0 0 6 3 3 0 0 0 0-6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18 7v3c0 3-12 1-12 6',chat:'M4 4h16v12H9l-5 4V4Z',folder:'M3 7V4h7l2 3h9v13H3Z',plus:'M12 4v16M4 12h16',close:'m6 6 12 12M6 18 18 6',arrow:'M5 12h14m-5-5 5 5-5 5',up:'M12 20V4m-6 6 6-6 6 6',menu:'M4 6h16M4 12h16M4 18h16',sliders:'M5 3v6m0 4v8M12 3v11m0 4v3m7-18v3m0 4v11M2 9h6m1 5h6m1-8h6',home:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',more:'M5 12h.01M12 12h.01M19 12h.01',moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',sun:'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',external:'M6 18 18 6M7 6h11v11',file:'M6 3h8l4 4v14H6ZM14 3v5h4',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',upload:'M12 17V3m-5 5 5-5 5 5M4 17v4h16v-4',monitor:'M3 4h18v13H3ZM8 21h8M12 17v4',terminal:'m5 7 5 5-5 5m8 0h6',lock:'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3',user:'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M4 21v-2a8 8 0 0 1 16 0v2',link:'m9 15 6-6M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m1-1 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',chart:'M4 3v18h17M9 17V9m5 8V5m5 12v-7',credit:'M3 5h18v14H3ZM3 9h18M7 15h3',database:'M3 6c0-5 18-5 18 0v12c0 5-18 5-18 0ZM3 6c0 5 18 5 18 0M3 12c0 5 18 5 18 0',check:'m5 12 4 4L19 6',search:'M16 16l5 5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',history:'M3 3v6h6M3 9a9 9 0 1 1 1 10M12 7v5l3 2',play:'m7 4 14 8-14 8Z',test:'m9 3 3 3-8 12a2 2 0 0 0 3 3L19 9l3 3M8 14l5 5',save:'M4 3h14l3 3v15H3V3ZM7 3v6h10V3M7 21v-8h10v8',expand:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',code:'m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-6 5-6 13 0 18 6-5 6-13 0-18',copy:'M8 8h13v13H8ZM16 8V3H3v13h5',sound:'M3 9h4l5-5v16l-5-5H3ZM16 8c3 2 3 6 0 8M19 5c5 4 5 10 0 14'};
  Object.assign(paths,{pause:'M8 5v14M16 5v14',chevron:'m7 10 5 5 5-5',refresh:'M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',edit:'m14 4 6 6M4 20l5-1L21 7l-5-5L4 14v6Z',pin:'m16 3 5 5-4 1-4 4v4l-2 2-6-6 2-2h4l4-4 1-4ZM2 22l6-6',archive:'M3 3h18v5H3ZM5 8v13h14V8M10 12h4'});
  const icon = name => name==='more'?'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/></svg>':`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.file}"/></svg>`;
  const defaults = {theme:'light',sound:true,fontSize:14,indent:2,wordWrap:false,lineNumbers:true,reduceMotion:false,device:'responsive',buildLevel:'standard',autoRefresh:true,starter:'auto',color:'auto'};
  let prefs = {...defaults}, profile, activities=[], toastTimer, activeMenu, activeMenuCleanup, dialogSequence=0;
  function library(){return M.readStore(localStorage.getItem(A.key('projects'))) || {schema:1,activeId:'',projects:[]};}
  const meta = record => record?.workspace || {};
  const isChat = record => meta(record).kind === 'chat';
  const records = (kind, archived=false) => library().projects.filter(p=>!meta(p).deleted && (!kind || isChat(p)===(kind==='chat')) && !!meta(p).archived===archived).sort((a,b)=>Number(!!meta(b).pinned)-Number(!!meta(a).pinned)||b.updatedAt.localeCompare(a.updatedAt));
  const get = id => library().projects.find(p=>p.id===id && !meta(p).deleted);
  function save(record){const lib=library();const index=lib.projects.findIndex(p=>p.id===record.id);if(index<0)lib.projects.push(record);else lib.projects[index]=record;A.saveLibrary(lib,record.id);window.dispatchEvent(new Event('draftmango:records'));return record;}
  function update(id, fields){const p=get(id);if(!p)throw new Error('This item is no longer available.');return save({...p,...fields,workspace:{...meta(p),...(fields.workspace||{})},updatedAt:new Date().toISOString()});}
  function toast(message){let node=$('#toast');if(!node){node=document.createElement('div');node.id='toast';node.className='toast';node.setAttribute('role','status');document.body.append(node);}node.textContent=message;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.hidden=true,5000);}
  function button(text,action,cls='button'){return `<button type="button" class="${cls}" data-action="${action}">${text}</button>`;}
  function field(label,id,value='',type='text',extra=''){return `<label for="${id}">${label}</label><input id="${id}" type="${type}" value="${e(value)}" ${extra}>`;}
  function dialog(title,content,{submit,label='Save',wide=false,danger=false}={}){
    closeMenu(); const d=document.createElement('dialog');d.className='ws-dialog'+(wide?' wide':'');d.innerHTML=`<form><header><h2>${e(title)}</h2><button type="button" class="icon-button" aria-label="Close dialog" data-dismiss>${icon('close')}</button></header><div class="dialog-body">${content}</div><p class="dialog-error" role="alert" hidden></p>${submit?`<footer><button type="button" class="button" data-dismiss>Cancel</button><button type="submit" class="button primary">${e(label)}</button></footer>`:''}</form>`;
    // Share rounded dialogs across the dashboard screens already refreshed.
    if(document.body.dataset.screen==='dashboard'&&document.querySelector('#main.ws-home,#main.ws-collection-page')){
      d.classList.add('ws-home-dialog');
      if(document.querySelector('#main.store-owner'))d.classList.add('store-owner-dialog');
      if(document.querySelector('#main.ws-settings-page'))d.classList.add('ws-settings-dialog');
      const titleId='workspace-dialog-title-'+(++dialogSequence);
      d.querySelector('h2').id=titleId;d.setAttribute('aria-labelledby',titleId);
      if(danger){
        d.classList.add('is-danger');
        const body=d.querySelector('.dialog-body');body.id=titleId+'-description';d.setAttribute('aria-describedby',body.id);
        d.querySelector('footer [data-dismiss]')?.setAttribute('autofocus','');
      }
    }
    document.body.append(d);d.querySelectorAll('[data-dismiss]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('close',()=>d.remove());d.addEventListener('click',event=>{if(event.target===d){const r=d.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)d.close();}});
    d.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!submit)return;const b=d.querySelector('[type=submit]');b.disabled=true;try{await submit(d);if(d.open)d.close();}catch(error){const p=d.querySelector('.dialog-error');p.hidden=false;p.textContent=error.message;}finally{b.disabled=false;}};d.showModal();return d;
  }
  function closeMenu(){activeMenuCleanup?.();activeMenuCleanup=null;activeMenu?.remove();activeMenu=null;}
  function menu(anchor, items, {attachment=false,record=false,editor=false,title=""}={}){
    const enhanced=attachment||record||editor;
    if(enhanced && activeMenu?.menuAnchor===anchor){closeMenu();return;}
    closeMenu();
    const node=document.createElement('div');
    node.className='ws-menu'+(attachment?' ws-attachment-menu':editor?' ws-record-menu ws-editor-menu':record?' ws-record-menu':'');
    node.setAttribute('role','menu');
    if(enhanced){
      node.id=attachment?'attachment-menu':editor?'editor-actions-menu':'record-actions-menu';node.menuAnchor=anchor;
      const headingText=attachment?'Add context':title;
      node.setAttribute('aria-label',headingText);
      const heading=document.createElement('div');heading.className=attachment?'ws-attachment-heading':'ws-record-menu-heading';
      heading.setAttribute('role','presentation');heading.textContent=headingText;node.append(heading);
      anchor.setAttribute('aria-haspopup','menu');anchor.setAttribute('aria-expanded','true');anchor.setAttribute('aria-controls',node.id);
    }
    items.forEach(({label,description,symbol,run,checked,danger=false,separate=false})=>{
      const b=document.createElement('button'),selection=typeof checked==='boolean';b.type='button';b.setAttribute('role',selection?'menuitemradio':'menuitem');
      if(selection)b.setAttribute('aria-checked',String(checked));
      if(attachment){
        b.className='ws-attachment-option'+(separate?' is-separated':'');
        b.innerHTML=icon(symbol)+`<span class="ws-attachment-copy"><span class="ws-attachment-label">${e(label)}</span><span class="ws-attachment-description">${e(description)}</span></span>`;
      }else if(record||editor){
        b.className='ws-record-menu-option'+(separate?' is-separated':'');
        b.innerHTML=(selection?'':icon(symbol))+`<span>${e(label)}</span>`;
        if(selection){b.classList.add('ws-menu-selection');b.innerHTML+=`<span class="ws-menu-check" aria-hidden="true">${checked?icon('check'):''}</span>`;}
      }else b.textContent=label;
      if(danger)b.classList.add('danger');
      b.onclick=()=>{closeMenu();anchor.focus({preventScroll:true});run();};node.append(b);
    });
    document.body.append(node);activeMenu=node;
    const buttons=[...node.querySelectorAll('button')];
    if(enhanced){
      const composer=attachment?(anchor.closest('.ws-composer,.composer')||anchor):anchor;
      let frame=0;
      function position(){
        if(activeMenu!==node)return;
        if(!anchor.isConnected){closeMenu();return;}
        const r=composer.getBoundingClientRect(),trigger=anchor.getBoundingClientRect(),viewport=window.visualViewport;
        const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
        const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight,gap=8,inset=12;
        if(trigger.bottom<top||trigger.top>top+height){closeMenu();return;}
        const menuWidth=Math.min(attachment?320:editor?280:248,width-inset*2);
        node.style.width=menuWidth+'px';
        const heightLimit=editor?560:400;
        const naturalHeight=Math.min(heightLimit,node.scrollHeight+node.offsetHeight-node.clientHeight);
        const belowSpace=Math.max(0,top+height-r.bottom-gap-inset),aboveSpace=Math.max(0,r.top-top-gap-inset);
        const below=belowSpace>=naturalHeight||(aboveSpace<naturalHeight&&belowSpace>=aboveSpace);
        node.style.maxHeight=Math.min(heightLimit,below?belowSpace:aboveSpace)+'px';
        node.style.left=Math.max(left+inset,Math.min(attachment?r.left:r.right-menuWidth,left+width-menuWidth-inset))+'px';
        node.style.top=(below?r.bottom+gap:r.top-node.getBoundingClientRect().height-gap)+'px';
      }
      const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(position);};
      const events=new AbortController(),options={signal:events.signal};
      window.addEventListener('resize',schedule,options);
      document.addEventListener('scroll',schedule,{...options,capture:true});
      window.visualViewport?.addEventListener('resize',schedule,options);
      window.visualViewport?.addEventListener('scroll',schedule,options);
      document.addEventListener('focusin',event=>{if(!node.contains(event.target)&&!anchor.contains(event.target))closeMenu();},options);
      const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
      observer?.observe(composer);
      activeMenuCleanup=()=>{events.abort();observer?.disconnect();cancelAnimationFrame(frame);anchor.setAttribute('aria-expanded','false');anchor.removeAttribute('aria-controls');};
      position();
    }else{
      const r=anchor.getBoundingClientRect();
      node.style.left=Math.max(8,Math.min(r.left,innerWidth-node.offsetWidth-8))+'px';
      node.style.top=Math.max(8,Math.min(r.bottom+5,innerHeight-node.offsetHeight-8))+'px';
    }
    (buttons.find(button=>button.getAttribute('aria-checked')==='true')||buttons[0])?.focus({preventScroll:true});
    node.onkeydown=event=>{
      const i=buttons.indexOf(document.activeElement);
      if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){
        event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView({block:'nearest'});
      }
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeMenu();anchor.focus({preventScroll:true});}
      if(enhanced&&event.key==='Tab'){
        // Return to the trigger before native Tab continues through the page.
        anchor.focus({preventScroll:true});closeMenu();
      }
    };
  }
  document.addEventListener('pointerdown',event=>{if(activeMenu&&!activeMenu.contains(event.target)&&!activeMenu.menuAnchor?.contains(event.target))closeMenu();});
  window.addEventListener('resize',()=>{if(!activeMenu?.menuAnchor)closeMenu();});

  const legacyEmptyFiles=()=>({'index.html':'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Untitled project</title>\n<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n<script src="app.js"></script>\n</body>\n</html>','styles.css':'','app.js':''});
  const emptyFiles=()=>globalThis.DraftmangoProject.scaffold();
  function create(kind,title,brief='',parentId=''){
    let p=M.createProject(brief,'custom');p.title=title||'New chat';p.messages=[];p.prompt=brief.slice(0,1200);p.workspace={kind,parentId,brief,folders:[],attachments:[],build:{level:'standard'}};
    const parent=get(parentId);p=M.commitFiles(p,parent?.files||emptyFiles(),'Project created');if(parent)p.designBrief=parent.designBrief;
    save(p);recordActivity('project',p.id);return p;
  }
  const href = p => '/workspace#'+new URLSearchParams({project:p.id});
  function newProject(source){
    const workspaceSave=!!source&&document.body.dataset.screen==='builder';
    const d=dialog(workspaceSave?'Save as project':source?'Save as a project':'Start a new project',`<p>${source?'Keep this chat and its files in a named project. You can start more chats in the same project.':'Set up your project first. Nothing builds until you open it and send a request.'}</p>${field('Project name','new-project-name',source?.title||'','text','required maxlength="60"')}<label for="new-project-brief">Project brief <span class="muted">(optional)</span></label><textarea id="new-project-brief" rows="4" maxlength="3000" placeholder="What are you building, and who is it for?">${e(source?.prompt||'')}</textarea>`,{label:workspaceSave?'Save project':source?'Create project':'Create and open project',submit:d=>{const name=d.querySelector('#new-project-name').value.trim();if(!name)throw new Error('Enter a project name.');let p=create('project',name,d.querySelector('#new-project-brief').value.trim());if(source){p=save({...p,files:source.files,codeDraft:source.codeDraft,history:structuredClone(source.history),cursor:source.cursor,design:source.design,designBrief:source.designBrief});update(source.id,{workspace:{parentId:p.id}});}location.href='/dashboard#project/'+p.id;}});
    if(workspaceSave){
      d.classList.add('ws-save-project-dialog');
      d.querySelector('h2').id='save-project-title';d.setAttribute('aria-labelledby','save-project-title');
      d.querySelector('.dialog-body>p').id='save-project-intro';d.setAttribute('aria-describedby','save-project-intro');
      const input=d.querySelector('#new-project-name');input.focus({preventScroll:true});input.select();
    }
  }
  function rename(record){
    const d=dialog(isChat(record)?'Rename chat':'Rename project',field('Name','record-name',record.title,'text','required maxlength="60"'),{submit:d=>{const title=d.querySelector('#record-name').value.trim();if(!title)throw new Error('Enter a name.');update(record.id,{title});toast('Name saved.');}});
    d.classList.add('ws-rename-dialog');
    d.querySelector('h2').id='record-rename-title';d.setAttribute('aria-labelledby','record-rename-title');
    const input=d.querySelector('#record-name');input.focus({preventScroll:true});input.select();
  }
  function move(record){dialog('Move chat',`<p>Choose the project this conversation belongs to.</p><label for="move-project">Project</label><select id="move-project"><option value="">Standalone chat</option>${records('project').map(p=>`<option value="${e(p.id)}" ${meta(record).parentId===p.id?'selected':''}>${e(p.title)}</option>`).join('')}</select>`,{label:'Move chat',submit:d=>{update(record.id,{workspace:{parentId:d.querySelector('#move-project').value}});toast('Chat moved.');}});}
  function remove(record){dialog(`Delete ${isChat(record)?'chat':'project'}?`,`<p>Delete <strong>${e(record.title)}</strong>${isChat(record)?' and its conversation':' and its related chats'} from your workspace?</p><p>This removes it from your project library. Export a copy first if you need these files.</p>`,{label:'Delete',danger:true,submit:()=>{for(const p of library().projects.filter(p=>p.id===record.id||meta(p).parentId===record.id))update(p.id,{workspace:{deleted:true}});if(globalThis.DraftmangoEditor?.project.id===record.id)location.href='/dashboard#chats';toast('Deleted from your workspace.');}});}
  function recordMenu(anchor,p){
    if(!p)return;
    menu(anchor,[
      {label:meta(p).pinned?'Unpin':'Pin',symbol:'pin',run:()=>update(p.id,{workspace:{pinned:!meta(p).pinned}})},
      {label:'Rename',symbol:'edit',run:()=>rename(p)},
      ...(isChat(p)?[
        {label:'Move to project',symbol:'folder',run:()=>move(p)},
        {label:'Save as project',symbol:'save',run:()=>newProject(p)}
      ]:[
        {label:'Open in editor',symbol:'code',run:()=>location.href=href(p)},
        {label:'Duplicate project',symbol:'copy',run:()=>{const copy=structuredClone(p);copy.id=crypto.randomUUID();copy.title=(p.title+' copy').slice(0,60);copy.createdAt=copy.updatedAt=new Date().toISOString();save(copy);toast('Project duplicated.');}}
      ]),
      {label:meta(p).archived?'Restore from archive':'Archive',symbol:'archive',separate:true,run:()=>update(p.id,{workspace:{archived:!meta(p).archived}})},
      {label:'Delete',symbol:'trash',danger:true,run:()=>remove(p)}
    ],{record:true,title:isChat(p)?'Chat actions':'Project actions'});
  }
  Object.assign(paths,{
    sidebarCollapse:'M3 4h18v16H3ZM8 4v16m7-11-3 3 3 3',
    sidebarExpand:'M3 4h18v16H3ZM8 4v16m4-11 3 3-3 3',
    chevronDown:'m6 9 6 6 6-6',
    chevronUp:'m6 15 6-6 6 6',
    storefront:'M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6',
    help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01',
    logout:'M9 4H4v16h5M10 12h11m-4-4 4 4-4 4'
  });
  let sidebarLayout;
  function readSidebarLayout(){
    if(!sidebarLayout){
      let saved;try{saved=JSON.parse(localStorage.getItem(A.key('preferences')+':sidebar-layout')||'{}');}catch{}
      sidebarLayout={collapsed:saved?.collapsed===true,recentsOpen:saved?.recentsOpen!==false};
    }
    return sidebarLayout;
  }
  function saveSidebarLayout(changes){
    sidebarLayout={...readSidebarLayout(),...changes};
    try{localStorage.setItem(A.key('preferences')+':sidebar-layout',JSON.stringify(sidebarLayout));}catch{/* Navigation also works when device storage is unavailable. */}
  }
  function sidebar(root,current='home',activeId=''){
    if(!root)return;
    const state=readSidebarLayout(),chats=records('chat').slice(0,6);
    const selected=current==='project'?'projects':current==='store'?'stores':current;
    const name=profile?.name||A.user?.email||'Your account';
    const scrollTop=root.querySelector('.ws-sidebar-scroll')?.scrollTop||0;
    const links=items=>items.map(([route,symbol,label])=>`<a class="ws-navigation-link" href="/dashboard#${route}" aria-label="${label}" title="${label}" ${selected===route?'aria-current="page"':''}>${icon(symbol)}<span class="ws-nav-label">${label}</span></a>`).join('');
    root.classList.add('ws-sidebar--rebuilt');
    document.body.dataset.sidebarCollapsed=String(state.collapsed);
    root.innerHTML=`
      <div class="ws-sidebar-header">
        <a href="/dashboard#home" class="brand ws-sidebar-brand" aria-label="Draftmango workspace" title="Draftmango workspace"><svg class="brand-mark" aria-hidden="true"><use href="#mango"/></svg><span class="ws-brand-label">draftmango.</span></a>
        <button type="button" class="icon-button ws-sidebar-collapse" aria-label="${state.collapsed?'Expand':'Collapse'} sidebar" title="${state.collapsed?'Expand':'Collapse'} sidebar" aria-expanded="${!state.collapsed}">${icon(state.collapsed?'sidebarExpand':'sidebarCollapse')}</button>
        <button type="button" class="icon-button ws-nav-close" aria-label="Close navigation">${icon('close')}</button>
      </div>
      <a class="ws-sidebar-create" href="/dashboard#new" aria-label="New chat" title="New chat">${icon('plus')}<span class="ws-nav-label">New chat</span></a>
      <div class="ws-sidebar-scroll">
        <nav class="ws-primary-nav" aria-label="Main navigation">${links([['home','home','Workspace'],['projects','folder','Projects'],['chats','chat','Chats']])}</nav>
        <section class="ws-management-section" aria-labelledby="sidebar-manage-heading"><h2 id="sidebar-manage-heading" class="ws-sidebar-section-label">Manage</h2><nav class="ws-management-nav" aria-label="Management">${links([['domains','globe','Domains'],['stores','storefront','Stores']])}</nav></section>
        ${chats.length?`<section class="ws-recent-chat-section"><button type="button" class="ws-recents-toggle" aria-expanded="${state.recentsOpen}" aria-controls="sidebar-recent-chats"><span>Recent chats</span>${icon('chevronDown')}</button><div id="sidebar-recent-chats" ${state.recentsOpen?'':'hidden'}>${chats.map(p=>`<div class="ws-recent-chat ${p.id===activeId?'is-active':''}"><a class="ws-recent-chat-link" href="${href(p)}" title="${e(p.title)}" ${p.id===activeId?'aria-current="page"':''}><span>${e(p.title)}</span></a><button type="button" class="icon-button" aria-haspopup="menu" aria-expanded="false" data-record-menu="${e(p.id)}" aria-label="Manage chat ${e(p.title)}">${icon('more')}</button></div>`).join('')}</div></section>`:''}
      </div>
      <div class="ws-sidebar-footer">
        <a href="/help" class="ws-sidebar-help" aria-label="Help & support" title="Help & support">${icon('help')}<span class="ws-nav-label">Help &amp; support</span></a>
        <button type="button" class="ws-account-trigger ${current==='settings'?'is-active':''}" aria-label="Account menu" title="Account menu" aria-haspopup="menu" aria-expanded="false"><span class="ws-account-avatar">${e(name.slice(0,1).toUpperCase())}</span><span class="ws-account-copy"><strong>${e(name)}</strong><small>Personal account</small></span>${icon('chevronUp')}</button>
      </div>`;
    root.querySelector('.ws-sidebar-scroll').scrollTop=scrollTop;
    root.querySelector('.ws-sidebar-collapse').onclick=event=>{
      closeMenu();saveSidebarLayout({collapsed:!readSidebarLayout().collapsed});
      const collapsed=readSidebarLayout().collapsed,button=event.currentTarget;
      document.body.dataset.sidebarCollapsed=String(collapsed);
      button.setAttribute('aria-expanded',String(!collapsed));
      button.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');
      button.title=collapsed?'Expand sidebar':'Collapse sidebar';
      button.innerHTML=icon(collapsed?'sidebarExpand':'sidebarCollapse');
      button.focus({preventScroll:true});
      root.dispatchEvent(new CustomEvent('draftmango:sidebar-layout',{bubbles:true}));
    };
    const recents=root.querySelector('.ws-recents-toggle');
    if(recents)recents.onclick=()=>{
      const open=!readSidebarLayout().recentsOpen;saveSidebarLayout({recentsOpen:open});
      recents.setAttribute('aria-expanded',String(open));root.querySelector('#sidebar-recent-chats').hidden=!open;
    };
    root.querySelectorAll('[data-record-menu]').forEach(button=>button.onclick=()=>recordMenu(button,get(button.dataset.recordMenu)));
    const navigate=url=>{root.dispatchEvent(new CustomEvent('draftmango:sidebar-navigate',{bubbles:true}));location.href=url;};
    root.querySelector('.ws-account-trigger').onclick=event=>menu(event.currentTarget,[
      {label:'Settings',symbol:'sliders',run:()=>navigate('/dashboard#settings/profile')},
      {label:'Billing',symbol:'credit',run:()=>navigate('/dashboard#settings/billing')},
      {label:'Appearance',symbol:'sun',run:()=>navigate('/dashboard#settings/preferences')},
      {label:'Privacy',symbol:'lock',run:()=>navigate('/legal#privacy')},
      {label:'Back to Draftmango',symbol:'external',separate:true,run:()=>navigate('/')},
      {label:'Sign out',symbol:'logout',separate:true,run:()=>A.signOut().catch(error=>toast(error.message))}
    ],{record:true,title:'Your account'});
  }
  function applyPrefs(){const dark=prefs.theme==='dark'||(prefs.theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.reduceMotion=String(prefs.reduceMotion);document.documentElement.style.setProperty('--editor-font',prefs.fontSize+'px');document.documentElement.style.setProperty('--editor-indent',prefs.indent);document.documentElement.dataset.editorWrap=String(prefs.wordWrap);document.documentElement.dataset.lineNumbers=String(prefs.lineNumbers);window.dispatchEvent(new Event('draftmango:preferences'));}
  async function savePrefs(changes){const result=await A.request('/api/accounts/profile',{method:'PATCH',body:{preferences:changes}});prefs={...defaults,...result.preferences};profile=result.user;localStorage.setItem(A.key('preferences'),JSON.stringify({...prefs,name:profile.name}));applyPrefs();return prefs;}
  async function init(){try{const cache=JSON.parse(localStorage.getItem(A.key('preferences'))||'{}');prefs={...defaults,...cache};}catch{}profile=A.user;applyPrefs();try{const result=await A.request('/api/accounts/profile');profile=result.user;prefs={...prefs,...result.preferences};if(profile.name) prefs.name=profile.name;localStorage.setItem(A.key('preferences'),JSON.stringify(prefs));applyPrefs();}catch(error){toast('Account preferences could not sync. Your device preferences are available.');}}
  async function recordActivity(kind,projectId,success=true){const event={id:crypto.randomUUID(),kind,projectId,success,at:new Date().toISOString()};activities.unshift(event);try{const result=await A.request('/api/accounts/activity',{method:'POST',body:event});if(Array.isArray(result.activity))activities=result.activity;}catch{/* Reporting never blocks editing or changes billing. */}}
  async function loadActivity(){const result=await A.request('/api/accounts/activity');if(Array.isArray(result.activity))activities=result.activity;return activities;}
  function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  async function copy(text){try{await navigator.clipboard.writeText(text);toast('Copied to clipboard.');}catch{dialog('Copy link',field('Link','copy-value',text,'text','readonly'));}}
  function chime(){try{const ctx=new AudioContext();const gain=ctx.createGain();gain.connect(ctx.destination);gain.gain.setValueAtTime(.08,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.6);[660,880].forEach((freq,i)=>{const o=ctx.createOscillator();o.frequency.value=freq;o.connect(gain);o.start(ctx.currentTime+i*.15);o.stop(ctx.currentTime+.6);});setTimeout(()=>ctx.close(),800);}catch{toast('Sound is unavailable in this browser.');}}
  function unavailable(title,copyText){dialog(title,`<p>${e(copyText)}</p><div class="ws-callout">Your existing work is unchanged.</div><footer><button type="button" class="button primary" data-dismiss>Done</button></footer>`);}
  function filePicker({images=false,multiple=true,accept,onFiles}){const input=document.createElement('input');input.type='file';input.multiple=multiple;input.accept=accept|| (images?'image/png,image/jpeg,image/webp,image/gif':'.txt,.md,.html,.css,.js,.ts,.json,.csv,.pdf');input.onchange=()=>onFiles([...input.files]);input.click();}
  async function references(files,existing=[]){if(existing.length+files.length>5)throw new Error('Use up to 5 references at a time.');if(existing.reduce((sum,r)=>sum+(r.size||new TextEncoder().encode(r.data).length),0)+files.reduce((sum,f)=>sum+f.size,0)>2*1024*1024)throw new Error('Use references up to 2 MB combined.');const output=[...existing];for(const file of files){if(file.size>1024*1024)throw new Error(file.name+' exceeds the 1 MB reference limit.');const binary=/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.type==='application/pdf';const data=binary?await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);}):await file.text();output.push({name:file.name.slice(0,150),type:binary?file.type:'text/plain',data,size:file.size});}return output;}
  function attachmentMenu(anchor,onFiles,onNotes){
    menu(anchor,[
      {label:'Add files',description:'Documents, code and PDFs',symbol:'file',run:()=>filePicker({onFiles})},
      {label:'Add images',description:'Screenshots and visual references',symbol:'image',run:()=>filePicker({images:true,onFiles})},
      ...(onNotes?[{label:'Add project notes',description:'Background, goals and instructions',symbol:'notes',run:onNotes}]:[]),
      {label:'Import from GitHub',description:'Open a public repository as a new project',symbol:'branch',separate:true,run:githubImport}
    ],{attachment:true});
  }
  function githubImport(){const d=dialog('Import from GitHub',`<p>Select a repository to open its source in a new editor project.</p><p>Public repositories can be imported now. Private repository access needs a GitHub App connection.</p>${field('Public repository','github-repository','','url','required placeholder="https://github.com/owner/repository"')}<p class="muted">Imports source files only. No code runs on the server.</p><button type="button" class="button" id="github-connect">Connect GitHub</button>`,{label:'Import repository',submit:async d=>{const result=await A.request('/api/accounts/import-github',{method:'POST',body:{url:d.querySelector('#github-repository').value}});let p=create('project',result.name);p=M.commitFiles(p,result.files,'Imported from GitHub');save(p);location.href=href(p);}});d.querySelector('#github-connect').onclick=()=>unavailable('Connect GitHub','A Draftmango GitHub App has not been configured yet. You can import a public repository or upload source files while private access is being set up.');}
  globalThis.DraftmangoWorkspace={e,icon,$,button,field,defaults,init,library,records,get,meta,isChat,save,update,create,href,emptyFiles,toast,dialog,menu,closeMenu,newProject,rename,move,remove,recordMenu,sidebar,applyPrefs,savePrefs,recordActivity,loadActivity,download,copy,chime,unavailable,filePicker,references,attachmentMenu,githubImport,get preferences(){return prefs;},get profile(){return profile;},set profile(v){profile=v;},get activity(){return activities;}};
})();
