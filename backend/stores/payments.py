"""Store-owner payments: separate credentials and connected-account scope."""
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode
from urllib.request import Request, build_opener
from urllib.error import HTTPError, URLError
from django.conf import settings
from accounts.billing import NoRedirect, provider_id, stripe_url
from accounts.views import APIError


def configured():
    mode = settings.STORE_STRIPE_MODE
    return mode in ('test', 'live') and settings.STORE_STRIPE_KEY.startswith(('sk_' + mode + '_', 'rk_' + mode + '_')) and bool(settings.STORE_STRIPE_WEBHOOK_SECRET)


def request(method, route, fields=None, account='', key=''):
    if not configured():
        raise APIError(503, 'store_payments_setup', 'Store payments are awaiting the platformâ€™s Stripe Connect configuration. No payment was started.')
    headers = {'Authorization': 'Bearer ' + settings.STORE_STRIPE_KEY, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2026-11-18.endive'}
    if account:
        headers['Stripe-Account'] = provider_id(account, 'acct_')
    if key:
        headers['Idempotency-Key'] = str(key)
    encoded = urlencode(fields or {}).encode()
    url = 'https://api.stripe.com/v1/' + route
    if method == 'GET' and fields:
        url += '?' + encoded.decode()
    try:
        with build_opener(NoRedirect()).open(Request(url, data=encoded if method == 'POST' else None, headers=headers, method=method), timeout=15) as response:
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ValueError()
            result = json.loads(raw)
            if not isinstance(result, dict):
                raise ValueError()
            return result
    except HTTPError as exc:
        try:
            err = json.loads(exc.read(65536)).get('error', {})
        except (ValueError, AttributeError):
            err = {}
        if route == 'checkout/sessions' and method == 'POST' and exc.code in (400, 402, 403, 404) and err.get('type') == 'invalid_request_error' and err.get('code') != 'idempotency_key_in_use':
            raise APIError(502, 'store_payment_rejected', 'Checkout could not be created. Please contact the store.')
        raise APIError(502, 'store_payment_provider', 'The payment provider could not complete this request. Please retry; we retain the same payment reference.')
    except (URLError, OSError, TimeoutError, ValueError):
        raise APIError(502, 'store_payment_provider', 'The payment provider could not complete this request. Please retry; we retain the same payment reference.')


def event(raw, signature):
    if not configured() or len(raw) > 262144:
        raise APIError(400, 'signature', 'Invalid payment notification.')
    try:
        parts = [p.split('=', 1) for p in signature.split(',')]
        timestamp = next(v for k, v in parts if k == 't')
        if abs(time.time() - int(timestamp)) > 300:
            raise ValueError()
        expected = hmac.new(settings.STORE_STRIPE_WEBHOOK_SECRET.encode(), timestamp.encode() + b'.' + raw, hashlib.sha256).hexdigest()
        if not any(k == 'v1' and hmac.compare_digest(v, expected) for k, v in parts):
            raise ValueError()
        result = json.loads(raw)
        provider_id(result['id'], 'evt_')
        provider_id(result['account'], 'acct_')
        if result.get('livemode') is not (settings.STORE_STRIPE_MODE == 'live'):
            raise ValueError()
        return result
    except (ValueError, KeyError, TypeError, StopIteration):
        raise APIError(400, 'signature', 'Invalid payment notification.')


def checkout_fields(order, origin):
    fields = {'mode': 'payment', 'payment_method_types[0]': 'card', 'customer_email': order.email,
              'success_url': origin + '/#page=store-confirmation&order=' + str(order.pk),
              'cancel_url': origin + '/#page=demo-fashion-store-1-cart&cancelled=1',
              'expires_at': int(order.reserved_until.timestamp()), 'metadata[order]': str(order.pk),
              'metadata[store]': str(order.store_id), 'payment_intent_data[metadata][order]': str(order.pk),
              'payment_intent_data[metadata][store]': str(order.store_id)}
    lines = [{'name': x['name'] + ' â€” ' + x['variant'], 'price': x['price'], 'quantity': x['quantity']} for x in order.items]
    if order.shipping:
        lines.append({'name': 'Shipping', 'price': order.shipping, 'quantity': 1})
    if order.tax:
        lines.append({'name': 'Tax', 'price': order.tax, 'quantity': 1})
    for i, line in enumerate(lines):
        fields.update({f'line_items[{i}][price_data][currency]': order.currency,
                       f'line_items[{i}][price_data][unit_amount]': line['price'],
                       f'line_items[{i}][price_data][product_data][name]': line['name'],
                       f'line_items[{i}][quantity]': line['quantity']})
    return fields


def checkout_url(value):
    return stripe_url(value, {'checkout.stripe.com'})
