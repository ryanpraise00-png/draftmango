# Draftmango accounts — Django

The app now uses Django 5.2 LTS for authentication, cookie sessions and private
project storage. SQLite is the local database. No Supabase account is needed.

## First setup (already completed on this computer)
```
npm run setup:accounts
npm run dev
```
Open http://127.0.0.1:4175/auth#mode=signup and create your own account.
Existing drafts remain untouched. After signing in, choose Import device drafts
to copy projects and local domain drafts into your account's workspace.

The same npm run dev command starts Django on 127.0.0.1:4176 and the existing
website/AI server on 127.0.0.1:4175. API requests use the same website origin.
Use 127.0.0.1 consistently: localhost has a separate browser cache.

## Files and credentials
```
.env: existing AI and Name.com credentials plus a generated DJANGO_SECRET_KEY.
data/draftmango.sqlite3: users, hashed passwords, sessions and project data.
data/development-mail/: local password reset / verification emails.
```
All these files stay outside web/ and are excluded from Git. Back up the
database and signing key securely. Do not upload data or .env to a static host.

## Email
Email verification is OFF locally so signup works immediately. Password reset
links are written to data/development-mail; no real email is sent yet. Open the
latest file locally and use its link. Links expire after one hour and passwords
are changed by the account owner. Resetting a password invalidates older sessions.

For real delivery, set these in .env and restart npm run dev:
```
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-username
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=1
EMAIL_FROM=Draftmango <your-verified-sender-address>
DJANGO_REQUIRE_EMAIL_VERIFICATION=1
DJANGO_APP_ORIGIN=https://your-deployed-draftmango-address
```
Keep email credentials out of chat.

## Google sign-in
"Continue with Google" appears on the sign-in page only when both
`DJANGO_GOOGLE_CLIENT_ID` and `DJANGO_GOOGLE_CLIENT_SECRET` are set in `.env`.
Other social providers are not offered.

1. In Google Cloud Console, open APIs & Services → OAuth consent screen and set
   up the app (name, support email, the `openid`, `email` and `profile` scopes).
2. Under Credentials, create an OAuth client ID of type "Web application".
3. Add the authorized redirect URI `<DJANGO_APP_ORIGIN>/api/accounts/google/callback`,
   for example `http://127.0.0.1:4175/api/accounts/google/callback` locally and
   `https://draftmango.com/api/accounts/google/callback` in production.
4. Put the client ID and secret in `.env` and restart `npm run dev`.

How it behaves:
- Flow: OpenID Connect authorization code with PKCE, a one-time state and a
  nonce, all held in the Django session for up to 10 minutes. No extra packages.
- Google must report the email as verified. Accounts are matched by Google's
  account ID first, then by email, so an existing email/password account is
  linked automatically and keeps its password.
- An email signup that was never confirmed is activated by Google sign-in, and
  its unconfirmed password is removed (reset it to use email login again).
- A Google email without a Draftmango account gets one only while
  `DJANGO_REGISTRATION_OPEN` allows signups; otherwise sign-in is refused.
- Sign-in always starts on `DJANGO_APP_ORIGIN`: visiting from another host name
  (for example localhost instead of 127.0.0.1) redirects there first.

## Project storage
- Project code, design, conversations and history save to the Django database.
- Each account has separate projects. Database requests scope ownership to the
logged-in user; a stale tab cannot save through a different account's session.
- Browser working copies remain as a fallback. A failed save shows Sync paused.
- Reopening conflicting edits keeps a recovered copy and the newer server copy.
- Preferences and domain drafts remain device-local and account-scoped.
- Signing out ends the session; private browser working copies remain available
after signing back into the same account. Export important work independently.
- The database is on this computer, not deployed to the cloud yet.

## Development checks
```
npm run check
npm test
npm run test:accounts
```
Python 3.10+ and Node 20+ are needed. The setup script creates .venv and installs
requirements.txt. On this computer it uses the bundled Python 3.12 runtime.
On another computer set DRAFTMANGO_PYTHON to your Python executable if needed.

## Before production
Deploy Django using a production ASGI/WSGI server, HTTPS and trusted hosts/origins;
move the database to PostgreSQL; configure SMTP and verification; add backups,
account deletion and billing/usage enforcement. Shared rate-limit storage is
in place (Redis; see docs/hosting.md).
The current development servers bind to this computer only. Plan selections
do not grant a paid subscription. Domain registration and publishing remain
separate work. No purchases or public deployment were made by this integration.

## Django references
https://docs.djangoproject.com/en/5.2/topics/auth/default/
https://docs.djangoproject.com/en/5.2/howto/csrf/
