/**
 * demo-fashion-store-3.js — the Designer Fashion Store demo's own behaviour (classic script, this demo's pages only)
 *
 * Covers ([data-custom-covers] around the hero's .swiper): the counter follows the cover on show and its line fills
 * with the autoplay; covers off screen are inert; on a mouse the three layers of the cover (backdrop, masthead,
 * model) drift apart a few pixels with the pointer (not with reduced motion).
 * Designers A–Z ([data-custom-az]): a letter shows its labels only (click, or a resting pointer), All shows them all.
 * Mega menus (.custom-mega): Escape closes the open panel and keeps focus on its button.
 * Product cards in <main>: their Add to cart adds one to the header's bag count.
 * Without this file the covers still run (template carousel) and the list shows every label.
 * window.FramoFashionStore3 = { init, destroy }.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------
       Covers
       ------------------------------------------------------------------ */
    function covers(deck) {
        const el = deck.querySelector('.swiper');
        const now = deck.querySelector('[data-custom-now]');
        if (!el) return null;
        let swiper = null;
        let watcher = null;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            if (now) now.textContent = String(swiper.realIndex + 1).padStart(2, '0');
            deck.style.setProperty('--custom-run', '0');
        };
        const tick = (_s, _time, progress) =>
            deck.style.setProperty('--custom-run', (1 - progress).toFixed(3));
        const rest = () => deck.style.removeProperty('--custom-run');

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', tick);
            swiper.on('autoplayStop', rest);
            sync();
            if (!swiper.autoplay?.running) rest();
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        // The layers drift with a mouse pointer over the cover
        let frame = 0;
        const move = (event) => {
            if (event.pointerType !== 'mouse' || still()) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const box = el.getBoundingClientRect();
                deck.style.setProperty(
                    '--custom-px',
                    (((event.clientX - box.left) / box.width) * 2 - 1).toFixed(3),
                );
                deck.style.setProperty(
                    '--custom-py',
                    (((event.clientY - box.top) / box.height) * 2 - 1).toFixed(3),
                );
            });
        };
        const leave = () => {
            cancelAnimationFrame(frame);
            deck.style.removeProperty('--custom-px');
            deck.style.removeProperty('--custom-py');
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);

        return () => {
            watcher?.disconnect();
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
            leave();
            rest();
            if (swiper) {
                swiper.off('slideChange', sync);
                swiper.off('autoplayTimeLeft', tick);
                swiper.off('autoplayStop', rest);
                swiper.slides.forEach((slide) => {
                    slide.inert = false;
                });
            }
        };
    }

    /* ------------------------------------------------------------------
       Designers A–Z
       ------------------------------------------------------------------ */
    function az(root) {
        const keys = [...root.querySelectorAll('button[data-custom-key]')];
        const items = [...root.querySelectorAll('[data-custom-letter]')];
        let timer = 0;

        const show = (key) => {
            keys.forEach((k) =>
                k.setAttribute('aria-pressed', String(k.dataset.customKey === key)),
            );
            items.forEach((item) => {
                item.hidden = key !== 'all' && item.dataset.customLetter !== key;
            });
        };
        const onClick = (event) => show(event.currentTarget.dataset.customKey);
        // A pointer resting on a letter shows it too; one passing over the row does not
        const onEnter = (event) => {
            if (event.pointerType !== 'mouse') return;
            const key = event.currentTarget.dataset.customKey;
            clearTimeout(timer);
            timer = setTimeout(() => show(key), 120);
        };
        const onLeave = () => clearTimeout(timer);

        keys.forEach((k) => {
            k.addEventListener('click', onClick);
            k.addEventListener('pointerenter', onEnter);
            k.addEventListener('pointerleave', onLeave);
        });

        return () => {
            clearTimeout(timer);
            keys.forEach((k) => {
                k.removeEventListener('click', onClick);
                k.removeEventListener('pointerenter', onEnter);
                k.removeEventListener('pointerleave', onLeave);
            });
            show('all');
        };
    }

    /* ------------------------------------------------------------------
       Mega menus: Escape
       ------------------------------------------------------------------ */
    function mega(li) {
        const close = (event) => {
            if (event.key !== 'Escape' || !li.matches(':hover, :focus-within')) return;
            li.classList.add('custom-mega-closed');
            li.querySelector(':scope > .nav-link')?.focus();
        };
        const reopen = (event) => {
            if (event.type === 'focusout' && li.contains(event.relatedTarget)) return;
            li.classList.remove('custom-mega-closed');
        };
        li.addEventListener('keydown', close);
        li.addEventListener('mouseleave', reopen);
        li.addEventListener('focusout', reopen);
        return () => {
            li.removeEventListener('keydown', close);
            li.removeEventListener('mouseleave', reopen);
            li.removeEventListener('focusout', reopen);
            li.classList.remove('custom-mega-closed');
        };
    }

    /* ------------------------------------------------------------------
       The bag count: a product card's Add to cart on the page adds one
       (the template cards report cart-added but leave the store alone;
       the cover looks add their three pieces themselves)
       ------------------------------------------------------------------ */
    document.addEventListener('cart-added', (event) => {
        const cart = window.Alpine?.store('cart');
        if (cart && event.target.closest?.('main [data-product]')) cart.count += 1;
    });

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-covers]', covers],
        ['[data-custom-az]', az],
        ['.nav-megamenu.custom-mega', mega],
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

    window.FramoFashionStore3 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
