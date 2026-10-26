(async () => {
  'use strict';
  const A = globalThis.DraftmangoAccounts;
  if (!await A.protect()) return;
  const storageKey = A.key('projects'), preferencesKey = A.key('preferences');
  const M = globalThis.DraftmangoModel;
  const D = globalThis.DraftmangoDashboard;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const e = M.escapeHtml;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
  const kinds = { cafe: 'Café', portfolio: 'Portfolio', store: 'Store', custom: 'Website' };
  const examples = {
    portfolio: 'A portfolio for an independent designer called Studio North. Bold typography, a warm palette, and room for selected work.',
    store: 'An online ceramics store called Form & Field. Thoughtful objects, soft sage colors, and a beautiful collection.',
    cafe: 'A neighborhood café called Slow Days. Warm colors, beautiful coffee photography, and an invitation to stay a while.'
  };
  let library = { schema: 1, activeId: '', projects: [] };
  let preferences = D.readPreferences(null);
  let storageAvailable = true;
  let starter = 'auto';
  let color = 'auto';
  let context = '';
  let renaming = '';
  let toastTimer;
  let page = 'home';
  let setting = 'profile';

  function announce(message) {
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4300);
  }
  function load() {
    try {
      library = M.readStore(localStorage.getItem(storageKey)) || { schema: 1, activeId: '', projects: [] };
      preferences = D.readPreferences(localStorage.getItem(preferencesKey));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    $('.local-status').textContent = storageAvailable ? A.message : 'Storage unavailable'; A.paint();
  }
  function savePreferences(values) {
    try {
      const latest = D.readPreferences(localStorage.getItem(preferencesKey));
      const next = D.readPreferences(JSON.stringify({ ...latest, ...values }));
      localStorage.setItem(preferencesKey, JSON.stringify(next));
      preferences = next;
      renderSidebar();
      announce('Preferences saved on this device.');
      return true;
    } catch { announce('Your changes couldn’t be saved. Browser storage is unavailable or full.'); return false; }
  }
  function dateLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Saved draft';
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    if (days === 0) return 'Edited today';
    if (days === 1) return 'Edited yesterday';
    return 'Edited ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function sortedProjects() {
    return [...library.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  function renderSidebar() {
    $('#project-count').textContent = library.projects.length;
    $('#sidebar-name').textContent = preferences.name || A.user?.email || 'Your workspace';
    $('#sidebar-avatar').textContent = [...(preferences.name || 'D')][0].toUpperCase();
    const recent = sortedProjects().slice(0, 5);
    $('#sidebar-projects').innerHTML = recent.length ? recent.map(project => `<a class="recent-link" href="${e(D.projectDestination(project.id))}">${icon('folder')}<span>${e(project.title)}</span></a>`).join('') : '<p class="sidebar-empty">Your recent projects will appear here.</p>';
  }
  function card(project) {
    const kind = project.files ? 'Custom website' : (kinds[project.design.kind] || 'Website');
    const count = project.history.length;
    return `<article class="project-row"><a class="project-row-main" href="${e(D.projectDestination(project.id))}" aria-label="Open ${e(project.title)}"><span class="project-file-icon">${icon('folder')}</span><span class="project-row-info"><strong>${e(project.title)}</strong><small>${kind} <span>·</span> ${count} saved version${count === 1 ? '' : 's'}</small></span><span class="project-row-date">${dateLabel(project.updatedAt)}</span><span class="project-row-state">Draft</span><span class="project-row-open" aria-hidden="true">${icon('arrow')}</span></a><button class="icon-button rename-button" data-rename="${e(project.id)}" aria-label="Rename ${e(project.title)}" title="Rename project">${icon('edit')}</button></article>`;
  }
  function empty(search = false) {
    return `<div class="empty-state">${icon(search ? 'search' : 'leaf')}<h3>${search ? 'No projects by that name.' : 'No projects yet'}</h3><p>${search ? 'Try another name or clear your search to see all your projects.' : 'Describe a website above to create your first project.'}</p>${search ? '<button class="button" id="clear-search">Clear search</button>' : '<a class="button" href="#new">Create a website '+icon('arrow')+'</a>'}</div>`;
  }
  function renderProjects() {
    $('#recent-grid').innerHTML = sortedProjects().slice(0, 3).map(card).join('') || empty();
    const query = $('#project-search').value.trim().toLocaleLowerCase();
    let items = library.projects.filter(project => project.title.toLocaleLowerCase().includes(query));
    const sort = $('#project-sort').value;
    items.sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt));
    $('#results-count').textContent = `${items.length} project${items.length === 1 ? '' : 's'}${query ? ' found' : (A.user ? ' · your projects' : ' · saved in this browser')}`;
    $('#all-projects').innerHTML = items.map(card).join('') || empty(!!query);
    $('#clear-search')?.addEventListener('click', () => { $('#project-search').value = ''; renderProjects(); $('#project-search').focus(); });
  }
  const settings = ['profile', 'preferences', 'security', 'connections', 'usage', 'billing', 'cli', 'privacy'];
  const soon = {
    security: ['lock', 'Account security', 'Account security will live here once sign-in is connected. Password changes, active sessions, and two-step verification aren’t available in this preview.', ['Account security', 'Session management']],
    connections: ['spark', 'Good things work together.', 'Connect the services that help your websites grow. Integrations will be available when the connected builder launches.', ['GitHub', 'Custom domains', 'Connected services']],
    billing: ['leaf', 'Room to grow, at your pace.', 'Plans and billing are still taking shape. This local preview has no subscription, credit balance, or payment method.', ['Plans', 'Payment methods', 'Invoices']],
    cli: ['terminal', 'CLI devices', 'Your terminal will have a place here, too. CLI device pairing and commands are on the way. There’s nothing to install or connect just yet.', ['Device pairing', 'Project access', 'Your local workflow']]
  };
  function renderSettings() {
    $$('[data-setting]').forEach(link => { if (link.dataset.setting === setting) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    let content = '';
    if (setting === 'profile') {
      content = `<section class="settings-card"><h2>Personal profile</h2><p>Manage your profile details.</p><div class="profile-summary"><span class="avatar">${e([...(preferences.name || 'D')][0].toUpperCase())}</span><div><strong>${e(preferences.name || 'Your profile')}</strong><p>Personal workspace · Saved on this device</p></div></div><form id="profile-form"><label for="display-name">Display name</label><input id="display-name" maxlength="60" autocomplete="nickname" value="${e(preferences.name)}" placeholder="What should we call you?"><small>This name appears in your workspace. It stays in this browser.</small><div class="card-actions"><span>Personal profile</span><button class="button mango-button" type="submit">Save changes ${icon('arrow')}</button></div></form></section><section class="settings-card quiet-card"><h2>Your account, coming next.</h2><p>Accounts and cloud sync aren’t connected yet. Your projects and preferences are saved locally, so you can keep exploring your workspace.</p></section>`;
    } else if (setting === 'preferences') {
      content = `<section class="settings-card"><h2>Your starting point</h2><p>Set defaults for new projects. You can change them for each website.</p><form id="preferences-form"><div class="preferences-fields"><div><label for="default-starter">Starting layout</label><select id="default-starter">${$('#starter-select').innerHTML}</select></div><div><label for="default-color">Color palette</label><select id="default-color">${$('#color-select').innerHTML}</select></div><div><label for="default-device">Builder preview size</label><select id="default-device"><option value="auto">Match this screen</option><option value="desktop">Desktop · 1280 px</option><option value="tablet">Tablet · 768 px</option><option value="mobile">Mobile · 390 px</option></select><small>Applies the next time you open a project in the builder.</small></div></div><div class="card-actions"><span>Saved just for this browser.</span><button class="button mango-button" type="submit">Save preferences ${icon('arrow')}</button></div></form></section>`;
    } else if (setting === 'connections') {
      content = '<section class="settings-card"><h2>AI connection</h2><p id="provider-status" role="status">Checking the local connection…</p><div class="privacy-details"><div><span>API key</span><strong>Kept on your local server</strong></div><div><span>Generation</span><strong>Websites and follow-up edits</strong></div></div><p>Set AI_PROVIDER=openai, OPENAI_API_KEY and OPENAI_MODEL in the .env file inside your DraftMango folder. Save the file, then check the connection.</p><div class="card-actions"><span>API usage is billed to your configured provider’s account.</span><button class="button mango-button" id="refresh-provider">Check connection</button></div></section><section class="settings-card quiet-card"><h2>Domains</h2><p>Explore domain search, order previews and connection drafts. Domain purchases and publishing are not connected yet.</p><a class="button" href="#domains">Explore domains ↗</a></section>';
    } else if (setting === 'billing') {
      content = '<section class="settings-card"><h2>Plans and billing</h2><p>Explore the Free, Basic and Pro launch plans, compare monthly and yearly billing, and see how AI credits and custom domains work.</p><div class="privacy-details"><div><span>Subscriptions</span><strong>Coming soon</strong></div><div><span>Domain registration & renewal</span><strong>Purchased separately</strong></div></div><div class="card-actions"><span>No subscription or payment method is connected in this preview.</span><a class="button mango-button" href="./pricings">Explore plans & pricing ↗</a></div></section>';
    } else if (setting === 'usage') {
      const drafts = library.projects.reduce((sum, project) => sum + project.history.length, 0);
      const messages = library.projects.reduce((sum, project) => sum + project.messages.length, 0);
      content = `<section class="settings-card"><h2>Workspace usage</h2><p>Your work in this browser, so far.</p><div class="usage-grid"><div class="usage-stat"><strong>${library.projects.length}</strong><span>Projects</span></div><div class="usage-stat"><strong>${drafts}</strong><span>Saved drafts</span></div><div class="usage-stat"><strong>${messages}</strong><span>Conversation messages</span></div></div><small>AI API usage is billed separately to your configured provider’s account. Check your provider’s console for tokens, limits and spend.</small></section>`;
    } else if (setting === 'privacy') {
      content = `<section class="settings-card"><h2>Your work stays with you</h2><p>This preview stores your projects, conversations, design history, domain drafts, and preferences in this browser. They aren’t synced to an account. When you generate or request a change, your prompt, recent conversation and website files are sent to your configured AI provider.</p><div class="privacy-details"><div><span>Project storage</span><strong>This browser only</strong></div><div><span>Account credentials</span><strong>Never saved by this preview</strong></div><div><span>Cloud sync</span><strong>Not connected</strong></div></div><div class="card-actions"><span>Download a JSON copy of your projects and preferences.</span><button class="button mango-button" id="download-data">${icon('download')}Export my data</button></div></section><section class="settings-card quiet-card"><h2>Back up your work</h2><p>Clearing browser data removes locally saved work. You can also export each website as a standalone HTML file from the builder.</p></section>`;
    } else {
      const [symbol, title, copy, features] = soon[setting];
      content = `<section class="settings-card coming-soon">${icon(symbol)}<span class="preview-badge">Coming soon</span><h2>${title}</h2><p>${copy}</p><div class="planned-features">${features.map(feature => `<span>${feature}</span>`).join('')}</div></section>`;
    }
    if (setting === 'profile') {
      const description = A.user ? 'Signed in as ' + e(A.user.email || 'your account') : 'Accounts are ready to connect. This workspace is still saved on your device.';
      content = `<section class="settings-card"><h2>Personal profile</h2><p>${description}</p><form id="profile-form"><label for="display-name">Display name</label><input id="display-name" maxlength="60" autocomplete="nickname" value="${e(preferences.name)}" placeholder="What should we call you?"><small>Your display name and preferences are saved on this device.</small><div class="card-actions"><span>Profile settings</span><button class="button mango-button" type="submit">Save changes</button></div></form><div class="account-session"><span>${A.user ? 'Your projects sync to your account.' : 'Your existing drafts stay available.'}<small>${A.user ? 'Device drafts are imported only when you choose.' : 'Sign-in becomes available once account setup is complete.'}</small></span>${A.user ? '<button class="button" id="sign-out">Sign out</button>' : '<a class="button" href="./auth.html#mode=signup">Your account →</a>'}</div></section>`;
    }
    if (setting === 'security' && A.user) content = '<section class="settings-card"><h2>Account security</h2><p>Reset your password using a secure link sent to your account email.</p><div class="card-actions"><span id="security-feedback" role="status">Open the email link in this browser.</span><button class="button mango-button" id="reset-account-password">Send password reset</button></div></section>';
    if (setting === 'privacy' && A.user) content = '<section class="settings-card"><h2>Your work stays with you.</h2><p>Your projects, files, conversations and draft history sync to your private account. This browser keeps a working copy so edits can wait safely when you are offline. Preferences and domain drafts stay on this device. AI requests send your prompt, recent conversation and website files to the configured AI provider.</p><p>Signing out ends this browser session. Device copies remain available when you sign back in to the same account.</p><div class="card-actions"><span>Keep an independent copy of your work.</span><button class="button mango-button" id="download-data">Export my data</button></div></section>';
    $('#settings-content').innerHTML = content;
    $('#sign-out')?.addEventListener('click', async event => { event.target.disabled = true; try { await A.signOut(); } catch { event.target.disabled = false; announce('Sign-out failed. Please try again.'); } });
    $('#reset-account-password')?.addEventListener('click', async event => {
      event.target.disabled = true;
      try { const result = await A.request('/api/accounts/reset', { method: 'POST', body: { email: A.user.email } }); $('#security-feedback').textContent = result.emailDelivery === 'local' ? 'The link is saved in the local development mail folder.' : 'Check your inbox for the reset link.'; }
      catch { $('#security-feedback').textContent = 'The email could not be sent. Please try again shortly.'; }
      finally { event.target.disabled = false; }
    });
    if (setting === 'connections') {
      const label = $('#provider-status');
      const check = async () => {
        label.textContent = 'Checking the local connection…';
        try {
          const response = await fetch('/api/ai/status', {cache:'no-store', signal:AbortSignal.timeout(8000)});
          if (!response.ok) throw new Error();
          const status = await response.json();
          label.textContent = status.configured ? status.name + ' configured · ' + status.model + '. Generate a website to verify access.' : 'Add your API key to .env to start building with AI.';
        } catch { label.textContent = 'Start the local server with npm run dev to use AI generation.'; }
      };
      $('#refresh-provider').addEventListener('click', check);
      check();
    }
    $('#profile-form')?.addEventListener('submit', event => { event.preventDefault(); if (savePreferences({ name: $('#display-name').value })) renderSettings(); });
    if (setting === 'preferences') {
      $('#default-starter').value = preferences.starter;
      $('#default-color').value = preferences.color;
      $('#default-device').value = preferences.device;
      $('#preferences-form').addEventListener('submit', event => {
        event.preventDefault();
        if (savePreferences({ starter: $('#default-starter').value, color: $('#default-color').value, device: $('#default-device').value })) {
          starter = preferences.starter; color = preferences.color; updateStyleLabel();
        }
      });
    }
    $('#download-data')?.addEventListener('click', () => {
      load();
      if (!storageAvailable) { announce('Browser storage is unavailable. Your saved data couldn’t be read.'); return; }
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), library, preferences, domainDrafts: globalThis.DraftmangoDomainModel.readDrafts(localStorage.getItem(A.key('domains'))) }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'draftmango-projects.json';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      announce('Your project data is ready to keep.');
    });
  }
  function closeSidebar() {
    $('#sidebar').classList.remove('is-open');
    $('#sidebar-scrim').hidden = true;
    $('#open-sidebar').setAttribute('aria-expanded', 'false');
    syncSidebarAccessibility();
  }
  function syncSidebarAccessibility() {
    $('#sidebar').inert = window.matchMedia('(max-width:760px)').matches && !$('#sidebar').classList.contains('is-open');
  }
  function route() {
    const [target, tab] = location.hash.slice(1).split('/');
    page = ['projects', 'settings', 'domains'].includes(target) ? target : 'home';
    setting = settings.includes(tab) ? tab : 'profile';
    $$('.page').forEach(section => { section.hidden = section.id !== 'page-' + page; });
    $$('[data-page]').forEach(link => { if (link.dataset.page === page) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    $('#current-page').textContent = { home: 'Workspace', projects: 'Your projects', settings: 'Settings', domains: 'Domains' }[page];
    document.title = $('#current-page').textContent + ' — Draftmango';
    const wasOpen = $('#sidebar').classList.contains('is-open');
    closeSidebar();
    if (page === 'settings') renderSettings();
    if (page === 'domains') globalThis.DraftmangoDomains?.mount(library);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (wasOpen) $('#main').focus({ preventScroll: true });
    if (target === 'new') $('#idea-input').focus({ preventScroll: true });
  }
  function updateStyleLabel() {
    $('#build-settings-label').textContent = starter === 'auto' ? 'Build settings' : kinds[starter] + ' style';
  }
  $('#idea-form').addEventListener('submit', event => {
    event.preventDefault();
    const field = $('#idea-input');
    const idea = field.value.trim();
    if (!idea) { field.setCustomValidity('Describe the website you want to build.'); field.reportValidity(); return; }
    const full = idea + (context ? '\n\nProject notes: ' + context : '');
    if (full.length > 1200) { field.setCustomValidity('Keep your idea and project notes under 1,200 characters together.'); field.reportValidity(); return; }
    location.href = D.builderDestination(full, starter, color);
  });
  $('#idea-input').addEventListener('input', event => event.target.setCustomValidity(''));
  $('#idea-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('#idea-form').requestSubmit(); } });
  $$('[data-starter]').forEach(button => button.addEventListener('click', () => {
    $('#idea-input').value = examples[button.dataset.starter];
    $('#idea-input').setCustomValidity(''); starter = button.dataset.starter; updateStyleLabel(); $('#idea-input').focus();
  }));
  $('#build-settings').addEventListener('click', () => { $('#starter-select').value = starter; $('#color-select').value = color; $('#style-dialog').showModal(); });
  $('#style-form').addEventListener('submit', event => { event.preventDefault(); starter = $('#starter-select').value; color = $('#color-select').value; updateStyleLabel(); $('#style-dialog').close(); });
  $('#add-context').addEventListener('click', () => { $('#context-input').value = context; $('#context-dialog').showModal(); });
  $('#context-form').addEventListener('submit', event => { event.preventDefault(); context = $('#context-input').value.trim(); $('#context-chip').hidden = !context; $('#idea-input').setCustomValidity(''); $('#context-dialog').close(); });
  $('#remove-context').addEventListener('click', () => { context = ''; $('#context-chip').hidden = true; $('#idea-input').setCustomValidity(''); });
  $('#project-search').addEventListener('input', renderProjects);
  $('#project-sort').addEventListener('change', renderProjects);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-rename]');
    if (!button) return;
    load(); const project = D.selectProject(library, button.dataset.rename);
    if (!project) { announce('This project is no longer available in this browser.'); renderProjects(); return; }
    renaming = project.id; $('#project-name').value = project.title; $('#project-name').setCustomValidity(''); $('#rename-dialog').showModal();
  });
  $('#rename-form').addEventListener('submit', event => {
    event.preventDefault();
    const title = $('#project-name').value.trim();
    if (!title) { $('#project-name').setCustomValidity('Give this project a name.'); $('#project-name').reportValidity(); return; }
    try {
      const latest = M.readStore(localStorage.getItem(storageKey));
      const project = D.selectProject(latest, renaming);
      if (!project) { announce('This project is no longer available.'); $('#rename-dialog').close(); return; }
      project.title = title; project.updatedAt = new Date().toISOString();
      A.saveLibrary(latest, project.id); library = latest;
      renderSidebar(); renderProjects(); $('#rename-dialog').close(); announce('Project renamed.');
    } catch { announce('This name couldn’t be saved. Browser storage is unavailable or full.'); }
  });
  $('#project-name').addEventListener('input', event => event.target.setCustomValidity(''));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
  $('#open-sidebar').addEventListener('click', () => { $('#sidebar').classList.add('is-open'); $('#sidebar-scrim').hidden = false; $('#open-sidebar').setAttribute('aria-expanded', 'true'); syncSidebarAccessibility(); $('#close-sidebar').focus(); });
  $('#close-sidebar').addEventListener('click', () => { closeSidebar(); $('#open-sidebar').focus(); });
  $('#sidebar-scrim').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', event => {
    if (!$('#sidebar').classList.contains('is-open')) return;
    if (event.key === 'Escape') { closeSidebar(); $('#open-sidebar').focus(); }
    if (event.key === 'Tab') {
      const controls = [...$('#sidebar').querySelectorAll('a,button')].filter(node => node.getClientRects().length);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    }
  });
  document.addEventListener('click', event => { if (event.target.closest('a[href="#new"]') && location.hash === '#new') { closeSidebar(); window.scrollTo({ top: 0, behavior: 'instant' }); $('#idea-input').focus(); } });
  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width:760px)').matches) closeSidebar();
    else syncSidebarAccessibility();
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('pageshow', () => { load(); renderSidebar(); renderProjects(); if (page === 'domains') globalThis.DraftmangoDomains?.mount(library); });
  window.addEventListener('storage', event => { if ([storageKey, preferencesKey, null].includes(event.key)) { load(); renderSidebar(); renderProjects(); if (page === 'settings' && setting === 'usage') renderSettings(); if (page === 'domains') globalThis.DraftmangoDomains?.mount(library); } });
  window.addEventListener('draftmango:projects', () => { load(); renderSidebar(); renderProjects(); });
  load(); starter = preferences.starter; color = preferences.color;
  updateStyleLabel(); renderSidebar(); renderProjects(); route();
})();
