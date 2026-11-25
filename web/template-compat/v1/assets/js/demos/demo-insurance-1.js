/**
 * demo-insurance-1.js — the Insurance demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it: every slide but the one on
 *    show is inert, the counter in the ink panel ([data-custom-now],
 *    [data-custom-label]) follows the slide (number and the slide's
 *    data-label), and the progress dashes are named "Slide 2" with
 *    aria-current on the one on show.
 *
 * window.FramoInsurance1 = { init(root), destroy(root) } for page transitions.
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
        const section = el.closest('section');
        const rail = section?.querySelector('.swiper-pagination');
        const now = section?.querySelector('[data-custom-now]');
        const label = section?.querySelector('[data-custom-label]');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            const active = swiper.slides[swiper.activeIndex];
            if (now) now.textContent = String(swiper.realIndex + 1).padStart(2, '0');
            if (label && active?.dataset.label) label.textContent = active.dataset.label;
            rail?.querySelectorAll('.swiper-pagination-bullet').forEach((dot, i) => {
                dot.setAttribute('aria-label', `Slide ${i + 1}`);
                dot.toggleAttribute('aria-current', i === swiper.realIndex);
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

    window.FramoInsurance1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
