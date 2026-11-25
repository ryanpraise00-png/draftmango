/**
 * demo-electronics-store-1.js — the Electronics Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it (the first product and its callouts stay on show, the arrows and
 * the product cards belong to the template carousel); it only adds:
 *
 * 1. Reel — [data-custom-stage] around the hero's .swiper. Once the template
 *    carousel (carousel.js) has mounted it (the product cards below the
 *    photo are its data-thumbs rail, with the autoplay line):
 *    - autoplay pauses while the mouse is over the reel;
 *    - every slide but the one on show is inert.
 *    Reduced motion: the carousel runs no autoplay.
 *
 * 2. Department mega — .custom-dept. The template mega opens on hover and
 *    focus-within but has no Escape: Escape here closes it (.is-dismissed)
 *    and puts focus back on All Departments; it opens again once the pointer
 *    leaves and comes back, focus leaves and returns, or Enter / Space /
 *    Arrow Down is pressed on the button.
 *
 * window.FramoElectronicsStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Reel
       ------------------------------------------------------------------ */
    function stage(el) {
        const host = el.querySelector('.swiper');
        let swiper = null;
        let watcher = null;
        let hovering = false;

        const show = () =>
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });

        const enter = (e) => {
            if (e.pointerType !== 'mouse') return;
            hovering = true;
            if (swiper?.autoplay?.running && !swiper.autoplay.paused) swiper.autoplay.pause();
        };
        const leave = (e) => {
            if (e.pointerType !== 'mouse') return;
            hovering = false;
            if (swiper?.autoplay?.running && swiper.autoplay.paused) swiper.autoplay.resume();
        };
        // Started again by the carousel (focus left, back on screen): honour a
        // pointer still resting on the reel
        const restarted = () => {
            if (hovering) swiper.autoplay.pause();
        };

        const attach = () => {
            if (swiper || !host?.swiper) return;
            swiper = host.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', show);
            swiper.on('autoplayStart', restarted);
            el.addEventListener('pointerenter', enter);
            el.addEventListener('pointerleave', leave);
            show();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (host?.swiper) attach();
        else if (host) {
            watcher = new MutationObserver(attach);
            watcher.observe(host, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            el.removeEventListener('pointerenter', enter);
            el.removeEventListener('pointerleave', leave);
            if (!swiper) return;
            swiper.off('slideChange', show);
            swiper.off('autoplayStart', restarted);
            swiper.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Department mega: Escape
       ------------------------------------------------------------------ */
    function dismissible(menu) {
        const trigger = menu.querySelector(':scope > .nav-link');
        const reopen = () => menu.classList.remove('is-dismissed');

        const onKey = (e) => {
            if (e.key === 'Escape' && !menu.classList.contains('is-dismissed')) {
                menu.classList.add('is-dismissed');
                trigger?.focus();
            } else if (e.target === trigger && ['Enter', ' ', 'ArrowDown'].includes(e.key)) {
                if (menu.classList.contains('is-dismissed')) e.preventDefault();
                reopen();
            }
        };
        const onFocusOut = (e) => {
            if (!menu.contains(e.relatedTarget)) reopen();
        };

        menu.addEventListener('keydown', onKey);
        menu.addEventListener('mouseleave', reopen);
        menu.addEventListener('focusout', onFocusOut);

        return () => {
            menu.removeEventListener('keydown', onKey);
            menu.removeEventListener('mouseleave', reopen);
            menu.removeEventListener('focusout', onFocusOut);
            reopen();
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-stage]', stage],
        ['.custom-dept', dismissible],
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

    window.FramoElectronicsStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
