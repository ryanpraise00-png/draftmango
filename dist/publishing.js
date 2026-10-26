/* Explicit, versioned publication of the account's saved static files. */
(() => {
  'use strict';
  async function open() {
    const E=globalThis.DraftmangoEditor,W=globalThis.DraftmangoWorkspace,A=globalThis.DraftmangoAccounts,{e,icon}=W;
    const projectId=E.project.id;
    let state, busy=false;
    const d=W.dialog('Publish website','<p role="status">Loading publishing settings…</p>');
    d.classList.add('publishing-dialog');
    d.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    const body=d.querySelector('.dialog-body'),error=d.querySelector('.dialog-error');
    const metadata=()=>JSON.parse(localStorage.getItem(A.key('projects'))||'{}').cloud?.[projectId];
    async function savedVersion() {
      if(E.busy)throw new Error('Wait for the current build to finish before publishing.');
      if(E.project.id!==projectId)throw new Error('The open project changed. Reopen Publish to continue.');
      E.applyCode(false);
      if(!E.project.files)E.setFiles({...E.files},'Prepared website for publishing');
      E.save();
      const sequence=metadata()?.seq,deadline=Date.now()+20000;
      do {
        await A.sync();
        const meta=metadata();
        if(meta?.seq!==sequence)throw new Error('The draft changed while syncing. Review it and publish again.');
        if(meta&&!meta.dirty&&meta.version>0)return meta.version;
        await new Promise(resolve=>setTimeout(resolve,300));
      }while(Date.now()<deadline);
      throw new Error('Your draft has not synced yet. Check your connection and retry. The public website is unchanged.');
    }
    function pending(value){busy=value;d.setAttribute('aria-busy',String(value));d.querySelectorAll('button,input').forEach(node=>node.disabled=value);}
    function fail(message){error.textContent=message;error.hidden=false;}
    async function load(){state=await A.request('/api/publishing/sites?projectId='+encodeURIComponent(projectId));paint();}
    function publicLink(site){const u=new URL(site.url);if(!['https:','http:'].includes(u.protocol))throw new Error('Invalid website address.');return u.href;}
    async function change(action,releaseId){
      if(busy)return;
      const slug=d.querySelector('#site-slug')?.value.trim();
      if(action==='publish'&&!d.querySelector('#publish-consent')?.checked){fail('Confirm that these website files can be made public.');return;}
      error.hidden=true;pending(true);
      const status=d.querySelector('#publish-status');status.textContent=action==='publish'?'Syncing your draft and publishing…':'Updating your published website…';
      try{
        const version=action==='publish'?await savedVersion():undefined;
        const result=await A.request('/api/publishing/sites',{method:'POST',body:{action,projectId,slug:state.site?.slug||slug,expectedRevision:state.site?.revision||0,expectedProjectVersion:version,releaseId,confirmed:true}});
        state.site=result.site;paint();
        d.querySelector('#publish-status').textContent=result.unchanged?'This version is already published.':action==='unpublish'?'Website unpublished. Your draft and releases are still saved.':action==='rollback'?'Previous release restored. Your editor draft is unchanged.':'Website published. Future edits stay private until you publish again.';
      }catch(err){
        if(err.status===409)await load().catch(()=>{});
        fail(err.message);
      }finally{pending(false);paintDisabled();}
    }
    function confirm(action,release){
      const title=action==='unpublish'?'Unpublish website?':`Restore release ${release.number}?`;
      W.dialog(title,`<p>${action==='unpublish'?'Visitors will no longer be able to view this website. Your saved draft, address and release history will remain.':'This changes the public website immediately. Your current editor draft will stay as it is.'}</p>`,{label:action==='unpublish'?'Unpublish':'Restore release',submit:()=>change(action,release?.id)});
    }
    function paintDisabled(){d.querySelector('#publish-now').disabled=busy||!state.enabled;d.querySelectorAll('[data-restore]').forEach(b=>b.disabled=busy||!state.enabled);}
    function paint(){
      if(!d.isConnected)return;
      const site=state.site,url=site?publicLink(site):'',live=site?.published;
      const privateURL=new URL('./workspace.html',location.href);privateURL.hash=new URLSearchParams({project:projectId});
      body.innerHTML=`<p>Publish a saved version of your website. Edits stay private until you publish again.</p>
        ${!state.enabled?'<p class="publishing-notice" role="status">Public publishing is being prepared. You can keep building and exporting your website.</p>':''}
        <section class="publishing-address"><div class="publishing-heading"><h3>Website address</h3><span class="ws-badge">${live?'Published':site?'Unpublished':'Not published'}</span></div>
        ${site?`<p class="publishing-url">${live?`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(url)} ${icon('external')}</a>`:e(url)}</p>`:`<label for="site-slug">Choose your address</label><div class="publishing-slug"><input id="site-slug" autocomplete="off" spellcheck="false" maxlength="48" pattern="[a-z][a-z0-9-]{1,46}[a-z0-9]" placeholder="your-website" aria-describedby="site-address-help"><span>.${e(state.baseDomain)}</span></div><p id="site-address-help" class="muted">3–48 lowercase letters, numbers or hyphens. Your address is permanent once published.</p>`}
        <p class="muted">Your plan allows ${e(String(state.limits.sites))} published website${state.limits.sites===1?'':'s'}.</p></section>
        <p>HTML, CSS and JavaScript websites are supported. Server code and projects requiring a build step cannot be published here yet.</p>
        <label class="publishing-consent"><input type="checkbox" id="publish-consent"><span>I’m ready to make these website files public. I have removed any passwords or private keys.</span></label>
        <p class="muted">Source files are public. Draftmango conversations, project notes and account details are excluded.</p>
        <div class="ws-action-row"><button type="button" class="button primary" id="publish-now">${live?'Publish changes':'Publish website'}</button>${live?'<button type="button" class="button" id="unpublish-site">Unpublish</button>':''}</div>
        <p id="publish-status" role="status" aria-live="polite"></p>
        ${site?.releases.length?`<section class="publishing-history"><h3>Release history</h3><p class="muted">Up to ${e(String(state.maxReleases))} saved releases. Restoring a release only changes the public website.</p><ol>${site.releases.map(r=>`<li><div><strong>Release ${e(String(r.number))}${r.id===site.activeRelease?' · Live':''}</strong><small>${e(new Date(r.createdAt).toLocaleString())} · ${Math.ceil(r.bytes/1024)} KB</small></div>${r.id!==site.activeRelease?`<button type="button" class="button" data-restore="${e(r.id)}">Restore</button>`:''}</li>`).join('')}</ol></section>`:''}
        <details class="publishing-options"><summary>Private link and custom domains</summary><p>Only your account can open this workspace link.</p><button type="button" class="button" id="copy-editor-link">${icon('copy')}Copy private workspace link</button><p>Custom-domain publishing is the next stage. <a href="./dashboard.html#domains">Manage domains</a></p></details>`;
      d.querySelector('#publish-now').onclick=()=>change('publish');
      d.querySelector('#unpublish-site')?.addEventListener('click',()=>confirm('unpublish'));
      d.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>confirm('rollback',site.releases.find(r=>r.id===b.dataset.restore)));
      d.querySelector('#copy-editor-link').onclick=()=>W.copy(privateURL.href);
      paintDisabled();
    }
    try{await savedVersion();await load();}catch(err){body.innerHTML='<p>Publishing settings could not be loaded. Your draft is unchanged.</p><button type="button" class="button" id="retry-publishing">Try again</button>';d.querySelector('#retry-publishing').onclick=()=>{d.close();open();};fail(err.message);}
  }
  globalThis.DraftmangoPublishing=Object.freeze({open});
})();
