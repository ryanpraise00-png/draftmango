/**
 * demo-activewear-store-1.js — the Activewear Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it: the hero is the template carousel (carousel.js: fade, autoplay,
 * arrows, the activity tabs as its data-thumbs rail with the timer fill), and
 * the Women set shows in the Shop mega and the hero tiles.
 *
 * Women | Men switch — every [data-aw-show] button (the bar, the tablet copy in
 * the shop actions, the phone panel, the Shop mega) picks the set: the buttons
 * of that set get .is-active + aria-pressed (tabs.js slides the capsule pill),
 * the [data-aw-pane] panes of that set get .is-active (the template's
 * .tabs-panel crossfade; an inactive pane is hidden, so it takes no focus).
 * The choice is remembered for the visitor's next page (localStorage, when it
 * is there). The Best Sellers capsule on the Home is one more set of buttons.
 *
 * Leggings by fit — [data-aw-fit]: the rise and length radios (template option
 * pills) dim the cards whose data-cat lacks the picked words (.is-dim) and
 * count the rest into [data-aw-fit-count]. "Any" (value "") matches all.
 *
 * Bag count — an add-to-cart on a product card in the page (the template's
 * cart-added event) adds one to $store.cart.extra / extraTotal, which the
 * mini cart adds to its own lines (x-effect in _mini-cart.html).
 *
 * window.FramoActivewearStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const KEY = 'framo-activewear-for';
    const SETS = ['women', 'men'];

    const read = () => {
        try {
            return localStorage.getItem(KEY);
        } catch {
            return null;
        }
    };
    const write = (set) => {
        try {
            localStorage.setItem(KEY, set);
        } catch {
            /* private mode: the page still switches */
        }
    };

    function show(set, root = document) {
        if (!SETS.includes(set)) return;
        root.querySelectorAll('[data-aw-show]').forEach((btn) => {
            const on = btn.dataset.awShow === set;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', String(on));
        });
        root.querySelectorAll('[data-aw-pane]').forEach((pane) => {
            pane.classList.toggle('is-active', pane.dataset.awPane === set);
        });
        document.documentElement.dataset.awFor = set;
    }

    function onClick(e) {
        const btn = e.target.closest?.('[data-aw-show]');
        if (!btn) return;
        show(btn.dataset.awShow);
        write(btn.dataset.awShow);
    }

    function fit(box) {
        const picks = [...box.querySelectorAll('input:checked')]
            .map((input) => input.value)
            .filter(Boolean);
        const cards = [...box.querySelectorAll('[data-product]')];
        let n = 0;
        for (const card of cards) {
            const words = (card.dataset.cat ?? '').split(' ');
            const on = picks.every((pick) => words.includes(pick));
            card.classList.toggle('is-dim', !on);
            if (on) n++;
        }
        const count = box.querySelector('[data-aw-fit-count]');
        if (count) count.textContent = String(n);
    }

    function onChange(e) {
        const box = e.target.closest?.('[data-aw-fit]');
        if (box) fit(box);
    }

    function onAdded(e) {
        const cart = window.Alpine?.store('cart');
        const item = e.target.closest?.('main [data-product]');
        if (!item || !cart) return;
        cart.extra = (cart.extra ?? 0) + 1;
        cart.extraTotal = (cart.extraTotal ?? 0) + (Number(item.dataset.price) || 0);
    }

    function init(root = document) {
        const saved = read();
        if (saved && saved !== 'women') show(saved, root);
        root.querySelectorAll('[data-aw-fit]').forEach(fit);
    }

    function destroy() {}

    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('cart-added', onAdded);

    window.FramoActivewearStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
