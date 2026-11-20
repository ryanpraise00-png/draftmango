(function () {
    'use strict';

    /**
     * text-reveal.js — per-letter heading entrance
     *
     *   <h2>Provide branding
     *     <span data-text-reveal="rise">solutions</span>
     *   </h2>
     *
     *   data-text-reveal   token: rise (default) | fade | slide-up | drop
     *   data-stagger       ms between letters (default 40) -> --char-stagger
     *
     * Splits the element's text into <span class="char"> letters with an
     * incremental --char-index, then fires once when the element scrolls into
     * view (own IntersectionObserver). The visual animation lives in
     * text-reveal.css. Real text stays accessible via aria-label; letters are
     * aria-hidden. Pure DOM — drops into a future React build unchanged.
     *
     * Runs from the entrance script (apps/html/src/assets/js/entrance.js), inline
     * in the page, like animate-on-view.js: keep it free of imports.
     */

    const THRESHOLD = 0.12;
    const OFFSET = 120; // px — fire once the element is comfortably in view

    function initTextReveal() {
        const els = document.querySelectorAll('[data-text-reveal]');
        if (!els.length) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        els.forEach((el) => split(el));

        // Reduced motion: reveal everything immediately, skip observing.
        if (reduce) {
            els.forEach((el) => el.classList.add('visible', 'chars-done'));
            return;
        }

        // When its last letter has risen, the line is marked done: the CSS drops
        // the spent animations, handing the text back to ClearType on Windows.
        els.forEach((el) => {
            let left = el.querySelectorAll('.char').length;
            el.addEventListener('animationend', (event) => {
                if (event.target.classList?.contains('char') && --left === 0)
                    el.classList.add('chars-done');
            });
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                });
            },
            { threshold: THRESHOLD, rootMargin: `0px 0px -${OFFSET}px 0px` },
        );

        els.forEach((el) => observer.observe(el));
    }

    /**
     * Wrap each word in <span class="word"> and each of its characters in
     * <span class="char"> with an incremental --char-index. Idempotent and
     * accessibility-aware.
     */
    function split(el) {
        if (el.dataset.textRevealSplit !== undefined) return; // already split

        // Expected: text-only content. Nested elements would be flattened/lost.
        const text = el.textContent;
        el.setAttribute('aria-label', text.trim());
        el.textContent = '';

        // Each letter is an inline-block, and browsers may break a line between two
        // adjacent inline-blocks — which splits words mid-word ("tim / e."). Group
        // a word's letters in a nowrap span so breaks can only land on the spaces.
        let index = 0;
        const words = text.split(' ');
        words.forEach((word, w) => {
            if (word.length) {
                const wordEl = document.createElement('span');
                wordEl.className = 'word';
                for (const ch of word) {
                    const span = document.createElement('span');
                    span.className = 'char';
                    span.setAttribute('aria-hidden', 'true');
                    span.style.setProperty('--char-index', index);
                    span.textContent = ch;
                    wordEl.append(span);
                    index += 1;
                }
                el.append(wordEl);
            }
            // Keep word spacing as plain inline text (no inline-block char).
            if (w < words.length - 1) el.append(document.createTextNode(' '));
        });

        const stagger = parseInt(el.dataset.stagger, 10);
        if (Number.isFinite(stagger)) el.style.setProperty('--char-stagger', `${stagger}ms`);

        el.dataset.textRevealSplit = '';
    }

    /**
     * animate-on-view.js — Generic "animate when visible" trigger
     *
     * Adds the `.visible` state class to any element matching `[data-anim]`
     * (or the legacy `.reveal` family) when it scrolls into the viewport.
     * The actual animation is defined in CSS, keyed off the `.visible` class —
     * this module only decides WHEN to flip the switch.
     *
     * It runs from the entrance script (apps/html/src/assets/js/entrance.js), which
     * the page carries inline: an element at the top of the page must not wait for
     * the bundle to be shown. Keep it free of imports.
     *
     * Per-element configuration via data attributes:
     *   data-anim-duration="800"   -> sets --anim-duration: 800ms
     *   data-anim-delay="200"      -> sets --anim-delay: 200ms
     *   data-anim-offset="80"      -> fire 80px after the edge enters (rootMargin bottom -80px)
     *   data-anim-threshold="0.25" -> IntersectionObserver threshold (0-1)
     *   data-anim-repeat           -> re-animate on every re-entry (default: once)
     *
     * Group staggering: put `data-anim-stagger="100"` (ms) on a WRAPPER and each
     * descendant `[data-anim]` is given an incremental --anim-delay (0, 100, 200…),
     * cascading the group. Children with their own `data-anim-delay` keep it.
     *
     * Uses IntersectionObserver only — no scroll listeners. Observers are cached
     * by threshold+offset so default elements share a single observer.
     * Respects prefers-reduced-motion by showing the final state with no motion.
     */

    const DEFAULT_THRESHOLD = 0.12;
    const DEFAULT_OFFSET = 120; // px — fire once the element is comfortably in view

    function initAnimateOnView() {
        const elements = document.querySelectorAll('[data-anim], .reveal');
        if (!elements.length) return;

        // Reduced motion: show the final state immediately, skip observing.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            elements.forEach((el) => el.classList.add('visible', 'anim-done'));
            return;
        }

        // Once its own reveal has run (an nx-* animation on the element or its
        // ::after panel, not one bubbling up from inside), the element is marked
        // done: the CSS then drops the spent animation, which hands its text back
        // to ClearType on Windows instead of greyscale antialiasing.
        const settle = (event) => {
            const el = event.currentTarget;
            if (
                event.target === el &&
                event.animationName.startsWith('nx-') &&
                el.classList.contains('visible')
            ) {
                el.classList.add('anim-done');
            }
        };

        // Stagger pre-pass: cascade --anim-delay across each group's children.
        // Runs before the main loop so per-element data-anim-delay still wins.
        document.querySelectorAll('[data-anim-stagger]').forEach((group) => {
            const step = parseInt(group.dataset.animStagger, 10);
            if (!Number.isFinite(step)) return;
            const base =
                group.dataset.animStaggerBase !== undefined
                    ? parseInt(group.dataset.animStaggerBase, 10)
                    : 0;
            const children = group.querySelectorAll('[data-anim]');
            children.forEach((child, i) => {
                if (child.dataset.animDelay === undefined) {
                    child.style.setProperty('--anim-delay', `${base + i * step}ms`);
                }
            });
        });

        const observers = new Map(); // key: "threshold|offset" -> IntersectionObserver

        const getObserver = (threshold, offset) => {
            const key = `${threshold}|${offset}`;
            if (observers.has(key)) return observers.get(key);

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        const el = entry.target;
                        const repeat = el.hasAttribute('data-anim-repeat');
                        if (entry.isIntersecting) {
                            el.classList.add('visible');
                            if (!repeat) observer.unobserve(el);
                        } else if (repeat) {
                            // Only reset once the element has genuinely scrolled out of
                            // the viewport. Some entrance animations (e.g. clip-path
                            // reveals) momentarily shrink the painted area to zero, which
                            // reads as "not intersecting" even though the box is still on
                            // screen — resetting here would create an add/remove flicker
                            // loop. Checking the box against the root bounds avoids that.
                            const rb = entry.rootBounds;
                            const box = entry.boundingClientRect;
                            const scrolledOut = !rb || box.bottom <= rb.top || box.top >= rb.bottom;
                            if (scrolledOut) el.classList.remove('visible', 'anim-done');
                        }
                    });
                },
                {
                    threshold,
                    rootMargin: `0px 0px -${offset}px 0px`,
                },
            );
            observers.set(key, observer);
            return observer;
        };

        elements.forEach((el) => {
            const { animDuration, animDelay, animOffset, animThreshold } = el.dataset;
            const offset = animOffset !== undefined ? parseInt(animOffset, 10) : DEFAULT_OFFSET;
            const threshold =
                animThreshold !== undefined ? parseFloat(animThreshold) : DEFAULT_THRESHOLD;

            if (animDuration) el.style.setProperty('--anim-duration', `${animDuration}ms`);
            if (animDelay) el.style.setProperty('--anim-delay', `${animDelay}ms`);

            el.addEventListener('animationend', settle);
            getObserver(threshold, offset).observe(el);
        });
    }

    /**
     * entrance.js — The entrance effects, started with the page instead of the bundle.
     *
     * [data-anim], .reveal and [data-text-reveal] elements are hidden by their CSS
     * until a script shows them. Left to main.js, a heading at the top of the page
     * stayed blank until the whole bundle had downloaded and run: seconds on a
     * phone, and the page's largest paint with it. So these two triggers live
     * here, in a script of their own that starts as soon as the markup is parsed:
     * the build inlines it at the top of <head> (scripts/html/entrance.mjs); the
     * buyer's package links it there as assets/js/entrance.js, async.
     *
     * It waits for the parser, never for a stylesheet or another script: the
     * readystatechange to "interactive" comes when the markup has been read,
     * before the deferred scripts run. (A script at the end of <body> would wait
     * for the stylesheets, and hand over straight to main.js: the first paint
     * would come after the bundle had run.)
     *
     * Keep it small and free of libraries: whatever is imported here runs before
     * the first paint, on every page.
     */

    function start() {
        // Letters first: a heading split after its observer started would show whole, then replay
        initTextReveal();
        initAnimateOnView();
    }

    if (document.readyState === 'loading')
        document.addEventListener('readystatechange', start, { once: true });
    else start();
})();
