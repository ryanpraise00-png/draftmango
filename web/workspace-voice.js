(() => {
  'use strict';
  let nextId = 0;
  const mic = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3.5M9 21.5h6"/></svg>';
  const stopIcon = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none"/></svg>';
  const waitingIcon = '<svg class="icon ws-voice-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="7" opacity=".2"/><path d="M12 5a7 7 0 0 1 7 7" stroke-linecap="round"/></svg>';
  const errors = {
    'not-allowed': 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.',
    'service-not-allowed': 'Your browser’s speech service is unavailable. You can still type your prompt.',
    'audio-capture': 'No microphone was found. Connect one and try again.',
    'network': 'Voice input could not connect. Check your connection and try again.',
    'no-speech': 'No speech was heard. Tap the mic to try again.',
    'language-not-supported': 'Your browser does not support voice input in this language.'
  };

  function mount({button, field, form, disabled = () => false, context = () => '',
    Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition,
    AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext}) {
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
    const visual = doc.createElement('span');
    visual.className = 'ws-voice-visual';
    visual.setAttribute('aria-hidden', 'true');
    visual.hidden = true;
    const wave = doc.createElement('span');
    wave.className = 'ws-voice-wave';
    const bars = Array.from({length:18}, () => {
      const bar = doc.createElement('i');
      wave.append(bar);
      return bar;
    });
    const elapsed = doc.createElement('span');
    elapsed.className = 'ws-voice-time';
    elapsed.textContent = '0:00';
    visual.append(wave, elapsed);
    button.before(visual);
    let session = null, disposed = false, writing = false;

    function message(text, attention = false) {
      status.textContent = text;
      status.hidden = !text;
      status.classList.toggle('is-visible', attention && !!text);
    }
    function paint() {
      button.disabled = !!disabled() || !!session?.stopping;
      button.classList.toggle('is-listening', !!session);
      button.setAttribute('aria-pressed', String(!!session));
      const label = session?.stopping ? 'Finishing voice input' : session ? 'Stop voice input' : 'Dictate prompt';
      button.setAttribute('aria-label', label);
      button.title = session ? label : 'Dictate prompt · Uses your browser’s speech service';
      button.innerHTML = session?.stopping || (session && !session.started) ? waitingIcon : session ? stopIcon : mic;
      visual.hidden = !session;
      visual.classList.toggle('is-waiting', !!session && (!session.started || session.stopping));
      form.classList.toggle('is-dictating', !!session);
    }
    function valid(s) {
      return !disposed && session === s && field.isConnected && !disabled() && s.context === context();
    }
    function releaseMeter(s) {
      clearInterval(s.meterTimer);
      s.stream?.getTracks().forEach(track => track.stop());
      s.stream = null;
      try { s.source?.disconnect(); } catch {}
      if (s.audio) { s.audio.close().catch(() => {}); s.audio = null; }
    }
    async function meter(s) {
      if (!AudioContext || !win.navigator.mediaDevices?.getUserMedia) return;
      try {
        // This second track is used locally for levels only; never record or upload it.
        const stream = await win.navigator.mediaDevices.getUserMedia({audio:true});
        if (!valid(s) || s.stopping) { stream.getTracks().forEach(track => track.stop()); return; }
        s.stream = stream;
        s.audio = new AudioContext();
        const analyser = s.audio.createAnalyser();
        analyser.fftSize = 256;
        s.source = s.audio.createMediaStreamSource(stream);
        s.source.connect(analyser);
        // No connection to the output speakers: avoid feedback.
        await s.audio.resume();
        if (!valid(s) || s.stopping) return;
        const samples = new Uint8Array(analyser.fftSize);
        const levels = Array(bars.length).fill(2);
        const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        s.meterTimer = setInterval(() => {
          if (!valid(s) || s.stopping) { releaseMeter(s); return; }
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((total, value) => total + ((value - 128) / 128) ** 2, 0) / samples.length);
          levels.shift();
          levels.push(2 + Math.min(1, rms * 6) * 22);
          bars.forEach((bar, i) => { bar.style.height = levels[i].toFixed(1) + 'px'; });
        }, reduced ? 250 : 80);
      } catch {
        // Speech recognition may still work without the optional level meter.
        releaseMeter(s);
      }
    }
    function finish(text, abort = false, attention = false) {
      const previous = session;
      session = null;
      if (previous) {
        releaseMeter(previous);
        clearInterval(previous.clockTimer);
        clearTimeout(previous.timer);
        clearTimeout(previous.stopTimer);
        if (abort) { try { previous.recognition.abort(); } catch {} }
      }
      if (!disposed) { paint(); message(text, attention); }
    }
    function cancel() { finish('', true); }
    function stop() {
      const s = session;
      if (!s || s.stopping) return;
      s.stopping = true;
      clearInterval(s.clockTimer);
      releaseMeter(s);
      paint();
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
        message('Voice input is not supported in this browser. Try a browser with speech recognition, or type your prompt.', true);
        return;
      }
      let recognition;
      try { recognition = new Recognition(); } catch {
        message('Voice input is unavailable in this browser. You can still type your prompt.', true);
        return;
      }
      const s = {recognition, context:context(), original:field.value, last:field.value, heard:false, stopping:false};
      session = s;
      elapsed.textContent = '0:00';
      bars.forEach(bar => { bar.style.height = '2px'; });
      recognition.lang = doc.documentElement.lang || win.navigator.language || 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      paint();
      message('Starting microphone…');
      s.timer = setTimeout(stop, 60000);
      recognition.onstart = () => {
        if (!valid(s)) { if (session === s) cancel(); return; }
        if (s.stopping || s.started) return;
        s.started = Date.now();
        paint();
        message('Listening. Press the stop button when you are done.');
        s.clockTimer = setInterval(() => {
          const seconds = Math.floor((Date.now() - s.started) / 1000);
          elapsed.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
        }, 1000);
        void meter(s);
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
        if (combined.length >= limit) { finish('Prompt length limit reached. Review your text before sending.', true, true); }
      };
      recognition.onerror = event => {
        if (session !== s) return;
        finish(event.error === 'aborted' ? 'Voice input stopped. Review your prompt before sending.' :
          errors[event.error] || 'Voice input did not finish. Your draft is kept; tap the mic to try again.', true, event.error !== 'aborted');
      };
      recognition.onend = () => {
        if (session !== s) return;
        if (!valid(s)) { cancel(); return; }
        finish(s.heard ? 'Voice input added. Review your prompt before sending.' : 'No speech was heard. Tap the mic to try again.', false, !s.heard);
      };
      try { recognition.start(); } catch {
        finish('Unable to start the microphone. Check your browser permissions and try again.', true, true);
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
        visual.remove();
      }
    };
  }
  globalThis.DraftmangoVoice = {mount};
})();
