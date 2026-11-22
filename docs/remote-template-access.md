# Remote template access for product backends

Status: deployed on 22 November 2026 in release `20261122-guided-f5c864f`, with both remote-access flags disabled. No production client has been provisioned. Isotris has not been changed by this work. Its existing local stdio connection remains available until its backend integration is implemented.

Isotris users keep their Isotris login. The future Isotris backend authenticates to Draftmango using a product-specific credential, obtains a short-lived access token, and calls the shared library. Neither the product secret nor the access token belongs in a desktop build, browser, model prompt, project export, Git repository or analytics event. Isotris must authorize its own users and enforce their entitlements before forwarding operations. This service authenticates products, not individual Isotris users.

## Protocol and endpoints

All public URLs use the configured canonical HTTPS origin. For production:

| Endpoint | Purpose |
| --- | --- |
| `https://draftmango.com/mcp/templates` | Stateless MCP Streamable HTTP, JSON responses |
| `https://draftmango.com/api/template-access/token` | OAuth client-credentials token exchange |
| `https://draftmango.com/.well-known/oauth-protected-resource/mcp/templates` | Protected-resource metadata |
| `https://draftmango.com/.well-known/oauth-authorization-server/template-access` | Authorization-server metadata |
| `https://draftmango.com/api/template-packages/{id}/{version}` | Authenticated gzip JSON download |

The issuer is `https://draftmango.com/template-access`; the resource/audience is exactly `https://draftmango.com/mcp/templates`. Package URLs use the same token and audience as this resource. There are no signed public download links or credentials in URLs.

This implements the client-secret form of [MCP machine-to-machine authentication](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials), with server-stored opaque access tokens. It is not an interactive user OAuth login. Clients must support client credentials, or have their backend set the bearer header explicitly. Pin the trusted issuer and token endpoint; never send the product secret to a URL supplied by an untrusted MCP server or redirect.

MCP supports protocol versions `2025-06-18` and `2025-03-26`. Send `Accept: application/json, text/event-stream` and `Content-Type: application/json`, and the negotiated `MCP-Protocol-Version` on subsequent requests. There are no session IDs or server-initiated messages. Known notifications and client responses return 202; SSE GET and session DELETE return 405. Requests with a foreign Origin, cross-site Fetch Metadata, query strings, batches or unsupported protocol versions are rejected. No CORS permission is granted to desktop webviews or third-party websites.

## Client provisioning

Use the Django management command on the selected deployment, with its actual production database configuration. Client creation is an operator action, not a public API. The new `template_access` application has its own migration history and no dependency on the existing account migrations.

```sh
python manage.py migrate template_access --noinput
python manage.py template_client create isotris-production --secret-file /tmp/isotris-template-client.json
python manage.py template_client status isotris-production
```

Use a private directory outside the repository for the credential file. The command creates a new file exclusively with mode 0600 on Linux and never prints credentials. Windows operators must also use a directory with appropriate NTFS permissions. The file contains the client id, secret, endpoint, resource, scopes and expiration. Transfer it directly into the Isotris **backend** secret store when that backend is ready, then remove the temporary file. There is no benefit to provisioning now and leaving credentials idle.

The default client lifetime is 90 days; `--days` accepts 1–365. `--scopes` can restrict a new client to any combination of:

- `templates:read`: search and template details.
- `templates:download`: package descriptors and downloads.
- `templates:validate`: source design validation against a server-owned manifest.

Each authorized product can access the current shared library within these scopes. This does not implement per-template licensing allocations, billing or end-user entitlements. Existing public template previews/assets remain public; this protects the MCP service and versioned bundle route, not every existing public demonstration file.

Rotate or revoke independently of other products:

```sh
python manage.py template_client rotate isotris-production --secret-file /tmp/isotris-template-client-next.json
python manage.py template_client revoke isotris-production
```

Rotation preserves the current scopes unless explicitly changed. Both rotation and revocation invalidate existing access tokens. Rotation has no overlap/grace period: coordinate the backend credential update. Status prints only the id, scopes, enabled state and expiration. Only SHA-256 hashes of 256-bit random secrets/tokens are stored in the database.

## Token exchange

POST URL-encoded form data to the token endpoint, authenticated with `Authorization: Basic base64(client_id:client_secret)`. Generated ids/secrets contain only unreserved characters. Do not put credentials in the form or URL.

```text
grant_type=client_credentials
resource=https://draftmango.com/mcp/templates
scope=templates:read templates:download templates:validate
```

The JSON response contains `access_token`, `token_type: Bearer`, `expires_in` and `scope`. Tokens last at most 900 seconds, bounded by client expiry. There is no refresh token. Cache and reuse the access token in the product backend; obtain a new one shortly before expiry. Every MCP and download request sends `Authorization: Bearer <access_token>`. Cookies and Draftmango customer sessions do not authorize these endpoints.

The private Node-to-Django check verifies expiry, current client state/revision, audience and scope on every request, with no cached positive authorization. The gateway uses the existing shared `DRAFTMANGO_BUILD_TOKEN` to authenticate this private call; it does not forward a browser cookie or caller-provided internal header. `/internal/template-access/authorize` is never routed publicly.

## Tools and import contract

1. `search_templates({brief, limit?})` uses Draftmango's own picker and catalog.
2. `template_details({id})` returns pages and editing guidance.
3. `get_template_package({id, version?})` returns the template identity, authenticated download URL, compressed-byte SHA-256, byte length, format and missing-asset warnings. Supplying a version pins it; an unavailable historical version is an error, never today's substitute.
4. `validate_template_files({id, version, files, partial?})` checks proposed source against the manifest in the server-owned package. A client cannot replace that manifest through tool arguments. Partial validation only checks submitted source; full validation also detects deleted protected files.

The download format is `draftmango-template-json-gzip-v1`. Verify the compressed SHA-256 and length against the descriptor, then decompress with a 48 MiB output limit. The object contains `template`, `manifest`, `files` (source), `assetFiles` (vendor text), `binaryFiles` (base64 vendor assets) and `missingAssets`. Verify each source/asset against the manifest's SHA-256 before import, and reject traversal, absolute paths and symlink escapes. Import through the host's review/Accept/Undo workflow. Keep a trusted manifest outside model-editable project files. File export does not execute package scripts or project code.

The remote API returns descriptors rather than the old stdio `get_template_files` payload. The future Isotris backend/host adapter must implement download and review; merely entering the remote URL into its existing adapter does not complete that integration. The stdio protocol is unchanged.

Design validation preserves the existing layout, typography, CSS, routing and runtime, allowing only the established content fields, browser title and bounded colour overrides. Imported asset checks remain the host's responsibility. It must recheck vendor hashes after local commands and reject protected source changes; this is not an OS sandbox for arbitrary shell commands.

## Deployment and storage

The 22 November release reconciled and preserved the production Bisuk account routes, models, migrations and portal routing. Before a later release, repeat the running-release comparison rather than assuming production has remained unchanged. Remote activation still requires explicit backend-client provisioning.

- Deploy Node and Django together and apply `template_access` migrations.
- Keep `DRAFTMANGO_BUILD_TOKEN` configured identically on both private services.
- Set `DJANGO_APP_ORIGIN` and `DRAFTMANGO_PUBLIC_ORIGIN` to `https://draftmango.com`.
- Backend opt-in: `DJANGO_TEMPLATE_REMOTE_ENABLED=1` in its environment.
- Web opt-in: `DRAFTMANGO_TEMPLATE_REMOTE_ENABLED=1` in its environment.
- Mount the private persistent `template-packages` volume at `/app/data/template-packages`; the compose file and web image prepare it for uid 1000. Set `DRAFTMANGO_TEMPLATE_PACKAGES_DIR` accordingly.
- Preserve this volume across releases and include it in private backups. Never mount it under Next's public/out directory or expose it directly through Nginx.
- Provision a product credential only when its backend is ready. Verify authentication, denial cases, checksum, content edit acceptance, layout rejection and revocation after enabling.

Exports are created on demand from the exact same engine used by Draftmango, then atomically retained without replacement. Versioned packages survive a library upgrade **if that version was exported first**. A missing version that cannot be reproduced from the current library fails closed. This does not retrofit immutable URLs into Draftmango's existing hosted preview/publishing assets; that remains separate work.

Limits: 4 MiB per library asset and 24 MiB total raw assets (existing engine); 48 MiB raw package; 32 MiB compressed package; 8 MiB MCP request; one active expensive operation per Node process; 1 GiB archive-store budget. The store refuses new exports when full rather than evicting versions. The storage quota is an operational bound checked before writes, not a cross-process reservation: concurrent gateways can exceed it by the in-flight exports. Monitor volume use and increase capacity deliberately.

Shared Redis counters enforce 30 token requests per IP/minute, 10 per client/minute, 300 resource authentication attempts per IP/minute, 120 total resource requests per client/minute, 60 MCP requests and 10 downloads per client/minute. These are fixed one-minute windows; boundary bursts are possible. At most 32 active tokens are retained per client; expired tokens are removed during issuance. Rate limits return 429/Retry-After. Authentication/database/cache outages fail closed with 503. The reverse proxy must keep supplying a trusted client IP as documented in `hosting.md`; do not trust client-supplied forwarding headers.

Disable both opt-in flags to withdraw remote access without removing the library or changing the normal Draftmango builder. Revoking one product identity is the narrower option.

## Verification

`npm test` covers the remote HTTP transport, origin/Host checks, scopes, request bounds, immutable archives, download hashes, trusted design validation and private-header isolation. `npm run test:accounts` includes isolated credential issuance/rotation/revocation and a real local Node → Django → database → engine → package download test. These tests use temporary databases, archives and generated test credentials, with no customer account or Isotris change, live email, provider request or production deployment.
