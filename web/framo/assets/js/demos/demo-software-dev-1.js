/**
 * demo-software-dev-1.js — Software Development demo: diagrams that draw themselves.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-software-dev-1.css (kit: .custom-node, .custom-wire).
 *
 * For frameworks — window.FramoSoftwareDev1 = { init(root), destroy(root) }
 *    init(root = document)     wires every [data-draw] found in root (root itself included). Safe
 *                              to call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers and observers removed, classes cleared. Call it
 *                              before the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * Draw — [data-draw]. On wiring it gets .is-armed (the CSS hides its .custom-node items and
 * undraws its .custom-wire-line paths); the first time a quarter of it is in view it gets
 * .is-live (nodes appear, wires draw, each after its own --custom-node-delay /
 * --custom-wire-delay), then .is-done after data-draw-done ms (default 2600): the
 * <animateMotion begin="indefinite"> packets start. Off-screen it gets .is-paused and its SVG
 * animations pause; back in view they resume. Under reduced motion (and without this script)
 * nothing is armed: the diagram shows drawn and still.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wired = new Map();

    function draw(box) {
        if (reduced() || !('IntersectionObserver' in window)) return null;

        const svgs = [...box.querySelectorAll('svg')];
        const doneAfter = Number(box.dataset.drawDone ?? 2600);
        let timer = 0;

        box.classList.add('is-armed');

        const finish = () => {
            box.classList.add('is-done');
            box.querySelectorAll('animateMotion').forEach((motion) => motion.beginElement?.());
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    box.classList.remove('is-paused');
                    svgs.forEach((svg) => svg.unpauseAnimations?.());
                    if (!box.classList.contains('is-live')) {
                        // The armed state is styled first (read forces it), so the transitions run
                        requestAnimationFrame(() => {
                            void box.offsetWidth;
                            box.classList.add('is-live');
                            timer = window.setTimeout(finish, doneAfter);
                        });
                    }
                } else {
                    box.classList.add('is-paused');
                    svgs.forEach((svg) => svg.pauseAnimations?.());
                }
            },
            { threshold: 0.25 },
        );

        observer.observe(box);

        return () => {
            observer.disconnect();
            window.clearTimeout(timer);
            svgs.forEach((svg) => svg.pauseAnimations?.());
            box.classList.remove('is-armed', 'is-live', 'is-done', 'is-paused');
        };
    }

    function init(root = document) {
        within(root, '[data-draw]').forEach((box) => {
            if (wired.has(box)) return;
            const stop = draw(box);
            if (stop) wired.set(box, stop);
        });
    }

    function destroy(root = document) {
        within(root, '[data-draw]').forEach((box) => {
            wired.get(box)?.();
            wired.delete(box);
        });
    }

    window.FramoSoftwareDev1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
