# Draftmango

A website workspace with a source editor, React preview, saved projects and
publishing. The AI generation engine is removed; the workspace UI and shared
template library remain. See [engine status](docs/ai-models.md).

## Quick start

Requires Node.js 22.12+ and Python 3.10+. On Windows PowerShell, use
`npm.cmd` in place of `npm` if scripts are blocked.

```
npm ci
npm run setup:accounts
npm run build
npm run dev
```

Open http://127.0.0.1:4175/. Use `.env.example` for server configuration. No AI key is required.

## Project layout

```
app/                 Next.js pages (JSX)
components/          Shared React components
web/                 Browser scripts, styles and assets for the pages
server/              Node services: API gateway, shared template engine,
                     React compiler, Django bridge, publisher
backend/             Django: accounts, projects, billing, publishing
scripts/             npm commands: dev runner, setup, reset
tests/               Node tests and fixtures
benchmarks/briefs/   Fixed briefs for the design benchmark
deploy/              Docker, Compose, Nginx, certificates
docs/                Guides (below)
```

Local-only, git-ignored: `.env`, `data/` (database, mail, backups, benchmark
reports), `out/`, `.next/`, `public/`, `node_modules/`, `.venv/`.

## Common commands

| Command | Does |
|---|---|
| `npm run dev` | Run everything locally |
| `npm run build` | Build the pages (after editing `app/`, `components/` or `web/`) |
| `npm run check` | Syntax-check server, web and script files |
| `npm test` | Node tests (build first) |
| `npm run test:accounts` | Django tests |
| `npm run reset:projects -- --email you@example.com` | Back up and replace an account's projects with one blank "Test" project |

## Guides

- [Architecture](docs/architecture.md): how the pieces fit, generated sites, limits
- [Development](docs/development.md): running, testing, resetting, version control
- [Engine status](docs/ai-models.md): removal and retained workspace features
- [Shared template engine](docs/shared-template-engine.md): library, design guards and MCP
- [Accounts](docs/accounts.md): Django accounts, email, local data
- [Billing setup](docs/billing.md) and [billing in production](docs/billing-deployment.md)
- [Publishing](docs/publishing.md): public static sites
- [Hosting](docs/hosting.md) and [HTTPS](docs/https.md): the VPS deployment

Changes are recorded in [CHANGELOG.md](CHANGELOG.md).
