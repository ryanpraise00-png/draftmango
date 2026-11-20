/* Draftmango home copy of Framo's demo-automation-1.js: the same animation with Draftmango's wording. The vendor file is unchanged. */
/**
 * demo-automation-1.js — SaaS Automation demo: the hero workflow that runs, and the agent run.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. It does nothing when its elements are absent. Styles: css/demos/demo-automation-1.css.
 *
 * For frameworks — window.FramoAutomation1 = { init(root), destroy(root) }
 *    init(root = document)     wires every [data-flow] found in root (root itself included). Safe
 *                              to call again: a canvas already wired is left alone.
 *    destroy(root = document)  stops them: observers disconnected, timers cleared, the finished
 *                              state put back. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * The run — [data-flow]
 *    The markup is the finished state of one run (every node Success, the low-risk branch
 *    taken); without this script, or with reduced motion, that is what shows.
 *    [data-flow-node="n"]   the nodes in run order (1 … 6). Node 4 is the path; 5 is the
 *                           approval branch (risk high), 6 the fulfilment branch.
 *    [data-flow-wire="n"]   the SVG wire INTO node n (.is-live sends the pulse, .is-done lights it)
 *    [data-flow-state]      a node's status pill: its text and --ok / --run / --wait modifier
 *    [data-flow-count]      "Runs today", ticks up after each run
 *    [data-flow-toast]      the run toast: [data-flow-run], [data-flow-time]
 *    Node classes: .is-in (the pulse is arriving: phones run a dot down the wire), .is-run,
 *    .is-wait, .is-ok, .is-skip.
 *    Starts when 30% of the canvas is visible, plays runs back to back (every third one is a
 *    risky order that waits for a manager's approval) and rests on a finished run after
 *    eight; scrolled out of view (or in a hidden tab) it stops, and plays again when it comes
 *    back.
 *
 * The agent run — [data-agent] (the AI Agents bento)
 *    The markup is the run paused at its approval (steps 1–3 done, 4 waiting, 5–6 queued);
 *    without this script, or with reduced motion, that is what shows.
 *    [data-agent-step="n"]  the steps (1 … 6); classes .is-run / .is-wait / .is-ok
 *    [data-agent-state]     a step's status pill · [data-agent-status] the run's own pill
 *    [data-agent-approval]  the approval card: [data-agent-approve], [data-agent-reject],
 *                           [data-agent-actions] (hidden once answered), [data-agent-done]
 *    Steps tick through; step 4 waits for the manager (the visitor's Approve answers at once,
 *    otherwise Maya approves after a beat; Reject ends the run). Loops while 30% of the bento
 *    is in view; stops off-screen and in a hidden tab.
 */
(() => {
    const WIRE = 620; // ms for a pulse to cross a wire (CSS reads --custom-wire-time)
    const STEP = 520; // ms a node shows Running
    const WAIT = 1500; // ms the approval waits
    const GAP = 1700; // ms between runs
    const MAX_RUNS = 8;
    const TIMES = { 1: 'Sent', 2: 'Read', 3: '3 sections', 5: 'Approved', 6: 'Saved' };

    const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fmt = new Intl.NumberFormat('en-GB');
    const flows = new Map();

    function wire(stage) {
        if (flows.has(stage)) return;
        const $ = (sel) => stage.querySelector(sel);
        const node = (n) => $(`[data-flow-node="${n}"]`);
        const wireTo = (n) => $(`[data-flow-wire="${n}"]`);
        const toast = () => $('[data-flow-toast]');
        const initial = stage.innerHTML;
        const read = (sel) => Number($(sel)?.textContent.replace(/\D/g, '')) || 0;

        const state = {
            timers: [],
            playing: false,
            inView: false,
            runs: 0,
            count: read('[data-flow-count]'),
            runNo: read('[data-flow-run]'),
        };
        stage.style.setProperty('--custom-wire-time', `${WIRE}ms`);

        const later = (fn, ms) =>
            new Promise((resolve) => {
                state.timers.push(
                    setTimeout(() => {
                        if (state.playing) fn?.();
                        resolve(state.playing);
                    }, ms),
                );
            });

        const setState = (n, kind, text) => {
            const pill = node(n)?.querySelector('[data-flow-state]');
            if (!pill) return;
            pill.className = `custom-status custom-node-state${kind ? ` custom-status--${kind}` : ''}`;
            pill.textContent = text;
        };

        const setNode = (n, cls) => {
            const el = node(n);
            if (!el) return;
            el.classList.remove('is-in', 'is-run', 'is-wait', 'is-ok', 'is-skip');
            if (cls) el.classList.add(cls);
        };

        const pulse = (n) => {
            const w = wireTo(n);
            const el = node(n);
            for (const target of [w, el])
                target?.classList.remove(target === w ? 'is-live' : 'is-in');
            void stage.offsetWidth;
            w?.classList.add('is-live');
            el?.classList.add('is-in');
        };

        const reset = () => {
            for (let n = 1; n <= 6; n++) {
                setNode(n, null);
                setState(n, null, n === 4 ? '' : 'Queued');
                wireTo(n)?.classList.remove('is-live', 'is-done');
            }
            toast()?.classList.add('is-off');
        };

        async function step(n) {
            if (n > 1) {
                pulse(n);
                if (!(await later(null, WIRE))) return false;
                wireTo(n)?.classList.add('is-done');
            }
            setNode(n, 'is-run');
            setState(n, 'run', 'Running');
            if (!(await later(null, STEP))) return false;
            setNode(n, 'is-ok');
            setState(n, 'ok', TIMES[n] ?? 'Done');
            return true;
        }

        async function run() {
            state.runs += 1;
            state.runNo += 1;
            const risky = state.runs % 3 === 2;
            reset();
            if (!(await later(null, 300))) return;
            for (const n of [1, 2, 3, 4]) if (!(await step(n))) return;

            const taken = risky ? 5 : 6;
            const other = risky ? 6 : 5;
            setNode(other, 'is-skip');
            setState(other, null, 'Skipped');
            pulse(taken);
            if (!(await later(null, WIRE))) return;
            wireTo(taken)?.classList.add('is-done');
            if (risky) {
                setNode(5, 'is-wait');
                setState(5, 'wait', 'Waiting · You');
                if (!(await later(null, WAIT))) return;
                setNode(5, 'is-ok');
                setState(5, 'ok', 'Approved');
            } else if (!(await step(6))) return;

            state.count += 1 + Math.floor(Math.random() * 3);
            const put = (sel, text) => {
                const el = $(sel);
                if (el) el.textContent = text;
            };
            put('[data-flow-count]', fmt.format(state.count));
            put('[data-flow-run]', `#${fmt.format(state.runNo)}`);
            put(
                '[data-flow-time]',
                risky ? '2 m 10 s' : `${Math.round(24 + Math.random() * 20)} s`,
            );
            toast()?.classList.remove('is-off');

            if (state.runs >= MAX_RUNS) {
                state.playing = false;
                return;
            }
            if (await later(null, GAP)) run();
        }

        const play = () => {
            if (state.playing || state.runs >= MAX_RUNS || reduce()) return;
            state.playing = true;
            run();
        };

        const stop = () => {
            state.playing = false;
            state.timers.forEach(clearTimeout);
            state.timers = [];
        };

        const io = new IntersectionObserver(
            ([entry]) => {
                state.inView = entry.isIntersecting;
                if (entry.isIntersecting) {
                    if (state.runs >= MAX_RUNS) state.runs = 0;
                    play();
                } else stop();
            },
            { threshold: 0.3 },
        );
        io.observe(stage);

        const onVisibility = () => {
            if (document.hidden) stop();
            else if (state.inView) play();
        };
        document.addEventListener('visibilitychange', onVisibility);

        flows.set(stage, () => {
            stop();
            io.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            stage.innerHTML = initial;
        });
    }

    // ---- The agent run ----
    const AGENT = { tick: 700, wait: 2600, rest: 3200 };
    const AGENT_DONE = {
        1: '0.4 s',
        2: '0.6 s',
        3: '3 sections',
        4: 'Approved',
        5: '1.1 s',
        6: '0.5 s',
    };

    function agent(bento) {
        if (flows.has(bento)) return;
        const $ = (sel) => bento.querySelector(sel);
        const initial = bento.innerHTML;
        const st = { timers: [], playing: false, inView: false, answer: null };

        const later = (ms) =>
            new Promise((resolve) => {
                st.timers.push(setTimeout(() => resolve(st.playing), ms));
            });

        const setStep = (n, cls, kind, text) => {
            const li = $(`[data-agent-step="${n}"]`);
            if (!li) return;
            li.classList.remove('is-run', 'is-wait', 'is-ok');
            if (cls) li.classList.add(cls);
            const pill = li.querySelector('[data-agent-state]');
            pill.className = `custom-status${kind ? ` custom-status--${kind}` : ''}`;
            pill.textContent = text;
        };

        const setRun = (kind, text) => {
            const pill = $('[data-agent-status]');
            if (!pill) return;
            pill.className = `custom-status custom-status--${kind}`;
            pill.textContent = text;
        };

        const card = (asked) => {
            $('[data-agent-actions]').hidden = !asked;
            $('[data-agent-done]').hidden = asked;
        };

        // The visitor answers the approval
        const onClick = (event) => {
            const yes = event.target.closest('[data-agent-approve]');
            const no = event.target.closest('[data-agent-reject]');
            if (!yes && !no) return;
            st.answer = yes ? 'yes' : 'no';
            if (!st.playing) {
                card(false);
                const done = $('[data-agent-done]');
                done.lastChild.textContent = yes
                    ? 'Published · your new page is live'
                    : 'Kept as a draft · nothing was published';
            }
        };
        bento.addEventListener('click', onClick);

        async function run() {
            st.answer = null;
            for (let n = 1; n <= 6; n++) setStep(n, null, null, 'Queued');
            card(true);
            setRun('run', 'Running');
            for (const n of [1, 2, 3]) {
                setStep(n, 'is-run', 'run', 'Running');
                if (!(await later(AGENT.tick))) return;
                setStep(n, 'is-ok', 'ok', AGENT_DONE[n]);
            }
            setStep(4, 'is-wait', 'wait', 'Waiting for you');
            setRun('wait', 'Waiting for your review');
            for (let waited = 0; waited < AGENT.wait && !st.answer; waited += 100) {
                if (!(await later(100))) return;
            }
            const done = $('[data-agent-done]');
            if (st.answer === 'no') {
                setStep(4, 'is-ok', null, 'Kept as draft');
                done.lastChild.textContent = 'Kept as a draft · nothing was published';
                card(false);
                setRun('fail', 'Not published');
            } else {
                setStep(4, 'is-ok', 'ok', AGENT_DONE[4]);
                done.lastChild.textContent =
                    st.answer === 'yes'
                        ? 'Published · your new page is live'
                        : 'Approved · your new page is live';
                card(false);
                for (const n of [5, 6]) {
                    setStep(n, 'is-run', 'run', 'Running');
                    if (!(await later(AGENT.tick))) return;
                    setStep(n, 'is-ok', 'ok', AGENT_DONE[n]);
                }
                setRun('ok', 'Done · saved as v12');
            }
            if (await later(AGENT.rest)) run();
        }

        const play = () => {
            if (st.playing || reduce()) return;
            st.playing = true;
            run();
        };

        const stop = () => {
            st.playing = false;
            st.timers.forEach(clearTimeout);
            st.timers = [];
        };

        const io = new IntersectionObserver(
            ([entry]) => {
                st.inView = entry.isIntersecting;
                if (entry.isIntersecting) play();
                else stop();
            },
            { threshold: 0.3 },
        );
        io.observe(bento);

        const onVisibility = () => {
            if (document.hidden) stop();
            else if (st.inView) play();
        };
        document.addEventListener('visibilitychange', onVisibility);

        flows.set(bento, () => {
            stop();
            io.disconnect();
            bento.removeEventListener('click', onClick);
            document.removeEventListener('visibilitychange', onVisibility);
            bento.innerHTML = initial;
        });
    }

    const scope = (root, sel) => [
        ...(root.matches?.(sel) ? [root] : []),
        ...root.querySelectorAll(sel),
    ];

    function init(root = document) {
        scope(root, '[data-flow]').forEach(wire);
        scope(root, '[data-agent]').forEach(agent);
    }

    function destroy(root = document) {
        for (const el of scope(root, '[data-flow], [data-agent]')) {
            flows.get(el)?.();
            flows.delete(el);
        }
    }

    window.FramoAutomation1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
