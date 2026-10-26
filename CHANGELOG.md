# Draftmango changelog

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

### Still open
- Move the project folder out of OneDrive (for example `C:\dev\DraftMango`).
  OneDrive syncing `.venv`, `node_modules`, `.git` and SQLite can lock files
  and corrupt the database. Clone from GitHub into the new folder.
- Empty the OneDrive recycle bin and replace the API keys noted above.
