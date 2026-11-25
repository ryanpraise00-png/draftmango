/**
 * demo-solar-energy-1.js — Solar Installer demo: moves the sun along the sun path when it comes into view.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-solar-energy-1.css. The savings calculator is Alpine
 * (x-data on the form in the page), not this script.
 *
 * For frameworks — window.DraftmangoSolarEnergy1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them and leaves each sun at its final hour. Call it before
 *                              the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Sun path — [data-custom-sunpath="<share of the day, 0–1>"] (_sunpath.html). The markup
 *    draws the sun (an HTML dot, left / top in % of the box) and its trail (.custom-sunpath-trail,
 *    an arc from 6 am to the sun) at that final hour; on view the script rewinds them to 6 am and
 *    eases the sun along the half-circle arc (a 1000 × 500 viewBox stretched to the box) to the
 *    final hour once (about 2.6 s). Off screen it
 *    pauses and picks up where it stopped. Without the script, or under reduced motion, the sun
 *    stays at its final hour.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ------------------------------------------------------------------
       1. Sun path
       ------------------------------------------------------------------ */
    const DURATION = 2600;
    const DELAY = 450;
    const ease = (t) => 1 - (1 - t) ** 3;

    function sunpath(box) {
        const arc = box.querySelector('.custom-sunpath-arc');
        const trail = box.querySelector('.custom-sunpath-trail');
        const sun = box.querySelector('.custom-sunpath-sun');
        const end = Math.min(1, Math.max(0, Number.parseFloat(box.dataset.customSunpath) || 0));
        if (!arc || !trail || !sun || reduced.matches || !('IntersectionObserver' in window))
            return () => {};

        // The arc is a half circle of radius 500 in a 1000 × 500 viewBox stretched to the box
        const place = (share) => {
            const angle = Math.PI * (1 - share);
            const x = 500 + 500 * Math.cos(angle);
            const y = 500 - 500 * Math.sin(angle);
            sun.style.left = `${(x / 10).toFixed(2)}%`;
            sun.style.top = `${(y / 5).toFixed(2)}%`;
            trail.setAttribute('d', `M0 500A500 500 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`);
        };

        let elapsed = 0;
        let last = 0;
        let frame = 0;
        let timer = 0;

        const tick = (now) => {
            elapsed += now - last;
            last = now;
            const t = Math.min(1, elapsed / DURATION);
            place(end * ease(t));
            if (t < 1) frame = requestAnimationFrame(tick);
            else observer.disconnect();
        };

        const start = () => {
            last = performance.now();
            frame = requestAnimationFrame(tick);
        };

        const stop = () => {
            clearTimeout(timer);
            cancelAnimationFrame(frame);
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                stop();
                if (entry.isIntersecting) timer = setTimeout(start, elapsed ? 0 : DELAY);
            },
            { threshold: 0.35 },
        );

        place(0);
        observer.observe(box);

        return () => {
            stop();
            observer.disconnect();
            place(end);
        };
    }

    const FEATURES = [['[data-custom-sunpath]', sunpath]];

    function init(root = document) {
        FEATURES.forEach(([selector, feature]) => {
            within(root, selector).forEach((el) => {
                if (!wired.has(el)) wired.set(el, feature(el));
            });
        });
    }

    function destroy(root = document) {
        within(root, FEATURES.map(([selector]) => selector).join(', ')).forEach((el) => {
            wired.get(el)?.();
            wired.delete(el);
        });
    }

    window.DraftmangoSolarEnergy1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
