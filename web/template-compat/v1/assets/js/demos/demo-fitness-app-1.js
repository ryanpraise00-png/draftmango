/**
 * demo-fitness-app-1.js — Fitness App demo: the live run on the hero phone, the plan steps.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-fitness-app-1.css.
 *
 * For frameworks — window.FramoFitnessApp1 = { init(root), destroy(root) }
 *    init(root = document)     wires every feature found in root (root itself included). Safe to
 *                              call again: an element already wired is left alone.
 *    destroy(root = document)  stops them: frames and observers removed, the final values put
 *                              back. Call it before the markup is removed, then init() on the new
 *                              markup.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * 1. Run playback — [data-run] (the hero phone). The markup holds the finished run: the figures
 *    in [data-run-distance] (km), [data-run-time] (seconds; shown m:ss) and [data-run-heart]
 *    (bpm), the whole route and every split bar. Once the phone is in view the run plays from
 *    zero in data-run-duration ms (7000): the route draws (CSS, .is-running), the distance and
 *    the time count up, the heart rate drifts, the end dot follows the line and each split bar
 *    rises as its kilometre is done; then it stops on the finished run (.is-done). Off-screen
 *    it pauses (.is-paused) and resumes where it stopped. Under reduced motion, and without
 *    this script, the finished run shows at once.
 * 2. Plan steps — [data-plans]: the step ([data-plan-step="n"]) nearest the middle of the
 *    screen gets .is-active, and so does the phone screen with the same [data-plan-screen].
 *    The section gets .is-armed (the other steps dim on wide screens). Without this script
 *    screen 1 shows and every step reads at full strength.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = (seconds) =>
        `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

    /* ------------------------------------------------------------------
       1. Run playback
       ------------------------------------------------------------------ */
    function runPlay(phone) {
        const distance = phone.querySelector('[data-run-distance]');
        const time = phone.querySelector('[data-run-time]');
        const heart = phone.querySelector('[data-run-heart]');
        const line = phone.querySelector('.custom-route-line');
        const dot = phone.querySelector('.custom-route-end');
        const splits = [...phone.querySelectorAll('.custom-splits > li')];

        const km = Number(distance?.dataset.runDistance ?? 0);
        const seconds = Number(time?.dataset.runTime ?? 0);
        const bpm = Number(heart?.dataset.runHeart ?? 0);
        const duration = Number(phone.dataset.runDuration ?? 7000);
        const length = line?.getTotalLength?.() ?? 0;
        const end = dot ? { x: dot.getAttribute('cx'), y: dot.getAttribute('cy') } : null;

        let elapsed = 0;
        let last = 0;
        let frame = 0;
        let state = 'idle';

        const paint = (p) => {
            const run = km * p;
            if (distance) distance.textContent = run.toFixed(2);
            if (time) time.textContent = clock(seconds * p);
            if (heart)
                heart.textContent = String(
                    Math.round(p < 1 ? bpm - 22 * (1 - p) ** 3 + Math.sin(p * 40) * 2 : bpm),
                );
            splits.forEach((bar, i) => bar.classList.toggle('is-run', run >= Math.min(i + 1, km)));
            if (dot && length && p < 1) {
                const at = line.getPointAtLength(length * p);
                dot.setAttribute('cx', at.x.toFixed(2));
                dot.setAttribute('cy', at.y.toFixed(2));
            }
        };

        const finish = () => {
            cancelAnimationFrame(frame);
            state = 'done';
            if (distance) distance.textContent = km.toFixed(2);
            if (time) time.textContent = clock(seconds);
            if (heart) heart.textContent = String(bpm);
            if (dot && end) {
                dot.setAttribute('cx', end.x);
                dot.setAttribute('cy', end.y);
            }
            splits.forEach((bar) => bar.classList.add('is-run'));
            phone.classList.remove('is-running', 'is-paused');
            phone.classList.add('is-done');
        };

        const tick = (now) => {
            elapsed += now - last;
            last = now;
            const p = Math.min(elapsed / duration, 1);
            paint(p);
            if (p >= 1) finish();
            else frame = requestAnimationFrame(tick);
        };

        const play = () => {
            if (state === 'done' || state === 'running') return;
            state = 'running';
            phone.classList.remove('is-paused');
            phone.classList.add('is-running');
            last = performance.now();
            frame = requestAnimationFrame(tick);
        };

        const pause = () => {
            if (state !== 'running') return;
            state = 'paused';
            cancelAnimationFrame(frame);
            phone.classList.add('is-paused');
        };

        if (reduced() || !km) {
            finish();
            return { stop: finish };
        }

        phone.style.setProperty('--custom-run-time', `${duration}ms`);
        phone.classList.add('is-armed');
        paint(0);

        const observer = new IntersectionObserver(
            ([entry]) => (entry.isIntersecting ? play() : pause()),
            { threshold: 0.35 },
        );
        observer.observe(phone);

        return {
            stop() {
                observer.disconnect();
                finish();
                phone.classList.remove('is-armed', 'is-done');
                phone.style.removeProperty('--custom-run-time');
            },
        };
    }

    /* ------------------------------------------------------------------
       2. Plan steps
       ------------------------------------------------------------------ */
    function planSteps(section) {
        const steps = [...section.querySelectorAll('[data-plan-step]')];
        const screens = [...section.querySelectorAll('[data-plan-screen]')];
        if (!steps.length) return null;

        const show = (n) => {
            steps.forEach((step) =>
                step.classList.toggle('is-active', step.dataset.planStep === n),
            );
            screens.forEach((screen) =>
                screen.classList.toggle('is-active', screen.dataset.planScreen === n),
            );
        };

        section.classList.add('is-armed');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(
                    (entry) => entry.isIntersecting && show(entry.target.dataset.planStep),
                );
            },
            { rootMargin: '-45% 0px -45% 0px' },
        );
        steps.forEach((step) => observer.observe(step));

        return {
            stop() {
                observer.disconnect();
                section.classList.remove('is-armed');
                show('1');
            },
        };
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const wired = new WeakMap();

    function init(root = document) {
        within(root, '[data-run]').forEach((phone) => {
            if (!wired.has(phone)) wired.set(phone, runPlay(phone));
        });
        within(root, '[data-plans]').forEach((section) => {
            if (!wired.has(section)) wired.set(section, planSteps(section));
        });
    }

    function destroy(root = document) {
        within(root, '[data-run], [data-plans]').forEach((el) => {
            wired.get(el)?.stop();
            wired.delete(el);
        });
    }

    window.FramoFitnessApp1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
