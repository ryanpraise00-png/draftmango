"""Run once on the VPS. No local credentials or user data are imported."""
import os
import secrets
from pathlib import Path

os.umask(0o077)
root = Path('/opt/draftmango/shared')
root.mkdir(parents=True, exist_ok=True, mode=0o700)
names = ['db-admin-password', 'db-app-password', 'backend.env', 'web.env']
if any((root / name).exists() for name in names):
    raise SystemExit('Existing configuration found. Preserve it; do not regenerate secrets.')
admin_password, app_password = secrets.token_hex(32), secrets.token_hex(32)
(root / names[0]).write_text(admin_password + '\n')
(root / names[1]).write_text(app_password + '\n')
# Compose bind-mounts these files for the PostgreSQL UID. Their parent remains
# root-only (0700) on the host; only the database container receives the mounts.
for name in names[:2]:
    (root / name).chmod(0o444)
(root / 'backend.env').write_text(f'''DJANGO_ENV=production
DJANGO_SECRET_KEY={secrets.token_hex(48)}
DJANGO_APP_ORIGIN=https://draftmango.com
DJANGO_DB_HOST=db
DJANGO_DB_NAME=draftmango
DJANGO_DB_USER=draftmango
DJANGO_DB_PASSWORD={app_password}
DJANGO_CACHE_URL=redis://cache:6379/0
DJANGO_REGISTRATION_OPEN=0
DJANGO_REQUIRE_EMAIL_VERIFICATION=1
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=1
EMAIL_FROM=Draftmango <hello@draftmango.com>
BILLING_MODE=test
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BASIC_MONTHLY=
STRIPE_PRICE_BASIC_YEARLY=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
STRIPE_AUTOMATIC_TAX=0
''')
(root / 'web.env').write_text('''AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna
AI_MAX_TOKENS=32768
AI_TIMEOUT_SECONDS=900
OPENAI_REASONING_EFFORT=medium
DRAFTMANGO_TRUSTED_PROXY_IPS=
NAMECOM_ENVIRONMENT=sandbox
NAMECOM_USERNAME=
NAMECOM_API_TOKEN=
DOMAIN_MARKUP_PERCENT=20
DOMAIN_MIN_FEE_CENTS=500
''')
print('Created private server configuration. Provider credentials remain unset.')
