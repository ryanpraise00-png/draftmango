/**
 * demo-consulting-1.js — the Consulting demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it, every slide but the one on
 *    show is inert (its links leave the tab order, screen readers read only the
 *    slide on screen), and the numbered rail marks the current slide
 *    (aria-current) and names each number "Slide 2".
 * 2. Process steps — [data-custom-steps] on the steps list. As the page
 *    scrolls, every step whose top has passed 60% of the viewport height gets
 *    .is-reached (CSS fills its circle and the connector segment above it).
 *    Without the script the steps simply stay unlit.
 *
 * window.FramoConsulting1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Hero slideshow
       ------------------------------------------------------------------ */
    function hero(el) {
        const rail = el.closest('section')?.querySelector('.swiper-pagination');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            rail?.querySelectorAll('.swiper-pagination-bullet').forEach((dot, i) => {
                dot.setAttribute('aria-label', `Slide ${i + 1}`);
                dot.toggleAttribute('aria-current', i === swiper.realIndex);
            });
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange paginationRender', sync);
            sync();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            swiper?.off('slideChange paginationRender', sync);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Process steps
       ------------------------------------------------------------------ */
    function steps(el) {
        const items = [...el.children];
        let frame = 0;

        const measure = () => {
            frame = 0;
            const line = innerHeight * 0.6;
            items.forEach((item) =>
                item.classList.toggle('is-reached', item.getBoundingClientRect().top < line),
            );
        };
        const queue = () => {
            frame ||= requestAnimationFrame(measure);
        };

        addEventListener('scroll', queue, { passive: true });
        addEventListener('resize', queue);
        measure();

        return () => {
            cancelAnimationFrame(frame);
            removeEventListener('scroll', queue);
            removeEventListener('resize', queue);
            items.forEach((item) => item.classList.remove('is-reached'));
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-hero]', hero],
        ['[data-custom-steps]', steps],
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

    window.FramoConsulting1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
