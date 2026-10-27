(async () => {
  'use strict';
  const A = globalThis.DraftmangoAccounts, D = globalThis.DraftmangoDashboard;
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(location.hash.slice(1));
  const flow = params.get('flow'), uid = params.get('uid'), token = params.get('token');
  const form = $('#auth-form'), email = $('#email'), password = $('#password'), feedback = $('#auth-feedback');
  let mode = 'login', step = 'email', busy = true, connected = false;
  const views = {
    login: ['Welcome ', 'back', 'Sign in to Draftmango to continue your conversations and saved projects.', 'Don’t have an account?', 'Sign up'],
    signup: ['Create an ', 'account', 'Build websites and software with AI in your Draftmango workspace.', 'Already have an account?', 'Sign in'],
    reset: ['Reset your ', 'password', 'Enter your email address to request a password reset link.', 'Remember your password?', 'Log in'],
    recovery: ['Set a new ', 'password', 'Choose a new password for your Draftmango account.', 'Back to sign in?', 'Log in']
  };
  function hidePassword() { password.type = 'password'; $('#toggle-password').setAttribute('aria-label', 'Show password'); $('#toggle-password').setAttribute('aria-pressed', 'false'); $('#toggle-password use').setAttribute('href', '#eye'); }
  function render() {
    const view = views[mode], passwordStep = step === 'password' || mode === 'recovery';
    const accent = document.createElement('em'); accent.textContent = passwordStep ? 'password' : view[1];
    $('#form-title').replaceChildren(document.createTextNode(passwordStep ? (mode === 'login' ? 'Enter your ' : 'Create a ') : view[0]), accent);
    $('#form-intro').textContent = passwordStep && mode !== 'recovery' ? (mode === 'signup' ? 'Choose a password to secure your Draftmango account.' : 'Enter your password to open your workspace.') : view[2];
    document.title = $('#form-title').textContent + ' | Draftmango';
    $('#email-field').hidden = passwordStep; email.disabled = passwordStep || busy;
    $('#email-summary').hidden = !passwordStep || mode === 'recovery'; $('#entered-email').textContent = email.value.trim();
    $('#password-field').hidden = !passwordStep; password.disabled = !passwordStep || busy;
    password.minLength = ['signup', 'recovery'].includes(mode) ? 8 : 1;
    password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    $('#password-hint').hidden = mode === 'login'; $('#forgot-password').hidden = mode !== 'login' || !passwordStep;
    $('#submit-auth').textContent = busy ? 'Please wait…' : mode === 'reset' ? 'Send reset link' : mode === 'recovery' ? 'Save new password' : 'Continue';
    $('#submit-auth').disabled = busy || !connected;
    $('#switch-copy').textContent = view[3]; $('#switch-mode').textContent = view[4];
    for (const id of ['switch-mode', 'change-email', 'forgot-password']) $('#' + id).disabled = busy;
    $('#social-options').hidden = passwordStep || !['login', 'signup'].includes(mode);
    $('#signup-terms').hidden = mode !== 'signup';
    form.setAttribute('aria-busy', String(busy));
  }
  function setMode(next, updateUrl = true) {
    mode = ['login', 'signup', 'reset'].includes(next) ? next : 'login'; step = 'email'; password.value = ''; feedback.hidden = true; hidePassword(); render();
    if (updateUrl) { params.set('mode', mode); history.replaceState(null, '', location.pathname + '#' + params); }
  }
  function showFeedback(text, error = false) { feedback.textContent = text; feedback.hidden = false; feedback.classList.toggle('is-error', error); feedback.focus({ preventScroll: true }); }
  function intent() {
    const safe = new URLSearchParams();
    for (const key of ['idea', 'template', 'color', 'project', 'plan', 'billing']) if (params.has(key)) safe.set(key, params.get(key).slice(0, 1200));
    return safe;
  }
  function destination() {
    const current = intent(), saved = sessionStorage.getItem('draftmango-auth-intent');
    const selected = current.size ? current : new URLSearchParams(saved || '');
    sessionStorage.removeItem('draftmango-auth-intent');
    if (selected.has('plan')) sessionStorage.setItem('draftmango-plan-interest', JSON.stringify({ plan: selected.get('plan'), billing: selected.get('billing') }));
    return D.accountDestination(selected);
  }
  function delivery(result, purpose) {
    return result.emailDelivery === 'local' ? `${purpose} links are saved in the local development mail folder. Email delivery will be connected before launch.` : purpose === 'Verification' ? 'Check your inbox to confirm your email, then sign in.' : 'If this email has an account, a reset link is on its way. Check your inbox and spam folder.';
  }
  async function resend() {
    if (!email.value.trim()) return;
    busy = true; render();
    try { showFeedback(delivery(await A.request('/api/accounts/resend-verification', { method: 'POST', body: { email: email.value.trim() } }), 'Verification')); }
    catch (error) { showFeedback(error.message, true); }
    finally { busy = false; render(); }
  }
  $('.skip-link').addEventListener('click', event => { event.preventDefault(); $('#account').focus(); });
  $('#switch-mode').addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
  $('#change-email').addEventListener('click', () => { step = 'email'; password.value = ''; feedback.hidden = true; render(); email.focus(); });
  $('#forgot-password').addEventListener('click', () => { setMode('reset'); email.focus(); });
  $('#toggle-password').addEventListener('click', () => {
    const visible = password.type === 'password'; password.type = visible ? 'text' : 'password';
    $('#toggle-password').setAttribute('aria-label', visible ? 'Hide password' : 'Show password'); $('#toggle-password').setAttribute('aria-pressed', String(visible)); $('#toggle-password use').setAttribute('href', visible ? '#eye-off' : '#eye');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !connected) return;
    if (!['reset', 'recovery'].includes(mode) && step === 'email') { step = 'password'; feedback.hidden = true; render(); password.focus(); return; }
    const data = mode === 'recovery' ? { uid, token, password: password.value } : { email: email.value.trim(), ...(mode === 'reset' ? {} : { password: password.value }) };
    busy = true; feedback.hidden = true; render();
    try {
      if (intent().size) sessionStorage.setItem('draftmango-auth-intent', intent().toString());
      const result = await A.request('/api/accounts/' + (mode === 'recovery' ? 'reset-confirm' : mode), { method: 'POST', body: data });
      if (mode === 'reset') showFeedback(delivery(result, 'Password reset'));
      else if (mode === 'signup' && result.confirmationRequired) showFeedback(delivery(result, 'Verification'));
      else if (mode === 'recovery') { A.sessionChanged(); setMode('login'); showFeedback('Your password is updated. Sign in with your new password.'); }
      else { A.sessionChanged(); location.replace(destination()); }
    } catch (error) {
      showFeedback(error.message || 'The connection failed. Please try again.', true);
      if (error.code === 'email_not_confirmed' || error.code === 'email_delivery') {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button'; button.textContent = 'Send a new confirmation link'; button.onclick = resend; feedback.append(document.createElement('br'), button);
      }
    } finally { data.password = ''; password.value = ''; hidePassword(); busy = false; render(); }
  });
  window.addEventListener('pagehide', () => { password.value = ''; form.reset(); });
  window.addEventListener('hashchange', () => { if (!busy) setMode(new URLSearchParams(location.hash.slice(1)).get('mode'), false); });
  setMode(params.get('mode'), false);
  try {
    await A.init(); connected = true; $('.preview-badge').textContent = 'Draftmango account';
    if (flow) {
      for (const name of ['flow', 'uid', 'token']) params.delete(name);
      history.replaceState(null, '', location.pathname + '#' + params);
      if (flow === 'recovery' && uid && token) { mode = 'recovery'; step = 'password'; }
      else if (flow === 'verify') { await A.request('/api/accounts/verify', { method: 'POST', body: { uid, token } }); showFeedback('Your email is confirmed. You can sign in now.'); }
    } else if (A.user) { location.replace(destination()); return; }
  } catch (error) { showFeedback(error.message || 'The account service is unavailable. Start Draftmango with npm run dev.', true); }
  finally { busy = false; render(); }
})();
