/**
 * demo-creative-studio-1.js — Creative Studio demo: the showreel loop.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Everything else on the Home is CSS or a template script. Styles:
 * css/demos/demo-creative-studio-1.css.
 *
 * For frameworks — window.DraftmangoCreativeStudio1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: observers disconnected, listeners removed, the video
 *                              paused. Call it before the markup is removed, then init() on the
 *                              new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Reel — [data-custom-reel] on a muted, looping <video> with no autoplay attribute.
 *    It plays only while at least a quarter of it is on screen and only when the visitor allows
 *    motion; it pauses off screen, and stops if reduced motion is switched on. Without this
 *    script (or with reduced motion) the poster shows. The version with sound opens in the
 *    template lightbox (the Play Reel link), which needs nothing from here.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');

    /* ------------------------------------------------------------------
       1. Reel
       ------------------------------------------------------------------ */
    function reel(video) {
        let seen = false;

        const sync = () => {
            if (seen && motion.matches) {
                if (video.preload === 'none') video.preload = 'auto';
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                seen = entry.isIntersecting;
                sync();
            },
            { threshold: 0.25 },
        );

        observer.observe(video);
        motion.addEventListener('change', sync);

        return () => {
            observer.disconnect();
            motion.removeEventListener('change', sync);
            video.pause();
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-reel]', reel]];
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

    window.DraftmangoCreativeStudio1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
