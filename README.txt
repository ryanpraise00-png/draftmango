Draftmango — Next.js / React with Django accounts

Run locally (Node.js 22.12+, Python 3.10+)
  npm ci
  npm run setup:accounts
  npm run build
  npm run dev
  Open http://127.0.0.1:4175/

After changing the application source, run npm run build and refresh. The local
runner starts Django, the API gateway, publisher and private React compiler.
Keep API keys in the server-only .env; never use NEXT_PUBLIC_ for credentials.

Application source
  app/(home)/page.jsx                    Homepage
  app/(auth)/auth/page.jsx               Sign in / sign up
  app/(dashboard)/dashboard/page.jsx     Projects, settings, domains, billing
  app/(workspace)/workspace/page.jsx     Builder workspace
  app/(pricings)/pricings/page.jsx        Pricing
  app/(about), app/(help), app/(legal)    Information pages
  components/DocumentLayout.jsx          Shared React document layout
  components/PageControllers.jsx         Lifecycle bridge for existing controllers
  dist/                                 Shared styles, assets and established JS
  backend/                              Django accounts, projects and publishing
  serve.mjs                             Same-origin API gateway serving out/

Page markup is authored as React JSX. Next.js builds it into out/ for the VPS.
Browser output contains HTML, as with every React app. The standalone HTML page
sources are retired. Clean routes replace .html links; old bookmarks redirect
while retaining their query/fragment. The existing design and CSS are preserved.

Migration boundary
Established account, editor and settings behavior currently runs through
PageControllers. These controllers still use DOM APIs. Moving every controller
to React hooks remains an incremental refactor; not all application state has
been rewritten in this release. Each route has an independent document lifecycle.

Generated websites
New AI sites default to React 19.3.1 with src/App.jsx, src/main.jsx, src/styles.css
and additional components. Every edit sends the complete source tree. The model
returns a strict array of path/content records. Paths, required entries and the
build are validated before an AI update replaces a draft. Existing HTML projects
retain their format and history.

Preview uses authenticated same-origin /api/build. A private service compiles JSX
with pinned esbuild, React and React DOM. Customer source, package scripts and
custom Vite configuration are never executed on the server. Imports are limited
to relative project files and supported packages. Child processes have deadlines,
bounded size/concurrency and no account or provider credentials. Production uses
a private network without outbound access. Failed builds preserve the last good
preview and report source errors.

Publishing compiles authoritative source saved in Django, then stores an immutable
release of browser HTML/CSS/JS. Browser-supplied build outputs are not trusted.
Ownership, version, quota, rollback and unpublish checks remain in place.

Source ZIP exports include package.json, Vite config and README. Extract, run
npm install, then npm run dev. npm run build produces deployable files in dist/.
Compiled standalone HTML export also remains available. External images/fonts
may need an internet connection.

Current limits
Generated projects are client-side React apps. Arbitrary npm dependencies,
Next.js server routes, customer server code and SSR deployment are not enabled.
This migration does not activate paid plans, public signup, custom domains or
email delivery, and does not change the configured model.

Starting point
Every new project starts from a blank site. The former sample sites and
starter templates are no longer offered; their render code remains only so
older saved drafts can still open.

Reset projects (local development)
Stop npm run dev, then:
  npm run reset:projects -- --email you@example.com
It writes a JSON backup of that account's projects to data/backups/, deletes
them, and creates one blank project named Test (--title changes the name,
--yes skips the confirmation). Open the dashboard afterwards; the browser drops
its cached copies of deleted projects automatically on the next load.

Design benchmark (see-and-fix loop)
One-time setup: npm ci, then npx playwright install chromium.
  npm run benchmark:design
Generates the fixed Dreadbyte Studios brief with the AI provider in .env, renders
it at 1440/768/390 px in Chromium, runs automatic checks (overflow, contrast,
broken images, invisible text, AI-design clichés such as gradient text, purple
gradients, emoji icons, generic copy and invented statistics), asks the model to
score the screenshots against a design rubric, applies one targeted repair and
scores again. The report is written to data/benchmarks/<time>-<name>/report.html.
The default brief is tools/benchmark-briefs/dreadbyte-studios.md (confirmed
studio facts; edit it to add a contact email or change details).
Repairs are safe: only the reviewer's top three fixes are sent, web fonts and
palette are locked, and a repair is kept only if it scores higher (or the same
with fewer problems) without losing fonts, sections or artwork. Otherwise the
previous version stays final and the report says why.
Options: --no-repair, --rounds 0-3, --target 1-10, --brief "...",
--brief-file <path>, --files <folder> (score existing React source). Visual review needs AI_PROVIDER=openai or anthropic.
Each run makes several model calls and is billed to your provider account.

Checks
  npm run check
  npm run build
  npm test
  npm run test:accounts

Deployment
compose.yaml adds a private builder service. web/backend/builder use root-only
/opt/draftmango/shared/build.env with DRAFTMANGO_BUILD_TOKEN and
DRAFTMANGO_BUILD_URL=http://builder:4178/build. No build port is public.
The same token lets the web gateway use Django's private shared limits
(/internal/limits), so generation/build limits hold across web replicas.
Other service setup remains in ACCOUNT-SETUP.txt and HOSTING-SETUP.txt.

Version control
The project is in git and pushed to a private GitHub repository. Commit and
push after each change instead of copying folders into .changes-backup (that
folder, databases, logs, .env, node_modules, .next and out are git-ignored).
See CHANGELOG.md for what changed and when.

References
https://nextjs.org/docs/app/getting-started/installation
https://react.dev/learn/build-a-react-app-from-scratch
https://esbuild.github.io/api/#build
https://developers.openai.com/api/docs/guides/structured-outputs

AI model selection
------------------
The model menu in the dashboard composer and editor selects GPT-6 Luna, GPT-6 Sol, Claude Sonnet 5.5 or Claude Opus 5.5 per conversation. A provider-specific model configured in .env is also included. Existing conversations without a choice use AI_PROVIDER and its model setting.
Keep OPENAI_API_KEY for GPT and add ANTHROPIC_API_KEY for Claude in the server .env. Keys coexist and remain on the server. Save the file, then refocus the window to refresh the model menu. A model marked Add key can be selected, but generation will stop with setup instructions until its key exists. Availability in your provider account is verified by a real request, not by the menu.
Selection applies to both design planning and implementation. Switching keeps files and conversation history; there is no automatic fallback to another provider. Existing rate limits apply across all models. Claude supports the same image, PDF and text references as GPT. Requests without a model selection retain the server default.
