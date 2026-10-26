"""Shared generation/build limits for every web container.

The Node gateway keeps limits in memory for local development. In production
(DRAFTMANGO_PUBLIC_ORIGIN set) it asks this private endpoint instead, so the
limits live in the shared Redis cache and hold across all web containers.
Reachable only on the private backend network, never proxied by the app.
"""
import hmac
import json
import time
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# Per kind: window length (s), starts allowed per window, minimum seconds
# between starts, and site-wide concurrent cap (0 = none). Each account may
# run one generation and one build at a time.
RULES = {
    'generate': {'window': 600, 'starts': 20, 'cooldown': 2, 'global': 2},
    'build': {'window': 60, 'starts': 30, 'cooldown': 0, 'global': 0},
}
MESSAGES = {
    ('generate', 'busy'): 'Another draft is being generated. Wait for it to finish or cancel it first.',
    ('generate', 'limit'): 'Please wait a little before generating again.',
    ('build', 'busy'): 'Wait a moment before rebuilding.',
    ('build', 'limit'): 'Wait a moment before rebuilding.',
}

def _reply(status, **body):
    response = JsonResponse(body, status=status)
    response['Cache-Control'] = 'no-store'
    return response

def _incr(key, ttl):
    cache.add(key, 0, ttl)
    try:
        return cache.incr(key)
    except ValueError:  # Expired between add and incr.
        cache.set(key, 1, ttl)
        return 1

@csrf_exempt
def limits(request):
    token = settings.BUILD_TOKEN
    supplied = request.headers.get('X-Draftmango-Internal', '')
    if request.method != 'POST' or len(token) < 32 or not hmac.compare_digest(supplied, token):
        return _reply(404, error={'code': 'not_found', 'message': 'Not found'})
    if not request.user.is_authenticated:
        return _reply(401, error={'code': 'sign_in', 'message': 'Sign in to continue.'})
    try:
        data = json.loads(request.body or b'{}')
        action, kind, hold = data['action'], data['kind'], int(data.get('hold', 0))
        rule = RULES[kind]
        if action not in ('acquire', 'release') or not 0 <= hold <= 3600:
            raise ValueError()
    except (ValueError, KeyError, TypeError):
        return _reply(400, error={'code': 'invalid', 'message': 'Invalid limit request.'})
    user = str(request.user.pk)
    busy_key = f'limit:{kind}:busy:{user}'
    if action == 'release':
        slot = cache.get(busy_key)
        cache.delete(busy_key)
        if isinstance(slot, int) and slot >= 0:
            cache.delete(f'limit:{kind}:slot:{slot}')
        return _reply(200, released=True)
    # Every lock expires on its own if a gateway dies before releasing it.
    hold = max(hold, 30) + 60
    refused = _reply(429, error={'code': f'{kind}_busy' if kind == 'build' else 'busy', 'message': MESSAGES[(kind, 'limit')]})
    if not cache.add(busy_key, -1, hold):
        return _reply(429, error={'code': f'{kind}_busy' if kind == 'build' else 'busy', 'message': MESSAGES[(kind, 'busy')]})
    if rule['cooldown'] and not cache.add(f'limit:{kind}:cooldown:{user}', 1, rule['cooldown']):
        cache.delete(busy_key)
        return refused
    window = int(time.time()) // rule['window']
    if _incr(f'limit:{kind}:starts:{user}:{window}', rule['window'] + 5) > rule['starts']:
        cache.delete(busy_key)
        return refused
    if rule['global']:
        slot = next((index for index in range(rule['global']) if cache.add(f'limit:{kind}:slot:{index}', user, hold)), None)
        if slot is None:
            cache.delete(busy_key)
            return refused
        cache.set(busy_key, slot, hold)
    return _reply(200, acquired=True)
