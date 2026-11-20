/**
 * demo-illustrator-1.js — the Illustrator demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template gallery filter cannot say by
 * itself.
 *
 * 1. Filter from the address — a link to the Work page with #book-covers,
 *    #packaging, #murals, #editorial or #prints (the menu's Work sub-items)
 *    presses the pill whose data-hash matches and brings the gallery into
 *    view; a later change of the hash on the same page does the same.
 *
 * window.FramoIllustrator1 = { init(root) } for page transitions.
 */
(() => {
    'use strict';

    /* ------------------------------------------------------------------
       1. Filter from the address
       ------------------------------------------------------------------ */
    function applyHash(root = document) {
        const hash = decodeURIComponent(location.hash.slice(1));
        if (!hash) return;
        const pill = root.querySelector(`.gallery-filter[data-hash="${CSS.escape(hash)}"]`);
        if (!pill) return;
        pill.click();
        const block = pill.closest('[data-gallery-filter]');
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        requestAnimationFrame(() =>
            block?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
        );
    }

    function init(root = document) {
        if (!root.querySelector('.gallery-filter[data-hash]')) return;
        // The template wires the pills on DOMContentLoaded; wait a frame so the click lands on a live filter
        requestAnimationFrame(() => applyHash(root));
    }

    window.addEventListener('hashchange', () => applyHash());

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();

    window.FramoIllustrator1 = { init };
})();
