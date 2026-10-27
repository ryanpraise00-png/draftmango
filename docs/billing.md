# Draftmango billing — Stripe test setup

The application now supports Stripe subscription Checkout, customer billing
management, recent invoices, signed webhooks and confirmed plan access.
No Stripe account, product or real payment has been created by this work.
Domain registration, hosting and credit metering are separate integrations.

1. Create or sign in to your UK business's Stripe account.
   Complete the account details Stripe requests. Start in its test environment.

2. In Stripe test mode, create two products, Basic and Pro, with four recurring
   prices in USD. Keep the existing Draftmango prices:
     Basic monthly: $15 each month
     Basic yearly:  $120 each year
     Pro monthly:   $39 each month
     Pro yearly:    $360 each year
   Use quantity 1 and the default fixed-price recurring setup.
   Copy each price_... identifier. The server verifies amount, currency,
   environment and recurrence before opening checkout.

3. Fill these server-only fields in .env in the project folder:
     BILLING_MODE=test
     STRIPE_SECRET_KEY=your sk_test_... key
     STRIPE_WEBHOOK_SECRET=your whsec_... signing secret
     STRIPE_PRICE_BASIC_MONTHLY=price_...
     STRIPE_PRICE_BASIC_YEARLY=price_...
     STRIPE_PRICE_PRO_MONTHLY=price_...
     STRIPE_PRICE_PRO_YEARLY=price_...
     STRIPE_AUTOMATIC_TAX=0
   Do not put keys in web/, source control, chat, or a public frontend variable.
   Restart npm run dev after saving them.

4. For local webhooks, install Stripe's official CLI, authenticate it to the
   same test account, and run:
     stripe listen --forward-to http://127.0.0.1:4175/api/billing/webhook
   Use the signing secret displayed by that listener as STRIPE_WEBHOOK_SECRET.
   On the VPS, create a Stripe webhook destination for:
     https://YOUR-APP-DOMAIN/api/billing/webhook
   Use that endpoint's own signing secret, not the CLI listener's secret.
   Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded,
   customer.subscription.created, customer.subscription.updated,
   customer.subscription.deleted, invoice.paid and invoice.payment_failed.

5. Configure Stripe's customer portal in the same test environment.
   Allow payment-method management, invoices, cancellation and switching among
   the same four configured prices. Configure your preferred cancellation and
   proration settings there. The app opens the portal for its own customer only.

6. Open /dashboard.html#settings/billing, choose a plan and test checkout.
   The app clearly labels test mode. Use only Stripe's documented test payment
   details. After returning, the server checks Stripe directly for subscription
   status; a URL, local storage value or checkout click cannot grant paid access.
   Verify payment failure, cancellation and duplicate webhook delivery too.

Activation and limits

Live billing requires BILLING_MODE=live and a complete set of live-mode keys,
prices and webhook configuration. Test subscriptions never become live plans.
Do not activate live billing before publishing and the promised plan features
are ready, credit rules are finalized, and tax/account settings are configured.
The UI still identifies credit metering as inactive; it does not invent balances.
Automatic tax is optional and must be configured in Stripe before enabling it.

The backend pins Stripe API version 2025-06-30.basil. Browser input cannot choose
an amount, customer, redirect URL or external API endpoint. Checkout retries
reuse a persisted idempotency key; webhook processing verifies signatures,
deduplicates events and retrieves current subscription state. If a checkout
times out, retry the same plan to recover it before choosing another plan.
Pending checkouts and active subscriptions must be canceled before deleting
the account, to avoid leaving recurring billing behind.

Development remains single-process SQLite. Before public launch, move to
PostgreSQL (real row locking), shared rate limiting, production app servers,
HTTPS, backups and operational monitoring. Do not expose npm run dev publicly.

## References
https://stripe.com/global
https://docs.stripe.com/billing/subscriptions/webhooks
https://docs.stripe.com/events/manage-webhook-endpoints
https://docs.stripe.com/api/checkout/sessions/create
https://docs.stripe.com/api/customer_portal/sessions/create
