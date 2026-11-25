/**
 * demo-architecture-firm-1.js — the Architecture Firm demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it; it only adds what the template carousel cannot say by itself.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the
 *    template carousel (carousel.js) has mounted it: every slide but the one on
 *    show is inert; the section's [data-custom-counter] shows the slide number
 *    ([data-custom-counter-now]) and fills its line with the autoplay timer
 *    (--custom-progress); [data-custom-explore] takes the slide's
 *    data-custom-href and names the project. Without the script: slide 1, the
 *    counter at 01 with a third of the line, the link to the projects.
 * 2. Badge rings — every .custom-badge-ring gets .is-paused while it is off
 *    screen (CSS stops the rotation; reduced motion never starts it).
 *
 * window.FramoArchitectureFirm1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const pad = (n) => String(n).padStart(2, '0');

    /* ------------------------------------------------------------------
       1. Hero slideshow
       ------------------------------------------------------------------ */
    function hero(el) {
        const section = el.closest('section');
        const counter = section?.querySelector('[data-custom-counter]');
        const now = counter?.querySelector('[data-custom-counter-now]');
        const explore = section?.querySelector('[data-custom-explore]');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            const total = swiper.slides.length;
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            const active = swiper.slides[swiper.activeIndex];
            if (now) now.textContent = pad(swiper.realIndex + 1);
            if (counter && !swiper.autoplay?.running) {
                counter.style.setProperty(
                    '--custom-progress',
                    String((swiper.realIndex + 1) / total),
                );
            }
            if (explore && active) {
                explore.href = active.dataset.customHref ?? explore.href;
                const name = active.querySelector('.custom-hero-name')?.textContent.trim();
                if (name) explore.setAttribute('aria-label', `Explore Project: ${name}`);
            }
        };

        // The line runs with the autoplay timer: empty at the start of a slide, full at its end
        const tick = (s, time, progress) => {
            counter?.style.setProperty('--custom-progress', (1 - progress).toFixed(3));
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', tick);
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
            swiper?.off('autoplayTimeLeft', tick);
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Badge rings
       ------------------------------------------------------------------ */
    function ring(el) {
        const io = new IntersectionObserver((entries) => {
            el.classList.toggle('is-paused', !entries.at(-1).isIntersecting);
        });
        io.observe(el);
        return () => {
            io.disconnect();
            el.classList.remove('is-paused');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-hero]', hero],
        ['.custom-badge-ring', ring],
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

    window.FramoArchitectureFirm1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
