/**
 * demo-dance-studio-1.js — Dance Studio demo: the hero's photo columns rest while off-screen.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-dance-studio-1.css.
 *
 * For frameworks — window.DraftmangoDanceStudio1 = { init(root), destroy(root) }
 *    init(root = document)     wires every [data-custom-stage] found in root (root itself
 *                              included). Safe to call again: a stage already wired is left alone.
 *    destroy(root = document)  stops watching them. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Stage columns — [data-custom-stage] holds the template vertical marquee columns. This
 *    script sets .is-resting while the stage is out of view, which pauses their drift. Without
 *    this script the columns simply keep drifting; under reduced motion the template marquee
 *    holds them still.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const watched = new Map();

    /* ------------------------------------------------------------------
       1. Stage columns
       ------------------------------------------------------------------ */
    function init(root = document) {
        within(root, '[data-custom-stage]').forEach((stage) => {
            if (watched.has(stage)) return;
            const observer = new IntersectionObserver(([entry]) => {
                stage.classList.toggle('is-resting', !entry.isIntersecting);
            });
            observer.observe(stage);
            watched.set(stage, observer);
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-stage]').forEach((stage) => {
            watched.get(stage)?.disconnect();
            watched.delete(stage);
            stage.classList.remove('is-resting');
        });
    }

    window.DraftmangoDanceStudio1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
