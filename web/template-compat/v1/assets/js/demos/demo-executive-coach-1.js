/**
 * demo-executive-coach-1.js — Executive Coaching demo: the booking sheet.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-executive-coach-1.css.
 *
 * For frameworks — window.FramoExecutiveCoach1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: listeners and observers removed. Call it before the
 *                              markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Booking sheet — the side sheet #ec-booking (template modals.js opens and closes it). When it
 *    closes, focus returns to the button that opened it; if that button is gone from view (the
 *    info panel's, which closes the panel as it opens the sheet), focus goes to the info toggle.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /* ------------------------------------------------------------------
       1. Booking sheet
       ------------------------------------------------------------------ */
    function bookingSheet(dialog) {
        let opener = null;

        const remember = (event) => {
            const trigger = event.target.closest?.(`[data-modal-target="${dialog.id}"]`);
            if (trigger) opener = trigger;
        };

        const restore = () => {
            const back = opener;
            opener = null;
            requestAnimationFrame(() => {
                const shown =
                    back?.isConnected &&
                    back.checkVisibility?.({ visibilityProperty: true, opacityProperty: true });
                if (shown) back.focus();
                else document.querySelector('.nav-info-toggle')?.focus();
            });
        };

        document.addEventListener('click', remember, true);
        dialog.addEventListener('close', restore);

        return () => {
            document.removeEventListener('click', remember, true);
            dialog.removeEventListener('close', restore);
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['dialog#ec-booking', bookingSheet]];
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

    window.FramoExecutiveCoach1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
