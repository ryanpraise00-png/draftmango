/**
 * demo-kids-store-1.js — the Kids Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages, after main.js has
 * started Alpine.
 *
 * The hero diptych — carousel.js mounts the Swiper (one story per view on
 * phones, two from 768px, grouped in pairs). From 768px the pair crossfades in
 * place instead of sliding: the track stops moving (virtualTranslate) and the
 * CSS stacks the stories two by two in a grid, showing the active pair. Either
 * way the slideshow rewinds after the last story, and the stories out of view
 * leave the tab order (inert).
 *
 * Header bag — an add-to-cart on a product card in the page raises the bag's
 * count when the template's addToCart reports it (cart-added); the mini cart
 * adds $store.cart.extra / extraTotal to its own lines (x-effect).
 *
 * window.DraftmangoKidsStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const PAIR = matchMedia('(min-width: 768px)');

    function within(root, selector) {
        return root.matches?.(selector) ? [root] : [...root.querySelectorAll(selector)];
    }

    /* ------------------------------------------------------------------
       Diptych
       ------------------------------------------------------------------ */
    function diptych(host) {
        let swiper = null;
        let watcher = null;

        const sync = () => {
            const show = PAIR.matches ? 2 : 1;
            swiper.slides.forEach((slide, i) => {
                const on = i >= swiper.activeIndex && i < swiper.activeIndex + show;
                slide.inert = !on;
            });
        };

        // A still track never fires transitionend, which Swiper waits for to
        // finish a change (and autoplay to go on): send it once the fade is done
        let timer = 0;
        const settle = (s, duration) => {
            clearTimeout(timer);
            if (!PAIR.matches || !duration) return;
            timer = setTimeout(
                () => swiper.wrapperEl.dispatchEvent(new Event('transitionend')),
                duration,
            );
        };

        const mode = () => {
            const pair = PAIR.matches;
            swiper.params.virtualTranslate = pair;
            if (pair) swiper.wrapperEl.style.transform = 'none';
            else swiper.slideTo(swiper.activeIndex, 0, false);
            sync();
        };

        const attach = () => {
            if (swiper || !host.swiper) return;
            swiper = host.swiper;
            watcher?.disconnect();
            swiper.params.rewind = true;
            swiper.navigation?.update();
            swiper.on('slideChange', sync);
            swiper.on('breakpoint resize', mode);
            swiper.on('setTransition', settle);
            mode();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (host.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(host, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            clearTimeout(timer);
            if (!swiper) return;
            swiper.off('setTransition', settle);
            swiper.off('slideChange', sync);
            swiper.off('breakpoint resize', mode);
            swiper.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       Header bag
       ------------------------------------------------------------------ */
    function onAdded(e) {
        const cart = window.Alpine?.store('cart');
        const item = e.target.closest?.('main [data-product]');
        if (!item || !cart) return;
        cart.extra = (cart.extra ?? 0) + 1;
        cart.extraTotal = (cart.extraTotal ?? 0) + (Number(item.dataset.price) || 0);
    }

    document.addEventListener('cart-added', onAdded);

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-diptych]', diptych]];
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

    window.DraftmangoKidsStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
