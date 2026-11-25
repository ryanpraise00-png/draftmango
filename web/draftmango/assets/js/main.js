/*
 * Draftmango — main.js
 *
 * The template's script, joined into one file from the modules of the
 * Developer package. Each module starts with a comment that names it
 * (navbar.js, counters.js, forms.js…). The part that starts everything is at
 * the end of this file: search for "main.js — Draftmango's script". To turn a
 * feature off on the whole site, delete its line in startFeatures() there.
 */
(function (Alpine, collapse, intersect, Lenis) {
    'use strict';

    /**
     * directives.js — Two small additions to Alpine used across the template:
     * x-expand (read-more blocks that open to their height) and $focus (arrow keys
     * in tab lists and menus).
     *
     * main.js runs registerDirectives(Alpine) before Alpine starts.
     */

    function registerDirectives(Alpine) {
        // x-expand="open" on an .expandable: toggles .is-open and opens to the block's
        // real height, so the clamp animates at the same pace both ways
        Alpine.directive('expand', (el, { expression }, { evaluateLater, effect }) => {
            const isOpen = evaluateLater(expression);
            effect(() =>
                isOpen((open) => {
                    el.classList.toggle('is-open', Boolean(open));
                    el.style.maxHeight = open ? `${el.scrollHeight}px` : '';
                }),
            );
        });

        // $focus — moves keyboard focus among an element's own controls, for the arrow
        // keys of a tab list or a menu: $focus.next(), .prev(), .first(), .last();
        // .wrap() before next or prev makes them go round the ends.
        //   <div role="tablist" @keydown.right.prevent="$focus.wrap().next()" @keydown.home.prevent="$focus.first()">
        const FOCUSABLE =
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]';
        Alpine.magic('focus', (el) => {
            const controls = () => [...el.querySelectorAll(FOCUSABLE)];
            let round = false;
            const step = (by) => {
                const list = controls();
                const at = list.indexOf(document.activeElement);
                if (at < 0) return;
                const to = at + by;
                (round ? list.at(to % list.length) : list[to])?.focus();
            };
            return {
                wrap() {
                    round = true;
                    return this;
                },
                next() {
                    step(1);
                },
                prev() {
                    step(-1);
                },
                first() {
                    controls()[0]?.focus();
                },
                last() {
                    controls().at(-1)?.focus();
                },
            };
        });
    }

    /**
     * forms.js — Form components. formValidate checks any form on submit,
     * formWizard runs a form in steps, passwordField shows / hides a password and
     * scores its strength. The error and success styles come from forms.css.
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    /**
     * Shared validation core — progressive enhancement over the native Constraint
     * Validation API. Mixed into both `formValidate` (whole form at submit) and
     * `formWizard` (one step at a time), so error copy and the error/success
     * classes stay identical between them.
     */
    const validationCore = () => ({
        errors: {},
        touched: {},
        controls(form) {
            // form.elements also holds controls outside the form tied to it by form="id"
            const all = form.elements
                ? Array.from(form.elements)
                : form.querySelectorAll('input, select, textarea');
            return Array.from(all).filter(
                (c) => /^(INPUT|SELECT|TEXTAREA)$/.test(c.tagName) && c.name && !c.disabled,
            );
        },
        messageFor(el) {
            if (el.dataset.error) return el.dataset.error;
            const v = el.validity;
            if (v.valueMissing) {
                if (el.type === 'email') return 'Please enter your email address.';
                if (el.type === 'checkbox') return 'Please check this box to continue.';
                return 'This field is required.';
            }
            if (v.typeMismatch) {
                if (el.type === 'email') return 'Enter a valid email address.';
                if (el.type === 'url') return 'Enter a valid URL.';
                return 'Please enter a valid value.';
            }
            if (v.patternMismatch) return el.title || 'Please match the requested format.';
            if (v.tooShort) return `Please use at least ${el.minLength} characters.`;
            if (v.tooLong) return `Please use at most ${el.maxLength} characters.`;
            return el.validationMessage;
        },
        check(el) {
            if (!el.name || el.disabled) return true;
            this.touched[el.name] = true;
            const valid = el.checkValidity();
            if (valid) delete this.errors[el.name];
            else this.errors[el.name] = this.messageFor(el);
            this.errors = { ...this.errors };
            const skip = el.type === 'checkbox' || el.type === 'radio';
            if (!skip) {
                const base =
                    el.tagName === 'SELECT'
                        ? 'form-select'
                        : el.tagName === 'TEXTAREA'
                          ? 'form-textarea'
                          : 'form-input';
                // An empty optional field is not an achievement — a submit touches every
                // control, and a green ring on a blank box beside real errors misleads.
                const filled = el.value.trim() !== '';
                el.classList.toggle(`${base}-error`, !valid);
                el.classList.toggle(`${base}-success`, valid && filled && this.touched[el.name]);
            }
            el.setAttribute('aria-invalid', valid ? 'false' : 'true');
            return valid;
        },
        /** Clear every error, class and aria flag the two components set. */
        reset(form) {
            this.errors = {};
            this.touched = {};
            form.reset();
            // form.reset() does not fire a reset event, so components bound to a
            // field's value (passwordField's meter) would keep the stale value.
            form.dispatchEvent(new Event('reset'));
            this.controls(form).forEach((c) => {
                c.classList.remove(
                    'form-input-success',
                    'form-input-error',
                    'form-select-success',
                    'form-select-error',
                    'form-textarea-success',
                    'form-textarea-error',
                );
                c.removeAttribute('aria-invalid');
            });
        },
    });

    // Generic form validation — validates the whole form on submit
    const formValidate = () => ({
        ...validationCore(),
        sent: false,
        onSubmit(e) {
            e.preventDefault();
            const form = e.target;
            let allValid = true;
            this.controls(form).forEach((c) => {
                if (!this.check(c)) allValid = false;
            });
            if (!allValid) {
                this.controls(form)
                    .find((c) => this.errors[c.name])
                    ?.focus();
                return;
            }
            // form-valid: a page can act on a good submit (@form-valid="…")
            this.$dispatch('form-valid');
            // data-redirect: a demo form that moves on (Place order → Order complete)
            if (form.dataset.redirect) {
                window.location.assign(form.dataset.redirect);
                return;
            }
            this.sent = true;
            setTimeout(() => {
                this.sent = false;
                this.reset(form);
            }, 4000);
        },
    });

    /**
     * Multi-step form — same validation, one panel at a time.
     *
     *   <form x-data="formWizard()" novalidate @submit.prevent="onSubmit($event)">
     *     <div data-step> … </div>      one per step, in order
     *
     * Only the fields inside the current [data-step] are validated before `next()`
     * advances, so a visitor is never blocked by a field they have not reached.
     * `answers` mirrors every named control's current value — bind a summary panel
     * to it with `x-text="answers.budget"`. `labels` carries the human-readable
     * text for a choice (a radio's `data-label`, or a select option's text), which
     * is what a summary usually wants to print.
     *
     * Enter in a field moves to the next step (after validating the current one);
     * only the last step submits. A textarea keeps Enter as a new line.
     *
     * After a valid submit `sent` stays true — the confirmation is not cleared on a
     * timer. It clears when the visitor goes back, or on `restart()` (wire it to a
     * "Send another" button). `data-reset-after="5000"` on the form opts into an
     * automatic restart after that many milliseconds.
     */
    const formWizard = () => ({
        ...validationCore(),
        step: 0,
        total: 1,
        sent: false,
        answers: {},
        labels: {},
        init() {
            // Panels are read from the DOM on demand rather than cached — Alpine
            // proxies anything stored on the component, and wrapping element
            // references breaks identity checks against the live nodes.
            this.total = this.panels().length || 1;
            this.sync();
        },
        // $root, not $el: inside a method reached from a child's @click, $el is
        // that child. $root is always the element carrying x-data.
        panels() {
            return this.$root.querySelectorAll('[data-step]');
        },
        /** Percentage for a `progress` bar, counting the current step as reached. */
        get progress() {
            return Math.round(((this.step + 1) / this.total) * 100);
        },
        /** True once every step has been left behind — the review step is last. */
        get isLast() {
            return this.step === this.total - 1;
        },
        /** Read every named control into `answers` / `labels`. */
        sync() {
            const next = {};
            const text = {};
            this.controls(this.$root).forEach((c) => {
                if (c.type === 'checkbox') {
                    if (c.checked) next[c.name] = c.value === 'on' ? true : c.value;
                    else if (!(c.name in next)) next[c.name] = false;
                    if (c.checked) text[c.name] = c.dataset.label || c.value;
                } else if (c.type === 'radio') {
                    if (c.checked) {
                        next[c.name] = c.value;
                        text[c.name] = c.dataset.label || c.value;
                    }
                } else {
                    next[c.name] = c.value;
                    // An unchosen select still has its placeholder option selected —
                    // its text is a prompt, not an answer, so the label stays empty.
                    text[c.name] = !c.value
                        ? ''
                        : c.tagName === 'SELECT'
                          ? (c.selectedOptions[0]?.dataset.label ??
                            c.selectedOptions[0]?.text ??
                            c.value)
                          : c.value;
                }
            });
            this.answers = next;
            this.labels = text;
        },
        /** Validate + record a single control as the visitor moves through. */
        track(el) {
            this.check(el);
            this.sync();
        },
        /** Controls belonging to one step's panel. */
        stepControls(index) {
            const panel = this.panels()[index];
            return panel ? this.controls(panel) : [];
        },
        valid(index) {
            let ok = true;
            this.stepControls(index).forEach((c) => {
                if (!this.check(c)) ok = false;
            });
            if (!ok)
                this.stepControls(index)
                    .find((c) => this.errors[c.name])
                    ?.focus();
            return ok;
        },
        next() {
            if (!this.valid(this.step)) return;
            this.step = Math.min(this.step + 1, this.total - 1);
            this.sync();
        },
        back() {
            this.sent = false;
            this.step = Math.max(this.step - 1, 0);
        },
        /** Jump straight to a step — only backwards, so steps cannot be skipped. */
        goTo(index) {
            if (index >= this.step) return;
            this.sent = false;
            this.step = index;
        },
        /** Clear the form and return to the first step. */
        restart() {
            clearTimeout(this._resetTimer);
            this.sent = false;
            this.step = 0;
            this.reset(this.$root.closest('form') ?? this.$root.querySelector('form'));
            this.sync();
        },
        onSubmit(e) {
            e.preventDefault();
            // Enter in a field submits the form natively, whichever step is showing.
            // Before the last step that means "continue": advance, and carry focus
            // into the new panel, since the field that had it is now hidden — to its
            // first field, or to the submit button on a review step that has none.
            if (!this.isLast) {
                const from = this.step;
                this.next();
                if (this.step !== from) {
                    this.$nextTick(() =>
                        (
                            this.stepControls(this.step)[0] ??
                            e.target.querySelector('[type="submit"]')
                        )?.focus(),
                    );
                }
                return;
            }
            if (!this.valid(this.step)) return;
            // form-valid, as formValidate() fires it: a page sends the form from here (@form-valid="…")
            this.$dispatch('form-valid');
            this.sent = true;
            const resetAfter = parseInt(this.$root.dataset.resetAfter, 10);
            if (resetAfter > 0) this._resetTimer = setTimeout(() => this.restart(), resetAfter);
        },
        destroy() {
            clearTimeout(this._resetTimer);
        },
    });

    /**
     * Password field — reveal toggle plus a strength score for a meter.
     *
     *   <div x-data="passwordField()">
     *     <input :type="show ? 'text' : 'password'" x-model="value">
     *     <button type="button" class="form-password-toggle" @click="show = !show">
     *     <div class="progress-steps"><span class="progress-step" :class="{ 'is-complete': score >= 1 }">…
     *
     * `rules` is one boolean per requirement, so a checklist can tick itself off.
     */
    const passwordField = () => ({
        show: false,
        value: '',
        init() {
            // Clear with the form it sits in — formValidate() fires this after a send.
            this.$root.closest('form')?.addEventListener('reset', () => {
                this.value = '';
                this.show = false;
            });
        },
        get rules() {
            const v = this.value;
            return {
                length: v.length >= 10,
                mixed: /[a-z]/.test(v) && /[A-Z]/.test(v),
                number: /\d/.test(v),
                symbol: /[^A-Za-z0-9]/.test(v),
            };
        },
        get score() {
            return Object.values(this.rules).filter(Boolean).length;
        },
        get label() {
            return this.value ? ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][this.score] : '';
        },
    });

    /**
     * list-filter.js — listFilter: a search box and category chips over any list
     * (FAQ, team, glossary).
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    /**
     * Live list filter — a search box and one category facet over any list.
     *
     *   <div x-data="listFilter()">
     *     <input x-model="query" type="search">
     *     <button @click="setTag('design')" :class="{ 'is-active': tag === 'design' }">
     *     <section data-filter-group="a">                       optional grouping
     *       <article data-filter-item data-filter-tags="design brand">
     *     <p x-show="count === 0" x-cloak>Nothing matches.</p>
     *
     * Matching is case- and accent-insensitive; every word typed must appear in the
     * item's `data-filter-text` (or its text content). Non-matching items get the
     * `hidden` attribute; a `[data-filter-group]` hides when none of its items are
     * left, and its name is dropped from `visibleGroups` — which is what an A–Z bar
     * binds its disabled letters to.
     *
     * The second argument swaps the item marker, so a page-level filter can sit
     * around a page that also *demonstrates* this component:
     * `listFilter('all', '[data-filter-block]')` leaves the demo's own
     * `[data-filter-item]` children alone.
     */
    const listFilter = (initialTag = 'all', itemSelector = '[data-filter-item]') => ({
        query: '',
        tag: initialTag,
        count: 0,
        total: 0,
        visibleGroups: [],
        selector: itemSelector,
        init() {
            this.total = this.items().length;
            this.$watch('query', () => this.apply());
            this.$watch('tag', () => this.apply());
            this.apply();
        },
        items() {
            return [...this.$root.querySelectorAll(this.selector)];
        },
        normalize(s) {
            return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        },
        matches(el) {
            const tags = (el.dataset.filterTags || '').split(/\s+/);
            if (this.tag !== 'all' && !tags.includes(this.tag)) return false;
            const words = this.normalize(this.query).split(/\s+/).filter(Boolean);
            if (!words.length) return true;
            const text = this.normalize(el.dataset.filterText || el.textContent);
            return words.every((w) => text.includes(w));
        },
        apply() {
            let count = 0;
            this.items().forEach((el) => {
                const ok = this.matches(el);
                el.hidden = !ok;
                if (ok) count++;
            });
            const groups = [];
            this.$root.querySelectorAll('[data-filter-group]').forEach((g) => {
                const any = [...g.querySelectorAll(this.selector)].some((el) => !el.hidden);
                g.hidden = !any;
                if (any) groups.push(g.dataset.filterGroup);
            });
            this.count = count;
            this.visibleGroups = groups;
        },
        /** How many items carry a tag, ignoring the search — for chip counts. */
        countFor(tag) {
            return tag === 'all'
                ? this.total
                : this.items().filter((el) =>
                      (el.dataset.filterTags || '').split(/\s+/).includes(tag),
                  ).length;
        },
        setTag(tag) {
            this.tag = this.tag === tag ? 'all' : tag;
        },
        /**
         * Tab-style pick: set the facet and, if the list has already scrolled off
         * the top, bring its start back into view — filtering from deep inside a
         * long page otherwise leaves the reader below everything that is left.
         */
        pick(tag) {
            this.tag = tag;
            // Land on the first item the facet leaves standing, measuring the
            // clearance from the bar itself rather than from a CSS scroll-margin:
            // a margin that is even a pixel taller than the bar stops one pixel
            // short of the pinning edge, and the bar drops out of its stuck state
            // exactly when the reader is looking at it.
            this.$nextTick(() => {
                const target = this.$root.querySelector(`${this.selector}:not([hidden])`);
                if (!target) return;
                const bar = this.$root.querySelector('.page-nav, .sticky-bar, [data-sticky-stuck]');
                // The bar pins at its own sticky top — 0 when the header scrolls
                // away, the header height when it sits beneath it.
                const pin = bar ? parseFloat(getComputedStyle(bar).top) || 0 : 0;
                const clearance = bar
                    ? pin + bar.getBoundingClientRect().height
                    : parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
                const y = window.scrollY + target.getBoundingClientRect().top - clearance;
                if (window.__lenis) window.__lenis.scrollTo(y);
                else window.scrollTo({ top: y, behavior: 'smooth' });
            });
        },
        clear() {
            this.query = '';
            this.tag = 'all';
        },
    });

    /**
     * tablist.js — tablist: tabs with the full keyboard pattern.
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    /**
     * Tab list — tabs with the full keyboard pattern: one tab open at a time,
     * Left / Right / Home / End move between them, only the open tab is in the
     * Tab order. Tabs and panels pair up by their order in the markup, so adding
     * or removing a pair needs no other change.
     *
     *   <div x-data="tablist()">
     *     <div role="tablist" aria-label="Clients" x-bind="list">
     *       <button type="button" role="tab" id="t-1" aria-controls="p-1" aria-selected="true" class="… is-active" x-bind="tab">…</button>
     *     </div>
     *     <div role="tabpanel" id="p-1" aria-labelledby="t-1" class="… is-active" x-bind="panel">…</div>
     *   </div>
     *
     * `tablist(2)` opens on the third tab. The open tab and its panel carry
     * .is-active (write it in the markup too, for the first paint); the CSS of
     * the element decides what that looks like. Drives .testimonial-picker.
     */
    const tablist = (start = 0) => ({
        active: start,
        // Its own tabs or panels, not those of a tab list nested in a panel
        items(role) {
            return [...this.$root.querySelectorAll(`[role="${role}"]`)].filter(
                (el) => el.closest('[x-data]') === this.$root,
            );
        },
        isActive(role) {
            return this.items(role).indexOf(this.$el) === this.active;
        },
        select(index, focus = false) {
            const tabs = this.items('tab');
            this.active = (index + tabs.length) % tabs.length;
            if (focus) tabs[this.active].focus();
        },
        list: {
            ['@keydown.right.prevent']() {
                this.select(this.active + 1, true);
            },
            ['@keydown.left.prevent']() {
                this.select(this.active - 1, true);
            },
            ['@keydown.home.prevent']() {
                this.select(0, true);
            },
            ['@keydown.end.prevent']() {
                this.select(-1, true);
            },
        },
        tab: {
            ['@click']() {
                this.select(this.items('tab').indexOf(this.$el));
            },
            [':class']() {
                return { 'is-active': this.isActive('tab') };
            },
            [':aria-selected']() {
                return this.isActive('tab') ? 'true' : 'false';
            },
            [':tabindex']() {
                return this.isActive('tab') ? '0' : '-1';
            },
        },
        panel: {
            [':class']() {
                return { 'is-active': this.isActive('tabpanel') };
            },
        },
    });

    /**
     * tooltips.js — tooltip (opens on hover or focus) and popover (opens on click).
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    // Tooltip / popover (rich, interactive) — used by elements-tooltips.html
    // Open/close lives on the wrapper (x-bind="root") so the panel stays open while
    // the pointer travels the hover-bridge or keyboard focus moves into the panel.
    const tooltip = () => ({
        open: false,
        root: {
            ['@mouseenter']() {
                this.open = true;
            },
            ['@mouseleave']() {
                this.open = false;
            },
            ['@focusin']() {
                this.open = true;
            },
            ['@focusout']($event) {
                if (!this.$el.contains($event.relatedTarget)) this.open = false;
            },
        },
        trigger: {
            [':aria-expanded']() {
                return this.open ? 'true' : 'false';
            },
        },
        panel: {
            ['x-show']() {
                return this.open;
            },
        },
    });

    const popover = () => ({
        open: false,
        root: {},
        trigger: {
            ['@click']() {
                this.open = !this.open;
            },
            [':aria-expanded']() {
                return this.open ? 'true' : 'false';
            },
        },
        panel: {
            ['x-show']() {
                return this.open;
            },
            ['@click.outside']() {
                this.open = false;
            },
            ['@keydown.escape.window']() {
                this.open = false;
            },
        },
    });

    /**
     * countdown.js — Days, hours, minutes and seconds to a date:
     * x-data="countdown('2027-01-01T00:00:00')".
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    const countdown = (targetDate) => ({
        days: '00',
        hours: '00',
        minutes: '00',
        seconds: '00',
        init() {
            const update = () => {
                const diff = new Date(targetDate) - Date.now();
                if (!isFinite(diff) || diff <= 0) {
                    this.days = this.hours = this.minutes = this.seconds = '00';
                    clearInterval(this._timer);
                    return;
                }
                this.days = String(Math.floor(diff / 86400000)).padStart(2, '0');
                this.hours = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
                this.minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
                this.seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            };
            update();
            this._timer = setInterval(update, 1000);
        },
        destroy() {
            clearInterval(this._timer);
        },
    });

    /**
     * clock.js — Live local time for any IANA time zone
     *
     * Fills every [data-clock] element with the current time in its zone and keeps
     * it running. The text inside is the placeholder shown until the script runs
     * (and kept when the zone is unknown).
     *
     *   <time data-clock="Europe/Lisbon">--:--</time>          14:05
     *   <time data-clock="America/New_York"
     *         data-clock-format="12h">--:--</time>             9:05 AM
     *   <time data-clock="Asia/Tokyo" data-clock-seconds>      22:05:31
     *
     *   data-clock="<IANA zone>"     e.g. "Europe/Lisbon"; empty = the visitor's own zone
     *   data-clock-format="24h|12h"  24h (default) or 12h with AM / PM
     *   data-clock-seconds           also show seconds, ticking every second
     *
     * A <time> element also gets a machine-readable datetime ("14:05").
     * One timer for every clock on the page — and for the openingHours() Alpine
     * component in main.js, which subscribes through onClockTick(). The timer is
     * aligned to the minute (to the second while something shows seconds), runs
     * only while something listens, and catches up when a background tab returns.
     */

    const formatters = new Map();

    /** A cached Intl formatter, or null for a zone the browser doesn't know. */
    function formatter(timeZone, format = '24h', seconds = false) {
        const key = `${timeZone}|${format}|${seconds}`;
        if (!formatters.has(key)) {
            const options =
                format === '12h'
                    ? { hour: 'numeric', minute: '2-digit', hour12: true }
                    : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
            if (seconds) options.second = '2-digit';
            try {
                formatters.set(
                    key,
                    new Intl.DateTimeFormat(format === '12h' ? 'en-US' : 'en-GB', {
                        ...options,
                        timeZone: timeZone || undefined,
                    }),
                );
            } catch {
                formatters.set(key, null);
            }
        }
        return formatters.get(key);
    }

    /** "14:05", "9:05 AM", "14:05:31" — or '' for an unknown zone. */
    function formatClock(date, timeZone, { format = '24h', seconds = false } = {}) {
        return formatter(timeZone, format, seconds)?.format(date) ?? '';
    }

    /** { weekday: 'Mon', hour: 14, minute: 5 } in that zone, or null for an unknown zone. */
    function clockParts(date, timeZone) {
        const key = `${timeZone}|parts`;
        if (!formatters.has(key)) {
            try {
                formatters.set(
                    key,
                    new Intl.DateTimeFormat('en-US', {
                        timeZone: timeZone || undefined,
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hourCycle: 'h23',
                    }),
                );
            } catch {
                formatters.set(key, null);
            }
        }
        const parts = formatters.get(key)?.formatToParts(date);
        if (!parts) return null;
        const value = (type) => parts.find((p) => p.type === type)?.value;
        return { weekday: value('weekday'), hour: +value('hour'), minute: +value('minute') };
    }

    /* ---- One shared ticker ------------------------------------------------ */

    const listeners = new Set();
    let timer = 0;
    let watching = false;

    function run() {
        const now = new Date();
        for (const listener of listeners) listener.fn(now);
        schedule();
    }

    function schedule() {
        clearTimeout(timer);
        if (!listeners.size) return;
        const step = [...listeners].some((l) => l.seconds) ? 1000 : 60_000;
        timer = setTimeout(run, step - (Date.now() % step) + 15);
    }

    /**
     * Calls fn(now) at every new minute (every second with { seconds: true }).
     * Returns a function that unsubscribes.
     */
    function onClockTick(fn, { seconds = false } = {}) {
        const listener = { fn, seconds };
        listeners.add(listener);
        if (!watching) {
            watching = true;
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && listeners.size) run();
            });
        }
        schedule();
        return () => {
            listeners.delete(listener);
            schedule();
        };
    }

    /* ---- [data-clock] elements -------------------------------------------- */

    const clocks = new Set();
    let unsubscribe = null;
    let fine = false;

    function paint(el, now) {
        const timeZone = el.dataset.clock;
        const text = formatClock(now, timeZone, {
            format: el.dataset.clockFormat,
            seconds: el.hasAttribute('data-clock-seconds'),
        });
        if (!text) return;
        if (el.textContent !== text) el.textContent = text;
        if (el instanceof HTMLTimeElement) el.dateTime = formatClock(now, timeZone);
    }

    /** Picks up every [data-clock] inside root; safe to call again for added markup. */
    function initClocks(root = document) {
        const found = [...root.querySelectorAll('[data-clock]')].filter((el) => !clocks.has(el));
        if (!found.length) return;

        const now = new Date();
        for (const el of found) {
            clocks.add(el);
            paint(el, now);
        }

        // Resubscribe only when the first seconds clock turns up
        const seconds = fine || found.some((el) => el.hasAttribute('data-clock-seconds'));
        if (unsubscribe && seconds === fine) return;
        unsubscribe?.();
        fine = seconds;
        unsubscribe = onClockTick(
            (time) => {
                for (const el of clocks) paint(el, time);
            },
            { seconds },
        );
    }

    /**
     * opening-hours.js — openingHours: "Open now · until 18:00", in the business's
     * own time zone.
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    /**
     * Opening hours — open or closed right now, and the local time, in the
     * business's own timezone.
     *
     *   <div x-data="openingHours('America/New_York', ['', '09:00-18:00', … ])">
     *     <span class="status-pill" :class="!open && 'status-pill--off'" x-text="label"></span>
     *     <time x-text="time">--:--</time>
     *     <div :class="isToday(1, 5) && 'font-semibold'">Mon – Fri …</div>
     *
     * `week` runs Sunday → Saturday; an empty string is a closed day ("9:00-18:00"
     * and "09:00-18:00" both work). Options: { format: '24h' | '12h', seconds: true }.
     * `time` reads "14:05" (or "2:05 PM"); `seconds` reads "07" and, with the
     * seconds option, ticks every second. All instances share clock.js's timer.
     * For a time with no Alpine around it, use <time data-clock="…"> (clock.js).
     */
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const WEEKDAY_NAMES = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
    ];
    const hoursLabel = (t, format) => {
        if (format !== '12h') return t;
        const [h, m = '00'] = t.split(':');
        return `${+h % 12 || 12}:${m} ${+h < 12 ? 'AM' : 'PM'}`;
    };
    const openingHours = (
        timeZone = 'UTC',
        week = [],
        { format = '24h', seconds = false } = {},
    ) => ({
        day: -1,
        open: false,
        label: '',
        now: new Date(),
        get time() {
            return formatClock(this.now, timeZone, { format });
        },
        get seconds() {
            return formatClock(this.now, timeZone, { seconds: true }).slice(-2);
        },
        init() {
            this.tick();
            this.stop = onClockTick(
                (now) => {
                    this.now = now;
                    this.tick();
                },
                { seconds },
            );
        },
        destroy() {
            this.stop?.();
        },
        tick() {
            const p = clockParts(this.now, timeZone);
            if (!p) return;
            const mins = (t) => {
                const [h, m = 0] = t.split(':');
                return h * 60 + +m;
            };
            const now = p.hour * 60 + p.minute;
            this.day = WEEKDAYS.indexOf(p.weekday);
            const [from, to] = (week[this.day] || '').split('-');
            this.open = !!from && now >= mins(from) && now < mins(to);
            if (this.open) {
                this.label = `Open now · until ${hoursLabel(to, format)}`;
                return;
            }
            if (from && now < mins(from)) {
                this.label = `Closed · opens at ${hoursLabel(from, format)}`;
                return;
            }
            for (let i = 1; i <= 7; i++) {
                const d = (this.day + i) % 7;
                if (!week[d]) continue;
                this.label = `Closed · opens ${i === 1 ? 'tomorrow' : WEEKDAY_NAMES[d]} ${hoursLabel(week[d].split('-')[0], format)}`;
                return;
            }
            this.label = 'Closed';
        },
        isToday(from, to = from) {
            return this.day >= from && this.day <= to;
        },
    });

    /**
     * audio-player.js — audioPlayer: the podcast player around a native <audio>.
     *
     * main.js registers each export under its own name: Alpine.data('name', name).
     */

    // Podcast player — wraps a native <audio>. With no src it runs in demo mode on a
    // timer, so the layout can be tried before a real episode file is added.
    const audioPlayer = (chapters = []) => ({
        playing: false,
        current: 0,
        duration: 0,
        rate: 1,
        demo: false,
        chapters,
        bars: Array.from(
            { length: 72 },
            (_, i) =>
                22 +
                Math.round(Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)) * 70 + (i % 5) * 1.6),
        ),
        get progress() {
            return this.duration ? this.current / this.duration : 0;
        },
        get chapterIndex() {
            let index = 0;
            this.chapters.forEach((start, i) => {
                if (this.current >= start) index = i;
            });
            return index;
        },
        init() {
            const a = this.$refs.audio;
            this.duration = Number(this.$el.dataset.duration) || 0;
            this.demo = !a.getAttribute('src') && !a.querySelector('source');
            if (this.demo) return;
            a.addEventListener('loadedmetadata', () => {
                this.duration = a.duration || this.duration;
            });
            a.addEventListener('timeupdate', () => {
                this.current = a.currentTime;
            });
            a.addEventListener('play', () => {
                this.playing = true;
            });
            a.addEventListener('pause', () => {
                this.playing = false;
            });
        },
        toggle() {
            if (!this.demo) {
                const a = this.$refs.audio;
                a.paused ? a.play().catch(() => {}) : a.pause();
                return;
            }
            this.playing = !this.playing;
            clearInterval(this._timer);
            if (!this.playing) return;
            this._timer = setInterval(() => {
                this.current = Math.min(this.duration, this.current + 0.25 * this.rate);
                if (this.current >= this.duration) {
                    this.playing = false;
                    clearInterval(this._timer);
                }
            }, 250);
        },
        seekTo(t) {
            this.current = Math.min(Math.max(0, t), this.duration);
            if (!this.demo) this.$refs.audio.currentTime = this.current;
        },
        skip(s) {
            this.seekTo(this.current + s);
        },
        seek(e) {
            const r = e.currentTarget.getBoundingClientRect();
            this.seekTo(((e.clientX - r.left) / r.width) * this.duration);
        },
        jump(t) {
            this.seekTo(t);
            if (!this.playing) this.toggle();
        },
        cycleRate() {
            const rates = [1, 1.25, 1.5, 2, 0.75];
            this.rate = rates[(rates.indexOf(this.rate) + 1) % rates.length];
            if (!this.demo) this.$refs.audio.playbackRate = this.rate;
        },
        fmt(t) {
            t = Math.max(0, Math.floor(t || 0));
            const h = Math.floor(t / 3600),
                m = Math.floor((t % 3600) / 60),
                s = String(t % 60).padStart(2, '0');
            return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
        },
        destroy() {
            clearInterval(this._timer);
        },
    });

    /**
     * preloader.js — full-screen page preloader
     *
     * Finds `[data-preloader]` (a `.preloader` overlay that's visible from
     * first paint via CSS) and dismisses it once the page has loaded,
     * playing whatever exit transition the overlay's modifier class defines
     * (`.preloader--fade` / `--slide` / `--split`).
     *
     * Markup:
     *   <div class="preloader preloader--fade" data-preloader>
     *     <div class="preloader__inner"> …loader… </div>
     *   </div>
     *
     * Config (data-attributes on the overlay):
     *   data-preloader-min="600"     keep it up at least N ms (avoid a flash)
     *   data-preloader-timeout="8000" failsafe — never trap the user
     *
     * Live progress (optional):
     *   an element with [data-preloader-percent] gets its text updated 0→100%
     *   an element with [data-preloader-fill] gets its width updated 0→100%
     *
     * Replay (optional, for demos):
     *   any [data-preloader-replay] button re-shows the overlay briefly.
     *
     * Portable: plain DOM + window 'load'. In the future Next.js build the
     * same body runs from a client component's effect.
     */
    function initPreloader() {
        const el = document.querySelector('[data-preloader]');
        if (!el) return;

        const root = document.documentElement;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const minDuration = parseInt(el.dataset.preloaderMin || '0', 10);
        const failsafe = parseInt(el.dataset.preloaderTimeout || '8000', 10);

        const percentEl = el.querySelector('[data-preloader-percent]');
        const fillEl = el.querySelector('[data-preloader-fill]');

        const run = () => {
            el.removeAttribute('hidden');
            el.classList.remove('is-hidden');
            root.classList.add('preloader-active');

            const start = performance.now();
            let progress = 0;
            let raf = 0;
            let done = false;

            if (percentEl || fillEl) {
                const tick = () => {
                    // Ease toward 90% while loading; the real finish snaps to 100.
                    progress = Math.min(progress + (90 - progress) * 0.05 + 0.5, 99);
                    if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;
                    if (fillEl) fillEl.style.width = `${progress}%`;
                    raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
            }

            const hide = () => {
                if (done) return;
                done = true;
                if (raf) cancelAnimationFrame(raf);
                if (percentEl) percentEl.textContent = '100%';
                if (fillEl) fillEl.style.width = '100%';

                const wait = Math.max(0, minDuration - (performance.now() - start));
                setTimeout(() => {
                    el.classList.add('is-hidden');
                    root.classList.remove('preloader-active');

                    if (reduce) {
                        el.setAttribute('hidden', '');
                        return;
                    }
                    let cleaned = false;
                    const finish = () => {
                        if (cleaned) return;
                        cleaned = true;
                        el.setAttribute('hidden', '');
                    };
                    el.addEventListener('transitionend', finish, { once: true });
                    setTimeout(finish, 1200); // fallback if transitionend never fires
                }, wait);
            };

            if (document.readyState === 'complete') hide();
            else window.addEventListener('load', hide, { once: true });
            setTimeout(hide, failsafe);
        };

        run();

        // Demo replay buttons — re-show the overlay for a short beat.
        document.querySelectorAll('[data-preloader-replay]').forEach((btn) => {
            btn.addEventListener('click', () => {
                el.setAttribute('hidden', '');
                el.classList.remove('is-hidden');
                // next frame so the browser registers the reset before animating
                requestAnimationFrame(() => {
                    el.removeAttribute('hidden');
                    root.classList.add('preloader-active');
                    const delay = parseInt(btn.dataset.preloaderReplay || '1400', 10);
                    setTimeout(() => {
                        el.classList.add('is-hidden');
                        root.classList.remove('preloader-active');
                        el.addEventListener('transitionend', () => el.setAttribute('hidden', ''), {
                            once: true,
                        });
                    }, delay);
                });
            });
        });
    }

    /**
     * font-host.js — Where a Google Fonts stylesheet is linked from.
     *
     * The online preview serves every font from its own folder, so a visit sends
     * nothing to Google (scripts/release/self-host.mjs). Its pages name that folder:
     *   <meta name="draftmango-font-files" content="assets/fonts/">
     * Without the tag (dev, the client build) a URL is linked as written.
     */

    const GOOGLE = 'https://fonts.googleapis.com/css2?';

    /** A family's file name: "DM Sans" → "dm-sans". */
    const slug = (family) =>
        family
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');

    /** FNV-1a, 32 bits, as 8 hex digits: a URL's short, stable name. */
    function hash(text) {
        let h = 0x811c9dc5;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
    }

    /** The local copy of a Google Fonts css2 URL: its families and a hash of the whole URL
        ("inter_jetbrains-mono-1a2b3c4d.css"), so each URL keeps exactly the faces Google
        serves for it; null for any other URL. */
    function localFontFile(url) {
        if (typeof url !== 'string' || !url.startsWith(GOOGLE)) return null;
        const families = new URLSearchParams(url.slice(GOOGLE.length)).getAll('family');
        const name = [...new Set(families.map((family) => slug(family.split(':')[0])))]
            .filter(Boolean)
            .join('_');
        return name ? `${name}-${hash(url)}.css` : null;
    }

    /** The href to link for a font stylesheet URL: its local copy when the page has one. */
    function fontHref(url, doc = globalThis.document) {
        const base = doc?.querySelector?.('meta[name="draftmango-font-files"]')?.getAttribute('content');
        const file = base == null ? null : localFontFile(url);
        return file ? base + file : url;
    }

    /**
     * font-loader.js — Load accent fonts only on pages that actually use them.
     *
     * Body and heading fonts come from the theme file (theme.css @import). The
     * heavier accent fonts are fetched here, only when a page contains elements
     * that use them.
     * The theme names each one's stylesheet URL in a custom property (--font-serif-src,
     * --font-tertiary-src); `href` is the fallback, and "" turns the font off.
     *
     * To register another on-demand font, add an entry to FONTS:
     *   { test: '<css selector>', prop: '<custom property>', href: '<fallback url>' }
     * The font is injected only if `document.querySelector(test)` matches.
     *
     * The variables are read once, at start. A script that changes them later asks
     * for another reading with a `draftmango:fonts` event on document:
     *   document.dispatchEvent(new CustomEvent('draftmango:fonts'))
     */

    const FONTS = [
        {
            // Secondary / serif accent (Instrument Serif) — .font-serif and the
            // components whose CSS sets --font-serif
            test: '.font-serif, .megamenu-slide-title em, .footer-heading em, .footer-contact-cta-text em, .footer-newsletter-title em, .article-body > .drop-cap, .post-quote',
            prop: '--font-serif-src',
            href: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap',
        },
        {
            // Tertiary font (Urbanist) — used by .text-stroke-* marks, .text-watermark, and .font-tertiary
            test: '.font-tertiary, [class*="text-stroke"], .text-watermark',
            prop: '--font-tertiary-src',
            href: 'https://fonts.googleapis.com/css2?family=Urbanist:wght@500;600;700;800;900&display=swap',
        },
    ];

    /** The URL a theme gives in `prop`: '' when unset, null when set to "" (font turned off). */
    function themeUrl(styles, prop) {
        const raw = styles.getPropertyValue(prop).trim();
        if (/^(["'])\1$/.test(raw)) return null;
        return raw.replace(/^(["'])(.*)\1$/, '$2');
    }

    /** Compared in JS, not through a selector: the URL comes from a hand-edited theme. */
    const isLinked = (href) =>
        [...document.querySelectorAll('link[rel="stylesheet"]')].some(
            (link) => link.getAttribute('href') === href,
        );

    /** The event that asks for the font variables to be read again. */
    const FONTS_EVENT = 'draftmango:fonts';

    function initFontLoader() {
        loadFonts();
        document.addEventListener(FONTS_EVENT, loadFonts);
    }

    /** Links the stylesheet of each accent font the page uses, unless it is linked already. */
    function loadFonts() {
        const styles = getComputedStyle(document.documentElement);
        for (const { test, prop, href: fallback } of FONTS) {
            if (!document.querySelector(test)) continue;
            const url = themeUrl(styles, prop);
            if (url === null) continue;
            const href = fontHref(url || fallback);
            if (isLinked(href)) continue;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            document.head.append(link);
        }
    }

    /**
     * focus-source.js — Keeps keyboard focus rings off mouse and touch focus
     *
     * Chrome lets any key press, Shift on its own included, turn the element
     * you last clicked into :focus-visible, so a ring appears out of nowhere.
     * This records the last real input on <html> as data-focus-source
     * ("pointer" or "keyboard"); the base stylesheet hides the ring while it
     * reads "pointer". Tab, arrows and Enter still flip it back to keyboard.
     */

    const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Fn']);

    function initFocusSource() {
        const root = document.documentElement;
        const set = (source) => {
            if (root.dataset.focusSource !== source) root.dataset.focusSource = source;
        };

        document.addEventListener('pointerdown', () => set('pointer'), {
            capture: true,
            passive: true,
        });

        // Modifiers alone and shortcuts (Ctrl+C, Cmd+R) are not navigation
        document.addEventListener(
            'keydown',
            (e) => {
                if (MODIFIERS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
                set('keyboard');
            },
            { capture: true },
        );
    }

    /**
     * copy.js — one-tap copy to the clipboard
     *
     * A [data-copy] button copies a text and confirms it for two seconds.
     * What it copies:
     *   <button data-copy="hello@draftmango.example">   the attribute's text
     *   <button data-copy-url>                     the address of the page it is on
     *                                              (a "Copy Link" in a share row)
     *   <button data-copy> inside .code-block[data-code-block]
     *                                              the block's <code> text (entities
     *                                              decoded, highlight spans stripped)
     *
     * While confirming, the button carries .is-copied, its Phosphor icon (an <i>)
     * becomes a check and [data-copy-label] inside it, if any, reads the button's
     * data-copy-done ("Copied" by default). Give a visually hidden label
     * aria-live="polite" so the change is announced. Progressive enhancement:
     * without JavaScript the button does nothing, so keep the text itself on the
     * page (the snippet, a mailto link; the page's address is in the address bar).
     *
     * One delegated click listener per root, so buttons added later work without
     * another call. For frameworks:
     *   initCopy(root = document)     listens on root. Safe to call again.
     *   destroyCopy(root = document)  removes the listener, clears the timers and
     *                                 puts every confirming button back. Call it
     *                                 before the root is removed (a route change,
     *                                 an unmounting component).
     */

    const HOLD = 2000;
    const roots = new WeakMap(); // root → { onClick, pending }

    const BUTTON = '[data-copy], [data-copy-url]';

    function textFor(button) {
        if (button.dataset.copy) return button.dataset.copy;
        if ('copyUrl' in button.dataset) return location.href;
        const code = button.closest('[data-code-block]')?.querySelector('code');
        return code ? code.textContent.replace(/\n$/, '') : null;
    }

    function initCopy(root = document) {
        if (roots.has(root)) return;

        const pending = new Map(); // button → the function that puts it back

        const onClick = async (event) => {
            const button = event.target.closest?.(BUTTON);
            if (!button || !root.contains(button)) return;

            const text = textFor(button);
            if (text === null) return;
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                return;
            }

            // A second tap while confirming starts the two seconds again
            pending.get(button)?.();

            const icon = button.querySelector('i[class*="ph-"]');
            const label = button.querySelector('[data-copy-label]');
            const iconClass = icon?.className;
            const labelText = label?.textContent;

            button.classList.add('is-copied');
            if (icon) icon.className = 'ph-bold ph-check';
            if (label) label.textContent = button.dataset.copyDone ?? 'Copied';

            const timer = setTimeout(() => pending.get(button)?.(), HOLD);
            pending.set(button, () => {
                clearTimeout(timer);
                pending.delete(button);
                button.classList.remove('is-copied');
                if (icon) icon.className = iconClass;
                if (label) label.textContent = labelText;
            });
        };

        root.addEventListener('click', onClick);
        roots.set(root, { onClick, pending });
    }

    /**
     * buttons.js — Button enhancements
     *
     * Auto-initializes interactive button variants that require JS-managed DOM state.
     */

    // Wraps text in <span> and sets data-text so CSS ::before can clone it.
    // Usage: <button class="btn btn-primary btn-hover-text-slide">Label</button>
    function initTextSlide() {
        document.querySelectorAll('.btn-hover-text-slide').forEach((btn) => {
            const text = btn.textContent.trim();
            btn.innerHTML = `<span>${text}</span>`;
            btn.dataset.text = text;
        });
    }

    function initButtons() {
        initTextSlide();
    }

    // Swiper's styles stay in the template's stylesheet, so a carousel is laid out
    // before its script arrives. The script itself is fetched on demand: see below.

    /**
     * Parse a dataset string to the appropriate JS type.
     * Handles booleans, numbers, JSON objects/arrays, and plain strings.
     */
    function parseVal(val) {
        if (val === undefined || val === null) return undefined;
        if (val === 'true') return true;
        if (val === 'false') return false;
        const n = Number(val);
        if (!isNaN(n) && val.trim() !== '') return n;
        try {
            return JSON.parse(val);
        } catch {
            return val;
        }
    }

    /**
     * Find a DOM element relative to a swiper element.
     * Searches: inside the swiper → parent → grandparent.
     * This covers all standard layouts:
     *   - nav/pagination inside the swiper itself
     *   - nav/pagination in a sibling (e.g. inside .carousel-wrap)
     *   - nav/pagination in a wrapping container (e.g. .container for half-right)
     */
    function findEl(swiper, selector) {
        return (
            swiper.querySelector(selector) ||
            swiper.parentElement?.querySelector(selector) ||
            swiper.parentElement?.parentElement?.querySelector(selector) ||
            null
        );
    }

    /** Swiper and its modules (vendor/swiper.js): fetched once, when a page first mounts a carousel. */
    let library = null;
    const loadSwiper = () => (library ??= DraftmangoVendor.load('swiper'));

    /**
     * Every .swiper becomes a carousel, configured by its data attributes.
     * Swiper is no part of main.js: a page without a carousel never fetches it.
     * The rail in the header's mega menu is left to initMegaMenuMedia() (navbar.js),
     * which mounts it when the menu can be opened.
     *
     * Reduced motion: no autoplay, and slides change without a transition.
     * Keyboard: autoplay stops while focus is inside the carousel (its slides,
     * arrows or pagination) and starts again when focus leaves; tabbing into a
     * slide that is out of view slides it in.
     * Off screen: autoplay stops while the carousel is out of the viewport and
     * starts again, with a full delay, when it comes back.
     */
    function initCarousels() {
        return mountCarousels(document.querySelectorAll('.swiper:not(.megamenu-swiper)'));
    }

    /**
     * Makes carousels of `els` (.swiper elements): loads Swiper if it is not there
     * yet. An element that already is a carousel is left alone. Resolves once they
     * are mounted, with the instance on each element (`el.swiper`).
     */
    async function mountCarousels(els) {
        if (!els.length) return;

        const { Swiper, Navigation, Pagination, Autoplay, EffectFade, FreeMode, Scrollbar } =
            await loadSwiper();
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

        els.forEach((el) => {
            if (el.swiper) return;

            const d = el.dataset;
            const cfg = {};
            const modules = [];

            // ── Scalar options ────────────────────────────────────────────
            [
                'loop',
                'speed',
                'slidesPerView',
                'spaceBetween',
                'grabCursor',
                'centeredSlides',
                'direction',
            ].forEach((key) => {
                const v = parseVal(d[key]);
                if (v !== undefined) cfg[key] = v;
            });

            // ── Breakpoints (JSON) ────────────────────────────────────────
            const bp = parseVal(d.breakpoints);
            if (bp) cfg.breakpoints = bp;

            // ── Effect ────────────────────────────────────────────────────
            if (d.effect) {
                cfg.effect = d.effect;
                if (d.effect === 'fade') {
                    modules.push(EffectFade);
                    cfg.fadeEffect = { crossFade: true };
                }
            }

            // ── Autoplay ──────────────────────────────────────────────────
            // data-autoplay="4000"              → { delay: 4000, disableOnInteraction: false }
            // data-autoplay='{"delay":0,...}'   → passed as-is
            const ap = parseVal(d.autoplay);
            if (ap !== undefined && !reduce) {
                cfg.autoplay =
                    typeof ap === 'object'
                        ? ap
                        : {
                              delay: typeof ap === 'number' ? ap : 3000,
                              disableOnInteraction: false,
                          };
                modules.push(Autoplay);
            }

            if (reduce) cfg.speed = 0;

            // ── Free mode ─────────────────────────────────────────────────
            if (parseVal(d.freeMode)) {
                cfg.freeMode = true;
                modules.push(FreeMode);
            }

            // ── Navigation ────────────────────────────────────────────────
            const prevEl = findEl(el, '.carousel-btn-prev');
            const nextEl = findEl(el, '.carousel-btn-next');
            if (prevEl || nextEl) {
                modules.push(Navigation);
                cfg.navigation = { prevEl, nextEl };
            }

            // ── Pagination ────────────────────────────────────────────────
            const pagEl = findEl(el, '.swiper-pagination');
            if (pagEl) {
                const type = d.paginationType || 'bullets';
                modules.push(Pagination);
                cfg.pagination = { el: pagEl, type, clickable: type === 'bullets' };
            }

            // ── Scrollbar ─────────────────────────────────────────────────
            const sbEl = findEl(el, '.swiper-scrollbar');
            if (sbEl) {
                modules.push(Scrollbar);
                cfg.scrollbar = { el: sbEl, draggable: true };
            }

            // ── Progress dashes (stories-style fill synced to autoplay) ────
            // Rounded pill bullets that fill progressively with the autoplay timer:
            // passed dashes stay filled, the active one fills live, upcoming are empty.
            if (pagEl && el.closest('.carousel-dashes')) {
                // The timer reports on every frame: the dashes are read once per
                // build of the pagination, and a value is written only when it changes
                let dashes = null;
                let filled = '';
                const list = () =>
                    (dashes ??= [...pagEl.querySelectorAll('.swiper-pagination-bullet')]);
                const paint = (s) => {
                    // Nothing fills the active dash without autoplay, so it counts as passed
                    const passed = cfg.autoplay ? s.realIndex : s.realIndex + 1;
                    list().forEach((b, i) => {
                        b.style.setProperty('--fill', i < passed ? '1' : '0');
                    });
                    filled = '';
                };
                cfg.on = {
                    init: paint,
                    paginationRender(s) {
                        dashes = null;
                        paint(s);
                    },
                    slideChangeTransitionStart: paint,
                    autoplayTimeLeft(s, time, progress) {
                        const fill = String(1 - progress);
                        if (fill === filled) return;
                        filled = fill;
                        list()[s.realIndex]?.style.setProperty('--fill', fill);
                    },
                };
            }

            cfg.modules = modules;
            const swiper = new Swiper(el, cfg);

            // ── Autoplay holds ────────────────────────────────────────────
            // Autoplay rests while anything holds it (keyboard focus inside, the
            // carousel out of the viewport) and starts again once nothing does.
            // Stopped, Swiper also drops its per-frame timer, so a carousel that
            // is off screen runs no script at all.
            const holds = new Set();
            let held = false; // stopped by a hold, so a hold may start it again
            let own = false; // the stop or start in progress is this code's
            const hold = (reason, on) => {
                if (!cfg.autoplay) return;
                if (on) holds.add(reason);
                else holds.delete(reason);
                if (holds.size ? !swiper.autoplay.running : !held) return;
                own = true;
                if (holds.size) swiper.autoplay.stop();
                else swiper.autoplay.start();
                own = false;
                held = holds.size > 0;
            };

            if (cfg.autoplay) {
                // Stopped or started by anything else (the mega menu, Swiper itself
                // after an interaction): that decision stands
                swiper.on('autoplayStart autoplayStop', () => {
                    if (!own) held = false;
                });
                new IntersectionObserver((entries) =>
                    hold('view', !entries.at(-1).isIntersecting),
                ).observe(el);
            }

            // ── Keyboard focus ────────────────────────────────────────────
            // Only :focus-visible counts — a mouse click on an arrow leaves focus
            // there too, and would hold the autoplay for good.
            const zone = [el, prevEl, nextEl, pagEl].filter(Boolean);
            const inZone = (node) => zone.some((z) => z.contains(node));

            zone.forEach((z) => {
                z.addEventListener('focusin', (e) => {
                    if (e.target.matches(':focus-visible')) hold('focus', true);
                });
                z.addEventListener('focusout', (e) => {
                    if (!inZone(e.relatedTarget)) hold('focus', false);
                });
            });

            // Focusing something in a clipped slide makes the browser scroll the
            // carousel's own box to show it, which leaves the track out of line.
            // Put the box back and let the carousel bring the slide in instead.
            el.addEventListener('focusin', (e) => {
                const slide = e.target.closest('.swiper-slide');
                if (slide?.parentElement !== swiper.wrapperEl) return;
                el.scrollLeft = 0;
                el.scrollTop = 0;
                if (!e.target.matches(':focus-visible')) return;
                const index = swiper.slides.indexOf(slide);
                const box = el.getBoundingClientRect();
                const rect = slide.getBoundingClientRect();
                const shown =
                    cfg.effect === 'fade'
                        ? index === swiper.activeIndex
                        : rect.left >= box.left - 1 &&
                          rect.right <= box.right + 1 &&
                          rect.top >= box.top - 1 &&
                          rect.bottom <= box.bottom + 1;
                if (!shown) swiper.slideTo(index);
            });

            // ── Thumbnail rail ────────────────────────────────────────────
            // data-thumbs="#rail" links a plain list of buttons to the slides:
            // a click slides there, and the button for the slide on show gets
            // .is-active + aria-current. No second carousel, so the rail is laid
            // out by CSS alone (a column on desktop, a row on mobile).
            // A .carousel-thumb-cards rail also gets the autoplay timer: --fill
            // (0…1) on the active button, written only when it changes; without
            // autoplay nothing is written and the CSS shows the line full.
            // Keyboard focus in the rail holds the autoplay, as in the slides.
            const rail = d.thumbs && document.querySelector(d.thumbs);
            if (rail) {
                const btns = Array.from(rail.querySelectorAll('button, a'));
                const mark = () =>
                    btns.forEach((b, i) => {
                        const on = i === swiper.realIndex;
                        b.classList.toggle('is-active', on);
                        b.setAttribute('aria-current', String(on));
                    });
                btns.forEach((b, i) =>
                    b.addEventListener('click', (e) => {
                        e.preventDefault();
                        cfg.loop ? swiper.slideToLoop(i) : swiper.slideTo(i);
                    }),
                );
                swiper.on('slideChange', mark);
                mark();

                if (cfg.autoplay && rail.classList.contains('carousel-thumb-cards')) {
                    let filled = '';
                    const reset = () => {
                        btns.forEach((b) => b.style.setProperty('--fill', '0'));
                        filled = '';
                    };
                    swiper.on('slideChange', reset);
                    swiper.on('autoplayTimeLeft', (s, time, progress) => {
                        const fill = (1 - progress).toFixed(3);
                        if (fill === filled) return;
                        filled = fill;
                        btns[s.realIndex]?.style.setProperty('--fill', fill);
                    });
                    reset();
                }

                rail.addEventListener('focusin', (e) => {
                    if (e.target.matches(':focus-visible')) hold('focus', true);
                });
                rail.addEventListener('focusout', (e) => {
                    if (!inZone(e.relatedTarget) && !rail.contains(e.relatedTarget))
                        hold('focus', false);
                });
            }
        });
    }

    // The "drag to explore" cursor for [data-drag-cursor] now lives in the shared
    // cursor toolkit — see packages/core/js/cursor.js (initCursors).

    /**
     * navbar.js — Header scroll behavior, mobile menu toggle, and mobile nav sync
     */

    function initNavbar() {
        const header = document.querySelector('[data-header]');
        if (!header) return;

        // Add shadow class when page is scrolled. The shop header never folds: it
        // scrolls with the page and CSS pins its menu row (sticky, negative top),
        // so instead it reports .is-stuck once that row reaches the top.
        const pinsMenu = header.classList.contains('header-shop');
        const onScroll = () => {
            if (pinsMenu) {
                const stickTop = parseFloat(getComputedStyle(header).top) || 0;
                header.classList.toggle(
                    'is-stuck',
                    header.getBoundingClientRect().top <= stickTop + 1 && window.scrollY > 0,
                );
            } else {
                // On past 60px, off under 40px: the gap keeps a bar that changes
                // height on .scrolled from flickering at the threshold
                const y = window.scrollY;
                if (y > 60) header.classList.add('scrolled');
                else if (y < 40) header.classList.remove('scrolled');
            }
        };
        measureHeaderRest(header);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        // header-reveal: the bar slides away while the reader scrolls down and
        // comes back the moment they scroll up. A few pixels of slack keep trackpad
        // jitter from flickering it, and it stays put while keyboard focus is inside
        // it or the mobile menu is open. Only :focus-visible counts — a mouse click
        // on a menu button leaves focus there too, which would pin the bar for good.
        if (header.classList.contains('header-reveal')) {
            let lastY = window.scrollY;
            let ticking = false;
            const reveal = () => {
                ticking = false;
                const y = window.scrollY;
                const dy = y - lastY;
                if (y <= header.offsetHeight) {
                    header.classList.remove('is-hidden');
                    lastY = y;
                    return;
                }
                if (Math.abs(dy) < 6) return;
                const busy =
                    header.querySelector(':focus-visible') ||
                    document.querySelector('[data-mobile-nav].open');
                header.classList.toggle('is-hidden', dy > 0 && !busy);
                lastY = y;
            };
            window.addEventListener(
                'scroll',
                () => {
                    if (!ticking) {
                        ticking = true;
                        requestAnimationFrame(reveal);
                    }
                },
                { passive: true },
            );
        }

        // Mobile menu toggle
        const toggle = document.querySelector('[data-toggle]');
        const mobileNav = document.querySelector('[data-mobile-nav]');

        if (toggle && mobileNav) {
            // Single source of truth for the panel's state. Everything below
            // calls this rather than poking classList, so aria-expanded and the
            // toggle's label can never drift out of sync with what is on screen.
            const setOpen = (open) => {
                mobileNav.classList.toggle('open', open);
                toggle.setAttribute('aria-expanded', String(open));
                toggle.setAttribute(
                    'aria-label',
                    open ? 'Close navigation menu' : 'Open navigation menu',
                );
            };

            // The panel's links are built from the desktop menu (initMobileSync) the
            // first time the toggle is aimed at — pointer over it, touched, focused —
            // not on every page load: most visits never open it, and on a phone the
            // build was the heaviest step of the header's start.
            let built = false;
            const build = () => {
                if (built) return;
                built = true;
                initMobileSync();
            };
            for (const type of ['pointerenter', 'pointerdown', 'focus']) {
                toggle.addEventListener(type, build, { once: true, passive: true });
            }
            // header-sidebar shows this panel as its desktop menu, with no toggle to aim at
            if (header?.classList.contains('header-sidebar')) build();

            toggle.addEventListener('click', () => {
                if (!built) {
                    // Opened by script, with no pointer or focus first: the rows need
                    // their closed state computed once, or their entrance has nothing
                    // to animate from.
                    build();
                    void mobileNav.offsetWidth;
                }
                setOpen(!mobileNav.classList.contains('open'));
            });

            // Close menu when clicking outside the header — and on the scrim,
            // which on header-side-drawer is the header's own ::before and so
            // reports the header element as the event target. `.navbar-inner`
            // spans the whole bar and paints above that pseudo-element, so a
            // click that lands on the header element itself came from the
            // dimmed page, never from a gap in the bar.
            document.addEventListener('click', (e) => {
                if (!header.contains(e.target) || e.target === header) setOpen(false);
            });

            // Close on a link tap. On the panel variants (header-overlay-menu,
            // header-side-drawer) the panel is the only navigation at every
            // width, so a same-page anchor would otherwise leave it covering the
            // section it just scrolled to. Accordion buttons are excluded — those
            // open a sub-menu, they do not navigate.
            mobileNav.addEventListener('click', (e) => {
                if (e.target.closest('a[href]')) setOpen(false);
            });

            // Escape closes it. Expected of anything that covers the page.
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
                    setOpen(false);
                    toggle.focus();
                }
            });
        } else {
            initMobileSync();
        }

        initHeaderPanels();
        initCascadeFlip();
        initCascadeKeys();
        initMenuIntent(header);
    }

    /**
     * --header-h-rest: the header's height at the top of the page, in px.
     *
     * --header-h follows the bar as it scrolls — the strip scrolls away, a bar
     * compacts — which is right for things pinned under it, but a hero sized or
     * padded from it changes height the moment .scrolled lands and the whole page
     * jumps. Layout uses this one instead: measured with the scroll state classes
     * lifted for a single synchronous read (nothing paints in between), again
     * when the window is resized. Without JS, var(--header-h-rest, var(--header-h))
     * falls back to the same value at the top of the page.
     */
    function measureHeaderRest(header) {
        const probe = document.createElement('div');
        probe.setAttribute('aria-hidden', 'true');
        probe.style.cssText =
            'position:absolute;top:0;left:0;width:0;height:var(--header-h);visibility:hidden;pointer-events:none';
        document.body.append(probe);

        const measure = () => {
            const lifted = ['scrolled', 'is-stuck'].filter((c) => header.classList.contains(c));
            header.classList.remove(...lifted);
            const h = probe.offsetHeight;
            header.classList.add(...lifted);
            document.documentElement.style.setProperty('--header-h-rest', `${h}px`);
        };
        measure();

        let frame = 0;
        window.addEventListener(
            'resize',
            () => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(measure);
            },
            { passive: true },
        );
    }

    /**
     * Hover intent for the desktop menus.
     *
     * The mega menus and cascades open on CSS :hover, so a pointer that only
     * crosses the bar on its way somewhere else — down from the browser's tabs to
     * the page, or across the bar to the cart — used to flash a panel open.
     *
     * The header carries `data-menu-wait` while the mouse is crossing a menu item
     * fast, and under it navbar.css starts every transition in the header 150ms
     * late — a passing pointer is gone before anything shows, one that stops (even
     * dead still, as on a trackpad) gets its menu. The attribute is set in the
     * same pointermove that brings the pointer onto the item, so it is in place
     * before that :hover is first styled. :hover itself is left alone: browsers do
     * not re-test it until the mouse moves again. The attribute goes once the
     * pointer moves slowly (or rests there for a beat), so a deliberate approach
     * opens at once, and anywhere off the items, so the cart, search and Buy
     * buttons keep their instant hovers.
     *
     * The CSS keys on the attribute alone, never on :has(:hover): a :has(:hover)
     * rule with descendants makes every hover change in the page restyle it whole,
     * which stalls the scroll on long pages.
     *
     * Never armed while a menu is open or just after one closed, so moving along
     * the bar from one open menu to the next, or down into a panel, stays instant.
     * Touch and pen never arm it, and keyboard focus (:focus-within) is untouched.
     */
    function initMenuIntent(header) {
        if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const items = [...header.querySelectorAll(':is(.nav-megamenu, .nav-cascade)')];
        if (!items.length) return;

        const FAST = 0.45; // px per ms; slower than this over an item reads as aiming
        const REST = 90; // ms resting on an item that also count as aiming
        const STALE = 100; // ms; a longer gap means the pointer was elsewhere
        const UNKNOWN = FAST * 4; // speed assumed for a first reading; decays in a few samples
        const HANDOFF = 300; // ms after a menu was open in which the next one opens at once

        let waiting = false;
        let shown = false; // a menu was showing as of the last event (the pointer's :hover is already the new one)
        let lastX = 0,
            lastY = 0,
            lastT = -Infinity,
            speed = UNKNOWN,
            timer = 0,
            openT = -Infinity;

        const setWait = (on) => {
            if (on === waiting) return;
            waiting = on;
            header.toggleAttribute('data-menu-wait', on);
        };
        const hovered = () => items.some((item) => item.matches(':hover'));
        const release = () => setWait(false);
        const within = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        // Item rectangles are read only while the pointer is over the header
        const overItem = (x, y) =>
            within(header.getBoundingClientRect(), x, y) &&
            items.some((item) => within(item.getBoundingClientRect(), x, y));

        const decide = (e, over) => {
            if (shown && over) {
                openT = e.timeStamp;
                return release();
            }
            if (!overItem(e.clientX, e.clientY)) return release();
            if (speed <= FAST || e.timeStamp - openT < HANDOFF) return release();
            setWait(true);
            timer = setTimeout(() => {
                release();
                shown = hovered();
            }, REST);
        };

        document.addEventListener(
            'pointermove',
            (e) => {
                if (e.pointerType !== 'mouse') return;
                const dt = e.timeStamp - lastT;
                const step = Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(dt, 1);
                lastX = e.clientX;
                lastY = e.clientY;
                lastT = e.timeStamp;
                // Smoothed, so one jittery sample neither arms nor releases it
                speed = dt > STALE ? UNKNOWN : speed * 0.5 + step * 0.5;

                clearTimeout(timer);
                const over = hovered();
                decide(e, over);
                shown = over && !waiting;
            },
            { passive: true },
        );

        // Back in from outside the window: the first reading is unknown (fast)
        document.documentElement.addEventListener('mouseleave', () => {
            clearTimeout(timer);
            lastT = -Infinity;
            shown = false;
            release();
        });
    }

    /**
     * The mega menu's carousel rail.
     *
     * The rail is an ordinary carousel (carousel.js reads its data attributes), so
     * this adds no Swiper configuration of its own and stays a no-op on a page
     * whose menu carries no rail.
     *
     * Three jobs, all of which exist because the rail rides in the header of every
     * page:
     *
     *   - It is mounted only where the menu can be opened, and late: on a screen
     *     wide enough for the desktop menu (1024px), once the page has loaded and
     *     is idle when there is a mouse, or the first time the menu is touched or
     *     focused. A phone, which shows the mobile panel instead, never fetches
     *     Swiper for it. Until then the rail shows its first slide, still.
     *   - Autoplay runs only while the menu is open. Left alone, a Swiper timer
     *     (and the dash-fill callback it drives) would tick behind every page for
     *     the whole session with nothing on screen to show for it.
     *   - A row carrying `data-media="n"` slides the rail to slide n on hover, so
     *     the layout you are about to click previews itself. The attribute is
     *     optional — a row without one behaves like any other link.
     */
    function initMegaMenuMedia() {
        document.querySelectorAll('.nav-megamenu--media').forEach((menu) => {
            const el = menu.querySelector('.megamenu-swiper');
            if (!el) return;

            // Read per call rather than cached, so the pair works before the rail
            // is mounted (a no-op) and if it is ever torn down and rebuilt.
            const play = () => el.swiper?.autoplay?.start();
            const pause = () => el.swiper?.autoplay?.stop();

            const wide = matchMedia('(min-width: 1024px)');
            let mounting = null;
            const mount = () =>
                (mounting ??= mountCarousels([el]).then(() => {
                    // Whatever state Swiper booted in, it runs only while the menu is open.
                    if (!menu.matches(':hover, :focus-within')) pause();
                }));
            const arm = () => {
                if (!wide.matches || mounting) return;
                wide.removeEventListener('change', arm);
                // Touching or tabbing into the menu cannot wait for an idle moment
                for (const type of ['pointerenter', 'focusin'])
                    menu.addEventListener(type, mount, { once: true });
                if (matchMedia('(hover: hover)').matches) whenIdle(mount);
            };
            wide.addEventListener('change', arm);
            arm();

            menu.addEventListener('mouseenter', play);
            menu.addEventListener('mouseleave', pause);
            menu.addEventListener('focusin', play);
            menu.addEventListener('focusout', (e) => {
                if (!menu.contains(e.relatedTarget)) pause();
            });

            menu.querySelectorAll('.megamenu-item[data-media]').forEach((item) => {
                item.addEventListener('mouseenter', () => {
                    const index = Number(item.dataset.media);
                    if (!el.swiper || !Number.isInteger(index)) return;
                    // Hold the slide the reader asked for rather than letting the
                    // timer move it on under the pointer.
                    pause();
                    el.swiper.slideToLoop(index);
                });

                item.addEventListener('mouseleave', play);
            });
        });
    }

    /** Runs `task` once the page has loaded and the browser has nothing better to do. */
    function whenIdle(task) {
        const idle = () =>
            window.requestIdleCallback
                ? requestIdleCallback(task, { timeout: 2000 })
                : setTimeout(task, 200);
        if (document.readyState === 'complete') idle();
        else window.addEventListener('load', idle, { once: true });
    }

    /**
     * Keeps a deep cascade inside the viewport.
     *
     * Each level of the flyout opens to the right of the one before it, so a
     * branch three or four levels down near the right of the bar eventually runs
     * off the screen — and there is nothing to scroll to reach it. On hover this
     * measures where the panel would land and, if it would not fit, adds
     * `.cascade-panel--flip` so it opens to the left of its row instead.
     *
     * Measured on hover rather than once at load: the panels are hidden with
     * `visibility`, which keeps them laid out and measurable, and the answer
     * depends on the window width and on the row's own position, both of which
     * move. A menu that fits never gets the class.
     */
    function initCascadeFlip() {
        // Level 1 drops below the bar and is aligned to its trigger's left edge;
        // deeper levels sit beside their row. Both can overshoot, and each has its
        // own flipped position in navbar.css — the shared class picks up whichever
        // rule matches the owner.
        const owners = document.querySelectorAll('.nav-cascade, .cascade-item--sub');

        owners.forEach((owner) => {
            const measure = () => {
                const panel = owner.querySelector(':scope > .cascade-panel');
                if (!panel) return;

                // Always measure the unflipped position, or a panel that flipped
                // once would keep answering the question about where it already is.
                panel.classList.remove('cascade-panel--flip');

                const row = owner.getBoundingClientRect();
                // Level 1 opens from the trigger's left edge, deeper levels from
                // its right edge.
                const from = owner.classList.contains('nav-cascade') ? row.left : row.right;
                // 8px so the panel never sits flush against the window edge.
                if (from + panel.offsetWidth > window.innerWidth - 8) {
                    panel.classList.add('cascade-panel--flip');
                }
            };

            owner.addEventListener('mouseenter', measure);
            // Keyboard: the panel opens when the row (or the trigger) takes focus
            owner.addEventListener('focusin', (e) => {
                if (e.target === owner || e.target.parentElement === owner) measure();
            });
            // A first-level panel is also placed while closed (on load and resize):
            // left past the window, even hidden, it would widen the page
            if (owner.classList.contains('nav-cascade')) {
                measure();
                let frame = 0;
                addEventListener('resize', () => {
                    cancelAnimationFrame(frame);
                    frame = requestAnimationFrame(measure);
                });
            }
        });
    }

    /**
     * Esc in a dropdown opened from the keyboard closes it and puts focus back on
     * its button. The panel opens on focus (navbar.css), so a focused button would
     * reopen it: `.is-closed` holds it shut until the button is pressed again
     * (Enter or Space) or focus leaves the item.
     */
    function initCascadeKeys() {
        document.querySelectorAll('.nav-cascade').forEach((cascade) => {
            const trigger = cascade.querySelector(':scope > .nav-link');
            if (!trigger) return;

            cascade.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' || cascade.classList.contains('is-closed')) return;
                cascade.classList.add('is-closed');
                trigger.focus();
            });
            trigger.addEventListener('click', () => cascade.classList.remove('is-closed'));
            cascade.addEventListener('focusout', (e) => {
                if (!cascade.contains(e.relatedTarget)) cascade.classList.remove('is-closed');
            });
        });
    }

    /**
     * Generic open/close for the header's auxiliary panels.
     *
     * Pairs every `[data-panel-toggle="<name>"]` with the `[data-panel="<name>"]`
     * it controls and toggles a single `.open` class — the info drawer
     * (header-info-panel) and the search sheet (header-search) both run on this,
     * and any future panel can join by adding the two attributes. Everything else
     * is CSS, so the same markup ports to the Next.js build as a one-line
     * useState.
     *
     * Closes on the panel's own [data-panel-close], on Escape, and on a click
     * outside the panel and its toggle. Focus moves into the first field on open
     * and back to the toggle on Escape.
     */
    function initHeaderPanels() {
        document.querySelectorAll('[data-panel-toggle]').forEach((toggle) => {
            const name = toggle.getAttribute('data-panel-toggle');
            const panel = document.querySelector(`[data-panel="${name}"]`);
            if (!panel) return;

            const setOpen = (open) => {
                panel.classList.toggle('open', open);
                toggle.setAttribute('aria-expanded', String(open));
                // data-panel-modal (the mini cart): a drawer over the page, so the page
                // holds still behind it — root scroll off, smooth scroll paused.
                const modal = panel.hasAttribute('data-panel-modal');
                if (modal) {
                    document.documentElement.classList.toggle('panel-modal-open', open);
                    open ? window.__lenis?.stop() : window.__lenis?.start();
                }
                // The field is only reachable once the panel is on screen, and the
                // sheet animates in — waiting a frame avoids focusing a node the
                // browser still considers hidden.
                if (open)
                    requestAnimationFrame(() =>
                        (modal
                            ? panel.querySelector('[data-panel-close]')
                            : panel.querySelector('input')
                        )?.focus(),
                    );
            };

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                setOpen(!panel.classList.contains('open'));
            });

            panel.querySelectorAll('[data-panel-close]').forEach((btn) => {
                btn.addEventListener('click', () => setOpen(false));
            });

            // Both panels stretch across the viewport and draw their scrim as a
            // pseudo-element on that outer box, so a click on the dimmed page
            // reports the panel itself as the target while a click on the drawer
            // or the sheet reports a child. That difference is the whole test —
            // the same backdrop pattern a <dialog> uses.
            document.addEventListener('click', (e) => {
                if (!panel.classList.contains('open')) return;
                if (e.target === panel) return setOpen(false);
                if (panel.contains(e.target) || toggle.contains(e.target)) return;
                setOpen(false);
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && panel.classList.contains('open')) {
                    setOpen(false);
                    toggle.focus();
                }
            });
        });
    }

    /**
     * Reads desktop nav-links and injects equivalent links into [data-mobile-links].
     * Called when the mobile menu is about to be opened for the first time.
     *
     * Rules per desktop <li>:
     *   - Plain link (a.nav-link)        → <a class="mobile-link">
     *   - Regular dropdown (.nav-dropdown) → flat <a class="mobile-link"> per .dropdown-item
     *   - Mega menu (.nav-megamenu)        → Alpine.js accordion with .mobile-link-sub per .megamenu-item
     *
     * After injection, Alpine.initTree() activates x-data directives on the new nodes.
     */
    function initMobileSync() {
        // href and text values are read from the static desktop nav DOM (trusted, author-controlled HTML).
        // If you extend this function with dynamic/user-provided data, sanitize before passing to innerHTML.
        const desktopItems = document.querySelectorAll('ul.nav-links > li');
        const target = document.querySelector('[data-mobile-links]');

        if (!target || !desktopItems.length) return;

        let html = '';

        desktopItems.forEach((li) => {
            if (li.classList.contains('nav-megamenu')) {
                const label = li.querySelector('button.nav-link')?.textContent.trim() ?? '';

                // A tabbed mega menu keeps its tabs as one more level, so each
                // tab's groups (and its Overview) stay filed under the tab's name
                const panels = li.querySelectorAll('.tabs-panel');
                let itemsHtml = '';
                if (panels.length) {
                    panels.forEach((panel) => {
                        const tab = li.querySelector(`[aria-controls="${panel.id}"]`);
                        const title =
                            (tab?.querySelector('.tab-btn-title') ?? tab)?.textContent.trim() ?? '';
                        const inner = buildMegaCols(panel.querySelectorAll('.megamenu-col'));
                        if (!inner.trim()) return;
                        itemsHtml += title ? mobileAccordion(title, inner, true) : inner;
                    });
                } else {
                    itemsHtml = buildMegaCols(li.querySelectorAll('.megamenu-col'));
                }

                const promo = li.querySelector('a.menu-promo');
                if (promo) itemsHtml += mobilePromo(promo);

                html += mobileAccordion(label, itemsHtml);
            } else if (li.classList.contains('nav-cascade')) {
                const label = li.querySelector('button.nav-link')?.textContent.trim() ?? '';
                const topPanel = li.querySelector(':scope > .cascade-panel');
                if (!topPanel) return;

                const itemsHtml = buildCascadeLevel(topPanel, 1);
                if (!itemsHtml.trim()) return;

                html += `<div class="mobile-accordion" x-data="{ open: false }">
    <button class="mobile-accordion-btn" @click="open = !open" :aria-expanded="open">
        ${label}
        <i class="ph ph-caret-down transition-transform duration-200" :class="open && 'rotate-180'"></i>
    </button>
    <div class="mobile-accordion-panel" x-show="open" x-collapse>
${itemsHtml}    </div>
</div>\n`;
            } else {
                const a = li.querySelector('a.nav-link');
                if (a) {
                    html += `<a href="${a.getAttribute('href')}" class="mobile-link">${a.textContent.trim()}</a>\n`;
                }
            }
        });

        target.innerHTML = html;

        markCurrentTrail(target);

        // Activate Alpine directives on the newly injected nodes
        if (window.Alpine) {
            window.Alpine.initTree(target);
        }
    }

    /**
     * Mobile markup for a set of mega-menu columns. A titled column becomes a
     * nested accordion; an untitled one (a tab's Overview) sits beside the groups,
     * so it wears the group row's classes and reads at the same level.
     */
    function buildMegaCols(cols) {
        let html = '';
        cols.forEach((col) => {
            if (col.classList.contains('megamenu-col--cta')) return;
            const title = col.querySelector('.megamenu-col-title')?.textContent.trim() ?? '';
            const links = col.querySelectorAll('.megamenu-item');
            if (!links.length) return;

            const linkClass = title
                ? 'mobile-link mobile-link-sub-2'
                : 'mobile-accordion-btn mobile-accordion-btn--nested';
            let colLinksHtml = '';
            links.forEach((a) => {
                const clone = a.cloneNode(true);
                clone.querySelectorAll('.badge-new, .badge-hot').forEach((b) => b.remove());
                const text = clone.textContent.trim();
                // A row's leading icon travels with it; rows without one are unchanged.
                const icon = a.querySelector(':scope > i')?.outerHTML ?? '';
                colLinksHtml += `            <a href="${a.getAttribute('href')}" class="${linkClass}">${icon}${text}</a>
`;
            });

            html += title ? mobileAccordion(title, colLinksHtml, true) : colLinksHtml;
        });
        return html;
    }

    /** A menu's .menu-promo card as a phone row: its icon and title, highlighted, and an arrow. */
    function mobilePromo(a) {
        const title = a.querySelector(':scope > .menu-promo-title')?.textContent.trim() ?? '';
        const icon = a.querySelector(':scope > .menu-promo-icon > i')?.outerHTML ?? '';
        return `        <a href="${a.getAttribute('href')}" class="mobile-link mobile-link--promo">${icon}<span>${title}</span><i class="ph ph-arrow-right" aria-hidden="true"></i></a>\n`;
    }

    /** One Alpine accordion: a top-level row, or a nested group when `nested`. */
    function mobileAccordion(label, inner, nested = false) {
        return `<div class="mobile-accordion" x-data="{ open: false }">
    <button class="mobile-accordion-btn${nested ? ' mobile-accordion-btn--nested' : ''}" @click="open = !open" :aria-expanded="open">
        ${label}
        <i class="ph ph-caret-down transition-transform duration-200" :class="open && 'rotate-180'"></i>
    </button>
    <div class="mobile-accordion-panel" x-show="open" x-collapse>
${inner}    </div>
</div>
`;
    }

    /**
     * Marks the injected row that points at the page you are on, and flags every
     * accordion button above it.
     *
     * The desktop bar carries its own `active` class, hand-placed per page in the
     * partial; the panel is generated, so it has to work the answer out. It reads
     * off location rather than off the desktop class because the bar only ever
     * marks a top-level item, and the panel goes three levels deeper than that.
     *
     * Marking only — every accordion stays closed until someone opens it. A menu
     * that unfolds its own branch on arrival decides for the reader how much of
     * the panel to fill, and on a deep tree that is most of it.
     *
     * The mark is generic: any variant can style `.is-current` / `.is-trail`.
     */
    function markCurrentTrail(root) {
        const normalise = (path) => path.replace(/\/index\.html$/, '/');
        const here = normalise(location.pathname);

        // Promo rows point at the Demos page from inside other menus, never "here"
        const current = Array.from(
            root.querySelectorAll('a.mobile-link:not(.mobile-link--promo)'),
        ).find((a) => {
            const href = a.getAttribute('href');
            // Skip anchors, mailto:/tel: and anything absolute to another origin.
            if (!href || href.startsWith('#')) return false;
            let url;
            try {
                url = new URL(href, location.href);
            } catch {
                return false;
            }
            return url.origin === location.origin && normalise(url.pathname) === here;
        });

        if (!current) return;

        current.classList.add('is-current');
        current.setAttribute('aria-current', 'page');

        for (let node = current.parentElement; node && node !== root; node = node.parentElement) {
            if (!node.classList.contains('mobile-accordion')) continue;
            node.querySelector(':scope > .mobile-accordion-btn')?.classList.add('is-trail');
        }
    }

    /**
     * Recursively turns a desktop .cascade-panel into mobile markup.
     * Direct links become .mobile-link; each nested .cascade-item--sub becomes a
     * nested Alpine accordion, so arbitrarily deep cascade menus (e.g. Page Headers
     * → group → variant) keep their grouping on mobile. depth 1 = top panel.
     */
    function buildCascadeLevel(panel, depth) {
        let html = '';

        Array.from(panel.children).forEach((node) => {
            if (node.classList.contains('cascade-item--sub')) {
                const labelEl =
                    node.querySelector(':scope > .cascade-item-title') ??
                    node.querySelector(':scope > span');
                const sectionLabel = labelEl?.textContent.trim() ?? '';
                const childPanel = node.querySelector(':scope > .cascade-panel');
                if (!childPanel) return;

                const inner = buildCascadeLevel(childPanel, depth + 1);
                if (!inner.trim()) return;

                html += `    <div class="mobile-accordion" x-data="{ open: false }">
        <button class="mobile-accordion-btn mobile-accordion-btn--nested" @click="open = !open" :aria-expanded="open">
            ${sectionLabel}
            <i class="ph ph-caret-down transition-transform duration-200" :class="open && 'rotate-180'"></i>
        </button>
        <div class="mobile-accordion-panel" x-show="open" x-collapse>
${inner}        </div>
    </div>\n`;
            } else if (node.classList.contains('cascade-group')) {
                // A titled group (cascade-panel--groups): its links read as one list on a phone
                html += buildCascadeLevel(node, depth);
            } else if (node.matches('a.menu-promo')) {
                html += mobilePromo(node);
            } else if (node.matches('a.cascade-item')) {
                const clone = node.cloneNode(true);
                clone.querySelectorAll('.badge-new, .badge-hot').forEach((b) => b.remove());
                // A rich row: its title only, not the caption run into it
                const text = (
                    clone.querySelector(':scope > .cascade-item-title') ?? clone
                ).textContent.trim();
                const cls = depth > 1 ? 'mobile-link mobile-link-sub-2' : 'mobile-link';
                const out = node.target === '_blank' ? ' target="_blank" rel="noopener"' : '';
                html += `        <a href="${node.getAttribute('href')}" class="${cls}"${out}>${text}</a>\n`;
            }
        });

        return html;
    }

    /**
     * smooth-scroll.js — Lenis smooth scroll initialization
     *
     * The instance is exposed as window.__lenis so other modules (e.g.
     * back-to-top) can call lenis.scrollTo() directly.
     *
     * Dispatches a 'lenis-ready' CustomEvent on window once Lenis is
     * running so other modules (e.g. parallax.js) can hook into the
     * scroll stream without importing GSAP here.
     */

    function initSmoothScroll() {
        const lenis = new Lenis({
            lerp: 0.1,
            smoothWheel: true,
        });

        // Drive Lenis with its own RAF loop (required for smooth scroll to work)
        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);

        window.__lenis = lenis;
        window.dispatchEvent(new CustomEvent('lenis-ready', { detail: lenis }));
    }

    /**
     * sticky.js — stuck-state detection for sticky elements
     *
     * Adds the `.is-stuck` class to any `[data-sticky-stuck]` element the moment it
     * becomes pinned (top by default, bottom with `data-sticky-stuck="bottom"`), so
     * its appearance can change — e.g. a shadow on a sticky action bar.
     *
     * Technique: a zero-height sentinel is placed at the element's natural resting
     * position and watched with an IntersectionObserver whose root edge is inset by
     * the sticky offset. When the sentinel crosses that line the element has pinned.
     * No scroll listeners, no layout thrash, no dependencies — and the sticky
     * positioning itself is pure CSS, so everything works without this script.
     * Easily ported to a Next.js `useEffect` hook.
     */

    function initSticky() {
        const bars = document.querySelectorAll('[data-sticky-stuck]');
        if (!bars.length || !('IntersectionObserver' in window)) return;

        bars.forEach((bar) => {
            const atBottom = bar.dataset.stickyStuck === 'bottom';

            // Resolve the pixel offset the element pins at (its CSS top / bottom).
            const cs = getComputedStyle(bar);
            const offset = parseFloat(atBottom ? cs.bottom : cs.top) || 0;

            // In-flow, zero-height marker sitting at the element's natural edge.
            const sentinel = document.createElement('div');
            sentinel.setAttribute('aria-hidden', 'true');
            sentinel.style.cssText = 'height:0;width:100%;margin:0;padding:0;';
            bar.insertAdjacentElement(atBottom ? 'afterend' : 'beforebegin', sentinel);

            // Inset the observation edge by the offset: the sentinel stops
            // intersecting exactly when the element reaches its pinned position.
            const rootMargin = atBottom ? `0px 0px -${offset}px 0px` : `-${offset}px 0px 0px 0px`;

            const observer = new IntersectionObserver(
                ([entry]) => bar.classList.toggle('is-stuck', !entry.isIntersecting),
                { threshold: [0], rootMargin },
            );
            observer.observe(sentinel);
        });
    }

    /**
     * page-nav.js — sticky in-page anchor navigation with scrollspy
     *
     *   <nav class="page-nav" data-page-nav>
     *     <div class="container page-nav-inner">
     *       <a href="#intro"   class="page-nav-link is-active">Intro</a>
     *       <a href="#details" class="page-nav-link">Details</a>
     *     </div>
     *   </nav>
     *   <section id="intro"   class="page-nav-section"> … </section>
     *   <section id="details" class="page-nav-section"> … </section>
     *
     * Clicking a tab smooth-scrolls to its anchor (via the shared Lenis instance
     * on window.__lenis, native scrollIntoView otherwise), landing the section just
     * below the pinned bar. An rAF-throttled scroll handler underlines whichever
     * section is currently under the bar. The CSS sticky bar works on its own; this
     * only adds animated scroll + active tracking. Pure DOM, no dependencies.
     *
     * A target that is not rendered (a closed tab panel, a filtered-out block, any
     * display:none ancestor) is skipped: it is never marked active and its link
     * does not scroll.
     */

    function initPageNav() {
        const navs = document.querySelectorAll('[data-page-nav]');
        if (!navs.length) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        navs.forEach((nav) => setup(nav, reduce));
    }

    function setup(nav, reduce) {
        // Pair each in-page link with the section it targets.
        const sections = [...nav.querySelectorAll('a[href^="#"]')]
            .map((link) => {
                const id = link.getAttribute('href').slice(1);
                const target = id ? document.getElementById(id) : null;
                return target ? { link, target } : null;
            })
            .filter(Boolean);

        // A bar with no anchor links — a filter bar built on the same component,
        // say — still wants the pinned treatment, so only the scrollspy is skipped.
        const spy = sections.length > 0;

        // data-page-nav="aside": a vertical contents list beside the content, not a
        // pinned bar — its own height is not an offset and it never flags the page.
        const isAside = nav.dataset.pageNav === 'aside';

        // Pixels from the top of the viewport to just below the pinned bar.
        const headerH = () =>
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) ||
            88;
        // Where the bar pins: its own sticky top (0, or the header height with
        // .page-nav--under-header). The aside list sits below the header.
        const pinTop = () => (isAside ? headerH() : parseFloat(getComputedStyle(nav).top) || 0);
        const topOffset = () => pinTop() + (isAside ? 48 : nav.offsetHeight);

        // Rendered at all? A display:none target has no box, so its position reads
        // as 0 and it would pass for "scrolled past".
        const shown = (target) => target.getClientRects().length > 0;

        const setActive = (active) => {
            sections.forEach(({ link }) => link.classList.toggle('is-active', link === active));
            // A rail that scrolls sideways (the phone layout) can leave the active
            // link off-screen; centre it so the bar always shows where you are.
            const rail = active?.parentElement;
            if (rail && rail.scrollWidth > rail.clientWidth + 1) {
                rail.scrollTo({
                    left: active.offsetLeft - rail.clientWidth / 2 + active.offsetWidth / 2,
                    behavior: reduce ? 'auto' : 'smooth',
                });
            }
        };

        // --- Smooth scroll on click -------------------------------------------
        // Where the page has to rest for a section to sit just below the bar.
        const restAt = (target) =>
            Math.round(target.getBoundingClientRect().top + window.scrollY - topOffset());

        // A header that compacts on scroll (navbar.js adds .scrolled past 60px)
        // changes the offset, or the height of the page above the target, once the
        // jump is under way — so a jump from the top is measured with the header
        // already in the state it will be in on arrival. html.page-nav-measuring
        // (page-nav.css) holds the header's transitions still meanwhile.
        const jumpTo = (target) => {
            const root = document.documentElement;
            const header = document.querySelector('[data-header]:not(.header-shop)');
            // Scroll to an absolute Y so the section lands just below the bar.
            // Pass a number (not the element) — Lenis applies scroll-margin-top
            // to element targets, which would double-count our offset.
            let y = restAt(target);
            // Animating across a very long page (an A–Z index is tens of
            // thousands of pixels) reads as a stutter, not as motion — jump.
            const far = Math.abs(y - window.scrollY) > window.innerHeight * 4;
            const immediate = reduce || far;
            const compacts = header && !header.classList.contains('scrolled') && y > 60;
            if (compacts) {
                root.classList.add('page-nav-measuring');
                header.classList.add('scrolled');
                y = restAt(target);
                // A smooth scroll lets the header compact in its own time. A cut
                // arrives with it already compact, or it would shift under the bar.
                if (!immediate) header.classList.remove('scrolled');
            }
            window.__lenis.scrollTo(y, { immediate });
            if (compacts) {
                void header.offsetHeight; // settle the real state before transitions return
                root.classList.remove('page-nav-measuring');
            }
        };

        sections.forEach(({ link, target }) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (!shown(target)) return;
                // No Lenis: the native jump relies on the section's scroll-margin-top.
                if (window.__lenis) jumpTo(target);
                else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
                setActive(link);
            });
        });

        // --- Scrollspy --------------------------------------------------------
        const update = () => {
            ticking = false;
            // Pinned once its top reaches its sticky edge —
            // flag it so the bar can lift with a border + shadow, and flag the page
            // so the header can drop its own shadow (the bar carries it instead).
            if (!isAside) {
                const stuck = nav.getBoundingClientRect().top <= pinTop() + 1;
                nav.classList.toggle('is-stuck', stuck);
                document.documentElement.classList.toggle('page-nav-stuck', stuck);
            }
            if (!spy) return;
            const line = topOffset() + 4;
            const live = sections.filter(({ target }) => shown(target));
            let current = live[0]?.link;
            // Links are assumed to be in document order: pick the last section whose
            // top has passed under the bar, then stop at the first that hasn't.
            for (const { link, target } of live) {
                if (target.getBoundingClientRect().top <= line) current = link;
                else break;
            }
            // At the very bottom of the page a trailing section can't scroll high
            // enough to reach the line — activate the last one once scrolling ends.
            const scroller = document.scrollingElement || document.documentElement;
            if (window.innerHeight + window.scrollY >= scroller.scrollHeight - 2) {
                current = live.at(-1)?.link;
            }
            setActive(current);
        };

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    /**
     * back-to-top.js — Scroll to top button visibility and behavior
     *
     * Shows the button after scrolling past 500px.
     * Uses Lenis if available, otherwise native smooth scroll.
     *
     * Usage: <button data-back-top>...</button>
     */

    function initBackToTop() {
        const btn = document.querySelector('[data-back-top]');
        if (!btn) return;

        // Toggle visibility based on scroll position
        window.addEventListener(
            'scroll',
            () => btn.classList.toggle('visible', window.scrollY > 500),
            { passive: true },
        );

        // Scroll to top on click
        btn.addEventListener('click', () => {
            if (window.__lenis) {
                window.__lenis.scrollTo(0);
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    /**
     * scroll-progress.js — Reading and scroll progress indicators
     *
     * Writes --scroll-progress (0 → 1) on every [data-scroll-progress] element;
     * scroll-progress.css turns that number into a bar or a ring.
     *
     *   data-scroll-progress                 progress through the whole page
     *   data-scroll-progress="#article"      progress through one element: 0 when its top
     *                                        reaches the header, 1 when its bottom reaches
     *                                        the bottom of the window
     *   data-scroll-progress-axis="x" | "y"  with a selector, follow that element's own
     *                                        scroll position (a scrolling strip or panel)
     *   [data-scroll-progress-value]         child whose text becomes the percentage
     *
     * Elements with role="progressbar" also get aria-valuenow kept in sync.
     * One passive scroll listener and one rAF per frame, however many indicators.
     */

    function initScrollProgress() {
        const nodes = document.querySelectorAll('[data-scroll-progress]');
        if (!nodes.length) return;

        const items = Array.from(nodes, (el) => {
            const selector = el.dataset.scrollProgress;
            return {
                el,
                target: selector ? document.querySelector(selector) : null,
                axis: el.dataset.scrollProgressAxis,
                values: el.querySelectorAll('[data-scroll-progress-value]'),
                bar: el.getAttribute('role') === 'progressbar',
            };
        });

        const headerH = () =>
            parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) ||
            0;

        const measure = ({ target, axis }) => {
            if (target && axis) {
                const x = axis === 'x';
                const max = x
                    ? target.scrollWidth - target.clientWidth
                    : target.scrollHeight - target.clientHeight;
                return max > 0 ? (x ? target.scrollLeft : target.scrollTop) / max : 1;
            }

            const vh = window.innerHeight;
            if (target) {
                const top = headerH();
                const r = target.getBoundingClientRect();
                const span = r.height - (vh - top);
                return span > 0 ? (top - r.top) / span : r.top <= top ? 1 : 0;
            }

            const max = document.documentElement.scrollHeight - vh;
            return max > 0 ? window.scrollY / max : 0;
        };

        let queued = false;
        const update = () => {
            queued = false;
            for (const item of items) {
                const p = Math.min(1, Math.max(0, measure(item)));
                const pct = Math.round(p * 100);
                item.el.style.setProperty('--scroll-progress', p.toFixed(4));
                item.values.forEach((v) => {
                    v.textContent = pct;
                });
                if (item.bar) item.el.setAttribute('aria-valuenow', pct);
            }
        };
        const request = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(update);
        };

        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);
        window.addEventListener('load', request);
        new Set(items.filter((i) => i.target && i.axis).map((i) => i.target)).forEach((t) =>
            t.addEventListener('scroll', request, { passive: true }),
        );

        update();
    }

    /**
     * scroll-to-footer.js — glide to the footer once the page has loaded
     *
     *   <body data-scroll-to-footer>
     *
     * For pages whose subject IS the footer (the footer demos): shortly after
     * load the page scrolls down so the footer is on screen. A footer that fits
     * the viewport is shown whole (scroll to the very end); a taller one lands
     * with its top edge just below the pinned site header.
     *
     * Stays out of the way: no scroll when the URL carries a #hash, or when the
     * reader has already moved (history restore, reload, an early wheel). Uses
     * the shared Lenis instance (window.__lenis) when present; honours
     * prefers-reduced-motion with an instant jump. Pure DOM, no dependencies.
     */

    function initScrollToFooter() {
        if (!document.body.hasAttribute('data-scroll-to-footer')) return;
        if (location.hash) return;

        const footer = document.querySelector('.site-footer') || document.querySelector('footer');
        if (!footer) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const DELAY = 700; // let the hero register before the page moves

        const go = () => {
            if (window.scrollY > 40) return;

            const scroller = document.scrollingElement || document.documentElement;
            const max = scroller.scrollHeight - window.innerHeight;
            const top = footer.getBoundingClientRect().top + window.scrollY;
            // A pinned site header covers the top of the viewport — leave room for it
            const header = document.querySelector('.site-header');
            const pos = header ? getComputedStyle(header).position : '';
            const cover = pos === 'sticky' || pos === 'fixed' ? header.offsetHeight : 0;
            const room = window.innerHeight - cover;
            const y = footer.offsetHeight <= room ? max : Math.min(top - cover, max);
            if (y <= 0) return;

            if (window.__lenis) {
                window.__lenis.scrollTo(y, { duration: reduce ? 0 : 1.8, immediate: reduce });
            } else {
                window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
            }
        };

        const start = () => setTimeout(go, DELAY);
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });
    }

    /**
     * scroll-highlight.js — word-by-word color fill on scroll
     *
     *   <p class="scroll-highlight" data-scroll-highlight>
     *     Your long paragraph of copy …
     *   </p>
     *
     * As the block scrolls through the viewport each word warms from a dimmed
     * base color to full text color, sweeping top-to-bottom like a reading
     * highlight. The word crossing a horizontal "reveal line" is mid-transition;
     * everything above it is fully lit, everything below is still dim.
     *
     *   data-line   reveal line, % of viewport height    (default 55)
     *   data-band   transition zone height, % of vh       (default 24)
     *
     * Each word is wrapped in <span class="scroll-highlight-word"> carrying a
     * --lit value (0..1); scroll-highlight.css mixes the color from it. The text
     * stays real, selectable and screen-reader friendly — nothing is hidden.
     * Word centers are measured once (re-measured on resize); the scroll handler
     * is rAF-throttled and only reads one rect per block, so it stays cheap.
     * Pure DOM, no dependencies — ports straight to a React effect.
     */

    const DEFAULT_LINE = 55;
    const DEFAULT_BAND = 24;

    function initScrollHighlight() {
        const els = document.querySelectorAll('[data-scroll-highlight]');
        if (!els.length) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const instances = [];
        els.forEach((el) => {
            const words = split(el);
            if (!words.length) return;

            // Reduced motion: show the fully-lit, readable text, no scroll binding.
            if (reduce) {
                words.forEach((w) => w.style.setProperty('--lit', '1'));
                return;
            }
            instances.push({
                el,
                words,
                line: clampPct(el.dataset.line, DEFAULT_LINE),
                band: clampPct(el.dataset.band, DEFAULT_BAND),
            });
        });
        if (!instances.length) return;

        // Cache each word's vertical center relative to its block. Re-run on resize
        // since wrapping changes which line a word lands on.
        const measure = () =>
            instances.forEach((inst) => {
                const base = inst.el.getBoundingClientRect().top;
                inst.words.forEach((w) => {
                    const r = w.getBoundingClientRect();
                    w._c = r.top - base + r.height / 2;
                });
            });

        const update = () => {
            ticking = false;
            const vh = window.innerHeight;
            instances.forEach((inst) => {
                const top = inst.el.getBoundingClientRect().top;
                const linePx = (vh * inst.line) / 100;
                const bandPx = Math.max(1, (vh * inst.band) / 100);
                inst.words.forEach((w) => {
                    const center = top + w._c;
                    const lit = clamp$1((linePx - center) / bandPx + 0.5, 0, 1);
                    w.style.setProperty('--lit', round(lit));
                });
            });
        };

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        };

        measure();
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', () => {
            measure();
            update();
        });
    }

    /**
     * Wrap each word of `el` in <span class="scroll-highlight-word">, preserving
     * the spaces as plain text so the copy wraps naturally. Idempotent.
     */
    function split(el) {
        if (el.dataset.scrollHighlightSplit !== undefined) {
            return [...el.querySelectorAll('.scroll-highlight-word')];
        }
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        el.textContent = '';

        const tokens = text.split(' ');
        const words = [];
        tokens.forEach((word, i) => {
            const span = document.createElement('span');
            span.className = 'scroll-highlight-word';
            span.textContent = word;
            el.append(span);
            if (i < tokens.length - 1) el.append(document.createTextNode(' '));
            words.push(span);
        });

        el.dataset.scrollHighlightSplit = '';
        return words;
    }

    const clamp$1 = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const round = (n) => Math.round(n * 100) / 100;
    const clampPct = (raw, fallback) => {
        const n = parseFloat(raw);
        return Number.isFinite(n) ? clamp$1(n, 0, 100) : fallback;
    };

    /**
     * word-rotator.js — cycles one word inside a sentence
     *
     *   <span class="word-rotator word-rotator--slide-up" data-word-rotate
     *         data-interval="2200">
     *     <span class="word-rotator-word">designers</span>
     *     <span class="word-rotator-word">founders</span>
     *   </span>
     *
     *   data-interval   ms each word holds before swapping (default 2200)
     *   class modifier  word-rotator--slide-up | --slide-down | --fade
     *                   | --flip | --blur | --type
     *
     * Pure DOM + timers, no globals — drops into a future React build unchanged
     * (call from a useEffect). All visual transition lives in word-rotator.css;
     * this module only toggles classes, sets width, and (for --type) writes text.
     *
     * A rotator rests while it is out of the viewport or the tab is hidden, and
     * goes on when it comes back. Under reduced motion the words swap at once,
     * and the typewriter does not type: it shows its first word.
     */

    /**
     * Calls run() while el is in the viewport and the tab is shown, rest() when
     * either stops being true.
     */
    function whileShown(el, run, rest) {
        let inView = false;
        let running = false;

        const sync = () => {
            const shown = inView && !document.hidden;
            if (shown === running) return;
            running = shown;
            if (shown) run();
            else rest();
        };

        new IntersectionObserver((entries) => {
            inView = entries.at(-1).isIntersecting;
            sync();
        }).observe(el);
        document.addEventListener('visibilitychange', sync);
    }

    function initWordRotator() {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        document.querySelectorAll('[data-word-rotate]').forEach((el) => {
            const words = Array.from(el.querySelectorAll('.word-rotator-word'));
            if (words.length < 2) return;

            const interval = parseInt(el.dataset.interval, 10) || 2200;
            const isType = el.classList.contains('word-rotator--type');
            const labels = words.map((w) => w.textContent.trim());

            let index = 0;

            // Initial state: first word active, the rest hidden from AT.
            words.forEach((w, i) => {
                w.classList.toggle('is-active', i === 0);
                w.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
            });

            if (isType) {
                // Reduced motion: the first word stays, nothing is typed.
                if (!reduce) startTypewriter(el, words[0], labels, interval);
                return;
            }

            // Lock the element to the active word's width so the sentence reflows
            // smoothly. Measured again after fonts load so widths are accurate.
            const setWidth = () => {
                el.style.width = `${words[index].offsetWidth}px`;
            };
            setWidth();
            document.fonts?.ready.then(setWidth);

            // ---- Standard swap engine ----
            let timer = null;

            const advance = () => {
                const prev = index;
                index = (index + 1) % words.length;
                const leaving = words[prev];
                const entering = words[index];

                leaving.classList.remove('is-active');
                leaving.setAttribute('aria-hidden', 'true');
                entering.classList.add('is-active');
                entering.setAttribute('aria-hidden', 'false');

                if (!reduce) {
                    leaving.classList.add('is-leaving');
                    window.setTimeout(() => leaving.classList.remove('is-leaving'), 700);
                }
                setWidth();
            };

            const stop = () => {
                window.clearInterval(timer);
                timer = null;
            };
            const start = () => {
                stop();
                timer = window.setInterval(advance, interval);
            };

            // A full hold after it comes back, so words don't all jump on return.
            whileShown(el, start, stop);
        });
    }

    /**
     * Typewriter mode: keep one word active and rewrite its text, char by char.
     * The other words stay in the DOM only as the string source (hidden by CSS).
     */
    function startTypewriter(el, active, labels, hold) {
        // The word keeps one text node for good and only its data changes.
        // Replacing the node, which is what textContent does, makes the browser
        // look again at every :has() rule of the page on each character.
        const text = document.createTextNode('');
        active.replaceChildren(text);

        const TYPE = 70; // ms per character typed
        const ERASE = 40; // ms per character erased
        const HOLD = Math.max(hold, 1200);

        let wi = 0; // which label
        let ci = 0; // chars shown
        let deleting = false;
        let timer = null;
        let shown = false;
        let resume = 500; // ms before the next character when it starts again

        const schedule = (ms) => {
            timer = shown ? window.setTimeout(tick, ms) : null;
        };

        const tick = () => {
            const full = labels[wi];
            if (!deleting) {
                ci += 1;
                text.data = full.slice(0, ci);
                if (ci === full.length) {
                    deleting = true;
                    schedule(HOLD);
                } else {
                    schedule(TYPE);
                }
            } else {
                ci -= 1;
                text.data = full.slice(0, ci);
                if (ci === 0) {
                    deleting = false;
                    wi = (wi + 1) % labels.length;
                    schedule(TYPE * 4);
                } else {
                    schedule(ERASE);
                }
            }
        };

        whileShown(
            el,
            () => {
                shown = true;
                schedule(resume);
                resume = 300;
            },
            () => {
                shown = false;
                window.clearTimeout(timer);
                timer = null;
            },
        );
    }

    /**
     * gsap-loader.js — GSAP + ScrollTrigger, fetched the first time an effect needs them.
     *
     * Three modules scrub with ScrollTrigger (parallax.js, stack.js,
     * horizontal-scroll.js) and most pages use none of them, so the library is no
     * part of main.js: each module asks for it here once it has found its markup.
     * The first call loads the file, registers the plugin and ties ScrollTrigger
     * to Lenis's scroll stream (the 'lenis-ready' handshake of smooth-scroll.js);
     * later calls get the same promise.
     *
     *   const { gsap, ScrollTrigger } = await loadGsap()
     */

    let ready = null;

    function loadGsap() {
        return (ready ??= DraftmangoVendor.load('gsap').then(({ gsap, ScrollTrigger }) => {
            gsap.registerPlugin(ScrollTrigger);
            if (window.__lenis) {
                window.__lenis.on('scroll', ScrollTrigger.update);
            } else {
                window.addEventListener(
                    'lenis-ready',
                    (e) => {
                        e.detail.on('scroll', ScrollTrigger.update);
                    },
                    { once: true },
                );
            }
            return { gsap, ScrollTrigger };
        }));
    }

    /**
     * stack.js — GSAP ScrollTrigger scale-stack
     *
     * Drives the "scale stack" pattern: within a [data-stack] wrapper, each
     * [data-stack-panel] pins (via CSS `position: sticky`) while the following
     * panel slides up and over it. As it gets covered, the panel scales down and
     * dims, creating a layered depth effect.
     *
     * Tunables (data attributes on the wrapper):
     *   data-stack-scale  end scale of a covered panel  (default 0.92)
     *   data-stack-dim    end brightness of a covered panel (default 0.85)
     *
     * Skipped entirely on mobile and for prefers-reduced-motion — the panels then
     * flow in normal document order (handled by stack.css). GSAP is fetched only
     * on a page with a stack (gsap-loader.js, which also syncs ScrollTrigger with
     * Lenis). Easily ported to a Next.js effect hook.
     */

    async function initStack() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (window.innerWidth < 1024) return;

        const stacks = document.querySelectorAll('[data-stack]');
        if (!stacks.length) return;

        const { gsap } = await loadGsap();

        stacks.forEach((stack) => {
            const panels = Array.from(stack.querySelectorAll('[data-stack-panel]'));
            if (panels.length < 2) return;

            const endScale = parseFloat(stack.dataset.stackScale) || 0.92;
            const endDim = parseFloat(stack.dataset.stackDim) || 0.85;

            panels.forEach((panel, i) => {
                if (i === panels.length - 1) return; // last panel is never covered

                // Explicit `fromTo` with a brightness(1) start: interpolating from a
                // bare `none` makes GSAP treat brightness as 0 (panels turn black).
                gsap.fromTo(
                    panel,
                    { scale: 1, filter: 'brightness(1)' },
                    {
                        scale: endScale,
                        filter: `brightness(${endDim})`,
                        ease: 'none',
                        scrollTrigger: {
                            trigger: panels[i + 1],
                            start: 'top bottom',
                            end: 'top top',
                            scrub: true,
                        },
                    },
                );
            });
        });
    }

    /**
     * horizontal-scroll.js — vertical scrolling drives a horizontal pan
     *
     * Upgrades a `[data-hscroll]` section from its base state (a native
     * scroll-snap swipe row, which already works with no JavaScript at all) into
     * a pinned frame whose panel row pans sideways as the page scrolls, then
     * releases and lets the page continue.
     *
     * The pin is CSS `position: sticky`, not ScrollTrigger's `pin` — no
     * fixed-position spacer is injected, so it composes cleanly with Lenis and
     * with a sticky site header. GSAP only scrubs the track's transform, exactly
     * as stack.js does for its scale stack.
     *
     * The section's own height IS the scroll length: it is written here as
     * `calc(100svh + travel)` where `travel = trackWidth - viewportWidth`, so the
     * pan finishes precisely as the section's bottom edge reaches the viewport
     * bottom. No magic numbers, and it re-measures on every refresh.
     *
     * Markup:
     *   <section data-hscroll>
     *     <div data-hscroll-viewport>
     *       <div data-hscroll-track>
     *         <article data-hscroll-panel>…</article>
     *
     * Wrapper options:
     *   data-hscroll-speed="1.4"        scroll length multiplier (default 1)
     *   data-hscroll-swipe-below="768"  below this width, keep the native swipe row
     *
     * Optional extras, each a no-op when absent:
     *   data-hscroll-parallax="0.12"    on a child: counter-drift for depth
     *   data-hscroll-progress           element whose scaleX tracks 0 → 1
     *   data-hscroll-index / -total     text set to the current / total panel number
     *   data-hscroll-prev / -next       buttons that scroll to the neighbouring panel
     *
     * Panels hidden by something else on the page — a gallery filter, say — drop
     * out of the pan: every measurement below is taken from the panels that are
     * actually laid out, so the counter, the arrows and the scroll length all
     * follow the visible set. The row re-measures itself through the track's
     * ResizeObserver, so nothing has to tell it a filter ran.
     *
     * Skipped for prefers-reduced-motion, which leaves the accessible swipe row
     * (and fetches no GSAP: gsap-loader.js loads it for the pinned pan only).
     * Ports to a Next.js effect hook: call it on mount, and on cleanup kill this
     * module's ScrollTriggers (`ScrollTrigger.getAll()` filtered by trigger, or all
     * of them if the page owns nothing else).
     */

    async function initHorizontalScroll() {
        const sections = document.querySelectorAll('[data-hscroll]');
        if (!sections.length) return;

        // Reduced motion keeps the swipe row: only the panel count is written
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            sections.forEach((section) => {
                const parts = sectionParts(section);
                if (parts?.totalEl) parts.totalEl.textContent = pad(parts.panels.length);
            });
            return;
        }

        const { gsap, ScrollTrigger } = await loadGsap();

        sections.forEach((section) => setupSection(section, gsap, ScrollTrigger));

        // A header that changes height in the flow — a topbar folding away once the
        // page scrolls — moves every section below it after ScrollTrigger measured
        // them, so the pan would start late and stop short of its last panel.
        // Re-measure once the header has settled at its new height.
        const header = document.querySelector('[data-header]');
        if (header && 'ResizeObserver' in window) {
            let height = header.offsetHeight;
            let timer = 0;
            new ResizeObserver(() => {
                if (header.offsetHeight === height) return;
                height = header.offsetHeight;
                clearTimeout(timer);
                timer = setTimeout(() => ScrollTrigger.refresh(), 200);
            }).observe(header);
        }
    }

    /** The pieces of one section, or null when it has no row of at least two panels. */
    function sectionParts(section) {
        const viewport = section.querySelector('[data-hscroll-viewport]');
        const track = section.querySelector('[data-hscroll-track]');
        if (!viewport || !track) return null;

        const panels = Array.from(track.querySelectorAll('[data-hscroll-panel]'));
        if (panels.length < 2) return null;

        return { viewport, track, panels, totalEl: section.querySelector('[data-hscroll-total]') };
    }

    function setupSection(section, gsap, ScrollTrigger) {
        const parts = sectionParts(section);
        if (!parts) return;
        const { viewport, track, panels, totalEl } = parts;

        const speed = parseFloat(section.dataset.hscrollSpeed) || 1;
        const swipeBelow = parseInt(section.dataset.hscrollSwipeBelow, 10) || 0;

        // ---- Chrome ------------------------------------------------------------
        const progressEl = section.querySelector('[data-hscroll-progress]');
        const indexEl = section.querySelector('[data-hscroll-index]');
        const prevBtn = section.querySelector('[data-hscroll-prev]');
        const nextBtn = section.querySelector('[data-hscroll-next]');

        if (totalEl) totalEl.textContent = pad(panels.length);

        // Parallax children, resolved once — each remembers the panel it lives in.
        const drifters = Array.from(section.querySelectorAll('[data-hscroll-parallax]'))
            .map((el) => ({
                el,
                panel: el.closest('[data-hscroll-panel]'),
                depth: parseFloat(el.dataset.hscrollParallax) || 0.1,
                set: gsap.quickSetter(el, 'x', 'px'),
                max: 0,
            }))
            .filter((d) => d.panel);

        let tween = null;
        let trigger = null;
        let travel = 0; // px the track slides
        let live = panels; // the panels currently laid out (see measure)
        let centres = []; // each panel's centre, in un-transformed track space
        let stops = []; // the progress at which each panel is as centred as it gets
        let active = -1; // panel wearing `.is-active`
        let step = -1; // panel the counter and arrows are reporting
        let shown = ''; // signature of the panels wearing `.is-revealed`
        let headStop = 1; // progress past which the opening panels are behind us
        let tailStop = 0; // progress from which the closing panels are as near as they get

        /* Measure everything the pan depends on. Runs on every ScrollTrigger
           refresh BEFORE start/end are computed, so the section height it writes
           is the one ScrollTrigger then measures against. */
        const measure = () => {
            if (!section.classList.contains('hscroll--pinned')) return;

            // Only the panels actually laid out count. A display:none panel has no
            // box, so it has no centre to scroll to and no place in the counter —
            // reading the set here rather than at setup is what lets a filter above
            // this row change what the pan is made of.
            live = panels.filter((p) => p.offsetWidth > 0 || p.offsetHeight > 0);
            if (!live.length) live = panels;

            travel = Math.max(0, track.scrollWidth - viewport.clientWidth);
            section.style.height = `calc(100svh + ${travel * speed}px)`;

            // Nothing to pan: the row is narrower than the frame. Left-aligned it
            // would sit in the corner of an empty screen, so the CSS centres it.
            section.classList.toggle('hscroll--fits', travel === 0);

            if (totalEl) totalEl.textContent = pad(live.length);

            centres = live.map((p) => p.offsetLeft + p.offsetWidth / 2);

            // Where the pan has to be for each panel to sit in the middle — clamped,
            // because the first and last can never actually get there. These are the
            // arrows' destinations, and the same stops the counter reports against,
            // so the two can never disagree about which panel you are on.
            const mid = viewport.clientWidth / 2;
            stops = centres.map((c) => (travel ? -clamp(mid - c, -travel, 0) / travel : 0));

            // The outermost panels share a clamped stop of 0 or 1: the pan runs out
            // before they can reach the middle. These two marks are where the pan
            // stops being able to help them, and the reveal below hands them their
            // caption for as long as it is on their side of the mark.
            const inner = stops.filter((s) => s > 0 && s < 1);
            headStop = inner.length ? Math.min(...inner) : 1;
            tailStop = inner.length ? Math.max(...inner) : 0;

            // A drifter may never expose the panel edge behind it: its travel is
            // capped by however much wider than the panel it actually is.
            drifters.forEach((d) => {
                d.max = Math.max(0, (d.el.offsetWidth - d.panel.offsetWidth) / 2);
            });
        };

        const onUpdate = (self) => {
            const x = -travel * self.progress;
            const mid = viewport.clientWidth / 2;

            if (progressEl) progressEl.style.transform = `scaleX(${self.progress})`;

            // Drift each parallax child by how far its panel sits from the centre
            // of the frame — the image glides inside its own window as it crosses.
            drifters.forEach((d) => {
                const offset = d.panel.offsetLeft + d.panel.offsetWidth / 2 + x - mid;
                d.set(clamp(-offset * d.depth, -d.max, d.max));
            });

            // `.is-active` follows the eye: whichever panel is nearest the middle
            // of the frame right now.
            const focus = nearestTo(centres, mid - x);

            if (focus !== active) {
                live[active]?.classList.remove('is-active');
                live[focus]?.classList.add('is-active');
                active = focus;
            }

            // `.is-revealed` is what a caption hangs off, and it is deliberately a
            // wider set than `.is-active`: the panels pinned at either end never
            // reach the middle, so following the focus alone would hide their
            // captions for the whole page. While the pan rests against an end,
            // everything stranded there counts as centred as it will ever be.
            const head = self.progress <= headStop;
            const tail = self.progress >= tailStop;
            const sig = `${focus}${head ? 'h' : ''}${tail ? 't' : ''}`;

            if (sig !== shown) {
                shown = sig;
                live.forEach((p, i) =>
                    p.classList.toggle(
                        'is-revealed',
                        i === focus || (stops[i] === 0 && head) || (stops[i] === 1 && tail),
                    ),
                );
            }

            // The counter follows the stops instead. Nearest-to-centre would never
            // read 01: at rest the second panel is already the one in the middle,
            // because the first cannot be centred without scrolling backwards.
            const at = nearestTo(stops, self.progress);

            if (at !== step) {
                step = at;
                if (indexEl) indexEl.textContent = pad(at + 1);
                if (prevBtn) prevBtn.disabled = at === 0;
                if (nextBtn) nextBtn.disabled = at === live.length - 1;
            }
        };

        const activate = () => {
            if (tween) return;
            section.classList.add('hscroll--pinned');
            measure();

            tween = gsap.fromTo(
                track,
                { x: 0 },
                {
                    x: () => -travel,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: section,
                        start: 'top top',
                        end: 'bottom bottom',
                        scrub: true,
                        invalidateOnRefresh: true,
                        onUpdate,
                        onRefresh: onUpdate,
                    },
                },
            );
            trigger = tween.scrollTrigger;
        };

        const deactivate = () => {
            if (!tween) return;
            tween.scrollTrigger?.kill();
            tween.kill();
            tween = trigger = null;
            section.classList.remove('hscroll--pinned', 'hscroll--fits');
            section.style.height = '';
            gsap.set(track, { clearProps: 'transform' });
            drifters.forEach((d) => gsap.set(d.el, { clearProps: 'transform' }));
            live[active]?.classList.remove('is-active');
            live.forEach((p) => p.classList.remove('is-revealed'));
            active = step = -1;
            shown = '';
            if (progressEl) progressEl.style.transform = '';
        };

        const wanted = () => window.innerWidth >= swipeBelow;

        const sync = () => (wanted() ? activate() : deactivate());
        sync();

        // Re-measure whenever the row's own size changes — late-loading images,
        // a font swap, an orientation change. ScrollTrigger.refresh() re-runs
        // `measure` through the refreshInit hook below, keeping the two in step.
        if ('ResizeObserver' in window) {
            let first = true;
            new ResizeObserver(() => {
                if (first) {
                    first = false;
                    return;
                } // fires once on observe
                sync();
                ScrollTrigger.refresh();
            }).observe(track);
        }

        window.addEventListener('resize', sync);
        ScrollTrigger.addEventListener('refreshInit', measure);

        // ---- Arrows ------------------------------------------------------------
        // Panels are reached by scrolling the PAGE to the offset that centres them,
        // so the buttons stay honest: the URL bar, the scrollbar and the effect all
        // agree, and the motion is the same one the wheel produces.
        const goTo = (i) => {
            if (!trigger) return;
            const p = stops[clamp(i, 0, live.length - 1)];
            const y = trigger.start + p * (trigger.end - trigger.start);

            if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1 });
            else window.scrollTo({ top: y, behavior: 'smooth' });
        };

        prevBtn?.addEventListener('click', () => goTo(step - 1));
        nextBtn?.addEventListener('click', () => goTo(step + 1));
    }

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const pad = (n) => String(n).padStart(2, '0');

    // Index of the value in `list` closest to `target`. Ties go to the first.
    function nearestTo(list, target) {
        let best = Infinity;
        let at = 0;
        for (let i = 0; i < list.length; i++) {
            const d = Math.abs(list[i] - target);
            if (d < best) {
                best = d;
                at = i;
            }
        }
        return at;
    }

    /**
     * parallax.js — GSAP ScrollTrigger-powered parallax effects + vanilla mouse parallax
     *
     * Effects:
     *   [data-parallax-speed]  — scroll-speed depth layers (GSAP scrub)
     *   .parallax-zoom-inner   — zoom on scroll (GSAP scrub, scale 1 → 1.15)
     *   .parallax-mouse-layer[data-depth]  — mouse parallax (vanilla JS)
     *
     * Mouse parallax runs regardless of prefers-reduced-motion.
     * GSAP effects are skipped when prefers-reduced-motion is active.
     * GSAP is fetched only for the scroll effects, and only on a page that has
     * one (gsap-loader.js, which also syncs ScrollTrigger with Lenis).
     */

    async function initParallax() {
        // Mouse parallax is a direct response to input — exempt from reduced-motion
        initMouseParallax();

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const layers = document.querySelectorAll('[data-parallax-speed]');
        const inners = document.querySelectorAll('.parallax-zoom-inner');
        if (!layers.length && !inners.length) return;

        const { gsap } = await loadGsap();
        initSpeedLayers(gsap, layers);
        initZoomParallax(gsap, inners);
    }

    function initSpeedLayers(gsap, layers) {
        layers.forEach((el) => {
            const speed = parseFloat(el.dataset.parallaxSpeed) || 0.3;
            const scene = el.closest('.parallax-layers-scene') || el.parentElement;

            gsap.fromTo(
                el,
                { y: -(speed * 150) },
                {
                    y: speed * 150,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: scene,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                },
            );
        });
    }

    function initZoomParallax(gsap, inners) {
        inners.forEach((el) => {
            const container = el.closest('.parallax-zoom') || el.parentElement;

            gsap.fromTo(
                el,
                { scale: 1 },
                {
                    scale: 1.15,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: container,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: true,
                    },
                },
            );
        });
    }

    function initMouseParallax() {
        const containers = document.querySelectorAll('.parallax-mouse');
        if (!containers.length) return;

        containers.forEach((container) => {
            const layers = Array.from(
                container.querySelectorAll('.parallax-mouse-layer[data-depth]'),
            );
            if (!layers.length) return;

            window.addEventListener(
                'mousemove',
                (e) => {
                    const mx = (e.clientX / window.innerWidth - 0.5) * 2;
                    const my = (e.clientY / window.innerHeight - 0.5) * 2;

                    layers.forEach((layer) => {
                        const depth = parseFloat(layer.dataset.depth) || 20;
                        layer.style.transform = `translate(${mx * depth}px, ${my * depth}px)`;
                    });
                },
                { passive: true },
            );
        });
    }

    /**
     * section-color.js — the page takes the colour of the section you are reading
     *
     * Inside a `[data-section-colors]` scope, whichever `[data-section-bg]` section
     * is crossing the middle of the viewport writes its colours onto the scope as
     * two custom properties. sections.css transitions between them, so scrolling
     * through the list reads as one surface changing colour rather than a stack of
     * coloured blocks scrolling past.
     *
     * Markup:
     *   <div data-section-colors>
     *     <section data-section-bg="var(--color-tertiary-200)">…</section>
     *     <section data-section-bg="#1d1d20" data-section-text="light">…</section>
     *
     * Attributes:
     *   data-section-bg    any CSS colour — a token, a hex, a gradient-free value
     *   data-section-text  "light" | "dark" | any CSS colour (default: dark)
     *
     * The observer is one 1px band across the middle of the viewport
     * (`rootMargin: -50% 0px`), so a section becomes active exactly as its middle
     * third reaches the reader's eye, and scrolling back up hands the colour back
     * with no extra bookkeeping. No scroll listener, no GSAP, no layout reads.
     *
     * Sections shorter than half the viewport can leave the band empty between
     * them; the last colour then simply stays, which is the behaviour you want.
     *
     * Ports to a Next.js effect hook unchanged — it only reads the DOM it is given.
     */

    const TEXT = {
        light: 'var(--color-light)',
        dark: 'var(--color-dark)',
    };

    function initSectionColor() {
        const scopes = document.querySelectorAll('[data-section-colors]');
        if (!scopes.length) return;

        scopes.forEach((scope) => {
            const sections = Array.from(scope.querySelectorAll('[data-section-bg]'));
            if (!sections.length) return;

            const paint = (section) => {
                scope.style.setProperty('--section-color-bg', section.dataset.sectionBg);
                const text = section.dataset.sectionText;
                scope.style.setProperty('--section-color-text', TEXT[text] || text || TEXT.dark);
            };

            // Paint the first section up front: the band below only fires once a
            // section has scrolled INTO the middle of the screen, and until then
            // the scope would sit on the page's default background.
            paint(sections[0]);

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) paint(entry.target);
                    });
                },
                { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
            );

            sections.forEach((section) => observer.observe(section));
        });
    }

    /**
     * Scroll-driven crossed bands with lerp easing.
     * `target` accumulates raw scroll delta; `current` follows with lerp
     * each rAF frame so motion eases in/out naturally.
     * Both values are kept unbounded — wrapping is applied only when
     * writing to the CSS property to avoid lerp discontinuities.
     */
    function initScrollMarquees() {
        const strips = [];

        document
            .querySelectorAll('.marquee-crossed--scroll .marquee, .marquee-scroll .marquee')
            .forEach((el) => {
                strips.push({
                    el,
                    current: 0,
                    target: 0,
                    reverse: el.classList.contains('marquee--reverse'),
                });
            });

        if (!strips.length) return;

        const EASE = 0.08; // fraction of distance covered per frame (~60 fps)
        const MULTIPLIER = 0.5; // marquee px per scroll px

        let lastY = window.scrollY;

        window.addEventListener(
            'scroll',
            () => {
                const delta = window.scrollY - lastY;
                lastY = window.scrollY;
                strips.forEach((s) => {
                    s.target += delta * MULTIPLIER * (s.reverse ? 1 : -1);
                });
            },
            { passive: true },
        );

        const tick = () => {
            strips.forEach((s) => {
                s.current += (s.target - s.current) * EASE;

                const half = s.el.scrollWidth / 2;
                if (!half) return;

                // Wrap only for display — keeps lerp smooth across loop boundaries
                let pos = s.current % half;
                if (pos > 0) pos -= half;

                s.el.style.setProperty('--_pos', `${pos}px`);
            });
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);
    }

    const FOCUSABLE =
        'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

    function initMarquees() {
        const marquees = Array.from(document.querySelectorAll('.marquee'), (el) => {
            const originals = Array.from(el.children);

            /** Append one more copy of the original run. */
            const addPass = () =>
                originals.forEach((child) => {
                    const clone = child.cloneNode(true);
                    clone.setAttribute('aria-hidden', 'true');
                    if (clone.tagName === 'IMG') clone.alt = '';
                    // Hidden copies stay clickable but leave the Tab order (not inert, which would block the click)
                    for (const node of [clone, ...clone.querySelectorAll('*')]) {
                        if (node.matches(FOCUSABLE)) node.tabIndex = -1;
                    }
                    el.append(clone);
                });

            return { el, addPass, vertical: el.classList.contains('marquee--vertical') };
        });

        // The animation translates by half the track, so the track has to be at
        // least twice the visible width or the loop shows a gap. A single clone
        // is only enough when the original run already fills the container —
        // short rows (four words, a handful of logos) need several passes.
        // Vertical photo columns: the run of images is already far taller than
        // the column, and their heights are unknown until they load — measuring
        // width here never grows, so a single copy is the whole loop.
        //
        // All the strips of a page grow together, a pass at a time: every strip is
        // measured, then every short one gets its pass. Measuring and growing one
        // strip after the other made the browser lay the page out again for each
        // pass of each strip.
        marquees.forEach(({ addPass }) => addPass());
        let short = marquees.filter(({ vertical }) => !vertical);
        for (let pass = 0; pass < 8 && short.length; pass++) {
            short = short.filter((strip) => {
                // The visible width is read once, before the strip grows any further
                strip.visible ??= strip.el.parentElement?.offsetWidth || strip.el.offsetWidth;
                return strip.el.scrollWidth < strip.visible * 2;
            });
            short.forEach(({ addPass }) => addPass());
        }

        marquees.forEach(({ el, vertical }) => {
            // data-speed (px/s) → compute animation-duration from the real loop
            // length. Vertical columns default to a slow drift so the pace holds
            // however many (or however tall) the photos are.
            const speed = parseFloat(el.dataset.speed) || (vertical ? 30 : NaN);
            const applySpeed = () => {
                // Half the track is one loop, whatever number of passes it took.
                const loop = (vertical ? el.scrollHeight : el.scrollWidth) / 2;
                if (loop > 0) el.style.animationDuration = `${(loop / speed).toFixed(2)}s`;
            };
            if (!isNaN(speed) && speed > 0) document.fonts.ready.then(applySpeed);

            // Image loading reveal — [data-loading] holds the strip at opacity 0 so a
            // half-measured row never flashes. Getting out of that state has to be
            // failure-proof: the strip is invisible until it happens.
            const imgs = Array.from(el.querySelectorAll('img'));
            if (imgs.length === 0) return;

            const wrap = el.closest('.marquee-wrap');
            if (!wrap) return;

            wrap.dataset.loading = '';

            const reveal = () => {
                // Image sizes are only known now — re-time the loop from its real length.
                if (!isNaN(speed) && speed > 0) applySpeed();
                wrap.removeAttribute('data-loading');
                wrap.classList.add('is-ready');
            };

            // Re-test every image on each event rather than counting down a list
            // captured at init. A `loading="lazy"` image below the fold has not
            // started fetching yet, and one that finishes between the snapshot and
            // the listener never fires `load` — either way a counter stalls one
            // short and the strip stays hidden for good.
            const settle = () => {
                if (!imgs.every((img) => img.complete)) return false;
                reveal();
                return true;
            };

            if (settle()) return;

            imgs.forEach((img) => {
                img.addEventListener('load', settle);
                img.addEventListener('error', settle);
            });

            // Last resort: never leave a strip permanently invisible because one
            // image stalled or was never scrolled into view.
            setTimeout(reveal, 3000);
        });
    }

    /**
     * counters.js — Animated number counters
     *
     * Targets elements with [data-counter].
     * Animation starts when the element enters the viewport.
     *
     * Usage:
     *   <span data-counter="250" data-suffix="+" data-prefix="$" data-duration="2000">0</span>
     *
     * Attributes:
     *   data-counter   — target value; write it with decimals to count in decimals ("4.8")
     *   data-decimals  — decimal places to show, when they differ from the value as written
     *   data-prefix / data-suffix — text before / after the number
     *   data-duration  — animation duration in ms (default: 2000)
     *
     * Wrap a counter in .counter--odometer for a slot-machine style reveal,
     * where each digit rolls up from below into place. Screen readers get the
     * final value once, as text; the reels themselves are hidden from them.
     */

    /**
     * Build the odometer reveal: every digit gets a vertical reel that rolls
     * up from below into its final value. Non-digit characters (commas, %, $,
     * +) are rendered as static cells so prefixes and suffixes still work.
     */
    // Group digits the way the template's copy is written, not the way the
    // visitor's browser is configured — a page that reads "1,284 reviews" in its
    // own sentence must not print "1.284" in the counter beside it.
    const format = (n, decimals = 0) =>
        n.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });

    // Target value and decimal places of a counter: data-decimals wins, otherwise
    // as many places as data-counter is written with ("4.8" → 1, "250" → 0).
    const read = (el) => {
        const written = el.dataset.counter.trim();
        const set = parseInt(el.dataset.decimals, 10);
        const decimals = set >= 0 ? Math.min(set, 6) : (written.split('.')[1]?.length ?? 0);
        return { target: parseFloat(written) || 0, decimals };
    };

    function buildOdometer(el, value, decimals, prefix, suffix, duration) {
        const text = prefix + format(value, decimals) + suffix;
        const loops = 1; // a single 0–9 pre-spin keeps the roll subtle
        const rollDuration = Math.round(duration * 1.6); // slower, longer settle than a plain count-up

        el.classList.add('counter-number--odometer');
        el.textContent = '';

        const reels = [];

        for (const [index, ch] of [...text].entries()) {
            if (ch >= '0' && ch <= '9') {
                const digit = document.createElement('span');
                digit.className = 'counter-odometer-digit';
                digit.setAttribute('aria-hidden', 'true');

                const reel = document.createElement('span');
                reel.className = 'counter-odometer-reel';

                const target = loops * 10 + parseInt(ch, 10);
                for (let n = 0; n <= target; n++) {
                    const cell = document.createElement('span');
                    cell.textContent = n % 10;
                    reel.append(cell);
                }

                digit.append(reel);
                el.append(digit);
                reels.push({ reel, target, index });
            } else {
                const stat = document.createElement('span');
                stat.className = 'counter-odometer-static';
                stat.setAttribute('aria-hidden', 'true');
                stat.textContent = ch;
                el.append(stat);
            }
        }

        // The value as one piece of text, for assistive tech only
        const spoken = document.createElement('span');
        spoken.className = 'counter-odometer-value';
        spoken.textContent = text;
        el.append(spoken);

        // Two frames so the reels are laid out at translateY(0) before they roll
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                reels.forEach(({ reel, target, index }) => {
                    reel.style.transition = `transform ${rollDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                    reel.style.transitionDelay = `${index * 120}ms`;
                    reel.style.transform = `translateY(-${target}em)`;
                });
            }),
        );
    }

    function initCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        if (!counters.length) return;

        // Resolve the circular-progress ring for a counter, if it has one
        const ringOf = (el) => el.closest('.counter--circle')?.querySelector('.counter-circle-bar');

        // Reduced motion: every counter shows its final value, and its ring the matching fill, at once
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            counters.forEach((el) => {
                const { prefix = '', suffix = '' } = el.dataset;
                const { target, decimals } = read(el);
                el.textContent = prefix + format(target, decimals) + suffix;
                const ring = ringOf(el);
                if (!ring) return;
                const length = ring.getTotalLength();
                ring.style.strokeDasharray = length;
                ring.style.strokeDashoffset = length * (1 - target / 100);
            });
            return;
        }

        // Pre-set every progress ring to its empty state so it fills from zero
        counters.forEach((el) => {
            const ring = ringOf(el);
            if (!ring) return;
            const length = ring.getTotalLength();
            ring.style.strokeDasharray = length;
            ring.style.strokeDashoffset = length;
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    const el = entry.target;
                    const { target, decimals } = read(el);
                    const suffix = el.dataset.suffix ?? '';
                    const prefix = el.dataset.prefix ?? '';
                    const duration = parseInt(el.dataset.duration ?? '2000', 10);

                    // Odometer style: build rolling digit reels instead of counting up
                    if (el.closest('.counter--odometer')) {
                        buildOdometer(el, target, decimals, prefix, suffix, duration);
                        observer.unobserve(el);
                        return;
                    }

                    const ring = ringOf(el);
                    const ringLength = ring ? ring.getTotalLength() : 0;
                    const startTime = performance.now();

                    const step = (now) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // Ease-out exponential: covers ~75% of the value in the first 20% of time,
                        // then crawls to the final number — most dramatic for large values
                        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                        const value = eased * target;

                        el.textContent = prefix + format(value, decimals) + suffix;

                        // Sync the progress ring with the number (value is a 0–100 percentage)
                        if (ring) ring.style.strokeDashoffset = ringLength * (1 - value / 100);

                        if (progress < 1) requestAnimationFrame(step);
                    };

                    requestAnimationFrame(step);
                    observer.unobserve(el);
                });
            },
            { threshold: 0.5 },
        );

        counters.forEach((el) => observer.observe(el));
    }

    /**
     * progress-bars.js — Scroll-triggered progress bar fill animation
     *
     * Targets elements with [data-progress].
     * Each bar fills from 0 to its target width when it enters the viewport.
     * Indeterminate bars (no data-progress attribute) are left untouched.
     *
     * Usage:
     *   <div class="progress progress--primary">
     *     <div class="progress-bar" data-progress="72" data-duration="1600"></div>
     *   </div>
     *
     * Attributes:
     *   data-progress  — target fill percentage, e.g. "72" for 72 %
     *   data-duration  — animation duration in ms (default: 1600)
     *
     * Under prefers-reduced-motion every bar is drawn at its target width at once.
     */

    function initProgressBars() {
        const bars = document.querySelectorAll('.progress-bar[data-progress]');
        if (!bars.length) return;

        // Reduced motion: no empty start and no sweep — the bar simply is its value
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
            bars.forEach((bar) => {
                bar.style.transition = 'none';
                bar.style.width = `${parseFloat(bar.dataset.progress)}%`;
            });
            return;
        }

        // Start every bar at 0 so the fill always animates in from empty
        bars.forEach((bar) => {
            bar.style.width = '0%';
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    const bar = entry.target;
                    const target = parseFloat(bar.dataset.progress);
                    const duration = parseInt(bar.dataset.duration ?? '1600', 10);

                    // Use rAF so the browser has painted width: 0% before transitioning
                    requestAnimationFrame(() => {
                        bar.style.transition = `width ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
                        bar.style.width = `${target}%`;
                    });

                    observer.unobserve(bar);
                });
            },
            { threshold: 0.4 },
        );

        bars.forEach((bar) => observer.observe(bar));
    }

    // GLightbox's styles stay in the template's stylesheet; its script is fetched
    // only on a page with a .glightbox link (vendor/glightbox.js).

    // Phosphor glyphs instead of GLightbox's stock SVGs, so the chrome matches
    // every other arrow on the site (the icon font is already loaded globally).
    const ICONS = {
        close: '<i class="ph ph-x" aria-hidden="true"></i>',
        next: '<i class="ph ph-arrow-right" aria-hidden="true"></i>',
        prev: '<i class="ph ph-arrow-left" aria-hidden="true"></i>',
    };

    /**
     * Initialize GLightbox for any [class="glightbox"] links/images on the page.
     * No-op when the page has no lightbox targets.
     *
     * Galleries (2+ items) get a "03 / 06" counter in the top-left corner.
     *
     * Usage: <a href="image.jpg" class="glightbox">…</a>
     */
    async function initLightbox() {
        if (!document.querySelector('.glightbox')) return;

        const { GLightbox } = await DraftmangoVendor.load('glightbox');

        const lightbox = GLightbox({
            selector: '.glightbox',
            touchNavigation: true,
            loop: true,
            zoomable: true,
            svg: ICONS,
        });

        const pad = (n) => String(n).padStart(2, '0');

        const renderCounter = (index) => {
            const container = document.querySelector('.glightbox-container .gcontainer');
            if (!container) return;
            let counter = container.querySelector('.glightbox-counter');
            const total = lightbox.elements.length;
            if (total < 2) {
                counter?.remove();
                return;
            }
            if (!counter) {
                counter = document.createElement('div');
                counter.className = 'glightbox-counter';
                counter.setAttribute('aria-live', 'polite');
                container.append(counter);
            }
            counter.innerHTML = `<span class="glightbox-counter-current">${pad(index + 1)}</span><span>/</span><span>${pad(total)}</span>`;
        };

        lightbox.on('open', () => renderCounter(lightbox.index ?? 0));
        lightbox.on('slide_before_change', ({ current }) => renderCounter(current.index));

        // Single-icon image frames: forward a click anywhere on the frame to its
        // lone .glightbox trigger, so the whole image is clickable (the frame's
        // cursor-pointer already advertises it). A real click on the icon is left
        // alone for GLightbox to handle. Frames with multiple icons keep each icon
        // as its own discrete target.
        document.querySelectorAll('.img-frame').forEach((frame) => {
            const links = frame.querySelectorAll('.glightbox');
            if (links.length !== 1) return;
            frame.addEventListener('click', (event) => {
                if (event.target.closest('.glightbox')) return;
                links[0].click();
            });
        });
    }

    /**
     * gallery-filter.js — Category filtering for image galleries
     *
     * Wires up sort/filter pill buttons to toggle gallery item visibility.
     * Each [data-gallery-filter] block holds its own filter buttons
     * (.gallery-filter, each with a data-filter value) and a grid
     * ([data-gallery-grid]) whose item children carry a single data-category.
     *
     * Clicking a pill moves .is-active to it, then shows items whose category
     * matches its data-filter (or all items when data-filter is "all") and hides
     * the rest. A brief .gallery-grid--animating class on the grid replays the
     * galleryFadeIn keyframe (defined in gallery.css) on the newly visible items.
     *
     * No-op when the page has no [data-gallery-filter] blocks. Supports multiple
     * independent blocks. Framework-agnostic plain DOM (Next.js port friendly).
     *
     * Usage:
     *   <div data-gallery-filter>
     *     <div class="gallery-filters">
     *       <button class="gallery-filter is-active" data-filter="all">All</button>
     *       <button class="gallery-filter" data-filter="nature">Nature</button>
     *     </div>
     *     <div class="gallery-mosaic" data-gallery-grid>
     *       <a class="img-frame gallery-item" data-category="nature">…</a>
     *     </div>
     *   </div>
     */
    function initGalleryFilter() {
        const blocks = document.querySelectorAll('[data-gallery-filter]');
        if (!blocks.length) return;

        blocks.forEach((block) => {
            const buttons = block.querySelectorAll('.gallery-filter');
            const grid = block.querySelector('[data-gallery-grid]');
            if (!buttons.length || !grid) return;

            const items = grid.querySelectorAll('.gallery-item');

            // Opt-in arrival cascade: `data-gallery-reveal` on the wrapper replays
            // the same staggered fade the filter uses, once, on load. Numbering the
            // items here rather than in the markup is what lets a client add or
            // remove a card without renumbering the rest.
            if (block.hasAttribute('data-gallery-reveal')) {
                items.forEach((item, i) => item.style.setProperty('--stagger', i));
                grid.classList.add('gallery-grid--animating');
            }

            buttons.forEach((button) => {
                button.addEventListener('click', () => {
                    // Move the active state to the clicked pill
                    buttons.forEach((b) => b.classList.remove('is-active'));
                    button.classList.add('is-active');

                    const filter = button.dataset.filter;

                    // Show/hide by category, and number the visible items in order
                    // so CSS can stagger their fade-in (--stagger × delay).
                    let visible = 0;
                    items.forEach((item) => {
                        const match = filter === 'all' || item.dataset.category === filter;
                        item.classList.toggle('is-hidden', !match);
                        if (match) item.style.setProperty('--stagger', visible++);
                    });

                    // Replay the fade-in: drop the class, force a reflow so the
                    // animation can re-trigger, then re-add it.
                    grid.classList.remove('gallery-grid--animating');
                    void grid.offsetWidth;
                    grid.classList.add('gallery-grid--animating');
                });
            });
        });
    }

    /**
     * media.js — Click-to-play media facades
     *
     * Swaps a lightweight poster facade for the real embed iframe only
     * after the user clicks, keeping page weight down until requested.
     * No-op when the page has no facade targets.
     *
     * Usage:
     *   <div class="media-embed media-facade" data-media-src="https://…/embed/ID?autoplay=1">
     *     <img src="poster.jpg" alt="Video title">
     *     <button class="media-play-btn" aria-label="Play video">▶</button>
     *   </div>
     */
    function initMediaFacades() {
        const facades = document.querySelectorAll('.media-facade');
        if (!facades.length) return;

        facades.forEach((facade) => {
            const activate = () => {
                const src = facade.dataset.mediaSrc;
                if (!src || facade.dataset.mediaActive) return;
                facade.dataset.mediaActive = 'true';

                const poster = facade.querySelector('img');
                const iframe = document.createElement('iframe');
                iframe.src = src;
                iframe.title = (poster && poster.alt) || 'Video';
                iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
                iframe.allowFullscreen = true;
                iframe.loading = 'lazy';

                facade.replaceChildren(iframe);
                iframe.tabIndex = -1;
                iframe.focus();
                facade.classList.remove('media-facade');
                facade.style.cursor = '';
            };

            facade.addEventListener('click', activate);
        });
    }

    /**
     * before-after.js — Before / After image comparison slider
     *
     * Drives the `--ba-pos` custom property on every [data-before-after] element
     * from pointer drag, optional hover-tracking, and keyboard. Keeps
     * aria-valuenow in sync for screen readers. No-op when no targets exist.
     *
     * Options (data attributes on the wrapper):
     *   data-ba-start="0..100"   initial split position (default 50)
     *   data-ba-hover            handle follows the cursor without pressing
     *   class .before-after--vertical   slide along the Y axis
     *
     * Markup:
     *   <div class="before-after" data-before-after data-ba-start="50">
     *     <img class="ba-before" src="…" alt="Before — …">
     *     <img class="ba-after"  src="…" alt="After — …">
     *     <button class="ba-handle" role="slider" aria-valuemin="0"
     *             aria-valuemax="100" aria-valuenow="50" tabindex="0">…</button>
     *   </div>
     */
    function initBeforeAfter() {
        const widgets = document.querySelectorAll('[data-before-after]');
        if (!widgets.length) return;

        widgets.forEach((el) => {
            const handle = el.querySelector('.ba-handle');
            const isVertical = el.classList.contains('before-after--vertical');
            const hoverMode = el.hasAttribute('data-ba-hover');
            const clamp = (n) => Math.min(100, Math.max(0, n));

            let pos = clamp(parseFloat(el.dataset.baStart) || 50);

            const apply = (animate) => {
                el.classList.toggle('is-animating', !!animate);
                el.style.setProperty('--ba-pos', `${pos}%`);
                if (handle) handle.setAttribute('aria-valuenow', Math.round(pos));
            };

            const posFromEvent = (e) => {
                const r = el.getBoundingClientRect();
                return isVertical
                    ? clamp(((e.clientY - r.top) / r.height) * 100)
                    : clamp(((e.clientX - r.left) / r.width) * 100);
            };

            // --- Pointer drag ---
            let dragging = false;

            const onDown = (e) => {
                dragging = true;
                el.setPointerCapture?.(e.pointerId);
                pos = posFromEvent(e);
                apply(false);
            };
            const onMove = (e) => {
                if (hoverMode && e.pointerType === 'mouse' && !dragging) {
                    pos = posFromEvent(e);
                    apply(false);
                    return;
                }
                if (!dragging) return;
                pos = posFromEvent(e);
                apply(false);
            };
            const onUp = (e) => {
                dragging = false;
                el.releasePointerCapture?.(e.pointerId);
            };

            el.addEventListener('pointerdown', onDown);
            el.addEventListener('pointermove', onMove);
            el.addEventListener('pointerup', onUp);
            el.addEventListener('pointercancel', onUp);

            // --- Keyboard ---
            if (handle) {
                handle.addEventListener('keydown', (e) => {
                    const dec = isVertical ? ['ArrowUp'] : ['ArrowLeft'];
                    const inc = isVertical ? ['ArrowDown'] : ['ArrowRight'];
                    let step = 0;
                    if (dec.includes(e.key)) step = e.shiftKey ? -10 : -1;
                    else if (inc.includes(e.key)) step = e.shiftKey ? 10 : 1;
                    else if (e.key === 'PageDown') step = -10;
                    else if (e.key === 'PageUp') step = 10;
                    else if (e.key === 'Home') {
                        pos = 0;
                        apply(true);
                        e.preventDefault();
                        return;
                    } else if (e.key === 'End') {
                        pos = 100;
                        apply(true);
                        e.preventDefault();
                        return;
                    } else return;
                    pos = clamp(pos + step);
                    apply(true);
                    e.preventDefault();
                });
            }

            apply(false);
        });
    }

    /**
     * maps.js — Declarative Leaflet map widgets
     *
     * Initialises every [data-map] element as an interactive Leaflet map.
     * Markers are declared as hidden child elements; the module reads them,
     * creates Leaflet markers, then removes the source nodes from the DOM.
     * No-op when no targets exist: Leaflet is fetched only on a page with a map
     * (vendor/leaflet.js).
     *
     * Map options (data attributes on the [data-map] wrapper):
     *   data-tiles="light|voyager|dark"   tile-layer preset (default: light)
     *   data-lat="…" data-lng="…"         explicit centre coordinate
     *   data-zoom="13"                     initial zoom level (default: 13)
     *   data-scroll-zoom                   scroll-wheel zoom, armed by a click on the map and
     *                                      released when the pointer leaves (omit to disable)
     *   data-touch-drag                    keep one-finger panning on touch screens
     *   data-map-hint="…"                  wording of the two-finger hint
     *
     * The page keeps its scroll: a wheel over a map scrolls the page until the map
     * is clicked, and on touch screens one finger scrolls the page while two move
     * and zoom the map (a short hint says so).
     *
     * Marker declaration (child elements with [data-marker]):
     *   data-lat="…" data-lng="…"         required — marker position
     *   data-label="…"                     tooltip / accessible title
     *   data-marker-open                   open this marker's popup on load
     *   inner HTML                         becomes the popup content (optional)
     *
     * Centre / bounds resolution (in order):
     *   1. Explicit data-lat + data-lng on the wrapper → setView
     *   2. Fit bounds around all markers (padded)
     *   3. Fallback to [0, 0] zoom 2
     *
     * Sidebar focus buttons ([data-map-focus]):
     *   Place inside a container that has [data-map-target="<map-element-id>"].
     *   data-map-focus="<marker-index>"   flies to that marker and opens its popup.
     *   Active state: .is-active on the clicked button (others cleared).
     *
     * Markup:
     *   <div id="map" class="map" data-map data-tiles="voyager"
     *        data-lat="48.8566" data-lng="2.3522" data-zoom="12">
     *     <div data-marker data-lat="48.8566" data-lng="2.3522" data-label="Paris">
     *       <strong>Paris</strong><br>Capital of France
     *     </div>
     *   </div>
     *
     *   <ul data-map-target="map">
     *     <li><button data-map-focus="0">Paris</button></li>
     *   </ul>
     */
    // Keyless tile sources. CARTO's basemaps now stamp "API KEY REQUIRED" across
    // every tile for unregistered use, so the presets point at OpenStreetMap
    // instead. `dark` uses the same tiles and is recoloured in CSS
    // (`.map[data-tiles="dark"] .leaflet-tile-pane` in maps.css) — swap any preset
    // for your own provider URL if you have a key.
    const TILES = {
        light: {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors',
        },
        voyager: {
            url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors, Humanitarian OSM Team',
        },
        dark: {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; OpenStreetMap contributors',
        },
    };

    const brandPin = (L) =>
        L.divIcon({
            className: 'map-pin',
            html: '<i class="ph-fill ph-map-pin" aria-hidden="true"></i>',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -30],
        });

    async function initMaps() {
        const widgets = document.querySelectorAll('[data-map]');
        if (!widgets.length) return;

        const { L } = await DraftmangoVendor.load('leaflet');

        widgets.forEach((el) => {
            const tiles = TILES[el.dataset.tiles] || TILES.light;
            const zoom = parseInt(el.dataset.zoom, 10) || 13;

            // One finger belongs to the page on a touch screen; two pan and zoom the map
            const cooperative =
                matchMedia('(pointer: coarse)').matches && !el.hasAttribute('data-touch-drag');

            const map = L.map(el, {
                scrollWheelZoom: false,
                dragging: !cooperative,
                zoom,
            });

            if (el.hasAttribute('data-scroll-zoom')) {
                el.addEventListener('pointerdown', () => map.scrollWheelZoom.enable());
                el.addEventListener('pointerleave', () => map.scrollWheelZoom.disable());
            }

            if (cooperative) {
                el.dataset.mapHint ??= 'Use two fingers to move the map';
                let timer;
                el.addEventListener(
                    'touchmove',
                    (e) => {
                        if (e.touches.length !== 1) return;
                        el.classList.add('is-hinting');
                        clearTimeout(timer);
                        timer = setTimeout(() => el.classList.remove('is-hinting'), 1200);
                    },
                    { passive: true },
                );
            }
            L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 19 }).addTo(map);

            const markerEls = el.querySelectorAll('[data-marker]');
            const markers = [];
            let autoOpen = null;
            markerEls.forEach((m) => {
                const lat = parseFloat(m.dataset.lat);
                const lng = parseFloat(m.dataset.lng);
                if (Number.isNaN(lat) || Number.isNaN(lng)) return;
                const marker = L.marker([lat, lng], {
                    icon: brandPin(L),
                    title: m.dataset.label || '',
                });
                const html = m.innerHTML.trim();
                // autoPanPadding keeps the opened popup off the map edges (Leaflet's
                // default is just 5px, which glues a tall popup to the top border).
                if (html) marker.bindPopup(html, { autoPanPadding: L.point(24, 32) });
                marker.addTo(map);
                markers.push(marker);
                if (m.hasAttribute('data-marker-open') && html) autoOpen = marker;
                m.remove();
            });

            const lat = parseFloat(el.dataset.lat);
            const lng = parseFloat(el.dataset.lng);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                map.setView([lat, lng], zoom);
            } else if (markers.length) {
                map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2));
            } else {
                map.setView([0, 0], 2);
            }

            if (autoOpen) autoOpen.openPopup();

            el._leafletMap = map;
            el._leafletMarkers = markers;
        });

        document.querySelectorAll('[data-map-focus]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const list = btn.closest('[data-map-target]');
                const target = list && document.getElementById(list.dataset.mapTarget);
                const map = target && target._leafletMap;
                if (!map) return;
                const idx = parseInt(btn.dataset.mapFocus, 10);
                const marker = target._leafletMarkers[idx];
                if (!marker) return;
                map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15));
                marker.openPopup();
                list.querySelectorAll('[data-map-focus]').forEach((b) =>
                    b.classList.remove('is-active'),
                );
                btn.classList.add('is-active');
            });
        });
    }

    /**
     * instagram.js — Live Instagram feed via Behold.so JSON endpoint
     *
     * Fetches a real Instagram feed from Behold's public JSON API and renders
     * the latest photos into any `.instagram-feed` container that has a
     * `data-instagram-feed` attribute set to a valid Behold feed ID.
     *
     * Client setup:
     *   1. Create a free feed at https://behold.so and connect your Instagram account.
     *   2. Copy your feed ID from the Behold dashboard.
     *   3. Set `data-instagram-feed="<feedId>"` on a `.instagram-feed` container.
     *      Leave the attribute empty (data-instagram-feed="") to keep static fallback images.
     *
     * Optional attributes:
     *   data-instagram-limit  — number of posts to show (default: 12)
     *
     * Supported Behold JSON fields per post:
     *   permalink        — URL of the Instagram post
     *   mediaUrl         — full-size media URL
     *   thumbnailUrl     — thumbnail URL (videos)
     *   caption          — post caption text
     *   prompt           — alt prompt fallback
     *   mediaType        — IMAGE | VIDEO | CAROUSEL_ALBUM
     *   sizes            — object with small/medium/large/full sub-objects each having mediaUrl
     *
     * On success the static fallback children are replaced with live photo cells.
     * On any error (network failure, bad feed ID, non-ok response) the static
     * fallback stays in place and a console.warn is emitted — no throw propagates.
     */

    /**
     * Escape a string so it is safe to insert as an HTML attribute value.
     * Replaces &, ", <, >, and ' with HTML entities.
     *
     * @param {string} str
     * @returns {string}
     */
    function escapeAttr(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Only accept http(s) URLs; fall back to a safe default otherwise.
     * Prevents a `javascript:` (or other non-http) scheme from the API ever
     * reaching an href/src. This is an additional scheme check layered on top
     * of escapeAttr, not a replacement for it.
     *
     * @param {string} u         — candidate URL
     * @param {string} fallback  — value to use when u is not http(s)
     * @returns {string}
     */
    const safeUrl = (u, fallback = '#') => (/^https?:\/\//i.test(u || '') ? u : fallback);

    /**
     * Build a single feed cell for one Behold post.
     *
     * @param {object} post  — one entry from the Behold posts array
     * @returns {string}     — HTML string for the cell
     */
    function buildCell(post) {
        // Prefer medium → small thumbnail → thumbnailUrl → mediaUrl
        const rawThumb =
            post.sizes?.medium?.mediaUrl ||
            post.sizes?.small?.mediaUrl ||
            post.thumbnailUrl ||
            post.mediaUrl ||
            '';
        // Reject non-http(s) schemes; empty src is harmless, a javascript: src is not
        const thumb = safeUrl(rawThumb, '');

        const link = safeUrl(post.permalink, '#');

        // Trim caption to ~100 chars; strip newlines; fall back to prompt or default
        const rawCaption = (post.caption || post.prompt || 'Instagram photo')
            .replace(/[\r\n]+/g, ' ')
            .trim();
        const alt = rawCaption.length > 100 ? `${rawCaption.slice(0, 97)}…` : rawCaption;

        return [
            `<a class="img-frame img-frame-rounded img-frame-zoom img-frame-overlay-dark img-frame-overlay-fade"`,
            `   href="${escapeAttr(link)}" target="_blank" rel="noopener" aria-label="View on Instagram">`,
            `  <img src="${escapeAttr(thumb)}" alt="${escapeAttr(alt)}" loading="lazy">`,
            `  <div class="img-frame-overlay">`,
            `    <div class="img-frame-icons">`,
            `      <span class="img-frame-icon"><i class="ph ph-instagram-logo"></i></span>`,
            `    </div>`,
            `  </div>`,
            `</a>`,
        ].join('\n');
    }

    function initInstagram() {
        const containers = document.querySelectorAll('[data-instagram-feed]');
        if (!containers.length) return;

        containers.forEach(async (el) => {
            const feedId = (el.dataset.instagramFeed || '').trim();

            // Empty attribute = keep static fallback, no fetch
            if (!feedId) return;

            const parsedLimit = parseInt(el.dataset.instagramLimit || '12', 10);
            const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 12;

            try {
                const response = await fetch(
                    `https://feeds.behold.so/${encodeURIComponent(feedId)}`,
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Behold returns { posts: [...] } but guard against a bare array too
                const posts = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.posts)
                      ? data.posts
                      : [];

                if (!posts.length) {
                    throw new Error('Feed returned no posts');
                }

                const cells = posts.slice(0, limit).map(buildCell).join('\n');

                // Replace children only on full success
                el.innerHTML = cells;
            } catch (err) {
                console.warn('[instagram] live feed unavailable, keeping fallback:', err.message);
            }
        });
    }

    /**
     * tabs.js — Travelling indicator for capsule and underline tabs
     *
     * Gives every .tabs-capsule and .tabs-underline bar on the page a
     * <span class="tab-indicator"> that slides to whichever .tab-btn currently
     * carries .is-active (a pill for the capsule, a bar for the underline). The
     * span is injected here, so the markup is identical to every other tab
     * variant — only the wrapper class differs.
     *
     * Position and width travel as two custom properties on the nav, --tab-x and
     * --tab-w, which tabs.css turns into a transform and a width. The nav gets
     * .has-indicator on the first measurement; until then (and permanently, if
     * this script never runs) the active button keeps a static fill, so the
     * selection is never invisible.
     *
     * The active tab is found by class, not by state, which is what keeps the
     * module independent of whatever drives the tabs — Alpine here, a React state
     * hook in a Next.js port. A MutationObserver on the buttons' class attribute
     * is the whole subscription.
     *
     * When the bar is wider than its column it scrolls, and the active tab is
     * kept centred in it.
     *
     * No-op when the page has no .tabs-capsule / .tabs-underline. Framework-agnostic plain DOM
     * (Next.js port friendly).
     *
     * Usage:
     *   <div class="tabs tabs-capsule" x-data="{ tab: 'one' }">
     *     <div class="tabs-nav" role="tablist">
     *       <button class="tab-btn" :class="{ 'is-active': tab === 'one' }" …>One</button>
     *     </div>
     *     <div class="tabs-panels">…</div>
     *   </div>
     */
    function initTabs() {
        const navs = document.querySelectorAll(
            '.tabs-capsule > .tabs-nav, .tabs-underline > .tabs-nav',
        );
        if (!navs.length) return;

        navs.forEach((nav) => {
            const indicator = document.createElement('span');
            indicator.className = 'tab-indicator';
            indicator.setAttribute('aria-hidden', 'true');
            nav.prepend(indicator);

            // Touch swipes scroll the bar, not the page. The blanket
            // data-lenis-prevent would also swallow vertical wheel over the bar
            // and freeze the page while the pointer rests on it.
            nav.setAttribute('data-lenis-prevent-touch', '');

            let placed = false;

            const move = (behavior) => {
                const active = nav.querySelector('.tab-btn.is-active');
                if (!active) return;

                nav.style.setProperty('--tab-x', `${active.offsetLeft}px`);
                nav.style.setProperty('--tab-w', `${active.offsetWidth}px`);

                if (!placed) {
                    // A frame later, so the pill fades in where it belongs rather
                    // than animating out of the left edge.
                    placed = true;
                    requestAnimationFrame(() => nav.classList.add('has-indicator'));
                }

                // Never scrollIntoView: that would move the page as well as the
                // bar. Scrolling the bar itself only touches the bar.
                if (nav.scrollWidth > nav.clientWidth) {
                    nav.scrollTo({
                        left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2,
                        behavior,
                    });
                }
            };

            // The bar opens on the active tab; from then on it travels there.
            move('auto');

            // The buttons announce the change themselves by swapping .is-active.
            const watcher = new MutationObserver((records) => {
                if (records.some((r) => r.target.classList?.contains('tab-btn'))) move('smooth');
            });
            watcher.observe(nav, { subtree: true, attributes: true, attributeFilter: ['class'] });

            // Labels move when the column resizes and again when the webfont
            // lands, and the pill has to follow both.
            new ResizeObserver(() => move('auto')).observe(nav);
            document.fonts?.ready.then(() => move('auto'));
        });
    }

    /**
     * modals.js — Framework-free controller for native <dialog class="modal">
     *
     * Drives the modal system styled in core/css/elements/modals.css. All open/
     * close behavior is wired through event delegation on `document`, so it works
     * for markup added at any time and never double-binds.
     *
     * Data-attribute contract:
     *   [data-modal-target="<id>"]   trigger — opens the dialog with that id
     *   [data-modal-close]           inside a .modal — closes its dialog
     *   [data-modal-auto="<ms>"]     on a <dialog> — auto-opens after <ms> ms
     *   [data-modal-once="<key>"]    pairs with auto — only auto-opens once ever
     *                                (persisted in localStorage as draftmango-modal-<key>)
     *   [data-modal-reset="<key>"]   trigger — clears the once flag and re-opens
     *                                the matching modal (handy for demos)
     *
     * Backdrop click and ESC both close. The CSS handles enter/exit animation via
     * allow-discrete transitions, so JS only calls showModal() / close().
     *
     * Usage: initModals()  (call once, after DOM is ready)
     */

    const STORAGE_PREFIX = 'draftmango-modal-';

    /**
     * Lock/unlock body scroll based on whether any dialog is still open.
     * Locks on open; only unlocks once no .modal[open] remains (multiple modals).
     */
    function syncScrollLock() {
        const anyOpen = document.querySelector('.modal[open]') !== null;
        const root = document.documentElement;

        if (anyOpen) {
            root.classList.add('modal-open');
            root.style.overflow = 'hidden';
        } else {
            root.classList.remove('modal-open');
            root.style.overflow = '';
        }
    }

    /** Resolve the dialog for a given id, only if it is a .modal. */
    function getModal(id) {
        if (!id) return null;
        const el = document.getElementById(id);
        return el && el.matches('dialog.modal') ? el : null;
    }

    /** Open a modal (guards against missing / already-open elements). */
    function openModal(dialog) {
        if (!dialog || dialog.open) return;
        dialog.showModal();
        syncScrollLock();
    }

    function initModals() {
        // ── Open: delegated click on any [data-modal-target] ──────────────
        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-modal-target]');
            if (!trigger) return;
            event.preventDefault();
            openModal(getModal(trigger.dataset.modalTarget));
        });

        // ── Close: delegated click for [data-modal-close] + backdrop ──────
        document.addEventListener('click', (event) => {
            // Explicit close button anywhere inside a modal
            const closer = event.target.closest('[data-modal-close]');
            if (closer) {
                const dialog = closer.closest('dialog.modal');
                if (dialog) dialog.close();
                return;
            }

            // Backdrop click: the click landed on the <dialog> itself, not on
            // its .modal-dialog child (which fills the visible card area).
            const dialog = event.target.closest('dialog.modal');
            if (dialog && event.target === dialog) {
                dialog.close();
            }
        });

        // ── Reset helper (demos): clear once-flag and re-open ─────────────
        document.addEventListener('click', (event) => {
            const resetter = event.target.closest('[data-modal-reset]');
            if (!resetter) return;
            event.preventDefault();

            const key = resetter.dataset.modalReset;
            if (key) {
                try {
                    localStorage.removeItem(STORAGE_PREFIX + key);
                } catch {
                    /* ignore */
                }
            }

            // Re-open the matching once-modal immediately if present.
            const dialog = document.querySelector(
                `dialog.modal[data-modal-once="${CSS.escape(key)}"]`,
            );
            if (dialog) openModal(dialog);
        });

        // ── Per-dialog listeners: cancel (ESC), close, auto-open ──────────
        document.querySelectorAll('dialog.modal').forEach((dialog) => {
            // Run the same close path on native ESC (the `cancel` event).
            dialog.addEventListener('cancel', (event) => {
                event.preventDefault();
                dialog.close();
            });

            // After any close: persist once-flag and re-sync scroll lock.
            dialog.addEventListener('close', () => {
                const onceKey = dialog.dataset.modalOnce;
                if (onceKey) {
                    try {
                        localStorage.setItem(STORAGE_PREFIX + onceKey, '1');
                    } catch {
                        /* ignore */
                    }
                }
                syncScrollLock();
            });

            // Auto-open after a delay, optionally only once per visitor.
            const delay = parseInt(dialog.dataset.modalAuto, 10);
            if (!Number.isNaN(delay)) {
                const onceKey = dialog.dataset.modalOnce;
                let seen = false;
                if (onceKey) {
                    try {
                        seen = localStorage.getItem(STORAGE_PREFIX + onceKey) !== null;
                    } catch {
                        /* ignore */
                    }
                }
                if (!seen) {
                    setTimeout(() => openModal(dialog), Math.max(0, delay));
                }
            }
        });
    }

    /**
     * hover-effects.js — mouse-following hover interactions
     *
     * Powers the two hover effects that can't be done in pure CSS:
     *
     *   data-hover-magnetic="0.3"   element drifts toward the cursor
     *   data-hover-tilt="12"        element tilts in 3D toward the cursor
     *
     * The numeric value is optional (strength / max degrees). All the other
     * hover animations on the page are plain CSS classes and need no JS.
     *
     * Skips touch/coarse pointers and respects prefers-reduced-motion, so it
     * only runs where a real hover makes sense. Pure DOM + pointer events —
     * drops into the future Next.js build unchanged (call from a useEffect).
     */

    function initHoverEffects() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        // Magnetic — translate toward the pointer by a fraction of the offset.
        document.querySelectorAll('[data-hover-magnetic]').forEach((el) => {
            const strength = parseFloat(el.dataset.hoverMagnetic) || 0.3;

            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const mx = e.clientX - (r.left + r.width / 2);
                const my = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
            });
        });

        // 3D tilt — rotate around the centre based on pointer position.
        document.querySelectorAll('[data-hover-tilt]').forEach((el) => {
            const max = parseFloat(el.dataset.hoverTilt) || 12;

            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width; // 0 → 1
                const py = (e.clientY - r.top) / r.height; // 0 → 1
                const ry = (px - 0.5) * 2 * max; // left/right
                const rx = (0.5 - py) * 2 * max; // up/down
                el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
            });
        });
    }

    /**
     * cursor-trail.js — Image trail that follows the pointer
     *
     * As the pointer moves across a host, photos drop along its path: each one
     * glides in from the previous drop point, zooms up, holds for a beat, then
     * zooms out and fades. Framework-free — in React / Next.js call
     * createCursorTrail(ref.current) inside useEffect and return the destroyer.
     *
     *   <section data-cursor-trail>                    cards (default) | "tiles"
     *     <div data-cursor-trail-images hidden>         the image pool
     *       <img src="a.jpg" alt="" loading="lazy">
     *     </div>
     *     …content…
     *   </section>
     *
     * Options — data-* on the host, or the second argument:
     *   data-trail-gap    px of pointer travel between drops
     *   data-trail-life   ms an image holds before it leaves
     *   data-trail-max    images on screen at once
     *   data-trail-layer="front"   draw over the content (CSS only)
     *
     * Decorative: skipped on touch / coarse pointers and under reduced motion.
     */

    const PRESETS = {
        cards: { gap: 90, life: 650, max: 10 },
        tiles: { gap: 70, life: 900, max: 14 },
    };

    const ENTER_MS = 700;
    const LEAVE_MS = 550;
    const MAX_TILT = 8; // degrees
    const EASE_ENTER = 'cubic-bezier(0.16, 1, 0.3, 1)'; // expo-out: snaps in, settles
    const EASE_LEAVE = 'cubic-bezier(0.5, 0, 0.75, 0)'; // quad-in: lingers, then goes

    const noop = () => {};

    const canRun = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const pick = (...values) => {
        for (const v of values) {
            const n = parseFloat(v);
            if (Number.isFinite(n) && n > 0) return n;
        }
    };

    // sizes before srcset before src, so the browser picks one candidate once.
    function copySource(from, to) {
        for (const attr of ['sizes', 'srcset', 'src']) {
            const value = from.getAttribute(attr);
            if (value) to.setAttribute(attr, value);
            else to.removeAttribute(attr);
        }
    }

    function createCursorTrail(host, options = {}) {
        if (!host || !canRun()) return noop;

        const sources = [...host.querySelectorAll('[data-cursor-trail-images] img')];
        if (!sources.length) return noop;

        const preset = PRESETS[host.dataset.cursorTrail] || PRESETS.cards;
        const gap = pick(options.gap, host.dataset.trailGap, preset.gap);
        const life = pick(options.life, host.dataset.trailLife, preset.life);
        const max = Math.round(pick(options.max, host.dataset.trailMax, preset.max));

        // One layer, a fixed pool of nodes recycled oldest-first: no DOM churn
        // while the pointer moves.
        const layer = document.createElement('div');
        layer.className = 'cursor-trail-layer';
        layer.setAttribute('aria-hidden', 'true');
        const items = Array.from({ length: max }, () => {
            const item = document.createElement('div');
            item.className = 'cursor-trail-item';
            const img = document.createElement('img');
            img.alt = '';
            img.decoding = 'async';
            item.append(img);
            layer.append(item);
            return item;
        });
        host.prepend(layer);

        // Decode every photo before it is first shown, so no card pops in blank.
        const ready = sources.map(() => false);
        let preloaded = false;
        const preload = () => {
            if (preloaded) return;
            preloaded = true;
            sources.forEach((source, i) => {
                const probe = new Image();
                copySource(source, probe);
                probe.decode().then(() => {
                    ready[i] = true;
                }, noop);
            });
        };
        const observer =
            'IntersectionObserver' in window
                ? new IntersectionObserver(
                      (entries) => {
                          if (entries.some((e) => e.isIntersecting)) {
                              preload();
                              observer.disconnect();
                          }
                      },
                      { rootMargin: '200px' },
                  )
                : null;
        observer?.observe(host);

        let next = 0; // next pool image, cycled in order (no instant repeats)
        let slot = 0; // next node to recycle
        let z = 0;
        let prev = null; // last pointer point
        let last = null; // last drop point
        let travelled = 0;

        const nextSource = () => {
            for (let n = 0; n < sources.length; n++) {
                const i = (next + n) % sources.length;
                if (ready[i]) {
                    next = i + 1;
                    return sources[i];
                }
            }
            return null;
        };

        const drop = (x, y) => {
            const source = nextSource();
            if (!source) return;

            const item = items[slot];
            slot = (slot + 1) % max;
            item.getAnimations().forEach((a) => a.cancel());
            copySource(source, item.firstChild);
            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
            item.style.zIndex = ++z;

            // Glide in from the previous drop, leaning into the direction of travel.
            const from = last || { x, y };
            const dx = from.x - x;
            const dy = from.y - y;
            const tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, (-dx / gap) * MAX_TILT * 0.75));
            last = { x, y };

            item.animate(
                [
                    {
                        opacity: 0,
                        transform: `translate(${dx}px, ${dy}px) rotate(${tilt}deg) scale(0.4)`,
                    },
                    { opacity: 1, offset: 0.4 },
                    { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' },
                ],
                { duration: ENTER_MS, easing: EASE_ENTER, fill: 'both' },
            );

            item.animate(
                [
                    { opacity: 1, transform: 'translate(0, 0) rotate(0deg) scale(1)' },
                    { opacity: 0, transform: 'translate(0, 10px) rotate(0deg) scale(0.55)' },
                ],
                {
                    duration: LEAVE_MS,
                    delay: ENTER_MS + life,
                    easing: EASE_LEAVE,
                    fill: 'forwards',
                },
            );
        };

        const onEnter = (e) => {
            preload();
            const r = host.getBoundingClientRect();
            prev = { x: e.clientX - r.left, y: e.clientY - r.top };
            last = null;
            travelled = 0;
        };

        const onMove = (e) => {
            if (e.pointerType === 'touch') return; // hybrid laptops: a finger drag is a scroll
            const r = host.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            if (!prev) prev = { x, y };
            travelled += Math.hypot(x - prev.x, y - prev.y);
            prev = { x, y };
            if (travelled < gap) return;
            travelled = 0;
            drop(x, y);
        };

        host.addEventListener('pointerenter', onEnter);
        host.addEventListener('pointermove', onMove);

        return () => {
            host.removeEventListener('pointerenter', onEnter);
            host.removeEventListener('pointermove', onMove);
            observer?.disconnect();
            items.forEach((item) => item.getAnimations().forEach((a) => a.cancel()));
            layer.remove();
        };
    }

    /**
     * cursor.js — Cursor effects & interactions
     *
     * A small, framework-free toolkit of pointer-driven effects. Every effect is
     * activated by a data-* attribute and scoped to its host element, so the markup
     * stays portable (these init functions map cleanly onto a React useEffect).
     *
     * All effects are pointer/hover affordances: they are skipped entirely on
     * touch / coarse-pointer devices, and honour prefers-reduced-motion.
     *
     *   [data-cursor-follower]   precise dot + lagging ring that trails the pointer
     *   [data-cursor-lens]       frosted glass lens that magnifies focus underneath
     *   [data-drag-cursor]       "drag to explore" circle for carousels / galleries
     *                              variant:  data-drag-cursor="solid" | "glass"
     *                              label:    data-drag-label="DRAG"
     *   [data-magnetic]          element is pulled toward the pointer (strength opt.)
     *   [data-spotlight]         radial glow that tracks the pointer inside a card
     *   [data-cursor-label]      pointer becomes a pill label ("View", "Play", …)
     *   [data-cursor-images]     hovering a word floats its image in under the pointer
     *   [data-cursor-trail]      photos drop along the pointer path (cursor-trail.js)
     */

    const hasFinePointer = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const prefersReducedMotion = () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create a positioned helper element (decorative, never read by AT).
    function makeEl(className, html = '') {
        const el = document.createElement('div');
        el.className = className;
        el.setAttribute('aria-hidden', 'true');
        if (html) el.innerHTML = html;
        return el;
    }

    // Mark a host so an effect is never wired twice (idempotent init).
    function claim(host, key) {
        if (host.dataset[key]) return false;
        host.dataset[key] = 'true';
        return true;
    }

    /* ----------------------------------------------------------------
     *  Cursor Follower — precise dot + lagging ring
     * ---------------------------------------------------------------- */
    function initFollower() {
        document.querySelectorAll('[data-cursor-follower]').forEach((host) => {
            if (!claim(host, 'cursorFollowerReady')) return;

            const ring = makeEl('cursor-ring');
            const dot = makeEl('cursor-dot');
            host.append(ring, dot);

            const reduced = prefersReducedMotion();
            const EASE_RING = reduced ? 1 : 0.16;
            const EASE_DOT = reduced ? 1 : 0.4;
            let tx = 0,
                ty = 0,
                rx = 0,
                ry = 0,
                dx = 0,
                dy = 0;
            let raf = null,
                active = false;

            const tick = () => {
                rx += (tx - rx) * EASE_RING;
                ry += (ty - ry) * EASE_RING;
                dx += (tx - dx) * EASE_DOT;
                dy += (ty - dy) * EASE_DOT;
                ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
                dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
                const moving = Math.abs(tx - rx) > 0.1 || Math.abs(ty - ry) > 0.1;
                raf = active || moving ? requestAnimationFrame(tick) : null;
            };

            const point = (e) => {
                const r = host.getBoundingClientRect();
                tx = e.clientX - r.left;
                ty = e.clientY - r.top;
            };

            host.addEventListener('pointerenter', (e) => {
                active = true;
                point(e);
                rx = dx = tx;
                ry = dy = ty;
                host.classList.add('cursor-follower-active');
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointermove', (e) => {
                point(e);
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointerleave', () => {
                active = false;
                host.classList.remove('cursor-follower-active');
            });

            // Ring swells over interactive targets.
            host.querySelectorAll('a, button, [data-cursor-grow]').forEach((t) => {
                t.addEventListener('pointerenter', () => ring.classList.add('is-grow'));
                t.addEventListener('pointerleave', () => ring.classList.remove('is-grow'));
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Glass Lens — frosted circle that follows the pointer
     * ---------------------------------------------------------------- */
    function initLens() {
        document.querySelectorAll('[data-cursor-lens]').forEach((host) => {
            if (!claim(host, 'cursorLensReady')) return;

            const lens = makeEl('cursor-lens');
            if (host.dataset.lensSize) lens.style.setProperty('--lens-size', host.dataset.lensSize);
            host.append(lens);

            const reduced = prefersReducedMotion();
            const EASE = reduced ? 1 : 0.18;
            let tx = 0,
                ty = 0,
                cx = 0,
                cy = 0,
                raf = null,
                active = false;

            const tick = () => {
                cx += (tx - cx) * EASE;
                cy += (ty - cy) * EASE;
                lens.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
                const moving = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1;
                raf = active || moving ? requestAnimationFrame(tick) : null;
            };
            const point = (e) => {
                const r = host.getBoundingClientRect();
                tx = e.clientX - r.left;
                ty = e.clientY - r.top;
            };

            host.addEventListener('pointerenter', (e) => {
                active = true;
                point(e);
                cx = tx;
                cy = ty;
                host.classList.add('cursor-lens-active');
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointermove', (e) => {
                point(e);
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointerleave', () => {
                active = false;
                host.classList.remove('cursor-lens-active');
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Drag Cursor — "drag to explore" circle (carousels, galleries)
     * ---------------------------------------------------------------- */
    function initDragCursors() {
        document.querySelectorAll('[data-drag-cursor]').forEach((host) => {
            if (!claim(host, 'dragCursorReady')) return;

            const variant = host.dataset.dragCursor === 'glass' ? 'drag-cursor--glass' : '';
            const label = host.dataset.dragLabel;
            const arrows =
                '<i class="ph ph-caret-left" aria-hidden="true"></i><i class="ph ph-caret-right" aria-hidden="true"></i>';
            const inner = label
                ? `<i class="ph ph-caret-left" aria-hidden="true"></i><span>${label}</span><i class="ph ph-caret-right" aria-hidden="true"></i>`
                : arrows;

            const cursor = makeEl(`drag-cursor ${variant}`.trim(), inner);
            host.append(cursor);

            const reduced = prefersReducedMotion();
            const EASE = reduced ? 1 : 0.12;
            let tx = 0,
                ty = 0,
                cx = 0,
                cy = 0,
                raf = null,
                active = false;

            const tick = () => {
                cx += (tx - cx) * EASE;
                cy += (ty - cy) * EASE;
                cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
                const moving = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05;
                raf = active || moving ? requestAnimationFrame(tick) : null;
            };
            const point = (e) => {
                const r = host.getBoundingClientRect();
                tx = e.clientX - r.left;
                ty = e.clientY - r.top;
            };

            host.addEventListener('pointerenter', (e) => {
                active = true;
                point(e);
                cx = tx;
                cy = ty;
                cursor.classList.add('is-visible');
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointermove', (e) => {
                point(e);
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointerleave', () => {
                active = false;
                cursor.classList.remove('is-visible');
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Magnetic — element pulled toward the pointer
     * ---------------------------------------------------------------- */
    function initMagnetic() {
        if (prefersReducedMotion()) return;
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            if (!claim(el, 'magneticReady')) return;
            const strength = parseFloat(el.dataset.magneticStrength) || 0.35;

            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const mx = e.clientX - (r.left + r.width / 2);
                const my = e.clientY - (r.top + r.height / 2);
                el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Spotlight — radial glow tracking the pointer inside a card
     * ---------------------------------------------------------------- */
    function initSpotlight() {
        document.querySelectorAll('[data-spotlight]').forEach((card) => {
            if (!claim(card, 'spotlightReady')) return;
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--spot-x', `${e.clientX - r.left}px`);
                card.style.setProperty('--spot-y', `${e.clientY - r.top}px`);
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Label Cursor — pointer becomes a pill label over media
     * ---------------------------------------------------------------- */
    function initLabelCursor() {
        document.querySelectorAll('[data-cursor-label]').forEach((host) => {
            if (!claim(host, 'cursorLabelReady')) return;

            const icon = host.dataset.cursorIcon;
            const text = host.dataset.cursorLabel || 'View';
            const pill = makeEl(
                'cursor-label',
                (icon ? `<i class="ph ${icon}" aria-hidden="true"></i>` : '') +
                    `<span>${text}</span>`,
            );
            host.append(pill);

            const reduced = prefersReducedMotion();
            const EASE = reduced ? 1 : 0.2;
            let tx = 0,
                ty = 0,
                cx = 0,
                cy = 0,
                raf = null,
                active = false;

            const tick = () => {
                cx += (tx - cx) * EASE;
                cy += (ty - cy) * EASE;
                pill.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
                const moving = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1;
                raf = active || moving ? requestAnimationFrame(tick) : null;
            };
            const point = (e) => {
                const r = host.getBoundingClientRect();
                tx = e.clientX - r.left;
                ty = e.clientY - r.top;
            };

            host.addEventListener('pointerenter', (e) => {
                active = true;
                point(e);
                cx = tx;
                cy = ty;
                host.classList.add('cursor-label-active');
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointermove', (e) => {
                point(e);
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointerleave', () => {
                active = false;
                host.classList.remove('cursor-label-active');
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Image Reveal — a circular image trails the pointer over a word list.
     *  Each item carries its own <img>; hovering a word swaps the disc to
     *  that image and fades + zooms it in. Reuses each item's inner <img>
     *  as the single source of truth (no duplicated URLs), which also doubles
     *  as a static thumbnail on touch devices where this effect no-ops.
     * ---------------------------------------------------------------- */
    function initImageReveal() {
        document.querySelectorAll('[data-cursor-images]').forEach((host) => {
            if (!claim(host, 'cursorImagesReady')) return;

            const items = [...host.querySelectorAll('[data-cursor-img]')];
            if (!items.length) return;

            const disc = makeEl('cursor-image');
            const img = document.createElement('img');
            img.alt = '';
            // Preload with the first word's image so the disc is never empty.
            const firstSrc = items[0].querySelector('img')?.getAttribute('src');
            if (firstSrc) img.setAttribute('src', firstSrc);
            disc.append(img);
            host.append(disc);

            const reduced = prefersReducedMotion();
            const EASE = reduced ? 1 : 0.14;
            // The disc trails just off the pointer's lower-right (cursor near its
            // upper-left, like the reference). Offsets are a small share of the
            // disc's own size, so they scale with the responsive diameter. The disc
            // is fixed to the viewport, so it floats freely over the whole page and
            // is never clipped by the host or any container the component sits in.
            const OFF_X = 0.04,
                OFF_Y = 0.05;
            let tx = 0,
                ty = 0,
                cx = 0,
                cy = 0,
                raf = null,
                active = false,
                size = 0;

            const tick = () => {
                cx += (tx - cx) * EASE;
                cy += (ty - cy) * EASE;
                disc.style.transform = `translate(${cx + size * OFF_X}px, ${cy + size * OFF_Y}px)`;
                const moving = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1;
                raf = active || moving ? requestAnimationFrame(tick) : null;
            };
            // Viewport coordinates — the disc is position:fixed, so it is not bound
            // to the host's box and can roam anywhere on the page.
            const point = (e) => {
                tx = e.clientX;
                ty = e.clientY;
            };

            host.addEventListener('pointerenter', (e) => {
                active = true;
                size = disc.offsetWidth; // cache the (unscaled) diameter
                point(e);
                cx = tx;
                cy = ty; // snap once so the disc never flies in
                host.classList.add('cursor-images-active');
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointermove', (e) => {
                point(e);
                if (!raf) raf = requestAnimationFrame(tick);
            });
            host.addEventListener('pointerleave', () => {
                active = false;
                host.classList.remove('cursor-images-active');
                items.forEach((i) => i.classList.remove('is-active'));
            });

            // Per-word: swap the disc image and highlight the hovered word.
            items.forEach((item) => {
                const src = item.querySelector('img')?.getAttribute('src');
                item.addEventListener('pointerenter', () => {
                    if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
                    items.forEach((i) => i.classList.toggle('is-active', i === item));
                });
            });
        });
    }

    /* ----------------------------------------------------------------
     *  Image Trail — photos drop along the pointer path
     * ---------------------------------------------------------------- */
    function initCursorTrails() {
        document.querySelectorAll('[data-cursor-trail]').forEach((host) => {
            if (!claim(host, 'cursorTrailReady')) return;
            createCursorTrail(host);
        });
    }

    /**
     * Initialise every cursor effect on the page. No-op on touch / coarse pointers.
     */
    function initCursors() {
        if (!hasFinePointer()) return;
        initFollower();
        initLens();
        initDragCursors();
        initMagnetic();
        initSpotlight();
        initLabelCursor();
        initImageReveal();
        initCursorTrails();
    }

    /**
     * particles.js — Constellation / network particle field
     *
     * Renders a drifting field of primary-color dots on a <canvas>, with thin
     * connecting lines drawn between dots closer than a link distance (the line
     * opacity fading as the gap widens). Pure vanilla JS — no third-party libs.
     *
     * Targets every `[data-particles]` container. A <canvas> is created and
     * inserted as the FIRST child of each container; the CSS rule
     * `.section-particles > canvas` positions it absolutely behind the content.
     *
     * Per-element configuration via data attributes:
     *   data-particles-count="80"        -> dot count (default: auto-scale to area)
     *   data-particles-color="#6366f1"   -> dot/line color (default: --color-primary)
     *   data-particles-link="false"      -> disable connecting lines (default: on)
     *   data-particles-size="2"          -> dot radius in px (default: 2)
     *   data-particles-speed="0.4"       -> drift speed (default: 0.4)
     *
     * Device-pixel-ratio aware (dpr clamped to 2) so rendering stays crisp; a
     * ResizeObserver re-sizes the canvas and re-seeds particle positions within
     * the new bounds. An IntersectionObserver starts the requestAnimationFrame
     * loop only while the container is on-screen and cancels it once it scrolls
     * fully off, to avoid burning frames off-view.
     *
     * Respects prefers-reduced-motion by drawing a single static frame (no RAF
     * loop). Every instance keeps its own references (rafId, observers) scoped to
     * the container — no globals — so a future framework integration (e.g. a
     * React/Next.js useEffect) can tear an instance down cleanly.
     */

    const MAX_DPR = 2;
    const DEFAULT_SIZE = 2;
    const DEFAULT_SPEED = 0.4;
    const LINK_DISTANCE = 120; // px — base; scales a touch with dot size
    const DOT_ALPHA = 0.6;
    const FALLBACK_COLOR = '#6366f1';

    function initParticles() {
        const containers = document.querySelectorAll('[data-particles]');
        if (!containers.length) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        containers.forEach((container) => setupInstance(container, reduced));
    }

    function setupInstance(container, reduced) {
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        container.prepend(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resolve configuration from data attributes (with sensible defaults).
        const ds = container.dataset;
        const linkOn = ds.particlesLink !== 'false';
        const size = numAttr(ds.particlesSize, DEFAULT_SIZE);
        const speed = numAttr(ds.particlesSpeed, DEFAULT_SPEED);
        const countCfg = ds.particlesCount !== undefined ? parseInt(ds.particlesCount, 10) : null;
        const color =
            ds.particlesColor ||
            getComputedStyle(container).getPropertyValue('--color-primary').trim() ||
            FALLBACK_COLOR;
        const linkDist = LINK_DISTANCE + (size - DEFAULT_SIZE) * 20;

        // Per-instance state — everything scoped here, no globals leak out.
        const state = {
            dpr: 1,
            width: 0, // CSS pixels
            height: 0, // CSS pixels
            particles: [],
            rafId: null,
            running: false,
            resizeObserver: null,
            viewObserver: null,
        };

        const particleCount = () => {
            if (Number.isFinite(countCfg)) return Math.max(0, countCfg);
            const area = state.width * state.height;
            return Math.max(20, Math.min(120, Math.round(area / 9000)));
        };

        const seed = () => {
            const n = particleCount();
            state.particles = Array.from({ length: n }, () => ({
                x: Math.random() * state.width,
                y: Math.random() * state.height,
                vx: (Math.random() - 0.5) * 2 * speed,
                vy: (Math.random() - 0.5) * 2 * speed,
            }));
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
            const w = container.clientWidth;
            const h = container.clientHeight;
            state.dpr = dpr;
            state.width = w;
            state.height = h;
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            // Reset any prior transform before scaling, so repeated resizes don't compound.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
        };

        const draw = () => {
            const { particles, width, height } = state;
            ctx.clearRect(0, 0, width, height);

            // Connecting lines first, so dots sit on top.
            if (linkOn) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                for (let i = 0; i < particles.length; i++) {
                    const a = particles[i];
                    for (let j = i + 1; j < particles.length; j++) {
                        const b = particles[j];
                        const dx = a.x - b.x;
                        const dy = a.y - b.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist >= linkDist) continue;
                        ctx.globalAlpha = (1 - dist / linkDist) * DOT_ALPHA;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // Dots.
            ctx.globalAlpha = DOT_ALPHA;
            ctx.fillStyle = color;
            for (const p of particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };

        const step = () => {
            const { particles, width, height } = state;
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                // Wrap at edges.
                if (p.x < 0) p.x += width;
                else if (p.x > width) p.x -= width;
                if (p.y < 0) p.y += height;
                else if (p.y > height) p.y -= height;
            }
            draw();
        };

        const tick = () => {
            step();
            state.rafId = requestAnimationFrame(tick);
        };

        const start = () => {
            if (state.running || reduced) return;
            state.running = true;
            state.rafId = requestAnimationFrame(tick);
        };

        const stop = () => {
            state.running = false;
            if (state.rafId != null) {
                cancelAnimationFrame(state.rafId);
                state.rafId = null;
            }
        };

        // Initial sizing + seed.
        resize();

        // Re-size and re-seed on container resize.
        state.resizeObserver = new ResizeObserver(() => {
            resize();
            if (reduced) draw();
        });
        state.resizeObserver.observe(container);

        if (reduced) {
            // One static frame, no animation loop.
            draw();
            return state;
        }

        // Run the loop only while the container is on-screen.
        state.viewObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) start();
                else stop();
            });
        });
        state.viewObserver.observe(container);

        return state;
    }

    function numAttr(value, fallback) {
        if (value === undefined) return fallback;
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    }

    /**
     * wave-field.js — soft animated waves behind a section ([data-wave-field])
     *
     *   <div class="wave-field" data-wave-field aria-hidden="true"></div>
     *
     * Three layers, back to front: a wide warm band, a lighter band and a dome
     * that rises in the middle. Each edge is two slow sine waves, so the shapes
     * breathe rather than scroll. The canvas is drawn at half resolution — the
     * CSS blur hides it — and only runs while the field is on screen and the tab
     * is visible. Reduced motion gets one still frame. data-wave-rise lifts the
     * layers for short bands (a footer strip).
     *
     * Colours are read from --wave-1 / --wave-2 / --wave-3 (see effects.css), so a
     * page restyles the waves with CSS alone. data-wave-speed scales the motion.
     */

    // base: resting height (0 top … 1 bottom) · dome: lift at the centre
    // amp / freq / spd / ph: the two sine waves that move the edge
    const LAYERS = [
        { colour: '--wave-3', base: 0.6, dome: -0.06, amp: 0.08, freq: 1.1, spd: 0.42, ph: 0.0 },
        { colour: '--wave-2', base: 0.8, dome: 0.1, amp: 0.05, freq: 1.5, spd: 0.52, ph: 2.1 },
        { colour: '--wave-1', base: 1.04, dome: 0.4, amp: 0.035, freq: 1.2, spd: 0.64, ph: 4.2 },
    ];
    const SCALE = 0.5;

    function initWaveFields() {
        const fields = document.querySelectorAll('[data-wave-field]');
        if (!fields.length) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        fields.forEach((field) => {
            const canvas =
                field.querySelector('canvas') ??
                field.appendChild(document.createElement('canvas'));
            const ctx = canvas.getContext('2d');
            const speed = Number(field.dataset.waveSpeed) || 1;
            // data-wave-rise lifts every layer (0–0.5 of the height) for short bands
            const rise = Math.min(0.5, Math.max(0, Number(field.dataset.waveRise) || 0));
            // data-wave-amp scales how far the edges travel — short bands need more
            const ampScale = Number(field.dataset.waveAmp) || 1;

            // Custom properties come back unresolved; a probe's `color` resolves them.
            const probe = field.appendChild(document.createElement('i'));
            probe.style.display = 'none';
            const resolve = (name) => {
                probe.style.color = `var(${name})`;
                return getComputedStyle(probe).color;
            };
            let colours = LAYERS.map((l) => resolve(l.colour));

            let w = 0,
                h = 0,
                raf = 0,
                onScreen = true;
            const start = performance.now();

            const resize = () => {
                const r = canvas.getBoundingClientRect();
                w = canvas.width = Math.max(1, Math.round(r.width * SCALE));
                h = canvas.height = Math.max(1, Math.round(r.height * SCALE));
                colours = LAYERS.map((l) => resolve(l.colour));
            };

            const draw = (t) => {
                ctx.clearRect(0, 0, w, h);
                LAYERS.forEach((l, i) => {
                    ctx.beginPath();
                    ctx.moveTo(0, h);
                    for (let x = 0; x <= w + 4; x += 4) {
                        const nx = x / w;
                        const wave =
                            Math.sin(nx * Math.PI * 2 * l.freq + t * l.spd + l.ph) +
                            0.6 *
                                Math.sin(nx * Math.PI * 2 * l.freq * 1.7 - t * l.spd * 1.3 + l.ph);
                        const y =
                            l.base -
                            rise -
                            l.dome * Math.sin(Math.PI * nx) +
                            l.amp * ampScale * wave;
                        ctx.lineTo(x, y * h);
                    }
                    ctx.lineTo(w, h);
                    ctx.closePath();
                    ctx.fillStyle = colours[i];
                    ctx.fill();
                });
            };

            const frame = (now) => {
                draw(((now - start) / 1000) * speed);
                raf = requestAnimationFrame(frame);
            };
            const play = () => {
                if (!still && !raf && onScreen && !document.hidden)
                    raf = requestAnimationFrame(frame);
            };
            const pause = () => {
                cancelAnimationFrame(raf);
                raf = 0;
            };

            resize();
            draw(2);
            new ResizeObserver(() => {
                resize();
                draw(((performance.now() - start) / 1000) * speed);
            }).observe(field);
            new IntersectionObserver(([entry]) => {
                onScreen = entry.isIntersecting;
                onScreen ? play() : pause();
            }).observe(field);
            document.addEventListener('visibilitychange', () =>
                document.hidden ? pause() : play(),
            );
            play();
        });
    }

    /**
     * aurora-field.js — an animated ground of the theme colours (<canvas data-aurora>)
     *
     *   <section class="relative isolate overflow-clip dark-section text-white">
     *     <div class="aurora-field" aria-hidden="true"><canvas data-aurora></canvas></div>
     *     …content…
     *   </section>
     *
     *   data-aurora=""        on a wide stage that holds content: deep on the text side (left; top on
     *                         a tall stage), luminous on the far side. Alone in its stage (an art
     *                         tile), or in a box narrower than 60% of the window: light all over.
     *   data-aurora="deep"    almost all ink, one soft bloom rising from the bottom right corner
     *   data-aurora="bloom"   deep at the top, light rising from the bottom centre
     *
     * The stage is the field's parent, or the closest [data-aurora-stage] when the field sits deeper.
     * It is the box a mouse lights: a soft light follows the pointer over it, white on the luminous
     * grounds, a glow of the primary on the "deep" one.
     *
     * The canvas is a small buffer (96 × 60, 60 × 96 or 76 × 76, after the box's shape) that CSS
     * stretches; the blur of the upscale is the look. Colours are --aurora-0 … --aurora-4 (ink,
     * primary, tertiary, accent, white light; see aurora-field.css), mixed in linear light and read
     * again every second, so a preset or the Style Switcher recolours a running field. Motion is
     * time-based, capped at 30 fps, paused off screen and in a hidden tab. With reduced motion one
     * frame is painted and the field rests (painted again when the box changes proportions or the
     * colours change); the setting is followed live.
     *
     * For frameworks:
     *   initAuroraFields(root = document)     wires every .aurora-field > canvas[data-aurora] in root
     *                                         (root itself included). Safe to call again: a wired
     *                                         canvas is left alone.
     *   destroyAuroraFields(root = document)  stops them: observers, timers, frames and listeners
     *                                         removed. Call it before the markup is removed.
     */

    const SELECTOR = '.aurora-field > canvas[data-aurora]';
    const FRAME = 1000 / 30;
    const SPEED = 0.42; // field time per second: one full change in about 12 s
    const STILL = 5.4; // the frame painted under reduced motion
    const SIZES = { wide: [96, 60], tall: [60, 96], square: [76, 76] };

    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const smooth = (x) => {
        const k = clamp01(x);
        return k * k * (3 - 2 * k);
    };
    const blob = (dx, dy, radius) => Math.exp(-(dx * dx + dy * dy) / (radius * radius));
    // root itself when it matches, then everything in it that does
    const within = (root, selector) => [
        ...(root.matches?.(selector) ? [root] : []),
        ...root.querySelectorAll(selector),
    ];

    // sRGB byte → linear light, and back: colours are mixed in linear light, which keeps blends luminous
    const TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
        const c = i / 255;
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const TO_SRGB = Uint8ClampedArray.from({ length: 4096 }, (_, i) => {
        const c = i / 4095;
        return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
    });

    // Reduced motion is read in one place and followed live. Chromium drops the change event of a
    // MediaQueryList whose .matches was read after the setting changed, which a frame loop would do
    // every time: so nothing below reads the query, only this flag.
    const motionWatchers = new Set();
    let reducedMotion = false;
    let motionQuery = null;

    function watchMotion() {
        if (motionQuery) return;
        motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        reducedMotion = motionQuery.matches;
        motionQuery.addEventListener('change', (event) => {
            reducedMotion = event.matches;
            for (const watcher of motionWatchers) watcher();
        });
    }

    let colorContext = null;
    const colorCache = new Map();

    /** Any CSS colour → linear [r, g, b], through a 1 × 1 canvas. */
    function toLinear(color) {
        if (colorCache.has(color)) return colorCache.get(color);
        colorContext ??= Object.assign(document.createElement('canvas'), {
            width: 1,
            height: 1,
        }).getContext('2d', { willReadFrequently: true });
        // Start from nothing: a colour with alpha would otherwise be read mixed with the last one
        colorContext.clearRect(0, 0, 1, 1);
        colorContext.fillStyle = '#000';
        colorContext.fillStyle = color;
        colorContext.fillRect(0, 0, 1, 1);
        const [r, g, b] = colorContext.getImageData(0, 0, 1, 1).data;
        const linear = [TO_LINEAR[r], TO_LINEAR[g], TO_LINEAR[b]];
        colorCache.set(color, linear);
        return linear;
    }

    /** Wires one canvas; returns the function that stops it. */
    function auroraField(canvas) {
        const context = canvas.getContext('2d');
        if (!context) return null;
        const mode = canvas.dataset.aurora;
        const stage = canvas.closest('[data-aurora-stage]') ?? canvas.parentElement.parentElement;

        // The colours come through a probe inside the canvas: never rendered, yet it resolves var()
        const probe = canvas.appendChild(document.createElement('i'));
        probe.style.cssText =
            'color: var(--aurora-0); background-color: var(--aurora-1); border-top-color: var(--aurora-2); border-right-color: var(--aurora-3); border-bottom-color: var(--aurora-4)';
        let palette = null;
        let paletteKey = '';
        const readPalette = () => {
            const style = getComputedStyle(probe);
            const colors = [
                style.color,
                style.backgroundColor,
                style.borderTopColor,
                style.borderRightColor,
                style.borderBottomColor,
            ];
            const key = colors.join('|');
            if (key === paletteKey) return false;
            paletteKey = key;
            palette = colors.map(toLinear);
            return true;
        };

        // The buffer follows the box's shape. The default mode keeps a side for text only on a wide
        // stage that holds content: alone in its stage, or in a narrow box, it is light all over.
        let image = null;
        let edge = null; // per pixel: what is left of the white light near the edges
        let shape = '';
        let ratio = 1;
        let open = false;
        const resize = () => {
            const { clientWidth, clientHeight } = canvas;
            if (!clientWidth || !clientHeight) return false;
            const before = ratio;
            const wasOpen = open;
            ratio = clientWidth / clientHeight;
            open =
                mode === '' &&
                ((stage?.children.length ?? 0) < 2 || clientWidth < window.innerWidth * 0.6);
            const next = ratio >= 1.25 ? 'wide' : ratio <= 0.8 ? 'tall' : 'square';
            // Same buffer: a still frame is painted again only if the box's proportions moved
            if (image && next === shape) return ratio !== before || open !== wasOpen;
            shape = next;
            [canvas.width, canvas.height] = SIZES[shape];
            image = context.createImageData(canvas.width, canvas.height);
            // The white light dims towards the edges, so a stage never melts into a white page
            const { width, height } = canvas;
            edge = Float64Array.from({ length: width * height }, (_, i) => {
                const u = ((i % width) + 0.5) / width;
                const v = (Math.floor(i / width) + 0.5) / height;
                return 0.45 + 0.55 * smooth(Math.min(u, 1 - u, v, 1 - v) / 0.12);
            });
            return true;
        };

        // The waves that depend on one axis only are worked out once per row or column of a frame,
        // not once per pixel: 96 samples at most (the buffer's long side)
        const warpXa = new Float64Array(96),
            warpXb = new Float64Array(96); // of x, by y
        const warpYa = new Float64Array(96),
            warpYb = new Float64Array(96); // of y, by x
        const farA = new Float64Array(96),
            farB = new Float64Array(96); // the far side's wavy edge, by y
        const riseA = new Float64Array(96); // the bloom's wavy rise, by x

        // The pointer light: where it is, where it is heading, how strong
        const light = { x: 0.5, y: 0.5, toX: 0.5, toY: 0.5, power: 0, toPower: 0 };

        const paint = (t) => {
            const { width, height, data } = image;
            const [ink, primary, sky, pink, white] = palette;
            // The pointer light is white on the luminous grounds; on the deep one white would lie on
            // the ink as a grey haze, so it glows in the primary there
            const lamp = mode === 'deep' ? primary : white;
            const portrait = ratio < 1;
            // With a text side the field runs along the long side: x is "from the text to the far side"
            const along = mode === '' && !open && portrait;
            // Blob radii are in units of the long side; the short axis is scaled so they stay round on screen
            const longX = along || !portrait;
            const ax = longX ? 1 : ratio;
            const ay = longX ? (portrait ? ratio : 1 / ratio) : 1;
            const s1 = Math.sin(t * 0.61 + 1),
                s2 = Math.sin(t * 0.47 + 2),
                s3 = Math.sin(t * 0.53),
                s4 = Math.cos(t * 0.41);
            const s5 = Math.sin(t * 0.37 + 4),
                s6 = Math.cos(t * 0.59 + 1),
                s7 = Math.sin(t * 0.33 + 2.4);
            const sided = mode === '' && !open;
            const countX = along ? height : width;
            const countY = along ? width : height;
            for (let k = 0; k < countY; k++) {
                const y = (k + 0.5) / countY;
                warpXa[k] = 0.2 * Math.sin(y * 3.1 + t * 1.3);
                warpXb[k] = 0.1 * Math.sin(y * 6.3 - t * 0.9);
                if (!sided) continue;
                farA[k] = 0.04 * Math.sin(y * 4.2 + t * 0.5);
                farB[k] = 0.02 * Math.sin(y * 9 - t * 0.7);
            }
            for (let k = 0; k < countX; k++) {
                const x = (k + 0.5) / countX;
                warpYa[k] = 0.22 * Math.sin(x * 2.7 - t * 1.1);
                warpYb[k] = 0.09 * Math.sin(x * 5.9 + t * 0.7);
                if (mode === 'bloom') riseA[k] = 0.04 * Math.sin(x * 5 + t * 0.5);
            }
            let i = 0;
            for (let py = 0; py < height; py++) {
                for (let px = 0; px < width; px++) {
                    const u = (px + 0.5) / width;
                    const v = (py + 0.5) / height;
                    const x = along ? v : u;
                    const y = along ? u : v;
                    const kx = along ? py : px;
                    const ky = along ? px : py;

                    // Domain warp, then two slow fields
                    const wx = x + warpXa[ky] + warpXb[ky];
                    const wy = y + warpYa[kx] + warpYb[kx];
                    const n1 =
                        0.5 + 0.5 * Math.sin(wx * 3.4 + t * 0.8) * Math.cos(wy * 2.6 - t * 0.6);
                    const n2 = 0.5 + 0.5 * Math.sin((wx + wy) * 2.9 - t * 0.9 + 1.7);

                    // blob(): a soft round light in the warped space
                    const bx = wx * ax;
                    const by = wy * ay;

                    let wPrimary, wSky, wPink, wWhite;
                    let reach = 1; // how much of the pointer light this pixel takes
                    if (mode === 'deep') {
                        const rise = smooth((x - 0.3) * 0.9 + (y - 0.45) * 0.9);
                        wPrimary =
                            0.26 * smooth(n1 * 1.5 - 0.55) +
                            0.82 *
                                blob(
                                    bx - (0.98 + 0.06 * s1) * ax,
                                    by - (1.08 + 0.05 * s4) * ay,
                                    0.43,
                                );
                        wSky =
                            0.5 *
                            rise *
                            blob(bx - (0.8 + 0.1 * s2) * ax, by - (1.12 + 0.05 * s3) * ay, 0.3);
                        wPink =
                            0.72 *
                            rise *
                            blob(bx - (1.02 + 0.06 * s5) * ax, by - (0.98 + 0.08 * s6) * ay, 0.27);
                        wWhite =
                            0.4 *
                            rise *
                            blob(bx - (1.04 + 0.05 * s7) * ax, by - (1.06 + 0.04 * s1) * ay, 0.17);
                    } else if (mode === 'bloom') {
                        const rise = smooth((y - 0.14 + riseA[kx]) / 0.66) ** 1.5;
                        wPrimary = smooth(n1 * 0.8 - 0.28 + 1.15 * smooth((y - 0.02) / 0.42));
                        wSky =
                            0.9 *
                            rise *
                            blob(bx - (0.78 + 0.1 * s1) * ax, by - (0.98 + 0.07 * s2) * ay, 0.34);
                        wPink =
                            0.92 *
                            rise *
                            blob(bx - (0.28 + 0.1 * s3) * ax, by - (1.0 + 0.07 * s4) * ay, 0.36);
                        wWhite =
                            0.88 *
                            rise *
                            blob(bx - (0.52 + 0.1 * s5) * ax, by - (1.08 + 0.05 * s6) * ay, 0.3) *
                            (0.8 + 0.2 * n2);
                    } else if (open) {
                        // Light all over: the primary with a few ink clouds, the cool light from two
                        // corners, the warm light and the highlight inside
                        wPrimary = smooth(n1 * 0.75 + 0.4);
                        wSky =
                            0.9 *
                                blob(
                                    bx - (0.94 + 0.07 * s1) * ax,
                                    by - (0.14 + 0.14 * s2) * ay,
                                    0.44,
                                ) +
                            0.55 * blob(bx - (0.04 + 0.06 * s7) * ax, by - 1.02 * ay, 0.38);
                        wPink =
                            0.92 *
                            blob(bx - (0.3 + 0.12 * s3) * ax, by - (0.56 + 0.16 * s4) * ay, 0.36) *
                            (0.8 + 0.2 * n2);
                        wWhite =
                            0.86 *
                            blob(bx - (0.64 + 0.1 * s5) * ax, by - (0.44 + 0.14 * s6) * ay, 0.25);
                    } else {
                        // far: 0 under the text (the first half), 1 on the far side, rising slowly on a
                        // wavy edge; low: 0 under a header, 1 below it
                        const far = smooth((x - 0.44 + farA[ky] + farB[ky]) / 0.4) ** 1.8;
                        const low = along ? 1 : smooth((v - 0.08) / 0.24);
                        // The primary gathers ahead of the lights, so they rise from it, never from the ink
                        wPrimary =
                            smooth(n1 * 1.05 - 0.12 + 0.8 * smooth((x - 0.24) / 0.3)) *
                            (0.84 + 0.16 * far);
                        wSky =
                            0.92 *
                                far *
                                (0.4 + 0.6 * low) *
                                blob(
                                    bx - (1.02 + 0.05 * s1) * ax,
                                    by - (0.3 + 0.18 * s2) * ay,
                                    0.4,
                                ) +
                            0.2 * blob(bx - (0.08 + 0.06 * s7) * ax, by - 1.1 * ay, 0.42);
                        wPink =
                            0.94 *
                            far *
                            (0.15 + 0.85 * low) *
                            blob(bx - (0.74 + 0.08 * s3) * ax, by - (0.62 + 0.15 * s4) * ay, 0.34) *
                            (0.8 + 0.2 * n2);
                        wWhite =
                            0.86 *
                            far *
                            low *
                            blob(bx - (0.87 + 0.06 * s5) * ax, by - (0.72 + 0.11 * s6) * ay, 0.23);
                        reach = 0.4 + 0.6 * far;
                    }

                    wWhite *= edge[i >> 2];

                    let r = ink[0] + (primary[0] - ink[0]) * wPrimary;
                    let g = ink[1] + (primary[1] - ink[1]) * wPrimary;
                    let b = ink[2] + (primary[2] - ink[2]) * wPrimary;
                    r += (sky[0] - r) * wSky;
                    g += (sky[1] - g) * wSky;
                    b += (sky[2] - b) * wSky;
                    r += (pink[0] - r) * wPink;
                    g += (pink[1] - g) * wPink;
                    b += (pink[2] - b) * wPink;
                    r += (white[0] - r) * wWhite;
                    g += (white[1] - g) * wWhite;
                    b += (white[2] - b) * wWhite;

                    if (light.power > 0.004) {
                        const dx = (u - light.x) * (portrait ? ratio : 1);
                        const dy = (v - light.y) * (portrait ? 1 : 1 / ratio);
                        const glow =
                            light.power * reach * 0.1 * Math.exp(-(dx * dx + dy * dy) / 0.03);
                        r += (lamp[0] - r) * glow;
                        g += (lamp[1] - g) * glow;
                        b += (lamp[2] - b) * glow;
                    }

                    data[i] = TO_SRGB[(clamp01(r) * 4095) | 0];
                    data[i + 1] = TO_SRGB[(clamp01(g) * 4095) | 0];
                    data[i + 2] = TO_SRGB[(clamp01(b) * 4095) | 0];
                    data[i + 3] = 255;
                    i += 4;
                }
            }
            context.putImageData(image, 0, 0);
        };

        let clock = STILL;
        let visible = false;
        let frame = 0;
        let last = 0;
        let lastRead = 0;

        const tick = (now) => {
            frame = 0;
            if (!visible || document.hidden || reducedMotion) return;
            frame = requestAnimationFrame(tick);
            const elapsed = now - last;
            if (elapsed < FRAME - 1) return;
            last = now;
            const dt = Math.min(elapsed, 100) / 1000;
            clock += dt * SPEED;
            const ease = 1 - Math.exp(-dt * 3.2);
            light.x += (light.toX - light.x) * ease;
            light.y += (light.toY - light.y) * ease;
            light.power += (light.toPower - light.power) * ease;
            if (now - lastRead > 1000) {
                lastRead = now;
                readPalette();
            }
            if (image) paint(clock);
        };

        const still = () => {
            if (image) paint(STILL);
        };

        const run = () => {
            if (!visible || document.hidden) return;
            readPalette();
            resize();
            if (reducedMotion) {
                still();
                return;
            }
            if (!frame) {
                last = performance.now() - FRAME;
                frame = requestAnimationFrame(tick);
            }
        };

        const onView = new IntersectionObserver((entries) => {
            visible = entries.at(-1).isIntersecting;
            run();
        });
        onView.observe(canvas);
        document.addEventListener('visibilitychange', run);
        motionWatchers.add(run);
        // The box's shape is measured when it changes, not on every frame; a still frame is repainted
        const onResize = new ResizeObserver(() => {
            if (resize() && reducedMotion && visible) still();
        });
        onResize.observe(canvas);
        // With reduced motion the frame stays still, yet a new preset still repaints it
        const refresh = setInterval(() => {
            if (reducedMotion && visible && !document.hidden && readPalette()) still();
        }, 1000);

        const onMove = (event) => {
            if (event.pointerType === 'touch') return;
            const box = canvas.getBoundingClientRect();
            light.toX = (event.clientX - box.left) / box.width;
            light.toY = (event.clientY - box.top) / box.height;
            light.toPower = 1;
        };
        const onLeave = () => {
            light.toPower = 0;
        };
        stage?.addEventListener('pointermove', onMove);
        stage?.addEventListener('pointerleave', onLeave);

        return () => {
            visible = false;
            cancelAnimationFrame(frame);
            clearInterval(refresh);
            onView.disconnect();
            onResize.disconnect();
            document.removeEventListener('visibilitychange', run);
            motionWatchers.delete(run);
            stage?.removeEventListener('pointermove', onMove);
            stage?.removeEventListener('pointerleave', onLeave);
            probe.remove();
        };
    }

    const wired = new WeakMap(); // canvas → the function that stops it

    function initAuroraFields(root = document) {
        const canvases = within(root, SELECTOR);
        if (!canvases.length) return;
        watchMotion();
        for (const canvas of canvases) {
            if (wired.has(canvas)) continue;
            const stop = auroraField(canvas);
            if (stop) wired.set(canvas, stop);
        }
    }

    /**
     * progressive-blur.js — layer injection for the progressive blur strip
     *
     * Turns `<div data-progressive-blur="bottom"></div>` into the eight-layer
     * stack blur.css styles. The layers are empty and interchangeable, so the
     * script has nothing to configure: radius, height, offset and tint are all
     * custom properties read from CSS.
     *
     * The element must be a direct child of <body> — a transformed ancestor would
     * make `position: fixed` track that ancestor instead of the viewport.
     *
     * Easily ported to a Next.js `useEffect` hook, or replaced entirely by
     * rendering the eight spans in the template.
     */

    const LAYER_COUNT = 8;

    function initProgressiveBlur() {
        document.querySelectorAll('[data-progressive-blur]').forEach((el) => {
            // Idempotent: a second call (HMR, client-side nav) must not double up.
            if (el.dataset.pbReady) return;
            el.dataset.pbReady = 'true';

            const edge = el.dataset.progressiveBlur === 'top' ? 'top' : 'bottom';

            el.classList.add('progressive-blur', `progressive-blur--${edge}`);
            if ('progressiveBlurFade' in el.dataset) el.classList.add('progressive-blur--fade');
            el.setAttribute('aria-hidden', 'true');

            const frag = document.createDocumentFragment();
            for (let i = 0; i < LAYER_COUNT; i++) {
                const layer = document.createElement('span');
                layer.className = 'progressive-blur-layer';
                frag.append(layer);
            }
            el.append(frag);
        });
    }

    /**
     * parts.js — Which optional parts of the template's script a page needs.
     *
     * The shop and the template showcase (the Demos page, the Home) are not in
     * main.js: main.js reads the page's markup with these tests and loads the part
     * it needs. The build runs the same tests on each page, to link the part's
     * file there up front (shop.js, showcase.js in the Ready package).
     */

    const SHOP_COMPONENTS =
        'rangeDual|productFilter|bundle|gallerySpy|railScroll|addToCart|cartPage|wishlist|hashView';
    const SHOP = new RegExp(
        [
            `x-data="\\s*(?:${SHOP_COMPONENTS})\\b`, // x-data="addToCart"
            `\\b(?:${SHOP_COMPONENTS})\\(`, // …cartPage({ … }) inside an object
            '\\$store\\.cart\\b', // the mini cart in a shop header
            '\\sdata-quick-view(?=[\\s=>])',
            'class="[^"]*(?<![\\w-])(?:qty|product-card--float|shop-filters--dropdowns)(?![\\w-])',
        ].join('|'),
    );

    const SHOWCASE =
        /\sdata-(?:demo-card|demo-browser|home-showcase|home-drift)(?=[\s=>])|x-data="\s*iconLibrary\b/;

    /** The page uses the shop: cart, filters, product cards, wishlist… */
    const needsShop = (html) => SHOP.test(html);

    /** The page shows the template itself: the Demos cards, the Home's live switcher, the icon browser. */
    const needsShowcase = (html) => SHOWCASE.test(html);

    /**
     * main.js — Draftmango's script. It starts every feature a page uses.
     *
     * Each feature is a small module with one start function. The function looks
     * for its own markup (a class or a data attribute) and does nothing on a page
     * without it, so this file can start everything on every page.
     *
     *   To turn a feature off on the whole site, delete its line in section 3.
     *   Keep your own code in a file of your own, not here.
     *
     * Contents
     *   1. Alpine.js            the engine behind x-data, x-show, @click…
     *   2. Alpine components    the x-data="…" names the pages use
     *   3. Features             started once the page is parsed, by group
     *   4. Optional parts       the shop and the template showcase, loaded only where used
     *   5. Start
     */

    // ── 1. Alpine.js ──────────────────────────────────────────────────────────

    Alpine.plugin(collapse);
    Alpine.plugin(intersect);

    // On window for the browser's Alpine devtools and for your own scripts
    window.Alpine = Alpine;

    // ── 2. Alpine components ──────────────────────────────────────────────────

    registerDirectives(Alpine); // x-expand (read more) and $focus (arrow keys in tab lists, menus)
    Alpine.data('formValidate', formValidate); // contact, subscribe, sign-in and checkout forms
    Alpine.data('formWizard', formWizard); // a form in steps
    Alpine.data('passwordField', passwordField); // show / hide a password, strength meter
    Alpine.data('listFilter', listFilter); // search box and category chips over a list (FAQ, team, glossary)
    Alpine.data('tablist', tablist); // tabs with arrow-key navigation
    Alpine.data('tooltip', tooltip); // rich tooltip, opens on hover or focus
    Alpine.data('popover', popover); // popover, opens on click
    Alpine.data('countdown', countdown); // days / hours / minutes / seconds to a date
    Alpine.data('openingHours', openingHours); // "Open now · until 18:00" in the business's time zone
    Alpine.data('audioPlayer', audioPlayer); // podcast player

    // ── 3. Features ───────────────────────────────────────────────────────────

    function startFeatures() {
        // Page basics
        initPreloader(); // loading screen until the page has loaded — [data-preloader]
        initFontLoader(); // loads the accent fonts only on pages that use them
        initFocusSource(); // focus rings for the keyboard, not for mouse clicks
        initCopy(); // copy-to-clipboard buttons — [data-copy]
        initButtons(); // buttons whose label slides on hover — .btn-hover-text-slide

        // Header and menus
        initNavbar(); // header on scroll, mobile menu, dropdowns and mega menus
        initMegaMenuMedia(); // images and carousels inside mega menus, loaded when opened

        // Scrolling — smooth scroll first: the features after it follow its position
        initSmoothScroll(); // smooth wheel scrolling (Lenis), on every page
        initSticky(); // marks sticky bars once they stick (.is-stuck) — [data-sticky-stuck]
        initPageNav(); // in-page menu that highlights the section in view — [data-page-nav]
        initBackToTop(); // back-to-top button — [data-back-top]
        initScrollProgress(); // reading progress bar or ring — [data-scroll-progress]
        initScrollToFooter(); // glides to the footer on the footer demo pages — [data-scroll-to-footer]

        // Scroll effects and motion
        initScrollHighlight(); // text that fills word by word as you scroll — [data-scroll-highlight]
        initWordRotator(); // one word of a heading that keeps changing — [data-word-rotate]
        initStack(); // cards that stack while you scroll — [data-stack]
        initHorizontalScroll(); // a section that moves sideways as you scroll down — [data-hscroll]
        initParallax(); // layers that move at their own speed — [data-parallax-speed]
        initSectionColor(); // the page takes the colour of the section in view — [data-section-colors]
        initMarquees(); // endless scrolling rows of logos or words — .marquee
        initScrollMarquees(); // rows that move with the scroll
        initCounters(); // numbers that count up when seen — [data-counter]
        initProgressBars(); // bars that fill when seen — .progress-bar[data-progress]

        // Images, video and maps
        initCarousels(); // sliders (Swiper) — .swiper
        initLightbox(); // images and videos opened full screen — .glightbox
        initGalleryFilter(); // category buttons over a gallery — [data-gallery-filter]
        initMediaFacades(); // videos that load only when played — .media-facade
        initBeforeAfter(); // before / after image slider — [data-before-after]
        initMaps(); // maps (Leaflet) — [data-map]
        initInstagram(); // Instagram feed — [data-instagram-feed]

        // Content
        initTabs(); // the sliding indicator under tabs — .tabs-capsule, .tabs-underline
        initModals(); // dialogs — <dialog class="modal">
        initClocks(); // live time in a time zone — [data-clock]

        // Backgrounds and cursor
        initHoverEffects(); // elements that lean toward the mouse — [data-hover-magnetic], [data-hover-tilt]
        initCursors(); // custom cursors, magnetic buttons, cursor labels — [data-cursor-*], [data-magnetic]
        initParticles(); // connected-dots background — [data-particles]
        initWaveFields(); // soft animated waves — [data-wave-field]
        initAuroraFields(); // animated colour background — [data-aurora]
        initProgressiveBlur(); // blur strip at the edge of a scrolling area — [data-progressive-blur]
    }

    // ── 4. Optional parts ─────────────────────────────────────────────────────
    // The shop (shop.js) and the template showcase (showcase.js: Demos page, Home)
    // load only on pages whose markup uses them (parts.js). In the Ready package
    // the build links them on those pages already; a page made by hand that lacks
    // the tag gets the file fetched here.

    const page = document.documentElement.outerHTML;
    const parts = Promise.all(
        [
            needsShop(page) &&
                DraftmangoVendor.load('shop', 'shop.js').then((m) => ({
                    register: m.registerShop,
                    init: m.initShop,
                })),
            needsShowcase(page) &&
                DraftmangoVendor.load('showcase', 'showcase.js').then((m) => ({
                    register: m.registerShowcase,
                    init: m.initShowcase,
                })),
        ].filter(Boolean),
    );

    // ── 5. Start ──────────────────────────────────────────────────────────────
    // Alpine starts once the parts have added their components; the features
    // start when the page is parsed, after Alpine.

    let loaded = null;
    parts.then((list) => {
        list.forEach((part) => part.register(Alpine));
        Alpine.start();
        loaded = list;
    });

    document.addEventListener('DOMContentLoaded', () => {
        const run = (list) => {
            startFeatures();
            list.forEach((part) => part.init());
        };
        // Usually ready by now: run at once, ahead of the page's own DOMContentLoaded code
        if (loaded) run(loaded);
        else parts.then(run);
    });
})(DraftmangoVendor.Alpine, DraftmangoVendor.AlpineCollapse, DraftmangoVendor.AlpineIntersect, DraftmangoVendor.Lenis);
