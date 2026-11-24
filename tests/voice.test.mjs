import test from 'node:test';
import assert from 'node:assert/strict';
import '../web/workspace-voice.js';

class Element extends EventTarget {
  value = ''; maxLength = 12000; isConnected = true; disabled = false;
  style = {};
  attrs = new Map(); classes = new Set(); children = [];
  classList = {
    add: name => this.classes.add(name),
    toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
  };
  setAttribute(name, value) { this.attrs.set(name, value); }
  append(...children) { this.children.push(...children); }
  before(child) { this.beforeElement = child; }
  remove() { this.isConnected = false; }
}

function setup(t, {initial = '', supported = true, length = 12000, AudioContext = null} = {}) {
  const win = new EventTarget();
  win.Event = Event; win.navigator = {language:'en-US'};
  const doc = new EventTarget();
  doc.defaultView = win; doc.documentElement = {lang:'en'};
  doc.createElement = () => new Element();
  const field = new Element(), button = new Element(), form = new Element();
  field.ownerDocument = doc; field.value = initial; field.maxLength = length;
  const instances = [];
  class Recognition {
    starts = 0; stops = 0; aborts = 0;
    constructor() { instances.push(this); }
    start() { this.starts++; }
    stop() { this.stops++; }
    abort() { this.aborts++; }
    result(...words) {
      this.onresult({results:words.map(transcript => Object.assign([{transcript}], {isFinal:true}))});
    }
  }
  let busy = false, project = 'first', inputEvents = 0, submitted = 0;
  field.addEventListener('input', () => inputEvents++);
  const voice = globalThis.DraftmangoVoice.mount({button, field, form,
    Recognition:supported ? Recognition : null, AudioContext, disabled:() => busy, context:() => project});
  form.addEventListener('submit', () => submitted++);
  t.after(() => voice.dispose());
  return {field, button, form, win, doc, voice, instances,
    get visual() { return button.beforeElement; },
    get announcement() { return form.children[0]; },
    get status() { return form.children[0].textContent; },
    get inputEvents() { return inputEvents; }, get submitted() { return submitted; },
    click() { button.dispatchEvent(new Event('click')); },
    busy(value) { busy = value; voice.sync(); },
    project(value) { project = value; voice.sync(); }};
}

test('recording begins only on click and appends complete speech without duplicating results or submitting', t => {
  const ui = setup(t, {initial:'A café site.'});
  assert.equal(ui.instances.length, 0);
  ui.click();
  const r = ui.instances[0];
  assert.equal(r.starts, 1);
  r.onstart();
  assert.match(ui.status, /Listening/);
  assert.equal(ui.button.attrs.get('aria-pressed'), 'true');
  r.result('Warm colours.');
  r.result('Warm colours.', 'Include a menu.');
  assert.equal(ui.field.value, 'A café site. Warm colours. Include a menu.');
  assert.equal(ui.inputEvents, 2);
  r.onend();
  assert.equal(ui.button.attrs.get('aria-pressed'), 'false');
  assert.match(ui.status, /Review/);
  assert.equal(ui.submitted, 0);
});

test('Send and Enter finish dictation without submitting; the user can send after review', t => {
  const ui = setup(t); ui.click();
  const r = ui.instances[0]; r.result('A flower shop');
  const enter = new Event('keydown', {cancelable:true});
  Object.defineProperty(enter, 'key', {value:'Enter'});
  ui.form.dispatchEvent(enter);
  assert.equal(enter.defaultPrevented, true);
  assert.equal(r.stops, 1);
  const send = new Event('submit', {cancelable:true}); ui.form.dispatchEvent(send);
  assert.equal(send.defaultPrevented, true); assert.equal(ui.submitted, 0);
  r.result('A flower shop with delivery'); r.onend();
  assert.equal(ui.field.value, 'A flower shop with delivery');
  ui.form.dispatchEvent(new Event('submit', {cancelable:true}));
  assert.equal(ui.submitted, 1);
});

test('manual editing cancels listening and late recognition cannot overwrite the draft', t => {
  const ui = setup(t); ui.click(); const r = ui.instances[0]; r.result('Flowers');
  ui.field.value = 'My own revised brief'; ui.field.dispatchEvent(new Event('input'));
  assert.equal(r.aborts, 1); r.result('A late result');
  assert.equal(ui.field.value, 'My own revised brief');
});

test('changes made by other composer actions are preserved even without an input event', t => {
  const ui = setup(t); ui.click(); const r = ui.instances[0];
  ui.field.value = 'Please review src/App.jsx'; r.result('Late speech');
  assert.equal(ui.field.value, 'Please review src/App.jsx'); assert.equal(r.aborts, 1);
});

test('permission denial and no speech restore an editable composer and preserve its draft', t => {
  const ui = setup(t, {initial:'Keep this'}); ui.click();
  ui.instances[0].onerror({error:'not-allowed'});
  assert.match(ui.status, /blocked/); assert.equal(ui.field.value, 'Keep this');
  assert.equal(ui.button.attrs.get('aria-pressed'), 'false');
  ui.click(); ui.instances[1].onend();
  assert.match(ui.status, /No speech/); assert.equal(ui.field.value, 'Keep this');
});

test('unsupported browsers explain the fallback without attempting capture', t => {
  const ui = setup(t, {supported:false}); ui.click();
  assert.match(ui.status, /not supported/); assert.equal(ui.instances.length, 0);
});

test('navigation, project changes, hiding the page and generation stop microphone access', t => {
  for (const change of [ui => ui.project('second'), ui => ui.busy(true),
    ui => ui.win.dispatchEvent(new Event('hashchange')),
    ui => { ui.doc.hidden = true; ui.doc.dispatchEvent(new Event('visibilitychange')); }]) {
    const ui = setup(t, {initial:'Original'}); ui.click(); const r = ui.instances[0];
    change(ui); r.result('Old transcript');
    assert.equal(r.aborts, 1); assert.equal(ui.field.value, 'Original');
    assert.equal(ui.button.attrs.get('aria-pressed'), 'false');
  }
});

test('prompt length is enforced and capture ends at the limit', t => {
  const ui = setup(t, {initial:'Shop', length:12}); ui.click(); const r = ui.instances[0];
  r.result('for flowers and plants');
  assert.equal(ui.field.value, 'Shop for flo'); assert.equal(r.aborts, 1);
  assert.match(ui.status, /length limit/);
});

test('dispose stops capture and removes listeners; stale callbacks cannot change a new draft', t => {
  const ui = setup(t); ui.click(); const r = ui.instances[0];
  ui.voice.dispose(); ui.field.value = 'Next draft';
  r.result('stale'); r.onend(); ui.click();
  assert.equal(ui.field.value, 'Next draft'); assert.equal(ui.instances.length, 1);
  assert.equal(r.aborts, 1);
});

test('stop times out safely if the speech service never emits an end event', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const ui = setup(t); ui.click(); const r = ui.instances[0];
  r.result('Keep the recognised words');
  t.mock.timers.tick(60000);
  assert.equal(r.stops, 1);
  t.mock.timers.tick(3000);
  assert.equal(r.aborts, 1);
  assert.equal(ui.button.attrs.get('aria-pressed'), 'false');
  assert.equal(ui.field.value, 'Keep the recognised words');
});

test('recording uses a waveform and stop icon with only accessible status text; errors remain visible', t => {
  const ui = setup(t);
  assert.equal(ui.visual.hidden, true);
  ui.click(); ui.instances[0].onstart();
  assert.equal(ui.visual.hidden, false);
  assert.equal(ui.visual.attrs.get('aria-hidden'), 'true');
  assert.match(ui.button.innerHTML, /width="12"/);
  assert.match(ui.status, /Listening/);
  assert.equal(ui.announcement.classes.has('is-visible'), false);
  ui.instances[0].result('Warm café'); ui.instances[0].onend();
  assert.equal(ui.visual.hidden, true);
  assert.equal(ui.announcement.classes.has('is-visible'), false);
  ui.click(); ui.instances[1].onerror({error:'not-allowed'});
  assert.equal(ui.announcement.classes.has('is-visible'), true);
});

function audioFake() {
  const track = {stops:0, stop() { this.stops++; }};
  const stream = {getTracks:() => [track]};
  const state = {level:128, contexts:[], requests:0};
  class AudioContext {
    closed = 0; disconnected = 0;
    constructor() { state.contexts.push(this); }
    createAnalyser() { return {getByteTimeDomainData:array => array.fill(state.level)}; }
    createMediaStreamSource() { return {connect() {}, disconnect:() => this.disconnected++}; }
    resume() { return Promise.resolve(); }
    close() { this.closed++; return Promise.resolve(); }
  }
  return {track, stream, state, AudioContext};
}

test('waveform reflects sampled microphone levels and releases tracks immediately when stopped', async t => {
  t.mock.timers.enable({apis:['setTimeout','setInterval']});
  const audio = audioFake(), ui = setup(t, audio);
  ui.win.navigator.mediaDevices = {getUserMedia:async () => { audio.state.requests++; return audio.stream; }};
  assert.equal(audio.state.requests, 0);
  ui.click(); const r = ui.instances[0]; r.onstart();
  await new Promise(setImmediate);
  const bars = ui.visual.children[0].children;
  t.mock.timers.tick(80);
  assert.equal(bars.at(-1).style.height, '2.0px');
  audio.state.level = 145;
  t.mock.timers.tick(80);
  assert.ok(parseFloat(bars.at(-1).style.height) > 10);
  assert.equal(audio.state.requests, 1);
  ui.click();
  assert.equal(audio.track.stops, 1);
  assert.equal(audio.state.contexts[0].closed, 1);
  assert.equal(ui.button.attrs.get('aria-label'), 'Finishing voice input');
  const heights = bars.map(bar => bar.style.height);
  t.mock.timers.tick(160);
  assert.deepEqual(bars.map(bar => bar.style.height), heights);
  r.result('A shop'); r.onend();
  assert.equal(ui.field.value, 'A shop');
  assert.equal(ui.visual.hidden, true);
  assert.equal(ui.submitted, 0);
});

test('microphone permission resolving after cancellation releases the late track without starting audio', async t => {
  const audio = audioFake(), ui = setup(t, audio);
  let grant;
  ui.win.navigator.mediaDevices = {getUserMedia:() => new Promise(resolve => { grant = resolve; })};
  ui.click(); ui.instances[0].onstart(); ui.project('second');
  grant(audio.stream); await new Promise(setImmediate);
  assert.equal(audio.track.stops, 1);
  assert.equal(audio.state.contexts.length, 0);
  assert.equal(ui.visual.hidden, true);
});

test('an unavailable level meter does not interrupt speech recognition', async t => {
  const audio = audioFake(), ui = setup(t, audio);
  ui.win.navigator.mediaDevices = {getUserMedia:async () => { throw new Error('meter unavailable'); }};
  ui.click(); const r = ui.instances[0]; r.onstart();
  await new Promise(setImmediate);
  assert.equal(ui.button.attrs.get('aria-label'), 'Stop voice input');
  r.result('My typed prompt'); r.onend();
  assert.equal(ui.field.value, 'My typed prompt');
  assert.equal(ui.announcement.classes.has('is-visible'), false);
});

test('navigation, generation and disposal each release active waveform resources', async t => {
  for (const change of [ui => ui.project('second'), ui => ui.busy(true), ui => ui.voice.dispose()]) {
    const audio = audioFake(), ui = setup(t, audio);
    ui.win.navigator.mediaDevices = {getUserMedia:async () => audio.stream};
    ui.click(); ui.instances[0].onstart(); await new Promise(setImmediate);
    change(ui);
    assert.equal(audio.track.stops, 1);
    assert.equal(audio.state.contexts[0].closed, 1);
    assert.equal(audio.state.contexts[0].disconnected, 1);
  }
});
