/**
 * demo-factory-1.js — Factory & Manufacturing demo: keeps the hero's hidden slides out of reach
 * and runs the shop traveler's progress rules with the slideshow.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-factory-1.css.
 *
 * For frameworks — window.DraftmangoFactory1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper, whose data-thumbs names the
 *    traveler's op buttons (carousel.js links them to the slides and marks the one on show
 *    .is-active). Once the template carousel has mounted it, every slide but the one on show is
 *    inert, and each op's .custom-rule gets --progress (0–1): the ops already passed are full,
 *    the one on show fills with the autoplay timer, the ones to come are empty. Without autoplay
 *    (reduced motion) the op on show is full. Autoplay, the off-screen pause and the keyboard hold
 *    are the carousel's own. Without the script the first photo shows still and its op is full.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Hero slideshow
       ------------------------------------------------------------------ */
    function hero(el) {
        const rules = [
            ...(document.querySelector(el.dataset.thumbs)?.querySelectorAll('.custom-rule') ?? []),
        ];
        let swiper = null;
        let watcher = null;

        const timed = () => Boolean(swiper.params.autoplay?.enabled);

        const sync = () => {
            const current = swiper.realIndex;
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            rules.forEach((rule, i) => {
                const fill = i < current || (i === current && !timed()) ? 1 : 0;
                rule.style.setProperty('--progress', String(fill));
            });
        };

        const tick = (s, time, progress) => {
            rules[s.realIndex]?.style.setProperty('--progress', (1 - progress).toFixed(3));
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', tick);
            sync();
        };

        // carousel.js sets el.swiper (and .swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            swiper?.off('slideChange', sync);
            swiper?.off('autoplayTimeLeft', tick);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
            rules.forEach((rule) => rule.style.removeProperty('--progress'));
        };
    }

    const FEATURES = [['[data-custom-hero]', hero]];

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

    window.DraftmangoFactory1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
