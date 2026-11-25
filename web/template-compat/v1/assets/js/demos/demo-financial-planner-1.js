/**
 * demo-financial-planner-1.js — the Financial Planner demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it (the first life stage and its card stay on show); it only adds
 * what the template carousel cannot say by itself.
 *
 * 1. Life timeline — [data-custom-hero] on the hero's .swiper, whose pins are
 *    the carousel's thumbnail rail (data-thumbs). Once the template carousel
 *    (carousel.js) has mounted it:
 *    - the goal card glides to the active pin (--custom-at) and shows that
 *      stage's goal; pins before it read as reached (.is-passed);
 *    - the progress line runs to the active pin and, while autoplay runs,
 *      creeps toward the next one (autoplayTimeLeft); a change of slide, or
 *      autoplay stopping (keyboard focus, off screen), eases it to its pin;
 *    - autoplay pauses while the mouse is over the stage;
 *    - every slide and goal but the one on show is inert.
 *    Reduced motion: the carousel runs no autoplay, so the line simply sits on
 *    the active pin and the card moves without transition (CSS).
 *
 * window.FramoFinancialPlanner1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Life timeline
       ------------------------------------------------------------------ */
    const RULER_END = 65;

    function timeline(el) {
        const card = el.querySelector('.custom-goal');
        const goals = [...el.querySelectorAll('[data-goal]')];
        const pins = [...el.querySelectorAll('.custom-pin')];
        const line = el.querySelector('.custom-ruler-progress');
        const ages = pins.map((pin) => Number.parseFloat(pin.style.getPropertyValue('--age')));
        let swiper = null;
        let watcher = null;
        let shown = -1;
        let easing = 0; // timer that ends the line's eased jump
        let hovering = false;

        const setLine = (age) => line?.style.setProperty('--custom-progress', age.toFixed(2));

        // Ease the line to the pin on show; the per-frame creep waits it out
        const settle = () => {
            line?.classList.add('is-jumping');
            clearTimeout(easing);
            easing = setTimeout(() => {
                easing = 0;
                line?.classList.remove('is-jumping');
            }, 700);
            setLine(ages[swiper.realIndex]);
        };

        const show = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            const now = swiper.realIndex;
            if (now === shown) return;
            shown = now;

            card?.style.setProperty('--custom-at', ages[now]);
            goals.forEach((goal, i) => {
                goal.classList.toggle('is-active', i === now);
                goal.inert = i !== now;
            });
            pins.forEach((pin, i) => pin.classList.toggle('is-passed', i < now));
            settle();
        };

        const creep = (s, time, progress) => {
            if (easing) return;
            const from = ages[s.realIndex];
            const to = ages[s.realIndex + 1] ?? RULER_END;
            setLine(from + (to - from) * Math.min(1, Math.max(0, 1 - progress)));
        };

        // Hover pause: the mouse anywhere on the stage, copy and ruler included
        const enter = (e) => {
            if (e.pointerType !== 'mouse') return;
            hovering = true;
            if (swiper?.autoplay?.running && !swiper.autoplay.paused) swiper.autoplay.pause();
        };
        const leave = (e) => {
            if (e.pointerType !== 'mouse') return;
            hovering = false;
            if (swiper?.autoplay?.running && swiper.autoplay.paused) swiper.autoplay.resume();
        };
        // Started again by the carousel (focus left, back on screen): honour a
        // pointer still resting on the stage, or clear a pause it left behind
        const restarted = () => {
            if (hovering) swiper.autoplay.pause();
            else swiper.autoplay.paused = false;
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', show);
            swiper.on('autoplayTimeLeft', creep);
            swiper.on('autoplayStart', restarted);
            swiper.on('autoplayStop', settle);
            el.addEventListener('pointerenter', enter);
            el.addEventListener('pointerleave', leave);
            show();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            clearTimeout(easing);
            el.removeEventListener('pointerenter', enter);
            el.removeEventListener('pointerleave', leave);
            if (!swiper) return;
            swiper.off('slideChange', show);
            swiper.off('autoplayTimeLeft', creep);
            swiper.off('autoplayStart', restarted);
            swiper.off('autoplayStop', settle);
            swiper.slides.forEach((slide) => {
                slide.inert = false;
            });
            goals.forEach((goal) => {
                goal.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['[data-custom-hero]', timeline]];
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

    window.FramoFinancialPlanner1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
