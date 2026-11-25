/**
 * demo-ai-agency-1.js — AI Agency demo: the agent run, the ROI calculator and the off-screen pause.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Three features, each driven by data attributes and independent of the others;
 * each does nothing when its elements are absent. Styles: css/demos/demo-ai-agency-1.css.
 * The aurora grounds are the template's (aurora-field.js, wired by the template's main script).
 *
 * For frameworks — window.FramoAiAgency1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: observers disconnected, timers, frames and listeners
 *                              removed. Call it before the markup is removed (a route change, an
 *                              unmounting component), then init() on the new markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *    The aurora is not covered: call the template's initAuroraFields(root) and
 *    destroyAuroraFields(root) (@framo/core) beside these two.
 *
 * 1. Agent run — [data-agent-run] (data-agent-run="loop" plays a series)
 *    [data-agent-type]        its text is typed first, character by character
 *    [data-agent-step]        in DOM order: .is-active for data-agent-ms (default 900), then .is-done;
 *                             a .custom-approval that is the step, or inside it, gets .is-approved
 *    [data-agent-timer="38"]  counts 0.0s → 38.0s while the steps run
 *    [data-agent-count="14"]  counts 0 → 14 while the steps run
 *    [data-agent-result]      gets .is-shown at the end
 *    Root classes: .is-armed (set at init: the pending looks apply only under it), .is-running,
 *    .is-complete. Starts when 40% of it is visible, or, for a run taller than the window, when
 *    it covers 60% of the window; resets when it leaves the viewport or is hidden (display:
 *    none, or visibility: hidden like an inactive .tabs-panel), so it plays again when shown.
 *    With "loop" it plays again data-agent-pause ms (default 4200) after the end, at most
 *    data-agent-loops times in all (default 3) each time it comes into view, then rests on its
 *    finished state: nothing on the page moves for ever. Leaving and re-entering the viewport,
 *    or choosing its tab again, starts a new series. With reduced motion it is not armed: the
 *    final values are written and .is-complete is set; the setting is followed live.
 *
 * 2. ROI calculator — <form data-roi>
 *    Ranges named people, hours (per person per week) and rate (hourly cost); optionally a
 *    fourth, share: the part of the task automated, in percent (min="20" max="90"). With it the
 *    share is the slider's value / 100; without it, data-roi-share.
 *    data-roi-weeks="46"  data-roi-share="0.6"  data-roi-cost="18000"
 *    data-roi-currency="USD"  data-roi-locale="en-US"  data-roi-payback-max="104"
 *    [data-roi-value="people|hours|rate|share"]  the slider's value (rate as currency, share as a percentage)
 *    [data-roi-out="hours"]    hours returned a year = people × hours × weeks × share
 *    [data-roi-out="value"]    their value a year, as currency without decimals
 *    [data-roi-out="payback"]  weeks to pay back the cost (at least 1, one decimal at most; above
 *                              data-roi-payback-max it reads "104+")
 *    Each range also gets --value (0–1), the filled part of its track, and an aria-valuetext:
 *    its formatted value, followed by its data-roi-unit="person|people" (singular|plural) if any.
 *    For screen readers: an <output> is a live region, and a dozen of them speaking on every
 *    step of a slider is noise. Give each <output> aria-live="off" and add ONE summary,
 *    <p class="sr-only" aria-live="polite" data-roi-summary="{hours} [hour|hours] and {value} a
 *    year; payback in {payback} [week|weeks]">…</p>: it is rewritten 400 ms after the last change.
 *    The attribute is the sentence's template ({hours}, {value}, {payback}; a [singular|plural]
 *    pair after one of them follows its number), its text the sentence for the initial values.
 *
 * 3. Off-screen pause — every direct child of <main>, .custom-footer, and each .custom-vig
 *    While one is out of the viewport the endless CSS animations inside it (iteration count
 *    infinite) are paused through the Web Animations API, and played again as it comes back. No
 *    class is set and no style rule is involved, so a section crossing the edge costs no style
 *    recalculation. Entrances, transitions and one-shot animations are left alone. A long
 *    section holds smaller watched boxes (the vignettes of the deck): add a selector to WATCHED
 *    for any other box whose endless animation should rest while its section is still in view.
 *
 * Writing text: every text this script rewrites (a typed prompt, a timer, a count) lives in a
 * text node of its own and only that node's data changes. Replacing a node, which is what
 * el.textContent = … does, makes the browser look again at every :has() rule of the page; on a
 * long page that is a full style recalculation per typed character.
 */
(() => {
    'use strict';

    // Reduced motion is read in one place and followed live. Chromium drops the change event of a
    // MediaQueryList whose .matches was read after the setting changed, which a frame loop
    // would do every time: so nothing below reads the query, only this flag.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionWatchers = new Set();
    let reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (event) => {
        reducedMotion = event.matches;
        for (const watcher of motionWatchers) watcher();
    });
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    // root itself when it matches, then everything in it that does
    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    // Text goes into the element's own text node (see "Writing text" above); an element that holds
    // anything else is rewritten whole
    const setText = (el, text) => {
        const node = el.firstChild;
        if (node?.nodeType !== Node.TEXT_NODE || node !== el.lastChild) el.textContent = text;
        else if (node.data !== text) node.data = text;
    };

    /* ------------------------------------------------------------------
       1. Agent run
       ------------------------------------------------------------------ */
    const TYPE_MS = 26; // per character
    const TYPE_REST = 320; // between the prompt and the first step
    const END_REST = 260; // between the last step and the result
    // Every 5% of the run: a run several windows tall never shows 40% of itself, so the observer
    // must report often enough to catch the moment it fills most of the window
    const RUN_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

    /** Wires one run; returns the function that stops it. */
    function agentRun(root) {
        const loop = root.dataset.agentRun === 'loop';
        const pause = Number(root.dataset.agentPause) || 4200;
        const loops = Math.max(1, Math.round(Number(root.dataset.agentLoops)) || 3);
        const steps = [...root.querySelectorAll('[data-agent-step]')].map((el) => ({
            el,
            ms: Number(el.dataset.agentMs) || 900,
            approval: el.matches('.custom-approval') ? el : el.querySelector('.custom-approval'),
        }));
        const timers = [...root.querySelectorAll('[data-agent-timer]')].map((el) => ({
            el,
            to: Number(el.dataset.agentTimer) || 0,
        }));
        const counts = [...root.querySelectorAll('[data-agent-count]')].map((el) => ({
            el,
            to: Number(el.dataset.agentCount) || 0,
        }));
        const results = [...root.querySelectorAll('[data-agent-result]')];
        const integer = new Intl.NumberFormat(document.documentElement.lang || 'en-US', {
            maximumFractionDigits: 0,
        });
        const progress = (p) => {
            for (const { el, to } of timers) setText(el, `${(to * p).toFixed(1)}s`);
            for (const { el, to } of counts) setText(el, integer.format(Math.round(to * p)));
        };

        // The prompt keeps its full text in two spans, typed and rest, so its lines never move.
        // Split on the first armed run only: with reduced motion the markup stays as written.
        const prompt = root.querySelector('[data-agent-type]');
        const text = prompt?.textContent.trim().replace(/\s+/g, ' ') ?? '';
        let typed = null;
        let rest = null;
        const split = () => {
            if (!prompt || typed) return;
            // Each span keeps one text node for good, empty or not: typing only changes their data
            typed = document.createElement('span');
            rest = document.createElement('span');
            typed.append(document.createTextNode(''));
            rest.append(document.createTextNode(text));
            typed.setAttribute('data-agent-typed', '');
            rest.setAttribute('data-agent-rest', '');
            prompt.replaceChildren(typed, rest);
        };

        const typeEnd = text.length * TYPE_MS + (text ? TYPE_REST : 0);
        const stepsTotal = steps.reduce((sum, step) => sum + step.ms, 0);
        const end = typeEnd + stepsTotal + END_REST;

        let armed = false;
        let frame = 0;
        let timeout = 0;
        let recheck = 0;
        let clock = 0;
        let last = 0;
        let shown = -1;
        let plays = 0; // of the current series

        const stop = () => {
            cancelAnimationFrame(frame);
            clearTimeout(timeout);
            frame = 0;
            timeout = 0;
        };

        // Back to the start of one play
        const reset = () => {
            stop();
            clock = 0;
            shown = -1;
            root.classList.remove('is-running', 'is-complete');
            for (const { el, approval } of steps) {
                el.classList.remove('is-active', 'is-done');
                approval?.classList.remove('is-approved');
            }
            for (const el of results) el.classList.remove('is-shown');
            if (typed) {
                setText(typed, '');
                setText(rest, text);
            }
            progress(0);
        };

        const tick = (now) => {
            clock += Math.min(now - last, 100);
            last = now;

            if (typed) {
                const chars = Math.min(text.length, Math.floor(clock / TYPE_MS));
                if (chars !== shown) {
                    shown = chars;
                    setText(typed, text.slice(0, chars));
                    setText(rest, text.slice(chars));
                }
            }

            let from = typeEnd;
            for (const { el, ms, approval } of steps) {
                const active = clock >= from && clock < from + ms;
                const done = clock >= from + ms;
                el.classList.toggle('is-active', active);
                el.classList.toggle('is-done', done);
                if (done) approval?.classList.add('is-approved');
                from += ms;
            }
            progress(stepsTotal ? clamp01((clock - typeEnd) / stepsTotal) : 1);

            if (clock < end) {
                frame = requestAnimationFrame(tick);
                return;
            }
            frame = 0;
            for (const el of results) el.classList.add('is-shown');
            root.classList.remove('is-running');
            root.classList.add('is-complete');
            // A looped run plays its series, then rests on the finished state
            plays++;
            if (loop && plays < loops)
                timeout = setTimeout(() => {
                    reset();
                    play();
                }, pause);
        };

        const play = () => {
            if (!armed || frame || root.classList.contains('is-complete')) return;
            root.classList.add('is-running');
            last = performance.now();
            frame = requestAnimationFrame(tick);
        };

        // 40% of it in view (or, for a run taller than the window, most of the window covered) starts
        // it; out of view, or hidden with its tab panel, it goes back to the start of a new series
        let inView = false;
        let enough = false;
        const check = () => {
            if (!armed) return;
            if (!inView || getComputedStyle(root).visibility === 'hidden') {
                plays = 0;
                reset();
            } else if (enough) play();
        };
        const onView = new IntersectionObserver(
            ([entry]) => {
                const windowHeight = entry.rootBounds?.height ?? window.innerHeight;
                inView = entry.isIntersecting;
                enough =
                    entry.intersectionRatio >= 0.4 ||
                    entry.intersectionRect.height >= windowHeight * 0.6;
                check();
            },
            { threshold: RUN_STEPS },
        );
        onView.observe(root);

        // The template's tab panels hide with visibility, which no observer reports: watch the panel,
        // and look again once its transition has ended (an ancestor only: the run rewrites its own classes)
        const panel = root.parentElement?.closest('.tabs-panel, [role="tabpanel"]');
        const onPanel = panel
            ? new MutationObserver(() => {
                  check();
                  clearTimeout(recheck);
                  recheck = setTimeout(check, 400);
              })
            : null;
        onPanel?.observe(panel, {
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden'],
        });

        // Armed, the run waits at its start for the observer; with reduced motion it shows its end
        const arm = () => {
            split();
            armed = true;
            plays = 0;
            root.classList.add('is-armed');
            reset();
            check();
        };
        const settle = () => {
            stop();
            armed = false;
            root.classList.remove('is-armed', 'is-running');
            for (const { el, approval } of steps) {
                el.classList.remove('is-active', 'is-done');
                approval?.classList.add('is-approved');
            }
            for (const el of results) el.classList.add('is-shown');
            if (typed) {
                setText(typed, text);
                setText(rest, '');
            }
            progress(1);
            root.classList.add('is-complete');
        };
        const follow = () => {
            if (reducedMotion) settle();
            else arm();
        };
        motionWatchers.add(follow);
        follow();

        return () => {
            stop();
            clearTimeout(recheck);
            armed = false;
            onView.disconnect();
            onPanel?.disconnect();
            motionWatchers.delete(follow);
        };
    }

    /* ------------------------------------------------------------------
       2. ROI calculator
       ------------------------------------------------------------------ */
    const ROI_SUMMARY =
        '{hours} [hour|hours] and {value} a year; payback in {payback} [week|weeks]';
    const ROI_SUMMARY_MS = 400;

    /** Wires one calculator; returns the function that stops it. */
    function roi(form) {
        const {
            roiWeeks,
            roiShare,
            roiCost,
            roiPaybackMax,
            roiCurrency = 'USD',
            roiLocale = 'en-US',
        } = form.dataset;
        const weeks = Number(roiWeeks) || 46;
        const share = Number(roiShare) || 0.6;
        const cost = Number(roiCost) || 18000;
        const paybackMax = Number(roiPaybackMax) || 104;
        const number = new Intl.NumberFormat(roiLocale, { maximumFractionDigits: 0 });
        const money = new Intl.NumberFormat(roiLocale, {
            style: 'currency',
            currency: roiCurrency,
            maximumFractionDigits: 0,
        });
        const decimal = new Intl.NumberFormat(roiLocale, { maximumFractionDigits: 1 });
        const percent = new Intl.NumberFormat(roiLocale, {
            style: 'percent',
            maximumFractionDigits: 0,
        });
        const format = {
            rate: (value) => money.format(value),
            share: (value) => percent.format(value / 100),
        };
        const input = (name) => form.elements.namedItem(name);
        const write = (selector, text) => {
            for (const el of form.querySelectorAll(selector)) el.textContent = text;
        };
        // The one sentence a screen reader hears: its template is the attribute's value
        const summary = form.querySelector('[data-roi-summary]');
        const template = summary?.dataset.roiSummary || ROI_SUMMARY;
        let speak = 0;

        const update = (event) => {
            const values = {};
            for (const name of ['people', 'hours', 'rate', 'share']) {
                const range = input(name);
                const value = Number(range?.value) || 0;
                values[name] = value;
                if (!range) continue;
                const min = Number(range.min) || 0;
                const max = Number(range.max) || 100;
                const text = format[name]?.(value) ?? number.format(value);
                const [one, many = one] = (range.dataset.roiUnit ?? '').split('|');
                range.style.setProperty(
                    '--value',
                    String(clamp01((value - min) / (max - min || 1))),
                );
                range.setAttribute(
                    'aria-valuetext',
                    one ? `${text} ${value === 1 ? one : many}` : text,
                );
                write(`[data-roi-value="${name}"]`, text);
            }
            // A share slider, when the form has one, replaces data-roi-share
            const weekly =
                values.people * values.hours * (input('share') ? values.share / 100 : share);
            const yearly = weekly * weeks;
            const payback =
                weekly * values.rate > 0 ? Math.max(1, cost / (weekly * values.rate)) : NaN;
            const out = {
                hours: number.format(Math.round(yearly)),
                value: money.format(Math.round(yearly * values.rate)),
                // Beyond two years the figure says nothing more: "104+"
                payback: Number.isNaN(payback)
                    ? '–'
                    : payback > paybackMax
                      ? `${number.format(paybackMax)}+`
                      : decimal.format(payback),
            };
            for (const [name, text] of Object.entries(out)) write(`[data-roi-out="${name}"]`, text);

            // Spoken once the visitor pauses, and never at init: the markup holds the first sentence
            if (!summary || !event) return;
            clearTimeout(speak);
            speak = setTimeout(() => {
                summary.textContent = template.replace(
                    /\{(hours|value|payback)\}(?: \[([^|\]]*)\|([^\]]*)\])?/g,
                    (_, name, one, many) =>
                        one === undefined
                            ? out[name]
                            : `${out[name]} ${out[name] === '1' ? one : many}`,
                );
            }, ROI_SUMMARY_MS);
        };
        // A reset puts the sliders back after the event: read them on the next task
        const onReset = () => setTimeout(() => update(new Event('input')));

        form.addEventListener('input', update);
        form.addEventListener('reset', onReset);
        update();

        return () => {
            clearTimeout(speak);
            form.removeEventListener('input', update);
            form.removeEventListener('reset', onReset);
        };
    }

    /* ------------------------------------------------------------------
       3. Off-screen pause
       ------------------------------------------------------------------ */
    const WATCHED = 'main > *, .custom-footer, .custom-vig';
    const watched = new WeakSet();
    const away = new WeakSet(); // watched boxes that are out of the viewport now
    const held = new WeakSet(); // animations this script paused
    let onWatched = null;

    // Endless CSS animations only: an entrance, a transition or a one-shot goes on to its end
    const endless = (animation) =>
        animation instanceof CSSAnimation &&
        animation.effect?.getComputedTiming().iterations === Infinity;

    // Out of view when the box around it is, or any watched box around that one
    const isAway = (el) => {
        for (let box = el.closest(WATCHED); box; box = box.parentElement?.closest(WATCHED))
            if (away.has(box)) return true;
        return false;
    };

    /** Pauses or plays every endless animation in a box, after where its element stands now. */
    function sync(box) {
        for (const animation of box.getAnimations({ subtree: true })) {
            if (!endless(animation)) continue;
            if (isAway(animation.effect.target)) {
                if (animation.playState !== 'running') continue;
                animation.pause();
                held.add(animation);
            } else if (held.delete(animation) && animation.playState === 'paused') {
                animation.play();
            }
        }
    }

    function watchSections(root) {
        // A margin of a fifth of the window: an animation is running again before it scrolls into view
        onWatched ??= new IntersectionObserver(
            (entries) => {
                for (const { target, isIntersecting } of entries) {
                    if (!watched.has(target)) continue;
                    if (isIntersecting) away.delete(target);
                    else away.add(target);
                    sync(target);
                }
            },
            { rootMargin: '20% 0px' },
        );
        for (const box of within(root, WATCHED)) {
            if (watched.has(box)) continue;
            watched.add(box);
            onWatched.observe(box);
        }
    }

    function unwatchSections(root) {
        for (const box of within(root, WATCHED)) {
            if (!watched.delete(box)) continue;
            onWatched.unobserve(box);
            away.delete(box);
            sync(box);
        }
    }

    /* ------------------------------------------------------------------
       Init and the hook for frameworks
       ------------------------------------------------------------------ */
    const FEATURES = [
        ['[data-agent-run]', agentRun],
        ['form[data-roi]', roi],
    ];
    const wired = new WeakMap(); // element → the function that stops its feature

    function init(root = document) {
        for (const [selector, feature] of FEATURES) {
            for (const el of within(root, selector)) {
                if (!wired.has(el)) wired.set(el, feature(el) ?? (() => {}));
            }
        }
        watchSections(root);
    }

    function destroy(root = document) {
        for (const [selector] of FEATURES) {
            for (const el of within(root, selector)) {
                wired.get(el)?.();
                wired.delete(el);
            }
        }
        unwatchSections(root);
    }

    window.FramoAiAgency1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
