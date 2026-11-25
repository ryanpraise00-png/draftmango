/**
 * demo-fashion-store-2.js — the Casual Fashion Store demo's own behaviour (classic script, this demo's pages only)
 *
 * Filmstrip ([data-custom-film] on the hero's .swiper; carousel.js mounts it in free mode): the strip drifts
 * slowly to its end and back, and holds while the pointer is over it, focus is in it, a finger or the
 * scrollbar drags it, an arrow is sliding it or it is off screen. Reduced motion: no drift — the arrows,
 * the drag and the scrollbar still move it. Cards out of view are reached with Tab (Swiper slides them in).
 * Tee set ([data-custom-bundle]): the price-swap cards' Add fills three slots instead of the bag; Add Set to
 * Bag adds the three at the set price. Bag count: any other card added in <main> (a wishlist card too), or a
 * [data-custom-buy] form (the product page, its data-price), adds its quantity and price to
 * $store.cart.extra / extraTotal (the mini cart's count reads them).
 * window.DraftmangoFashionStore2 = { init, destroy }.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const SPEED = 22; // px per second
    const REST = 1600; // ms held at each end before turning

    /* ------------------------------------------------------------------
       Filmstrip drift
       ------------------------------------------------------------------ */
    function film(host) {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)');
        const holds = new Set();
        const film = host.closest('.custom-film') ?? host;
        let swiper = null;
        let watcher = null;
        let frame = 0;
        let last = 0;
        let dir = -1;
        let restUntil = 0;
        let visible = true;

        const hold = (key, on) => {
            on ? holds.add(key) : holds.delete(key);
        };

        const tick = (now) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min(64, now - (last || now));
            last = now;
            if (
                !swiper ||
                reduce.matches ||
                holds.size ||
                !visible ||
                document.hidden ||
                swiper.animating
            )
                return;
            if (now < restUntil) return;

            const min = swiper.maxTranslate();
            const max = swiper.minTranslate();
            if (min >= max) return;
            let t = swiper.getTranslate() + (dir * SPEED * dt) / 1000;
            if (t <= min || t >= max) {
                t = Math.min(max, Math.max(min, t));
                dir = -dir;
                restUntil = now + REST;
            }
            swiper.setTranslate(t);
            swiper.updateProgress(t);
            swiper.updateActiveIndex();
            swiper.updateSlidesClasses();
        };

        const on = {
            enter: (e) => {
                if (e.pointerType !== 'touch') hold('hover', true);
            },
            leave: () => hold('hover', false),
            focusin: () => hold('focus', true),
            focusout: (e) => {
                if (!film.contains(e.relatedTarget)) hold('focus', false);
            },
            down: () => hold('drag', true),
            up: () => {
                hold('drag', false);
                restUntil = performance.now() + REST;
            },
        };

        film.addEventListener('pointerenter', on.enter);
        film.addEventListener('pointerleave', on.leave);
        film.addEventListener('focusin', on.focusin);
        film.addEventListener('focusout', on.focusout);
        film.addEventListener('pointerdown', on.down);
        addEventListener('pointerup', on.up);
        addEventListener('pointercancel', on.up);

        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
        });
        io.observe(host);

        const attach = () => {
            if (swiper || !host.swiper) return;
            swiper = host.swiper;
            watcher?.disconnect();
            restUntil = performance.now() + REST;
            frame = requestAnimationFrame(tick);
        };

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (host.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(host, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            cancelAnimationFrame(frame);
            watcher?.disconnect();
            io.disconnect();
            film.removeEventListener('pointerenter', on.enter);
            film.removeEventListener('pointerleave', on.leave);
            film.removeEventListener('focusin', on.focusin);
            film.removeEventListener('focusout', on.focusout);
            film.removeEventListener('pointerdown', on.down);
            removeEventListener('pointerup', on.up);
            removeEventListener('pointercancel', on.up);
        };
    }

    /* ------------------------------------------------------------------
       Tee set (3 for $66): a card's Add fills the next slot instead of the
       bag; a filled slot is a button that empties it; with three in, Add Set
       to Bag puts them in the bag at the set price
       ------------------------------------------------------------------ */
    function bundle(root) {
        const slots = [...root.querySelectorAll('[data-custom-slot]')];
        const status = root.querySelector('[data-custom-set-status]');
        const was = root.querySelector('[data-custom-set-was]');
        const addSet = root.querySelector('[data-custom-set-add]');
        const single = Number(root.dataset.single) || 0;
        const price = Number(root.dataset.set) || 0;
        let picks = [];

        // The cards say what their button does here
        for (const btn of root.querySelectorAll('.product-card-swap')) {
            const card = btn.closest('[data-product]');
            const name = `${card.querySelector('.product-card-title')?.textContent.trim()} in ${card.querySelector('.product-card-cat')?.textContent.trim()}`;
            btn.setAttribute('aria-label', `Add ${name} to your set`);
            const idle = btn.querySelector('.btn-atc-idle');
            if (idle?.firstChild) idle.firstChild.textContent = 'Add to Set ';
        }

        const render = () => {
            slots.forEach((slot, i) => {
                const pick = picks[i];
                slot.innerHTML = pick
                    ? `<button type="button" class="custom-set-item" aria-label="Remove ${pick.name} from your set"><img src="${pick.img}" alt="" width="900" height="900"><i class="ph-bold ph-x" aria-hidden="true"></i></button>`
                    : `<span class="custom-set-empty">${i + 1}</span>`;
            });
            const full = picks.length === slots.length;
            status.textContent = full
                ? 'Your set of 3'
                : `Your set: ${picks.length} of ${slots.length}`;
            was.hidden = !full;
            was.textContent = `$${single * slots.length}`;
            addSet.disabled = !full;
        };

        const onAdded = (e) => {
            const card = e.target.closest?.('[data-product]');
            if (!card || !root.contains(card)) return;
            const name = card.querySelector('.product-card-cat')?.textContent.trim() ?? '';
            const img = card.querySelector('.product-card-img')?.getAttribute('src') ?? '';
            picks = [...picks, { name: `Easy Crew Tee in ${name}`, img }].slice(-slots.length);
            render();
        };

        const onClick = (e) => {
            const item = e.target.closest('.custom-set-item');
            if (item) {
                const i = slots.indexOf(item.closest('[data-custom-slot]'));
                picks = picks.filter((_, k) => k !== i);
                render();
                return;
            }
            if (e.target.closest('[data-custom-set-add]') && picks.length === slots.length) {
                const cart = window.Alpine?.store('cart');
                if (cart) {
                    cart.extra = (cart.extra ?? 0) + picks.length;
                    cart.extraTotal = (cart.extraTotal ?? 0) + price;
                }
                picks = [];
                render();
                status.textContent = 'Added to your bag. Pick another three?';
            }
        };

        root.addEventListener('cart-added', onAdded);
        root.addEventListener('click', onClick);
        render();

        return () => {
            root.removeEventListener('cart-added', onAdded);
            root.removeEventListener('click', onClick);
        };
    }

    /* ------------------------------------------------------------------
       The bag count: a card added on the page adds its quantity and price
       to $store.cart.extra / extraTotal (the template cards fire cart-added
       but never touch the store); the tee set handles its own cards
       ------------------------------------------------------------------ */
    document.addEventListener('cart-added', (event) => {
        const cart = window.Alpine?.store('cart');
        const card = event.target.closest?.(
            'main [data-product], main [data-custom-buy], main [data-wish]',
        );
        if (!cart || !card || card.closest('[data-custom-bundle]')) return;
        const qty = Number(card.querySelector('.qty-input')?.value ?? 1) || 1;
        const shown =
            card.querySelector('.product-price ins, .product-price > span')?.textContent ?? '';
        const price = Number(card.dataset.price) || Number(shown.replace(/[^\d.]/g, '')) || 0;
        cart.extra = (cart.extra ?? 0) + qty;
        cart.extraTotal = (cart.extraTotal ?? 0) + price * qty;
    });

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-film]', film],
        ['[data-custom-bundle]', bundle],
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

    window.DraftmangoFashionStore2 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
