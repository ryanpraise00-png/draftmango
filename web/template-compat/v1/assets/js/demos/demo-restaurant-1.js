/**
 * demo-restaurant-1.js — Restaurant demo: keeps the hero's hidden slides out of reach, shows the
 * photo of the course under the pointer or the keyboard beside the printed menu, fills the
 * reservation request from the Home's bar.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-restaurant-1.css.
 *
 * For frameworks — window.FramoRestaurant1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero slideshow — [data-custom-hero] on the hero's .swiper. Once the template carousel
 *    (carousel.js) has mounted it, every slide but the one on show is inert, so its caption is
 *    not read twice. Autoplay, the off-screen pause and reduced motion are the carousel's own.
 *    Without the script the first photo and its caption show still.
 * 2. Menu photos — [data-custom-dishes] around the menu card and its frame. Hovering or focusing a
 *    course row ([data-dish] = index of an img[data-custom-dish-photo]) brings that photo up, marks
 *    the row .is-active and writes the dish into [data-custom-dish-caption]. Without the script
 *    the first photo and caption stay; the frame is decoration (the dishes are in the list).
 * 3. Prefill — [data-custom-prefill] on a form. Each field whose name is in the address (?party=2
 *    &date=…&time=7:00 pm, as the Home's reservation bar sends them) takes that value; a select only
 *    when it has a matching option. Without the script the form opens with its own defaults.
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
       2. Menu photos
       ------------------------------------------------------------------ */
    function dishes(el) {
        const rows = [...el.querySelectorAll('[data-dish]')];
        const photos = [...el.querySelectorAll('[data-custom-dish-photo]')];
        const caption = el.querySelector('[data-custom-dish-caption]');

        const show = (row) => {
            const index = Number(row.dataset.dish);
            photos.forEach((photo, i) => photo.classList.toggle('is-active', i === index));
            rows.forEach((other) => other.classList.toggle('is-active', other === row));
            const dish = row.querySelector('.custom-course-dish')?.textContent.trim();
            if (caption && dish) caption.textContent = dish;
        };

        const onEnter = (event) => {
            const row = event.target.closest?.('[data-dish]');
            if (row && el.contains(row)) show(row);
        };

        el.addEventListener('pointerover', onEnter);
        el.addEventListener('focusin', onEnter);

        return () => {
            el.removeEventListener('pointerover', onEnter);
            el.removeEventListener('focusin', onEnter);
            rows.forEach((row) => row.classList.remove('is-active'));
        };
    }

    /* ------------------------------------------------------------------
       3. Prefill
       ------------------------------------------------------------------ */
    function prefill(form) {
        const params = new URLSearchParams(window.location.search);
        params.forEach((value, name) => {
            const field = form.elements.namedItem(name);
            if (!(field instanceof HTMLElement) || !('value' in field)) return;
            if (field instanceof HTMLSelectElement) {
                const option = [...field.options].find((o) => (o.value || o.text) === value);
                if (option) field.value = option.value;
            } else {
                field.value = value;
            }
        });
        return () => {};
    }

    const FEATURES = [
        ['[data-custom-hero]', hero],
        ['[data-custom-dishes]', dishes],
        ['[data-custom-prefill]', prefill],
    ];

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

    window.FramoRestaurant1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
