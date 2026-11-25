/**
 * demo-fashion-store-1.js — the Fashion Store demo's own behaviour (classic script, this demo's pages only)
 *
 * Lookbook ([data-custom-lookbook] on the hero's .swiper): thumbnails go to their look and the current
 * one's hairline fills with the autoplay; looks off screen are inert; pins open their card on hover,
 * focus or tap (one at a time; a tap on the photo or Escape closes); a look coming on show reopens its
 * default card (.is-open in the markup); a card that would leave the window flips side or shifts along.
 * Mega menus (.custom-mega): Escape closes the open panel and keeps focus on its button.
 * Without this file the pins still open on hover / focus. window.DraftmangoFashionStore1 = { init, destroy }.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const EDGE = 16;
    const SIDES = ['tip-pop-right', 'tip-pop-left', 'tip-pop-top', 'tip-pop-bottom'];

    /* ------------------------------------------------------------------
       Pins and cards
       ------------------------------------------------------------------ */
    function place(spot) {
        const card = spot.querySelector('.custom-look-card');
        if (!card) return;
        card.dataset.customSide ??=
            SIDES.find((side) => card.classList.contains(side)) ?? 'tip-pop-right';
        const preferred = card.dataset.customSide;
        const other = { 'tip-pop-right': 'tip-pop-left', 'tip-pop-left': 'tip-pop-right' }[
            preferred
        ];

        const use = (side) => {
            card.classList.remove(...SIDES);
            card.classList.add(side);
            card.style.removeProperty('--custom-shift');
        };
        const fits = () => {
            const box = card.getBoundingClientRect();
            return box.left >= EDGE && box.right <= innerWidth - EDGE;
        };

        use(preferred);
        if (fits() || !other) return;
        use(other);
        if (fits()) return;

        // Neither side fits: hang the card above the pin and shift it into the window
        use('tip-pop-top');
        const box = card.getBoundingClientRect();
        const shift =
            box.left < EDGE ? EDGE - box.left : Math.min(0, innerWidth - EDGE - box.right);
        card.style.setProperty('--custom-shift', `${shift}px`);
    }

    function pins(stage) {
        const spots = [...stage.querySelectorAll('.custom-look-spot')];
        spots.forEach((spot) => {
            if (spot.classList.contains('is-open')) spot.dataset.customDefault = '';
        });

        const open = (spot) => {
            spots.forEach((other) => {
                const on = other === spot;
                other.classList.toggle('is-open', on);
                other.querySelector('.custom-look-pin')?.setAttribute('aria-expanded', String(on));
            });
            if (spot) place(spot);
        };

        const onEnter = (event) => {
            if (event.pointerType === 'touch') return;
            open(event.currentTarget);
        };
        const onFocus = (event) => open(event.currentTarget);
        const onPin = (event) => {
            const spot = event.currentTarget.closest('.custom-look-spot');
            const isOpen = spot.classList.contains('is-open');
            // a tap toggles; a mouse click on an open pin keeps it open (hover opened it)
            if (isOpen && event.pointerType === 'touch') open(null);
            else open(spot);
        };
        const onStage = (event) => {
            if (!event.target.closest('.custom-look-spot')) open(null);
        };
        const onKey = (event) => {
            if (event.key === 'Escape' && spots.some((s) => s.classList.contains('is-open')))
                open(null);
        };

        spots.forEach((spot) => {
            spot.addEventListener('pointerenter', onEnter);
            spot.addEventListener('focusin', onFocus);
            spot.querySelector('.custom-look-pin')?.addEventListener('click', onPin);
        });
        stage.addEventListener('click', onStage);
        document.addEventListener('keydown', onKey);

        return {
            // phones keep the photo clear: their cards open on a tap only
            reset: () =>
                open(
                    matchMedia('(min-width: 768px)').matches
                        ? (spots.find((spot) => 'customDefault' in spot.dataset) ?? null)
                        : null,
                ),
            stop: () => {
                spots.forEach((spot) => {
                    spot.removeEventListener('pointerenter', onEnter);
                    spot.removeEventListener('focusin', onFocus);
                    spot.querySelector('.custom-look-pin')?.removeEventListener('click', onPin);
                });
                stage.removeEventListener('click', onStage);
                document.removeEventListener('keydown', onKey);
            },
        };
    }

    /* ------------------------------------------------------------------
       Lookbook
       ------------------------------------------------------------------ */
    function lookbook(el) {
        const hero = el.closest('.custom-hero') ?? el.parentElement;
        const thumbs = [...hero.querySelectorAll('.custom-look-thumb')];
        const looks = new Map(
            [...el.querySelectorAll('.custom-look-stage')].map((stage) => [stage, pins(stage)]),
        );
        let swiper = null;
        let watcher = null;
        let current = -1;

        const sync = () => {
            swiper.slides.forEach((slide, i) => {
                slide.inert = i !== swiper.activeIndex;
            });
            const index = swiper.realIndex;
            thumbs.forEach((thumb, i) => {
                if (i === index) thumb.setAttribute('aria-current', 'true');
                else thumb.removeAttribute('aria-current');
            });
            hero.style.setProperty('--custom-run', '0');
            if (index !== current) {
                current = index;
                // the look on show opens its default card; the one just left closes its own
                looks
                    .get(swiper.slides[swiper.activeIndex]?.querySelector('.custom-look-stage'))
                    ?.reset();
            }
        };

        const tick = (_s, _time, progress) =>
            hero.style.setProperty('--custom-run', (1 - progress).toFixed(3));
        const onStart = () => hero.setAttribute('data-custom-running', '');
        const onStop = () => hero.removeAttribute('data-custom-running');
        const go = (event) => {
            const i = thumbs.indexOf(event.currentTarget);
            if (i > -1 && swiper) swiper.slideToLoop(i);
        };

        const attach = () => {
            if (swiper || !el.swiper) return;
            swiper = el.swiper;
            watcher?.disconnect();
            swiper.on('slideChange', sync);
            swiper.on('autoplayTimeLeft', tick);
            swiper.on('autoplayStart autoplayResume', onStart);
            swiper.on('autoplayStop', onStop);
            if (swiper.autoplay?.running) onStart();
            sync();
        };

        thumbs.forEach((thumb) => thumb.addEventListener('click', go));

        // carousel.js marks the element (.swiper-initialized) once Swiper has loaded
        if (el.swiper) attach();
        else {
            watcher = new MutationObserver(attach);
            watcher.observe(el, { attributes: true, attributeFilter: ['class'] });
        }

        return () => {
            watcher?.disconnect();
            thumbs.forEach((thumb) => thumb.removeEventListener('click', go));
            looks.forEach((look) => look.stop());
            if (swiper) {
                swiper.off('slideChange', sync);
                swiper.off('autoplayTimeLeft', tick);
                swiper.off('autoplayStart autoplayResume', onStart);
                swiper.off('autoplayStop', onStop);
                swiper.slides.forEach((slide) => {
                    slide.inert = false;
                });
            }
            hero.removeAttribute('data-custom-running');
        };
    }

    /* ------------------------------------------------------------------
       Mega menus: Escape
       ------------------------------------------------------------------ */
    function mega(li) {
        const close = (event) => {
            if (event.key !== 'Escape' || !li.matches(':hover, :focus-within')) return;
            li.classList.add('custom-mega-closed');
            li.querySelector(':scope > .nav-link')?.focus();
        };
        const reopen = (event) => {
            if (event.type === 'focusout' && li.contains(event.relatedTarget)) return;
            li.classList.remove('custom-mega-closed');
        };
        li.addEventListener('keydown', close);
        li.addEventListener('mouseleave', reopen);
        li.addEventListener('focusout', reopen);
        return () => {
            li.removeEventListener('keydown', close);
            li.removeEventListener('mouseleave', reopen);
            li.removeEventListener('focusout', reopen);
            li.classList.remove('custom-mega-closed');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-lookbook]', lookbook],
        ['.nav-megamenu.custom-mega', mega],
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

    window.DraftmangoFashionStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
