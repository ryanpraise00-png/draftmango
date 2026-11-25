/**
 * demo-consulting-2.js — the Growth Consulting demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Without it the
 * first lever stays open and every lever's page is still one link away.
 *
 * 1. The levers — [data-custom-levers] on the hero's template .sliding-boxes.
 *    Each panel's button opens it (click, keyboard focus, arrow keys) and so
 *    does the pointer resting on a panel (fine pointers only). A slow autoplay
 *    walks through the five until the first hover, focus or tap, and waits
 *    while the row is off screen or the tab is hidden. Reduced motion: no
 *    autoplay. The open panel's button carries aria-expanded="true".
 *
 * window.FramoConsulting2 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. The levers
       ------------------------------------------------------------------ */
    function levers(row) {
        const panels = [...row.querySelectorAll(':scope > .sliding-box')];
        const buttons = panels.map((panel) => panel.querySelector('.custom-lever-toggle'));
        if (!panels.length || buttons.includes(null)) return null;

        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
        const delay =
            parseFloat(getComputedStyle(row).getPropertyValue('--custom-lever-delay')) || 6500;
        const controller = new AbortController();
        const { signal } = controller;
        let active = Math.max(
            0,
            panels.findIndex((panel) => panel.classList.contains('is-active')),
        );
        let timer = 0;
        let visible = false;
        let stopped = reduced;

        const open = (index) => {
            active = (index + panels.length) % panels.length;
            panels.forEach((panel, i) => panel.classList.toggle('is-active', i === active));
            buttons.forEach((button, i) =>
                button.setAttribute('aria-expanded', String(i === active)),
            );
        };

        const schedule = () => {
            clearTimeout(timer);
            const playing = !stopped && visible && !document.hidden;
            row.toggleAttribute('data-playing', playing);
            if (playing)
                timer = setTimeout(() => {
                    open(active + 1);
                    schedule();
                }, delay);
        };

        // The first touch hands the row to the visitor for good
        const stop = () => {
            if (stopped) return;
            stopped = true;
            schedule();
        };

        panels.forEach((panel, i) => {
            panel.addEventListener(
                'mouseenter',
                () => {
                    if (!finePointer.matches) return;
                    stop();
                    open(i);
                },
                { signal },
            );
            buttons[i].addEventListener(
                'click',
                () => {
                    stop();
                    open(i);
                },
                { signal },
            );
            buttons[i].addEventListener(
                'focus',
                () => {
                    stop();
                    open(i);
                },
                { signal },
            );
        });

        row.addEventListener('focusin', stop, { signal });
        row.addEventListener('pointerdown', stop, { signal });

        // Arrow keys walk the buttons
        row.addEventListener(
            'keydown',
            (event) => {
                const i = buttons.indexOf(document.activeElement);
                if (i < 0) return;
                const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
                const to =
                    event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? buttons.length - 1
                          : step
                            ? (i + step + buttons.length) % buttons.length
                            : -1;
                if (to < 0) return;
                event.preventDefault();
                buttons[to].focus();
            },
            { signal },
        );

        const seen = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                schedule();
            },
            { threshold: 0.35 },
        );
        seen.observe(row);
        document.addEventListener('visibilitychange', schedule, { signal });

        open(active);

        return () => {
            clearTimeout(timer);
            seen.disconnect();
            controller.abort();
            row.removeAttribute('data-playing');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-levers]', levers]];
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

    window.FramoConsulting2 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
