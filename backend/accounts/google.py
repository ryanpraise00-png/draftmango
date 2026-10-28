"""Google sign-in: OpenID Connect authorization code flow with PKCE.

/api/accounts/google/start sends the browser to Google; Google returns it to
/api/accounts/google/callback, which signs the user in and redirects to /auth.
The sign-in page then continues to the workspace exactly as after an email login.
"""
import base64
import hashlib
import json
import secrets
import time
from urllib.error import URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen
from django.conf import settings
from django.contrib.auth import login
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from .models import User
from .views import APIError, error, throttle

AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
ISSUERS = {'accounts.google.com', 'https://accounts.google.com'}
SESSION_KEY = 'google_oauth'
MAX_AGE = 600

class GoogleError(Exception):
    def __init__(self, code):
        self.code = code

def configured():
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

def callback_url():
    return settings.APP_ORIGIN + '/api/accounts/google/callback'

def redirect(location):
    response = HttpResponseRedirect(location)
    response['Cache-Control'] = 'no-store'
    return response

def back_to_auth(code=None):
    return redirect('/auth' + ('#' + urlencode({'mode': 'login', 'error': code}) if code else ''))

def start(request):
    if request.method != 'GET':
        return error(405, 'method', 'This action does not support that request method.')
    if not configured():
        return back_to_auth('google_unavailable')
    # Google returns to APP_ORIGIN, so the session holding the state must live there too.
    if request.get_host() != urlsplit(settings.APP_ORIGIN).netloc:
        return redirect(settings.APP_ORIGIN + '/api/accounts/google/start')
    try:
        throttle(request, 'google')
    except APIError:
        return back_to_auth('rate_limit')
    verifier, state, nonce = secrets.token_urlsafe(64), secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    request.session[SESSION_KEY] = {'state': state, 'nonce': nonce, 'verifier': verifier, 'started': time.time()}
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    return redirect(AUTHORIZE_URL + '?' + urlencode({
        'client_id': settings.GOOGLE_CLIENT_ID, 'redirect_uri': callback_url(), 'response_type': 'code',
        'scope': 'openid email profile', 'state': state, 'nonce': nonce,
        'code_challenge': challenge, 'code_challenge_method': 'S256', 'prompt': 'select_account'}))

def callback(request):
    if request.method != 'GET':
        return error(405, 'method', 'This action does not support that request method.')
    pending = request.session.pop(SESSION_KEY, None)
    if not configured():
        return back_to_auth('google_unavailable')
    if not pending or not constant_time_compare(request.GET.get('state', ''), pending['state']):
        return back_to_auth('google_failed')
    if request.GET.get('error'):
        return back_to_auth('google_cancelled')
    if time.time() - pending['started'] > MAX_AGE:
        return back_to_auth('google_expired')
    code = request.GET.get('code', '')
    if not code or len(code) > 2048:
        return back_to_auth('google_failed')
    try:
        user = account_for(verified_claims(exchange(code, pending['verifier']), pending['nonce']))
    except GoogleError as exc:
        return back_to_auth(exc.code)
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    request.session['workspace_device'] = request.META.get('HTTP_USER_AGENT', '')[:300]
    request.session['workspace_signed_in'] = timezone.now().isoformat()
    return back_to_auth()

def exchange(code, verifier):
    data = urlencode({'code': code, 'client_id': settings.GOOGLE_CLIENT_ID, 'client_secret': settings.GOOGLE_CLIENT_SECRET,
                      'redirect_uri': callback_url(), 'grant_type': 'authorization_code', 'code_verifier': verifier}).encode()
    request = Request(TOKEN_URL, data=data, headers={'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json'})
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read(65536))
    except (URLError, OSError, ValueError):
        raise GoogleError('google_failed')

def verified_claims(tokens, nonce):
    try:
        payload = tokens['id_token'].split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
    except (KeyError, IndexError, TypeError, AttributeError, ValueError):
        raise GoogleError('google_failed')
    # The ID token came straight from Google's token endpoint over TLS, so OpenID Connect
    # (Core 3.1.3.7) lets us rely on that instead of its signature. The claims must still match.
    if not isinstance(claims, dict) or claims.get('iss') not in ISSUERS or claims.get('aud') != settings.GOOGLE_CLIENT_ID:
        raise GoogleError('google_failed')
    if not isinstance(claims.get('exp'), (int, float)) or claims['exp'] < time.time():
        raise GoogleError('google_expired')
    if not constant_time_compare(str(claims.get('nonce', '')), nonce) or not isinstance(claims.get('sub'), str) or not claims['sub']:
        raise GoogleError('google_failed')
    if claims.get('email_verified') is not True or not isinstance(claims.get('email'), str):
        raise GoogleError('google_unverified')
    return claims

def account_for(claims):
    subject, email = claims['sub'][:255], claims['email'].strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise GoogleError('google_failed')
    name = str(claims.get('given_name') or claims.get('name') or '')[:150]
    with transaction.atomic():
        user = User.objects.select_for_update().filter(google_subject=subject).first()
        if user is None:
            user = User.objects.select_for_update().filter(email=email).first()
            if user is None:
                if not settings.REGISTRATION_OPEN:
                    raise GoogleError('registration_closed')
                try:
                    return User.objects.create_user(email, None, google_subject=subject, email_verified=True, first_name=name)
                except IntegrityError:
                    raise GoogleError('google_failed')
            if user.google_subject and user.google_subject != subject:
                raise GoogleError('google_failed')
            if not user.is_active and not user.email_verified:
                # An email signup that was never confirmed. Google has now proven who owns the
                # address, and whoever chose that password never did, so the password is dropped.
                user.set_unusable_password()
                user.is_active = True
            user.google_subject, user.email_verified = subject, True
            user.save()
        if not user.is_active:
            raise GoogleError('account_disabled')
    return user
