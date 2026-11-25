/**
 * demo-corporate-3.js — the Corporate Services demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it, every slide but the one on
 *    show is inert (its text leaves the reading order) and the progress dashes
 *    are named "Slide 2", the current one marked aria-current.
 *
 * window.DraftmangoCorporate3 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Hero slideshow
       ------------------------------------------------------------------ */
    function hero(el) {
        const dashes = el.closest('section')?.querySelector('.swiper-pagination');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            dashes?.querySelectorAll('.swiper-pagination-bullet').forEach((dash, i) => {
                dash.setAttribute('aria-label', `Slide ${i + 1}`);
                dash.toggleAttribute('aria-current', i === swiper.realIndex);
            });
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange paginationRender', sync);
            sync();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            swiper?.off('slideChange paginationRender', sync);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-hero]', hero]];
    const wired = new WeakMap(); // element → the function that stops its feature

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (wired.has(el)) continue;
                const stop = feature(el);
                if (stop) wired.set(el, stop);
            }
        }
    }

    function destroy(root = document) {
        for (const [selector] of FEATURES) {
            for (const el of within(root, selector)) {
                wired.get(el)?.();
                wired.delete(el);
            }
        }
    }

    window.DraftmangoCorporate3 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
