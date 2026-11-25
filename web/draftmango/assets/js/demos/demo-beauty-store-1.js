/**
 * demo-beauty-store-1.js — the Beauty Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Without it the
 * hero keeps step 02 open and every step is still one link away.
 *
 * 1. The routine — [data-custom-routine] on the hero's template .sliding-boxes
 *    and the step bar after it. A step opens on the pointer resting on its
 *    panel (fine pointers), a click / tap, its step button or the arrows. The
 *    open step's bar fills while it plays (CSS animation); when it ends the
 *    next step opens. Playing pauses while the pointer or focus is in the
 *    hero, waits while it is off screen, and never runs with reduced motion or
 *    on phones, where the panels are a swipe row and the bar follows the scroll.
 * 2. Search hints — [data-custom-hints] on the header search: the placeholder
 *    cycles through the hints while the field is empty and unfocused.
 * 3. The bag count — product cards and the routine sets ([data-custom-set])
 *    on the page add to the header count and the mini cart subtotal.
 *
 * window.DraftmangoBeautyStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. The routine
       ------------------------------------------------------------------ */
    function routine(row) {
        const hero = row.closest('section') ?? row.parentElement;
        const panels = [...row.querySelectorAll(':scope > .sliding-box')];
        const steps = [...hero.querySelectorAll('.custom-step-btn')];
        if (panels.length < 2 || steps.length !== panels.length) return null;

        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
        const phone = matchMedia('(max-width: 767px)');
        const controller = new AbortController();
        const { signal } = controller;
        let active = Math.max(
            0,
            panels.findIndex((panel) => panel.classList.contains('is-active')),
        );
        let visible = false;
        let hovering = false;
        let focusing = false;
        let scrollTimer = 0;

        const sync = () => {
            const playing = !reduced && !phone.matches && visible && !document.hidden;
            hero.toggleAttribute('data-custom-playing', playing);
            hero.toggleAttribute('data-custom-paused', hovering || focusing);
        };

        const open = (index, { scroll = false } = {}) => {
            active = (index + panels.length) % panels.length;
            panels.forEach((panel, i) => panel.classList.toggle('is-active', i === active));
            steps.forEach((step, i) => {
                step.setAttribute('aria-expanded', String(i === active));
                step.classList.toggle('is-done', i < active);
            });
            // Restart the bar's fill from empty
            hero.removeAttribute('data-custom-playing');
            void hero.offsetWidth;
            sync();
            if (scroll && phone.matches) {
                row.scrollTo({
                    left:
                        panels[active].offsetLeft -
                        row.offsetLeft -
                        parseFloat(getComputedStyle(row).paddingLeft),
                    behavior: reduced ? 'auto' : 'smooth',
                });
            }
        };

        panels.forEach((panel, i) => {
            panel.addEventListener(
                'mouseenter',
                () => {
                    if (finePointer.matches && !phone.matches && i !== active) open(i);
                },
                { signal },
            );
            panel.addEventListener(
                'click',
                (event) => {
                    if (phone.matches || i === active || event.target.closest('a, button')) return;
                    open(i);
                },
                { signal },
            );
            panel.addEventListener(
                'focusin',
                () => {
                    if (i !== active && !phone.matches) open(i);
                },
                { signal },
            );
        });

        steps.forEach((step, i) =>
            step.addEventListener('click', () => open(i, { scroll: true }), { signal }),
        );

        hero.querySelectorAll('[data-custom-step]').forEach((arrow) => {
            arrow.addEventListener(
                'click',
                () => open(active + Number(arrow.dataset.customStep), { scroll: true }),
                { signal },
            );
        });

        // Arrow keys walk the step buttons
        steps[0].parentElement.addEventListener(
            'keydown',
            (event) => {
                const i = steps.indexOf(document.activeElement);
                const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: steps.length - 1 }[
                    event.key
                ];
                if (i < 0 || to === undefined) return;
                event.preventDefault();
                steps[(to + steps.length) % steps.length].focus();
            },
            { signal },
        );

        // The bar ran out: next step
        hero.addEventListener(
            'animationend',
            (event) => {
                if (event.animationName === 'custom-step-fill') open(active + 1);
            },
            { signal },
        );

        hero.addEventListener(
            'pointerenter',
            (event) => {
                if (event.pointerType === 'mouse') {
                    hovering = true;
                    sync();
                }
            },
            { signal },
        );
        hero.addEventListener(
            'pointerleave',
            () => {
                hovering = false;
                sync();
            },
            { signal },
        );
        hero.addEventListener(
            'focusin',
            () => {
                focusing = true;
                sync();
            },
            { signal },
        );
        hero.addEventListener(
            'focusout',
            (event) => {
                if (!hero.contains(event.relatedTarget)) {
                    focusing = false;
                    sync();
                }
            },
            { signal },
        );

        // Phones: the step bar follows the swipe row
        row.addEventListener(
            'scroll',
            () => {
                if (!phone.matches) return;
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    const left = row.scrollLeft;
                    let nearest = 0;
                    panels.forEach((panel, i) => {
                        if (
                            Math.abs(panel.offsetLeft - row.offsetLeft - left) <
                            Math.abs(panels[nearest].offsetLeft - row.offsetLeft - left)
                        )
                            nearest = i;
                    });
                    if (nearest !== active) open(nearest);
                }, 90);
            },
            { passive: true, signal },
        );

        phone.addEventListener('change', sync, { signal });
        document.addEventListener('visibilitychange', sync, { signal });

        const seen = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                sync();
            },
            { threshold: 0.4 },
        );
        seen.observe(row);

        // Phones start the swipe row on its first card
        open(phone.matches ? 0 : active);

        return () => {
            clearTimeout(scrollTimer);
            seen.disconnect();
            controller.abort();
            hero.removeAttribute('data-custom-playing');
            hero.removeAttribute('data-custom-paused');
        };
    }

    /* ------------------------------------------------------------------
       2. Search hints
       ------------------------------------------------------------------ */
    function hints(form) {
        const input = form.querySelector('input[type="search"]');
        const list = (form.dataset.customHints ?? '').split('|').filter(Boolean);
        if (!input || list.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches)
            return null;

        let i = 0;
        const timer = setInterval(() => {
            if (document.activeElement === input || input.value || document.hidden) return;
            i = (i + 1) % list.length;
            input.placeholder = list[i];
        }, 3200);

        return () => clearInterval(timer);
    }

    /* ------------------------------------------------------------------
       3. The bag count — a card or a routine set added on the page adds its
          quantity and price to $store.cart.extra / extraTotal (the template
          cards fire cart-added but never touch the store)
       ------------------------------------------------------------------ */
    document.addEventListener('cart-added', (event) => {
        const cart = window.Alpine?.store('cart');
        const item = event.target.closest?.('main [data-product], main [data-custom-set]');
        if (!cart || !item) return;
        const qty = Number(item.dataset.items ?? item.querySelector('.qty-input')?.value ?? 1) || 1;
        const total = item.dataset.items
            ? Number(item.dataset.price)
            : Number(item.dataset.price) * qty;
        cart.extra = (cart.extra ?? 0) + qty;
        cart.extraTotal = (cart.extraTotal ?? 0) + (total || 0);
    });

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-routine]', routine],
        ['[data-custom-hints]', hints],
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

    window.DraftmangoBeautyStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
