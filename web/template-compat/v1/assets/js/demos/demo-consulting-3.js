/**
 * demo-consulting-3.js — the People & Organisation demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. People rail — [data-custom-rail] on the hero's .swiper, a continuous
 *    drift (autoplay with no delay, linear). Swiper's own pause waits for the
 *    current slide to land, seconds away at this pace: here the track stops
 *    where it is under the pointer or keyboard focus and drifts on after.
 *
 * window.FramoConsulting3 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. People rail
       ------------------------------------------------------------------ */
    function rail(el) {
        let swiper = null;
        let watcher = null;
        let frozen = false;

        const drifting = () => Boolean(swiper?.params.autoplay?.enabled);

        const freeze = () => {
            if (frozen || !drifting()) return;
            frozen = true;
            const x = new DOMMatrix(getComputedStyle(swiper.wrapperEl).transform).m41;
            swiper.autoplay.stop();
            swiper.setTransition(0);
            swiper.setTranslate(x);
        };

        const resume = () => {
            if (!frozen) return;
            frozen = false;
            swiper.autoplay.start();
        };

        const onFocusOut = (e) => {
            if (!el.contains(e.relatedTarget)) resume();
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            el.addEventListener('pointerenter', freeze);
            el.addEventListener('pointerleave', resume);
            el.addEventListener('focusin', freeze);
            el.addEventListener('focusout', onFocusOut);
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            el.removeEventListener('pointerenter', freeze);
            el.removeEventListener('pointerleave', resume);
            el.removeEventListener('focusin', freeze);
            el.removeEventListener('focusout', onFocusOut);
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-rail]', rail]];
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

    window.FramoConsulting3 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
