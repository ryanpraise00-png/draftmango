# Draftmango creative direction — first implementation, 23 October 2026

## Purpose
Develop a distinct, explicit direction for each customer brief. References are
examples of quality and range, not a mandatory library of styles or templates.
The Draftmango marketing homepage is outside this change.

## Creation
1. The server removes the generic starter files from new-site requests, including
   requests from older browser tabs. Explicit user-selected preferences remain.
2. A creative-director call chooses the concept, audience, primary action,
   composition, typography, palette, imagery, motion, sections and constraints.
3. A separate implementation call creates a React project with JSX components and CSS.
4. Only a validated complete response that compiles updates a React project. Failure or cancellation
   leaves the existing draft intact. Both calls share the existing request deadline.

## Revisions
The design brief is saved with each file revision. Reload, account synchronization,
undo, redo and branches preserve the matching brief. Editing uses one model call
with the current files and brief. Current source and the latest request take
precedence over stale design instructions. Existing projects need no migration.
Manual source editing retains the direction; resetting to a starter clears it.

## Sources
server/design-coordinator.mjs records the five user-provided resource URLs and adapted
principles. They inform design choices and verification, not a fixed house style.
The supplied videos were reviewed as inspiration, including the distinction
between positive samples and negatively framed before/AI examples. The production
model does not receive those videos or screenshots in this implementation.

## Validation
80 Node tests passed, including creation/editing, failures, cancellation, legacy
projects, preferences, revision history and account-store merging. An isolated
browser check verified new creation, reload and a follow-up edit without touching
the user's projects. Syntax checks passed.

Five live benchmark outputs used the configured OpenAI gpt-6-luna model: the old
socks flow, new socks flow, a headline-only edit, hiking socks and an architecture
studio. The three new creations took 107–112 seconds with a 16,384 implementation
token cap. Creative direction took 21–23 seconds of each creation. These are a
small local sample, not a latency guarantee or a statistical quality comparison.
The headline edit changed only the requested HTML headline; CSS and JS were
byte-for-byte unchanged. All five outputs were rendered at widths 1440, 390 and
320 in the preview sandbox, with no root horizontal overflow, broken image
elements, JavaScript errors or unnamed buttons found by the automated checks.

## Visual finding and next milestone
The examples developed different concepts and section content, but still relied
too much on cream palettes, serif accents and simple SVG illustration. The playful
socks output also used overly tight display type. This is a working coordination
foundation, not proof that the reference quality target has been reached.

Production image discovery/generation, reference retrieval, screenshot critique
and automatic visual repairs are not connected yet. The next milestone is to
obtain relevant, usable images when a concept needs them, then render and assess
composition, type, colour, mobile layout and interaction before accepting a draft.
Use a bounded repair pass and compare varied briefs; do not enforce artificial
novelty or categorise every project into one of the supplied examples.

## Evidence in the development workspace
C:\Users\ryanp\OneDrive\Documents\ChatGPT\Code 2\draftmango-design-engine\benchmark
contains prompts, generated files, timings, design briefs, browser checks and
desktop/mobile screenshots. It contains no API keys or customer project data.

## Design benchmark

`npm run benchmark:design` measures how good generated sites look. One-time
setup: `npm ci`, then `npx playwright install chromium`.

It generates the fixed brief `benchmarks/briefs/dreadbyte-studios.md`
(confirmed studio facts; edit it to add a contact email or change details),
renders the site at 1440, 768 and 390 px in Chromium, runs automatic checks
(sideways overflow, contrast, broken images, invisible text, notes to the site
owner left on the page, and AI-design clichés such as gradient text, purple
gradients, emoji icons, generic copy and invented statistics), asks the model
to score the screenshots against a design rubric, applies one targeted repair
and scores again. Reports go to `data/benchmarks/<time>-<name>/report.html`.

Repairs are safe: only the reviewer's top three fixes are sent, web fonts and
palette are locked, and a repair is kept only if it scores higher (or the same
with fewer problems) without losing fonts, sections or artwork. Otherwise the
previous version stays final and the report says why.

Options: `--no-repair`, `--rounds 0-3`, `--target 1-10`, `--brief "..."`,
`--brief-file <path>`, `--files <folder>` (score existing React source). The
visual review needs `AI_PROVIDER=openai` or `anthropic`. Each run makes several
model calls billed to your provider account. Code: `server/design-review.mjs`
and `scripts/design-benchmark.mjs`.
