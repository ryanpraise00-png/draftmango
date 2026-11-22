import copy
import json
from django.test import TestCase, override_settings
from django.core.cache import cache
from accounts.models import User, Project
from .models import Store, Product


@override_settings(STORES_ENABLED=True, PRODUCTION=False, STORE_STRIPE_MODE='test', STORE_STRIPE_KEY='', STORE_STRIPE_WEBHOOK_SECRET='')
class BuilderStoreTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('builder@example.test', 'test-password-42', email_verified=True)
        self.other = User.objects.create_user('other@example.test', 'test-password-43', email_verified=True)
        self.client.force_login(self.user)
        self.facts = {'fulfilment': 'physical', 'currency': 'gbp', 'country': 'GB', 'supportEmail': 'help@example.test', 'shippingCountries': ['GB'], 'shippingAmount': 400, 'taxBasisPoints': 0,
            'products': [{'name': 'Cotton socks', 'description': 'Owner supplied description', 'category': 'Socks', 'image': '', 'variants': [{'label': 'Medium', 'sku': 'SOCK-M', 'price': 1500, 'stock': 12}]}]}
        self.document = {'title': 'Socks', 'workspace': {'builder': {'phase': 'built', 'plan': {'name': 'Socks studio', 'kind': 'store', 'templateId': 'fashion-store-1', 'store': self.facts}}}, 'files': {
            'template.lock.json': json.dumps({'template': {'id': 'fashion-store-1'}}), 'storefront.json': json.dumps({'schema': 1, 'template': 'fashion-store-1', 'adapter': 'fashion-store-v2'})}}
        self.project = Project.objects.create(owner=self.user, project_id='guided-store', document=self.document, version=7)

    def post(self, action='prepare', **extra):
        return self.client.post('/api/stores', json.dumps({'projectId': self.project.project_id, 'action': action, 'expectedVersion': 7, **extra}), content_type='application/json', HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk))

    def save_document(self):
        self.project.document = self.document
        self.project.save()

    def test_confirmed_build_prepares_once_without_publishing_or_opening_checkout(self):
        response = self.post(); self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['created']); s = Store.objects.get()
        self.assertEqual((s.name, s.currency, s.country, s.shipping_amount), ('Socks studio', 'gbp', 'GB', 400))
        self.assertFalse(s.accepting_orders); self.assertFalse(s.stripe_account)
        self.assertEqual(s.builder_setup['missingSettings'], [])
        product = s.products.get(); self.assertFalse(product.active)
        variant = product.variants.get(); self.assertEqual((variant.price, variant.stock), (1500, 12))
        variant.stock = 9; variant.save()
        retry = self.post(); self.assertEqual(retry.status_code, 200); self.assertFalse(retry.json()['created'])
        self.assertEqual(Store.objects.count(), 1); self.assertEqual(Product.objects.count(), 1)
        variant.refresh_from_db(); self.assertEqual(variant.stock, 9)
        self.assertFalse(any(step['complete'] for step in response.json()['readiness']['steps'] if step['section'] == 'publish'))

    def test_stale_foreign_unconfirmed_and_malformed_builds_are_rejected(self):
        self.assertEqual(self.post(expectedVersion=6).status_code, 409)
        foreign = Project.objects.create(owner=self.other, project_id='foreign-store', document=self.document)
        self.assertEqual(self.post(projectId=foreign.project_id).status_code, 404)
        original = copy.deepcopy(self.document)
        for mutate in [lambda d: d.update(workspace=[]), lambda d: d['workspace'].update(builder=[]), lambda d: d['workspace']['builder'].update(phase='review'), lambda d: d['workspace']['builder']['plan'].update(templateId='other'), lambda d: d['files'].update({'storefront.json': '[]'}), lambda d: d['workspace']['builder']['plan']['store'].update(fulfilment='digital'), lambda d: d['workspace']['builder']['plan']['store'].update(fulfilment=None)]:
            self.document = copy.deepcopy(original); mutate(self.document); self.save_document()
            response = self.post(); self.assertEqual(response.status_code, 409, response.content)
        self.assertFalse(Store.objects.exists())

    def test_unknowns_stay_pending_and_currency_is_confirmed_before_products(self):
        self.facts.update(currency=None, country=None, supportEmail=None, shippingCountries=[], shippingAmount=None, taxBasisPoints=None)
        self.facts['products'][0]['variants'][0].update(price=None, stock=None)
        self.save_document(); response = self.post(); self.assertEqual(response.status_code, 200, response.content)
        s = Store.objects.get(); self.assertFalse(s.products.exists())
        self.assertEqual(len(s.builder_setup['missingSettings']), 6)
        pending = s.builder_setup['pendingProducts'][0]; self.assertIsNone(pending['variants'][0]['price']); self.assertIsNone(pending['variants'][0]['stock'])
        product = {**pending, 'active': False, 'variants': [{'label': 'Medium', 'sku': 'SOCK-M', 'price': 1600, 'stock': 10}]}
        self.assertEqual(self.post('product', product=product).status_code, 409)
        settings = {'supportEmail': 'help@example.test', 'country': 'GB', 'currency': 'gbp', 'shippingCountries': ['GB'], 'shippingAmount': 300, 'taxBasisPoints': 0, 'acceptingOrders': False}
        response = self.post('settings', settings=settings); self.assertEqual(response.status_code, 200, response.content)
        s.refresh_from_db(); self.assertEqual(s.builder_setup['missingSettings'], [])
        # A stale review cannot create a product or remove another pending entry.
        response = self.post('product', product=product, briefProduct=0, briefId='stale'); self.assertEqual(response.status_code, 409); self.assertFalse(s.products.exists())
        response = self.post('product', product=product, briefProduct=0, briefId=pending['briefId']); self.assertEqual(response.status_code, 200, response.content)
        s.refresh_from_db(); self.assertEqual(s.builder_setup['pendingProducts'], []); self.assertEqual(s.products.get().variants.get().price, 1600)
        self.assertEqual(self.post('settings', settings={'acceptingOrders': True}).status_code, 409)

    def test_owner_preview_contains_draft_catalogue_but_no_customer_or_payment_credentials(self):
        self.post(); s = Store.objects.get(); s.stripe_account = 'acct_private_owner'; s.save()
        response = self.client.get('/api/stores', {'projectId': self.project.project_id, 'section': 'preview'}, HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk))
        self.assertEqual(response.status_code, 200); data = response.json()
        self.assertEqual(len(data['products']), 1); self.assertFalse(data['products'][0]['active']); self.assertIsNone(data['customer'])
        self.assertNotIn('acct_private_owner', response.content.decode()); self.assertNotIn('pendingProducts', data)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get('/api/stores', {'projectId': self.project.project_id, 'section': 'preview'}, HTTP_X_DRAFTMANGO_ACCOUNT=str(self.other.pk)).status_code, 404)

    def test_invalid_facts_roll_back_the_entire_setup(self):
        for change in [{'price': True}, {'stock': -1}, {'price': 49}]:
            self.facts['products'][0]['variants'][0].update(price=1500, stock=12)
            self.facts['products'][0]['variants'][0].update(change); self.save_document()
            self.assertEqual(self.post().status_code, 400); self.assertFalse(Store.objects.exists())
