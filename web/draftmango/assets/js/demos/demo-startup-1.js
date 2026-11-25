/**
 * demo-startup-1.js — Startup demo: the hero's live feedback board.
 *
 * A classic script (the page loads it with `defer`; it also works over file://), no imports,
 * one global. Styles: css/demos/demo-startup-1.css.
 *
 * For frameworks — window.DraftmangoStartup1 = { init(root), destroy(root) }
 *    init(root = document)     wires every board found in root (root itself included). Safe to
 *                              call again: a board already wired is left alone.
 *    destroy(root = document)  stops it (timers, observer, listener) and puts the board back in
 *                              its final state. Call it before the markup is removed.
 *    The script still wires the whole document by itself on DOMContentLoaded.
 *
 * Board playback — .custom-board[data-board-play]. The markup shows the END state: the moving
 * card ([data-board-card]) sits in the last column with its final count. When armed, the script
 * moves that card to the first column and sets its .custom-vote to data-votes-from. Once in
 * view it plays: the votes tick up to data-votes and the card travels column to column (FLIP).
 * It plays once, pauses off-screen and resumes where it stopped. Under reduced motion (or if it
 * switches on midway) and without this script, the end state shows.
 */
(() => {
    'use strict';

    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function boardPlay(board) {
        const card = board.querySelector('[data-board-card]');
        const vote = card?.querySelector('.custom-vote[data-votes]');
        const lists = [...board.querySelectorAll('.custom-board-col .custom-board-list')];
        if (!card || !vote || lists.length < 2 || motion.matches) return null;

        const home = card.parentElement;
        const homeNext = card.nextElementSibling;
        const to = Number(vote.dataset.votes);
        const from = Number(vote.dataset.votesFrom ?? to);
        const counts = () =>
            board.querySelectorAll('.custom-board-col').forEach((col) => {
                const count = col.querySelector('.custom-board-count');
                const list = col.querySelector('.custom-board-list');
                if (count && list) count.textContent = list.children.length;
            });

        // FLIP: every card glides from where it was to where the move put it
        const moveTo = (list) => {
            const cards = [...board.querySelectorAll('.custom-board-card')];
            const before = new Map(cards.map((el) => [el, el.getBoundingClientRect()]));
            list.prepend(card);
            counts();
            cards.forEach((el) => {
                const a = before.get(el);
                const b = el.getBoundingClientRect();
                const dx = a.left - b.left;
                const dy = a.top - b.top;
                if (!dx && !dy) return;
                if (el === card) {
                    el.classList.add('is-moving');
                    el.animate(
                        [
                            { transform: `translate(${dx}px, ${dy}px)` },
                            {
                                transform: `translate(${dx / 2}px, ${dy / 2 - 14}px) rotate(2deg) scale(1.04)`,
                                offset: 0.45,
                            },
                            { transform: 'none' },
                        ],
                        { duration: 820, easing: 'cubic-bezier(.3, .7, .2, 1)' },
                    ).finished.then(
                        () => el.classList.remove('is-moving'),
                        () => el.classList.remove('is-moving'),
                    );
                } else {
                    el.animate(
                        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                        { duration: 620, easing: 'cubic-bezier(.3, .7, .2, 1)' },
                    );
                }
            });
        };

        const setVotes = (n) => {
            vote.textContent = n.toLocaleString('en-US');
        };

        // Arm: the start of the story
        lists[0].prepend(card);
        counts();
        setVotes(from);
        vote.classList.remove('custom-vote--voted');

        // One queue of [wait ms, step]
        const queue = [];
        const ticks = Math.max(0, to - from);
        for (let i = 1; i <= ticks; i++) {
            queue.push([
                i === 1 ? 1200 : Math.round(40 + 70 * (i / ticks) ** 2),
                () => {
                    setVotes(from + i);
                    vote.classList.add('custom-vote--voted');
                    vote.classList.remove('is-bump');
                    void vote.offsetWidth;
                    vote.classList.add('is-bump');
                },
            ]);
        }
        queue.push([700, () => moveTo(lists[1])]);
        lists.slice(2).forEach((list, i, rest) =>
            queue.push([
                1500,
                () => {
                    moveTo(list);
                    if (i === rest.length - 1) card.classList.add('is-shipped');
                },
            ]),
        );

        let step = 0;
        let timer = null;
        let inView = false;

        const next = () => {
            if (step >= queue.length) return finish(false);
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
            { threshold: 0.35 },
        );

        // The end state, as the markup has it
        const restore = () => {
            board.getAnimations({ subtree: true }).forEach((a) => a.cancel());
            home.insertBefore(card, homeNext?.parentElement === home ? homeNext : home.firstChild);
            counts();
            setVotes(to);
            vote.classList.add('custom-vote--voted');
            vote.classList.remove('is-bump');
            card.classList.remove('is-moving', 'is-shipped');
        };

        function finish(reset) {
            clearTimeout(timer);
            timer = null;
            observer.disconnect();
            motion.removeEventListener('change', onMotion);
            if (reset) restore();
        }

        function onMotion() {
            if (motion.matches) finish(true);
        }

        observer.observe(board);
        motion.addEventListener('change', onMotion);

        return () => finish(true);
    }

    /* ------------------------------------------------------------------
       Wiring
       ------------------------------------------------------------------ */
    const FEATURES = [['.custom-board[data-board-play]', boardPlay]];
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

    window.DraftmangoStartup1 = { init, destroy };

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', () => init());
    else init();
})();
