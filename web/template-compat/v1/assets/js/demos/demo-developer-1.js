/**
 * demo-developer-1.js — Creative Developer demo: the reel's copies stay out of the tab order.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-developer-1.css (.custom-reel).
 *
 * For frameworks — window.FramoDeveloper1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Reel — the template marquee (main.js) fills the track with aria-hidden copies of the
 *    launches so the loop has no gap. Their links would still take keyboard focus, so every
 *    copy is made inert, whenever it is added. Without the script the copies are not made.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Reel
       ------------------------------------------------------------------ */
    function reel(track) {
        const quiet = () => {
            track.querySelectorAll(':scope > [aria-hidden="true"]:not([inert])').forEach((copy) => {
                copy.inert = true;
            });
        };
        const watcher = new MutationObserver(quiet);
        watcher.observe(track, { childList: true });
        quiet();
        return () => watcher.disconnect();
    }

    const FEATURES = [['.custom-reel-track', reel]];

    function init(root = document) {
        FEATURES.forEach(([selector, feature]) => {
            within(root, selector).forEach((el) => {
                if (!wired.has(el)) wired.set(el, feature(el));
            });
        });
    }

    function destroy(root = document) {
        within(root, FEATURES.map(([selector]) => selector).join(', ')).forEach((el) => {
            wired.get(el)?.();
            wired.delete(el);
        });
    }

    window.FramoDeveloper1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
