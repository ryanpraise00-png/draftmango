import hmac
import json
import re
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from django.db import transaction, IntegrityError
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from accounts.views import api, body, APIError, throttle
from accounts.workspace_views import owner
from accounts.publishing import project_for, deleted
from accounts.models import PublishedSite
from .models import Store, Product, Variant, Customer, CustomerToken, Order, PaymentEvent, Enquiry
from . import services as S, payments


def enabled():
    if not settings.STORES_ENABLED:
        raise APIError(503, 'stores_setup', 'Store management is being prepared.')


def get_store(user, project_id, lock=False):
    project = project_for(user, project_id)
    query = Store.objects.select_for_update() if lock else Store.objects
    store = query.select_related('project').filter(project=project).first()
    if not store:
        raise APIError(404, 'store', 'Enable the store for this project first.')
    return store


@api(['GET', 'POST'])
def management(request):
    enabled(); user = owner(request)
    if request.method == 'GET':
        project_id = request.GET.get('projectId')
        if not project_id:
            return JsonResponse({'stores': [S.store_json(s) for s in Store.objects.select_related('project').filter(project__owner=user)[:100] if not deleted(s.project.document)]})
        project = project_for(user, project_id)
        s = Store.objects.filter(project=project).first()
        if not s:
            return JsonResponse({'store': None})
        section = request.GET.get('section', 'overview')
        result = {'store': S.store_json(s)}
        try:
            offset = max(0, min(100000, int(request.GET.get('offset', 0))))
        except ValueError:
            raise APIError(400, 'pagination', 'Choose a valid page.')
        query = S.text(request.GET.get('q', ''), 120)
        if section == 'products':
            rows = s.products.prefetch_related('variants').filter(name__icontains=query).order_by('-updated_at')
            result.update(products=[S.product_json(p) for p in rows[offset:offset + 50]], total=rows.count())
        elif section == 'orders':
            rows = s.orders.filter(email__icontains=query).order_by('-created_at')
            result.update(orders=[S.order_json(o, True) for o in rows[offset:offset + 50]], total=rows.count())
        elif section == 'customers':
            rows = s.customers.filter(email__icontains=query).order_by('-created_at')
            result.update(customers=[{'id': str(c.pk), 'email': c.email, 'name': c.name, 'verified': c.verified, 'active': c.active, 'createdAt': c.created_at.isoformat()} for c in rows[offset:offset + 50]], total=rows.count())
        elif section == 'messages':
            rows = s.enquiries.order_by('-created_at')
            result.update(messages=[{'id': e.pk, 'email': e.email, 'message': e.message, 'kind': e.kind, 'resolved': e.resolved, 'createdAt': e.created_at.isoformat()} for e in rows[offset:offset + 50]], total=rows.count())
        else:
            result.update(productCount=s.products.count(), customerCount=s.customers.count(), orderCount=s.orders.count(),
                          pendingOrders=s.orders.filter(status='pending').count(), paidOrders=s.orders.filter(status='paid').count())
            try:
                result['url'] = S.origin(s)
            except APIError:
                result['url'] = ''
        return JsonResponse(result)
    data = body(request, 100000)
    action = data.get('action')
    if action == 'enable':
        project = project_for(user, data.get('projectId'))
        try:
            manifest = json.loads(project.document.get('files', {}).get('template.lock.json', '{}'))
        except (ValueError, TypeError):
            manifest = {}
        if manifest.get('template', {}).get('id') != 'fashion-store-1':
            raise APIError(409, 'store_template', 'The first complete store workflow supports Fashion Store 1. Keep another design until its store adapter is available.')
        s, _ = Store.objects.get_or_create(project=project, defaults={'name': S.text(project.document.get('title', 'My store'), 120) or 'My store', 'payment_mode': settings.STORE_STRIPE_MODE})
        return JsonResponse({'store': S.store_json(s)}, status=201)
    s = get_store(user, data.get('projectId'))
    throttle(request, 'store-owner', str(user.pk), limit=120, seconds=60)
    if action == 'settings':
        with transaction.atomic():
            s = get_store(user, data.get('projectId'), True)
            values = data.get('settings', {})
            if not isinstance(values, dict):
                raise APIError(400, 'settings', 'Enter valid store settings.')
            currency = values.get('currency', s.currency)
            if currency not in ('usd', 'gbp', 'eur', 'cad', 'aud'):
                raise APIError(400, 'currency', 'Choose a supported store currency.')
            if currency != s.currency and (s.products.exists() or s.orders.exists()):
                raise APIError(409, 'currency', 'Set your currency before adding products. Existing product prices and orders keep their currency.')
            s.currency = currency; s.name = S.text(values.get('name', s.name), 120, True)
            s.support_email = S.email(values.get('supportEmail', s.support_email))
            s.country = S.text(values.get('country', s.country), 2, True).upper()
            countries = values.get('shippingCountries', s.shipping_countries)
            if not re.fullmatch('[A-Z]{2}', s.country) or not isinstance(countries, list) or not 1 <= len(countries) <= 100 or any(not isinstance(c, str) or not re.fullmatch('[A-Z]{2}', c) for c in countries):
                raise APIError(400, 'countries', 'Use two-letter country codes, such as GB or US.')
            s.shipping_countries = sorted(set(countries))
            s.shipping_amount = S.number(values.get('shippingAmount', s.shipping_amount), 100000)
            s.tax_basis_points = S.number(values.get('taxBasisPoints', s.tax_basis_points), 10000)
            policies = values.get('policies', s.policies)
            if not isinstance(policies, dict):
                raise APIError(400, 'policies', 'Enter your store policies.')
            s.policies = {k: S.text(policies.get(k, ''), 20000) for k in ('shipping', 'returns', 'privacy', 'terms')}
            accepting = values.get('acceptingOrders', s.accepting_orders)
            if type(accepting) is not bool:
                raise APIError(400, 'settings', 'Choose whether to accept orders.')
            if accepting:
                S.origin(s)
                if not payments.configured() or not s.charges_enabled or s.payment_mode != settings.STORE_STRIPE_MODE or any(len(v) < 20 for v in s.policies.values()) or not s.products.filter(active=True).exists():
                    raise APIError(409, 'store_incomplete', 'Before opening: connect payments, publish the site, add an active product, and complete all four policies.')
            s.accepting_orders = accepting; s.save()
        return JsonResponse({'store': S.store_json(s)})
    if action == 'product':
        with transaction.atomic():
            Store.objects.select_for_update().get(pk=s.pk)
            values = data.get('product', {})
            if not isinstance(values, dict):
                raise APIError(400, 'product', 'Enter a product.')
            p = s.products.filter(pk=valid_uuid(values['id'])).first() if values.get('id') else Product(store=s)
            if not p:
                raise APIError(404, 'product', 'Product not found.')
            p.name = S.text(values.get('name', ''), 160, True); p.description = S.text(values.get('description', ''), 8000)
            p.category = S.text(values.get('category', ''), 80); p.image = S.https_url(values.get('image', ''))
            if type(values.get('active')) is not bool:
                raise APIError(400, 'product', 'Choose product visibility.')
            p.active = values['active']; variants = values.get('variants')
            if not isinstance(variants, list) or not 1 <= len(variants) <= 50:
                raise APIError(400, 'variants', 'Add 1 to 50 product options.')
            clean, ids, skus = [], set(), set()
            for v in variants:
                if not isinstance(v, dict):
                    raise APIError(400, 'variants', 'Enter a valid product option.')
                vid = valid_uuid(v['id']) if v.get('id') else None
                sku = S.text(v.get('sku', ''), 80, True)
                if sku in skus or (vid and vid in ids):
                    raise APIError(400, 'variants', 'Each option needs a unique SKU.')
                skus.add(sku); ids.add(vid)
                price = S.number(v.get('price'))
                if price < 50:
                    raise APIError(400, 'price', 'The minimum option price is 0.50 in the store currency.')
                clean.append((vid, {'sku': sku, 'label': S.text(v.get('label', 'Standard'), 100, True), 'price': price,
                                   'stock': S.number(v.get('stock'), 1000000), 'active': True}))
            if not p.pk or not Product.objects.filter(pk=p.pk).exists():
                if s.products.count() >= 500:
                    raise APIError(409, 'product_limit', 'This store supports up to 500 products.')
            p.save()
            existing = {str(v.pk): v for v in p.variants.select_for_update()}
            if any(vid and vid not in existing for vid, _ in clean):
                raise APIError(404, 'variants', 'An option does not belong to this product.')
            for vid, value in clean:
                if any(v.sku == value['sku'] and key != vid for key, v in existing.items()):
                    raise APIError(409, 'sku', 'This SKU belongs to another option. Use a unique SKU.')
            # Archive removed options so historic orders and reserved stock remain traceable.
            p.variants.exclude(pk__in=[vid for vid, _ in clean if vid]).update(active=False)
            for vid, value in clean:
                if vid:
                    for k, v in value.items(): setattr(existing[vid], k, v)
                    existing[vid].save()
                else:
                    if p.variants.filter(sku=value['sku']).exists():
                        raise APIError(409, 'sku', 'This SKU already belongs to an archived option. Use a new SKU.')
                    Variant.objects.create(product=p, **value)
        return JsonResponse({'product': S.product_json(p)})
    if action in ('connect', 'payment-status'):
        if not payments.configured():
            raise APIError(503, 'store_payments_setup', 'Stripe Connect needs to be configured for store-owner payments. Draftmango subscription billing is separate.')
        if s.payment_mode != settings.STORE_STRIPE_MODE and s.stripe_account:
            raise APIError(409, 'payment_mode', 'This connection belongs to another payment mode. Ask support to migrate the store connection.')
        if not s.stripe_account:
            if action != 'connect':
                return JsonResponse({'store': S.store_json(s)})
            if not s.support_email:
                raise APIError(409, 'store_settings', 'Save your business country and support email before connecting payments.')
            account = payments.request('POST', 'accounts', {'type': 'standard', 'country': s.country, 'email': user.email,
                      'metadata[draftmango_store]': str(s.pk)}, key='store-account-' + settings.STORE_STRIPE_MODE + '-' + str(s.pk))
            s.stripe_account = payments.provider_id(account.get('id'), 'acct_'); s.payment_mode = settings.STORE_STRIPE_MODE
            s.save(update_fields=['stripe_account', 'payment_mode'])
        account = payments.request('GET', 'accounts/' + s.stripe_account)
        s.charges_enabled = bool(account.get('charges_enabled') and account.get('details_submitted'))
        if not s.charges_enabled: s.accepting_orders = False
        s.save(update_fields=['charges_enabled', 'accepting_orders'])
        result = {'store': S.store_json(s)}
        if action == 'connect':
            back = settings.APP_ORIGIN + '/dashboard#store/' + s.project.project_id + '/settings'
            link = payments.request('POST', 'account_links', {'account': s.stripe_account, 'type': 'account_onboarding', 'return_url': back, 'refresh_url': back})
            result['url'] = payments.stripe_url(link.get('url'), {'connect.stripe.com'})
        return JsonResponse(result)
    if action in ('order-refresh', 'fulfil', 'refund'):
        o = s.orders.filter(pk=valid_uuid(data.get('orderId'))).first()
        if not o: raise APIError(404, 'order', 'Order not found.')
        if action == 'order-refresh': o = S.reconcile(o)
        elif action == 'fulfil':
            with transaction.atomic():
                o = Order.objects.select_for_update().get(pk=o.pk)
                if o.status != 'paid': raise APIError(409, 'unpaid', 'Only paid orders can be marked fulfilled.')
                o.fulfilment = 'fulfilled'; o.tracking_url = S.https_url(data.get('trackingUrl', '')); o.save()
        else:
            if o.status not in ('paid', 'refunded') or not o.payment_id:
                raise APIError(409, 'refund', 'Only a paid order can be refunded.')
            if o.status != 'refunded':
                result = payments.request('POST', 'refunds', {'payment_intent': o.payment_id}, account=o.payment_account, key='store-refund-' + str(o.pk))
                if result.get('status') != 'succeeded':
                    raise APIError(409, 'refund_pending', 'The provider is processing this refund. Refresh it before retrying; the same refund reference is retained.')
                Order.objects.filter(pk=o.pk).update(status='refunded'); o.status = 'refunded'
        return JsonResponse({'order': S.order_json(o, True)})
    if action == 'customer-access':
        c = s.customers.filter(pk=valid_uuid(data.get('customerId'))).first()
        if not c: raise APIError(404, 'customer', 'Customer not found.')
        if type(data.get('active')) is not bool: raise APIError(400, 'customer', 'Choose account access.')
        c.active = data['active']; c.save(update_fields=['active'])
        if not c.active: CustomerToken.objects.filter(customer=c).delete()
        return JsonResponse({'saved': True})
    if action == 'resolve-message':
        s.enquiries.filter(pk=S.number(data.get('id'))).update(resolved=True)
        return JsonResponse({'saved': True})
    raise APIError(400, 'action', 'Choose a supported store action.')


def valid_uuid(value):
    from uuid import UUID
    try: return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError): raise APIError(400, 'id', 'Choose a valid record.')


def public_store(request):
    enabled()
    if len(settings.PUBLISHING_TOKEN) < 32 or not hmac.compare_digest(request.headers.get('X-Publishing-Token', ''), settings.PUBLISHING_TOKEN):
        raise APIError(404, 'store', 'Store not found.')
    host = request.headers.get('X-Store-Host', '').lower()
    suffix = '.' + settings.PUBLISHING_BASE_DOMAIN
    slug = host[:-len(suffix)] if host.endswith(suffix) else ''
    if not re.fullmatch('[a-z][a-z0-9-]{1,46}[a-z0-9]', slug):
        raise APIError(404, 'store', 'Store not found.')
    site = PublishedSite.objects.select_related('project').filter(address_id=slug, active_release__isnull=False).first()
    if not site or deleted(site.project.document): raise APIError(404, 'store', 'Store not found.')
    s = Store.objects.select_related('project').filter(project=site.project).first()
    if not s: raise APIError(404, 'store', 'Store not found.')
    return s


COOKIE = '__Host-draftmango_store'


@csrf_exempt
@api(['GET', 'POST'])
def customer_api(request, action):
    s = public_store(request)
    cookie_name = COOKIE if settings.PRODUCTION else 'draftmango_store'
    token = request.COOKIES.get(cookie_name, '')
    c = S.session_customer(s, token)
    if request.method == 'GET':
        if action == 'catalog':
            return JsonResponse({'store': S.store_json(s), 'products': [S.product_json(p) for p in s.products.filter(active=True).prefetch_related('variants').order_by('name')[:500]],
                                 'customer': {'name': c.name, 'email': c.email} if c else None})
        if action == 'orders':
            if not c: raise APIError(401, 'sign_in', 'Sign in to see your orders.')
            return JsonResponse({'orders': [S.order_json(o) for o in s.orders.filter(customer=c).order_by('-created_at')[:100]]})
        raise APIError(405, 'method', 'Use POST for this action.')
    data = body(request, 65536)
    throttle(request, 'store-' + str(s.pk) + '-' + action, limit=15 if action in ('signup', 'login', 'reset', 'resend') else 90, seconds=300)
    if action == 'signup':
        address = S.email(data.get('email')); secret = S.password(data.get('password')); name = S.text(data.get('name', ''), 120)
        with transaction.atomic():
            customer, created = Customer.objects.get_or_create(store=s, email=address, defaults={'name': name, 'password': make_password(secret)})
        if customer.active and not customer.verified and (created or check_password(secret, customer.password)):
            S.send_account_link(customer, 'verify')
        return JsonResponse({'message': 'Check your inbox to confirm your email. If you already have an account, sign in or reset your password.'})
    if action == 'login':
        customer = s.customers.filter(email=S.email(data.get('email')), active=True).first()
        secret = data.get('password', '')
        if not isinstance(secret, str) or not 1 <= len(secret) <= 128:
            raise APIError(400, 'password', 'Enter a password of up to 128 characters.')
        if not customer or not check_password(secret, customer.password):
            if not customer: make_password(secret)
            raise APIError(401, 'credentials', 'The email and password did not match.')
        if not customer.verified: raise APIError(403, 'verify_email', 'Confirm your email first. You can request another link.')
        response = JsonResponse({'customer': {'name': customer.name, 'email': customer.email}})
        response.set_cookie(cookie_name, S.issue_token(customer, 'session'), max_age=14 * 86400, secure=settings.PRODUCTION, httponly=True, samesite='Lax', path='/')
        return response
    if action == 'logout':
        CustomerToken.objects.filter(digest=S.digest(token), purpose='session', customer__store=s).delete()
        response = JsonResponse({'signedOut': True}); response.delete_cookie(cookie_name, path='/', samesite='Lax'); return response
    if action in ('reset', 'resend'):
        customer = s.customers.filter(email=S.email(data.get('email')), active=True).first()
        if customer and (action == 'reset' or not customer.verified): S.send_account_link(customer, 'reset' if action == 'reset' else 'verify')
        return JsonResponse({'message': 'If this email has an eligible account, a link is on its way.'})
    if action in ('verify', 'reset-confirm'):
        S.consume_token(s, data.get('token'), 'verify' if action == 'verify' else 'reset', data.get('password'))
        return JsonResponse({'message': 'Your email is confirmed. You can sign in.' if action == 'verify' else 'Your password has been updated. Sign in again.'})
    if action == 'quote':
        with transaction.atomic():
            Store.objects.select_for_update().get(pk=s.pk)
            items = S.cart_items(s, data.get('items'))
            return JsonResponse({'items': items, **S.totals(s, items), 'currency': s.currency})
    if action == 'checkout':
        throttle(request, 'store-checkout-' + str(s.pk), S.email(data.get('email')), limit=10, seconds=300)
        o = S.checkout(s, data, c)
        return JsonResponse({'id': str(o.pk), 'url': o.checkout_url})
    if action == 'order':
        o = s.orders.filter(pk=valid_uuid(data.get('id'))).first()
        access = S.text(data.get('access', ''), 100)
        if not o or not ((c and o.customer_id == c.pk) or (access and hmac.compare_digest(o.access_digest, S.digest(access)))):
            raise APIError(404, 'order', 'Order not found. Sign in or open it in the browser used for checkout.')
        if o.status == 'pending': o = S.reconcile(o)
        return JsonResponse({'order': S.order_json(o)})
    if action in ('contact', 'newsletter'):
        Enquiry.objects.create(store=s, email=S.email(data.get('email')), kind=action,
                               message=S.text(data.get('message', 'Newsletter subscription requested'), 8000, True))
        return JsonResponse({'message': 'Thank you. Your message has been received.' if action == 'contact' else 'Your subscription request has been received. Thank you.'})
    raise APIError(404, 'action', 'Not found.')


@csrf_exempt
@api(['POST'])
def webhook(request):
    enabled()
    e = payments.event(request.body, request.headers.get('Stripe-Signature', ''))
    if PaymentEvent.objects.filter(pk=e['id']).exists(): return JsonResponse({'received': True})
    if e.get('type') in ('checkout.session.completed', 'checkout.session.expired'):
        obj = e.get('data', {}).get('object', {})
        order_id = obj.get('metadata', {}).get('order')
        if order_id:
            o = Order.objects.filter(pk=valid_uuid(order_id), payment_account=e['account'], payment_mode=settings.STORE_STRIPE_MODE).first()
            if not o: raise APIError(400, 'payment_account', 'Payment does not belong to this store.')
            sid = payments.provider_id(obj.get('id'), 'cs_')
            if o.checkout_id and o.checkout_id != sid: raise APIError(400, 'payment_reference', 'Payment reference mismatch.')
            if not o.checkout_id:
                Order.objects.filter(pk=o.pk, checkout_id='').update(checkout_id=sid); o.checkout_id = sid
            S.reconcile(o)
    elif e.get('type') == 'charge.refunded':
        obj = e.get('data', {}).get('object', {})
        pid = payments.provider_id(obj.get('payment_intent'), 'pi_')
        o = Order.objects.filter(payment_id=pid, payment_account=e['account'], payment_mode=settings.STORE_STRIPE_MODE).first()
        # Refunds may arrive before the checkout-completed notification.
        if not o:
            intent = payments.request('GET', 'payment_intents/' + pid, account=e['account'])
            reference = intent.get('metadata', {}).get('order')
            if reference:
                o = Order.objects.filter(pk=valid_uuid(reference), payment_account=e['account'], payment_mode=settings.STORE_STRIPE_MODE).first()
                if o and (intent.get('id') != pid or intent.get('metadata', {}).get('store') != str(o.store_id) or intent.get('livemode') is not (o.payment_mode == 'live')):
                    raise APIError(400, 'payment_reference', 'Refund reference mismatch.')
                if o and o.status == 'pending':
                    if not o.checkout_id: o = S.ensure_checkout(o, S.origin(o.store))
                    o = S.reconcile(o)
        if o and obj.get('refunded') is True and obj.get('amount_refunded') == o.total and obj.get('currency') == o.currency:
            charge = payments.request('GET', 'charges/' + payments.provider_id(obj.get('id'), 'ch_'), account=o.payment_account)
            if charge.get('id') == obj.get('id') and charge.get('refunded') is True and charge.get('amount_refunded') == o.total and charge.get('currency') == o.currency and charge.get('payment_intent') == o.payment_id and charge.get('livemode') is (o.payment_mode == 'live'):
                Order.objects.filter(pk=o.pk, status='paid').update(status='refunded')
    elif e.get('type') == 'account.updated':
        obj = e.get('data', {}).get('object', {})
        if obj.get('id') == e['account']:
            ready = bool(obj.get('charges_enabled') and obj.get('details_submitted'))
            Store.objects.filter(stripe_account=e['account'], payment_mode=settings.STORE_STRIPE_MODE).update(charges_enabled=ready)
            if not ready: Store.objects.filter(stripe_account=e['account']).update(accepting_orders=False)
    PaymentEvent.objects.get_or_create(event_id=e['id'])
    return JsonResponse({'received': True})
