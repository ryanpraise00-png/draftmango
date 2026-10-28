import os
import sys
from urllib.parse import urlsplit
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parents[2]
if (BASE_DIR / '.env').exists():
    for line in (BASE_DIR / '.env').read_text(encoding='utf-8-sig').splitlines():
        name, separator, value = line.partition('=')
        if separator and name.strip().startswith(('DJANGO_', 'EMAIL_', 'STRIPE_', 'BILLING_', 'DRAFTMANGO_BUILD_')):
            os.environ.setdefault(name.strip(), value.strip().strip('\"\''))
TESTING = 'test' in sys.argv
PRODUCTION = os.environ.get('DJANGO_ENV') == 'production'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or ('isolated-tests-only-secret' if TESTING else '')
if not SECRET_KEY:
    raise ImproperlyConfigured('Run npm run setup:accounts to prepare the local Django configuration.')
DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost'] + (['testserver'] if TESTING else [])
ROOT_URLCONF = 'draftmango.urls'
INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'accounts']
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'draftmango.proxy.PrivateProxyMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]
DATA_DIR = Path(os.environ.get('DJANGO_DATA_DIR', BASE_DIR / 'data'))
DATA_DIR.mkdir(parents=True, exist_ok=True)
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': DATA_DIR / 'draftmango.sqlite3', 'OPTIONS': {'timeout': 20}}}
if os.environ.get('DJANGO_DB_HOST'):
    DATABASES = {'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['DJANGO_DB_HOST'],
        'PORT': os.environ.get('DJANGO_DB_PORT', '5432'),
        'NAME': os.environ.get('DJANGO_DB_NAME', 'draftmango'),
        'USER': os.environ.get('DJANGO_DB_USER', 'draftmango'),
        'PASSWORD': os.environ.get('DJANGO_DB_PASSWORD', ''),
        'CONN_MAX_AGE': 60,
        'CONN_HEALTH_CHECKS': True,
        'OPTIONS': {'connect_timeout': 5},
    }}
if os.environ.get('DJANGO_CACHE_URL'):
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': os.environ['DJANGO_CACHE_URL'], 'KEY_PREFIX': 'draftmango', 'OPTIONS': {'socket_connect_timeout': 3, 'socket_timeout': 3}}}
AUTH_USER_MODEL = 'accounts.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
PASSWORD_RESET_TIMEOUT = 3600
APP_ORIGIN = os.environ.get('DJANGO_APP_ORIGIN', 'http://127.0.0.1:4175').rstrip('/')
CSRF_TRUSTED_ORIGINS = [APP_ORIGIN, 'http://localhost:4175']
CSRF_FAILURE_VIEW = 'accounts.views.csrf_failure'
SESSION_COOKIE_NAME = 'draftmango_session'
CSRF_COOKIE_NAME = 'draftmango_csrf'
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = APP_ORIGIN.startswith('https://')
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
BUILD_URL = os.environ.get('DRAFTMANGO_BUILD_URL', 'http://127.0.0.1:4178/build')
BUILD_TOKEN = os.environ.get('DRAFTMANGO_BUILD_TOKEN', '')
PUBLISHING_ENABLED = os.environ.get('DJANGO_PUBLISHING_ENABLED', '0') == '1'
PUBLISHING_TOKEN = os.environ.get('DJANGO_PUBLISHING_TOKEN', '')
PUBLISHING_BASE_DOMAIN = os.environ.get('DJANGO_PUBLISHING_BASE_DOMAIN', 'draftmango.com' if PRODUCTION else 'localhost')
PUBLISHING_PORT = int(os.environ.get('DJANGO_PUBLISHING_PORT', '4177'))
DATA_UPLOAD_MAX_MEMORY_SIZE = 9 * 1024 * 1024
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if os.environ.get('EMAIL_HOST') else 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = DATA_DIR / 'development-mail'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', '1') == '1'
EMAIL_TIMEOUT = 15
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_FROM', 'Draftmango <noreply@localhost>')
REQUIRE_EMAIL_VERIFICATION = os.environ.get('DJANGO_REQUIRE_EMAIL_VERIFICATION', '0') == '1'
REGISTRATION_OPEN = os.environ.get('DJANGO_REGISTRATION_OPEN', '0' if PRODUCTION else '1') == '1'
# Google sign-in (OpenID Connect) is offered only when both values are set.
GOOGLE_CLIENT_ID = os.environ.get('DJANGO_GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('DJANGO_GOOGLE_CLIENT_SECRET', '')

if PRODUCTION:
    # __Host- cookies cannot be set for a parent domain by a published subdomain.
    SESSION_COOKIE_NAME = '__Host-draftmango_session'
    CSRF_COOKIE_NAME = '__Host-draftmango_csrf'
    origin = urlsplit(APP_ORIGIN)
    if origin.scheme != 'https' or not origin.hostname or origin.path or origin.query or origin.fragment or origin.username or origin.password:
        raise ImproperlyConfigured('Production DJANGO_APP_ORIGIN must be an HTTPS origin.')
    if len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5:
        raise ImproperlyConfigured('Production requires a strong, unique Django secret.')
    if DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql' or not os.environ.get('DJANGO_CACHE_URL'):
        raise ImproperlyConfigured('Production requires PostgreSQL and a shared Redis cache.')
    ALLOWED_HOSTS = [origin.hostname]
    CSRF_TRUSTED_ORIGINS = [APP_ORIGIN]
    # Gunicorn has no published port. Only our Node proxy supplies this header.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 86400
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
    MIDDLEWARE.append('django.middleware.clickjacking.XFrameOptionsMiddleware')
    X_FRAME_OPTIONS = 'DENY'
    REQUIRE_EMAIL_VERIFICATION = True
    if not EMAIL_HOST:
        EMAIL_BACKEND = 'draftmango.email.UnconfiguredEmailBackend'
        if REGISTRATION_OPEN:
            raise ImproperlyConfigured('Configure SMTP before opening public registration.')

# Test and live billing records are separate. Missing or mismatched keys fail closed.
BILLING_MODE = os.environ.get('BILLING_MODE', 'test')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_PORTAL_CONFIGURATION_ID = os.environ.get('STRIPE_PORTAL_CONFIGURATION_ID', '')
STRIPE_AUTOMATIC_TAX = os.environ.get('STRIPE_AUTOMATIC_TAX', '0') == '1'
STRIPE_PRICES = {plan + ':' + cadence: os.environ.get('STRIPE_PRICE_' + plan.upper() + '_' + cadence.upper(), '') for plan in ('basic', 'pro') for cadence in ('monthly', 'yearly')}
