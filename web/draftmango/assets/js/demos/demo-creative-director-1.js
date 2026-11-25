/**
 * demo-creative-director-1.js — the Creative Director demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. Hero reel — [data-custom-reel] on the hero's .swiper. Once the template
 *    carousel (carousel.js) has mounted it, the counter shows the slide on
 *    show as "02" ([data-custom-reel-current]), the progress line fills with
 *    the autoplay timer (--custom-progress on .custom-reel-progress), and
 *    every slide but the one on show is inert. Without autoplay (reduced
 *    motion) the line stays full.
 *
 * 2. Quote counter — [data-custom-counter] on a quote carousel's .swiper: the
 *    section's [data-custom-current] / [data-custom-total] follow the slide on
 *    show, and the slides out of view are inert.
 *
 * window.DraftmangoCreativeDirector1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const pad = (n) => String(n).padStart(2, '0');

    /* ------------------------------------------------------------------
       1. Hero reel
       ------------------------------------------------------------------ */
    function reel(el) {
        const scope = el.closest('section') ?? document;
        const current = scope.querySelector('[data-custom-reel-current]');
        const total = scope.querySelector('[data-custom-reel-total]');
        const line = scope.querySelector('.custom-reel-progress');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            if (current) current.textContent = pad(swiper.realIndex + 1);
        };
        const tick = (_s, _time, progress) =>
            line?.style.setProperty('--custom-progress', String(1 - progress));

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            const count = el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length;
            if (total) total.textContent = pad(count);
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', tick);
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
            swiper?.off('slideChange', sync);
            swiper?.off('autoplayTimeLeft', tick);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
            line?.style.removeProperty('--custom-progress');
        };
    }

    /* ------------------------------------------------------------------
       2. Quote counter
       ------------------------------------------------------------------ */
    function counter(el) {
        const scope = el.closest('section') ?? document;
        const current = scope.querySelector('[data-custom-current]');
        const total = scope.querySelector('[data-custom-total]');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            if (current) current.textContent = pad(swiper.realIndex + 1);
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            if (total)
                total.textContent = pad(
                    el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)').length,
                );
            swiper.on('slideChange', sync);
            sync();
        };

        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            swiper?.off('slideChange', sync);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-reel]', reel],
        ['[data-custom-counter]', counter],
    ];
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

    window.DraftmangoCreativeDirector1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
