/**
 * demo-yoga-studio-1.js — Yoga Studio demo: the breath lines rest while off-screen.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-yoga-studio-1.css.
 *
 * For frameworks — window.DraftmangoYogaStudio1 = { init(root), destroy(root) }
 *    init(root = document)     wires every .custom-breath found in root (root itself included).
 *                              Safe to call again: a line already wired is left alone.
 *    destroy(root = document)  stops watching them. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Breath line — svg.custom-breath. The CSS draws the line once, then lets it rise and fall
 *    (inhale / exhale) for as long as it is on screen; this script sets .is-resting while the
 *    line is out of view, which pauses that loop. Without this script the loop simply keeps
 *    running; under reduced motion the CSS shows the drawn line, still.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const watched = new Map();

    /* ------------------------------------------------------------------
       1. Breath line
       ------------------------------------------------------------------ */
    function init(root = document) {
        within(root, '.custom-breath').forEach((line) => {
            if (watched.has(line)) return;
            const observer = new IntersectionObserver(([entry]) => {
                line.classList.toggle('is-resting', !entry.isIntersecting);
            });
            observer.observe(line);
            watched.set(line, observer);
        });
    }

    function destroy(root = document) {
        within(root, '.custom-breath').forEach((line) => {
            watched.get(line)?.disconnect();
            watched.delete(line);
            line.classList.remove('is-resting');
        });
    }

    window.DraftmangoYogaStudio1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
