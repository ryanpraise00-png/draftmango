(() => {
  const connectionError = () => new Error('The connection ended before your website was complete. Your draft is unchanged. Try again.');
  function requestError(error) {
    const result = new Error(error?.message || 'The AI could not complete this request. Your draft is unchanged.');
    result.code = error?.code;
    return result;
  }
  async function readResponse(response, onEvent = () => {}) {
    if (!response.ok || !response.headers.get('content-type')?.includes('application/x-ndjson')) {
      let result;
      try { result = await response.json(); } catch { throw connectionError(); }
      if (!response.ok || result.error) throw requestError(result.error);
      return result;
    }
    if (!response.body) throw connectionError();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) throw connectionError();
        buffer += decoder.decode(value, {stream:true});
        if (buffer.length > 8 * 1024 * 1024) throw connectionError();
        let end;
        while ((end = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0,end).trim();
          buffer = buffer.slice(end + 1);
          if (!line) continue;
          let event;
          try { event = JSON.parse(line); } catch { throw connectionError(); }
          if (event.type === 'error') throw requestError(event.error);
          if (event.type === 'result') return event.result;
          if (event.type === 'start' || event.type === 'progress') onEvent(event);
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  // The native select keeps the existing model/state contract; the visible control owns the menu.
  function mountModelPicker(parent, {value = '', onChange = () => {}, disabled = () => false, id = 'ai-model-select'} = {}) {
    const element = document.createElement('span'); element.className = 'ws-model-picker';
    const select = document.createElement('select'); select.id = id; select.hidden = true; select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true'); select.add(new Option('Loading models…', '')); select.disabled = true;
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'ws-model-select';
    trigger.setAttribute('role', 'combobox'); trigger.setAttribute('aria-label', 'AI model');
    trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id + '-options'); trigger.title = 'Choose the model for this conversation';
    const label = document.createElement('span'); label.className = 'ws-model-label'; trigger.append(label);
    element.append(select, trigger); parent.append(element);
    const menu = document.createElement('div'); menu.className = 'ws-model-menu'; menu.hidden = true;
    const heading = document.createElement('div'); heading.className = 'ws-model-menu-heading'; heading.textContent = 'Choose a model';
    const status = document.createElement('p'); status.className = 'ws-model-menu-status'; status.setAttribute('role', 'status');
    const list = document.createElement('div'); list.id = id + '-options'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'AI models');
    menu.append(heading, status, list);
    let desired = value, loading = true, failed = false, pending, opened = false, active = -1, disposed = false;
    let entries = [], rows = [], openEvents, frame = 0, typed = '', typedAt = 0;
    const lifetime = new AbortController();

    function position() {
      if (!opened) return;
      const rect = trigger.getBoundingClientRect(), viewport = window.visualViewport;
      const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      const availableBelow = Math.max(0, top + height - rect.bottom - 20), availableAbove = Math.max(0, rect.top - top - 20);
      if (rect.bottom < top || rect.top > top + height) { close(); return; }
      const below = availableBelow >= Math.min(menu.scrollHeight, 330) || availableBelow >= availableAbove;
      const limit = Math.min(380, below ? availableBelow : availableAbove);
      menu.style.width = Math.min(304, width - 24) + 'px'; menu.style.maxHeight = limit + 'px';
      menu.style.left = Math.max(left + 12, Math.min(rect.right - Math.min(304, width - 24), left + width - Math.min(304, width - 24) - 12)) + 'px';
      menu.style.top = (below ? rect.bottom + 8 : rect.top - menu.getBoundingClientRect().height - 8) + 'px';
    }
    function schedulePosition() { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); }
    function highlight(index, scroll = true) {
      active = index;
      rows.forEach((row, i) => row.dataset.active = String(i === index));
      if (rows[index]) { trigger.setAttribute('aria-activedescendant', rows[index].id); if (scroll) rows[index].scrollIntoView({block:'nearest'}); }
      else trigger.removeAttribute('aria-activedescendant');
    }
    function renderMenu() {
      const previous = entries[active]?.value;
      entries = Array.from(select.options).filter(option => option.value); rows = []; list.replaceChildren();
      status.hidden = !failed && entries.length > 0;
      status.textContent = pending ? 'Loading models…' : failed ? 'Models could not be loaded. Close and reopen to try again.' : 'No models available.';
      let group, service;
      entries.forEach((option, index) => {
        const provider = option.dataset.service || 'Saved selection';
        if (provider !== service) {
          service = provider; group = document.createElement('div'); group.className = 'ws-model-group'; group.setAttribute('role','group'); group.setAttribute('aria-label',provider);
          const title = document.createElement('div'); title.className = 'ws-model-provider'; title.textContent = provider; title.setAttribute('aria-hidden','true'); group.append(title); list.append(group);
        }
        const row = document.createElement('div'); row.id = id + '-option-' + index; row.className = 'ws-model-option'; row.setAttribute('role','option');
        row.setAttribute('aria-selected', String(option.value === select.value));
        if (option.disabled) row.setAttribute('aria-disabled','true');
        const name = document.createElement('span'); name.textContent = option.dataset.label || option.textContent; row.append(name);
        if (option.dataset.setup === 'true' || option.disabled) { const hint = document.createElement('span'); hint.className = 'ws-model-hint'; hint.textContent = option.disabled ? 'Unavailable' : 'Add key'; row.append(hint); }
        const check = document.createElementNS('http://www.w3.org/2000/svg','svg'); check.setAttribute('viewBox','0 0 24 24'); check.setAttribute('class','ws-model-check'); check.setAttribute('aria-hidden','true');
        const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','m5 12 4 4L19 6'); check.append(path); row.append(check);
        row.onpointerdown = event => event.preventDefault(); row.onpointermove = () => highlight(index, false); row.onclick = () => choose(index);
        rows.push(row); group.append(row);
      });
      position();
      const index = entries.findIndex(option => option.value === previous);
      highlight(index >= 0 ? index : entries.findIndex(option => option.value === select.value), false);
    }
    function updateTrigger() {
      const selected = select.selectedOptions[0];
      label.textContent = selected?.dataset.label || selected?.textContent || 'Choose a model';
      trigger.disabled = loading || disabled() || (!failed && select.disabled);
      if (trigger.disabled) close();
    }
    function sync(next = desired) {
      desired = next;
      if (!loading && !failed) {
        if (desired && !Array.from(select.options).some(option => option.value === desired)) { const saved = new Option('Saved model unavailable', desired); saved.disabled = true; select.add(saved); }
        select.value = desired || select.dataset.defaultId;
      }
      select.disabled = loading || failed || disabled(); updateTrigger();
      if (opened) renderMenu();
    }
    async function refresh() {
      if (pending || disposed) return pending;
      pending = (async () => {
        try {
          const response = await fetch('/api/ai/models', {cache:'no-store', signal:AbortSignal.timeout(8000)});
          if (!response.ok) throw new Error('Models unavailable');
          const catalog = await response.json();
          if (!Array.isArray(catalog.models) || !catalog.models.length || catalog.models.some(model => !model.id || !model.label || !model.service)) throw new Error('Models unavailable');
          if (disposed) return;
          select.replaceChildren(); select.dataset.defaultId = catalog.defaultId;
          for (const service of [...new Set(catalog.models.map(model => model.service))]) {
            const group = document.createElement('optgroup'); group.label = service;
            for (const model of catalog.models.filter(model => model.service === service)) {
              const option = new Option(model.label + (model.configured ? '' : ' · Add key'), model.id);
              option.dataset.label = model.label; option.dataset.service = service; option.dataset.setup = String(!model.configured); group.append(option);
            }
            select.append(group);
          }
          failed = false;
        } catch { if (!disposed) { failed = true; select.replaceChildren(new Option('Models unavailable', '')); } }
        finally { pending = null; loading = false; if (!disposed) sync(); }
      })();
      return pending;
    }
    function close() {
      opened = false; menu.hidden = true; trigger.setAttribute('aria-expanded','false'); trigger.removeAttribute('aria-activedescendant');
      openEvents?.abort(); cancelAnimationFrame(frame); typed = '';
    }
    function open() {
      if (trigger.disabled || opened) return;
      opened = true; active = -1; menu.hidden = false; document.body.append(menu); trigger.setAttribute('aria-expanded','true');
      renderMenu(); highlight(entries.findIndex(option => option.value === select.value)); refresh();
      openEvents = new AbortController(); const options = {signal:openEvents.signal};
      document.addEventListener('pointerdown', event => { if (!element.contains(event.target) && !menu.contains(event.target)) close(); }, options);
      document.addEventListener('focusin', event => { if (!element.contains(event.target) && !menu.contains(event.target)) close(); }, options);
      window.addEventListener('resize', schedulePosition, options); document.addEventListener('scroll', schedulePosition, {...options,capture:true});
      window.visualViewport?.addEventListener('resize', schedulePosition, options); window.visualViewport?.addEventListener('scroll', schedulePosition, options);
    }
    function choose(index) {
      if (!entries[index] || entries[index].disabled || disabled()) return;
      select.value = entries[index].value; close(); trigger.focus(); select.dispatchEvent(new Event('change', {bubbles:true}));
    }
    select.onchange = () => { desired = select.value; updateTrigger(); onChange(desired); };
    trigger.onclick = () => opened ? close() : open();
    trigger.onkeydown = event => {
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape') { if (opened) { event.preventDefault(); event.stopPropagation(); close(); } return; }
      if (['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)) {
        event.preventDefault(); event.stopPropagation(); const wasOpen = opened; open();
        if (event.key === 'Enter' || event.key === ' ') { if (wasOpen) choose(active); return; }
        const enabled = entries.map((option,index) => option.disabled ? -1 : index).filter(index => index >= 0);
        const current = enabled.indexOf(active);
        const index = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length];
        highlight(index ?? -1); return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); const now = Date.now(); typed = now - typedAt > 700 ? event.key : typed + event.key; typedAt = now;
        open(); const match = entries.findIndex(option => !option.disabled && (option.dataset.label || option.textContent).toLowerCase().startsWith(typed.toLowerCase()));
        if (match >= 0) highlight(match);
      }
    };
    const disabledObserver = new MutationObserver(updateTrigger); disabledObserver.observe(select, {attributes:true,attributeFilter:['disabled']});
    const removalObserver = new MutationObserver(() => { if (!element.isConnected) destroy(); }); removalObserver.observe(document.body, {childList:true,subtree:true});
    function destroy() { if (disposed) return; disposed = true; close(); menu.remove(); disabledObserver.disconnect(); removalObserver.disconnect(); lifetime.abort(); }
    window.addEventListener('focus', refresh, {signal:lifetime.signal});
    sync(); refresh();
    return {select, element, sync, refresh, destroy};
  }

  globalThis.DraftmangoAI = {readResponse, mountModelPicker};
})();
