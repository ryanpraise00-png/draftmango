/**
 * demo-pet-store-1.js — the Pet Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it: the hero is the template carousel (carousel.js: fade, autoplay,
 * arrows, the pet tabs as its data-thumbs rail), the header chip reads Biscuit.
 *
 * 1. Pet stage — once the template has mounted the hero's Swiper, the slide
 *    on show writes the header chip (the pet's head, its name) and the chip's
 *    saved pets ([data-pet-pick]) slide the stage to their pet. The active
 *    tab's ring fills with the autoplay timer (--fill); hovering the tab bar
 *    pauses the autoplay as hovering the stage does. Reduced motion: the
 *    template gives no autoplay, and the ring stays full.
 * 2. Header cart — a + on the hero's shelf (its card's data-price) raises the
 *    cart pill's count and total when the template's addToCart reports it;
 *    the mini cart adds $store.cart.extra / extraTotal to its own lines
 *    (x-effect).
 *
 * window.DraftmangoPetStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const MEDIA = 'assets/media/demos/pet-store-1/';
    // What the header chip shows for each pet: a saved pet's name, or the pet type
    const CHIP = {
        dog: { name: 'Biscuit', avatar: 'ps1-dog-head.webp' },
        cat: { name: 'Miso', avatar: 'ps1-cat-head.webp' },
        small: { name: 'Small Pets', avatar: 'ps1-rabbit-head.webp' },
        bird: { name: 'Birds', avatar: 'ps1-bird-head.webp' },
    };

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const cleanups = new WeakMap();

    /* ------------------------------------------------------------------
       1. Pet stage
       ------------------------------------------------------------------ */
    function writeChip(pet) {
        const chip = CHIP[pet];
        if (!chip) return;
        document.querySelectorAll('[data-pet-name]').forEach((el) => {
            el.textContent = chip.name;
        });
        document.querySelectorAll('[data-pet-avatar]').forEach((el) => {
            el.src = MEDIA + chip.avatar;
            el.parentElement.style.setProperty('--custom-pet-tint', `var(--custom-${pet})`);
        });
        document.querySelectorAll('[data-pet-pick]').forEach((el) => {
            el.setAttribute('aria-pressed', String(el.dataset.petPick === pet));
        });
    }

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

    function stage(hero) {
        const el = hero.querySelector('.swiper');
        const bar = hero.querySelector('.custom-hero-bar');
        const tabs = [...hero.querySelectorAll('.custom-tab')];
        if (!el) return () => {};

        let swiper = null;
        const pets = [...el.querySelectorAll('[data-pet-slide]')].map((s) => s.dataset.petSlide);
        const petAt = () => pets[swiper.realIndex];

        const onChange = () => {
            writeChip(petAt());
            tabs.forEach((tab, i) => {
                if (i !== swiper.realIndex) tab.style.setProperty('--fill', '0');
            });
        };
        let filled = '';
        const onTime = (s, time, progress) => {
            const fill = (1 - progress).toFixed(3);
            if (fill === filled) return;
            filled = fill;
            tabs[s.realIndex]?.style.setProperty('--fill', fill);
        };

        // The header chip's saved pets live outside the hero
        const onPick = (e) => {
            const pick = e.target.closest?.('[data-pet-pick]');
            const i = pick ? pets.indexOf(pick.dataset.petPick) : -1;
            if (swiper && i > -1) swiper.slideToLoop(i);
        };

        // Autoplay held (keyboard focus, off screen): the ring shows full
        const onStop = () => tabs[swiper.realIndex]?.style.setProperty('--fill', '1');

        const pause = () => swiper?.autoplay?.running && swiper.autoplay.pause();
        const resume = () => swiper?.autoplay?.running && swiper.autoplay.resume();

        const unwatch = whenMounted(el, (s) => {
            swiper = s;
            swiper.on('slideChange', onChange);
            if (swiper.params.autoplay?.enabled)
                swiper.on('autoplayTimeLeft', onTime).on('autoplayStop', onStop);
            else tabs.forEach((tab) => tab.style.removeProperty('--fill'));
            onChange();
        });

        document.addEventListener('click', onPick);
        bar?.addEventListener('mouseenter', pause);
        bar?.addEventListener('mouseleave', resume);

        return () => {
            unwatch();
            swiper?.off('slideChange', onChange);
            swiper?.off('autoplayTimeLeft', onTime);
            swiper?.off('autoplayStop', onStop);
            document.removeEventListener('click', onPick);
            bar?.removeEventListener('mouseenter', pause);
            bar?.removeEventListener('mouseleave', resume);
        };
    }

    /* ------------------------------------------------------------------
       2. Header cart
       ------------------------------------------------------------------ */
    function onAdded(e) {
        const cart = window.Alpine?.store('cart');
        const item = e.target.closest?.('main [data-product]');
        if (!item || !cart) return;
        cart.extra = (cart.extra ?? 0) + 1;
        cart.extraTotal = (cart.extraTotal ?? 0) + (Number(item.dataset.price) || 0);
    }

    document.addEventListener('cart-added', onAdded);

    /* ------------------------------------------------------------------
       Lifecycle
       ------------------------------------------------------------------ */
    function init(root = document) {
        within(root, '[data-custom-pets]').forEach((hero) => {
            if (!cleanups.has(hero)) cleanups.set(hero, stage(hero));
        });
    }

    function destroy(root = document) {
        within(root, '[data-custom-pets]').forEach((hero) => {
            cleanups.get(hero)?.();
            cleanups.delete(hero);
        });
    }

    window.DraftmangoPetStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
