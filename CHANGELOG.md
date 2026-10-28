# Draftmango changelog

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
