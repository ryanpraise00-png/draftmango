/**
 * demo-cybersecurity-1.js — Cybersecurity demo: the detection timeline and the scanning line.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-cybersecurity-1.css.
 *
 * For frameworks — window.FramoCybersecurity1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers and observers removed, classes cleared. Call it
 *                              before the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Timeline playback — .custom-timeline[data-timeline-play]. The rows of its
 *    .custom-timeline-body and its .custom-timeline-result show one by one, each after its
 *    data-delay (ms). A row with data-escalate="ms" arrives as a medium signal and turns
 *    critical that long after it shows. The finished incident holds (data-hold on the card,
 *    6000 ms by default), fades, and plays again. Plays only while the card is in view and
 *    resumes where it stopped. Under reduced motion (and without this script) the whole
 *    incident shows at once: the CSS hides a row only while the card is .is-armed.
 * 2. Scanning line — .custom-scan gets .is-paused while it is off-screen.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wired = new WeakMap();

    /* ------------------------------------------------------------------
       1. Timeline playback
       ------------------------------------------------------------------ */
    function timeline(card) {
        const rows = [
            ...card.querySelectorAll('.custom-timeline-body > li, .custom-timeline-result'),
        ];
        if (!rows.length) return null;

        const hold = Number(card.dataset.hold ?? 6000);
        const queue = [];
        rows.forEach((row) => {
            queue.push([Number(row.dataset.delay ?? 600), () => row.classList.add('is-shown')]);
            if (row.dataset.escalate) {
                queue.push([Number(row.dataset.escalate), () => row.classList.add('is-escalated')]);
            }
        });
        queue.push([
            hold,
            () => rows.forEach((row) => row.classList.remove('is-shown', 'is-escalated')),
        ]);
        queue.push([900, () => {}]);

        let step = 0;
        let timer = null;
        let inView = false;

        const next = () => {
            const [wait, run] = queue[step];
            timer = setTimeout(() => {
                timer = null;
                run();
                step = (step + 1) % queue.length;
                if (inView) next();
            }, wait);
        };

        const play = () => {
            if (timer || motion.matches) return;
            card.classList.add('is-playing');
            next();
        };

        const pause = () => {
            clearTimeout(timer);
            timer = null;
            card.classList.remove('is-playing');
        };

        const arm = () => {
            if (motion.matches) {
                pause();
                card.classList.remove('is-armed');
                rows.forEach((row) => row.classList.remove('is-shown', 'is-escalated'));
                return;
            }
            card.classList.add('is-armed');
            if (inView) play();
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                if (inView) play();
                else pause();
            },
            { threshold: 0.3 },
        );

        motion.addEventListener('change', arm);
        arm();
        observer.observe(card);

        return () => {
            pause();
            observer.disconnect();
            motion.removeEventListener('change', arm);
            card.classList.remove('is-armed');
            rows.forEach((row) => row.classList.remove('is-shown', 'is-escalated'));
        };
    }

    /* ------------------------------------------------------------------
       2. Scanning line
       ------------------------------------------------------------------ */
    function scan(line) {
        const observer = new IntersectionObserver(([entry]) => {
            line.classList.toggle('is-paused', !entry.isIntersecting);
        });
        observer.observe(line.parentElement ?? line);

        return () => {
            observer.disconnect();
            line.classList.remove('is-paused');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['.custom-timeline[data-timeline-play]', timeline],
        ['.custom-scan', scan],
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

    window.FramoCybersecurity1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init());
    } else {
        init();
    }
})();
