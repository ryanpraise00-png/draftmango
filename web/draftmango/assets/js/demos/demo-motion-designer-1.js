/**
 * demo-motion-designer-1.js — the Motion Designer demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Without it the
 * stage shows the first project and every title is still a plain link.
 *
 * 1. Project index — [data-custom-index] on the hero stage. Pointing at a
 *    title (or tabbing to it) shows its render, its row and its card
 *    (.is-active on the matching [data-custom-index-item / -render / -card /
 *    -bar], same order). While idle it plays through the projects: the active
 *    bar's CSS fill is the timer, and its animationend moves on, so a pause
 *    in CSS (hover, keyboard focus, .is-paused, .is-offscreen) pauses the
 *    autoplay too. Prev / next buttons, a pause toggle, and a swipe on touch
 *    screens. Reduced motion: no fill animation, so no autoplay.
 *
 * 2. Menu preview — [data-custom-preview] in the overlay panel: pointing at
 *    or focusing the n-th big link shows the n-th [data-custom-preview-item]
 *    (image and caption).
 *
 * window.DraftmangoMotionDesigner1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const pad = (n) => String(n).padStart(2, '0');

    /* ------------------------------------------------------------------
       1. Project index
       ------------------------------------------------------------------ */
    function index(stage) {
        const items = [...stage.querySelectorAll('[data-custom-index-item]')];
        const renders = [...stage.querySelectorAll('[data-custom-index-render]')];
        const cards = [...stage.querySelectorAll('[data-custom-index-card]')];
        const bars = [...stage.querySelectorAll('[data-custom-index-bar]')];
        const current = stage.querySelector('[data-custom-index-current]');
        const pauseBtn = stage.querySelector('[data-custom-index-pause]');
        const count = items.length;
        if (!count) return null;

        let active = 0;
        const off = [];
        const on = (el, type, fn, opts) => {
            if (!el) return;
            el.addEventListener(type, fn, opts);
            off.push(() => el.removeEventListener(type, fn, opts));
        };

        const show = (next) => {
            next = (next + count) % count;
            const restart = next === active;
            active = next;
            items.forEach((el, i) => el.classList.toggle('is-active', i === active));
            renders.forEach((el, i) => el.classList.toggle('is-active', i === active));
            cards.forEach((el, i) => {
                el.classList.toggle('is-active', i === active);
                el.inert = i !== active;
            });
            bars.forEach((el, i) => {
                el.classList.remove('is-active');
                el.classList.toggle('is-done', i < active);
            });
            // Restart the timer on the active bar (a reflow between remove and add)
            const bar = bars[active];
            if (bar) {
                if (restart) void bar.offsetWidth;
                bar.classList.add('is-active');
            }
            if (current) current.textContent = pad(active + 1);
        };

        // The rows: pointing or focusing shows the project
        items.forEach((item, i) => {
            const row = item.querySelector('[data-custom-index-row]') ?? item;
            on(row, 'pointerenter', () => {
                if (i !== active) show(i);
            });
            on(row, 'focus', () => {
                if (i !== active) show(i);
            });
        });

        // Autoplay: the active bar's fill ends → the next project
        bars.forEach((bar) => on(bar, 'animationend', () => show(active + 1)));

        on(stage.querySelector('[data-custom-index-prev]'), 'click', () => show(active - 1));
        on(stage.querySelector('[data-custom-index-next]'), 'click', () => show(active + 1));

        on(pauseBtn, 'click', () => {
            const paused = stage.classList.toggle('is-paused');
            pauseBtn.setAttribute('aria-pressed', String(paused));
            pauseBtn.setAttribute(
                'aria-label',
                paused ? 'Play the project autoplay' : 'Pause the project autoplay',
            );
        });

        // Swipe on touch screens (the phone slideshow)
        let startX = null;
        let startY = null;
        on(
            stage,
            'touchstart',
            (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            },
            { passive: true },
        );
        on(
            stage,
            'touchend',
            (e) => {
                if (startX === null) return;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                startX = null;
                if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4)
                    show(active + (dx < 0 ? 1 : -1));
            },
            { passive: true },
        );

        // Off screen: hold the timer
        const io =
            'IntersectionObserver' in window
                ? new IntersectionObserver(
                      ([entry]) => stage.classList.toggle('is-offscreen', !entry.isIntersecting),
                      { threshold: 0.2 },
                  )
                : null;
        io?.observe(stage);

        show(0);

        return () => {
            off.forEach((fn) => fn());
            io?.disconnect();
            cards.forEach((el) => {
                el.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Menu preview
       ------------------------------------------------------------------ */
    function preview(figure) {
        const panel = figure.closest('.mobile-nav') ?? document;
        const list = panel.querySelector('[data-mobile-links]');
        const frames = [
            ...figure.querySelectorAll('.custom-preview-frame [data-custom-preview-item]'),
        ];
        const lines = [
            ...figure.querySelectorAll('.custom-preview-caption [data-custom-preview-item]'),
        ];
        if (!list) return null;

        const show = (i) => {
            frames.forEach((el, n) => el.classList.toggle('is-active', n === i));
            lines.forEach((el, n) => el.classList.toggle('is-active', n === i));
        };

        // The links are injected by navbar.js after load, so listen on the list itself
        const pick = (e) => {
            const row = e.target.closest?.('[data-mobile-links] > *');
            if (!row || row.parentElement !== list) return;
            const i = [...list.children].indexOf(row);
            if (i > -1 && i < frames.length) show(i);
        };
        list.addEventListener('pointerover', pick);
        list.addEventListener('focusin', pick);

        return () => {
            list.removeEventListener('pointerover', pick);
            list.removeEventListener('focusin', pick);
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-index]', index],
        ['[data-custom-preview]', preview],
    ];
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

    window.DraftmangoMotionDesigner1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
