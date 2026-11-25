/**
 * demo-cloud-hosting-1.js — Cloud Hosting demo: the map pings.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-cloud-hosting-1.css.
 *
 * For frameworks — window.DraftmangoCloudHosting1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers, listeners and observers removed. Call it before
 *                              the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * Map pings — .custom-map. The pulse rings run only while the map is on screen (.is-paused
 *    off-screen); under reduced motion the CSS shows still dots.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       Map pings
       ------------------------------------------------------------------ */
    function mapPings(map) {
        const observer = new IntersectionObserver(([entry]) => {
            map.classList.toggle('is-paused', !entry.isIntersecting);
        });
        observer.observe(map);
        return () => {
            observer.disconnect();
            map.classList.remove('is-paused');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['.custom-map', mapPings]];
    const wired = new WeakMap(); // element → the function that stops its feature

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (wired.has(el)) continue;
                const stop = feature(el);
                wired.set(el, stop ?? (() => {}));
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

    window.DraftmangoCloudHosting1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
