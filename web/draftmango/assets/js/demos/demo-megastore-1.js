/**
 * demo-megastore-1.js — the Megastore demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Without it the
 * department rows are plain links, the header dropdown still opens on hover
 * and focus (template CSS) and the deal slider is the template carousel.
 * It adds:
 *
 * 1. Departments — [data-custom-depts] (the header dropdown and the Home
 *    hero list). Hovering a row (after a short dwell, so a diagonal move to
 *    the flyout does not switch rows) or focusing it opens its flyout and
 *    sets aria-expanded. Arrow Up / Down, Home and End move between rows;
 *    Arrow Right goes into the flyout, Arrow Left or Escape comes back to
 *    the row; Escape on a row closes the flyout. Leaving the list closes it.
 *
 * 2. All Departments — .custom-dept-menu in the bar. aria-expanded follows the
 *    dropdown; Escape closes it (.is-dismissed) and returns focus to the
 *    button until the pointer or focus comes back. On the Home, until the bar
 *    pins, the list is open in the hero: the button reports it expanded and
 *    a click moves focus to its first department.
 *
 * 3. Deal slider — [data-custom-deals]: every slide but the one on show is
 *    inert once the template carousel has mounted it; data-moved after the
 *    first change turns on the slide entrances (the first slide never replays).
 *
 * 4. Cart count — a product card's Add to cart (the template addToCart fires
 *    cart-added) adds its quantity and price to $store.cart.extra /
 *    extraTotal, which the mini cart folds into the header count and total.
 *
 * window.DraftmangoMegastore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Departments
       ------------------------------------------------------------------ */
    function departments(el) {
        const rows = [...el.querySelectorAll('.custom-depts-row')];
        const panelOf = (row) => document.getElementById(row.getAttribute('aria-controls'));
        let current = null;
        let dwell = 0;
        let leaving = 0;

        const open = (row) => {
            clearTimeout(leaving);
            if (row === current) return;
            close();
            current = row;
            row.setAttribute('aria-expanded', 'true');
            panelOf(row)?.classList.add('is-active');
        };

        const close = () => {
            if (!current) return;
            current.setAttribute('aria-expanded', 'false');
            panelOf(current)?.classList.remove('is-active');
            current = null;
        };

        const onOver = (e) => {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            const row = e.target.closest('.custom-depts-row');
            if (!row) return;
            clearTimeout(dwell);
            clearTimeout(leaving);
            if (!current) open(row);
            else dwell = setTimeout(() => open(row), 110);
        };

        const onLeave = () => {
            clearTimeout(dwell);
            leaving = setTimeout(close, 220);
        };

        const onEnter = () => clearTimeout(leaving);

        const onFocusIn = (e) => {
            const row = e.target.closest('.custom-depts-row');
            if (row) open(row);
        };

        const onFocusOut = (e) => {
            if (!el.contains(e.relatedTarget)) close();
        };

        const focusRow = (i) => rows[(i + rows.length) % rows.length].focus();

        const onKey = (e) => {
            const row = e.target.closest('.custom-depts-row');
            if (row) {
                const i = rows.indexOf(row);
                if (e.key === 'ArrowDown') focusRow(i + 1);
                else if (e.key === 'ArrowUp') focusRow(i - 1);
                else if (e.key === 'Home') focusRow(0);
                else if (e.key === 'End') focusRow(rows.length - 1);
                else if (e.key === 'ArrowRight') {
                    open(row);
                    panelOf(row)?.querySelector('a')?.focus();
                } else if (e.key === 'Escape' && current) {
                    close();
                    e.stopPropagation();
                } else return;
                e.preventDefault();
                return;
            }
            const panel = e.target.closest('.custom-flyout');
            if (!panel || !current) return;
            const links = [...panel.querySelectorAll('a')];
            const i = links.indexOf(e.target);
            if (e.key === 'ArrowLeft' || e.key === 'Escape') {
                current.focus();
                e.stopPropagation();
            } else if (e.key === 'ArrowDown') links[(i + 1) % links.length].focus();
            else if (e.key === 'ArrowUp') links[(i - 1 + links.length) % links.length].focus();
            else return;
            e.preventDefault();
        };

        el.addEventListener('pointerover', onOver);
        el.addEventListener('pointerleave', onLeave);
        el.addEventListener('pointerenter', onEnter);
        el.addEventListener('focusin', onFocusIn);
        el.addEventListener('focusout', onFocusOut);
        el.addEventListener('keydown', onKey);

        return () => {
            clearTimeout(dwell);
            clearTimeout(leaving);
            close();
            el.removeEventListener('pointerover', onOver);
            el.removeEventListener('pointerleave', onLeave);
            el.removeEventListener('pointerenter', onEnter);
            el.removeEventListener('focusin', onFocusIn);
            el.removeEventListener('focusout', onFocusOut);
            el.removeEventListener('keydown', onKey);
        };
    }

    /* ------------------------------------------------------------------
       2. All Departments (the bar's tab)
       ------------------------------------------------------------------ */
    function deptMenu(li) {
        const btn = li.querySelector('.custom-dept-btn');
        const header = li.closest('[data-header]');
        const board = document.getElementById('mg1-board-depts');
        const desktop = matchMedia('(min-width: 1024px)');
        if (!btn) return null;

        // Docked: the Home's hero list stands in for the dropdown
        const docked = () => !!board && desktop.matches && !header?.classList.contains('is-stuck');
        const sync = () => {
            const open =
                docked() ||
                (!li.classList.contains('is-dismissed') && li.matches(':hover, :focus-within'));
            btn.setAttribute('aria-expanded', String(open));
            btn.setAttribute('aria-controls', docked() ? board.id : 'mg1-depts-h');
        };

        const onClick = (e) => {
            if (!docked()) return;
            e.preventDefault();
            board.querySelector('.custom-depts-row')?.focus();
        };

        const onKey = (e) => {
            if (e.key !== 'Escape' || docked()) return;
            li.classList.add('is-dismissed');
            btn.focus();
            sync();
        };

        const onLeave = () => {
            li.classList.remove('is-dismissed');
            requestAnimationFrame(sync);
        };
        const onFocusOut = (e) => {
            if (!li.contains(e.relatedTarget)) onLeave();
        };
        const onEnter = () => requestAnimationFrame(sync);

        const watcher = header ? new MutationObserver(sync) : null;
        watcher?.observe(header, { attributes: true, attributeFilter: ['class'] });

        btn.addEventListener('click', onClick);
        li.addEventListener('keydown', onKey);
        li.addEventListener('pointerenter', onEnter);
        li.addEventListener('pointerleave', onLeave);
        li.addEventListener('focusin', onEnter);
        li.addEventListener('focusout', onFocusOut);
        desktop.addEventListener('change', sync);
        sync();

        return () => {
            watcher?.disconnect();
            btn.removeEventListener('click', onClick);
            li.removeEventListener('keydown', onKey);
            li.removeEventListener('pointerenter', onEnter);
            li.removeEventListener('pointerleave', onLeave);
            li.removeEventListener('focusin', onEnter);
            li.removeEventListener('focusout', onFocusOut);
            desktop.removeEventListener('change', sync);
        };
    }

    /* ------------------------------------------------------------------
       3. Deal slider
       ------------------------------------------------------------------ */
    function deals(el) {
        const host = el.querySelector('.swiper');
        let swiper = null;
        let watcher = null;

        const show = () =>
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
        // The first slide is already on show at load: the entrances start with the first change
        const moved = () => {
            el.dataset.moved = '';
        };

        const attach = () => {
            if (swiper || !host?.swiper) return;
            swiper = host.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', show);
            swiper.once('slideChange', moved);
            show();
        };

        if (host?.swiper) attach();
        else if (host) {
            watcher = new MutationObserver(attach);
            watcher.observe(host, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            if (!swiper) return;
            swiper.off('slideChange', show);
            swiper.off('slideChange', moved);
            swiper.slides.forEach((slide) => {
                slide.inert = false;
            });
        };
    }

    /* ------------------------------------------------------------------
       4. Cart count
       ------------------------------------------------------------------ */
    document.addEventListener('cart-added', (e) => {
        const cart = window.Alpine?.store('cart');
        const card = e.target.closest?.('main [data-product]');
        if (!cart || !card) return;
        const qty = Number(card.querySelector('.qty-input')?.value ?? 1) || 1;
        cart.extra = (cart.extra ?? 0) + qty;
        cart.extraTotal =
            (cart.extraTotal ?? 0) + (Number(card.dataset.price.replaceAll(',', '')) || 0) * qty;
    });

    const FEATURES = [
        ['[data-custom-depts]', departments],
        ['.custom-dept-menu', deptMenu],
        ['[data-custom-deals]', deals],
    ];
    const wired = new WeakMap();

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

    window.DraftmangoMegastore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
