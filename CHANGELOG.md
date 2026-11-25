# Draftmango changelog

## 25 November 2026 — Draftmango template library branding

- Renamed the active library to `web/draftmango`, with matching component, stylesheet, importer, runtime and asset names. Updated all 100 design families and 1,150 preview pages to Draftmango branding, including the approved mango mark, wordmark and favicons.
- Regenerated the React starters and 106 preview images. All 1,150 HTML pages were compared with the previous revision: only the name replacement changed their markup. Template layouts, styling rules, routes and interactions are retained.
- New web/MCP packages use the same branded catalogue, hosted preview URLs and assets. No Isotris files changed. Existing versioned package archives are retained.
- Kept original purchase/licence records untouched. Isolated the exact old hosted assets in `web/template-compat/v1` with SHA-256 checksums; legacy asset routes and workspace runtime detection preserve saved projects without rewriting their source or locks.
- Included the public icon-data registry in version control; the broad account-data ignore rule previously excluded it.
- Validation: syntax checks and production build passed; 144 non-browser regression tests passed, including all 100 template compilations, branded export/design guards, authenticated remote access and legacy asset compatibility. Captured all 100 template homepages and six showcase images through the browser, and checked the branded logo at mobile width.
- Local review only; not deployed to production.

## 25 November 2026

### AI engine removed; workspace retained
- Removed provider clients and configuration, model catalog, planning/generation/streaming, design review, paid API/benchmark tools and the unused legacy prompt interpreter. Retired AI API routes return HTTP 410, including requests from older tabs.
- Preserved the workspace interface, code editor, preview compiler, history, source import/export, publishing, managed stores, accounts, billing and domains. Shared template packages, deterministic content editing/design guards and MCP access remain intact; purchased assets and saved data were not modified.
- Kept composers visible with disabled model/send controls and a clear status. Saved question and plan cards remain read-only; saved store handoff controls still work. Removed automatic generation on load and background provider checks from Settings.
- Separated generic HTTP errors from the removed engine so accounts/domains/compilation continue working. Shared limits now accept only preview compilation.
- Validation: production build and syntax checks passed; 145 non-browser tests and six Django limit tests passed before the final unused-helper cleanup, followed by 40 focused passing regression tests. The full retained suite includes compilation of all 100 library templates. Browser review checked inactive prompts, saved cards, Settings and manual source edits surviving reload. Browser preview compilation could not complete on the review port because the local account service was not running; compilation and gateway behaviour passed automated tests. Existing standalone Playwright UI tests were updated but not run in this pass.
- Committed for review; not deployed. Existing private environment files and credentials were not read or changed.

## 24 November 2026

### Template library hidden from the interface
- Removed public template navigation, homepage showcases, gallery/category links, library statistics and the standalone catalogue/selection pages. Start buttons lead to the homepage brief. Previous `/templates` addresses redirect there too.
- Kept the internal catalogue, template packages, shared engine and MCP integration intact. Plan approval still shows the proposed design inside an isolated preview; opening it separately no longer loads a catalogue page.
- Updated related authentication, plan and store wording without changing their workflows or the purchased template sources.
- Validation: production build and 28 focused hosting, template-engine and builder-flow tests passed. Desktop/mobile navigation, retired-route redirects and the workspace proposed-design preview were reviewed locally. Not deployed; ready for review.

### Mobile workspace controls
- Kept preview/save status messages readable on separate rows beside larger Undo/Redo controls. Diagnostic tabs and actions wrap instead of shrinking.
- Enlarged mobile preview, file explorer, file-close and source toolbar controls while retaining the white surfaces and rounded design. Source metadata can wrap on narrow panes.
- Made short empty-preview panels scrollable, keeping the conversation action reachable in Split view, and retained a rounded, non-shrinking action for pending edits.
- Gave the Publish address input its own full row on phones, with the domain suffix beneath it inside the same rounded field.
- Checked Preview, Code, Split, diagnostics and publishing layouts at 320, 360, 390, 430, 760 and 1280 px; reviewed composer, attachment, project, account, navigation, history, guide, save and credit dialogs at phone width. Publishing used isolated sample data with writes disabled. Production build passed. Deployed as `20261124-mobile-workspace-8ad6abb`; all four services are healthy and public route/asset checks passed. See the [release record](docs/releases/2026-11-24-mobile-workspace.md).

### Mobile canvas Run button
- Prevented Run and the adjacent action buttons from shrinking inside the mobile toolbar. The action group wraps below the view tabs when the row is too narrow, retaining the white, rounded controls and full Run label/padding.
- Browser checks at 320, 360, 390, 430, 760 and 1280 px confirmed that Run and the action group fit without page overflow. Deployed as `20261124-mobile-2a8ca2a`; all four services are healthy and public route/asset checks passed. See [release record](docs/releases/2026-11-24-mobile-canvas.md).

### Sculpted mango identity
- Replaced the illustrated mango with the approved orange Sculpted vector mark and black wordmark across public pages, authentication, dashboard and workspace; the dark footer uses the white lockup.
- Added matching transparent favicon and downloadable orange, black and white SVGs, generated from one shared definition. Homepage colours and interface controls are unchanged.
- Production build and shared-brand route/asset checks passed; desktop, collapsed-navigation and dark-footer visuals reviewed. Deployed as `20261124-logo-bdc612f`; all four application services are healthy and live page/asset checks passed. See `docs/releases/2026-11-24-logo.md`.

### Homepage composer simplification
- The homepage now shows only the prompt field and send button. Model selection, microphone and attachments remain in the dashboard and workspace.
- Removed the unused homepage menu/voice controllers and popup styles. Long prompts still carry through sign-in, and the white rounded design remains.
- Deployed together with the preceding homepage update as `20261124-home-f23630f`; see `docs/releases/2026-11-24-homepage.md`.

### Homepage composer
- Replaced the homepage idea box with the dashboard's white, rounded composer, shared model picker, attachment menu and voice waveform controls. Removed its template-browser shortcut and the hero's “Launch preview · 100 designer-made templates” badge.
- Full prompts, model selections, project notes and attachments now carry through sign-in into the builder. Files and notes stay in browser storage during sign-in; verification links carry an expiring draft identifier, not file contents. Drafts are cleared after saving the project. Missing or expired browser context pauses the build for review rather than silently dropping attachments.
- Reused the workspace menu and popup styles, with responsive controls and no textarea resizing. The rest of the homepage and purchased template source are unchanged.
- Validation: 48 focused browser-controller and workspace tests and 8 account/email tests passed, syntax checks and Next.js production build passed. Desktop/mobile visual review completed locally; deployed with the simplified composer at source `f23630f`.

## 22 November 2026

### Remote template access for product backends
- Added opt-in authenticated MCP HTTP access, short-lived scoped bearer tokens, client expiry, rotation/revocation and shared Redis rate limits. Isotris users do not need Draftmango accounts; its future backend authenticates as a separately provisioned product.
- Added immutable authenticated package downloads with checksums, persistent storage and server-owned design validation. The local stdio contract and purchased template sources remain unchanged.
- Added an isolated `template_access` migration, explicit enable flags, client management command and deployment/connection guide in `docs/remote-template-access.md`.
- Verified 171 Node tests, 106 Django tests, migration completeness and the Next.js production build. No Isotris changes, real credentials or live deployment in this change. Priority remains the next reconciled production release.

### Shared template engine
- The web builder, browser template picker and local MCP server now load one template engine and catalog. The duplicate Next.js catalog was removed.
- New imports retain template/version metadata and design fingerprints. Personalization changes content fields and supported colours; layout, routing, classes, typography and vendor code are protected. Invalid pinned designs fail before a model request.
- Browser imports use the existing authenticated account request helper. Missing original demo media is reported explicitly.
- The Isotris adapter was connected to the shared validator while retaining source review and Undo; further Isotris work is paused at the owner's request.
- See `docs/shared-template-engine.md` for the contract and remaining remote-delivery/hosted-asset versioning work.

## 28 October 2026

### Sample sites replace the blank-site card
- Three fictional sample websites in `web/samples/`: Ember & Oak (café),
  Kiln & Co. (ceramics store) and Halden Studio (design portfolio). Each is a
  standalone page served at `/samples/<name>.html`, built from the existing
  coffee and ceramics photos, and says on the page that it is a sample.
- The homepage gallery shows their screenshots; each card opens the sample in a
  new tab, and "Use this idea" fills the prompt with that sample's brief. The
  sign-in page showcase shows Kiln & Co. New projects still start blank.
- `npm run samples:thumbnails` regenerates the screenshots with headless Edge or
  Chrome while the app is running.

### Google sign-in
- "Continue with Google" via OpenID Connect (code flow with PKCE), shown only
  when `DJANGO_GOOGLE_CLIENT_ID` and `DJANGO_GOOGLE_CLIENT_SECRET` are set. The
  Apple, Microsoft and GitHub placeholders are removed. Setup: `docs/accounts.md`.
- New `User.google_subject` field (migration 0005). New Google accounts follow
  `DJANGO_REGISTRATION_OPEN`.
- The Node proxy now passes account redirects through and accepts Google's
  cross-site return to `/api/accounts/google/callback` only.

## 27 October 2026 (afternoon)

### Project reorganized
- New layout: `server/` (Node services), `web/` (browser scripts, styles and
  assets; was `dist/`, which was source rather than build output), `scripts/`
  (npm commands), `tests/` (Node tests and fixtures), `benchmarks/briefs/`,
  `docs/` (all guides). `app/`, `components/`, `backend/` and `deploy/` are
  unchanged in place. Files were moved with `git mv`, so history follows them.
- One start-here `README.md` with a folder map, common commands and a guide
  index. The six setup `.txt` files and `deploy/*.md` are now Markdown guides in
  `docs/`, plus new `architecture.md`, `development.md` and `ai-models.md`.
- Updated every reference: imports, `.env` and `out/` paths, `package.json`
  scripts, both Dockerfiles (web image now runs `node server/serve.mjs`),
  `compose.yaml` (`server/publisher.mjs`, `server/build-service.mjs`),
  `.dockerignore`, and the Django published-asset path (`web/assets`).
- Verified: `npm run check`, `npm run build`, `npm test` 129 passed,
  `npm run test:accounts` 74 passed, and `npm run dev` served pages, assets,
  the account API and health check from the new layout.

## 27 October 2026

### Design benchmark: the see-and-fix loop
- `npm run benchmark:design` generates the fixed brief "Build a professional
  website for Dreadbyte Studios, an independent game development studio.",
  renders it in Chromium at desktop, tablet and mobile, measures it, has the
  vision model score the screenshots, makes one targeted repair and scores again.
  Report: `data/benchmarks/<time>-<name>/report.html` (screenshots, source,
  scores, reviewer fixes, automatic checks, timings).
- Automatic checks: sideways overflow, broken images, JavaScript errors, text
  left invisible by reveal animations, WCAG contrast, small mobile text and tap
  targets, type-scale sprawl, missing imagery; plus a source scan for AI-design
  clichés (gradient text, purple gradients, emoji icons, glass and glow overuse,
  generic marketing phrases, invented statistics or testimonials).
- Rubric: hierarchy, typography, layout, spacing, colour, imagery, copy,
  polish, distinctiveness and brand fit, scored 1–10 against professional work
  (7 = polished premium template, 8+ = bespoke professional).
- Files: `design-review.mjs`, `tools/design-benchmark.mjs`,
  `tools/design-review.test.mjs`, `tools/fixtures/cliche-site.mjs`.
  `ai.mjs` now exports its model request so screenshots can be sent.
  Playwright 1.63.0 is a dev dependency (`npx playwright install chromium`).
- Not yet wired into the builder: the benchmark first measures whether the
  loop is worth its time and cost.
- Tests: `npm test` 120 passed (includes a real Chromium capture).

### First real benchmark run and what changed after it
- Run 1 (fact-free brief, gpt-6-luna): first draft 6/10 (type 8, colour 8,
  imagery 3, copy 5). The repair also scored 6 but lost both web fonts (fell
  back to Arial), deleted a section and the hero artwork, and added a new
  placeholder line. Both rounds showed a note meant for the site owner on the
  page ("Replace this note with the studio's email…").
- The benchmark now uses Ryan's confirmed studio facts
  (`tools/benchmark-briefs/dreadbyte-studios.md`): Cameroon, since 2016, mobile
  and PC, Car Parking, Last Fuel and the untitled island game; no public contact
  address yet.
- Generation rule (design coordinator): everything visible is written for
  visitors; never show notes to the owner or "not provided" messages.
- New checks: leaked owner notes (high); emoji check limited to real emoji
  (✳ ★ → no longer flagged).
- Safe repair: top three fixes only; web-font imports, typefaces and palette
  locked; regression checks for lost fonts, removed font imports, removed
  sections and removed artwork; a repair is kept only when it is better,
  otherwise the earlier round stays final. Replaying run 1 through these checks
  rejects its repair for exactly the problems seen.
- Tests: `npm test` 124 passed.

## 26 October 2026 (evening)

### Blank site replaces the sample templates
- The homepage gallery (Slow Days, Studio North, Form & Field) and its preview
  dialog are replaced by one "Blank site" card. The sign-in page showcase is a
  blank site too. Idea buttons and "Surprise me" now use brand-neutral briefs.
- Every new project starts as a blank site: the builder's first preview, the
  React starter files and the Design panel, build settings and preferences
  pickers all offer only "Blank site". Old sample render code is kept solely so
  older saved drafts still open.
- Removed the unused legacy `dist/dashboard.js`. `npm run build` now rebuilds
  `public/` from scratch so deleted files are never served.

### Project reset tool
- `npm run reset:projects -- --email you@example.com` backs up an account's
  projects to `data/backups/`, deletes them and creates one blank "Test"
  project (built with the browser's own project model).
- The browser now drops cached copies of projects that were deleted on the
  server, keeping any unsynced edits.
- Rehearsed on a copy of the local database: 25 projects backed up and replaced
  by "Test"; a simulated browser holding the old 25 projects ended with only
  "Test" after one load (about 7 KB downloaded).
- Tests: `npm test` 112 passed; `npm run test:accounts` 69 passed.

## 26 October 2026

### Version control
- The project is now a git repository, pushed to a private GitHub repository.
  First commit: `821cbeb Initial commit` (the pre-Next.js static version).
- `.gitattributes` keeps every text file in Unix (LF) line endings. Deploy
  scripts and Dockerfiles run on Linux, where Windows (CRLF) endings break them.
  Images, fonts and databases are marked binary.
- `.gitignore` now also excludes `.changes-backup/`, `*.sqlite3`, Django logs,
  `.next/`, `out/` and `public/`, so backups, databases and secrets never reach git.
- The old `.changes-backup/` snapshots were deleted because they held a copy of
  `.env` and full database copies, all synced to OneDrive. Any keys from that
  `.env` should be replaced (OpenAI, Stripe, Name.com).

### Faster project loading (`dist/accounts.js`, `backend/accounts/views.py`)
- Before: every page load downloaded every project in full
  (`GET /api/projects`, about 400 KB per load in the development log).
- Now the browser first asks for a light list of project ids and versions
  (`GET /api/projects?summary=1`, up to 500 per page, documents not loaded from
  the database). It then downloads full documents only for projects it lacks
  or holds at a different version (`GET /api/projects?id=…&id=…`, up to 20 per
  request, only the signed-in account's projects).
- A normal reload now transfers a few hundred bytes. A new browser still
  downloads everything once.
- The original full listing (`?offset=`) still works for tabs opened earlier.
- Test: `test_project_summary_lists_versions_without_documents_and_ids_fetch_only_owned`.

### Generation limits shared across web servers
- Before: AI generation and React build limits were kept in the memory of a
  single Node process. With more than one web container, each container
  enforced its own limits, multiplying the real limits.
- Now, in production (`DRAFTMANGO_PUBLIC_ORIGIN` set), the gateway asks a new
  private Django route, `POST /internal/limits` (`backend/accounts/limits.py`),
  which keeps the limits in the shared Redis cache:
  - one generation and one build per account at a time;
  - 20 generation starts per 10 minutes and 2 seconds between starts per account;
  - 30 builds per minute per account;
  - at most 2 generations running site-wide.
- Each lock expires on its own if a web container dies mid-request, so capacity
  is never permanently lost.
- The route is authenticated with `DRAFTMANGO_BUILD_TOKEN` (already in
  `build.env` for web and backend), identifies the account from its session,
  and is never proxied to browsers. If it is unreachable, generation is refused
  (fails closed) rather than running unlimited.
- Local development (`npm run dev`) keeps the in-memory limits; nothing changes
  for a single process.
- Files: `backend/accounts/limits.py`, `backend/draftmango/urls.py`,
  `django.mjs` (`sharedLimit`), `serve.mjs`.
- Tests: `backend/accounts/test_limits.py` (6 tests) and
  `tools/hosting.test.mjs` (gateway acquires before generating, always releases,
  passes 429s through, refuses when the limit service is down).

### Investigated, no change needed
- A burst of 17 `PUT /api/projects` calls in one second (25 October log) was a
  one-time import of 17 device drafts into the account: each returned
  `201 Created` for a different project. Normal edits are already batched with
  a 1-second delay before syncing.

### Test status after these changes
- `npm test`: 110 passed, 0 failed (requires `npm ci` and `npm run build` first).
- `npm run test:accounts`: 67 passed, 0 failed.

### Local checkout cleanup
- The active checkout is now `C:\dev\DraftMango`, outside OneDrive.
- Removed the obsolete `OneDrive\Desktop\DraftMango` checkout after verifying
  its Git history and source were preserved in the new checkout. The only
  substantive source difference was the newer esbuild install-script setting.
- Verified all 26 saved projects, published-site data, migrations and workspace
  activity matched. Account differences were limited to login timestamps and
  sessions. Both SQLite databases passed their integrity checks before cleanup.
- The current environment and development-mail files were preserved. The local
  login page returned HTTP 200 after the old folder was removed.

### Still open
- Verify OneDrive has synced the deletion, then permanently remove Draftmango's
  deleted copies from the OneDrive cloud recycle bin. Dashboard sign-in is needed.
- Replace and verify the configured OpenAI and Name.com keys, then revoke their
  old keys through the provider accounts. No provider keys have been rotated by
  this cleanup. The local Stripe secret-key and webhook-secret fields are empty.
