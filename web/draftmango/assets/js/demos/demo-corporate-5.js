/**
 * demo-corporate-5.js — the Strategy Firm demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it (the first slide shows with its headline); it only adds what the
 * template carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it: the headline line and the
 *    numbered result of the slide on show are marked active (the others leave
 *    the reading order, as do the hidden slides); the result tabs move to their
 *    slide; the autoplay timer fills the active tab and the ring
 *    (--custom-progress on the section, 0–1); the pointer over the hero pauses
 *    the timer; ← / → change slide while focus is inside the hero.
 *
 * window.DraftmangoCorporate5 = { init(root), destroy(root) } for page transitions.
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
        if (!section) return null;
        const lines = [...section.querySelectorAll('.custom-hero-line')];
        const tabs = [...section.querySelectorAll('.custom-hero-tab')];
        let swiper = null;
        let watcher = null;

        const fill = (i, value) => tabs[i]?.style.setProperty('--fill', value);

        const sync = () => {
            const now = swiper.realIndex;
            section.dataset.slide = String(now);
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            lines.forEach((line, i) => {
                line.classList.toggle('is-active', i === now);
                line.toggleAttribute('aria-hidden', i !== now);
            });
            tabs.forEach((tab, i) => {
                tab.classList.toggle('is-active', i === now);
                tab.toggleAttribute('aria-current', i === now);
                // Without a timer (reduced motion) the active tab simply reads full
                fill(i, i < now || (i === now && !swiper.autoplay?.running) ? '1' : '0');
            });
            section.style.setProperty('--custom-progress', swiper.autoplay?.running ? '0' : '1');
        };

        const tick = (s, time, progress) => {
            const value = String(Math.min(1, Math.max(0, 1 - progress)));
            fill(s.realIndex, value);
            section.style.setProperty('--custom-progress', value);
        };

        const go = (event) => {
            const i = tabs.indexOf(event.currentTarget);
            if (i > -1) swiper.slideToLoop(i);
        };

        const pause = () => swiper?.autoplay?.running && swiper.autoplay.pause();
        const resume = () => swiper?.autoplay?.running && swiper.autoplay.resume();

        const keys = (event) => {
            if (event.target.closest('input, textarea, select')) return;
            if (event.key === 'ArrowLeft') swiper.slidePrev();
            else if (event.key === 'ArrowRight') swiper.slideNext();
            else return;
            event.preventDefault();
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange autoplayStart autoplayStop', sync);
            swiper.on('autoplayTimeLeft', tick);
            tabs.forEach((tab) => tab.addEventListener('click', go));
            section.addEventListener('pointerenter', pause);
            section.addEventListener('pointerleave', resume);
            section.addEventListener('keydown', keys);
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
            if (!swiper) return;
            swiper.off('slideChange autoplayStart autoplayStop', sync);
            swiper.off('autoplayTimeLeft', tick);
            tabs.forEach((tab) => tab.removeEventListener('click', go));
            section.removeEventListener('pointerenter', pause);
            section.removeEventListener('pointerleave', resume);
            section.removeEventListener('keydown', keys);
            swiper.slides.forEach((slide) => {
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

    window.DraftmangoCorporate5 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
