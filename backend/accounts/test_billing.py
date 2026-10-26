import hashlib
import hmac
import json
import time
from datetime import timedelta
from unittest.mock import patch
from django.conf import settings
from django.test import Client, TestCase, override_settings
from django.core.cache import cache
from django.utils import timezone
from . import tests as account_helpers
from .models import BillingAccount, BillingEvent, User
from .billing import entitlements, stripe_url
from .views import APIError

PRICES={'basic:monthly':'price_basic_month','basic:yearly':'price_basic_year','pro:monthly':'price_pro_month','pro:yearly':'price_pro_year'}

@override_settings(BILLING_MODE='test',STRIPE_SECRET_KEY='sk_test_fake',STRIPE_WEBHOOK_SECRET='whsec_fake',STRIPE_PRICES=PRICES,STRIPE_AUTOMATIC_TAX=False,PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'],EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class BillingTests(TestCase):
    secret=account_helpers.AccountTests.secret
    csrf=account_helpers.AccountTests.csrf
    send=account_helpers.AccountTests.send
    signup=account_helpers.AccountTests.signup
    def setUp(self):
        cache.clear();self.client=Client(enforce_csrf_checks=True);self.csrf(self.client);self.signup()
        self.user=User.objects.get(pk=self.client.owner)

    def status(self,client=None):
        client=client or self.client
        return client.get('/api/billing/status',HTTP_X_DRAFTMANGO_ACCOUNT=client.owner)

    def price(self,plan='basic',cadence='monthly',**changes):
        return {'id':PRICES[plan+':'+cadence],'currency':'usd','unit_amount':{'basic:monthly':1500,'basic:yearly':12000,'pro:monthly':3900,'pro:yearly':36000}[plan+':'+cadence],'recurring':{'interval':'year' if cadence=='yearly' else 'month','interval_count':1},'active':True,'livemode':False,**changes}

    def subscription(self,account,**changes):
        return {'id':'sub_example','customer':account.customer_id,'livemode':False,'status':'active','cancel_at_period_end':False,'items':{'data':[{'price':self.price(),'quantity':1,'current_period_end':int((timezone.now()+timedelta(days=30)).timestamp())}]},**changes}

    def account(self,**changes):
        return BillingAccount.objects.create(owner=self.user,mode='test',customer_id='cus_example',**changes)

    def event(self,kind='checkout.session.completed',obj=None,event_id='evt_example',stamp=None,signature=None,live=False):
        raw=json.dumps({'id':event_id,'type':kind,'livemode':live,'data':{'object':obj or {'id':'cs_example','customer':'cus_example','subscription':'sub_example'}}}).encode()
        stamp=stamp or int(time.time())
        signed=hmac.new(settings.STRIPE_WEBHOOK_SECRET.encode(),str(stamp).encode()+b'.'+raw,hashlib.sha256).hexdigest()
        return self.client.post('/api/billing/webhook',raw,content_type='application/json',HTTP_STRIPE_SIGNATURE=signature or f't={stamp},v1={signed}')

    def test_billing_requires_account_identity_and_csrf(self):
        anonymous=Client(enforce_csrf_checks=True)
        self.assertEqual(anonymous.get('/api/billing/status').status_code,401)
        self.assertEqual(self.client.get('/api/billing/status',HTTP_X_DRAFTMANGO_ACCOUNT='other').status_code,401)
        self.assertEqual(self.client.post('/api/billing/checkout','{}',content_type='application/json').status_code,403)

    def test_default_status_is_free_and_never_exposes_keys_or_provider_ids(self):
        result=self.status().json();self.assertEqual(result['entitlements']['plan'],'free')
        self.assertFalse(result['entitlements']['customDomains']);self.assertTrue(result['configured'])
        self.assertNotIn('sk_test',json.dumps(result));self.assertNotIn('whsec',json.dumps(result))
        with override_settings(STRIPE_SECRET_KEY='sk_live_wrong_environment'):
            self.assertFalse(self.status().json()['configured'])
            self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).status_code,503)

    def test_checkout_uses_server_price_identity_and_return_urls_without_granting_access(self):
        calls=[]
        def provider(method,path,fields=None,key=None):
            calls.append((method,path,fields,key))
            if path.startswith('prices/'):return self.price()
            if path=='customers':return {'id':'cus_example'}
            return {'id':'cs_example','url':'https://checkout.stripe.com/c/pay/cs_example','expires_at':int(time.time())+86400}
        with patch('accounts.billing_views.stripe_request',side_effect=provider):
            result=self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly','price':'price_attacker','amount':1,'customer':'cus_other','success_url':'https://evil.test'})
            self.assertEqual(result.status_code,200)
            self.assertEqual(calls[-1][2]['line_items[0][price]'],PRICES['basic:monthly'])
            self.assertEqual(calls[-1][2]['customer'],'cus_example')
            self.assertTrue(calls[-1][2]['success_url'].startswith(settings.APP_ORIGIN))
            first_key=calls[-1][3]
            self.assertTrue(first_key.startswith('draftmango-checkout-'))
            self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).json(),result.json())
            self.assertEqual(len(calls),3)
        self.assertEqual(self.status().json()['entitlements']['plan'],'free')

    def test_unknown_plans_and_wrong_provider_price_are_rejected(self):
        self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'admin','cadence':'monthly'}).status_code,400)
        with patch('accounts.billing_views.stripe_request',return_value=self.price(unit_amount=1)) as provider:
            result=self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'})
            self.assertEqual(result.status_code,503);self.assertEqual(provider.call_count,1)

    def test_lost_checkout_response_reuses_persisted_idempotency_key(self):
        keys=[]
        def provider(method,path,fields=None,key=None):
            if path.startswith('prices/'):return self.price()
            if path=='customers':return {'id':'cus_example'}
            keys.append(key)
            if len(keys)==1:raise APIError(502,'network','Try again')
            return {'id':'cs_example','url':'https://checkout.stripe.com/c/pay/cs_example','expires_at':int(time.time())+86400}
        with patch('accounts.billing_views.stripe_request',side_effect=provider):
            self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).status_code,502)
            self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'pro','cadence':'monthly'}).status_code,409)
            self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).status_code,200)
        self.assertEqual(keys[0],keys[1])

    def test_existing_subscriptions_and_in_flight_checkouts_cannot_double_subscribe(self):
        account=self.account(subscription_id='sub_example',status='past_due')
        self.assertFalse(self.status().json()['canSubscribe'])
        self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).status_code,409)
        account.status='canceled';account.save();self.assertTrue(self.status().json()['canSubscribe'])
        account.subscription_id='';account.busy_until=timezone.now()+timedelta(minutes=1);account.save()
        self.assertEqual(self.send(self.client,'/api/billing/checkout',{'plan':'basic','cadence':'monthly'}).status_code,409)

    def test_signed_webhook_confirms_plan_once_and_stale_payload_fetches_current_state(self):
        account=self.account()
        with patch('accounts.billing_views.stripe_request',return_value=self.subscription(account)) as provider:
            self.assertEqual(self.event().status_code,200);self.assertEqual(self.event().status_code,200)
            self.assertEqual(provider.call_count,1);self.assertEqual(BillingEvent.objects.count(),1)
        self.assertEqual(self.status().json()['entitlements']['plan'],'basic')
        with patch('accounts.billing_views.stripe_request',return_value=self.subscription(account,status='canceled')):
            result=self.event(kind='customer.subscription.updated',obj={'id':'sub_example','customer':'cus_example','status':'active'},event_id='evt_delayed')
            self.assertEqual(result.status_code,200)
        self.assertEqual(self.status().json()['entitlements']['plan'],'free')

    def test_bad_expired_and_wrong_mode_webhooks_cannot_change_access(self):
        self.account()
        with patch('accounts.billing_views.stripe_request') as provider:
            self.assertEqual(self.event(signature='t=1,v1=bad').status_code,400)
            self.assertEqual(self.event(stamp=int(time.time())-600).status_code,400)
            self.assertEqual(self.event(live=True).status_code,400)
            provider.assert_not_called()
        self.assertEqual(BillingEvent.objects.count(),0)

    def test_foreign_customer_and_unknown_price_never_grant_paid_access(self):
        account=self.account()
        with patch('accounts.billing_views.stripe_request',return_value=self.subscription(account,customer='cus_other')):
            self.assertEqual(self.event().status_code,400)
        unknown=self.subscription(account);unknown['items']['data'][0]['price']['id']='price_unknown'
        with patch('accounts.billing_views.stripe_request',return_value=unknown):
            self.assertEqual(self.event().status_code,200)
        self.assertEqual(self.status().json()['entitlements']['plan'],'free')

    def test_refresh_checks_stripe_and_does_not_trust_success_url(self):
        account=self.account(checkout_id='cs_example',checkout_url='https://checkout.stripe.com/c/pay/cs_example',checkout_expires=timezone.now()+timedelta(hours=1))
        self.assertEqual(self.status().json()['entitlements']['plan'],'free')
        with patch('accounts.billing_views.stripe_request',side_effect=[{'customer':'cus_example','status':'complete','subscription':'sub_example'},self.subscription(account)]):
            result=self.send(self.client,'/api/billing/refresh',{})
        self.assertEqual(result.json()['entitlements']['plan'],'basic');self.assertIsNone(result.json()['pendingCheckout'])

    def test_expired_and_past_due_subscriptions_do_not_grant_domains(self):
        account=self.account(plan='pro',status='active',period_end=timezone.now()-timedelta(seconds=1))
        self.assertFalse(entitlements(account)['customDomains'])
        account.period_end=timezone.now()+timedelta(days=30);account.status='past_due'
        self.assertFalse(entitlements(account)['customDomains'])

    def test_portal_uses_own_customer_and_invoices_cannot_leak_other_customers(self):
        self.account(subscription_id='sub_example')
        with patch('accounts.billing_views.stripe_request',return_value={'url':'https://billing.stripe.com/p/session/example'}) as provider:
            self.assertEqual(self.send(self.client,'/api/billing/portal',{'customer':'cus_other'}).status_code,200)
            self.assertEqual(provider.call_args.args[2]['customer'],'cus_example')
        with patch('accounts.billing_views.stripe_request',return_value={'data':[{'id':'in_foreign','customer':'cus_other'},{'id':'in_own','customer':'cus_example','hosted_invoice_url':'https://invoice.stripe.com/i/example'}]}):
            result=self.client.get('/api/billing/invoices',HTTP_X_DRAFTMANGO_ACCOUNT=self.client.owner)
            self.assertEqual(len(result.json()['invoices']),1);self.assertEqual(result.json()['invoices'][0]['number'],'in_own')

    def test_test_subscription_is_not_a_live_subscription(self):
        self.account(subscription_id='sub_example',plan='pro',status='active',period_end=timezone.now()+timedelta(days=30))
        self.assertEqual(self.status().json()['entitlements']['plan'],'pro')
        with override_settings(BILLING_MODE='live',STRIPE_SECRET_KEY='sk_live_fake'):
            self.assertEqual(self.status().json()['entitlements']['plan'],'free')

    def test_delete_cannot_leave_a_recurring_subscription_behind(self):
        self.account(subscription_id='sub_example',status='active')
        result=self.send(self.client,'/api/accounts/delete',{'password':self.secret,'confirmation':'DELETE MY ACCOUNT'})
        self.assertEqual(result.status_code,409);self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_pending_checkout_cancellation_expires_provider_session(self):
        self.account(checkout_id='cs_example',checkout_url='https://checkout.stripe.com/c/pay/cs_example',checkout_expires=timezone.now()+timedelta(hours=1))
        with patch('accounts.billing_views.stripe_request',side_effect=[{'status':'open'}, {'status':'expired'}]) as provider:
            result=self.send(self.client,'/api/billing/cancel-checkout',{})
            self.assertEqual(result.status_code,200)
            self.assertEqual(provider.call_args.args[1],'checkout/sessions/cs_example/expire')
        self.assertIsNone(self.status().json()['pendingCheckout'])

    def test_completed_checkout_cannot_be_cleared_before_reconciliation(self):
        self.account(checkout_id='cs_example',checkout_expires=timezone.now()+timedelta(hours=1))
        with patch('accounts.billing_views.stripe_request',return_value={'status':'complete'}):
            self.assertEqual(self.send(self.client,'/api/billing/cancel-checkout',{}).status_code,409)

    def test_pending_checkout_blocks_account_deletion(self):
        self.account(checkout_expires=timezone.now()+timedelta(hours=1))
        self.assertEqual(self.send(self.client,'/api/accounts/delete',{'password':self.secret,'confirmation':'DELETE MY ACCOUNT'}).status_code,409)

    def test_provider_failure_does_not_acknowledge_webhook(self):
        self.account()
        with patch('accounts.billing_views.stripe_request',side_effect=APIError(502,'provider','Unavailable')):
            self.assertEqual(self.event().status_code,502)
        self.assertEqual(BillingEvent.objects.count(),0)

    def test_another_account_cannot_read_subscription_or_invoices(self):
        self.account(subscription_id='sub_example',plan='pro',status='active',period_end=timezone.now()+timedelta(days=30))
        other=Client(enforce_csrf_checks=True);self.csrf(other);self.signup(other,email='other@example.test')
        self.assertEqual(self.status(other).json()['entitlements']['plan'],'free')
        with patch('accounts.billing_views.stripe_request') as provider:
            result=other.get('/api/billing/invoices',HTTP_X_DRAFTMANGO_ACCOUNT=other.owner)
            self.assertEqual(result.json()['invoices'],[]);provider.assert_not_called()

    def test_redirects_cannot_escape_stripe(self):
        for url in ['https://checkout.stripe.com.evil.test/x','http://checkout.stripe.com/x','https://evil@checkout.stripe.com/x','javascript:alert(1)']:
            with self.assertRaises(APIError):stripe_url(url,{'checkout.stripe.com'})
