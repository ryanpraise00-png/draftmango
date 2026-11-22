(() => {
  'use strict';
  const M = globalThis.DraftmangoDomainModel, A = globalThis.DraftmangoAccounts;
  const e = globalThis.DraftmangoModel.escapeHtml;
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`;
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  let root, library, dialog, opener, selected, result, searchController;
  let mode = 'search', searchVersion = 0;
  const $ = selector => root?.querySelector(selector);
  const findProject = id => library.projects.find(project => project.id === id);
  const projectLabel = id => findProject(id)?.title || (id ? 'Project unavailable' : 'No project selected');
  const expired = () => !result || Date.now() >= Date.parse(result.validUntil);

  function projectOptions(value = '') {
    const missing = value && !findProject(value) ? `<option value="${e(value)}" selected disabled>Project unavailable — choose another</option>` : '';
    return '<option value="">Choose a project later</option>' + missing + library.projects.map(project => `<option value="${e(project.id)}" ${project.id === value ? 'selected' : ''}>${e(project.title)}</option>`).join('');
  }
  function notice(message, error = false) {
    const node = $('#domain-feedback'); if (!node) return;
    node.textContent = message; node.hidden = false; node.classList.toggle('is-error', error);
  }
  function getDrafts() {
    try { return M.readDrafts(localStorage.getItem(A.key('domains'))); }
    catch { notice('Browser storage is unavailable. Domain drafts cannot be saved here.', true); return []; }
  }
  function renderDrafts() {
    if (!root?.isConnected) return;
    const drafts = getDrafts();
    $('#domain-draft-count').textContent = `${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'}`;
    $('#domain-drafts').innerHTML = drafts.length ? `<div class="domain-list-heading domain-draft-grid" aria-hidden="true"><span>Domain</span><span>Project</span><span>Status</span><span></span></div>` + drafts.map(item => `<article class="domain-draft-row domain-draft-grid">
      <div class="domain-draft-name">${icon('globe')}<div><h3>${e(item.domain)}</h3><span class="domain-secondary">${item.kind === 'purchase' ? 'Purchase draft' : 'Existing domain'}</span></div></div>
      <span class="domain-project-name">${e(projectLabel(item.projectId))}</span><span class="domain-status">Not connected</span>
      <div class="domain-row-actions"><button class="button" data-review-draft="${e(item.domain)}" aria-label="Manage ${e(item.domain)}">Manage</button><button class="icon-button" data-remove-draft="${e(item.domain)}" aria-label="Remove draft for ${e(item.domain)}">${icon('close')}</button></div>
    </article>`).join('') : `<div class="domain-empty">${icon('globe')}<h3>No domains added</h3><p>Search for a new domain or add one you already own.</p><span class="domain-secondary">Saved drafts don’t reserve or register a name.</span></div>`;
  }
  function setBusy(busy) {
    const form = $('#domain-search-form'); if (!form) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = busy; button.innerHTML = busy ? 'Searching…' : `${icon('search')}Search domains`;
    form.setAttribute('aria-busy', String(busy));
  }
  function cancelSearch() { searchVersion++; searchController?.abort(); searchController = null; setBusy(false); }
  async function renderOffers(value) {
    cancelSearch(); result = null;
    const query = M.searchCandidates(value), version = searchVersion;
    $('#domain-results').hidden = true;
    $('#domain-search-error').textContent = query.error;
    $('#domain-search').setAttribute('aria-invalid', String(!!query.error));
    if (query.error) { $('#domain-search-status').textContent = ''; return; }
    setBusy(true); $('#domain-search-status').textContent = 'Checking availability and one-year prices with Name.com…';
    const controller = new AbortController(); searchController = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const headers = { 'Content-Type': 'application/json', ...await A.headers() };
      if (version !== searchVersion) return;
      const response = await fetch('/api/domains/search', { method: 'POST', headers, body: JSON.stringify({ query: query.query }), signal: controller.signal });
      const data = await response.json().catch(() => { throw new Error('The domain service returned an unreadable response. Please try again.'); });
      if (version !== searchVersion) return;
      if (!response.ok) throw new Error(data.error?.message || 'Domain search is unavailable. Please try again.');
      const candidates = new Set(query.candidates.map(item => item.domain));
      if (data.environment !== 'sandbox' || !Array.isArray(data.offers) || data.offers.length !== candidates.size ||
          new Set(data.offers.map(offer => offer?.domain)).size !== candidates.size ||
          !Number.isFinite(Date.parse(data.validUntil)) || !Number.isFinite(Date.parse(data.checkedAt)) ||
          data.offers.some(offer => !offer || !candidates.has(offer.domain) || (offer.status === 'available' &&
            ![offer.cents, offer.renewalCents].every(price => Number.isSafeInteger(price) && price >= 0)))) {
        throw new Error('The domain response was incomplete. Please try again.');
      }
      result = data; $('#domain-results').hidden = false;
      const states = { available: 'Available', unavailable: 'Unavailable', unknown: 'Not confirmed', unsupported: 'Not offered', price_unavailable: 'Price not confirmed' };
      $('#domain-offers').innerHTML = `<div class="domain-list-heading domain-offer-grid" aria-hidden="true"><span>Domain</span><span>First year</span><span>Annual renewal</span><span></span></div>` + data.offers.map(offer => {
        const available = offer.status === 'available';
        return `<article class="domain-offer domain-offer-grid"><div><h3>${e(offer.domain)}</h3><span class="domain-availability ${available ? 'is-available' : ''}">${states[offer.status] || states.unknown}${offer.premium ? ' · Premium' : ''}</span></div>
          <div class="domain-amount"><span class="domain-price-label">First year</span><strong>${available ? money(offer.cents) : '—'}</strong></div>
          <div class="domain-amount"><span class="domain-price-label">Annual renewal</span><span>${available ? money(offer.renewalCents) : '—'}</span></div>
          ${available ? `<button class="button" data-offer="${e(offer.domain)}" aria-label="Review ${e(offer.domain)}">Review ${icon('arrow')}</button>` : `<span class="domain-unavailable">${offer.status === 'unavailable' ? 'Try another name' : 'No quote available'}</span>`}</article>`;
      }).join('');
      const count = data.offers.filter(offer => offer.status === 'available').length;
      $('#domain-result-status').textContent = `${count} of ${data.offers.length} names available in the sandbox.`;
      $('#domain-search-status').textContent = `Checked at ${new Date(data.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Availability and prices are test results.`;
    } catch (error) {
      if (version !== searchVersion) return;
      $('#domain-search-status').textContent = '';
      $('#domain-search-error').textContent = controller.signal.aborted ? 'The search took too long. Please try again.' : error instanceof TypeError ? 'Couldn’t reach domain search. Check your connection and try again.' : error.message;
    } finally { clearTimeout(timer); if (version === searchVersion) { searchController = null; setBusy(false); } }
  }
  function setMode(next) {
    if (searchController) { cancelSearch(); $('#domain-search-status').textContent = ''; }
    mode = next;
    root.querySelectorAll('[data-domain-mode]').forEach(button => {
      const active = button.dataset.domainMode === mode;
      button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
    });
    $('#domain-search-panel').hidden = mode !== 'search'; $('#domain-connect-panel').hidden = mode !== 'connect';
  }
  function openDialog(content) { opener = document.activeElement; dialog.innerHTML = content; dialog.showModal(); }
  const closeButton = `<button type="button" class="icon-button" data-domain-close aria-label="Close domain details">${icon('close')}</button>`;
  const dialogHeading = title => `<div class="domain-dialog-heading"><h2 id="domain-dialog-title">${title}</h2>${closeButton}</div>`;
  const renewalField = checked => `<label class="domain-checkbox"><input id="domain-auto-renew" type="checkbox" ${checked ? 'checked' : ''}><span>Prefer automatic renewal<small>Saved as a preference. Automatic renewals are not enabled.</small></span></label>`;
  function review(offer, saved) {
    if (expired()) { notice('These test prices have expired. Search again for current availability and pricing.', true); return; }
    if (offer.status !== 'available') return;
    selected = { ...offer, kind: 'purchase' };
    openDialog(`${dialogHeading('Review domain')}<p class="domain-dialog-intro">Save this domain with a project before checkout becomes available.</p>
      <form id="domain-review-form"><div class="domain-chosen">${icon('globe')}<strong>${e(offer.domain)}</strong><span class="domain-status">Test quote</span></div>
      <div class="domain-checkout-grid"><div><label for="domain-project">Project</label><select id="domain-project">${projectOptions(saved?.projectId ?? (findProject(library.activeId) ? library.activeId : ''))}</select>${renewalField(saved?.autoRenew)}<p class="domain-secondary">Custom domains require Basic or Pro when publishing. Domain registration is billed separately.</p></div>
      <aside class="domain-order" aria-label="Domain quote"><h3>Price summary <span>USD</span></h3><dl><div><dt>Registration · 1 year</dt><dd>${money(offer.cents)}</dd></div><div><dt>Annual renewal</dt><dd>${money(offer.renewalCents)}</dd></div><div><dt>Setup & management fee</dt><dd>Included</dd></div></dl><p>Prices include Draftmango’s service fee. Tax is separate.</p><div class="domain-order-total"><span>First-year total</span><strong>${money(offer.cents)}</strong></div></aside></div>
      <p class="domain-modal-notice">Name.com sandbox. Live availability and prices will be checked again before payment.</p><p id="domain-save-message" class="domain-field-error" role="alert"></p><div class="domain-dialog-actions"><span>No payment or registration.</span><button type="button" class="button" data-domain-close>Cancel</button><button class="button primary" type="submit">Save domain draft</button></div></form>`);
  }
  function manage(draft) {
    selected = draft;
    openDialog(`${dialogHeading('Domain details')}<form id="domain-edit-form"><div class="domain-chosen">${icon('globe')}<strong>${e(draft.domain)}</strong><span class="domain-status">Not connected</span></div>
      <p class="domain-dialog-intro">${draft.kind === 'purchase' ? 'Purchase draft. This domain has not been registered or reserved.' : 'Existing domain. Your DNS settings have not been changed.'}</p>
      <label for="domain-project">Project</label><select id="domain-project">${projectOptions(draft.projectId)}</select>${draft.kind === 'purchase' ? renewalField(draft.autoRenew) : ''}
      <section class="domain-connection-status" aria-labelledby="domain-setup-heading"><h3 id="domain-setup-heading">Connection status</h3><ol class="domain-steps">
        <li><span>1</span><div><strong>${draft.kind === 'purchase' ? 'Register domain' : 'Verify ownership'}</strong><p>${draft.kind === 'purchase' ? 'Available when domain checkout launches.' : 'Available when publishing launches.'}</p></div><small>Pending</small></li>
        <li><span>2</span><div><strong>Configure DNS</strong><p>Records will be provided for your published project.</p></div><small>Waiting</small></li>
        <li><span>3</span><div><strong>Activate HTTPS</strong><p>Follows domain verification and DNS setup.</p></div><small>Waiting</small></li>
      </ol></section><p id="domain-save-message" class="domain-field-error" role="alert"></p><div class="domain-dialog-actions"><span>Saved in this browser.</span><button type="button" class="button" data-domain-close>Cancel</button><button class="button primary" type="submit">Save changes</button></div></form>`);
  }
  function confirmRemove(draft) {
    selected = draft;
    openDialog(`${dialogHeading('Remove domain draft?')}<form id="domain-remove-form"><p class="domain-dialog-intro">Remove <strong>${e(draft.domain)}</strong> from your saved drafts? Your project and any domain registered with a provider are unaffected.</p><p id="domain-save-message" class="domain-field-error" role="alert"></p><div class="domain-dialog-actions"><button type="button" class="button" data-domain-close>Cancel</button><button type="submit" class="button danger">Remove draft</button></div></form>`);
  }
  function saveDraft(draft, feedback) {
    try {
      if (draft.projectId && !findProject(draft.projectId)) throw new Error('Choose an available project or choose a project later.');
      const next = M.upsertDraft(localStorage.getItem(A.key('domains')), draft);
      localStorage.setItem(A.key('domains'), JSON.stringify(next));
    } catch (error) {
      feedback.textContent = error.message?.startsWith('You have 30') || error.message?.startsWith('Choose an available') ? error.message : 'This draft could not be saved. Browser storage may be unavailable or full.';
      return false;
    }
    renderDrafts(); notice(`${draft.domain} saved. Nothing has been purchased or connected.`); return true;
  }
  function onStorage(event) { if ([A.key('domains'), null].includes(event.key)) renderDrafts(); }
  function dispose() {
    cancelSearch(); window.removeEventListener('storage', onStorage);
    dialog?.remove(); dialog = null; root = null; opener = null; selected = null; result = null;
  }
  function mount(nextLibrary) {
    dispose(); library = nextLibrary; mode = 'search';
    root = document.querySelector('#page-domains'); if (!root) return;
    root.innerHTML = `<header class="ws-page-header"><div><h1 id="domains-title">Domains</h1><p>Find a domain, connect an existing one, and manage addresses for your projects.</p></div><a class="button" href="/pricings">View plans ${icon('external')}</a></header>
      <div class="domain-service-note">${icon('globe')}<div><strong>Domain setup is in test mode</strong><p>Search Name.com’s sandbox and save drafts. Purchases, DNS setup and publishing aren’t active yet.</p></div><span class="domain-status">Sandbox</span></div>
      <div class="domain-tabs" role="tablist" aria-label="Domain options"><button id="domain-tab-search" role="tab" type="button" data-domain-mode="search" aria-selected="true" aria-controls="domain-search-panel">${icon('search')}Find a domain</button><button id="domain-tab-connect" role="tab" type="button" data-domain-mode="connect" aria-selected="false" aria-controls="domain-connect-panel" tabindex="-1">${icon('link')}Use an existing domain</button></div>
      <section id="domain-search-panel" role="tabpanel" aria-labelledby="domain-tab-search"><h2>Find a domain</h2><p class="domain-intro">Search a name or a full domain. We currently support .com, .co, .studio and .design.</p>
      <form id="domain-search-form"><label class="sr-only" for="domain-search">Domain name</label><div class="domain-search-box"><div class="domain-search-input">${icon('globe')}<input id="domain-search" type="search" placeholder="Search for a domain, e.g. northline.com" maxlength="253" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="domain-search-error domain-search-status"></div><button class="button primary" type="submit">${icon('search')}Search domains</button></div><p id="domain-search-error" class="domain-field-error" role="alert"></p><p id="domain-search-status" class="domain-search-status" role="status"></p></form>
      <section id="domain-results" aria-labelledby="domain-results-heading" hidden><div class="domain-section-heading"><h2 id="domain-results-heading">Search results</h2><span class="domain-secondary">Test prices · USD</span></div><div id="domain-offers" class="domain-list"></div><div class="domain-results-footer"><p id="domain-result-status" role="status"></p><p>Service fee included. Tax is separate.</p></div></section></section>
      <section id="domain-connect-panel" role="tabpanel" aria-labelledby="domain-tab-connect" hidden><h2>Use an existing domain</h2><p class="domain-intro">Keep your domain with its current provider and assign it to a Draftmango project.</p><form id="domain-connect-form"><div class="domain-connect-fields"><div><label for="existing-domain">Domain name</label><input id="existing-domain" placeholder="e.g. northline.com" maxlength="253" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="domain-connect-error" required></div><div><label for="connect-project">Project</label><select id="connect-project">${projectOptions(findProject(library.activeId) ? library.activeId : '')}</select></div></div><p id="domain-connect-error" class="domain-field-error" role="alert"></p><div class="domain-connect-actions"><p>Save a draft now. Ownership verification and DNS setup will be available with publishing.</p><button class="button primary" type="submit">Save connection draft</button></div></form></section>
      <p id="domain-feedback" class="domain-feedback" role="status" hidden></p><section class="domain-draft-section" aria-labelledby="domain-drafts-title"><div class="domain-section-heading"><h2 id="domain-drafts-title">Saved domains <span id="domain-draft-count"></span></h2><span class="domain-secondary">Saved in this browser</span></div><div id="domain-drafts" class="domain-list"></div></section>
      <footer class="domain-page-footer"><div>${icon('link')}<p>Free sites use a Draftmango address. Custom domains require Basic or Pro; domain registration is purchased separately.</p></div><a href="/pricings">Compare plans ${icon('arrow')}</a></footer>`;
    dialog = document.createElement('dialog'); dialog.id = 'domain-dialog'; dialog.className = 'domain-dialog'; dialog.setAttribute('aria-labelledby', 'domain-dialog-title'); document.body.append(dialog);
    dialog.addEventListener('close', () => {
      selected = null;
      const restored = opener?.isConnected ? opener : opener?.dataset.reviewDraft ? $(`[data-review-draft="${CSS.escape(opener.dataset.reviewDraft)}"]`) : null;
      restored?.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', event => { if (event.target.closest('[data-domain-close]')) dialog.close(); });
    dialog.addEventListener('submit', event => {
      event.preventDefault(); if (!selected) return;
      const feedback = dialog.querySelector('#domain-save-message');
      if (event.target.id === 'domain-remove-form') {
        try {
          localStorage.setItem(A.key('domains'), JSON.stringify(M.readDrafts(localStorage.getItem(A.key('domains'))).filter(item => item.domain !== selected.domain)));
          const name = selected.domain; dialog.close(); renderDrafts(); notice(`${name} removed from saved drafts.`); $('#domain-drafts-title').setAttribute('tabindex', '-1'); $('#domain-drafts-title').focus({ preventScroll: true });
        } catch { feedback.textContent = 'The draft could not be removed. Browser storage is unavailable.'; }
        return;
      }
      if (event.target.id === 'domain-review-form' && expired()) { feedback.textContent = 'This quote has expired. Close this window and search again.'; return; }
      const draft = { domain: selected.domain, kind: selected.kind, projectId: dialog.querySelector('#domain-project').value, autoRenew: !!dialog.querySelector('#domain-auto-renew')?.checked };
      if (saveDraft(draft, feedback)) dialog.close();
    });
    root.addEventListener('click', event => {
      const modeButton = event.target.closest('[data-domain-mode]'); if (modeButton) setMode(modeButton.dataset.domainMode);
      const offerButton = event.target.closest('[data-offer]'); if (offerButton) { const offer = result?.offers.find(item => item.domain === offerButton.dataset.offer); if (offer) review(offer, getDrafts().find(item => item.domain === offer.domain)); }
      const reviewButton = event.target.closest('[data-review-draft]'); if (reviewButton) { const draft = getDrafts().find(item => item.domain === reviewButton.dataset.reviewDraft); if (draft) manage(draft); }
      const removeButton = event.target.closest('[data-remove-draft]'); if (removeButton) { const draft = getDrafts().find(item => item.domain === removeButton.dataset.removeDraft); if (draft) confirmRemove(draft); }
    });
    $('.domain-tabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); setMode(event.key === 'Home' ? 'search' : event.key === 'End' ? 'connect' : mode === 'search' ? 'connect' : 'search'); $(`[data-domain-mode="${mode}"]`).focus();
    });
    $('#domain-search-form').addEventListener('submit', event => { event.preventDefault(); renderOffers($('#domain-search').value); });
    $('#domain-search').addEventListener('input', () => { cancelSearch(); result = null; $('#domain-results').hidden = true; $('#domain-search').removeAttribute('aria-invalid'); $('#domain-search-error').textContent = ''; $('#domain-search-status').textContent = ''; });
    $('#domain-connect-form').addEventListener('submit', event => {
      event.preventDefault(); const domain = M.normalizeDomain($('#existing-domain').value);
      if (!domain) { $('#domain-connect-error').textContent = 'Enter a full domain like northline.com, without https://, a path or spaces.'; $('#existing-domain').setAttribute('aria-invalid', 'true'); return; }
      if (getDrafts().some(draft => draft.domain === domain)) { $('#domain-connect-error').textContent = 'This domain is already saved. Choose Manage below to update its project.'; return; }
      if (saveDraft({ domain, kind: 'connect', projectId: $('#connect-project').value, autoRenew: false }, $('#domain-connect-error'))) { $('#existing-domain').value = ''; $('#domain-connect-error').textContent = ''; }
    });
    $('#existing-domain').addEventListener('input', () => { $('#existing-domain').removeAttribute('aria-invalid'); $('#domain-connect-error').textContent = ''; });
    window.addEventListener('storage', onStorage); renderDrafts();
  }
  globalThis.DraftmangoDomains = Object.freeze({ mount, dispose });
})();
