/**
 * demo-jewelry-store-2.js — the Fine Jewelry Store demo's own behaviour (classic script, this demo's pages only)
 *
 * The bag count: a product card's Add to cart in <main> adds one to the header's bag (the template cards report
 * cart-added and leave the store alone). Without this file the cards still work; only the count stays put.
 */
(() => {
    'use strict';

    document.addEventListener('cart-added', (event) => {
        const cart = window.Alpine?.store('cart');
        if (cart && event.target.closest?.('main [data-product]')) cart.count += 1;
    });
})();
