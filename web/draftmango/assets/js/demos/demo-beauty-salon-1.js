/**
 * demo-beauty-salon-1.js — Beauty Salon demo: what the hero slideshow needs beyond the template
 * carousel.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-beauty-salon-1.css.
 *
 * For frameworks — window.DraftmangoBeautySalon1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero — [data-custom-hero] on the hero's .swiper (mounted by the template carousel.js, which
 *    also links the service tabs through data-thumbs). Every slide but the one on show is inert;
 *    the autoplay pauses while the pointer is anywhere over the hero (the claim and the tab bar
 *    sit above the photos, outside the carousel) or keyboard focus is inside it; on phones the
 *    tab row scrolls sideways to keep the active tab in view. Without this script the slideshow
 *    still plays and the tabs still switch it.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Hero
       ------------------------------------------------------------------ */
    function hero(el) {
        const section = el.closest('section') ?? el;
        const rail = el.dataset.thumbs ? document.querySelector(el.dataset.thumbs) : null;
        const bar = rail?.closest('.custom-hero-bar');
        let swiper = null;
        let watcher = null;
        let pointer = false;
        let focus = false;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            const tab = rail?.children[swiper.realIndex];
            if (bar && tab && bar.scrollWidth > bar.clientWidth) {
                const left = tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2;
                bar.scrollTo({
                    left,
                    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'auto'
                        : 'smooth',
                });
            }
        };

        // Swiper resumes by itself after every change of slide: a hold still on pauses it again
        const rest = () => {
            const play = swiper?.autoplay;
            if (!play?.running) return;
            if (pointer || focus) {
                if (!play.paused) play.pause();
            } else if (play.paused) play.resume();
        };
        const hold = () => queueMicrotask(rest);

        const enter = (e) => {
            if (e.pointerType === 'mouse') {
                pointer = true;
                rest();
            }
        };
        const leave = (e) => {
            if (e.pointerType === 'mouse') {
                pointer = false;
                rest();
            }
        };
        const focusIn = (e) => {
            if (e.target.matches(':focus-visible')) {
                focus = true;
                rest();
            }
        };
        const focusOut = (e) => {
            if (!section.contains(e.relatedTarget)) {
                focus = false;
                rest();
            }
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayResume', hold);
            sync();
            rest();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        section.addEventListener('pointerenter', enter);
        section.addEventListener('pointerleave', leave);
        section.addEventListener('focusin', focusIn);
        section.addEventListener('focusout', focusOut);

        return () => {
            watcher?.disconnect();
            section.removeEventListener('pointerenter', enter);
            section.removeEventListener('pointerleave', leave);
            section.removeEventListener('focusin', focusIn);
            section.removeEventListener('focusout', focusOut);
            swiper?.off('slideChange', sync);
            swiper?.off('autoplayResume', hold);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    const FEATURES = [['[data-custom-hero]', hero]];

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (!wired.has(el)) wired.set(el, feature(el));
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

    window.DraftmangoBeautySalon1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
