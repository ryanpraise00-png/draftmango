/**
 * demo-outdoor-store-1.js — the Outdoor Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages, after main.js has
 * started Alpine.
 *
 * The "/" key — the bar's command search: pressing "/" anywhere outside a
 * field focuses it (from 1024px, where the field shows) or opens the search
 * sheet (below, where the magnifier takes its place). Escape in the field
 * leaves it. Bound once on the document, so page transitions keep it.
 *
 * Ridge parallax — on a desktop pointer the hero's layers ([data-hero-parallax])
 * shift against each other (sky 4px, letters 8px, ridge 12px, set in the CSS
 * from --custom-px / --custom-py, -1…1), eased each frame. Off for touch and
 * reduced motion.
 *
 * Cart count — an Add on a card, the 72-hour kit or the product page
 * ([data-os1-add], with its quantity) raises the bar's count through
 * $store.cart.extra (the mini cart adds it to its lines).
 *
 * Filters in the address — the menus link to the Shop with ?activity=hike
 * (Trail reads as hike), ?cat=lights and ?sort=new, and to EDC with a
 * category hash (#knives); they set the page's productFilter (activity →
 * features, category → cat, only when a piece matches it). The hash keeps
 * following on EDC.
 *
 * window.DraftmangoOutdoorStore1 = { init(root) } for page transitions.
 */
(() => {
    'use strict';

    const typing = (el) =>
        el instanceof HTMLElement &&
        (el.isContentEditable || el.matches('input, textarea, select'));

    function onKey(event) {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        const field = document.getElementById('os1-search-q');
        if (!field) return;

        if (event.key === 'Escape' && event.target === field) {
            field.blur();
            return;
        }
        if (event.key !== '/' || typing(event.target)) return;

        event.preventDefault();
        if (field.offsetParent) {
            field.focus();
            field.select();
        } else {
            document.querySelector('.nav-search-toggle')?.click();
        }
    }

    function parallax(stage) {
        const hero = stage.parentElement;
        let tx = 0,
            ty = 0,
            x = 0,
            y = 0,
            frame = 0;
        const step = () => {
            x += (tx - x) * 0.08;
            y += (ty - y) * 0.08;
            stage.style.setProperty('--custom-px', x.toFixed(3));
            stage.style.setProperty('--custom-py', y.toFixed(3));
            frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(step) : 0;
        };
        const aim = (nx, ny) => {
            tx = nx;
            ty = ny;
            if (!frame) frame = requestAnimationFrame(step);
        };
        hero.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            const box = hero.getBoundingClientRect();
            aim(
                ((event.clientX - box.left) / box.width) * 2 - 1,
                ((event.clientY - box.top) / box.height) * 2 - 1,
            );
        });
        hero.addEventListener('pointerleave', () => aim(0, 0));
    }

    // A card's Add (or the kit's Add N Pieces, data-items) raises the bar's
    // count: the mini cart adds $store.cart.extra to its own lines
    function onAdded(event) {
        const cart = window.Alpine?.store('cart');
        const item = event.target.closest?.(
            'main [data-os1-kit], main [data-product], [data-os1-add]',
        );
        if (!cart || !item) return;
        const qty = item.matches('[data-os1-add]')
            ? Number(item.form?.querySelector('.qty-input')?.value)
            : Number(item.dataset.items);
        cart.extra = (cart.extra ?? 0) + (qty || 1);
    }

    const words = (value) => String(value ?? '').split(/\s+/);
    const slug = (value) => (value && /^[a-z-]{2,24}$/.test(value) ? value : null);

    let onHash = null;

    function filters(root) {
        const el = root.querySelector('[x-data^="productFilter"]');
        const data = el && window.Alpine?.$data(el);
        if (!data?.items) return;
        const has = (key, value) =>
            data.items.some((item) => words(item.dataset[key]).includes(value));
        const query = new URLSearchParams(location.search);
        let activity = slug(query.get('activity'));
        if (activity === 'trail') activity = 'hike';
        if (activity && has('features', activity)) data.features = [activity];
        const cat = slug(query.get('cat'));
        if (
            cat &&
            data.items.some(
                (item) =>
                    words(item.dataset.cat).includes(cat) &&
                    (!activity || words(item.dataset.features).includes(activity)),
            )
        )
            data.cat = cat;
        if (query.get('sort') === 'new') data.sort = 'date';
        const fromHash = () => {
            const value = slug(location.hash.slice(1));
            if (value === 'all' || (value && has('cat', value))) data.cat = value;
        };
        fromHash();
        if (onHash) window.removeEventListener('hashchange', onHash);
        onHash = fromHash;
        window.addEventListener('hashchange', onHash);
    }

    let bound = false;

    function init(root = document) {
        const calm =
            matchMedia('(prefers-reduced-motion: reduce)').matches ||
            !matchMedia('(hover: hover) and (pointer: fine)').matches;
        if (!calm) {
            root.querySelectorAll('[data-hero-parallax]:not([data-parallax-on])').forEach(
                (stage) => {
                    stage.dataset.parallaxOn = '';
                    parallax(stage);
                },
            );
        }
        filters(root);
        if (bound) return;
        bound = true;
        document.addEventListener('keydown', onKey);
        document.addEventListener('cart-added', onAdded);
    }

    window.DraftmangoOutdoorStore1 = { init };
    init();
})();
