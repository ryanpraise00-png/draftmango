"""Create an owner-only draft store from the saved, confirmed builder plan."""
from django.conf import settings
from django.db import transaction
from accounts.models import Project
from accounts.views import APIError
from .models import Store, Product, Variant
from . import services as S
import json
import re
import uuid


def facts(value):
    if value is None:
        value = {}
    if not isinstance(value, dict):
        raise APIError(400, 'store_brief', 'Review the store details in your plan.')
    result = {}
    fulfilment = value.get('fulfilment')
    if fulfilment not in (None, 'physical'):
        raise APIError(409, 'store_workflow', 'This workflow supports physical goods. Your selected design is unchanged; digital delivery needs a separate workflow.')
    result['fulfilment'] = fulfilment
    for key in ('currency', 'country', 'supportEmail'):
        result[key] = value.get(key)
    if result['currency'] not in (None, 'usd', 'gbp', 'eur', 'cad', 'aud'):
        raise APIError(400, 'currency', 'Choose a supported store currency.')
    if result['country'] is not None and (not isinstance(result['country'], str) or not re.fullmatch('[A-Z]{2}', result['country'])):
        raise APIError(400, 'country', 'Use a two-letter business country code.')
    if result['supportEmail'] is not None:
        result['supportEmail'] = S.email(result['supportEmail'])
    countries = value.get('shippingCountries', [])
    if not isinstance(countries, list) or len(countries) > 100 or any(not isinstance(c, str) or not re.fullmatch('[A-Z]{2}', c) for c in countries):
        raise APIError(400, 'countries', 'Review the delivery countries.')
    result['shippingCountries'] = sorted(set(countries))
    for key, maximum in [('shippingAmount', 100000), ('taxBasisPoints', 10000)]:
        result[key] = S.number(value[key], maximum) if value.get(key) is not None else None
    products = value.get('products', [])
    if not isinstance(products, list) or len(products) > 20:
        raise APIError(400, 'products', 'Review up to 20 initial products; add the rest in store management.')
    result['products'] = []
    for product in products:
        if not isinstance(product, dict):
            raise APIError(400, 'product', 'Review the initial products.')
        p = {key: S.text(product.get(key, ''), maximum, key == 'name') for key, maximum in [('name', 160), ('description', 8000), ('category', 80)]}
        p['image'] = S.https_url(product.get('image', ''))
        variants = product.get('variants', [])
        if not isinstance(variants, list) or len(variants) > 20:
            raise APIError(400, 'variants', 'Review the product options.')
        p['variants'] = []
        skus = set()
        for i, v in enumerate(variants):
            if not isinstance(v, dict):
                raise APIError(400, 'variants', 'Review each product option.')
            label = S.text(v.get('label', ''), 100, True)
            sku = S.text(v.get('sku', ''), 80) or 'DRAFT-' + str(i + 1)
            if sku in skus:
                raise APIError(400, 'sku', 'Each product option needs its own SKU.')
            skus.add(sku)
            price = S.number(v['price']) if v.get('price') is not None else None
            stock = S.number(v['stock'], 1000000) if v.get('stock') is not None else None
            if price is not None and price < 50:
                raise APIError(400, 'price', 'The minimum option price is 0.50 in the store currency.')
            p['variants'].append({'label': label, 'sku': sku, 'price': price, 'stock': stock, 'active': True})
        result['products'].append(p)
    return result


def prepare(user, project, version):
    if type(version) is not int or version < 1:
        raise APIError(409, 'store_sync', 'Save the confirmed build to your account before preparing the store.')
    with transaction.atomic():
        project = Project.objects.select_for_update().get(pk=project.pk, owner=user)
        if project.version != version:
            raise APIError(409, 'store_sync', 'This project changed while saving. Reload its latest version before preparing the store.')
        document = project.document if isinstance(project.document, dict) else {}
        workspace = document.get('workspace')
        state = workspace.get('builder') if isinstance(workspace, dict) else None
        state = state if isinstance(state, dict) else {}
        plan = state.get('plan', {})
        try:
            manifest = json.loads(document.get('files', {}).get('template.lock.json', '{}'))
            adapter = json.loads(document.get('files', {}).get('storefront.json', '{}'))
        except (ValueError, TypeError, AttributeError):
            raise APIError(409, 'store_workflow', 'Complete the template build before preparing its store.')
        if not isinstance(manifest, dict) or not isinstance(manifest.get('template'), dict) or not isinstance(adapter, dict):
            raise APIError(409, 'store_workflow', 'Complete the template build before preparing its store.')
        if not isinstance(plan, dict) or state.get('phase') != 'built' or plan.get('kind') != 'store' or plan.get('templateId') != 'fashion-store-1' or manifest.get('template', {}).get('id') != 'fashion-store-1' or adapter.get('adapter') not in ('fashion-store-v1', 'fashion-store-v2') or adapter.get('template') != 'fashion-store-1':
            raise APIError(409, 'store_workflow', 'Complete the supported store build first. Your selected design has not changed.')
        existing = Store.objects.filter(project=project).first()
        if existing:
            return existing, False
        if plan.get('store') is not None and (not isinstance(plan['store'], dict) or plan['store'].get('fulfilment') != 'physical'):
            raise APIError(409, 'store_workflow', 'Confirm physical goods in the store plan before preparing this workflow.')
        values = facts(plan.get('store'))
        missing = [k for k in ('currency', 'country', 'supportEmail', 'shippingAmount', 'taxBasisPoints', 'shippingCountries') if values[k] is None or values[k] == []]
        store = Store.objects.create(project=project, name=S.text(plan.get('name'), 2000, True)[:120],
            currency=values['currency'] or 'usd', country=values['country'] or 'US', support_email=values['supportEmail'] or '',
            shipping_countries=values['shippingCountries'], shipping_amount=values['shippingAmount'] or 0,
            tax_basis_points=values['taxBasisPoints'] or 0, payment_mode=settings.STORE_STRIPE_MODE,
            accepting_orders=False, builder_setup={'sourceVersion': version, 'missingSettings': missing, 'pendingProducts': [], 'createdProducts': 0})
        pending = []
        created = 0
        for item in values['products']:
            if not values['currency'] or not item['variants'] or any(v['price'] is None or v['stock'] is None for v in item['variants']):
                pending.append({**item, 'briefId': str(uuid.uuid4())})
                continue
            product = Product.objects.create(store=store, **{k: item[k] for k in ('name', 'description', 'category', 'image')}, active=False)
            for variant in item['variants']:
                Variant.objects.create(product=product, **variant)
            created += 1
        store.builder_setup.update(pendingProducts=pending, createdProducts=created)
        store.save(update_fields=['builder_setup'])
        return store, True


def readiness(store):
    missing = store.builder_setup.get('missingSettings', [])
    try:
        url = S.origin(store)
    except APIError:
        url = ''
    return {'url': url, 'productCount': store.products.count(), 'draftProducts': store.products.filter(active=False).count(),
        'pendingProducts': len(store.builder_setup.get('pendingProducts', [])),
        'steps': [
            {'label': 'Review products and stock', 'complete': store.products.filter(active=True, variants__active=True, variants__price__gte=50).exists() and not store.builder_setup.get('pendingProducts'), 'section': 'products'},
            {'label': 'Confirm business, shipping and tax', 'complete': not missing and bool(store.support_email and store.shipping_countries), 'section': 'settings'},
            {'label': 'Complete store policies', 'complete': all(len(store.policies.get(k, '')) >= 20 for k in ('shipping', 'returns', 'privacy', 'terms')), 'section': 'settings'},
            {'label': 'Publish the website', 'complete': bool(url), 'section': 'publish'},
            {'label': 'Connect the ownerâ€™s payments', 'complete': bool(store.stripe_account and store.charges_enabled and store.payment_mode == settings.STORE_STRIPE_MODE), 'section': 'settings'},
            {'label': 'Open checkout', 'complete': store.accepting_orders, 'section': 'settings'}]}
