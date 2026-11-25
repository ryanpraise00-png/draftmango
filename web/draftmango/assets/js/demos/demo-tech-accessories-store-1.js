/**
 * demo-tech-accessories-store-1.js — the Tech Accessories Store demo's own behaviour
 *
 * Classic script (defer), loaded only on this demo's pages. Everything works
 * without it: the first category shows on the stage and the bar has no line.
 *
 * Island line — a thin bar slides under the hovered or focused top-level link
 * of the Device Island and rests under the current page's link
 * (.custom-nav-line, the last <li> of the menu).
 *
 * Category switcher — the hero's huge words are a vertical tab list (hover,
 * focus, click, arrow keys, Home / End select); the matching stage scene shows
 * and the others go inert. Autoplay walks the words: the active word's line
 * fills over data-interval ms (a CSS animation — its animationend moves on),
 * held while the pointer or focus is inside the hero, while it is off screen,
 * or by the pause button. Reduced motion: no autoplay, instant swaps.
 *
 * window.DraftmangoTechAccessoriesStore1 = { init(root), destroy(root) } for page transitions.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const cleanups = new WeakMap();
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function islandLine(line) {
        const list = line.closest('.nav-links');
        if (!list) return () => {};
        const links = [...list.querySelectorAll(':scope > li > .nav-link')];

        const place = (link) => {
            if (!link || !link.offsetParent) return line.classList.remove('is-on');
            const box = (line.offsetParent ?? list).getBoundingClientRect();
            const r = link.getBoundingClientRect();
            // The caret is part of a mega trigger; the line spans the word only
            const label =
                link.firstChild?.nodeType === 3 && link.querySelector('i') ? link.firstChild : null;
            let x = r.left,
                w = r.width;
            if (label) {
                const range = document.createRange();
                range.selectNodeContents(label);
                const t = range.getBoundingClientRect();
                x = t.left;
                w = t.width;
            } else {
                const pad = parseFloat(getComputedStyle(link).paddingLeft) || 0;
                x = r.left + pad;
                w = r.width - pad * 2;
            }
            line.style.setProperty('--x', `${x - box.left}px`);
            line.style.setProperty('--w', `${w}px`);
            line.classList.add('is-on');
        };

        const rest = () => place(links.find((a) => a.classList.contains('active')));
        const onOver = (e) => {
            const link = e.target.closest?.('.nav-links > li')?.querySelector(':scope > .nav-link');
            if (link) place(link);
        };
        const onLeave = () => {
            if (!list.contains(document.activeElement)) rest();
        };
        const onFocusOut = (e) => {
            if (!list.contains(e.relatedTarget)) rest();
        };

        list.addEventListener('pointerover', onOver);
        list.addEventListener('focusin', onOver);
        list.addEventListener('pointerleave', onLeave);
        list.addEventListener('focusout', onFocusOut);
        const ro = new ResizeObserver(rest);
        ro.observe(list);
        document.fonts?.ready.then(rest);
        rest();
        requestAnimationFrame(() => line.classList.add('is-ready'));

        return () => {
            list.removeEventListener('pointerover', onOver);
            list.removeEventListener('focusin', onOver);
            list.removeEventListener('pointerleave', onLeave);
            list.removeEventListener('focusout', onFocusOut);
            ro.disconnect();
        };
    }

    function switcher(hero) {
        const tabs = [...hero.querySelectorAll('[role="tab"]')];
        const scenes = tabs.map((tab) =>
            hero.querySelector(`#${tab.getAttribute('aria-controls')}`),
        );
        const index = hero.querySelector('[data-custom-index]');
        const pause = hero.querySelector('[data-custom-pause]');
        const list = tabs[0]?.parentElement;
        if (!tabs.length) return () => {};

        let at = Math.max(
            0,
            tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'),
        );
        const holds = new Set();
        const auto = !reduced();
        hero.style.setProperty('--custom-interval', `${Number(hero.dataset.interval) || 5000}ms`);
        hero.classList.toggle('is-auto', auto);

        const hold = (why, on) => {
            on ? holds.add(why) : holds.delete(why);
            hero.classList.toggle('is-held', holds.size > 0);
        };

        // A horizontal word row (phones) keeps the active word in view without scrolling the page
        const reveal = (tab) => {
            if (list.scrollWidth <= list.clientWidth) return;
            const left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
            list.scrollTo({ left, behavior: reduced() ? 'auto' : 'smooth' });
        };

        const select = (i, focus = false) => {
            at = (i + tabs.length) % tabs.length;
            tabs.forEach((tab, n) => {
                const on = n === at;
                tab.setAttribute('aria-selected', String(on));
                tab.tabIndex = on ? 0 : -1;
                scenes[n]?.classList.toggle('is-active', on);
                if (scenes[n]) scenes[n].inert = !on;
            });
            if (index) index.textContent = String(at + 1).padStart(2, '0');
            if (focus) tabs[at].focus();
            reveal(tabs[at]);
        };

        const onClick = (e) => {
            const i = tabs.indexOf(e.target.closest('[role="tab"]'));
            if (i >= 0) select(i);
        };

        const onOver = (e) => {
            if (e.pointerType !== 'mouse') return;
            const i = tabs.indexOf(e.target.closest('[role="tab"]'));
            if (i >= 0 && i !== at) select(i);
        };

        const onKey = (e) => {
            const i = tabs.indexOf(e.target.closest('[role="tab"]'));
            if (i < 0) return;
            const next = {
                ArrowDown: i + 1,
                ArrowRight: i + 1,
                ArrowUp: i - 1,
                ArrowLeft: i - 1,
                Home: 0,
                End: tabs.length - 1,
            }[e.key];
            if (next === undefined) return;
            e.preventDefault();
            select(next, true);
        };

        // The active word's line finished filling: move on
        const onEnd = (e) => {
            if (e.animationName === 'custom-charge') select(at + 1);
        };

        const onEnter = (e) => {
            if (e.pointerType === 'mouse') hold('pointer', true);
        };
        const onLeave = () => hold('pointer', false);
        const onFocusIn = () => hold('focus', true);
        const onFocusOut = (e) => {
            if (!hero.contains(e.relatedTarget)) hold('focus', false);
        };

        const onPause = () => {
            const paused = pause.getAttribute('aria-pressed') !== 'true';
            pause.setAttribute('aria-pressed', String(paused));
            pause.setAttribute(
                'aria-label',
                paused ? 'Play the category slideshow' : 'Pause the category slideshow',
            );
            hold('user', paused);
        };

        const io = new IntersectionObserver(([entry]) => hold('away', !entry.isIntersecting), {
            threshold: 0.2,
        });

        list.addEventListener('click', onClick);
        list.addEventListener('pointerover', onOver);
        list.addEventListener('keydown', onKey);
        hero.addEventListener('animationend', onEnd);
        if (auto) {
            hero.addEventListener('pointerenter', onEnter);
            hero.addEventListener('pointerleave', onLeave);
            hero.addEventListener('focusin', onFocusIn);
            hero.addEventListener('focusout', onFocusOut);
            pause?.addEventListener('click', onPause);
            io.observe(hero);
        }
        select(at);

        return () => {
            list.removeEventListener('click', onClick);
            list.removeEventListener('pointerover', onOver);
            list.removeEventListener('keydown', onKey);
            hero.removeEventListener('animationend', onEnd);
            hero.removeEventListener('pointerenter', onEnter);
            hero.removeEventListener('pointerleave', onLeave);
            hero.removeEventListener('focusin', onFocusIn);
            hero.removeEventListener('focusout', onFocusOut);
            pause?.removeEventListener('click', onPause);
            io.disconnect();
        };
    }

    const parts = [
        ['.custom-nav-line', islandLine],
        ['[data-custom-switcher]', switcher],
    ];

    function init(root = document) {
        parts.forEach(([selector, mount]) =>
            within(root, selector).forEach((el) => {
                if (!cleanups.has(el)) cleanups.set(el, mount(el));
            }),
        );
    }

    function destroy(root = document) {
        parts.forEach(([selector]) =>
            within(root, selector).forEach((el) => {
                cleanups.get(el)?.();
                cleanups.delete(el);
            }),
        );
    }

    window.DraftmangoTechAccessoriesStore1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
