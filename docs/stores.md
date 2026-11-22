# Managed stores â€” first complete workflow

Status: implemented for Fashion Store 1 and tested locally with an isolated
database, mail outbox and payment-provider fixture. Not part of the already-live
guided-builder release. Real owner payments require separate Stripe Connect
platform configuration and an owner completing onboarding.

## Customer and owner experience

A confirmed store build on Fashion Store 1 attaches `storefront.json` and the
trusted `src/storefront.jsx` capability. An existing Fashion Store 1 project can
enable the same workflow through Dashboard â†’ Stores. No different template is
silently substituted. Original purchased files are never edited. Every original
project page, stylesheet and runtime remains intact; the reviewed adapter reuses
the template's page components, heading, category rail, product cards, account
form, cart table, header and footer. Only the React entry import changes.

Customers can browse/search/filter/sort products, select a variant, save a
wishlist on their device, maintain a cart across reloads, create and verify an
account, sign in, reset a password, use guest or account checkout, see confirmed
payment and order history, follow shipment tracking, read owner-written policies,
and contact the store. Newsletter requests appear in the owner's messages; this
does not send a marketing campaign or promise a discount.

Owners manage product descriptions, HTTPS photos, categories, SKU variants,
prices and available stock; hide products; inspect payments and delivery details;
mark paid orders fulfilled and attach tracking; issue full refunds; control
customer account access; resolve messages; and configure business country,
currency, shipping, tax and policies. Settings show the payment environment and
readiness. Checkout stays closed until the published site, active products,
shipping countries, all four policies and payment connection are ready.

This first physical-goods workflow supports up to 500 products, 50 options per
product, one store currency, a flat shipping charge, owner-configured tax and
full refunds. It does not automatically determine tax obligations, shipping
carrier prices, discount campaigns, partial refunds, subscriptions or digital
fulfilment. Other template adapters and verified custom-domain store routing are
separate work. Customer services currently resolve the published Draftmango
subdomain. Preview iframes do not receive customer sessions or payment access.

## Data and payment boundaries

- Store customers are separate Django records, not Draftmango platform users.
  Customers, products, orders and messages are scoped to the project-owned store.
  An email address may have independent accounts in different stores.
- Passwords are hashed. Verification/reset links are single-use, scoped and
  expiring. Session tokens are stored hashed; production cookies are HttpOnly,
  Secure, SameSite=Lax and `__Host-` scoped. Password resets and disabling a
  customer revoke sessions. No credentials go into generated files.
- The publisher only exposes an allowlisted `/api/store/*` boundary. It checks
  the tenant hostname, exact request origin, JSON and a custom mutation header,
  strips all platform credentials and forwards only the store session cookie.
  The backend additionally requires a private publishing token and active site.
  Static asset responses continue to drop every cookie and arbitrary header.
- Prices, currency, stock and totals are server-owned. Checkout snapshots the
  products and reserves available stock in a transaction. A request key prevents
  duplicate orders. Stripe requests use the same idempotency key across retries.
  Ambiguous timeouts retain stock; only verified expiry or a definitive first rejected
  creation releases it. Never free stock just because a local timer expired.
- Stripe-hosted checkout uses the owner's connected account via `Stripe-Account`.
  Card data never reaches our forms. Customer purchases do not use Draftmango's
  subscription prices or billing customers. No platform transaction margin has
  been added. Payment success is verified from Stripe, not trusted from a redirect.
- Connected-account webhooks verify signatures, mode, account, currency, amount
  and order reference, then reconcile from the provider. Replays are idempotent.
  Full external refunds are reconciled from `charge.refunded`. Refunds do not
  restock returned goods automatically. Owners update available stock explicitly.
- `process_store_orders` reconciles pending sessions and retries paid-order
  receipts independently of HTTP requests. Receipt delivery is at-least-once;
  an SMTP timeout after acceptance can cause a repeated receipt. Order records
  prevent accidental account hard-deletion; support must arrange closure/retention.

## Deferred payment providers

Stripe remains the first store payment provider. Additional providers are deferred
and are not a current builder priority. Store owners complete their own onboarding.

## Activation checklist

1. Deploy this source, build the web/backend images and apply the `stores` migrations.
   Keep `DJANGO_STORES_ENABLED=0` until the boundary and worker are installed.
2. Install the new `/api/store/` location from `deploy/nginx-publishing.conf`.
   It permits a 64 KB body and only that route forwards customer cookies.
   Set `DRAFTMANGO_TRUSTED_PROXY_IPS` in the publisher's private environment to
   the actual nginx bridge IP so rate limits use nginx's verified client IP.
3. Enable Stripe Connect on the platform account. Configure **separate**
   `STORE_STRIPE_KEY`, `STORE_STRIPE_MODE=test`, and
   `STORE_STRIPE_WEBHOOK_SECRET` on backend and worker. Never reuse a subscription
   webhook secret or put credentials into project source. The key must permit
   connected account creation/retrieval, account links, checkout sessions,
   payment/charge reads and refunds. Restrict it to those needs where supported.
4. Create a **connected accounts** snapshot webhook at
   `https://draftmango.com/api/stores/webhook`, for
   `checkout.session.completed`, `checkout.session.expired`, `account.updated`
   and `charge.refunded`. Requests use Stripe API `2026-11-18.endive`.
5. Start `docker compose --profile stores ... up -d store-worker` using the
   production compose/override/env files, then enable `DJANGO_STORES_ENABLED=1`
   for backend and worker. Verify SMTP and the public customer boundary.
6. In the owner's Stores screen, add real products, policies and shipping, publish
   the project, complete Connect onboarding, refresh the connection and open
   checkout. Make a provider **test-mode** purchase and check webhook delivery,
   receipt, fulfilment, expiry and refund. Switching to live mode requires its
   own account/webhook configuration and migration of any test-only connections;
   the code refuses cross-mode account reuse.

Local development: `npm run dev` applies migrations and starts the order worker
with the same local backend environment. It does not obtain provider credentials
automatically. `DJANGO_STORES_ENABLED` defaults on locally if omitted, off in
production. Use the published local `*.localhost:4177` address for customer flows.

## Validation and versioning

`npm run test:stores` runs Node boundary/design tests plus Django business and
Chromium tests. The browser test exercises the actual publisher â†’ Django â†’ test
database flow, with only Stripe and SMTP isolated. It then edits products,
fulfils the order, resolves a message and saves settings through the owner UI.
Desktop/mobile screenshots are written under the OS temporary folder
`draftmango-store-review`. No real charge, account signup or external email is sent.

The design-policy exception accepts only the exact trusted adapter and descriptor,
while normalising the one approved entry import before checking the original
template fingerprint. Altered adapters, scripts, CSS and fake locks are rejected.
Future adapters must get new immutable versions; retain old adapters so saved
projects remain editable. Do not overwrite version 1 after it has been released.

Provider references: [Connect direct charges](https://docs.stripe.com/connect/direct-charges),
[account links](https://docs.stripe.com/api/account_links/create), and
[checkout fulfilment](https://docs.stripe.com/checkout/fulfillment).

## Confirmed builder plans and preview

See [builder handoff](builder-guided-flow.md#builder-to-store-handoff-implemented-awaiting-deployment).
Apply migration `stores.0003_store_builder_setup` with the next store deployment.
It records missing settings and pending product briefs; these are owner-only.
Existing stores keep an empty setup record and are never reseeded by a new build.
The browser can retry a failed preparation after account sync, without publishing
or duplicating products. The editor preview includes hidden draft products; the
published catalogue continues to show only active products.
