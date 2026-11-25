/**
 * demo-marketing-1.js — Marketing Agency demo: the hero feed's pause.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Everything else on the Home is CSS or a template script. Styles:
 * css/demos/demo-marketing-1.css.
 *
 * For frameworks — window.FramoMarketing1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: observers disconnected, listeners removed. Call it
 *                              before the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Feed — .custom-hero-stage holding the template's vertical marquee columns. The columns stop
 *    while the stage is off screen (.is-away) and the [data-custom-feed-toggle] button pauses and
 *    resumes them (.is-paused). CSS also stops them on hover and with focus inside. The button
 *    shows only with this script and only when motion is allowed: under reduced motion the
 *    template leaves the columns still.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Feed
       ------------------------------------------------------------------ */
    function feed(stage) {
        const toggle = stage.querySelector('[data-custom-feed-toggle]');
        const label = toggle?.querySelector('.sr-only');

        const observer = new IntersectionObserver(([entry]) => {
            stage.classList.toggle('is-away', !entry.isIntersecting);
        });
        observer.observe(stage);

        const onToggle = () => {
            const paused = stage.classList.toggle('is-paused');
            toggle.setAttribute('aria-pressed', String(paused));
            if (label) label.textContent = paused ? 'Play the feed' : 'Pause the feed';
        };

        const syncMotion = () => {
            if (toggle) toggle.hidden = !motion.matches;
        };

        toggle?.addEventListener('click', onToggle);
        motion.addEventListener('change', syncMotion);
        syncMotion();

        return () => {
            observer.disconnect();
            toggle?.removeEventListener('click', onToggle);
            motion.removeEventListener('change', syncMotion);
            if (toggle) toggle.hidden = true;
            stage.classList.remove('is-away', 'is-paused');
        };
    }

    function init(root = document) {
        for (const stage of within(root, '.custom-hero-stage')) {
            if (!wired.has(stage)) wired.set(stage, feed(stage));
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

    window.FramoMarketing1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
