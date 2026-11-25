/**
 * demo-cafe-1.js — Café & Bakery demo: the Baked Today stamp rests while off-screen.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-cafe-1.css.
 *
 * For frameworks — window.DraftmangoCafe1 = { init(root), destroy(root) }
 *    init(root = document)     wires every .custom-stamp found in root (root itself included).
 *                              Safe to call again: a stamp already wired is left alone.
 *    destroy(root = document)  stops watching them. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Stamp — .seal.custom-stamp. The template seal spins its ring for as long as the page is
 *    open; this script sets .is-resting while the stamp is out of view, which pauses the ring
 *    where it is. Without this script the ring simply keeps turning; under reduced motion the
 *    template CSS holds it still.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const watched = new Map();

    /* ------------------------------------------------------------------
       1. Stamp
       ------------------------------------------------------------------ */
    function init(root = document) {
        within(root, '.custom-stamp').forEach((stamp) => {
            if (watched.has(stamp)) return;
            const observer = new IntersectionObserver(([entry]) => {
                stamp.classList.toggle('is-resting', !entry.isIntersecting);
            });
            observer.observe(stamp);
            watched.set(stamp, observer);
        });
    }

    function destroy(root = document) {
        within(root, '.custom-stamp').forEach((stamp) => {
            watched.get(stamp)?.disconnect();
            watched.delete(stamp);
            stamp.classList.remove('is-resting');
        });
    }

    window.DraftmangoCafe1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
