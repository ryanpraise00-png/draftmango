/**
 * demo-renewable-energy-1.js — Renewable Energy demo: pauses the wind lines while they are off screen.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-renewable-energy-1.css.
 *
 * For frameworks — window.FramoRenewableEnergy1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops watching them and leaves them running. Call it before the
 *                              markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Wind lines — [data-custom-windlines] (_windlines.html). The gusts drift by CSS; off screen
 *    the script adds .is-paused, which holds them. Without the script they simply keep drifting;
 *    under reduced motion the CSS draws no gusts at all.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Wind lines
       ------------------------------------------------------------------ */
    const observer =
        'IntersectionObserver' in window
            ? new IntersectionObserver((entries) => {
                  for (const entry of entries)
                      entry.target.classList.toggle('is-paused', !entry.isIntersecting);
              })
            : null;

    function windlines(svg) {
        if (!observer) return () => {};
        observer.observe(svg);
        return () => {
            observer.unobserve(svg);
            svg.classList.remove('is-paused');
        };
    }

    /* ------------------------------------------------------------------
       API
       ------------------------------------------------------------------ */
    function init(root = document) {
        for (const svg of within(root, '[data-custom-windlines]')) {
            if (!wired.has(svg)) wired.set(svg, windlines(svg));
        }
    }

    function destroy(root = document) {
        for (const [el, stop] of wired) {
            if (root === document || root === el || root.contains(el)) {
                stop();
                wired.delete(el);
            }
        }
    }

    window.FramoRenewableEnergy1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    else init();
})();
