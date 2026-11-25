/**
 * demo-ai-studio-1.js — AI Creative Studio demo: the hero prompt and the develop effect.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-ai-studio-1.css.
 *
 * For frameworks — window.FramoAiStudio1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers, listeners and observers removed, the final
 *                              state restored. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Hero prompt — [data-custom-hero]: the prompt bar types the prompt of each centre artwork
 *    ([data-custom-frames] img[data-custom-prompt]) in turn; when a prompt is complete,
 *    Generate presses, the matching artwork and caption ([data-custom-captions] > *) take
 *    .is-active and the artwork develops (grain + blur → sharp), then the text clears and the
 *    next prompt starts. It runs only while the hero is on screen and the tab is visible.
 *    Reduced motion or no JS: the first prompt in full, its artwork sharp (the markup's state).
 * 2. Develop — every other .custom-develop: .is-latent at load, cleared when it scrolls into
 *    view (the CSS transitions it, after --custom-develop-delay). Reduced motion: nothing.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

    const TYPE_MS = 42; // per character
    const ERASE_MS = 14; // per character, clearing
    const GENERATE_MS = 650; // the button held down before the artwork changes
    const HOLD_MS = 4200; // the finished artwork on show
    const START_MS = 3400; // the first prompt is on show at load; its artwork develops first

    /* ------------------------------------------------------------------
       1. Hero prompt
       ------------------------------------------------------------------ */
    function heroPrompt(stage) {
        const bar = stage.querySelector('.custom-prompt');
        const typed = stage.querySelector('[data-custom-typed]');
        const textBox = typed?.parentElement;
        const develop = stage.querySelector('[data-custom-frames]');
        const frames = develop ? [...develop.querySelectorAll('img[data-custom-prompt]')] : [];
        const captions = [...(stage.querySelector('[data-custom-captions]')?.children ?? [])];
        if (!bar || !typed || frames.length < 2 || reduced()) return null;

        const prompts = frames.map((img) => img.dataset.customPrompt);
        let index = 0;
        let timer = 0;
        let step = null; // the next thing to do, kept while paused
        let onScreen = false;
        let running = false;
        let first = true;

        const fit = () => {
            if (!textBox) return;
            const over = textBox.scrollWidth > textBox.clientWidth + 1;
            bar.classList.toggle('is-overflow', over);
            textBox.scrollLeft = textBox.scrollWidth;
        };

        const schedule = (fn, ms) => {
            step = fn;
            clearTimeout(timer);
            if (running)
                timer = setTimeout(() => {
                    step = null;
                    fn();
                }, ms);
        };

        const show = (i) => {
            frames.forEach((img, n) => img.classList.toggle('is-active', n === i));
            captions.forEach((el, n) => el.classList.toggle('is-active', n === i));
        };

        const developNow = () => {
            develop.classList.add('is-latent');
            void develop.offsetWidth;
            develop.classList.remove('is-latent');
        };

        const erase = () => {
            const text = typed.textContent;
            if (!text.length) {
                index = (index + 1) % prompts.length;
                schedule(type, 300);
                return;
            }
            typed.textContent = text.slice(0, -1);
            fit();
            schedule(erase, ERASE_MS);
        };

        const generate = () => {
            bar.classList.add('is-generating');
            schedule(() => {
                bar.classList.remove('is-generating');
                show(index);
                developNow();
                schedule(erase, HOLD_MS);
            }, GENERATE_MS);
        };

        const type = () => {
            const full = prompts[index];
            const text = typed.textContent;
            if (text.length >= full.length) {
                generate();
                return;
            }
            typed.textContent = full.slice(0, text.length + 1);
            fit();
            schedule(type, TYPE_MS + (full[text.length] === ' ' ? 30 : 0));
        };

        const play = () => {
            const should = onScreen && document.visibilityState === 'visible';
            if (should === running) return;
            running = should;
            if (running && first) {
                first = false;
                // Let the fan's entrance land before the first artwork clears
                setTimeout(() => develop.classList.remove('is-latent'), 900);
            }
            if (running) schedule(step ?? erase, step ? 200 : START_MS);
            else clearTimeout(timer);
        };

        develop.classList.add('is-latent');

        const io = new IntersectionObserver(
            ([entry]) => {
                onScreen = entry.isIntersecting;
                play();
            },
            { threshold: 0.15 },
        );
        io.observe(stage);
        document.addEventListener('visibilitychange', play);

        return () => {
            clearTimeout(timer);
            io.disconnect();
            document.removeEventListener('visibilitychange', play);
            bar.classList.remove('is-generating', 'is-overflow');
            typed.textContent = prompts[0];
            develop.classList.remove('is-latent');
            show(0);
        };
    }

    /* ------------------------------------------------------------------
       2. Develop on view
       ------------------------------------------------------------------ */
    function developOnView(el) {
        if (el.closest('[data-custom-hero]') || reduced()) return null;
        el.classList.add('is-latent');
        const io = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                el.classList.remove('is-latent');
                io.disconnect();
            },
            { threshold: 0.3 },
        );
        io.observe(el);

        return () => {
            io.disconnect();
            el.classList.remove('is-latent');
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-custom-hero]', heroPrompt],
        ['.custom-develop', developOnView],
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

    window.FramoAiStudio1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
