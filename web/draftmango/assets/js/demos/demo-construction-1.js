/**
 * demo-construction-1.js — Construction demo: the hero's expanding photo columns.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-construction-1.css (.custom-columns).
 *
 * For frameworks — window.DraftmangoConstruction1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them. Call it before the markup is removed, then init() on
 *                              the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Columns — [data-custom-columns] around .custom-columns-item panels, each with a
 *    .custom-columns-toggle button (aria-controls = its .custom-columns-caption).
 *    - The open panel carries .is-active; its toggle aria-expanded="true"; every other caption
 *      is inert. Pointer over a panel, keyboard focus or a click / tap opens it.
 *    - From 1024px, without reduced motion, the root gets .is-auto: the open panel's level line
 *      fills over --custom-dwell (5 s, CSS) and at its animationend the next panel opens. The
 *      root gets .is-paused while the pointer is over it, focus is inside it, it is off screen
 *      or the tab is hidden.
 *    - Under 1024px the panels are a swipeable row with every caption shown: nothing advances.
 *    Without the script the first panel stays open and the others show their sector.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const wired = new Map();

    /* ------------------------------------------------------------------
       1. Columns
       ------------------------------------------------------------------ */
    function columns(el) {
        const items = [...el.querySelectorAll('.custom-columns-item')];
        if (items.length < 2) return () => {};

        const wide = window.matchMedia('(min-width: 1024px)');
        const still = window.matchMedia('(prefers-reduced-motion: reduce)');
        const pause = { pointer: false, focus: false, offscreen: false, hidden: document.hidden };
        let active = Math.max(
            0,
            items.findIndex((item) => item.classList.contains('is-active')),
        );

        const open = (index) => {
            active = (index + items.length) % items.length;
            items.forEach((item, i) => {
                const on = i === active;
                item.classList.toggle('is-active', on);
                item.querySelector('.custom-columns-toggle')?.setAttribute(
                    'aria-expanded',
                    String(on),
                );
                const caption = item.querySelector('.custom-columns-caption');
                // Phones and tablets show every caption
                if (caption) caption.inert = wide.matches && !on;
            });
        };

        const syncPause = () => {
            el.classList.toggle('is-paused', Object.values(pause).some(Boolean));
        };

        const syncMode = () => {
            el.classList.toggle('is-auto', wide.matches && !still.matches);
            open(active);
        };

        const onEnter = (event) => {
            if (event.pointerType !== 'mouse' || !wide.matches) return;
            const index = items.indexOf(event.currentTarget);
            if (index !== active) open(index);
        };

        const onClick = (event) => {
            const item = event.target.closest('.custom-columns-item');
            if (item && event.target.closest('.custom-columns-toggle')) open(items.indexOf(item));
        };

        const onFocusIn = (event) => {
            pause.focus = true;
            syncPause();
            const item = event.target.closest('.custom-columns-item');
            const index = items.indexOf(item);
            if (index > -1 && index !== active && wide.matches) open(index);
        };

        const onFocusOut = (event) => {
            if (el.contains(event.relatedTarget)) return;
            pause.focus = false;
            syncPause();
        };

        const onPointer = (state) => (event) => {
            if (event.pointerType !== 'mouse') return;
            pause.pointer = state;
            syncPause();
        };
        const onOver = onPointer(true);
        const onLeave = onPointer(false);

        // The dwell is the level line's fill animation on the open panel
        const onDwell = (event) => {
            if (event.animationName !== 'custom-columns-dwell') return;
            if (!el.classList.contains('is-auto')) return;
            open(active + 1);
        };

        const onVisibility = () => {
            pause.hidden = document.hidden;
            syncPause();
        };

        const watcher = new IntersectionObserver(
            ([entry]) => {
                pause.offscreen = !entry.isIntersecting;
                syncPause();
            },
            { threshold: 0.35 },
        );

        items.forEach((item) => item.addEventListener('pointerenter', onEnter));
        el.addEventListener('click', onClick);
        el.addEventListener('focusin', onFocusIn);
        el.addEventListener('focusout', onFocusOut);
        el.addEventListener('pointerover', onOver);
        el.addEventListener('pointerleave', onLeave);
        el.addEventListener('animationend', onDwell);
        document.addEventListener('visibilitychange', onVisibility);
        wide.addEventListener('change', syncMode);
        still.addEventListener('change', syncMode);
        watcher.observe(el);
        syncMode();
        syncPause();

        return () => {
            items.forEach((item) => {
                item.removeEventListener('pointerenter', onEnter);
                const caption = item.querySelector('.custom-columns-caption');
                if (caption) caption.inert = false;
            });
            el.removeEventListener('click', onClick);
            el.removeEventListener('focusin', onFocusIn);
            el.removeEventListener('focusout', onFocusOut);
            el.removeEventListener('pointerover', onOver);
            el.removeEventListener('pointerleave', onLeave);
            el.removeEventListener('animationend', onDwell);
            document.removeEventListener('visibilitychange', onVisibility);
            wide.removeEventListener('change', syncMode);
            still.removeEventListener('change', syncMode);
            watcher.disconnect();
            el.classList.remove('is-auto', 'is-paused');
        };
    }

    const FEATURES = [['[data-custom-columns]', columns]];

    function init(root = document) {
        FEATURES.forEach(([selector, feature]) => {
            within(root, selector).forEach((el) => {
                if (!wired.has(el)) wired.set(el, feature(el));
            });
        });
    }

    function destroy(root = document) {
        within(root, FEATURES.map(([selector]) => selector).join(', ')).forEach((el) => {
            wired.get(el)?.();
            wired.delete(el);
        });
    }

    window.DraftmangoConstruction1 = { init, destroy };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => init(), { once: true });
    } else {
        init();
    }
})();
