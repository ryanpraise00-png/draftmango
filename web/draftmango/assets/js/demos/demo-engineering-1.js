/**
 * demo-engineering-1.js — Engineering demo: the hero slideshow's counter.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. The slideshow itself is the template carousel (carousel.js: fade, autoplay, loop,
 * arrows, the progress segments); this only adds what a carousel cannot know. Styles:
 * css/demos/demo-engineering-1.css.
 *
 * For frameworks — window.DraftmangoEngineering1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: listeners removed. Call it before the markup is
 *                              removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero slideshow — [data-custom-hero-slides] on the hero's .swiper. Once the carousel is
 *    mounted, [data-custom-hero-current] in the same section shows the slide's number ("02"), and
 *    every slide but the one on show is inert: its links leave the tab order and screen readers
 *    read only the project on screen.
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
    function heroSlides(el) {
        const current = el.closest('section')?.querySelector('[data-custom-hero-current]');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            if (current) current.textContent = String(swiper.realIndex + 1).padStart(2, '0');
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            sync();
        };

        // carousel.js mounts the carousel once Swiper has loaded: it marks the element then
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
    const FEATURES = [['[data-custom-hero-slides]', heroSlides]];
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

    window.DraftmangoEngineering1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
