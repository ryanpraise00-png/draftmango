# Draftmango accounts

Draftmango uses Django for email/password accounts, cookie sessions and private project storage. Development uses SQLite and local mail files. The live service uses PostgreSQL, Redis and SMTP.

## Testing launch — 20 November 2026

Signup requires email confirmation before sign-in. Confirmation and password-reset emails return to `/auth`; links expire after one hour and are single-use after successful verification/reset. Password reset invalidates older sessions. No passwordless numeric-code login is implemented.

The account email retains validated internal intent (idea, template, colour, project, plan and billing interval), so opening it in a new tab can still return the customer to the right workspace or billing page. Arbitrary redirect URLs are not accepted. The auth page removes the verification/reset token from the visible URL after loading it and prefills the recipient's email.

A failed email send is reported as an error, including an SMTP backend returning zero accepted messages. The pending account remains inactive. Retrying signup with its original password resends confirmation; it does not replace that password. The interface also offers a resend action. A disabled verified account cannot be reactivated by resending confirmation.

Live SMTP uses Brevo over STARTTLS, with `accounts@mail.draftmango.com` as the sender. Registration is controlled by `DJANGO_REGISTRATION_OPEN`; `registrationOpen` in the session response lets the interface show its current availability. Production always requires verification. Google sign-in is offered only when configured; it is not configured on the live service at this launch check.

## Local development

```powershell
npm run setup:accounts
npm run dev
```

Open `http://127.0.0.1:4175/auth#mode=signup`. The gateway proxies same-origin account requests to Django on port 4176. Use the same hostname consistently, because localhost and 127.0.0.1 have separate cookies and browser storage.

Secrets belong in the root `.env`; local data lives under `data/`. Both are ignored by Git. With no `EMAIL_HOST`, messages are written to `data/development-mail`. For SMTP configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` and `EMAIL_FROM`. Set `DJANGO_APP_ORIGIN` to the canonical application origin and `DJANGO_REQUIRE_EMAIL_VERIFICATION=1` to exercise verification locally. Restart the services after configuration changes. Do not paste credentials into chat.

## Verification

```powershell
npm run test:accounts
node --test tests/auth-flow.test.mjs tests/accounts.test.mjs tests/dashboard.test.mjs tests/pricing.test.mjs
```

Backend tests cover account separation, password hashing, CSRF, throttling, closed registration, verified/disabled accounts, confirmation and reset tokens, SMTP failure/retry, link intent, password reset and session invalidation. Auth-controller tests cover signup and resend, fresh-tab confirmation, reset followed by login, billing/workspace redirects, unavailable browser storage, and incomplete/expired links.

`scripts/test-account-delivery.py --recipient <authorised-inbox> --send-test-email` is an explicitly opt-in integration test for an SMTP-configured environment. It refuses to alter an existing account, sends two clearly labelled test emails and exercises the full Django account flow inside a database transaction that rolls back. It never prints passwords or tokens. SMTP acceptance alone does not prove inbox delivery; confirm both messages arrived. The test links are consumed automatically.

## Live deployment

The live release is tracked at `/opt/draftmango/current`. Account credentials remain in `/opt/draftmango/shared/backend.env`; code releases must preserve these rather than copy desktop credentials. Back up the database before deployment, verify account routes through the public HTTPS gateway, and keep the prior images for rollback. See `docs/hosting.md` for the hosting layout (its initial-installation notes describe the earlier private setup).

## Google sign-in

Configure `DJANGO_GOOGLE_CLIENT_ID` and `DJANGO_GOOGLE_CLIENT_SECRET`, with the callback `<DJANGO_APP_ORIGIN>/api/accounts/google/callback`. The source implements OpenID Connect, PKCE, one-time state and nonce. Google must report a verified email. Enabling a button alone does not configure OAuth or deploy the required backend routes.

## Project storage

Each signed-in account owns its projects. Requests are scoped to that account, and stale tabs cannot save under another account's session. Browser copies remain a fallback when sync fails. Passwords, tokens and provider credentials must not be included in exported project data.
