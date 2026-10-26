(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const input = $('#idea-input');
  const form = $('#idea-form');
  const dialog = $('#preview-dialog');
  const demo = $('#demo-site');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palette = { citrus: '#f8b95a', sage: '#b8c5a2', rose: '#e4b6c1' };
  const examples = {
    cafe: {
      name: 'Slow Days', brand: 'slow days.', category: 'business', color: 'citrus',
      heading: 'Slow mornings.\nGood company.', eyebrow: 'COFFEE & A LITTLE CONNECTION.',
      copy: 'Your neighborhood coffee spot. A place to slow down, settle in, and stay a little longer.',
      image: './assets/coffee.jpg', imageAlt: 'Fresh coffee being poured into a glass coffee maker',
      prompt: 'A cozy neighborhood café called Slow Days. Warm earthy colors, beautiful coffee photography, and a welcoming place to discover our menu and story.'
    },
    portfolio: {
      name: 'Studio North', brand: 'north®', category: 'portfolio', color: 'citrus',
      heading: 'A different\npoint of view.', eyebrow: 'INDEPENDENT MINDS. ORIGINAL IDEAS.',
      copy: 'Thoughtful design with a little personality. A home for the work you love making.',
      prompt: 'A bold portfolio for my independent design studio, North. Editorial typography, playful colors, and a gallery that lets the work do the talking.'
    },
    store: {
      name: 'Form & Field', brand: 'form & field', category: 'store', color: 'sage',
      heading: 'Objects for\nthe everyday ritual.', eyebrow: 'LESS, BUT LOVELIER.',
      copy: 'A collection of thoughtful objects for the moments that make a home. Made with care. Meant to stay.',
      image: './assets/ceramics.jpg', imageAlt: 'Handcrafted ceramic plates and bowls in a studio',
      prompt: 'A calm, beautiful online store for handmade ceramics called Form & Field. Soft sage tones, considered details, and room for every piece to shine.'
    },
    custom: {
      name: 'Your first draft', brand: 'your little idea.', color: 'citrus',
      heading: 'Made of ideas.\nMade for you.', eyebrow: 'SOMETHING GOOD STARTS HERE.',
      copy: 'A fresh place for your next big thing. A little personality. A world of possibility.',
      prompt: 'A bright, welcoming website for my next big idea, with bold typography and a little unexpected personality.'
    }
  };
  const surprises = [
    examples.cafe.prompt,
    'A playful website for a weekend pottery club. Think buttery yellows, imperfect shapes, and a warm invitation to make something with your hands.',
    examples.portfolio.prompt,
    'A colorful website for a small flower shop called Little Bloom. A little joy, delivered. Soft greens, warm peach, and flowers for the just-because moments.',
    examples.store.prompt,
    'A personal website for a writer who loves slow travel, good food, and getting a little lost. Make it feel like an illustrated journal.'
  ];
  let currentIdea = '';
  let currentTemplate = 'custom';
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

  function setColor(color) {
    demo.style.setProperty('--demo-accent', palette[color]);
    $$('.color-swatch').forEach((button) => {
      const active = button.dataset.color === color;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setDevice(device) {
    demo.classList.toggle('is-mobile', device === 'mobile');
    $$('[data-device]').forEach((button) => {
      const active = button.dataset.device === device;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function showPreview(key, idea, fromPrompt = false) {
    const example = examples[key] || examples.custom;
    currentTemplate = key;
    currentIdea = idea || example.prompt;
    $('#preview-title').textContent = fromPrompt ? 'Your idea, taking shape.' : `Meet ${example.name}.`;
    $('#preview-description').textContent = fromPrompt
      ? 'Here’s a sample visual direction. Try a color or a different screen size.'
      : 'A starting point with a little personality. Try it on, then make it yours.';
    $('#demo-brand').textContent = example.brand;
    $('#demo-heading').textContent = example.heading;
    $('#demo-eyebrow').textContent = example.eyebrow;
    $('#demo-copy').textContent = example.copy;
    const art = $('#demo-art');
    art.replaceChildren();
    if (example.image) {
      const photo = document.createElement('img');
      photo.src = example.image;
      photo.alt = example.imageAlt;
      art.append(photo);
    } else {
      const star = document.createElement('span');
      star.className = 'demo-art-star';
      star.textContent = '✳';
      star.setAttribute('aria-hidden', 'true');
      const caption = document.createElement('span');
      caption.textContent = 'YOUR NEXT BIG THING.';
      art.append(star, caption);
    }
    $('#idea-summary').textContent = `Your starting point: “${currentIdea}”`;
    $('#use-idea').firstChild.textContent = 'Build with this style ';
    setColor(example.color);
    setDevice('desktop');
    dialog.showModal();
    dialog.scrollTop = 0;
    $('#close-preview').focus({ preventScroll: true });
  }

  function closestExample(idea) {
    if (/café|cafe|coffee|restaurant|bakery|food/i.test(idea)) return 'cafe';
    if (/shop|store|ceramic|product|sell|commerce/i.test(idea)) return 'store';
    if (/portfolio|designer|design studio|photograph|artist|writer/i.test(idea)) return 'portfolio';
    return 'custom';
  }

  function openAccount(idea, template, color) {
    input.value = idea;
    saveIdea();
    const start = new URLSearchParams({ idea, template });
    if (color) start.set('color', color);
    location.href = '/auth#' + start.toString();
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
    openAccount(idea, closestExample(idea));
  });
  $('#surprise').addEventListener('click', () => {
    let index = Math.floor(Math.random() * surprises.length);
    if (index === lastSurprise) index = (index + 1) % surprises.length;
    lastSurprise = index;
    focusIdea(surprises[index]);
    announce('A little inspiration. Change anything you like.');
  });
  $$('[data-prompt]').forEach((button) => button.addEventListener('click', () => {
    focusIdea(examples[button.dataset.prompt].prompt);
  }));
  $$('a[href="#idea"]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    focusIdea();
  }));

  $$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    $$('[data-filter]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    $$('.template-item').forEach((item) => {
      const show = filter === 'all' || item.dataset.category === filter;
      item.hidden = !show;
      if (show) count++;
    });
    $('#filter-status').textContent = `Showing ${count} ${filter === 'all' ? '' : filter + ' '}example website${count === 1 ? '' : 's'}.`;
  }));
  $$('[data-template]').forEach((button) => button.addEventListener('click', () => {
    showPreview(button.dataset.template);
  }));
  $('#close-preview').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  $$('[data-device]').forEach((button) => button.addEventListener('click', () => setDevice(button.dataset.device)));
  $$('[data-color]').forEach((button) => button.addEventListener('click', () => setColor(button.dataset.color)));
  $('#use-idea').addEventListener('click', () => {
    openAccount(currentIdea, currentTemplate, $('.color-swatch.is-active')?.dataset.color);
  });

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
