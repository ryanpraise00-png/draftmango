/**
 * demo-meditation-app-1.js — Meditation App demo: off-screen pause and the Breathe with us timer.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-meditation-app-1.css.
 *
 * For frameworks — window.FramoMeditationApp1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers, listeners and observers removed. Call it before the markup is
 *                              removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Off-screen pause — [data-pause-offscreen]. While the element is out of view it carries
 *    .is-offscreen, and the CSS pauses every animation inside it (breath rings, drifting covers,
 *    stars, the player's wave). Without this script they simply keep running.
 * 2. Breathe with us — [data-breathe] (data-seconds, default 60) holding a .custom-breath, a
 *    [data-breathe-toggle] button with a [data-breathe-label] and a [data-breathe-time] output.
 *    The rings wait at rest; Start runs the 4-7-8 cycle from its first breath and counts the
 *    time down; Pause holds both (and so does scrolling away); at zero it stops and offers to
 *    start again. Without this script the rings simply breathe on their own.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new WeakMap();

    /* ------------------------------------------------------------------
       1. Off-screen pause
       ------------------------------------------------------------------ */
    function pauseOffscreen(el) {
        const io = new IntersectionObserver(([entry]) => {
            el.classList.toggle('is-offscreen', !entry.isIntersecting);
        });
        io.observe(el);
        return () => {
            io.disconnect();
            el.classList.remove('is-offscreen');
        };
    }

    /* ------------------------------------------------------------------
       2. Breathe with us
       ------------------------------------------------------------------ */
    const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    function breathe(box) {
        const breath = box.querySelector('.custom-breath');
        const button = box.querySelector('[data-breathe-toggle]');
        const label = box.querySelector('[data-breathe-label]');
        const icon = button?.querySelector('.ph-fill');
        const time = box.querySelector('[data-breathe-time]');
        if (!breath || !button) return null;

        const total = Number(box.dataset.seconds) || 60;
        let left = total;
        let timer = null;

        const show = (state) => {
            const running = state === 'running';
            label.textContent = running
                ? 'Pause'
                : state === 'done'
                  ? 'Start Again'
                  : left < total
                    ? 'Resume'
                    : 'Start';
            icon?.classList.toggle('ph-play', !running);
            icon?.classList.toggle('ph-pause', running);
            button.setAttribute('aria-pressed', String(running));
            if (time) time.textContent = fmt(left);
        };

        // Back to the first breath: drop the animation for one frame
        const rewind = () => {
            breath.classList.add('is-reset');
            void breath.offsetWidth;
            breath.classList.remove('is-reset');
        };

        const pause = () => {
            clearInterval(timer);
            timer = null;
            breath.classList.add('is-paused');
            show(left === total ? 'idle' : left === 0 ? 'done' : 'paused');
        };

        const start = () => {
            if (left === 0 || left === total) {
                left = total;
                rewind();
            }
            breath.classList.remove('is-paused');
            show('running');
            timer = setInterval(() => {
                left -= 1;
                if (left <= 0) {
                    left = 0;
                    pause();
                    return;
                }
                if (time) time.textContent = fmt(left);
            }, 1000);
        };

        const onClick = () => (timer ? pause() : start());
        button.addEventListener('click', onClick);

        const io = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting && timer) pause();
        });
        io.observe(box);

        rewind();
        breath.classList.add('is-paused');
        show('idle');

        return () => {
            clearInterval(timer);
            io.disconnect();
            button.removeEventListener('click', onClick);
            breath.classList.remove('is-paused');
        };
    }

    const FEATURES = [
        ['[data-pause-offscreen]', pauseOffscreen],
        ['[data-breathe]', breathe],
    ];

    function init(root = document) {
        FEATURES.forEach(([selector, wire]) => {
            within(root, selector).forEach((el) => {
                if (wired.has(el)) return;
                const stop = wire(el);
                if (stop) wired.set(el, stop);
            });
        });
    }

    function destroy(root = document) {
        FEATURES.forEach(([selector]) => {
            within(root, selector).forEach((el) => {
                wired.get(el)?.();
                wired.delete(el);
            });
        });
    }

    window.FramoMeditationApp1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
