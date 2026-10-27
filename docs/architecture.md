# Architecture

Draftmango is a Next.js front end, a Node API gateway and a Django backend.
Everything runs locally with `npm run dev`; production uses Docker (see
[hosting.md](hosting.md)).

## Folders

| Folder | What lives there |
|---|---|
| `app/` | Next.js pages (JSX), one route group per page: home, auth, dashboard, workspace, pricing, about, help, legal |
| `components/` | Shared React pieces: `DocumentLayout.jsx`, and `PageControllers.jsx`, which loads the browser scripts for each page |
| `web/` | Browser scripts, stylesheets and assets used by the pages (copied to `public/` by `npm run build`) |
| `server/` | Node services: API gateway (`serve.mjs`), AI pipeline (`ai.mjs`, `conversation.mjs`, `design-coordinator.mjs`), design review (`design-review.mjs`), React compiler (`compiler.mjs`, `compiler-worker.mjs`, `build-service.mjs`), Django bridge (`django.mjs`), hosting checks (`hosting.mjs`), Name.com (`namecom.mjs`), public site server (`publisher.mjs`) |
| `backend/` | Django: accounts, projects, billing, publishing and shared limits (`backend/accounts/`), settings and URLs (`backend/draftmango/`) |
| `scripts/` | Command-line tools run through npm: dev runner, build preparation, account setup, Django tests, project reset, design benchmark |
| `tests/` | Node tests (`npm test`) and test fixtures |
| `benchmarks/briefs/` | Fixed briefs for the design benchmark |
| `deploy/` | Dockerfiles, Compose, Nginx and certificate services |
| `docs/` | Setup and operations guides |

Generated and local-only (git-ignored): `out/` and `.next/` (Next.js build),
`public/` (copy of `web/`), `data/` (SQLite database, local mail, backups,
benchmark reports), `.venv/`, `node_modules/`, `.env`.

## Pages

Page markup is authored as React JSX in `app/`. Next.js builds it into `out/`,
which `server/serve.mjs` serves. Clean routes replace the old `.html` links;
old bookmarks redirect while keeping their query and fragment.

Established account, editor and settings behaviour still runs through the
browser scripts in `web/`, loaded by `PageControllers`. They use DOM APIs;
moving them to React hooks is an incremental refactor. Each route has an
independent document lifecycle.

## Generated websites

New AI sites are React 19.3.1 projects (`src/App.jsx`, `src/main.jsx`,
`src/styles.css` and components). Every edit sends the complete source tree;
the model returns a strict list of path/content records. Paths, required files
and the build are validated before an AI update replaces a draft. Older HTML
projects keep their format and history. Every new project starts from a blank
site; the retired sample templates remain only so older drafts still open.

Preview uses the authenticated same-origin `/api/build`. A private service
compiles JSX with pinned esbuild, React and React DOM. Customer source, package
scripts and custom Vite configuration never execute on the server; imports are
limited to project files and the supported packages. Child processes have
deadlines, size and concurrency bounds, and no account or provider
credentials. Production runs the builder on a private network without
outbound access. Failed builds keep the last good preview and report errors.

Publishing compiles the authoritative source saved in Django and stores an
immutable release of HTML, CSS and JS (see [publishing.md](publishing.md)).
Browser-supplied build output is never trusted.

Source ZIP exports include package.json, Vite config and a README: extract,
`npm install`, `npm run dev`. A compiled standalone HTML export is also
available.

## Current limits

Generated projects are client-side React apps. Arbitrary npm dependencies,
Next.js server routes, customer server code and SSR deployment are not
enabled. Paid plans, public signup, custom domains and email delivery each
have separate launch gates.

## References

- https://nextjs.org/docs/app/getting-started/installation
- https://react.dev/learn/build-a-react-app-from-scratch
- https://esbuild.github.io/api/#build
- https://developers.openai.com/api/docs/guides/structured-outputs
