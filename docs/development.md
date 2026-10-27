# Development

## Run locally

Requires Node.js 22.12+ and Python 3.10+. On Windows PowerShell use `npm.cmd`
in place of `npm` if scripts are blocked.

```
npm ci
npx playwright install chromium   # once, for the design benchmark
npm run setup:accounts
npm run build
npm run dev
```

Open http://127.0.0.1:4175/. `npm run dev` starts Django (4176), the API
gateway (4175), the public site server (4177) and the private React compiler
(4178). After changing anything in `app/`, `components/` or `web/`, run
`npm run build` and refresh.

Keep API keys in the server-only `.env` (copy `.env.example`); never use
`NEXT_PUBLIC_` for credentials.

## Checks

```
npm run check         # syntax check of server, web and script files
npm run build         # Next.js build into out/
npm test              # Node tests in tests/ (build first)
npm run test:accounts # Django tests
```

## Reset projects

Stop `npm run dev`, then:

```
npm run reset:projects -- --email you@example.com
```

It writes a JSON backup of that account's projects to `data/backups/`,
deletes them and creates one blank project named Test (`--title` changes the
name, `--yes` skips the confirmation). The browser drops its cached copies of
deleted projects on the next dashboard load.

## Design benchmark

```
npm run benchmark:design
```

Generates the fixed brief in `benchmarks/briefs/`, screenshots and scores it,
makes one safe repair and scores again. See
[design-engine.md](design-engine.md#design-benchmark).

## Version control

The project is in git and pushed to a private GitHub repository. Commit and
push after each change. Git ignores `.env`, `data/`, logs, `node_modules/`,
`.venv/`, `.next/`, `out/` and `public/`. See `CHANGELOG.md` for history.
