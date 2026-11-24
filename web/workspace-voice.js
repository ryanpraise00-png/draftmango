(() => {
  'use strict';
  let nextId = 0;
  const mic = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3.5M9 21.5h6"/></svg>';
  const errors = {
    'not-allowed': 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.',
    'service-not-allowed': 'Your browser’s speech service is unavailable. You can still type your prompt.',
    'audio-capture': 'No microphone was found. Connect one and try again.',
    'network': 'Voice input could not connect. Check your connection and try again.',
    'no-speech': 'No speech was heard. Tap the mic to try again.',
    'language-not-supported': 'Your browser does not support voice input in this language.'
  };

  function mount({button, field, form, disabled = () => false, context = () => '',
    Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition}) {
    const doc = field.ownerDocument;
    const win = doc.defaultView;
    const status = doc.createElement('p');
    status.id = 'voice-status-' + (++nextId);
    status.className = 'ws-voice-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    form.append(status);
    button.classList.add('ws-voice-button');
    button.innerHTML = mic;
    button.setAttribute('aria-describedby', status.id);
    let session = null, disposed = false, writing = false;

    function message(text) { status.textContent = text; status.hidden = !text; }
    function paint() {
      button.disabled = !!disabled();
      button.classList.toggle('is-listening', !!session);
      button.setAttribute('aria-pressed', String(!!session));
      button.setAttribute('aria-label', session ? 'Stop voice input' : 'Dictate prompt');
      button.title = session ? 'Stop voice input' : 'Dictate prompt · Uses your browser’s speech service';
      form.classList.toggle('is-dictating', !!session);
    }
    function valid(s) {
      return !disposed && session === s && field.isConnected && !disabled() && s.context === context();
    }
    function finish(text, abort = false) {
      const previous = session;
      session = null;
      if (previous) {
        clearTimeout(previous.timer);
        clearTimeout(previous.stopTimer);
        if (abort) { try { previous.recognition.abort(); } catch {} }
      }
      if (!disposed) { paint(); message(text); }
    }
    function cancel() { finish('', true); }
    function stop() {
      const s = session;
      if (!s || s.stopping) return;
      s.stopping = true;
      clearTimeout(s.timer);
      message('Finishing voice input…');
      // A disconnected speech service must never leave the composer stuck listening.
      s.stopTimer = setTimeout(() => {
        if (session === s) finish('Voice input stopped. Review your prompt before sending.', true);
      }, 3000);
      try { s.recognition.stop(); } catch { finish('Voice input stopped. Review your prompt before sending.', true); }
    }
    function start() {
      if (disposed || disabled()) return;
      if (!Recognition) {
        message('Voice input is not supported in this browser. Try a browser with speech recognition, or type your prompt.');
        return;
      }
      let recognition;
      try { recognition = new Recognition(); } catch {
        message('Voice input is unavailable in this browser. You can still type your prompt.');
        return;
      }
      const s = {recognition, context:context(), original:field.value, last:field.value, heard:false, stopping:false};
      session = s;
      recognition.lang = doc.documentElement.lang || win.navigator.language || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      paint();
      message('Starting microphone…');
      s.timer = setTimeout(stop, 60000);
      recognition.onstart = () => {
        if (!valid(s)) { if (session === s) cancel(); return; }
        if (!s.stopping) message('Listening… Tap the mic to finish.');
      };
      recognition.onresult = event => {
        if (!valid(s)) { if (session === s) cancel(); return; }
        // Another editor action may have changed the draft while recognition was pending.
        if (field.value !== s.last) { finish('Voice input stopped. Your edits are kept.', true); return; }
        const transcript = Array.from(event.results)
          .filter(result => result.isFinal)
          .map(result => result[0].transcript.trim()).filter(Boolean).join(' ');
        if (!transcript) return;
        const separator = s.original && !/\s$/.test(s.original) ? ' ' : '';
        const combined = s.original + separator + transcript;
        const limit = field.maxLength > 0 ? field.maxLength : Infinity;
        s.heard = true;
        s.last = combined.slice(0, limit);
        writing = true;
        try { field.value = s.last; field.dispatchEvent(new win.Event('input', {bubbles:true})); }
        finally { writing = false; }
        if (combined.length >= limit) { finish('Prompt length limit reached. Review your text before sending.', true); }
      };
      recognition.onerror = event => {
        if (session !== s) return;
        finish(event.error === 'aborted' ? 'Voice input stopped. Review your prompt before sending.' :
          errors[event.error] || 'Voice input did not finish. Your draft is kept; tap the mic to try again.', true);
      };
      recognition.onend = () => {
        if (session !== s) return;
        if (!valid(s)) { cancel(); return; }
        finish(s.heard ? 'Voice input added. Review your prompt before sending.' : 'No speech was heard. Tap the mic to try again.');
      };
      try { recognition.start(); } catch {
        finish('Unable to start the microphone. Check your browser permissions and try again.', true);
      }
    }
    const click = () => session ? stop() : start();
    const input = () => {
      if (writing) return;
      if (session) finish('Voice input stopped. You can keep editing your prompt.', true);
      else message('');
    };
    const submit = event => {
      if (!session) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stop();
    };
    const keydown = event => {
      if (!session) return;
      if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey && !event.isComposing)) {
        event.preventDefault(); event.stopImmediatePropagation(); stop();
      }
    };
    const hidden = () => { if (doc.hidden) cancel(); };
    button.addEventListener('click', click);
    field.addEventListener('input', input);
    form.addEventListener('submit', submit, true);
    form.addEventListener('keydown', keydown, true);
    win.addEventListener('pagehide', cancel);
    win.addEventListener('hashchange', cancel);
    doc.addEventListener('visibilitychange', hidden);
    paint();
    return {
      sync() { if (session && !valid(session)) cancel(); paint(); },
      dispose() {
        cancel(); disposed = true;
        button.removeEventListener('click', click);
        field.removeEventListener('input', input);
        form.removeEventListener('submit', submit, true);
        form.removeEventListener('keydown', keydown, true);
        win.removeEventListener('pagehide', cancel);
        win.removeEventListener('hashchange', cancel);
        doc.removeEventListener('visibilitychange', hidden);
        status.remove();
      }
    };
  }
  globalThis.DraftmangoVoice = {mount};
})();
