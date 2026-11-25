/**
 * demo-seo-agency-1.js — SEO Agency demo: the hero search and the sample audit.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Two features, each driven by data attributes and independent of the other; each
 * does nothing when its elements are absent. Styles: css/demos/demo-seo-agency-1.css.
 *
 * For frameworks — window.FramoSeoAgency1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: observers disconnected, timers, frames and listeners
 *                              removed. Call it before the markup is removed (a route change, an
 *                              unmounting component), then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Search — [data-serp]
 *    The markup is the finished state of the first scenario; without this script, or with
 *    reduced motion, that is what shows.
 *    [data-serp-pick]     a scenario button (.is-active, aria-pressed) carrying its search:
 *                         data-query    the words typed into the pill
 *                         data-brand    the client, named first in the answer
 *                         data-answer   the rest of the answer's sentence
 *                         data-title, data-path   the client's row in the ladder
 *                         data-sources  the answer's sources, "A|B|C" (the first is the client)
 *                         data-from, data-to      the client's position before and now
 *    [data-serp-query]    receives the typed query, character by character
 *    [data-serp-brand], [data-serp-answer], [data-serp-title], [data-serp-path]
 *                         receive the scenario's texts; [data-serp-source] in DOM order
 *    [data-serp-ladder]   the list of rows; [data-serp-ours] is the client's row. It is moved to
 *                         the row of data-to, then travels there from the last row while the
 *                         rows it passes step down (each row's --shift, read by `translate`)
 *    [data-serp-pos]      each row's position numeral; the client's counts from data-from
 *    [data-serp-delta]    counts the places won, 0 → from − to
 *    [data-serp-move]     a rival's change chip: "no change", or "down 1" once it is passed
 *    Root classes: .is-armed (set at init: the playing looks apply only under it), .is-typing,
 *    .is-waiting (the answer is in, the ladder not yet), .is-climbing.
 *    Starts when 35% of it is visible. Then it advances to the next scenario by itself, at most
 *    twice round, and rests on a finished state: nothing on the page moves for ever. The pointer
 *    over it, or keyboard focus inside it, holds the advance; choosing a scenario plays it and
 *    starts a new series. Out of the viewport it stops on the finished state.
 *
 * 2. Sample audit — [data-audit]
 *    The markup is a finished sample report. A valid submit of the form inside it (the
 *    template's formValidate() dispatches `form-valid`) runs the report again for the domain
 *    typed; there is no network call.
 *    [data-audit-domain]      receives the submitted domain (the field named "domain")
 *    [data-audit-step]        in DOM order: .is-active for data-audit-ms (default 650), then
 *                             .is-complete (the template's .progress-step look)
 *    [data-audit-status]      receives the data-audit-label of the step that is running, and its
 *                             own data-audit-done at the end
 *    [data-audit-score="78"]  counts 0 → 78 after the steps
 *    [data-audit-bar="64"]    gets --value: 64 (a .custom-bar reads it); its [data-audit-value],
 *                             if any, counts 0 → 64
 *    [data-audit-result]      gets .is-shown at the end
 *    Root classes: .is-running, .is-complete. With reduced motion the report is rewritten at once.
 *
 * Writing text: every text this script rewrites (a typed query, a position, a count) lives in a
 * text node of its own and only that node's data changes. Replacing a node, which is what
 * el.textContent = … does, makes the browser look again at every :has() rule of the page.
 */
(() => {
    'use strict';

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => motionQuery.matches;

    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const easeOut = (t) => 1 - (1 - t) ** 3;
    /** `selector` matches in `root`, root itself included. */
    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    /** Writes `text` into el's own text node (created once), never replacing the node. */
    const setText = (el, text) => {
        if (!el) return;
        const value = String(text);
        const node = el.firstChild;
        if (node?.nodeType === Node.TEXT_NODE && !node.nextSibling) {
            if (node.data !== value) node.data = value;
        } else {
            el.replaceChildren(document.createTextNode(value));
        }
    };

    /** A set of timeouts and one animation frame that can be cancelled together. */
    function schedule() {
        const timers = new Set();
        let frame = 0;
        return {
            after(ms, fn) {
                const id = setTimeout(() => {
                    timers.delete(id);
                    fn();
                }, ms);
                timers.add(id);
            },
            /** Calls fn(progress 0–1) every frame for `ms`, then done(). */
            run(ms, fn, done) {
                const start = performance.now();
                const tick = (now) => {
                    const p = clamp01((now - start) / ms);
                    fn(p);
                    if (p < 1) frame = requestAnimationFrame(tick);
                    else done?.();
                };
                frame = requestAnimationFrame(tick);
            },
            clear() {
                timers.forEach(clearTimeout);
                timers.clear();
                cancelAnimationFrame(frame);
            },
        };
    }

    /* ------------------------------------------------------------------
       1. Search
       ------------------------------------------------------------------ */
    const TYPE_MS = 34; // per character
    const ANSWER_REST = 320; // between the last character and the answer
    const CLIMB_REST = 760; // between the answer and the climb
    const CLIMB_MS = 1100; // the climb itself (the CSS transition of `translate` matches it)
    const HOLD_MS = 4200; // a finished scenario stays this long before the next
    const ROUNDS = 2; // times round the scenarios before it rests

    function serp(root) {
        const picks = [...root.querySelectorAll('[data-serp-pick]')];
        const ladder = root.querySelector('[data-serp-ladder]');
        const ours = ladder?.querySelector('[data-serp-ours]');
        if (!picks.length || !ladder || !ours) return null;

        const part = (name) => root.querySelector(`[data-serp-${name}]`);
        const queryEl = part('query');
        const label = queryEl?.closest('[aria-label]');
        const sources = [...root.querySelectorAll('[data-serp-source]')];
        const rivals = [...ladder.children].filter((row) => row !== ours);
        const pos = (row) => row.querySelector('[data-serp-pos]');
        const todo = schedule();

        let active = Math.max(
            0,
            picks.findIndex((pick) => pick.classList.contains('is-active')),
        );
        let plays = 0; // scenarios played since the series began
        let inView = false;
        let held = false; // the pointer is over it, or focus is inside
        let waiting = false; // a finished scenario is waiting to hand over

        const scenario = (pick) => {
            const d = pick.dataset;
            const from = Number(d.from) || rivals.length + 1;
            const to = Math.min(Math.max(Number(d.to) || 1, 1), rivals.length + 1);
            return { ...d, from, to, sources: (d.sources ?? '').split('|') };
        };

        /** A rival's chip: "–" while it holds its place, "down 1" once the client has passed it. */
        const setMove = (row, down) => {
            const chip = row.querySelector('[data-serp-move]');
            if (!chip || chip.classList.contains('custom-delta--down') === down) return;
            chip.className = `custom-delta custom-delta--${down ? 'down' : 'flat'}`;
            const caret = document.createElement('i');
            caret.className = 'ph-fill ph-caret-down';
            chip.replaceChildren(...(down ? [caret, document.createTextNode('1')] : []));
        };

        /** The finished state of scenario `s`: its texts, the client's row in place, every numeral final. */
        function place(s) {
            picks.forEach((pick, i) => {
                pick.classList.toggle('is-active', i === active);
                pick.setAttribute('aria-pressed', String(i === active));
            });
            setText(queryEl, s.query);
            label?.setAttribute('aria-label', `A search for: ${s.query}`);
            setText(part('brand'), s.brand);
            setText(part('answer'), s.answer);
            setText(part('title'), s.title);
            setText(part('path'), s.path);
            sources.forEach((el, i) => setText(el, s.sources[i] ?? ''));

            const before = rivals[s.to - 1] ?? null;
            if (ours.nextElementSibling !== before) ladder.insertBefore(ours, before);
            [...ladder.children].forEach((row, i) => {
                row.style.removeProperty('--shift');
                setText(pos(row), i + 1);
            });
            rivals.forEach((row, i) => setMove(row, i >= s.to - 1));
            setText(part('delta'), s.from - s.to);
            root.classList.remove('is-typing', 'is-waiting', 'is-climbing');
        }

        /** Hands over to the next scenario after a rest, unless held, out of view or done. */
        function next() {
            waiting = false;
            if (!inView || reduced() || plays >= picks.length * ROUNDS) return;
            if (held) {
                waiting = true;
                return;
            }
            todo.after(HOLD_MS, () => {
                if (held) {
                    waiting = true;
                    return;
                }
                active = (active + 1) % picks.length;
                play();
            });
        }

        function play() {
            const s = scenario(picks[active]);
            todo.clear();
            place(s);
            if (reduced()) return;

            // Before: the client waits in the last row at its old position, the rows it will pass sit one up
            const rows = [...ladder.children];
            const step = rows.length > 1 ? rows[1].offsetTop - rows[0].offsetTop : 0;
            const index = s.to - 1;
            ours.style.setProperty('--shift', `${(rows.length - 1 - index) * step}px`);
            rivals.forEach((row, i) => {
                if (i >= index) row.style.setProperty('--shift', `${-step}px`);
                setText(pos(row), i + 1);
                setMove(row, false);
            });
            setText(pos(ours), s.from);
            setText(part('delta'), 0);
            setText(queryEl, '');
            root.classList.add('is-typing');

            const chars = [...s.query];
            const type = (n) => {
                setText(queryEl, chars.slice(0, n).join(''));
                if (n < chars.length) todo.after(TYPE_MS, () => type(n + 1));
                else todo.after(ANSWER_REST, answer);
            };
            const answer = () => {
                root.classList.replace('is-typing', 'is-waiting');
                todo.after(CLIMB_REST, climb);
            };
            const climb = () => {
                root.classList.replace('is-waiting', 'is-climbing');
                rows.forEach((row) => row.style.removeProperty('--shift'));
                let passed = false;
                todo.run(
                    CLIMB_MS,
                    (p) => {
                        const at = Math.round(s.from + (s.to - s.from) * easeInOut(p));
                        setText(pos(ours), at);
                        setText(part('delta'), s.from - at);
                        if (!passed && p >= 0.5) {
                            passed = true;
                            rivals.forEach((row, i) => {
                                if (i < index) return;
                                setText(pos(row), i + 2);
                                setMove(row, true);
                            });
                        }
                    },
                    () => {
                        root.classList.remove('is-climbing');
                        plays += 1;
                        next();
                    },
                );
            };
            todo.after(260, () => type(1));
        }

        /** Stops on the finished state of the active scenario. */
        function rest() {
            todo.clear();
            waiting = false;
            place(scenario(picks[active]));
        }

        const choose = (event) => {
            const i = picks.indexOf(event.currentTarget);
            if (i < 0) return;
            active = i;
            plays = 0;
            play();
        };
        const hold = () => {
            held = true;
        };
        const release = (event) => {
            if (event.type === 'focusout' && root.contains(event.relatedTarget)) return;
            held = root.matches(':hover') || root.contains(document.activeElement);
            if (!held && waiting) next();
        };
        const onMotion = () =>
            reduced()
                ? (root.classList.remove('is-armed'), rest())
                : root.classList.add('is-armed');

        picks.forEach((pick) => pick.addEventListener('click', choose));
        root.addEventListener('pointerenter', hold);
        root.addEventListener('pointerleave', release);
        root.addEventListener('focusin', hold);
        root.addEventListener('focusout', release);
        motionQuery.addEventListener('change', onMotion);
        if (!reduced()) root.classList.add('is-armed');

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting === inView) return;
                inView = entry.isIntersecting;
                if (!inView) return rest();
                plays = 0;
                play();
            },
            { threshold: 0.35 },
        );
        observer.observe(root);

        return () => {
            observer.disconnect();
            picks.forEach((pick) => pick.removeEventListener('click', choose));
            root.removeEventListener('pointerenter', hold);
            root.removeEventListener('pointerleave', release);
            root.removeEventListener('focusin', hold);
            root.removeEventListener('focusout', release);
            motionQuery.removeEventListener('change', onMotion);
            rest();
            root.classList.remove('is-armed');
        };
    }

    /* ------------------------------------------------------------------
       2. Sample audit
       ------------------------------------------------------------------ */
    const STEP_MS = 650;
    const FILL_MS = 1200;

    function audit(root) {
        const steps = [...root.querySelectorAll('[data-audit-step]')];
        const status = root.querySelector('[data-audit-status]');
        const score = root.querySelector('[data-audit-score]');
        const bars = [...root.querySelectorAll('[data-audit-bar]')];
        const result = root.querySelector('[data-audit-result]');
        const todo = schedule();

        const fill = (p) => {
            if (score) setText(score, Math.round(Number(score.dataset.auditScore) * p));
            bars.forEach((bar) => {
                const value = Math.round(Number(bar.dataset.auditBar) * p);
                bar.style.setProperty('--value', value);
                setText(bar.querySelector('[data-audit-value]'), value);
            });
        };

        const finish = () => {
            todo.clear();
            steps.forEach((step) => {
                step.classList.remove('is-active');
                step.classList.add('is-complete');
            });
            fill(1);
            if (status?.dataset.auditDone) setText(status, status.dataset.auditDone);
            result?.classList.add('is-shown');
            root.classList.remove('is-running');
            root.classList.add('is-complete');
        };

        const run = (event) => {
            const domain = new FormData(event.target).get('domain');
            if (domain)
                setText(
                    root.querySelector('[data-audit-domain]'),
                    String(domain)
                        .trim()
                        .replace(/^https?:\/\//i, '')
                        .replace(/\/.*$/, ''),
                );
            if (reduced()) return finish();

            todo.clear();
            root.classList.remove('is-complete');
            root.classList.add('is-running');
            result?.classList.remove('is-shown');
            steps.forEach((step) => step.classList.remove('is-active', 'is-complete'));
            fill(0);

            const step = (i) => {
                steps[i - 1]?.classList.replace('is-active', 'is-complete');
                const current = steps[i];
                if (!current) return todo.run(FILL_MS, (p) => fill(easeOut(p)), finish);
                current.classList.add('is-active');
                if (current.dataset.auditLabel) setText(status, current.dataset.auditLabel);
                todo.after(Number(current.dataset.auditMs) || STEP_MS, () => step(i + 1));
            };
            step(0);
        };

        root.addEventListener('form-valid', run);
        return () => {
            root.removeEventListener('form-valid', run);
            finish();
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-serp]', serp],
        ['[data-audit]', audit],
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

    window.FramoSeoAgency1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
