/**
 * demo-security-services-1.js — Security Services demo: the hero slideshow's hidden slides, the
 * hotline pulse off-screen.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-security-services-1.css.
 *
 * For frameworks — window.FramoSecurityServices1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: observers removed. Call it before the markup is
 *                              removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hotline pulse — .custom-hotline-dot. Its CSS pulse (a ring that grows and fades, off under
 *    reduced motion) gets .is-paused while the dot is off-screen or inside a closed panel.
 *    Without this script the pulse simply keeps running.
 * 2. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the template carousel has
 *    mounted it, every slide but the one on show is inert (its links leave the tab order, screen
 *    readers read only the slide on screen) and each dash is named "Slide 2" and marked current.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Hotline pulse
       ------------------------------------------------------------------ */
    let observer = null;

    function pulse(dot) {
        observer ??= new IntersectionObserver((entries) => {
            for (const entry of entries)
                entry.target.classList.toggle('is-paused', !entry.isIntersecting);
        });
        observer.observe(dot);
        return () => {
            observer?.unobserve(dot);
            dot.classList.remove('is-paused');
        };
    }

    /* ------------------------------------------------------------------
       2. Hero slideshow
       ------------------------------------------------------------------ */
    function hero(el) {
        const dots = el.closest('section')?.querySelector('.swiper-pagination');
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            dots?.querySelectorAll('.swiper-pagination-bullet').forEach((dot, i) => {
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
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['.custom-hotline-dot', pulse],
        ['[data-custom-hero]', hero],
    ];
    const wired = new WeakMap(); // element → the function that stops its feature

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (wired.has(el)) continue;
                const stop = feature(el);
                wired.set(el, stop ?? (() => {}));
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

    window.FramoSecurityServices1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
