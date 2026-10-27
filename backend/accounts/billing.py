"""Server-authoritative subscription pricing and Stripe transport."""
import hashlib
import hmac
import json
import time
from datetime import datetime, timezone as dt_timezone
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
from django.conf import settings
from django.utils import timezone
from .views import APIError

PLANS = {
    'free': {'name': 'Free', 'monthly': 0, 'yearly': 0, 'credits': 500, 'sites': 1},
    'basic': {'name': 'Basic', 'monthly': 1500, 'yearly': 12000, 'credits': 1000, 'sites': 1},
    'pro': {'name': 'Pro', 'monthly': 3900, 'yearly': 36000, 'credits': 3000, 'sites': 3},
}

def configuration():
    mode = settings.BILLING_MODE
    key = settings.STRIPE_SECRET_KEY
    prices = settings.STRIPE_PRICES
    enabled = mode in ('test', 'live') and key.startswith(('sk_' + mode + '_', 'rk_' + mode + '_')) and bool(settings.STRIPE_WEBHOOK_SECRET)
    enabled = enabled and len(prices) == 4 and all(isinstance(v, str) and v.startswith('price_') for v in prices.values()) and len(set(prices.values())) == 4
    return {'mode': mode, 'configured': bool(enabled)}

def require_config():
    config = configuration()
    if not config['configured']:
        raise APIError(503, 'billing_setup', 'Billing needs its Stripe keys and plan prices configured. No payment was started.')
    return config

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def stripe_request(method, route, fields=None, key=None):
    require_config()
    encoded = urlencode(fields or {}).encode()
    url = 'https://api.stripe.com/v1/' + route
    if method == 'GET' and fields:
        url += '?' + encoded.decode()
    headers = {'Authorization': 'Bearer ' + settings.STRIPE_SECRET_KEY, 'Stripe-Version': '2025-06-30.basil', 'Content-Type': 'application/x-www-form-urlencoded'}
    if key:
        headers['Idempotency-Key'] = str(key)
    request = Request(url, data=encoded if method == 'POST' else None, headers=headers, method=method)
    try:
        with build_opener(NoRedirect()).open(request, timeout=15) as response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ValueError()
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError()
            return result
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        # Never expose provider bodies, customer data or credentials in errors.
        raise APIError(502, 'billing_provider', 'Stripe could not complete this request. Try again shortly; a retry will reuse the same checkout.')

def provider_id(value, prefix):
    if not isinstance(value, str) or not value.startswith(prefix) or len(value) > 100 or not all(c.isalnum() or c == '_' for c in value):
        raise APIError(502, 'billing_response', 'Stripe returned an unexpected response.')
    return value

def stripe_url(value, hosts):
    if not isinstance(value, str) or len(value) > 2000:
        raise APIError(502, 'billing_response', 'Stripe returned an unexpected redirect.')
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or parsed.hostname not in hosts or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise APIError(502, 'billing_response', 'Stripe returned an unexpected redirect.')
    return value

def instant(value):
    try:
        if isinstance(value, bool):
            return None
        return datetime.fromtimestamp(int(value), tz=dt_timezone.utc) if value else None
    except (ValueError, TypeError, OverflowError, OSError):
        return None

def entitlements(account):
    paid = bool(account and account.status == 'active' and account.plan in ('basic', 'pro') and account.period_end and account.period_end > timezone.now())
    plan = account.plan if paid else 'free'
    return {'plan': plan, 'customDomains': paid, 'sites': PLANS[plan]['sites'], 'creditAllowance': PLANS[plan]['credits'], 'creditMeteringActive': False}

def price_choice(price):
    if not isinstance(price, dict) or price.get('currency') != 'usd':
        return None
    for choice, price_id in settings.STRIPE_PRICES.items():
        plan, cadence = choice.split(':')
        recurrence = price.get('recurring') or {}
        if price.get('id') == price_id and price.get('unit_amount') == PLANS[plan][cadence] and recurrence.get('interval') == ('year' if cadence == 'yearly' else 'month') and recurrence.get('interval_count', 1) == 1:
            return plan, cadence
    return None

def sync_subscription(account, subscription):
    if subscription.get('customer') != account.customer_id or subscription.get('livemode') is not (account.mode == 'live'):
        raise APIError(400, 'billing_owner', 'Subscription ownership could not be verified.')
    sub_id = provider_id(subscription.get('id'), 'sub_')
    # An older canceled subscription must not overwrite another active subscription.
    if account.subscription_id and account.subscription_id != sub_id and account.status == 'active':
        return
    items = subscription.get('items', {}).get('data', [])
    choice = price_choice(items[0].get('price')) if len(items) == 1 and items[0].get('quantity') == 1 else None
    account.subscription_id = sub_id
    account.plan, account.cadence = choice or ('free', '')
    account.status = subscription.get('status', 'unknown') if choice else 'unsupported_price'
    account.period_end = instant(items[0].get('current_period_end') or subscription.get('current_period_end')) if items else None
    account.cancel_at_period_end = subscription.get('cancel_at_period_end') is True
    account.save()

def verify_event(raw, signature):
    if len(raw) > 256 * 1024:
        raise APIError(413, 'webhook_size', 'Webhook is too large.')
    parts = {}
    for part in signature.split(','):
        name, _, value = part.partition('=')
        parts.setdefault(name, []).append(value)
    try:
        stamp = int(parts['t'][0])
        if abs(time.time() - stamp) > 300:
            raise ValueError()
        expected = hmac.new(settings.STRIPE_WEBHOOK_SECRET.encode(), str(stamp).encode() + b'.' + raw, hashlib.sha256).hexdigest()
        if not any(hmac.compare_digest(expected, value) for value in parts.get('v1', [])):
            raise ValueError()
        event = json.loads(raw)
        provider_id(event.get('id'), 'evt_')
        if event.get('livemode') is not (settings.BILLING_MODE == 'live'):
            raise ValueError()
        return event
    except (KeyError, ValueError, TypeError, AttributeError, UnicodeError, APIError):
        raise APIError(400, 'webhook_signature', 'Invalid Stripe webhook signature or environment.')
