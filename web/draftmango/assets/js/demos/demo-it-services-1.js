/**
 * demo-it-services-1.js — IT Services demo: the live service-desk card.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-it-services-1.css.
 *
 * For frameworks — window.DraftmangoItServices1 = { init(root), destroy(root) }
 *    init(root = document)     wires every desk card found in root (root itself included). Safe
 *                              to call again: a card already wired is left alone.
 *    destroy(root = document)  stops them: timers and observers removed. Call it before the
 *                              markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * Desk ticker — .custom-desk[data-desk-live]. Its figure marked data-desk-tick (written with its
 * starting value, e.g. 128) goes up by one every 5–9 s while the card is in view, flashing green
 * for a moment (.is-ticked). It starts once the template counter has finished counting up, pauses
 * off-screen and in a hidden tab, and resumes where it stopped. Under reduced motion (and without
 * this script) the figure stays as written.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wired = new Map();

    const FIRST_WAIT = 3200; // the template counter runs 2 s once in view
    const MIN_GAP = 5000;
    const MAX_GAP = 9000;

    function deskTicker(card) {
        const figure = card.querySelector('[data-desk-tick]');
        if (!figure || reduced()) return null;

        let count =
            Number.parseInt(figure.dataset.counter ?? figure.textContent.replace(/\D/g, ''), 10) ||
            0;
        let timer = null;
        let flash = null;
        let inView = false;
        let started = false;

        const schedule = (wait) => {
            clearTimeout(timer);
            timer = setTimeout(tick, wait);
        };

        const tick = () => {
            timer = null;
            count += 1;
            figure.textContent = count.toLocaleString('en-US');
            figure.classList.add('is-ticked');
            clearTimeout(flash);
            flash = setTimeout(() => figure.classList.remove('is-ticked'), 700);
            schedule(MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
        };

        const run = () => {
            if (!inView || document.hidden) {
                clearTimeout(timer);
                timer = null;
                return;
            }
            if (timer) return;
            schedule(started ? MIN_GAP : FIRST_WAIT);
            started = true;
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                run();
            },
            { threshold: 0.3 },
        );
        observer.observe(card);

        document.addEventListener('visibilitychange', run);

        return () => {
            clearTimeout(timer);
            clearTimeout(flash);
            observer.disconnect();
            document.removeEventListener('visibilitychange', run);
            figure.classList.remove('is-ticked');
        };
    }

    function init(root = document) {
        within(root, '.custom-desk[data-desk-live]').forEach((card) => {
            if (wired.has(card)) return;
            const stop = deskTicker(card);
            if (stop) wired.set(card, stop);
        });
    }

    function destroy(root = document) {
        within(root, '.custom-desk[data-desk-live]').forEach((card) => {
            wired.get(card)?.();
            wired.delete(card);
        });
    }

    window.DraftmangoItServices1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }
})();
