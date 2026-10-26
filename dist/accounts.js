(() => {
  'use strict';
  const S = globalThis.DraftmangoAccountStore;
  const originalKeys = { projects: 'draftmango-workspace-v1', preferences: 'draftmango-preferences-v1', domains: 'draftmango-domain-drafts-v1' };
  let user, config, csrf = '', locked = false, syncing = false, started = false, readyPromise, timer;
  let message = 'Opening your workspace…', issue = '', remapped = {};
  const key = kind => S.key(user?.id, originalKeys[kind], 'django');
  const read = () => S.read(localStorage.getItem(key('projects')));
  const store = library => localStorage.setItem(key('projects'), JSON.stringify(library));
  const emit = () => { window.dispatchEvent(new Event('draftmango:sync')); paint(); };
  function status(next, error = '') { message = next; issue = error; emit(); }
  function redirect() {
    const params = location.pathname.endsWith('/workspace') ? new URLSearchParams(location.hash.slice(1)) : new URLSearchParams();
    params.set('mode', 'login'); location.replace('/auth#' + params);
  }
  function endSession() {
    if (locked || !started) return;
    window.dispatchEvent(new Event('draftmango:session-ended'));
    locked = true; clearTimeout(timer); redirect();
  }
  async function request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (csrf) headers['X-CSRFToken'] = csrf;
    if (user) headers['X-Draftmango-Account'] = user.id;
    const response = await fetch(path, { method, headers, credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) });
    const data = await response.json().catch(() => { throw new Error('The account service could not be reached. Please try again.'); });
    if (data.csrfToken) csrf = data.csrfToken;
    if (!response.ok) {
      if (response.status === 401 && path.startsWith('/api/projects')) endSession();
      const error = new Error(data.error?.message || 'This request could not be completed.'); error.code = data.error?.code; error.status = response.status; throw error;
    }
    return data;
  }
  async function init() {
    if (!readyPromise) readyPromise = (async () => { config = await request('/api/accounts/session'); user = config.user; })();
    return readyPromise;
  }
  function withLock(fn) { return navigator.locks ? navigator.locks.request('draftmango-sync:' + key('projects'), fn) : fn(); }
  async function protect() {
    try { await init(); }
    catch {
      const main = document.querySelector('main') || document.body;
      const note = document.createElement('section'); note.className = 'account-unavailable';
      const heading = document.createElement('h1'); heading.textContent = 'Your workspace is safe.';
      const text = document.createElement('p'); text.textContent = 'The account service is unavailable. Start Draftmango with npm run dev, then try again.';
      const button = document.createElement('button'); button.className = 'button'; button.textContent = 'Try again'; button.onclick = () => location.reload();
      note.append(heading, text, button); main.replaceChildren(note); return false;
    }
    if (!user) { redirect(); return false; }
    try {
      await withLock(async () => {
        // 1. Ask for ids and versions only. 2. Download full documents just for
        // projects this device lacks or holds at a different version.
        const summary = []; let offset = 0;
        while (true) {
          const result = await request('/api/projects?summary=1&offset=' + offset);
          const size = Number.isSafeInteger(result.pageSize) && result.pageSize > 0 ? result.pageSize : 500;
          summary.push(...result.projects); if (result.projects.length < size) break; offset += size;
        }
        const local = S.prune(read(), summary.map(row => row.id)).library;
        const stale = summary.filter(row => typeof row.id === 'string' && local.cloud[row.id]?.version !== row.version).map(row => row.id);
        const rows = [];
        for (let index = 0; index < stale.length; index += 20) {
          const query = stale.slice(index, index + 20).map(id => 'id=' + encodeURIComponent(id)).join('&');
          rows.push(...(await request('/api/projects?' + query)).projects);
        }
        const merged = S.merge(local, rows); store(merged.library); remapped = merged.remapped;
      });
      message = 'Projects synced';
    } catch { message = 'Saved on this device'; issue = 'Project storage is unavailable. Your edits stay on this device. Reload to reconnect.'; }
    started = true; paint(); if (!issue) schedule(); return true;
  }
  function saveLibrary(library, changedId) {
    if (locked || !user) throw new Error('Sign in again to save.');
    const latest = read(), changed = library.projects.find(project => project.id === changedId);
    if (changed) S.put(latest, changed);
    latest.activeId = library.activeId; store(latest);
    status('Saved on device · Sync pending', issue); schedule();
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(sync, 1000); }
  async function sync() {
    if (!user || locked || syncing) return;
    syncing = true;
    try {
      await withLock(async () => {
        const pending = read();
        for (const project of pending.projects) {
          if (locked) return;
          const meta = pending.cloud[project.id]; if (!meta.dirty) continue;
          status('Saving to your account…');
          if (new TextEncoder().encode(JSON.stringify(project)).length > 7 * 1024 * 1024) { const error = new Error('This project is too large to sync. Export a copy from the builder.'); error.code = 'too_large'; throw error; }
          const { version } = await request('/api/projects', { method: 'PUT', body: { project_id: project.id, project_document: project, expected_version: meta.version } });
          if (!Number.isSafeInteger(version) || version < 1) throw new Error('Invalid sync response');
          if (!locked) store(S.acknowledge(read(), project.id, meta.seq, version));
        }
      });
      if (!locked) {
        const pending = Object.values(read().cloud).some(entry => entry.dirty);
        status(pending ? 'Saved on device · Sync pending' : 'All projects synced'); if (pending) schedule();
      }
    } catch (error) {
      status('Saved on device · Sync paused', error.code === 'conflict' ? 'A project changed on another device. Your edits are safe here. Reopen to keep both versions.' : error.code === 'too_large' ? error.message : 'Sync is unavailable. Your edits are saved on this device. Retry when connected.');
    } finally { syncing = false; }
  }
  function paint() {
    try {
      const statusNode = document.querySelector('[data-account-status]');
      if (statusNode) { statusNode.textContent = message; statusNode.title = issue || message; }
      document.querySelectorAll('.account-link small').forEach(node => { node.textContent = 'Personal account'; });
      const notice = document.querySelector('#account-notice'); if (!notice) return;
      notice.replaceChildren(); notice.hidden = true;
      if (issue) {
        const text = document.createElement('span'); text.textContent = issue; notice.append(text); notice.hidden = false;
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'button'; retry.textContent = issue.includes('another device') ? 'Keep both versions' : 'Retry sync';
        retry.onclick = () => { if (issue.includes('another device') || issue.includes('Reload')) location.reload(); else sync(); }; notice.append(retry);
      }
      const legacy = globalThis.DraftmangoModel.readStore(localStorage.getItem(originalKeys.projects));
      if (user && legacy?.projects.length && !localStorage.getItem(key('projects') + ':imported')) {
        const text = document.createElement('span'); text.textContent = `${legacy.projects.length} project${legacy.projects.length === 1 ? ' is' : 's are'} saved on this device. Copy your projects and domain drafts into ${user.email}?`;
        const button = document.createElement('button'); button.type = 'button'; button.className = 'button mango-button'; button.textContent = 'Import device drafts'; button.onclick = importDrafts;
        notice.append(text, button); notice.hidden = false;
      }
    } catch { /* A full browser cache must not prevent export of an open project. */ }
  }
  async function importDrafts() {
    if (!user || locked) return;
    try {
      const legacy = globalThis.DraftmangoModel.readStore(localStorage.getItem(originalKeys.projects)); if (!legacy) return;
      const library = read();
      for (const project of legacy.projects) if (!library.projects.some(p => p.id === project.id)) S.put(library, project);
      store(library);
      for (const kind of ['preferences', 'domains']) {
        const original = localStorage.getItem(originalKeys[kind]);
        if (original && !localStorage.getItem(key(kind))) localStorage.setItem(key(kind), original);
      }
      localStorage.setItem(key('projects') + ':imported', 'true');
      window.dispatchEvent(new Event('draftmango:projects')); paint(); await sync();
    } catch { status('Import paused', 'The drafts could not be imported. The original device copies are unchanged.'); }
  }
  function sessionChanged() { localStorage.setItem('draftmango-session-change', crypto.randomUUID()); }
  async function checkSession() {
    if (!started || locked) return;
    try { const data = await request('/api/accounts/session'); if (data.user?.id !== user?.id) endSession(); } catch { /* Connectivity errors do not discard drafts. */ }
  }
  async function headers() { if (!user || locked) throw new Error('Sign in again to continue.'); return { 'X-Draftmango-Account': user.id }; }
  async function signOut() { await sync(); await request('/api/accounts/logout', { method: 'POST', body: {} }); sessionChanged(); location.replace('/auth#mode=login'); }
  window.addEventListener('online', sync);
  window.addEventListener('focus', checkSession);
  window.addEventListener('storage', event => { if (event.key === 'draftmango-session-change') checkSession(); else if (started && event.key === key('projects')) paint(); });
  globalThis.DraftmangoAccounts = Object.freeze({ init, protect, key, saveLibrary, sync, headers, signOut, paint, request, sessionChanged,
    get user() { return user; }, get config() { return config; }, get message() { return message; }, get issue() { return issue; }, get remapped() { return remapped; } });
})();
