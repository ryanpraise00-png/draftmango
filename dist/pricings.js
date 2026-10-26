(() => {
  'use strict';
  const P = globalThis.DraftmangoPricing;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  let cadence = 'monthly', opener;
  const dialog = $('#plan-dialog');
  function setCadence(next) {
    cadence = next === 'yearly' ? 'yearly' : 'monthly';
    $$('[data-billing]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.billing === cadence)));
    for (const id of ['basic', 'pro']) {
      const q = P.quote(id, cadence);
      $(`[data-price="${id}"]`).textContent = money(q.monthlyEquivalent);
      $(`[data-billing-note="${id}"]`).textContent = cadence === 'yearly' ? `${money(q.amount)} billed yearly · Save ${money(q.annualSavings)}/year.` : `${money(q.amount)} billed monthly.`;
    }
    $$('[data-free-signup]').forEach(link => { link.href = P.quote('free', cadence).signup; });
    $('#billing-context').textContent = cadence === 'yearly' ? 'One yearly payment. Your AI credits still refresh monthly.' : 'Pay monthly, or save with yearly billing.';
    $('#pricing-status').textContent = cadence === 'yearly' ? 'Yearly billing selected. Basic: 120 dollars per year. Pro: 360 dollars per year.' : 'Monthly billing selected. Basic: 15 dollars per month. Pro: 39 dollars per month.';
  }
  $$('[data-billing]').forEach(button => button.addEventListener('click', () => setCadence(button.dataset.billing)));
  $$('[data-plan]').forEach(button => button.addEventListener('click', () => {
    const q = P.quote(button.dataset.plan, cadence);
    $('#selected-plan').textContent = q.name;
    $('#selected-amount').textContent = money(q.amount);
    $('#selected-cadence').textContent = cadence === 'yearly' ? `Billed yearly · ${money(q.monthlyEquivalent)}/month equivalent` : 'Billed monthly';
    $('#selected-credits').textContent = `${q.credits.toLocaleString('en-US')} / month`;
    $('#selected-sites').textContent = String(q.sites);
    $('#selected-note').textContent = cadence === 'yearly' ? `Annual total: ${money(q.amount)} before applicable tax. Credits refresh monthly. No payment is collected in this preview.` : 'No payment is collected in this preview. Prices exclude applicable tax.';
    $('#continue-plan').href = q.signup;
    opener = button; dialog.showModal();
  }));
  $('#close-plan').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
  const menuButton = $('.menu-toggle'), menu = $('#mobile-menu');
  function closeMenu() { menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); }
  menuButton.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  window.addEventListener('resize', () => { if (window.matchMedia('(min-width:901px)').matches) closeMenu(); });
  setCadence('monthly');
})();
