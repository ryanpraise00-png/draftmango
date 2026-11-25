/**
 * demo-furniture-store-1.js — the Furniture Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages, after main.js has
 * started Alpine.
 *
 * A room in the address — Shop by Room links ("?room=bedroom") open the Rooms
 * page on that room: the room goes into the catalogue's sizes facet, the one
 * its round room photos set.
 *
 * window.DraftmangoFurnitureStore1 = { init(root) } for page transitions.
 */
(() => {
    'use strict';

    function init(root = document) {
        const value = new URLSearchParams(location.search).get('room');
        const el = root.querySelector('[x-data^="productFilter"]');
        if (!value || !el || !/^[a-z]+$/.test(value)) return;
        const data = window.Alpine?.$data(el);
        if (Array.isArray(data?.sizes)) data.sizes = [value];
    }

    window.DraftmangoFurnitureStore1 = { init };
    init();
})();
