/**
 * demo-photographer-1.js — the Photographer demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Without it the
 * sheet shows its first series and every title still links to its series.
 *
 * 1. The contact sheet — [data-custom-sheet]. Every piece of one series
 *    (photo, index title, strip frame, caption) carries the same
 *    data-custom-i; showing a series moves .is-active onto that number.
 *    Hovering or focusing a title shows its series, a strip frame shows it
 *    on click. While nobody is using the sheet it moves on by itself every
 *    --custom-cycle (CSS), pausing under the pointer, while focus is
 *    inside and while it is off screen; the first click on a frame stops
 *    the cycle for good. Reduced motion: no cycle, the series change only
 *    when asked.
 *
 * window.FramoPhotographer1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mounted = new Map();

    /* ------------------------------------------------------------------
       1. The contact sheet
       ------------------------------------------------------------------ */
    function sheet(el) {
        const titles = [...el.querySelectorAll('.custom-series-link[data-custom-i]')];
        const frames = [...el.querySelectorAll('.custom-strip-frame[data-custom-i]')];
        const view = el.querySelector('[data-custom-view]');
        const count = titles.length;
        const cycle = parseFloat(getComputedStyle(el).getPropertyValue('--custom-cycle')) || 6500;
        let current = Math.max(
            0,
            titles.findIndex((t) => t.classList.contains('is-active')),
        );
        let timer = 0;
        let stopped = reduced.matches;
        let hovered = false;
        let focused = false;
        let visible = true;

        const show = (i) => {
            if (i === current) return;
            current = i;
            el.querySelectorAll('[data-custom-i]').forEach((node) => {
                node.classList.toggle('is-active', Number(node.dataset.customI) === i);
            });
            frames.forEach((f) =>
                f.setAttribute('aria-pressed', String(Number(f.dataset.customI) === i)),
            );
            if (view) view.href = titles[i].href;
        };

        const paused = () => hovered || focused || !visible;

        /* (re)starts the full wait for the next series, or holds it */
        function schedule() {
            clearTimeout(timer);
            if (stopped || paused()) return;
            timer = setTimeout(() => {
                show((current + 1) % count);
                schedule();
            }, cycle);
        }

        const onTitle = (e) => show(Number(e.currentTarget.dataset.customI));

        const onFrame = (e) => {
            show(Number(e.currentTarget.dataset.customI));
            stopped = true;
            schedule();
        };

        const onEnter = () => {
            hovered = true;
            schedule();
        };
        const onLeave = () => {
            hovered = false;
            schedule();
        };
        const onFocusIn = () => {
            focused = true;
            schedule();
        };
        const onFocusOut = (e) => {
            if (el.contains(e.relatedTarget)) return;
            focused = false;
            schedule();
        };

        const interactive = el.querySelectorAll(
            '.custom-series, .custom-strip, .custom-sheet-foot',
        );
        interactive.forEach((zone) => {
            zone.addEventListener('pointerenter', onEnter);
            zone.addEventListener('pointerleave', onLeave);
        });
        titles.forEach((t) => {
            t.addEventListener('pointerenter', onTitle);
            t.addEventListener('focus', onTitle);
        });
        frames.forEach((f) => f.addEventListener('click', onFrame));
        el.addEventListener('focusin', onFocusIn);
        el.addEventListener('focusout', onFocusOut);

        const io = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                schedule();
            },
            { threshold: 0.25 },
        );
        io.observe(el);

        schedule();

        return () => {
            clearTimeout(timer);
            io.disconnect();
            interactive.forEach((zone) => {
                zone.removeEventListener('pointerenter', onEnter);
                zone.removeEventListener('pointerleave', onLeave);
            });
            titles.forEach((t) => {
                t.removeEventListener('pointerenter', onTitle);
                t.removeEventListener('focus', onTitle);
            });
            frames.forEach((f) => f.removeEventListener('click', onFrame));
            el.removeEventListener('focusin', onFocusIn);
            el.removeEventListener('focusout', onFocusOut);
        };
    }

    function init(root = document) {
        within(root, '[data-custom-sheet]').forEach((el) => {
            if (!mounted.has(el)) mounted.set(el, sheet(el));
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-sheet]').forEach((el) => {
            mounted.get(el)?.();
            mounted.delete(el);
        });
    }

    reduced.addEventListener('change', () => {
        destroy();
        init();
    });

    window.FramoPhotographer1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
