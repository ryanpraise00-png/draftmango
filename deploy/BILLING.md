# Stripe billing

Draftmango uses Stripe Checkout for subscriptions and the customer portal for
invoices, payment-method and billing-detail updates, and cancellation at the end
of the paid period. Plan switching is not enabled in the initial portal setup.

## Server configuration

Set these variables in the backend environment, never in frontend assets or Git:

- `BILLING_MODE`: `test` or `live`.
- `STRIPE_SECRET_KEY`: a secret (`sk_`) or restricted (`rk_`) key for that mode.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for this server's endpoint.
- `STRIPE_PRICE_BASIC_MONTHLY`: USD 15 every month.
- `STRIPE_PRICE_BASIC_YEARLY`: USD 120 every year.
- `STRIPE_PRICE_PRO_MONTHLY`: USD 39 every month.
- `STRIPE_PRICE_PRO_YEARLY`: USD 360 every year.
- `STRIPE_PORTAL_CONFIGURATION_ID`: Draftmango's `bpc_` portal configuration.

The runtime restricted key needs Customers, Checkout Sessions and Customer Portal
write access, plus Prices, Subscriptions and Invoices read access. Connected
account permissions are not required. The portal configuration is selected on
the server; requests cannot override its configuration or customer.

Production configuration is stored in `/opt/draftmango/shared/backend.env` with
root-only permissions. Local development reads `.env`, which is Git-ignored.
Changing either environment requires restarting the relevant backend. Local
development stays in test mode unless explicitly configured otherwise.

## Webhook

Endpoint: `https://draftmango.com/api/billing/webhook`.

Use snapshot events from this account. The dashboard setup uses
`2026-08-26.dahlia`. Outbound requests remain pinned to `2025-06-30.basil`;
the handler verifies signatures, reads customer/subscription identifiers and
fetches the current subscription before updating access. It supports invoices
whose subscription reference is under `parent.subscription_details`.

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Release and verification: 27 October 2026

The production backend was updated to `20261027-billing-01`. Frontend, publisher,
builder, database and cache services were left running on their existing images.
The previous release is `20261026-02`.

- 25 billing tests passed locally and in the isolated production backend image.
- 2 Node tests passed for webhook proxying and pricing/auth handoffs.
- The production runtime read and validated all four live prices and its portal.
- An application-signed probe for a nonexistent customer returned HTTP 200.
- The same probe with an invalid signature returned HTTP 400.
- These probes changed no billing records and charged no payment.
- The public health and pricing routes passed after activation.

This verifies configuration and webhook transport, not a completed Stripe
payment or Stripe-originated event delivery. Confirm an actual event delivery
in Stripe Workbench during the final end-to-end payment check.

Rollback configuration is kept privately on the VPS, outside Git. Restore the
previous backend environment and recreate only the backend from the previous
release if rollback is needed; do not restart unrelated applications.
