import hashlib
import hmac
import json
import re
import secrets
from uuid import UUID
from datetime import timedelta
from urllib.parse import urlencode, urlsplit
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from accounts.views import APIError
from accounts.publishing import site_url
from .models import Store, Customer, CustomerToken, Product, Variant, Order
from . import payments


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def text(value, limit=120, required=False):
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise APIError(400, 'validation', 'Complete the required fields within their length limits.')
    return value.strip()


def email(value):
    value = text(value, 254, True).lower()
    try:
        validate_email(value)
    except ValidationError:
        raise APIError(400, 'email', 'Enter a valid email address.')
    return value


def number(value, maximum=10000000):
    if type(value) is not int or not 0 <= value <= maximum:
        raise APIError(400, 'validation', 'Use a whole number within the allowed range.')
    return value


def https_url(value):
    value = text(value, 2000)
    if not value:
        return ''
    try:
        u = urlsplit(value)
        if u.scheme != 'https' or not u.hostname or u.username or u.password or u.port not in (None, 443):
            raise ValueError()
    except ValueError:
        raise APIError(400, 'url', 'Use an HTTPS URL without credentials.')
    return value


def password(value):
    if not isinstance(value, str) or not 1 <= len(value) <= 128:
        raise APIError(400, 'password', 'Enter a password of up to 128 characters.')
    try:
        validate_password(value)
    except ValidationError as e:
        raise APIError(400, 'password', ' '.join(e.messages))
    return value


def origin(store):
    site = getattr(store.project, 'publishedsite', None)
    if not site or not site.active_release_id:
        raise APIError(409, 'publish_required', 'Publish this project before accepting customers or connecting checkout.')
    return site_url(site.address_id).rstrip('/')


def product_json(p):
    return {'id': str(p.pk), 'name': p.name, 'description': p.description, 'category': p.category,
            'image': p.image, 'active': p.active,
            'variants': [{'id': str(v.pk), 'label': v.label, 'sku': v.sku, 'price': v.price, 'stock': v.stock, 'active': v.active} for v in p.variants.all()]}


def store_json(s):
    return {'id': str(s.pk), 'projectId': s.project.project_id, 'name': s.name, 'currency': s.currency,
            'supportEmail': s.support_email, 'country': s.country, 'shippingCountries': s.shipping_countries,
            'shippingAmount': s.shipping_amount, 'taxBasisPoints': s.tax_basis_points, 'policies': s.policies,
            'acceptingOrders': s.accepting_orders, 'paymentMode': s.payment_mode,
            'paymentConnected': bool(s.stripe_account), 'chargesEnabled': s.charges_enabled,
            'providerConfigured': payments.configured()}


def order_json(o, owner=False):
    result = {'id': str(o.pk), 'items': o.items, 'subtotal': o.subtotal, 'shipping': o.shipping, 'tax': o.tax,
              'total': o.total, 'currency': o.currency, 'status': o.status, 'fulfilment': o.fulfilment,
              'trackingUrl': o.tracking_url, 'createdAt': o.created_at.isoformat(), 'paymentMode': o.payment_mode}
    if owner:
        result.update(email=o.email, address=o.address, checkoutId=o.checkout_id)
    return result


def issue_token(customer, purpose):
    value = secrets.token_urlsafe(32)
    CustomerToken.objects.filter(customer=customer, purpose=purpose, expires_at__lt=timezone.now()).delete()
    if purpose != 'session':
        CustomerToken.objects.filter(customer=customer, purpose=purpose).delete()
    else:
        # Bound persistent sessions for a single customer.
        keep = list(CustomerToken.objects.filter(customer=customer, purpose='session').order_by('-expires_at').values_list('pk', flat=True)[:9])
        CustomerToken.objects.filter(customer=customer, purpose='session').exclude(pk__in=keep).delete()
    CustomerToken.objects.create(digest=digest(value), customer=customer, purpose=purpose,
                                 expires_at=timezone.now() + (timedelta(days=14) if purpose == 'session' else timedelta(minutes=30)))
    return value


def send_account_link(customer, purpose):
    token = issue_token(customer, purpose)
    url = origin(customer.store) + '/#' + urlencode({'page': 'store-reset-confirm' if purpose == 'reset' else 'store-verify', 'token': token})
    subject = ('Confirm your email' if purpose == 'verify' else 'Reset your password') + ' | ' + customer.store.name
    try:
        if send_mail(subject, subject + '\n\n' + url + '\n\nThis link expires in 30 minutes.', settings.DEFAULT_FROM_EMAIL, [customer.email]) != 1:
            raise ValueError()
    except Exception:
        raise APIError(503, 'store_email', 'The message could not be sent. Please request another link shortly.')


def session_customer(store, token):
    if not token or len(token) > 100:
        return None
    row = CustomerToken.objects.select_related('customer').filter(digest=digest(token), purpose='session',
          customer__store=store, customer__active=True, customer__verified=True, expires_at__gt=timezone.now()).first()
    return row.customer if row else None


def consume_token(store, token, purpose, new_password=None):
    if not isinstance(token, str) or len(token) > 100:
        raise APIError(400, 'token', 'This link is invalid or expired.')
    with transaction.atomic():
        row = CustomerToken.objects.select_for_update().select_related('customer').filter(digest=digest(token), purpose=purpose,
              customer__store=store, customer__active=True, expires_at__gt=timezone.now()).first()
        if not row:
            raise APIError(400, 'token', 'This link is invalid or expired.')
        c = Customer.objects.select_for_update().get(pk=row.customer_id)
        if purpose == 'reset':
            c.password = make_password(password(new_password))
            CustomerToken.objects.filter(customer=c).delete()
        else:
            c.verified = True
            row.delete()
        c.save()
        return c


def cart_items(store, items):
    if not isinstance(items, list) or not 1 <= len(items) <= 40:
        raise APIError(400, 'cart', 'Choose between 1 and 40 items.')
    combined = {}
    for item in items:
        if not isinstance(item, dict) or not re.fullmatch(r'[a-f0-9-]{36}', str(item.get('variantId', ''))):
            raise APIError(400, 'cart', 'Choose a valid product option.')
        quantity = number(item.get('quantity'), 99)
        if not quantity:
            raise APIError(400, 'cart', 'Each quantity must be at least one.')
        try: key = str(UUID(item['variantId']))
        except ValueError: raise APIError(400, 'cart', 'Choose a valid product option.')
        combined[key] = combined.get(key, 0) + quantity
        if combined[key] > 99:
            raise APIError(400, 'cart', 'Choose at most 99 of each option.')
    variants = list(Variant.objects.select_for_update().select_related('product').filter(pk__in=combined,
                    product__store=store, product__active=True, active=True).order_by('pk'))
    if len(variants) != len(combined):
        raise APIError(409, 'cart_changed', 'An item is no longer available. Review your bag.')
    result = []
    for v in variants:
        qty = combined[str(v.pk)]
        if v.stock < qty:
            raise APIError(409, 'stock', v.product.name + ' does not have enough stock. Review your bag.')
        result.append({'variantId': str(v.pk), 'productId': str(v.product_id), 'name': v.product.name,
                       'variant': v.label, 'sku': v.sku, 'price': v.price, 'quantity': qty, 'image': v.product.image})
    return result


def totals(store, items):
    subtotal = sum(i['price'] * i['quantity'] for i in items)
    tax = ((subtotal + store.shipping_amount) * store.tax_basis_points + 5000) // 10000
    total = subtotal + store.shipping_amount + tax
    if not 50 <= total <= 99999999:
        raise APIError(400, 'amount', 'The order total is outside the supported range.')
    return {'subtotal': subtotal, 'shipping': store.shipping_amount, 'tax': tax, 'total': total}


def checkout(store, data, customer):
    if not payments.configured():
        raise APIError(503, 'store_payments_setup', 'Store payments have not been connected.')
    site_origin = origin(store)
    if data.get('acceptTerms') is not True:
        raise APIError(400, 'terms', 'Accept the store terms before continuing.')
    request_key = text(data.get('key', ''), 64, True)
    access = text(data.get('access', ''), 100, True)
    if not re.fullmatch(r'[a-zA-Z0-9_-]{24,64}', request_key) or not re.fullmatch(r'[a-zA-Z0-9_-]{32,100}', access):
        raise APIError(400, 'checkout_key', 'Refresh your checkout and try again.')
    contact = email(data.get('email', ''))
    address = data.get('address', {})
    if not isinstance(address, dict):
        raise APIError(400, 'address', 'Enter your delivery address.')
    address = {k: text(address.get(k, ''), 160, k != 'line2') for k in ('name', 'line1', 'line2', 'city', 'postalCode', 'country')}
    if address['country'] not in store.shipping_countries:
        raise APIError(400, 'shipping', 'Choose a supported delivery country.')
    canonical = json.dumps({'email': contact, 'address': address, 'items': data.get('items'), 'access': digest(access)}, sort_keys=True)
    with transaction.atomic():
        s = Store.objects.select_for_update().get(pk=store.pk)
        old = Order.objects.filter(store=s, request_key=request_key).first()
        if old:
            if not hmac.compare_digest(old.request_digest, digest(canonical)):
                raise APIError(409, 'checkout_changed', 'This checkout has changed. Start a new checkout.')
            order = old
        else:
            if not s.accepting_orders or not s.charges_enabled or not s.stripe_account or s.payment_mode != settings.STORE_STRIPE_MODE:
                raise APIError(409, 'store_closed', 'This store is not accepting payments yet.')
            items = cart_items(s, data.get('items'))
            for item in items:
                Variant.objects.filter(pk=item['variantId']).update(stock=F('stock') - item['quantity'])
            order = Order.objects.create(store=s, customer=customer, email=contact, address=address, items=items,
                    **totals(s, items), currency=s.currency, payment_account=s.stripe_account, payment_mode=s.payment_mode,
                    request_key=request_key, request_digest=digest(canonical), access_digest=digest(access),
                    reserved_until=timezone.now() + timedelta(minutes=31))
    if order.status != 'pending':
        raise APIError(409, 'checkout_finished', 'This checkout is already complete or expired. Review your order.')
    if order.checkout_url and order.reserved_until > timezone.now():
        return order
    return ensure_checkout(order, site_origin)


def ensure_checkout(order, site_origin):
    try:
        result = payments.request('POST', 'checkout/sessions', payments.checkout_fields(order, site_origin),
                                  account=order.payment_account, key='store-checkout-' + str(order.pk))
        checkout_id = payments.provider_id(result.get('id'), 'cs_')
        # Retain the reference even if a recovered session no longer has a URL.
        # The worker can verify its final state and release expired stock safely.
        Order.objects.filter(pk=order.pk).update(checkout_id=checkout_id)
        order.checkout_id = checkout_id
        url = payments.checkout_url(result.get('url'))
    except APIError as exc:
        # A rejection after an earlier timeout cannot prove that no session exists.
        if exc.code != 'store_payment_rejected':
            Order.objects.filter(pk=order.pk).update(checkout_uncertain=True)
        # Only a definitive first rejection can release an uncreated session.
        # Network errors remain reserved until Stripe confirms its status.
        if exc.code == 'store_payment_rejected':
            with transaction.atomic():
                Store.objects.select_for_update().get(pk=order.store_id)
                o = Order.objects.select_for_update().get(pk=order.pk)
                if o.status == 'pending' and (o.checkout_uncertain or o.checkout_id):
                    raise APIError(502, 'store_payment_provider', 'Your earlier checkout is still being verified. Retry shortly; we retain the same payment reference.')
                if o.status == 'pending' and not o.inventory_released:
                    for item in o.items:
                        Variant.objects.filter(pk=item['variantId'], product__store_id=o.store_id).update(stock=F('stock') + item['quantity'])
                    o.status = 'expired'; o.inventory_released = True
                    o.save(update_fields=['status', 'inventory_released'])
        raise
    Order.objects.filter(pk=order.pk).update(checkout_id=checkout_id, checkout_url=url)
    order.checkout_id, order.checkout_url = checkout_id, url
    return order


def reconcile(order):
    if not order.checkout_id or order.payment_mode != settings.STORE_STRIPE_MODE:
        return order
    result = payments.request('GET', 'checkout/sessions/' + order.checkout_id, account=order.payment_account)
    if result.get('id') != order.checkout_id or result.get('metadata', {}).get('order') != str(order.pk) or result.get('metadata', {}).get('store') != str(order.store_id):
        raise APIError(502, 'payment_mismatch', 'The payment reference could not be verified.')
    if result.get('livemode') is not (order.payment_mode == 'live') or result.get('currency') != order.currency or result.get('amount_total') != order.total:
        raise APIError(502, 'payment_mismatch', 'The payment amount could not be verified.')
    with transaction.atomic():
        Store.objects.select_for_update().get(pk=order.store_id)
        o = Order.objects.select_for_update().get(pk=order.pk)
        if result.get('payment_status') == 'paid' and o.status == 'pending':
            o.status = 'paid'
            o.payment_id = payments.provider_id(result.get('payment_intent'), 'pi_')
            o.save(update_fields=['status', 'payment_id'])
        elif result.get('status') == 'expired' and o.status == 'pending':
            if not o.inventory_released:
                for item in o.items:
                    Variant.objects.filter(pk=item['variantId'], product__store_id=o.store_id).update(stock=F('stock') + item['quantity'])
            o.status = 'expired'; o.inventory_released = True
            o.save(update_fields=['status', 'inventory_released'])
        return o


def receipt(order):
    # At-least-once delivery; payment processing remains independent of SMTP.
    with transaction.atomic():
        o = Order.objects.select_for_update().select_related('store').get(pk=order.pk)
        if o.status != 'paid' or o.email_sent:
            return
        message = f'Thank you for your order at {o.store.name}.\nOrder: {o.pk}\nTotal: {o.total / 100:.2f} {o.currency.upper()}\n'
        message += '\n'.join(f"{i['quantity']} Ã— {i['name']} ({i['variant']})" for i in o.items)
        message += '\n\nSupport: ' + o.store.support_email
        if send_mail('Order confirmed | ' + o.store.name, message, settings.DEFAULT_FROM_EMAIL, [o.email]) == 1:
            o.email_sent = True; o.save(update_fields=['email_sent'])
