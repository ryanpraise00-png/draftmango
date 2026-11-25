/**
 * demo-auto-services-1.js — the Auto Services demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it.
 *
 * 1. Booking prefill — [data-custom-prefill] on the Book page's form. The Home
 *    booking bar (and the service pages' "Book" links) send ?service=, ?make=
 *    and ?date= here; each value is used only when it matches a choice the form
 *    offers (a service radio, a make option, a YYYY-MM-DD date), then a change
 *    event lets the form's summary pick it up. Without parameters nothing
 *    changes.
 *
 * window.DraftmangoAutoServices1 = { init(root) } for page transitions.
 */
(() => {
    'use strict';

    const fire = (el) => el.dispatchEvent(new Event('change', { bubbles: true }));

    function prefill(form) {
        const params = new URLSearchParams(location.search);

        const service = params.get('service');
        const radio =
            service &&
            [...form.querySelectorAll('input[name="service"]')].find((r) => r.value === service);
        if (radio) {
            radio.checked = true;
            fire(radio);
        }

        const make = params.get('make');
        const select = form.querySelector('select[name="make"]');
        const option =
            make &&
            select &&
            [...select.options].find((o) => o.value && (o.value === make || o.text === make));
        if (option) {
            select.value = option.value;
            fire(select);
        }

        const date = params.get('date');
        const input = form.querySelector('input[name="date"]');
        if (input && /^\d{4}-\d{2}-\d{2}$/.test(date ?? '') && !Number.isNaN(Date.parse(date))) {
            input.value = date;
            fire(input);
        }
    }

    function init(root = document) {
        root.querySelectorAll('[data-custom-prefill]').forEach(prefill);
    }

    window.DraftmangoAutoServices1 = { init };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
