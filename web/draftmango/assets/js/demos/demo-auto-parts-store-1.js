/**
 * demo-auto-parts-store-1.js — the Auto Parts Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages, after main.js has
 * started Alpine.
 *
 * Header cart — an add-to-cart on a product card in the page (deals, best
 * sellers, new arrivals) raises the cart's count and running total when the
 * template's addToCart reports it (cart-added); the mini cart adds
 * $store.cart.extra / extraTotal to its own lines (x-effect), so the chip in
 * the bar reads the new total.
 */
(() => {
    'use strict';

    function onAdded(e) {
        const cart = window.Alpine?.store('cart');
        const item = e.target.closest?.('main [data-product]');
        if (!item || !cart) return;
        cart.extra = (cart.extra ?? 0) + 1;
        cart.extraTotal = (cart.extraTotal ?? 0) + (Number(item.dataset.price) || 0);
    }

    document.addEventListener('cart-added', onAdded);
})();
