/**
 * demo-jewelry-store-1.js — the Jewelry Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it (the template carousel still slides, the five cards before it
 * mounts already sit in their places); it only adds what the template
 * carousel cannot say by itself.
 *
 * 1. Jewel box — [data-custom-box] around the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it, every slide gets its
 *    distance from the centre (0 centre, ±1 neighbours, ±2 the outer pair),
 *    worked out from where the row really is: Swiper's translate while
 *    dragging, the wrapper's live transform on every frame of a slide change.
 *    So the cards grow, shrink, rise and change frame continuously as they
 *    travel. From it CSS reads (custom properties on the slide):
 *      --a  the distance (unsigned): the drape on the bead chain, the veil,
 *           the caption plate and the champagne ring
 *      --s  the scale: 1 at the centre, 0.78 beside it, 0.64 at the ends
 *      --x  the step towards the centre (a share of the slide width) that
 *           keeps the gaps between unequal cards equal
 *      --t  the frame: 0 arch (centre and the outer pair), 1 oval (beside it)
 *    The centre card is .is-front (its caption plate is the one on show, and
 *    the one the keyboard reaches; the arrows bring the others in).
 *    A click on a side card brings it to the centre instead of following
 *    its link. Reduced motion: the carousel changes slides without a
 *    transition, so the cards take their places at once.
 *
 * window.DraftmangoJewelryStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Jewel box
       ------------------------------------------------------------------ */
    const scaleAt = (a) =>
        a <= 1
            ? 1 - 0.22 * a
            : a <= 2
              ? 0.78 - 0.14 * (a - 1)
              : Math.max(0.5, 0.64 - 0.1 * (a - 2));
    const stepAt = (a) => (a <= 1 ? 0 : a <= 2 ? 0.18 * (a - 1) : 0.18 + 0.3 * (a - 2));

    function jewelBox(el) {
        const host = el.querySelector('.swiper');
        if (!host) return null;
        let swiper = null;
        let watcher = null;

        let frame = 0;

        const paint = (at = swiper.translate) => {
            const size = swiper.slidesSizesGrid?.[0] || swiper.width;
            const centre = (swiper.width - size) / 2;
            for (const slide of swiper.slides) {
                const p = (slide.offsetLeft + at - centre) / size;
                const a = Math.min(Math.abs(p), 4);
                const s = Math.sign(p);
                slide.style.setProperty('--a', a.toFixed(3));
                slide.style.setProperty('--s', scaleAt(a).toFixed(3));
                slide.style.setProperty('--x', (-s * stepAt(a)).toFixed(3));
                slide.style.setProperty(
                    '--t',
                    ((1 - Math.cos(Math.PI * Math.min(a, 2))) / 2).toFixed(3),
                );
                const front = a < 0.5;
                slide.classList.toggle('is-front', front);
                // One stop for the keyboard: the centre card's name; the arrows reach the rest
                for (const link of slide.querySelectorAll('.custom-piece-plate a')) {
                    if (link.tabIndex !== (front ? 0 : -1)) link.tabIndex = front ? 0 : -1;
                }
            }
        };

        // During a slide change the row glides on a CSS transition: read where it is each frame
        const live = () => {
            paint(new DOMMatrixReadOnly(getComputedStyle(swiper.wrapperEl).transform).m41);
            frame = requestAnimationFrame(live);
        };
        const follow = (s, duration) => {
            cancelAnimationFrame(frame);
            frame = duration > 0 ? requestAnimationFrame(live) : 0;
        };
        const settle = () => {
            cancelAnimationFrame(frame);
            frame = 0;
            paint();
        };
        const moved = () => {
            if (!frame) paint();
        };

        // A side card comes to the centre; the centre card follows its link
        const pick = (e) => {
            const slide = e.target.closest('.swiper-slide');
            if (!swiper || !slide || slide.classList.contains('is-front')) return;
            e.preventDefault();
            swiper.slideToLoop(Number(slide.dataset.swiperSlideIndex));
        };

        const attach = () => {
            if (swiper || !host.swiper) return;
            swiper = host.swiper;
            watcher?.disconnect();
            swiper.on('setTranslate resize slidesUpdated', moved);
            swiper.on('setTransition', follow);
            swiper.on('transitionEnd', settle);
            host.addEventListener('click', pick);
            paint();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (host.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(host, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            host.removeEventListener('click', pick);
            cancelAnimationFrame(frame);
            if (!swiper) return;
            swiper.off('setTranslate resize slidesUpdated', moved);
            swiper.off('setTransition', follow);
            swiper.off('transitionEnd', settle);
            for (const link of el.querySelectorAll('.custom-piece-plate a'))
                link.removeAttribute('tabindex');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-box]', jewelBox]];
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

    window.DraftmangoJewelryStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
