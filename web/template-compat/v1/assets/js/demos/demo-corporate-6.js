/**
 * demo-corporate-6.js — the Professional Services demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what CSS cannot say in every browser.
 *
 * 1. The panorama — [data-custom-panorama]. Writes --custom-grow (0 → 1) on
 *    it while it scrolls up the window: 0 where it starts in the first view,
 *    1 once its top meets the header. The CSS turns that number into the clip
 *    that opens the inset rounded window to full bleed. One passive scroll
 *    listener, one rAF per frame, and it only listens while the panorama is
 *    near the window (IntersectionObserver). Works in every browser, scroll-
 *    driven animations or not. Reduced motion: nothing runs, the CSS shows
 *    the final full-bleed state.
 *
 * window.FramoCorporate6 = { init(root), destroy(root) } for page transitions.
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
       1. The panorama
       ------------------------------------------------------------------ */
    function panorama(el) {
        let queued = false;
        let listening = false;

        const headerH = () =>
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) ||
            80;

        const update = () => {
            queued = false;
            const vh = window.innerHeight;
            const end = headerH();
            const start = vh * 0.7;
            const top = el.getBoundingClientRect().top;
            const p = Math.min(1, Math.max(0, (start - top) / (start - end)));
            el.style.setProperty('--custom-grow', p.toFixed(4));
        };

        const request = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(update);
        };

        const listen = (on) => {
            if (on === listening) return;
            listening = on;
            window[on ? 'addEventListener' : 'removeEventListener']('scroll', request, {
                passive: true,
            });
            if (on) request();
        };

        const io = new IntersectionObserver(([entry]) => listen(entry.isIntersecting), {
            rootMargin: '25% 0px',
        });
        io.observe(el);
        window.addEventListener('resize', request);
        update();

        return () => {
            io.disconnect();
            listen(false);
            window.removeEventListener('resize', request);
            el.style.removeProperty('--custom-grow');
        };
    }

    function init(root = document) {
        if (reduced.matches) return;
        within(root, '[data-custom-panorama]').forEach((el) => {
            if (!mounted.has(el)) mounted.set(el, panorama(el));
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-panorama]').forEach((el) => {
            mounted.get(el)?.();
            mounted.delete(el);
        });
    }

    reduced.addEventListener('change', () => {
        destroy();
        init();
    });

    window.FramoCorporate6 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
