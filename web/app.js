(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const input = $('#idea-input');
  const form = $('#idea-form');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Idea starters are brand-neutral briefs. Every project starts from a blank site.
  const examples = {
    portfolio: 'A portfolio for an independent designer, with room for selected work, a short story and an easy way to get in touch.',
    store: 'An online store for a small independent brand, with a featured collection, simple product pages and a clear way to buy.',
    cafe: 'A website for a local business, with what it offers, opening hours, where to find it and an easy way to book or visit.'
  };
  // Briefs behind the sample sites in the gallery. The new project still starts blank.
  const samples = {
    'ember-oak': 'A website for a neighbourhood café and bakery. Warm and inviting, with a short menu, opening hours, where to find us and a way to order ahead.',
    'kiln-co': 'An online store for a small ceramics studio. Calm and modern, with a featured collection, bestselling pieces, our story and clear delivery and returns information.',
    'halden-studio': 'A portfolio for a two-person brand and interior design studio. Bold typography, a grid of selected projects, the services we offer and an easy way to get in touch.'
  };
  const surprises = [
    'A playful website for a weekend pottery club. Think buttery yellows, imperfect shapes, and a warm invitation to make something with your hands.',
    'A colorful website for a small flower shop called Little Bloom. A little joy, delivered. Soft greens, warm peach, and flowers for the just-because moments.',
    'A personal website for a writer who loves slow travel, good food, and getting a little lost. Make it feel like an illustrated journal.',
    'A sharp, confident site for a two-person architecture studio. Large photography, precise typography and a short list of selected projects.',
    'A landing page for an indie game studio announcing its first game. Moody, cinematic and built around a trailer and a wishlist button.',
    examples.store
  ];
  let lastSurprise = -1;
  let toastTimer;

  function announce(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3400);
  }

  function saveIdea() {
    try { localStorage.setItem('draftmango-homepage-idea-v1', input.value); } catch { /* Private mode still works. */ }
  }

  function focusIdea(text) {
    if (typeof text === 'string') {
      input.value = text;
      input.setCustomValidity('');
      saveIdea();
    }
    $('#idea').scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
    if (typeof text === 'string') input.setSelectionRange(input.value.length, input.value.length);
  }

  function openAccount(idea) {
    input.value = idea;
    saveIdea();
    location.href = '/auth#' + new URLSearchParams({ idea, template: 'blank' }).toString();
  }

  try {
    const saved = localStorage.getItem('draftmango-homepage-idea-v1');
    if (saved) input.value = saved.slice(0, input.maxLength);
  } catch { /* The form doesn't depend on local storage. */ }

  input.addEventListener('input', () => { input.setCustomValidity(''); saveIdea(); });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const idea = input.value.trim();
    if (!idea) {
      input.setCustomValidity('Give your idea a few words to start with.');
      input.reportValidity();
      return;
    }
    openAccount(idea);
  });
  $('#surprise').addEventListener('click', () => {
    let index = Math.floor(Math.random() * surprises.length);
    if (index === lastSurprise) index = (index + 1) % surprises.length;
    lastSurprise = index;
    focusIdea(surprises[index]);
    announce('A little inspiration. Change anything you like.');
  });
  $$('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
    focusIdea(examples[button.dataset.prompt]);
  }));
  $$('a[href="#idea"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    focusIdea();
  }));

  $$('[data-sample]').forEach((button) => button.addEventListener('click', () => {
    focusIdea(samples[button.dataset.sample]);
    announce('Brief added. Make it your own, then start building.');
  }));

  const stepMessages = ['“A flower shop for the little moments.”', '“Use softer colors and simplify the layout.”', 'Review your draft, edit the code, and export.'];
  $('#process-message').setAttribute('aria-live', 'polite');
  $$('[data-step]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-step]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    $('.process-art').dataset.scene = button.dataset.step;
    $('#process-message').textContent = stepMessages[Number(button.dataset.step)];
  }));

  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-menu');
  function closeMenu() {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
  }
  menuButton.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
  });
  $$('#mobile-menu a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => { if (event.matches) closeMenu(); });
})();
