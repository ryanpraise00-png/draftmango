/*
 * Framo — shop.js
 *
 * The shop's script: cart, product filters, quick view, quantity fields,
 * wishlist. Linked only by pages with shop markup, before main.js, which
 * starts it. A site without a shop does not need this file.
 */
(function (exports) {
    'use strict';

    /**
     * shop.js — Behaviour for the Shop pages
     *
     * The HTML stays the source of truth: every product, price and cart line is
     * written in the page, and these components only read `data-*` attributes and
     * toggle state. Nothing here renders markup, so the same pages port to the
     * WooCommerce theme (server-rendered) and to Next.js (one useState each).
     *
     *   initQty()                    − / + around any .qty number input
     *   initQuickView()              fills the shared #quick-view dialog
     *   initCardFloat()              Cursor Tag label follows the pointer
     *   initFilterDropdowns()        filter groups as a dropdown row (lg+)
     *   Alpine: rangeDual            two-handle range (min / max)
     *   Alpine: productFilter        facets, sort, grid columns/list, load more
     *   Alpine: bundle               bought-together / grouped: toggles, qty, total
     *   Alpine: gallerySpy           "2 / 6" counter for a sideways image strip
     *   Alpine: addToCart            idle → adding → added button state
     *   Alpine: cartPage             line totals, coupon, shipping, remove / undo;
     *                                the mini cart and the cart page share lines
     *   Alpine: wishlist             select, bulk actions, remove / undo
     *   Alpine: hashView             one view at a time, kept in the URL hash
     */

    const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const words = (value) =>
        String(value ?? '')
            .split(/\s+/)
            .filter(Boolean);
    /** A price attribute as a number; "1,450" reads as 1450 */
    const toPrice = (value) => Number(String(value ?? 0).replaceAll(',', ''));
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /** Chip labels for the catalogue's facet values that the capitalised slug gets
        wrong; a page's own productFilter({ labels }) entries win over these. */
    const FACET_LABELS = {
        magsafe: 'MagSafe',
        'power-banks': 'Power Banks',
        'tablet-accessories': 'Tablet Accessories',
        'fast-charge': 'Fast charging',
        'usb-c': 'USB-C',
        'water-resistant': 'Water resistant',
        s: 'Compact phone',
        m: 'Standard phone',
        l: 'Plus / Ultra phone',
        xl: 'Tablet',
        core: 'Framo Core',
        pro: 'Framo Pro',
        go: 'Framo Go',
        shield: 'Framo Shield',
        sound: 'Framo Sound',
        fit: 'Framo Fit',
    };

    /** Disable − / + at the input's min / max. */
    const syncQty = (qty) => {
        const input = qty.querySelector('input');
        if (!input) return;
        const value = Number(input.value);
        qty.querySelector('[data-step="-1"]')?.toggleAttribute(
            'disabled',
            input.min !== '' && value <= Number(input.min),
        );
        qty.querySelector('[data-step="1"]')?.toggleAttribute(
            'disabled',
            input.max !== '' && value >= Number(input.max),
        );
    };

    /**
     * Quantity stepper — delegated, framework-free.
     *
     *   <div class="qty">
     *     <button type="button" class="qty-btn" data-step="-1">…</button>
     *     <input type="number" class="qty-input" name="quantity" min="1" max="10" value="1">
     *     <button type="button" class="qty-btn" data-step="1">…</button>
     *   </div>
     *
     * Uses the input's own stepUp / stepDown, so min, max and step come from the
     * markup, then fires `input` and `change` so anything listening (the cart
     * totals, a form) hears the new value exactly as if it had been typed.
     */
    function initQty() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.qty [data-step]');
            if (!btn) return;
            const qty = btn.closest('.qty');
            const input = qty.querySelector('input');
            if (!input || input.disabled) return;
            Number(btn.dataset.step) > 0 ? input.stepUp() : input.stepDown();
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            syncQty(qty);
        });

        document.addEventListener('change', (e) => {
            const qty = e.target.closest?.('.qty');
            if (qty) syncQty(qty);
        });

        document.querySelectorAll('.qty').forEach(syncQty);
    }

    /**
     * Quick view — one shared <dialog id="quick-view">, filled from the card
     * whose `[data-quick-view]` button was pressed. The button also carries
     * `data-modal-target="quick-view"`, so modals.js opens the dialog; this only
     * copies the card's image, title, rating, price, excerpt and link into the
     * dialog's `[data-qv-*]` slots.
     */
    function initQuickView() {
        const dialog = document.getElementById('quick-view');
        if (!dialog) return;

        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-quick-view]');
            if (!trigger) return;
            const card = trigger.closest('.product-card');
            if (!card) return;

            const pick = (sel) => card.querySelector(sel);
            const slot = (name) => dialog.querySelector(`[data-qv-${name}]`);
            const img = pick('.product-card-img');
            const link = pick('.product-card-title a');

            if (img && slot('img')) {
                // The card image is cropped for the grid; ask for a larger crop.
                slot('img').src = img.currentSrc
                    .replace(/w=\d+/, 'w=900')
                    .replace(/h=\d+/, 'h=1100');
                slot('img').alt = img.alt;
            }
            if (slot('cat'))
                slot('cat').textContent = pick('.product-card-cat')?.textContent.trim() ?? '';
            if (slot('title')) slot('title').textContent = link?.textContent.trim() ?? '';
            if (slot('rating')) slot('rating').innerHTML = pick('.product-rating')?.outerHTML ?? '';
            if (slot('price')) slot('price').innerHTML = pick('.product-price')?.innerHTML ?? '';
            if (slot('excerpt'))
                slot('excerpt').textContent =
                    pick('.product-card-excerpt')?.textContent.trim() ?? '';
            if (slot('colours')) slot('colours').innerHTML = pick('.swatch-dots')?.outerHTML ?? '';
            dialog.querySelectorAll('[data-qv-link]').forEach((a) => {
                a.href = link?.getAttribute('href') ?? '#';
            });
        });
    }

    /**
     * Cursor Tag cards (.product-card--float): the label follows the pointer.
     * One delegated listener writes --mx / --my on the card; past the middle
     * the label flips to the left of the cursor so it never leaves the grid.
     */
    function initCardFloat() {
        document.addEventListener(
            'pointermove',
            (e) => {
                const media = e.target.closest?.('.product-card--float .product-card-media');
                if (!media) return;
                const card = media.closest('.product-card');
                const r = card.getBoundingClientRect();
                const x = e.clientX - r.left;
                card.style.setProperty('--mx', `${x}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
                card.classList.toggle('is-flip', x > r.width * 0.55);
            },
            { passive: true },
        );
    }

    /**
     * Filter dropdowns (.shop-filters--dropdowns, from lg): every filter group
     * is a native <details>, so opening and closing needs no script. This makes
     * the row behave as one menu — opening a group closes the others, and a
     * click outside, Escape or picking a link option (sort, a price range)
     * closes it. Below lg the same groups are an accordion in the drawer and are
     * left alone.
     */
    function initFilterDropdowns() {
        const bars = document.querySelectorAll('.shop-filters--dropdowns');
        if (!bars.length) return;
        const desktop = window.matchMedia('(min-width: 1024px)');
        const closeAll = (keep) =>
            bars.forEach((bar) =>
                bar.querySelectorAll('.filter-group[open]').forEach((g) => {
                    if (g !== keep) g.open = false;
                }),
            );

        // `toggle` does not bubble — listen in the capture phase.
        bars.forEach((bar) =>
            bar.addEventListener(
                'toggle',
                (e) => {
                    if (desktop.matches && e.target.open && e.target.matches('.filter-group'))
                        closeAll(e.target);
                },
                true,
            ),
        );

        document.addEventListener('click', (e) => {
            if (!desktop.matches) return;
            const group = e.target.closest('.shop-filters--dropdowns .filter-group');
            if (!group) return closeAll();
            closeAll(group);
            if (e.target.closest('.filter-list a')) group.open = false;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || !desktop.matches) return;
            const open = document.querySelector('.shop-filters--dropdowns .filter-group[open]');
            if (!open) return;
            open.open = false;
            open.querySelector('summary')?.focus();
        });

        // Groups left open in the drawer must not pop up as dropdowns on a wider screen.
        desktop.addEventListener('change', () => closeAll());
    }

    function registerShop(Alpine) {
        /** Cart count for the header cart button — the mini cart (cartPage)
            writes it, anything else can read $store.cart. `lines` holds every
            cartPage line by its data-cart-line key, so the same key in the mini
            cart and on the cart page is one line: quantities, removals and
            totals follow in both. */
        Alpine.store('cart', { count: 0, lines: {} });

        /**
         * Two-handle range. Bind each input with x-model.number="from" / "to"
         * and @input="clamp('from')" / "clamp('to')"; `fill` feeds the track.
         */
        Alpine.data('rangeDual', (min = 0, max = 100, from = min, to = max) => ({
            min,
            max,
            from,
            to,
            pct(v) {
                return ((v - this.min) / (this.max - this.min)) * 100;
            },
            get fill() {
                return `--from:${this.pct(this.from)}%;--to:${this.pct(this.to)}%`;
            },
            clamp(which) {
                if (which === 'from' && this.from > this.to) this.from = this.to;
                if (which === 'to' && this.to < this.from) this.to = this.from;
                this.$dispatch('range-change', { from: this.from, to: this.to });
            },
        }));

        /**
         * Facet filter + sort for a product grid.
         *
         * Every product is `[data-product]` carrying:
         *   data-cat="chargers magsafe"      data-price="79"
         *   data-colours="black"              data-features="wireless magnetic"
         *   data-sizes="m l"                  data-brand="pro"      data-sale="yes"
         *   data-rating="4.8"                 data-stock="in|low|out"
         *   data-date="2026-08-14"            data-pop="92"
         *
         * Non-matches get `hidden`; sorting moves the nodes (so keyboard order
         * follows what you see). With `pageSize` set, only that many matches show
         * until more() is called — the "Load more" pattern.
         */
        Alpine.data('productFilter', (opts = {}) => ({
            cat: opts.cat ?? 'all',
            colours: [],
            sizes: [],
            brands: [],
            features: [],
            rating: 0,
            inStock: false,
            onSale: false,
            min: opts.min ?? 0,
            max: opts.max ?? 1000,
            from: opts.min ?? 0,
            to: opts.max ?? 1000,
            sort: 'menu_order',
            view: opts.view ?? 'grid',
            cols: opts.cols ?? 3,
            drawer: false,
            limit: opts.perPage ?? opts.pageSize ?? Infinity,
            pageSize: opts.pageSize ?? Infinity,
            perPage: opts.perPage ?? null,
            labels: { ...FACET_LABELS, ...opts.labels },
            count: 0,
            shown: 0,
            total: 0,

            init() {
                this.items = Array.from(this.$root.querySelectorAll('[data-product]'));
                this.items.forEach((el, i) => {
                    el.dataset.index = i;
                });
                this.total = this.items.length;
                // An empty marker before each product holds its slot, so a sort
                // refills the same slots and anything else in the list (a promo
                // tile) keeps its place between them.
                this.slots = this.items.map((el) => {
                    const mark = document.createComment('');
                    el.before(mark);
                    return mark;
                });
                let first = true;
                Alpine.effect(() => {
                    // Read every facet so the effect re-runs when any of them moves.
                    const state = [
                        this.cat,
                        this.colours.join(),
                        this.sizes.join(),
                        this.brands.join(),
                        this.features.join(),
                        this.rating,
                        this.inStock,
                        this.onSale,
                        this.from,
                        this.to,
                        this.sort,
                        this.limit,
                    ];
                    if (first) {
                        first = false;
                        this.apply();
                        return state;
                    }
                    this.animate(() => this.apply());
                    return state;
                });
                // The drawer is a modal surface below lg (and at every width for the
                // off-canvas variant) — Escape closes it. While it covers the page,
                // smooth scroll holds still; the drawer keeps its own scroll through
                // data-lenis-prevent. An inline panel leaves the page scrolling.
                this.$watch('drawer', (open) => {
                    document.documentElement.classList.toggle('shop-drawer-open', open);
                    const aside = this.$root.querySelector('.shop-filters');
                    const overlay = open && aside && getComputedStyle(aside).position === 'fixed';
                    overlay ? window.__lenis?.stop() : window.__lenis?.start();
                });
            },

            pct(v) {
                return ((v - this.min) / (this.max - this.min)) * 100;
            },
            get fill() {
                return `--from:${this.pct(this.from)}%;--to:${this.pct(this.to)}%`;
            },
            clamp(which) {
                if (which === 'from' && this.from > this.to) this.from = this.to;
                if (which === 'to' && this.to < this.from) this.to = this.from;
            },

            matches(el) {
                const d = el.dataset;
                const price = toPrice(d.price);
                return (
                    (this.cat === 'all' || words(d.cat).includes(this.cat)) &&
                    price >= this.from &&
                    price <= this.to &&
                    (!this.colours.length ||
                        this.colours.some((c) => words(d.colours).includes(c))) &&
                    (!this.sizes.length || this.sizes.some((v) => words(d.sizes).includes(v))) &&
                    (!this.brands.length || this.brands.includes(d.brand)) &&
                    this.features.every((f) => words(d.features).includes(f)) &&
                    Number(d.rating ?? 0) >= this.rating &&
                    (!this.inStock || d.stock !== 'out') &&
                    (!this.onSale || d.sale === 'yes')
                );
            },

            apply() {
                const keys = {
                    popularity: (el) => -Number(el.dataset.pop ?? 0),
                    rating: (el) => -Number(el.dataset.rating ?? 0),
                    date: (el) => -Date.parse(el.dataset.date ?? 0),
                    price: (el) => toPrice(el.dataset.price),
                    'price-desc': (el) => -toPrice(el.dataset.price),
                };
                const key = keys[this.sort] ?? ((el) => Number(el.dataset.index));
                const sorted = [...this.items].sort(
                    (a, b) => key(a) - key(b) || a.dataset.index - b.dataset.index,
                );
                sorted.forEach((el, i) => {
                    if (this.slots[i].nextSibling !== el) this.slots[i].after(el);
                });

                let shown = 0;
                this.count = 0;
                sorted.forEach((el) => {
                    const ok = this.matches(el);
                    if (ok) this.count++;
                    const visible = ok && shown < this.limit;
                    if (visible) shown++;
                    el.hidden = !visible;
                });
                this.shown = shown;
            },

            /** View Transitions where supported: cards glide to their new slots.
                Waits a tick so Alpine's own bindings (--cols, list view) land first. */
            animate(update) {
                if (!document.startViewTransition || reducedMotion() || !this.items.length)
                    return update();
                this.items.forEach((el) => {
                    el.style.viewTransitionName = `product-${el.dataset.index}`;
                });
                const t = document.startViewTransition(() => {
                    update();
                    return this.$nextTick();
                });
                // A newer transition (another filter on the page) skips this one — expected.
                t.ready.catch(() => {});
                t.finished.finally(() =>
                    this.items.forEach((el) => {
                        el.style.viewTransitionName = '';
                    }),
                );
            },

            /** Grid columns (2 / 3 / 4) or list — the column switch. */
            setCols(n) {
                this.animate(() => {
                    this.view = 'grid';
                    this.cols = n;
                });
            },
            setView(v) {
                this.animate(() => {
                    this.view = v;
                });
            },

            /** Quick price ranges — the same min_price / max_price as the slider. */
            setPrice(from, to) {
                this.from = from;
                this.to = to;
            },
            isPrice(from, to) {
                return this.from === from && this.to === to;
            },

            more() {
                this.limit += this.pageSize;
            },
            /** Products per page (9 / 12 / 18 / 24) — WooCommerce's per_page. */
            setPerPage(n) {
                this.perPage = n;
                this.limit = n;
            },
            get hasMore() {
                return this.count > this.limit;
            },
            get progress() {
                return this.count
                    ? Math.round((Math.min(this.limit, this.count) / this.count) * 100)
                    : 0;
            },

            label(value) {
                return (
                    this.labels[value] ??
                    value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ')
                );
            },

            get priceActive() {
                return this.from > this.min || this.to < this.max;
            },

            get chips() {
                const chips = [];
                if (this.cat !== 'all') chips.push({ key: 'cat', label: this.label(this.cat) });
                if (this.priceActive)
                    chips.push({
                        key: 'price',
                        label: `${money.format(this.from)} – ${money.format(this.to)}`,
                    });
                this.colours.forEach((v) =>
                    chips.push({ key: 'colours', value: v, label: this.label(v) }),
                );
                this.sizes.forEach((v) =>
                    chips.push({ key: 'sizes', value: v, label: this.label(v) }),
                );
                this.brands.forEach((v) =>
                    chips.push({ key: 'brands', value: v, label: this.label(v) }),
                );
                this.features.forEach((v) =>
                    chips.push({ key: 'features', value: v, label: this.label(v) }),
                );
                if (this.rating) chips.push({ key: 'rating', label: `${this.rating}★ & up` });
                if (this.inStock) chips.push({ key: 'inStock', label: 'In stock' });
                if (this.onSale) chips.push({ key: 'onSale', label: 'On sale' });
                return chips;
            },

            remove(chip) {
                if (chip.key === 'cat') this.cat = 'all';
                else if (chip.key === 'price') {
                    this.from = this.min;
                    this.to = this.max;
                } else if (chip.key === 'rating') this.rating = 0;
                else if (chip.key === 'inStock') this.inStock = false;
                else if (chip.key === 'onSale') this.onSale = false;
                else this[chip.key] = this[chip.key].filter((v) => v !== chip.value);
            },

            clear() {
                this.cat = 'all';
                this.colours = [];
                this.sizes = [];
                this.brands = [];
                this.features = [];
                this.rating = 0;
                this.inStock = false;
                this.onSale = false;
                this.from = this.min;
                this.to = this.max;
            },
        }));

        /**
         * Several products bought as one — Frequently bought together and the
         * grouped product. Every `[data-bundle-item="key"]` in the component
         * carries data-price (and data-was for a crossed-out price, data-qty for
         * the starting quantity, default 1). Checkboxes call toggle(key); qty
         * inputs inside a row bubble to sync($event). total / count / saved
         * follow on their own.
         */
        Alpine.data('bundle', () => ({
            items: {},

            init() {
                this.$root.querySelectorAll('[data-bundle-item]').forEach((el) => {
                    const price = toPrice(el.dataset.price);
                    this.items[el.dataset.bundleItem] = {
                        price,
                        was: toPrice(el.dataset.was ?? price),
                        qty: Number(el.dataset.qty ?? 1),
                    };
                });
            },

            on(key) {
                return (this.items[key]?.qty ?? 0) > 0;
            },
            toggle(key) {
                const i = this.items[key];
                if (i) i.qty = i.qty > 0 ? 0 : 1;
            },

            sync(e) {
                if (e.target.type !== 'number') return;
                const row = e.target.closest('[data-bundle-item]');
                if (row)
                    this.items[row.dataset.bundleItem].qty = Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0),
                    );
            },

            money(v) {
                return money.format(v);
            },
            get list() {
                return Object.values(this.items);
            },
            get count() {
                return this.list.reduce((n, i) => n + i.qty, 0);
            },
            get total() {
                return this.list.reduce((n, i) => n + i.price * i.qty, 0);
            },
            get saved() {
                return this.list.reduce((n, i) => n + (i.was - i.price) * i.qty, 0);
            },
        }));

        /**
         * "2 / 6" for an image strip that scrolls sideways (.product-gallery-grid
         * below lg). Reads the scroll position only — nothing is moved by script.
         */
        Alpine.data('gallerySpy', () => ({
            i: 0,
            n: 0,
            init() {
                const list = this.$root.querySelector('.product-gallery-grid');
                if (!list) return;
                this.n = list.children.length;
                list.addEventListener(
                    'scroll',
                    () => {
                        const [a, b] = list.children;
                        const step = b ? b.offsetLeft - a.offsetLeft : list.clientWidth;
                        this.i = Math.min(this.n - 1, Math.round(list.scrollLeft / step));
                    },
                    { passive: true },
                );
            },
        }));

        /**
         * Arrows for a sideways category row (.rail-scroll around a .cat-rail,
         * x-ref="rail"). start / end say whether more sits past either edge;
         * go(±1) scrolls by most of the visible width.
         */
        Alpine.data('railScroll', () => ({
            start: true,
            end: true,
            // The ref can belong to an inner x-data (a demo's own cat state), so
            // fall back to the rail inside this wrapper
            rail() {
                return this.$refs.rail ?? this.$root.querySelector('.cat-rail');
            },
            init() {
                const rail = this.rail();
                const update = () => {
                    this.start = rail.scrollLeft <= 2;
                    this.end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
                };
                rail.addEventListener('scroll', update, { passive: true });
                new ResizeObserver(update).observe(rail);
                update();
            },
            go(dir) {
                const rail = this.rail();
                rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
            },
        }));

        /** Add-to-cart button state. Pair with the .btn-atc children in shop.css. */
        Alpine.data('addToCart', () => ({
            state: 'idle',
            add() {
                if (this.state !== 'idle') return;
                this.state = 'adding';
                clearTimeout(this._t);
                this._t = setTimeout(() => {
                    this.state = 'added';
                    this.$dispatch('cart-added', { product: this.$el.value ?? null });
                    this._t = setTimeout(() => {
                        this.state = 'idle';
                    }, 2200);
                }, 700);
            },
            destroy() {
                clearTimeout(this._t);
            },
        }));

        /**
         * Cart page. Each row is `[data-cart-line="key"]` with data-price and a
         * .qty number input (or a fixed data-qty, as on the checkout review);
         * totals, the free-shipping meter and the empty state all derive from
         * `lines`. Coupon codes and rates come in as options.
         *
         * Lines live in $store.cart.lines by key: give a product the same key in
         * the mini cart and on the cart page and both show one line — a quantity
         * or a removal in either follows in the other. The page's markup sets the
         * starting quantity; the drawer (inside .mini-cart) never overrides it.
         */
        Alpine.data('cartPage', (opts = {}) => ({
            threshold: opts.threshold ?? 400,
            coupons: opts.coupons ?? { FRAMO10: 0.1 },
            rates: opts.rates ?? { standard: 9, express: 19, pickup: 0 },
            lines: [],
            shipping: 'standard',
            code: '',
            applied: null,
            couponMsg: '',
            couponOk: false,
            undoLine: null,
            dirty: false,

            init() {
                const shared = Alpine.store('cart').lines;
                const drawer = Boolean(this.$root.closest('.mini-cart'));
                const rows = Array.from(this.$root.querySelectorAll('[data-cart-line]'));
                this.lines = rows.map((el) => {
                    const own = {
                        key: el.dataset.cartLine,
                        name: el.dataset.name ?? '',
                        price: toPrice(el.dataset.price),
                        qty: Number(
                            el.querySelector('input[type="number"]')?.value ?? el.dataset.qty ?? 1,
                        ),
                        removed: false,
                    };
                    if (!shared[own.key]) shared[own.key] = own;
                    else if (!drawer) Object.assign(shared[own.key], own);
                    return shared[own.key];
                });
                // A quantity changed elsewhere (the other cart, an undo) shows in this one's steppers
                rows.forEach((el) => {
                    const input = el.querySelector('.qty input[type="number"]');
                    if (!input) return;
                    const l = this.line(el.dataset.cartLine);
                    Alpine.effect(() => {
                        if (Number(input.value) === l.qty) return;
                        input.value = l.qty;
                        syncQty(input.closest('.qty'));
                    });
                });
            },

            line(key) {
                return this.lines.find((l) => l.key === key) ?? { price: 0, qty: 0 };
            },
            money(v) {
                return money.format(v);
            },

            sync(e) {
                if (e.target.type !== 'number') return;
                const row = e.target.closest('[data-cart-line]');
                if (!row) return;
                const l = this.line(row.dataset.cartLine);
                l.qty = Math.max(0, Math.floor(Number(e.target.value) || 0));
                this.dirty = true;
                if (l.qty === 0) this.remove(l.key);
            },

            remove(key) {
                const l = this.line(key);
                l.removed = true;
                this.undoLine = l;
            },

            undo() {
                if (!this.undoLine) return;
                this.undoLine.removed = false;
                if (!this.undoLine.qty) this.undoLine.qty = 1;
                this.undoLine = null;
            },

            applyCoupon() {
                const c = this.code.trim().toUpperCase();
                if (!c) {
                    this.couponOk = false;
                    this.couponMsg = 'Enter a coupon code.';
                    return;
                }
                if (this.coupons[c] === undefined) {
                    this.couponOk = false;
                    this.couponMsg = `“${c}” isn’t a valid code.`;
                    return;
                }
                this.applied = c;
                this.couponOk = true;
                this.couponMsg = `${c} applied — ${Math.round(this.coupons[c] * 100)}% off.`;
                this.code = '';
            },

            removeCoupon() {
                this.applied = null;
                this.couponMsg = '';
            },

            get active() {
                return this.lines.filter((l) => !l.removed);
            },
            get itemCount() {
                return this.active.reduce((n, l) => n + l.qty, 0);
            },
            get subtotal() {
                return this.active.reduce((n, l) => n + l.price * l.qty, 0);
            },
            get discount() {
                return this.applied
                    ? Math.round(this.subtotal * this.coupons[this.applied] * 100) / 100
                    : 0;
            },
            get net() {
                return this.subtotal - this.discount;
            },
            get remaining() {
                return Math.max(0, this.threshold - this.net);
            },
            get progress() {
                return Math.min(100, Math.round((this.net / this.threshold) * 100));
            },
            get freeShipping() {
                return this.remaining === 0;
            },
            get shippingCost() {
                return this.shipping === 'standard' && this.freeShipping
                    ? 0
                    : (this.rates[this.shipping] ?? 0);
            },
            get total() {
                return this.net + this.shippingCost;
            },
            get empty() {
                return this.active.length === 0;
            },
        }));

        /**
         * Wishlist. Each card is `[data-wish="key"]` holding a checkbox; `sel`
         * mirrors the checked keys, so the toolbar and "select all" follow.
         * Removing hides the card (x-show="!gone('key')") and offers an undo.
         */
        Alpine.data('wishlist', () => ({
            keys: [],
            sel: [],
            removed: [],
            undoKeys: [],
            added: false,

            init() {
                this.keys = Array.from(
                    this.$root.querySelectorAll('[data-wish]'),
                    (el) => el.dataset.wish,
                );
            },

            gone(key) {
                return this.removed.includes(key);
            },
            get left() {
                return this.keys.filter((k) => !this.gone(k));
            },
            get count() {
                return this.left.length;
            },
            get allOn() {
                return this.count > 0 && this.left.every((k) => this.sel.includes(k));
            },
            toggleAll() {
                this.sel = this.allOn ? [] : [...this.left];
            },

            remove(...keys) {
                this.removed.push(...keys);
                this.sel = this.sel.filter((k) => !keys.includes(k));
                this.undoKeys = keys;
            },
            removeSelected() {
                if (this.sel.length) this.remove(...this.sel);
            },
            undo() {
                this.removed = this.removed.filter((k) => !this.undoKeys.includes(k));
                this.undoKeys = [];
            },
            addSelected() {
                if (!this.sel.length) return;
                this.added = true;
                clearTimeout(this._t);
                this._t = setTimeout(() => {
                    this.added = false;
                    this.sel = [];
                }, 2200);
            },
            destroy() {
                clearTimeout(this._t);
            },
        }));

        /**
         * One view at a time, kept in the URL hash so each view has a link of its
         * own (My Account endpoints: #orders, #addresses…). `views` lists the
         * names; the first is the default.
         *
         *   <div x-data="hashView(['dashboard', 'orders'])">
         *     <a href="#orders" :aria-current="is('orders') && 'page'">…
         *     <section x-show="is('orders')">…
         */
        Alpine.data('hashView', (views = []) => ({
            view: views[0],
            init() {
                const read = () => {
                    const h = location.hash.slice(1);
                    this.view = views.includes(h) ? h : views[0];
                };
                read();
                this._read = read;
                window.addEventListener('hashchange', read);
            },
            is(name) {
                return this.view === name;
            },
            destroy() {
                window.removeEventListener('hashchange', this._read);
            },
        }));
    }

    /**
     * shop.js — The shop's part of the script: cart, filters, product cards,
     * wishlist, quick view.
     *
     * main.js loads it only on pages whose markup uses the shop (parts.js). In the
     * Ready package it is assets/js/shop.js, linked on those pages before main.js.
     * What each component does is described in modules/shop.js.
     */

    /** The shop's plain-script behaviour: started once the page is parsed. */
    function initShop() {
        initQty(); // − / + around a .qty number input
        initQuickView(); // fills the #quick-view dialog from a product card
        initFilterDropdowns(); // filter groups as a row of dropdowns (.shop-filters--dropdowns)
        initCardFloat(); // the label that follows the pointer (.product-card--float)
    }

    exports.initShop = initShop;
    exports.registerShop = registerShop;

    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
})((this.FramoVendor = this.FramoVendor || {}));
(FramoVendor.ready ??= []).push('shop');
