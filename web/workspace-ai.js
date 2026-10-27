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
  // Re-fetch when a picker opens: saving a provider key takes effect immediately.
  function mountModelPicker(parent, {value = '', onChange = () => {}, disabled = () => false, id = 'ai-model-select'} = {}) {
    const select = document.createElement('select');
    select.id = id; select.className = 'ws-model-select'; select.setAttribute('aria-label', 'AI model');
    select.title = 'Choose the model for this conversation';
    select.add(new Option('Loading models…', '')); select.disabled = true; parent.append(select);
    let desired = value, loading = true, failed = false, pending;
    const sync = (next = desired) => {
      desired = next;
      if (!loading && !failed) {
        if (desired && !Array.from(select.options).some(option => option.value === desired)) select.add(new Option('Saved model unavailable', desired));
        select.value = desired || select.dataset.defaultId;
      }
      select.disabled = loading || failed || disabled();
    };
    async function refresh() {
      if (pending) return pending;
      pending = (async () => {
        try {
          const response = await fetch('/api/ai/models', {cache:'no-store', signal:AbortSignal.timeout(8000)});
          if (!response.ok) throw new Error('Models unavailable');
          const catalog = await response.json();
          select.replaceChildren(); select.dataset.defaultId = catalog.defaultId;
          for (const service of [...new Set(catalog.models.map(model => model.service))]) {
            const group = document.createElement('optgroup'); group.label = service;
            for (const model of catalog.models.filter(model => model.service === service)) group.append(new Option(model.label + (model.configured ? '' : ' · Add key'), model.id));
            select.append(group);
          }
          failed = false;
        } catch {
          failed = true; select.replaceChildren(new Option('Models unavailable', ''));
        } finally { loading = false; sync(); pending = null; }
      })();
      return pending;
    }
    select.onchange = () => { desired = select.value; onChange(desired); };
    select.addEventListener('focus', refresh);
    window.addEventListener('focus', () => { if (select.isConnected) refresh(); });
    refresh();
    return {select, sync, refresh};
  }
  globalThis.DraftmangoAI = {readResponse, mountModelPicker};
})();
