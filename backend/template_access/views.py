"""Narrow OAuth client-credentials grant for registered product backends.

No browser session, customer account, dynamic registration or refresh token is
accepted. Every resource request checks current client state in the database.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import timedelta
from functools import wraps
from urllib.parse import unquote_plus
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import RequestDataTooBig
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from .models import ServiceClient, AccessToken

SCOPES = ('templates:read', 'templates:download', 'templates:validate')
TOKEN_SECONDS = 900
CLIENT_ID = re.compile(r'^[a-z][a-z0-9-]{1,79}$')


def digest(value):
    # Secrets/tokens are 256 random bits, not human passwords.
    return hashlib.sha256(value.encode('ascii')).hexdigest()


def resource():
    return settings.APP_ORIGIN + '/mcp/templates'


class Refusal(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code


def reply(data, status=200):
    response = JsonResponse(data, status=status)
    response['Cache-Control'] = 'no-store'
    response['Pragma'] = 'no-cache'
    response['X-Content-Type-Options'] = 'nosniff'
    if status == 429:
        response['Retry-After'] = '60'
    return response


def endpoint(view):
    @csrf_exempt
    @wraps(view)
    def wrapped(request):
        if not settings.TEMPLATE_REMOTE_ENABLED:
            return reply({'error': 'not_found'}, 404)
        if request.method != 'POST':
            response = reply({'error': 'method_not_allowed'}, 405)
            response['Allow'] = 'POST'
            return response
        # Node validates the public origin too. No cross-origin browser access.
        if request.headers.get('Origin') not in (None, settings.APP_ORIGIN):
            return reply({'error': 'invalid_request'}, 403)
        try:
            return view(request)
        except Refusal as error:
            response = reply({'error': error.code}, error.status)
            if error.status == 401:
                response['WWW-Authenticate'] = 'Basic realm="Draftmango template clients"' if view.__name__ == 'token' else 'Bearer error="invalid_token"'
            return response
        except (ValueError, UnicodeError, RequestDataTooBig):
            return reply({'error': 'invalid_request'}, 400)
        except Exception:
            # Cache/database outages fail closed; never include credentials or
            # request bodies in logs or error pages.
            return reply({'error': 'temporarily_unavailable'}, 503)
    return wrapped


def rate(key, limit):
    name = 'template-access:' + hashlib.sha256(key.encode()).hexdigest()
    if cache.add(name, 1, 60):
        return
    try:
        count = cache.incr(name)
    except ValueError:
        # A concurrent expiry must not turn into an unlimited fallback.
        if not cache.add(name, 1, 60):
            count = cache.incr(name)
        else:
            count = 1
    if count > limit:
        raise Refusal(429, 'rate_limit')


@endpoint
def token(request):
    rate('token-ip:' + request.META.get('REMOTE_ADDR', ''), 30)
    if request.content_type != 'application/x-www-form-urlencoded' or len(request.body) > 4096 or request.GET:
        raise Refusal(400, 'invalid_request')
    data = request.POST
    if set(data) - {'grant_type', 'resource', 'scope'} or any(len(data.getlist(k)) != 1 for k in data):
        raise Refusal(400, 'invalid_request')
    if data.get('grant_type') != 'client_credentials':
        raise Refusal(400, 'unsupported_grant_type')
    if data.get('resource') != resource():
        raise Refusal(400, 'invalid_target')
    authorization = request.headers.get('Authorization', '')
    if not authorization.startswith('Basic ') or len(authorization) > 1024:
        raise Refusal(401, 'invalid_client')
    try:
        client_id, secret = base64.b64decode(authorization[6:], validate=True).decode('ascii').split(':', 1)
        client_id, secret = unquote_plus(client_id), unquote_plus(secret)
        if not CLIENT_ID.fullmatch(client_id) or not re.fullmatch(r'[A-Za-z0-9_-]{43}', secret):
            raise ValueError()
    except (ValueError, UnicodeError):
        raise Refusal(401, 'invalid_client')
    rate('token-client:' + client_id, 10)
    with transaction.atomic():
        client = ServiceClient.objects.select_for_update().filter(pk=client_id).first()
        now = timezone.now()
        valid_secret = hmac.compare_digest(digest(secret), client.secret_hash if client else '0' * 64)
        if not client or not valid_secret or not client.active or client.expires_at <= now:
            raise Refusal(401, 'invalid_client')
        scopes = data.get('scope', ' '.join(client.scopes)).split()
        if not scopes or not set(scopes) <= set(client.scopes) & set(SCOPES):
            raise Refusal(400, 'invalid_scope')
        AccessToken.objects.filter(expires_at__lte=now).delete()
        if AccessToken.objects.filter(client=client).count() >= 32:
            raise Refusal(429, 'token_limit')
        raw = secrets.token_urlsafe(32)
        expires = min(now + timedelta(seconds=TOKEN_SECONDS), client.expires_at)
        AccessToken.objects.create(digest=digest(raw), client=client, revision=client.revision,
                                   scopes=sorted(set(scopes)), resource=resource(), expires_at=expires)
    return reply({'access_token': raw, 'token_type': 'Bearer', 'expires_in': int((expires - now).total_seconds()), 'scope': ' '.join(sorted(set(scopes)))})


@endpoint
def authorize(request):
    # Private network + independently authenticated gateway. Never publicly routed.
    internal = settings.BUILD_TOKEN
    supplied = request.headers.get('X-Draftmango-Internal', '')
    if len(internal) < 32 or not hmac.compare_digest(supplied.encode(), internal.encode()):
        raise Refusal(404, 'not_found')
    if request.content_type != 'application/json' or len(request.body) > 2048:
        raise Refusal(400, 'invalid_request')
    data = json.loads(request.body)
    if not isinstance(data, dict) or set(data) != {'token', 'resource', 'operation'}:
        raise Refusal(400, 'invalid_request')
    raw = data['token']
    if not isinstance(raw, str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}', raw):
        raise Refusal(401, 'invalid_token')
    if data['resource'] != resource() or data['operation'] not in ('mcp', 'download'):
        raise Refusal(400, 'invalid_target')
    rate('resource-ip:' + request.META.get('REMOTE_ADDR', ''), 300)
    item = AccessToken.objects.select_related('client').filter(pk=digest(raw)).first()
    now = timezone.now()
    if not item or item.expires_at <= now or item.resource != resource() or not item.client.active or item.client.expires_at <= now or item.revision != item.client.revision:
        raise Refusal(401, 'invalid_token')
    scopes = sorted(set(item.scopes) & set(item.client.scopes) & set(SCOPES))
    rate('requests:' + item.client_id, 120)
    rate(data['operation'] + ':' + item.client_id, 10 if data['operation'] == 'download' else 60)
    return reply({'client_id': item.client_id, 'scopes': scopes})
