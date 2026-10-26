import uuid
from datetime import timedelta
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import BillingAccount, BillingEvent
from .views import api, body, APIError, throttle
from .workspace_views import owner
from .billing import PLANS, configuration, require_config, stripe_request, provider_id, stripe_url, instant, entitlements, price_choice, sync_subscription, verify_event

def account_for(user):
    return BillingAccount.objects.get_or_create(owner=user, mode=settings.BILLING_MODE)[0]

def serialize(account):
    pending = account.checkout_expires and account.checkout_expires > timezone.now()
    return {**configuration(), 'currency': 'usd', 'plans': PLANS, 'entitlements': entitlements(account), 'status': account.status, 'cadence': account.cadence,
            'renewalAt': account.period_end.isoformat() if account.period_end else None, 'cancelAtPeriodEnd': account.cancel_at_period_end,
            'canManage': bool(account.customer_id and account.subscription_id),
            'canSubscribe': not account.subscription_id or account.status in ('canceled', 'incomplete_expired'),
            'pendingCheckout': {'url': account.checkout_url or None, 'plan': account.checkout_plan, 'cadence': account.checkout_cadence} if pending else None}

@api(['GET'])
def status(request):
    return JsonResponse(serialize(account_for(owner(request))))

@api(['POST'])
def checkout(request):
    user = owner(request); require_config(); data = body(request)
    throttle(request, 'checkout', str(user.pk), limit=12, seconds=600)
    plan, cadence = data.get('plan'), data.get('cadence')
    if plan not in ('basic', 'pro') or cadence not in ('monthly', 'yearly'):
        raise APIError(400, 'plan', 'Choose Basic or Pro and monthly or yearly billing.')
    account = account_for(user)
    # Lease survives network failures, while the persisted key makes provider retries idempotent.
    with transaction.atomic():
        account = BillingAccount.objects.select_for_update().get(pk=account.pk)
        if account.subscription_id and account.status not in ('canceled', 'incomplete_expired'):
            raise APIError(409, 'existing_subscription', 'Use Manage billing to change your existing subscription.')
        if account.busy_until and account.busy_until > timezone.now():
            raise APIError(409, 'checkout_busy', 'Your checkout is being prepared. Try again shortly.')
        if account.checkout_expires and account.checkout_expires > timezone.now():
            if (account.checkout_plan, account.checkout_cadence) != (plan, cadence):
                raise APIError(409, 'pending_checkout', 'Resume or cancel your pending checkout before choosing another plan.')
            if account.checkout_url:
                return JsonResponse({'url': account.checkout_url, 'mode': settings.BILLING_MODE})
        else:
            account.checkout_key = uuid.uuid4()
            account.checkout_plan, account.checkout_cadence = plan, cadence
            account.checkout_id = account.checkout_url = ''
            account.checkout_expires = timezone.now() + timedelta(hours=24)
        account.busy_until = timezone.now() + timedelta(seconds=90)
        account.save()
    try:
        price_id = settings.STRIPE_PRICES[plan + ':' + cadence]
        price = stripe_request('GET', 'prices/' + provider_id(price_id, 'price_'))
        if price_choice(price) != (plan, cadence) or price.get('active') is not True or price.get('livemode') is not (settings.BILLING_MODE == 'live'):
            raise APIError(503, 'price_setup', 'This Stripe price does not match Draftmango’s plan, currency, or billing interval. No payment was started.')
        if not account.customer_id:
            customer = stripe_request('POST', 'customers', {'email': user.email, 'metadata[draftmango_account]': str(user.pk)}, 'draftmango-customer-' + str(user.pk) + '-' + account.mode)
            account.customer_id = provider_id(customer.get('id'), 'cus_')
            account.save(update_fields=['customer_id', 'updated_at'])
        result = stripe_request('POST', 'checkout/sessions', {
            'mode': 'subscription', 'customer': account.customer_id, 'line_items[0][price]': price_id, 'line_items[0][quantity]': '1',
            'client_reference_id': str(user.pk), 'subscription_data[metadata][draftmango_account]': str(user.pk),
            'success_url': settings.APP_ORIGIN + '/dashboard.html?checkout=return#settings/billing',
            'cancel_url': settings.APP_ORIGIN + '/dashboard.html#settings/billing',
            'billing_address_collection': 'required',
            'automatic_tax[enabled]': 'true' if settings.STRIPE_AUTOMATIC_TAX else 'false',
        }, 'draftmango-checkout-' + str(account.checkout_key))
        account.checkout_id = provider_id(result.get('id'), 'cs_')
        account.checkout_url = stripe_url(result.get('url'), {'checkout.stripe.com'})
        account.checkout_expires = instant(result.get('expires_at')) or account.checkout_expires
        account.save(update_fields=['checkout_id', 'checkout_url', 'checkout_expires', 'updated_at'])
        return JsonResponse({'url': account.checkout_url, 'mode': settings.BILLING_MODE})
    finally:
        BillingAccount.objects.filter(pk=account.pk).update(busy_until=None)

@api(['POST'])
def cancel_checkout(request):
    account = account_for(owner(request)); require_config(); body(request)
    with transaction.atomic():
        account = BillingAccount.objects.select_for_update().get(pk=account.pk)
        if account.busy_until and account.busy_until > timezone.now():
            raise APIError(409, 'checkout_busy', 'Checkout is still being prepared. Try again shortly.')
        if account.checkout_id and account.checkout_expires and account.checkout_expires > timezone.now():
            current = stripe_request('GET', 'checkout/sessions/' + provider_id(account.checkout_id, 'cs_'))
            if current.get('status') == 'complete':
                raise APIError(409, 'checkout_complete', 'This checkout has completed. Refresh your billing status.')
            if current.get('status') == 'open':
                stripe_request('POST', 'checkout/sessions/' + account.checkout_id + '/expire', {}, 'expire-' + account.checkout_id)
        elif not account.checkout_id and account.checkout_expires and account.checkout_expires > timezone.now():
            raise APIError(409, 'checkout_uncertain', 'Retry the same plan to recover this checkout before canceling it.')
        account.checkout_url = account.checkout_id = ''; account.checkout_expires = None; account.save()
    return JsonResponse({'canceled': True})

@api(['POST'])
def refresh(request):
    user = owner(request); require_config(); body(request)
    throttle(request, 'billing-refresh', str(user.pk), limit=12, seconds=300)
    account = account_for(user)
    with transaction.atomic():
        account = BillingAccount.objects.select_for_update().get(pk=account.pk)
        sub_id = account.subscription_id
        if account.checkout_id:
            current = stripe_request('GET', 'checkout/sessions/' + provider_id(account.checkout_id, 'cs_'))
            if current.get('customer') != account.customer_id:
                raise APIError(400, 'billing_owner', 'Checkout ownership could not be verified.')
            if current.get('status') == 'complete':
                sub_id = current.get('subscription') or sub_id
                account.checkout_url = ''; account.checkout_expires = None
                account.save()
        if sub_id:
            sync_subscription(account, stripe_request('GET', 'subscriptions/' + provider_id(sub_id, 'sub_')))
    return JsonResponse(serialize(account))

@api(['POST'])
def portal(request):
    user = owner(request); require_config(); body(request)
    throttle(request, 'billing-portal', str(user.pk), limit=10, seconds=300)
    account = account_for(user)
    if not account.customer_id or not account.subscription_id:
        raise APIError(409, 'no_subscription', 'Complete a subscription checkout before opening billing management.')
    result = stripe_request('POST', 'billing_portal/sessions', {'customer': account.customer_id, 'return_url': settings.APP_ORIGIN + '/dashboard.html#settings/billing'})
    return JsonResponse({'url': stripe_url(result.get('url'), {'billing.stripe.com'})})

@api(['GET'])
def invoices(request):
    user = owner(request); account = account_for(user)
    if not account.customer_id or not configuration()['configured']:
        return JsonResponse({'invoices': []})
    throttle(request, 'billing-invoices', str(user.pk), limit=20, seconds=300)
    result = stripe_request('GET', 'invoices', {'customer': account.customer_id, 'limit': '12'})
    rows = []
    for item in result.get('data', []):
        if item.get('customer') != account.customer_id:
            continue
        link = item.get('hosted_invoice_url')
        rows.append({'number': item.get('number') or item['id'], 'status': item.get('status'), 'amount': item.get('total', 0), 'currency': item.get('currency'), 'created': item.get('created'), 'url': stripe_url(link, {'invoice.stripe.com'}) if link else None})
    return JsonResponse({'invoices': rows})

@csrf_exempt
@api(['POST'])
def webhook(request):
    require_config()
    event = verify_event(request.body, request.headers.get('Stripe-Signature', ''))
    if BillingEvent.objects.filter(event_id=event['id']).exists():
        return JsonResponse({'received': True})
    kind = event.get('type', '')
    obj = event.get('data', {}).get('object', {})
    customer = obj.get('customer')
    account = BillingAccount.objects.filter(customer_id=customer, mode=settings.BILLING_MODE).first() if isinstance(customer, str) and customer else None
    allowed = kind.startswith('customer.subscription.') or kind in ('checkout.session.completed', 'checkout.session.async_payment_succeeded', 'invoice.paid', 'invoice.payment_failed')
    if not account or not allowed:
        return JsonResponse({'received': True})
    with transaction.atomic():
        account = BillingAccount.objects.select_for_update().get(pk=account.pk)
        if BillingEvent.objects.filter(event_id=event['id']).exists():
            return JsonResponse({'received': True})
        sub_id = obj.get('id') if kind.startswith('customer.subscription.') else obj.get('subscription') or ((obj.get('parent') or {}).get('subscription_details') or {}).get('subscription')
        if not sub_id:
            sub_id = account.subscription_id
        if sub_id:
            # Fetch canonical state under the account lock: delayed/replayed events cannot reinstate old access.
            sync_subscription(account, stripe_request('GET', 'subscriptions/' + provider_id(sub_id, 'sub_')))
        if kind.startswith('checkout.session.') and obj.get('id') == account.checkout_id:
            account.checkout_url = ''; account.checkout_expires = None; account.save()
        BillingEvent.objects.create(event_id=event['id'], mode=settings.BILLING_MODE, kind=kind)
    return JsonResponse({'received': True})
