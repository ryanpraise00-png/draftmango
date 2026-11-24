# Draftmango VPS deployment

Host: root@187.124.47.123 (srv1803759.hstgr.cloud), Ubuntu 24.04.
Application domain: draftmango.com. www redirects to the apex after TLS setup.

## Current release — mobile workspace controls

Live release: `20261124-mobile-workspace-8ad6abb`, source `8ad6abb`, deployed on
24 November 2026 from `codex/builder-guided-flow`. The reviewed mobile preview,
editor, diagnostics, status and Publish controls retain their white, rounded
design without compressing. All four application services are healthy; eleven
public routes and fourteen assets passed verification. Production flags remain
unchanged. See the [mobile workspace release record](releases/2026-11-24-mobile-workspace.md).

## Previous release — mobile canvas toolbar

Live release: `20261124-mobile-2a8ca2a`, source `2a8ca2a`, deployed on
24 November 2026 from `codex/builder-guided-flow`. Run retains its padding on
phones and the action group wraps when needed. All four application services
are healthy; public routes and asset checksums passed. Production flags remain
unchanged. See the [mobile canvas release record](releases/2026-11-24-mobile-canvas.md).

## Previous release — Sculpted logo

Live release: `20261124-logo-bdc612f`, source `bdc612f`, deployed on
24 November 2026 from `codex/builder-guided-flow`. The site now uses the approved
orange Sculpted mark and black wordmark, a white footer lockup and matching
favicon. Web, backend, builder and publisher are healthy; public routes and
asset checksums passed. Production flags remain unchanged.
See the [logo release record](releases/2026-11-24-logo.md).

## Previous release — homepage composer

Live release: `20261124-home-f23630f`, source `f23630f`, deployed on
24 November 2026 from `codex/builder-guided-flow`. The homepage has the white,
rounded prompt-and-send composer, the launch badge is removed, and the account
handoff preserves long prompts. Web, backend, builder and publisher passed
health checks; public routes/assets and the rendered homepage were verified.
See the [homepage release record](releases/2026-11-24-homepage.md).

## Previous release — white dashboard and workspace

Previous release: `20261124-white-3120a0d`, source `3120a0d`, deployed on
24 November 2026 from `codex/builder-guided-flow`. The web, backend, builder and
publisher are healthy; public page responses and deployed asset checksums were
verified. The prior release and database backup are retained for rollback.
See the [release record](releases/2026-11-24.md).

Managed-store source and its three additive migrations are installed, but
`DJANGO_STORES_ENABLED=0` keeps store services disabled pending activation.
Store payments, the store worker and remote Isotris access were not enabled.
The historical release and initial installation notes below describe earlier
states; use the current release record when planning the next deployment.

## Previous release — shared engine, remote-access infrastructure and guided builder

Released on 22 November 2026 from `codex/builder-guided-flow`, including:

- `7b81ed1`: shared template engine, catalog and design-preserving imports.
- `7141648`: authenticated remote MCP, backend client credentials and versioned
  template package delivery.

Status: live. Release directory and images: `20261122-guided-f5c864f`.
Source includes `f5c864f` plus backend ownership fix `c1a2175`, both pushed.
Web, backend, builder and publisher are healthy; public pages/assets and the
existing testing portal were verified. Database backup and rollback metadata
were saved privately before migration. The `template-packages` volume exists.
Both remote-access flags remain disabled; no Isotris client was provisioned.
Isotris code was not changed. See [release record](releases/2026-11-22.md).

### Release order

1. Reconcile the branch with the actual running release, including any
   production-only Bisuk changes. Preserve the current release identifiers,
   configuration and rollback information before rollout.
2. Deploy the Next.js output, Node gateway and Django backend together. Apply
   the isolated `template_access` migration and mount the private persistent
   `template-packages` volume at `/app/data/template-packages`. Preserve that
   volume across releases and include it in private backups.
3. Verify the canonical HTTPS origins and matching internal
   `DRAFTMANGO_BUILD_TOKEN` on Node and Django. Stage both remote-access flags
   disabled. Follow [remote access setup](remote-template-access.md) for the
   activation checks and backend-only credential provisioning when Isotris's
   backend is ready. The activation flags are `DJANGO_TEMPLATE_REMOTE_ENABLED`
   on Django and `DRAFTMANGO_TEMPLATE_REMOTE_ENABLED` on the web gateway.
4. Verify the existing authenticated browser import, saved template/version
   metadata and design-preserving personalization. At remote activation, check
   unauthorized and insufficient-scope rejection, token expiry/revocation,
   package checksums, pinned-version downloads, accepted content edits and
   rejected layout changes. Record the deployed release and activation status.

### Boundaries to retain

- Leave Isotris code and its current local stdio integration alone. A future
  Isotris backend will authenticate as a product; its users do not need separate
  Draftmango accounts. Never ship service credentials in the desktop app.
- Keep the current hosted template assets available. Immutable remote packages
  do not version existing preview/publishing asset URLs; durable hosted-asset
  storage is still required before changing those URLs' underlying assets.
- Do not overwrite or evict previously exported package versions during rollout
  or rollback. Preserve the purchased template sources and their designs.

See the [shared engine contract](shared-template-engine.md) and
[remote access setup](remote-template-access.md). The implementation passed
171 Node tests, 106 Django tests, migration checks and the Next.js production
build. These are local results, not proof of a production rollout.
The older initial-installation sections below are historical setup guidance;
check live configuration rather than assuming they describe today's deployment.

## Included in that release — guided builder conversation

`codex/builder-guided-flow` builds on the shared-engine branch and adds saved
requirements, suggested/custom answers, an explicit plan confirmation, complete
template-content passes, visible progress, a composer stop control and a source
completion checklist. See [the builder implementation and remaining work](builder-guided-flow.md).
It was deployed together with the shared engine and reconciled production account changes.

For future releases, preserve the shared-engine changes and validate
new and existing conversations on desktop/mobile, stop/retry and reload. The
combined Node/browser suite passed 182 tests; the final affected builder checks
passed 12 tests after the last refinements, and the Next.js build passed. These
tests use mocked AI responses. Real-model latency/cost calibration remains open.
The next release implements the first managed store workflow, including customer
accounts/data, owner payment connections and reviewed page extensions; see
[managed stores](stores.md). It still requires payment onboarding and published
journey verification before a store can accept real customers.

## Layout
```
/opt/draftmango/releases/<release>/ : immutable source for each release
/opt/draftmango/current             : current source symlink
/opt/draftmango/shared/backend.env  : Django, database, SMTP and Stripe secrets
/opt/draftmango/shared/web.env      : AI, Name.com and trusted-proxy settings
/opt/draftmango/backups             : PostgreSQL backups (sensitive)
Docker volumes: draftmango_postgres, draftmango_redis
```

The initial installation is PRIVATE: only 127.0.0.1:4180 is published on the VPS.
Backend, database and Redis have no host ports. The app expects Host:
draftmango.com and HTTPS at the proxy. It has fresh signing keys and a fresh
database; no desktop accounts, mail, provider keys or projects are uploaded.
Signup is disabled until verified SMTP delivery is ready. Billing remains in
test mode with no configured keys. The shared Nginx proxy serves only an HTTP
setup response and certificate challenge path for the new domain.

## Resource bounds
Web: 512 MB, 1 CPU; backend: 512 MB, 1 CPU, 2 Gunicorn workers x 2 threads.
PostgreSQL: 512 MB, 0.5 CPU; Redis: 128 MB, 0.25 CPU.
Containers restart automatically and have bounded JSON logs.
Generation limits are shared through Redis, so they hold across web replicas:
one generation and one build per account at a time, 20 generation starts per
10 minutes, 30 builds per minute, and at most 2 generations site-wide. The web
gateway asks Django's private /internal/limits route, authenticated with
DRAFTMANGO_BUILD_TOKEN from build.env; it is never proxied publicly. If the
route is unavailable, generation is refused rather than run unlimited.
Credit metering still needs implementation before paid public AI.

## Operations
```
cd /opt/draftmango/current/deploy
docker compose ps
docker compose logs --tail 50 backend web
docker compose run --rm backend python manage.py migrate --noinput
docker compose exec -T backend python manage.py check --deploy
sh /opt/draftmango/current/deploy/backup.sh
```

Never print docker compose config, docker inspect .Config.Env, or secret files
into shared logs/chat. Changing .env files requires container recreation.
Do not run docker compose down -v; volumes contain accounts and projects.
Before updates, back up the database, record image digests and the current
release, then migrate and verify health. Keep the previous source and images.
Code rollback: return current to the previous release and compose up -d from
its deploy directory using its recorded image tag. Database rollback requires
a separately validated restore; do not assume schema changes are reversible.

## Remaining public launch work
1. Cloudflare: A record @ -> 187.124.47.123; CNAME www -> draftmango.com.
Begin DNS-only (grey cloud), TTL Auto; do not create an AAAA record yet.
2. Issue and verify a certificate for both names using the existing certbot
webroot /var/www/certbot. Add a renewal/reload process and test renewal.
3. Persist draftmango-edge in the existing Nginx Compose configuration;
connect that network and set its exact IP as the trusted proxy in web.env.
Validate nginx -t before installing nginx-https.conf.example and reloading.
If enabling Cloudflare proxy later, use Full (strict) and configure trusted
Cloudflare client IP handling; do not trust arbitrary CF headers.
4. Configure verified transactional SMTP and test signup/reset delivery.
5. Add provider keys privately. Run Stripe test checkout/webhook/portal tests.
Do not switch BILLING_MODE to live until launch services and metering work.
6. Establish scheduled backups, retention and an encrypted off-server copy;
perform a restore test before storing customer data.
7. Generated customer websites require a separate untrusted hosting origin,
publishing jobs, custom-domain ownership checks and automated TLS. This
deploys the Draftmango application only; it does not publish customer sites.

## References
https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/
https://gunicorn.org/reference/settings/
https://docs.docker.com/compose/how-tos/networking/

## Private build service

`deploy/compose.yaml` runs a private builder service. The web, backend and
builder containers read root-only `/opt/draftmango/shared/build.env` with
`DRAFTMANGO_BUILD_TOKEN` and `DRAFTMANGO_BUILD_URL=http://builder:4178/build`.
No build port is public. The same token lets the web gateway use Django's
private shared limits (`/internal/limits`), so limits hold across web replicas.
