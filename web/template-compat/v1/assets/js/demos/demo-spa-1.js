/**
 * demo-spa-1.js — Day Spa demo: keeps the hero's hidden slides out of reach, fills the
 * booking form from the address.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-spa-1.css.
 *
 * For frameworks — window.FramoSpa1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the template carousel
 *    (carousel.js) has mounted it, every slide but the one on show is inert. Without the script
 *    the slides hold nothing focusable, so nothing is lost.
 * 2. Booking prefill — [data-custom-prefill] on the contact page's form. The Home's booking bar
 *    and the treatment links send ?treatment=…&date=…&guests=…; each named field that matches
 *    takes the value (a select only when one of its options has it). Without the script the
 *    form simply starts empty.
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
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
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
            swiper?.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       2. Booking prefill
       ------------------------------------------------------------------ */
    function prefill(form) {
        const params = new URLSearchParams(location.search);
        for (const [name, value] of params) {
            const field = form.elements.namedItem(name);
            if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement))
                continue;
            if (field instanceof HTMLSelectElement) {
                const option = [...field.options].find((o) => (o.value || o.text) === value);
                if (option) field.value = option.value || option.text;
            } else if (field.type !== 'hidden') {
                field.value = value;
            }
        }
        return () => {};
    }

    function init(root = document) {
        within(root, '[data-custom-hero]').forEach((el) => {
            if (!wired.has(el)) wired.set(el, hero(el));
        });
        within(root, 'form[data-custom-prefill]').forEach((el) => {
            if (!wired.has(el)) wired.set(el, prefill(el));
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-hero], form[data-custom-prefill]').forEach((el) => {
            wired.get(el)?.();
            wired.delete(el);
        });
    }

    window.FramoSpa1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
