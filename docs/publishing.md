# Static website publishing

The editor publishes an immutable snapshot of the account's synced HTML/CSS/JS files. Draft changes do not change a public release. The owner can publish an update, restore one of the latest 20 releases, or unpublish. Deleting a project from the workspace unpublishes it on the next successful sync; deleting the account removes its releases. Website addresses are reserved permanently to prevent another account inheriting an origin's browser data.

Free and Basic allow one active website; Pro allows three. Public entitlements use live billing records only. Custom domains remain a separate integration. Current limits: 100 source files, 512 KiB per source file, 4 MiB per release. Only static websites work; dependency installation and server execution are not supported. Standard image URLs/data URLs and the bundled coffee/ceramics assets work; general binary asset uploading is not yet provided.

## Local development

`npm run dev` starts the app on 4175, Django on 4176 and the public gateway on 4177. The runner generates an ephemeral private service token. A published address such as `my-site.localhost:4177` resolves to loopback in Chrome. Alternate ports are configurable with PORT, DJANGO_PORT and DJANGO_PUBLISHING_PORT. These local addresses are not Internet hosting.

## Production

The publisher is a separate, read-only Node container. It only asks Django's private asset endpoint for an active release; it never forwards visitor credentials or proxies private APIs. Customer code executes in the visitor's browser, not on the VPS. Production account cookies use __Host- names and remain restricted to draftmango.com. Account APIs enforce the canonical origin. Public sites disable workers and are sent with no-store so rollback/unpublish takes effect on subsequent requests.

Generate DJANGO_PUBLISHING_TOKEN on the VPS and put the identical value in root-only shared/backend.env and shared/publishing.env. Only the backend and publisher receive it. Set DJANGO_PUBLISHING_ENABLED=1 in backend.env only when routing and HTTPS are ready. DJANGO_PUBLISHING_BASE_DOMAIN=draftmango.com. The publisher's root-only publishing.env must contain no database, billing or AI credentials.

Create a DNS-only wildcard A record for *.draftmango.com pointing at the VPS. Keep exact records such as the apex/www/mail intact. Obtain a wildcard certificate using Certbot dns-cloudflare with a token scoped to draftmango.com (Zone DNS Edit and Zone Read). Store the token in /opt/draftmango/shared/cloudflare-dns.ini with mode 0600, never in the web/publisher containers. The isolated certificate tree is /etc/letsencrypt/draftmango-publishing. Install nginx-publishing.conf only after the certificate exists; validate before gracefully reloading shared Nginx. Install the separate publishing certificate renewal service/timer and verify its staging dry run.

The Cloudflare secret is not an application runtime variable. The local .env field CLOUDFLARE_DNS_API_TOKEN is for provisioning only. Do not bundle .env or data in a release. Back up PostgreSQL before migrations; migrations add separate tables and preserve existing project records. Keep the previous release for rollback.

Public signup, SMTP, custom-domain activation, live payments, AI credentials and CLI pairing have separate launch gates. Enabling static publishing does not enable them. Before public signup, also establish abuse handling, storage/bandwidth enforcement, monitoring and off-server backup/restore operations.
