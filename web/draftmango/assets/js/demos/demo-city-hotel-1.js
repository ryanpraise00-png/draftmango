/**
 * demo-city-hotel-1.js — the City Hotel demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it.
 *
 * 1. Booking prefill — [data-custom-prefill] on the Book page's form. The Home
 *    stay band and the Room page's card send ?arrive=, ?depart=, ?guests= and
 *    ?room= here; each value is used only when it matches what the form offers
 *    (a YYYY-MM-DD date, departure after arrival, a guests option, a room
 *    radio). Without parameters nothing changes.
 *
 * window.DraftmangoCityHotel1 = { init(root) } for page transitions.
 */
(() => {
    'use strict';

    const fire = (el) => el.dispatchEvent(new Event('change', { bubbles: true }));
    const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? '') && !Number.isNaN(Date.parse(v));

    function prefill(form) {
        const params = new URLSearchParams(location.search);

        const arrive = params.get('arrive');
        const depart = params.get('depart');
        const arriveInput = form.querySelector('input[name="arrive"]');
        const departInput = form.querySelector('input[name="depart"]');
        if (arriveInput && isDate(arrive)) {
            arriveInput.value = arrive;
            fire(arriveInput);
        }
        if (departInput && isDate(depart) && (!isDate(arrive) || depart > arrive)) {
            departInput.value = depart;
            fire(departInput);
        }

        const guests = params.get('guests');
        const select = form.querySelector('select[name="guests"]');
        const option = guests && select && [...select.options].find((o) => o.value === guests);
        if (option) {
            select.value = option.value;
            fire(select);
        }

        const room = params.get('room');
        const radio =
            room && [...form.querySelectorAll('input[name="room"]')].find((r) => r.value === room);
        if (radio) {
            radio.checked = true;
            fire(radio);
        }
    }

    function init(root = document) {
        root.querySelectorAll('[data-custom-prefill]').forEach(prefill);
    }

    window.DraftmangoCityHotel1 = { init };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
