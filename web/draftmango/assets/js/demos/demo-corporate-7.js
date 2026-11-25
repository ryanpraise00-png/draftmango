/**
 * demo-corporate-7.js — the Risk & Compliance demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it (the first slide's copy shows, the rail buttons still change the
 * slide through the template carousel's data-thumbs); it adds what the
 * carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it:
 *    - the copy block of the slide on show gets .is-active, the others inert;
 *    - the active rail button's ring follows the autoplay (--custom-progress);
 *    - the autoplay pauses while the pointer is over the hero or keyboard
 *      focus is inside it, and resumes where it stopped.
 *    Reduced motion: the carousel runs no autoplay, so the ring stays full.
 *
 * 2. Sectors — [data-custom-sectors]: pointing at or focusing a sector marks
 *    it .is-active and shows the photo in the same position beside the list.
 *    Without the script the first sector and its photo stay on.
 *
 * window.DraftmangoCorporate7 = { init(root), destroy(root) } for page transitions.
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
        const section = el.closest('section');
        const copies = [...section.querySelectorAll('.custom-hero-copy')];
        const rail = document.querySelector(el.dataset.thumbs);
        const buttons = rail ? [...rail.querySelectorAll('button')] : [];
        let swiper = null;
        let watcher = null;
        let pointer = false;
        let focus = false;

        const sync = () => {
            const index = swiper.realIndex;
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            copies.forEach((copy, i) => {
                copy.classList.toggle('is-active', i === index);
                copy.inert = i !== index;
            });
            // The new ring starts empty; without autoplay it stays full (CSS)
            if (swiper.autoplay?.running)
                buttons.forEach((b) => b.style.setProperty('--custom-progress', '0'));
        };

        const progress = (s, time, ratio) => {
            buttons[s.realIndex]?.style.setProperty('--custom-progress', String(1 - ratio));
        };

        const hold = () => {
            if (!swiper?.autoplay?.running) return;
            if (pointer || focus) swiper.autoplay.pause();
            else swiper.autoplay.resume();
        };
        const enter = () => {
            pointer = true;
            hold();
        };
        const leave = () => {
            pointer = false;
            hold();
        };
        const focusIn = (e) => {
            if (e.target.matches(':focus-visible')) {
                focus = true;
                hold();
            }
        };
        const focusOut = (e) => {
            if (!section.contains(e.relatedTarget)) {
                focus = false;
                hold();
            }
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', progress);
            section.addEventListener('pointerenter', enter);
            section.addEventListener('pointerleave', leave);
            section.addEventListener('focusin', focusIn);
            section.addEventListener('focusout', focusOut);
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
            swiper?.off('slideChange', sync);
            swiper?.off('autoplayTimeLeft', progress);
            section.removeEventListener('pointerenter', enter);
            section.removeEventListener('pointerleave', leave);
            section.removeEventListener('focusin', focusIn);
            section.removeEventListener('focusout', focusOut);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
            copies.forEach((copy) => {
                copy.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Sectors
       ------------------------------------------------------------------ */
    function sectors(el) {
        const rows = [...el.querySelectorAll('.custom-sector')];
        const photos = [...el.querySelectorAll('.custom-sector-photos img')];

        const show = (index) => {
            rows.forEach((row, i) => row.classList.toggle('is-active', i === index));
            photos.forEach((photo, i) => photo.classList.toggle('is-active', i === index));
        };

        const listeners = rows.map((row, i) => {
            const on = () => show(i);
            row.addEventListener('pointerenter', on);
            row.addEventListener('focusin', on);
            return [row, on];
        });

        return () =>
            listeners.forEach(([row, on]) => {
                row.removeEventListener('pointerenter', on);
                row.removeEventListener('focusin', on);
            });
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-hero]', hero],
        ['[data-custom-sectors]', sectors],
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

    window.DraftmangoCorporate7 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
