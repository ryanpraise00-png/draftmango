/**
 * demo-grocery-store-1.js — the Grocery Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it: the produce sits still and the aisle chips scroll natively.
 *
 * 1. Produce parallax — [data-custom-stage]: the pointer's position over the
 *    stage, from -1 to 1 each way, is written to --px / --py; each cut-out
 *    moves by its own depth (--d) × 12px at most (the CSS). Off with reduced
 *    motion and on touch screens (no hover).
 * 2. Aisle chips — the header's chip row scrolls sideways on narrow laptops;
 *    on a touch screen Lenis must leave that swipe to the row
 *    (data-lenis-prevent-touch, not the blanket attribute, which would freeze
 *    vertical scrolling over it).
 * 3. Header cart — an Add on a product card (its data-price × the quantity
 *    stepper) or a recipe's Add Ingredients (data-price for the basket,
 *    data-items for its count) raises the cart pill's count and total
 *    when the template's addToCart reports it. The mini cart derives the
 *    store from its own lines (x-effect) plus $store.cart.extra /
 *    extraTotal, so additions from outside it are written there. The
 *    product and recipe forms carry data-gs1-basket with a bound
 *    data-price (and data-items for a whole kit); an Add in the Quick view
 *    dialog counts the card it was opened from.
 *
 * window.DraftmangoGroceryStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const cleanups = new WeakMap();

    /* ------------------------------------------------------------------
       1. Produce parallax
       ------------------------------------------------------------------ */
    function parallax(stage) {
        const calm = matchMedia('(prefers-reduced-motion: reduce)');
        const fine = matchMedia('(hover: hover) and (pointer: fine)');
        let frame = 0;
        let next = null;

        const write = () => {
            frame = 0;
            if (!next) return;
            stage.style.setProperty('--px', next.x.toFixed(3));
            stage.style.setProperty('--py', next.y.toFixed(3));
        };

        const move = (e) => {
            if (calm.matches || !fine.matches) return;
            const box = stage.getBoundingClientRect();
            next = {
                x: Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1)),
                y: Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1)),
            };
            frame ||= requestAnimationFrame(write);
        };

        const leave = () => {
            next = { x: 0, y: 0 };
            frame ||= requestAnimationFrame(write);
        };

        stage.addEventListener('pointermove', move, { passive: true });
        stage.addEventListener('pointerleave', leave);

        return () => {
            cancelAnimationFrame(frame);
            stage.removeEventListener('pointermove', move);
            stage.removeEventListener('pointerleave', leave);
            stage.style.removeProperty('--px');
            stage.style.removeProperty('--py');
        };
    }

    /* ------------------------------------------------------------------
       3. Header cart
       ------------------------------------------------------------------ */
    // The card a Quick view was opened from: the dialog sits outside <main>
    // and carries no price of its own
    let viewed = null;
    document.addEventListener(
        'click',
        (e) => {
            const trigger = e.target.closest?.('[data-quick-view]');
            if (trigger) viewed = trigger.closest('[data-product]');
        },
        true,
    );

    function onAdded(e) {
        const cart = window.Alpine?.store('cart');
        let item = e.target.closest?.('main [data-product], main [data-gs1-basket]');
        let scope = item;
        if (!item && viewed && e.target.closest?.('#quick-view')) {
            item = viewed;
            scope = e.target.closest('form') ?? item;
        }
        if (!item || !cart) return;
        const qty =
            Number(item.dataset.items ?? scope.querySelector('.qty-input')?.value ?? 1) || 1;
        const each = item.dataset.items
            ? Number(item.dataset.price) / qty
            : Number(item.dataset.price);
        cart.extra = (cart.extra ?? 0) + qty;
        cart.extraTotal = (cart.extraTotal ?? 0) + (each || 0) * qty;
    }

    document.addEventListener('cart-added', onAdded);

    /* ------------------------------------------------------------------
       Lifecycle
       ------------------------------------------------------------------ */
    function init(root = document) {
        within(root, '[data-custom-stage]').forEach((stage) => {
            if (!cleanups.has(stage)) cleanups.set(stage, parallax(stage));
        });
        document
            .querySelector('.site-header .nav-links')
            ?.setAttribute('data-lenis-prevent-touch', '');
    }

    function destroy(root = document) {
        within(root, '[data-custom-stage]').forEach((stage) => {
            cleanups.get(stage)?.();
            cleanups.delete(stage);
        });
    }

    window.DraftmangoGroceryStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
