/**
 * demo-ai-chatbot-1.js — AI Support Agent demo: the hero conversation and the Ask Draftmango palette.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-ai-chatbot-1.css.
 *
 * For frameworks — window.DraftmangoAiChatbot1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: timers, listeners and observers removed. Call it before
 *                              the markup is removed, then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Chat playback — .custom-chat[data-chat-play]. The rows of its .custom-chat-body show one by
 *    one: each waits its data-delay (ms); an agent row with data-typing="ms" shows its typing dots
 *    first. The quick reply marked data-pick is picked just before the customer's next message.
 *    Plays once when the card is in view, pauses off-screen and resumes where it stopped. Under
 *    reduced motion (and without this script) the whole conversation shows at once: the CSS
 *    hides a row only while the card is armed and has no .is-done.
 * 2. Ask Draftmango palette — dialog[data-palette] (template modals.js opens and closes it). A
 *    suggested question (button.custom-palette-q: data-answer, data-links "Label|URL;…") or a
 *    typed one (matched on each button's data-keys words, else the form's data-fallback) adds the
 *    question and a typed answer to the thread. ⌘K / Ctrl+K toggles the palette, Escape closes
 *    it; focus returns to where it was. The key chip says Ctrl K off Apple systems.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------
       1. Chat playback
       ------------------------------------------------------------------ */
    function chatPlay(card) {
        const rows = [...card.querySelectorAll('.custom-chat-body > li')];
        if (!rows.length || reduced()) {
            card.classList.add('is-done');
            return null;
        }

        // One queue of [wait ms, step]
        const queue = [];
        rows.forEach((row) => {
            const delay = Number(row.dataset.delay ?? 400);
            const typing = Number(row.dataset.typing ?? 0);
            const picks = row.classList.contains('custom-msg--out')
                ? [...card.querySelectorAll('[data-pick]:not(.is-picked)')].filter(
                      (pick) => rows.indexOf(pick.closest('li')) < rows.indexOf(row),
                  )
                : [];

            if (picks.length) {
                queue.push([
                    delay * 0.55,
                    () => picks.forEach((pick) => pick.classList.add('is-picked')),
                ]);
                queue.push([delay * 0.45, () => row.classList.add('is-shown')]);
            } else if (typing) {
                queue.push([delay, () => row.classList.add('is-shown', 'is-typing')]);
                queue.push([typing, () => row.classList.remove('is-typing')]);
            } else {
                queue.push([delay, () => row.classList.add('is-shown')]);
            }
        });

        let step = 0;
        let timer = null;
        let inView = false;

        const finish = () => {
            clearTimeout(timer);
            timer = null;
            rows.forEach((row) => row.classList.remove('is-typing'));
            card.classList.add('is-done');
            observer.disconnect();
            motion.removeEventListener('change', onMotion);
        };

        const next = () => {
            if (step >= queue.length) return finish();
            const [wait, run] = queue[step];
            timer = setTimeout(() => {
                timer = null;
                run();
                step += 1;
                if (inView) next();
            }, wait);
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                inView = entry.isIntersecting;
                if (inView && !timer) next();
                else if (!inView && timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            },
            { threshold: 0.3 },
        );

        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotion = () => {
            if (motion.matches) finish();
        };

        observer.observe(card);
        motion.addEventListener('change', onMotion);

        return finish;
    }

    /* ------------------------------------------------------------------
       2. Ask Draftmango palette
       ------------------------------------------------------------------ */
    const parseLinks = (value = '') =>
        value
            .split(';')
            .map((pair) => pair.split('|'))
            .filter(([label, href]) => label && href);

    function palette(dialog) {
        const form = dialog.querySelector('[data-palette-form]');
        const input = form?.querySelector('input');
        const thread = dialog.querySelector('[data-palette-thread]');
        const body = dialog.querySelector('.custom-palette-body');
        const label = dialog.querySelector('[data-palette-label]');
        const questions = [...dialog.querySelectorAll('.custom-palette-q')];
        const markSrc = dialog.querySelector('.custom-palette-mark img');
        const timers = new Set();
        let opener = null;

        const later = (fn, ms) => {
            const id = setTimeout(() => {
                timers.delete(id);
                fn();
            }, ms);
            timers.add(id);
        };

        const scrollDown = () =>
            body?.scrollTo({ top: body.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });

        const row = (kind) => {
            const li = document.createElement('li');
            li.className = `custom-msg custom-msg--${kind} is-entering`;
            return li;
        };

        const ask = (question, answer, links) => {
            const out = row('out');
            const bubble = document.createElement('p');
            bubble.className = 'custom-msg-bubble';
            bubble.textContent = question;
            out.append(bubble);

            const reply = row('agent');
            const avatar = document.createElement('span');
            avatar.className = 'custom-msg-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            if (markSrc) avatar.append(markSrc.cloneNode(true));

            const stack = document.createElement('div');
            stack.className = 'custom-msg-stack';
            const typing = document.createElement('span');
            typing.className = 'custom-typing';
            typing.setAttribute('aria-hidden', 'true');
            typing.append(...[0, 1, 2].map(() => document.createElement('i')));
            const text = document.createElement('p');
            text.className = 'custom-msg-bubble';
            text.textContent = answer;
            stack.append(typing, text);

            if (links.length) {
                const list = document.createElement('div');
                list.className = 'custom-palette-links';
                links.forEach(([name, href]) => {
                    const a = document.createElement('a');
                    a.className = 'custom-palette-link';
                    a.href = href;
                    a.textContent = name;
                    const icon = document.createElement('i');
                    icon.className = 'ph ph-arrow-right';
                    icon.setAttribute('aria-hidden', 'true');
                    a.append(icon);
                    list.append(a);
                });
                stack.append(list);
            }
            reply.append(avatar, stack);

            thread.append(out);
            if (label) label.textContent = 'More Questions';
            scrollDown();

            if (reduced()) {
                thread.append(reply);
                scrollDown();
                return;
            }
            later(() => {
                reply.classList.add('is-typing');
                thread.append(reply);
                scrollDown();
                later(() => {
                    reply.classList.remove('is-typing');
                    scrollDown();
                }, 900);
            }, 350);
        };

        const fromButton = (button) =>
            ask(
                button.querySelector('span')?.textContent.trim() ?? '',
                button.dataset.answer ?? '',
                parseLinks(button.dataset.links),
            );

        const onClick = (event) => {
            const button = event.target.closest('.custom-palette-q');
            if (button) return fromButton(button);
            // An answer's link leaves the palette (an in-page anchor scrolls once it is closed)
            if (event.target.closest('.custom-palette-link')) dialog.close();
        };

        const onSubmit = (event) => {
            event.preventDefault();
            const query = input.value.trim();
            if (!query) return;
            const words = query.toLowerCase();
            const match = questions.find((button) =>
                (button.dataset.keys ?? '').split(/\s+/).some((key) => key && words.includes(key)),
            );
            input.value = '';
            if (match) ask(query, match.dataset.answer ?? '', parseLinks(match.dataset.links));
            else ask(query, form.dataset.fallback ?? '', parseLinks(form.dataset.fallbackLinks));
        };

        // Focus goes back to whatever had it before the palette opened
        const remember = (event) => {
            if (event.target.closest?.(`[data-modal-target="${dialog.id}"]`))
                opener = document.activeElement;
        };
        const restore = () => {
            const back = opener;
            opener = null;
            timers.forEach(clearTimeout);
            timers.clear();
            thread.querySelectorAll('.is-typing').forEach((li) => li.classList.remove('is-typing'));
            requestAnimationFrame(() => {
                if (back?.isConnected && document.activeElement !== back) back.focus?.();
            });
        };

        // ⌘K / Ctrl+K toggles; the visible Ask Draftmango button opens, so modals.js locks the page as usual
        const onKey = (event) => {
            if (
                !(event.metaKey || event.ctrlKey) ||
                event.key.toLowerCase() !== 'k' ||
                event.altKey ||
                event.shiftKey
            )
                return;
            event.preventDefault();
            if (dialog.open) return dialog.close();
            opener = document.activeElement;
            const trigger = [
                ...document.querySelectorAll(`[data-modal-target="${dialog.id}"]`),
            ].find((el) => el.checkVisibility?.() ?? true);
            if (trigger) {
                const back = opener;
                trigger.click();
                opener = back;
            } else {
                dialog.showModal();
            }
        };

        // The key chip names the right modifier
        const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';
        if (!/mac|iphone|ipad|ipod/i.test(platform)) {
            document.querySelectorAll('[data-kbd-mod]').forEach((kbd) => {
                kbd.textContent = 'Ctrl K';
            });
        }

        dialog.addEventListener('click', onClick);
        form?.addEventListener('submit', onSubmit);
        dialog.addEventListener('close', restore);
        document.addEventListener('click', remember, true);
        document.addEventListener('keydown', onKey);

        return () => {
            timers.forEach(clearTimeout);
            dialog.removeEventListener('click', onClick);
            form?.removeEventListener('submit', onSubmit);
            dialog.removeEventListener('close', restore);
            document.removeEventListener('click', remember, true);
            document.removeEventListener('keydown', onKey);
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['.custom-chat[data-chat-play]', chatPlay],
        ['dialog[data-palette]', palette],
    ];
    const wired = new WeakMap(); // element → the function that stops its feature

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (wired.has(el)) continue;
                const stop = feature(el);
                wired.set(el, stop ?? (() => {}));
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

    window.DraftmangoAiChatbot1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
