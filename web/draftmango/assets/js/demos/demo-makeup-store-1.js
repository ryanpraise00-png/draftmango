/**
 * demo-makeup-store-1.js — the Makeup Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it: the hero is the template carousel (carousel.js: fade, autoplay,
 * arrows, the shade tabs as its data-thumbs list) and the first look's shelf
 * shows.
 *
 * Look tabs — once the template has mounted the hero's Swiper, the slide on
 * show selects its tab (aria-selected, a roving tabindex; arrow keys, Home and
 * End move between looks) and shows its shelf (the others inert). The active
 * swatch's ring fills with the autoplay timer (--fill); without autoplay
 * (reduced motion) the ring stays full.
 *
 * window.DraftmangoMakeupStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const cleanups = new WeakMap();

    // The template mounts carousels on its own schedule: wait for el.swiper
    function whenMounted(el, done) {
        if (el.swiper) return (done(el.swiper), () => {});
        const watch = new MutationObserver(() => {
            if (!el.swiper) return;
            watch.disconnect();
            done(el.swiper);
        });
        watch.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => watch.disconnect();
    }

    function looks(hero) {
        const el = hero.querySelector('.swiper');
        const tabs = [...hero.querySelectorAll('[role="tab"]')];
        const sets = [...hero.querySelectorAll('[data-look-shelf]')];
        if (!el || !tabs.length) return () => {};

        let swiper = null;

        const select = () => {
            const at = swiper.realIndex;
            tabs.forEach((tab, i) => {
                const on = i === at;
                tab.setAttribute('aria-selected', String(on));
                tab.tabIndex = on ? 0 : -1;
                if (!on) tab.style.setProperty('--fill', '0');
            });
            sets.forEach((set, i) => {
                set.classList.toggle('is-active', i === at);
                set.inert = i !== at;
            });
        };

        let filled = '';
        const onTime = (s, time, progress) => {
            const fill = (1 - progress).toFixed(3);
            if (fill === filled) return;
            filled = fill;
            tabs[s.realIndex]?.style.setProperty('--fill', fill);
        };

        // Autoplay held (keyboard focus, off screen): the ring shows full
        const onStop = () => tabs[swiper.realIndex]?.style.setProperty('--fill', '1');

        // Arrow keys walk the tab list and select as they go
        const onKey = (e) => {
            const i = tabs.indexOf(e.target.closest('[role="tab"]'));
            if (i < 0) return;
            const last = tabs.length - 1;
            const next = {
                ArrowRight: i + 1,
                ArrowDown: i + 1,
                ArrowLeft: i - 1,
                ArrowUp: i - 1,
                Home: 0,
                End: last,
            }[e.key];
            if (next === undefined) return;
            e.preventDefault();
            const to = tabs[(next + tabs.length) % tabs.length];
            to.focus();
            to.click();
        };

        const unwatch = whenMounted(el, (s) => {
            swiper = s;
            swiper.on('slideChange', select);
            if (swiper.params.autoplay?.enabled)
                swiper.on('autoplayTimeLeft', onTime).on('autoplayStop', onStop);
            else tabs.forEach((tab) => tab.style.removeProperty('--fill'));
            select();
        });

        hero.addEventListener('keydown', onKey);

        return () => {
            unwatch();
            swiper?.off('slideChange', select);
            swiper?.off('autoplayTimeLeft', onTime);
            swiper?.off('autoplayStop', onStop);
            hero.removeEventListener('keydown', onKey);
        };
    }

    function init(root = document) {
        within(root, '[data-custom-looks]').forEach((hero) => {
            if (!cleanups.has(hero)) cleanups.set(hero, looks(hero));
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-looks]').forEach((hero) => {
            cleanups.get(hero)?.();
            cleanups.delete(hero);
        });
    }

    window.DraftmangoMakeupStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
