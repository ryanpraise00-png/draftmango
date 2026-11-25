/**
 * demo-construction-2.js — Construction & Renovation demo: the hero's project column.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-construction-2.css (.custom-projects).
 *
 * For frameworks — window.DraftmangoConstruction2 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Projects — [data-custom-projects] holds one .custom-project per slide of the hero's
 *    Swiper (.custom-hero-swiper, mounted by the template's carousel.js), in the same order.
 *    The project of the current slide carries .is-active; the others are inert. The wrapper is
 *    aria-live="polite", so the new project is announced when the visitor changes the slide.
 *    Without the script the first project stays shown, as the first photo does.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Projects
       ------------------------------------------------------------------ */
    function projects(el) {
        const items = [...el.querySelectorAll('.custom-project')];
        const slides = el.closest('.custom-hero')?.querySelector('.custom-hero-swiper');
        if (items.length < 2 || !slides) return () => {};

        let swiper = null;
        const show = () => {
            const active = (swiper?.realIndex ?? 0) % items.length;
            items.forEach((item, i) => {
                const on = i === active;
                item.classList.toggle('is-active', on);
                item.inert = !on;
            });
        };

        // Autoplay changes are not announced, only the visitor's own
        const live = (on) => el.setAttribute('aria-live', on ? 'polite' : 'off');
        const onPress = () => live(true);
        const onAuto = () => live(false);

        const attach = () => {
            if (swiper || !slides.swiper) return;
            swiper = slides.swiper;
            swiper.on('slideChange', show);
            swiper.on('autoplay', onAuto);
            swiper.on('navigationPrev navigationNext', onPress);
            watcher.disconnect();
            live(!swiper.autoplay?.running);
            show();
        };

        // carousel.js mounts the slideshow later: wait for it
        const watcher = new MutationObserver(attach);
        watcher.observe(slides, { attributes: true, attributeFilter: ['class'] });
        show();
        attach();

        return () => {
            watcher.disconnect();
            swiper?.off('slideChange', show);
            swiper?.off('autoplay', onAuto);
            swiper?.off('navigationPrev navigationNext', onPress);
            items.forEach((item) => {
                item.inert = false;
            });
        };
    }

    const FEATURES = [['[data-custom-projects]', projects]];

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

    window.DraftmangoConstruction2 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
