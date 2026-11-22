import hashlib, hmac, json, time, uuid
from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, Client, override_settings
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from accounts.models import User, Project, PublishedAddress, PublishedSite, PublishedRelease
from accounts.views import APIError
from .models import Store, Product, Variant, Customer, CustomerToken, Order, PaymentEvent
from . import services as S, payments

TOKEN='store-test-private-publishing-token-123456789'
@override_settings(STORES_ENABLED=True,PRODUCTION=False,PUBLISHING_TOKEN=TOKEN,PUBLISHING_BASE_DOMAIN='localhost',STORE_STRIPE_MODE='test',STORE_STRIPE_KEY='sk_test_isolated',STORE_STRIPE_WEBHOOK_SECRET='whsec_isolated',EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class StoreTests(TestCase):
 def setUp(self):
  cache.clear();self.user=User.objects.create_user('owner@example.test','test-password-42',email_verified=True)
  self.other=User.objects.create_user('other@example.test','test-password-43',email_verified=True)
  self.store=self.make_store(self.user,'store-one');self.other_store=self.make_store(self.other,'store-two')
  self.product=Product.objects.create(store=self.store,name='Cotton shirt',active=True)
  self.variant=Variant.objects.create(product=self.product,sku='SHIRT-M',price=2500,stock=10)
  self.client.force_login(self.user)
 def make_store(self,user,slug):
  p=Project.objects.create(owner=user,project_id=slug,document={'title':'Test store','files':{'template.lock.json':json.dumps({'template':{'id':'fashion-store-1'}})}})
  site=PublishedSite.objects.create(owner=user,project=p,address=PublishedAddress.objects.create(slug=slug))
  r=PublishedRelease.objects.create(site=site,number=1,files={'index.html':{'body':'test'}},digest='a'*64,byte_size=4,project_version=1)
  site.active_release=r;site.save()
  return Store.objects.create(project=p,name='Test store',shipping_countries=['GB'],shipping_amount=500,tax_basis_points=1000,support_email='help@example.test',policies={k:'This is an owner supplied store policy.' for k in ('shipping','returns','privacy','terms')},stripe_account='acct_'+slug.replace('-',''),charges_enabled=True,accepting_orders=True)
 def public(self,action,data=None,store=None,client=None):
  s=store or self.store;c=client or self.client
  headers={'HTTP_X_PUBLISHING_TOKEN':TOKEN,'HTTP_X_STORE_HOST':s.project.project_id+'.localhost'}
  return c.get('/internal/store/'+action,**headers) if data is None else c.post('/internal/store/'+action,json.dumps(data),content_type='application/json',**headers)
 def owner(self,action,**extra):
  return self.client.post('/api/stores',json.dumps({'projectId':self.store.project.project_id,'action':action,**extra}),content_type='application/json',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk))
 def cart(self):return [{'variantId':str(self.variant.pk),'quantity':2}]
 def checkout(self,**extra):return {'items':self.cart(),'key':'k'*32,'access':'a'*64,'email':'buyer@example.test','acceptTerms':True,'address':{'name':'Test Buyer','line1':'1 Test Road','line2':'','city':'London','postalCode':'AB1 2CD','country':'GB'},**extra}
 def pending(self):
  with patch('stores.payments.request',return_value={'id':'cs_test_checkout','url':'https://checkout.stripe.com/c/pay/test'}):
   return S.checkout(self.store,self.checkout(),None)
 def session(self,order,status='paid',**extra):
  return {'id':order.checkout_id,'metadata':{'order':str(order.pk),'store':str(order.store_id)},'livemode':False,'currency':order.currency,'amount_total':order.total,'payment_status':status,'status':'complete' if status=='paid' else 'expired','payment_intent':'pi_test_order',**extra}
 def test_customer_signup_verify_login_reset_and_cross_store_isolation(self):
  browser=Client();r=self.public('signup',{'email':'buyer@example.test','password':'sample-password-42','name':'Buyer'},client=browser);self.assertEqual(r.status_code,200,r.content)
  c=Customer.objects.get();self.assertFalse(c.verified);self.assertNotEqual(c.password,'sample-password-42');self.assertEqual(User.objects.count(),2)
  token=mail.outbox[-1].body.split('token=')[1].split()[0];self.assertNotIn(token,CustomerToken.objects.first().digest)
  self.assertEqual(self.public('verify',{'token':token},store=self.other_store,client=browser).status_code,400)
  self.assertEqual(self.public('verify',{'token':token},client=browser).status_code,200)
  self.assertEqual(self.public('verify',{'token':token},client=browser).status_code,400)
  r=self.public('login',{'email':c.email,'password':'sample-password-42'},client=browser);self.assertEqual(r.status_code,200);self.assertTrue(r.cookies['draftmango_store']['httponly'])
  self.assertEqual(self.public('orders',client=browser).status_code,200);self.assertEqual(self.public('orders',store=self.other_store,client=browser).status_code,401)
  self.public('reset',{'email':c.email},client=browser);self.assertIn('page=store-reset-confirm',mail.outbox[-1].body)
  reset=mail.outbox[-1].body.split('token=')[1].split()[0]
  self.assertEqual(self.public('reset-confirm',{'token':reset,'password':'new-password-unique-81'},client=browser).status_code,200)
  self.assertEqual(self.public('orders',client=browser).status_code,401)
  self.assertEqual(self.public('reset-confirm',{'token':reset,'password':'new-password-unique-81'},client=browser).status_code,400)
 def test_unverified_and_expired_tokens_cannot_log_in(self):
  c=Customer.objects.create(store=self.store,email='b@example.test',password=make_password('sample-password-42'))
  self.assertEqual(self.public('login',{'email':c.email,'password':'sample-password-42'}).status_code,403)
  token=S.issue_token(c,'verify');CustomerToken.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
  self.assertEqual(self.public('verify',{'token':token}).status_code,400)
 def test_private_token_and_published_tenant_are_required(self):
  self.assertEqual(self.client.get('/internal/store/catalog').status_code,404)
  site=self.store.project.publishedsite;site.active_release=None;site.save()
  self.assertEqual(self.public('catalog').status_code,404)
 def test_customer_price_and_other_store_product_cannot_control_quote(self):
  r=self.public('quote',{'items':[dict(self.cart()[0],price=1)]});self.assertEqual(r.status_code,200);self.assertEqual(r.json()['total'],6050)
  p=Product.objects.create(store=self.other_store,name='Private',active=True);v=Variant.objects.create(product=p,sku='P',price=1,stock=5)
  self.assertEqual(self.public('quote',{'items':[{'variantId':str(v.pk),'quantity':1}]}).status_code,409)
 def test_checkout_is_idempotent_and_reserves_authoritative_stock_once(self):
  with patch('stores.payments.request',return_value={'id':'cs_test_checkout','url':'https://checkout.stripe.com/c/pay/test'}) as call:
   first=S.checkout(self.store,self.checkout(total=1,currency='gbp',account='acct_evil'),None)
   again=S.checkout(self.store,self.checkout(),None)
   self.assertEqual(first.pk,again.pk);self.assertEqual(call.call_count,1)
   self.assertEqual(first.total,6050);self.assertEqual(first.currency,'usd');self.assertEqual(call.call_args.kwargs['account'],self.store.stripe_account)
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,8);self.assertEqual(Order.objects.count(),1)
  with self.assertRaises(APIError):S.checkout(self.store,self.checkout(email='changed@example.test'),None)
 def test_low_stock_and_closed_store_do_not_create_orders(self):
  self.variant.stock=1;self.variant.save()
  with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  self.assertEqual(Order.objects.count(),0)
  self.store.accepting_orders=False;self.store.save()
  with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
 def test_ambiguous_provider_error_keeps_stock_until_recovered(self):
  with patch('stores.payments.request',side_effect=APIError(502,'store_payment_provider','timeout')):
   with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,8)
  with patch('stores.payments.request',return_value={'id':'cs_test_recovered','url':'https://checkout.stripe.com/c/pay/recovered'}):
   o=S.checkout(self.store,self.checkout(),None)
  self.assertEqual(o.checkout_id,'cs_test_recovered');self.assertEqual(Order.objects.count(),1)
 def test_definitive_provider_rejection_restores_stock_once(self):
  with patch('stores.payments.request',side_effect=APIError(502,'store_payment_rejected','rejected')):
   with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,10);self.assertEqual(Order.objects.get().status,'expired')
 def test_payment_verification_and_expiry_are_idempotent(self):
  o=self.pending()
  with patch('stores.payments.request',return_value=self.session(o,'unpaid')):
   S.reconcile(o);S.reconcile(o)
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,10);o.refresh_from_db();self.assertEqual(o.status,'expired')
 def test_unverified_amount_cannot_mark_order_paid(self):
  o=self.pending()
  with patch('stores.payments.request',return_value=self.session(o,amount_total=1)):
   with self.assertRaises(APIError):S.reconcile(o)
  o.refresh_from_db();self.assertEqual(o.status,'pending')
 def test_webhook_signature_account_amount_and_replay(self):
  o=self.pending();event={'id':'evt_test_paid','type':'checkout.session.completed','account':o.payment_account,'livemode':False,'data':{'object':self.session(o)}}
  def send(event,signature=None):
   raw=json.dumps(event).encode();ts=str(int(time.time()));sig=hmac.new(b'whsec_isolated',ts.encode()+b'.'+raw,hashlib.sha256).hexdigest()
   return self.client.post('/api/stores/webhook',raw,content_type='application/json',HTTP_STRIPE_SIGNATURE=signature or f't={ts},v1={sig}')
  self.assertEqual(send(event,'t=1,v1=wrong').status_code,400)
  wrong={**event,'account':'acct_other'};self.assertEqual(send(wrong).status_code,400)
  with patch('stores.payments.request',return_value=self.session(o)) as provider:
   self.assertEqual(send(event).status_code,200);self.assertEqual(send(event).status_code,200);self.assertEqual(provider.call_count,1)
  o.refresh_from_db();self.assertEqual(o.status,'paid');self.assertEqual(PaymentEvent.objects.count(),1)
  S.receipt(o);S.receipt(o);self.assertEqual(len(mail.outbox),1)
 def test_guest_order_requires_unpredictable_access_secret(self):
  o=self.pending()
  self.assertEqual(self.public('order',{'id':str(o.pk),'access':'guess'}).status_code,404)
  with patch('stores.payments.request',return_value=self.session(o)):
   r=self.public('order',{'id':str(o.pk),'access':'a'*64});self.assertEqual(r.status_code,200)
   self.assertNotIn('address',r.json()['order']);self.assertNotIn('email',r.json()['order'])
  self.assertEqual(self.public('order',{'id':str(o.pk),'access':'a'*64},store=self.other_store).status_code,404)
 def test_owner_management_denies_other_account_and_csrf(self):
  self.client.force_login(self.other)
  r=self.client.get('/api/stores',{'projectId':self.store.project.project_id},HTTP_X_DRAFTMANGO_ACCOUNT=str(self.other.pk));self.assertEqual(r.status_code,404)
  c=Client(enforce_csrf_checks=True);c.force_login(self.user)
  self.assertEqual(c.post('/api/stores','{}',content_type='application/json',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk)).status_code,403)
 def test_owner_product_edit_archive_and_inventory_validation(self):
  payload={'id':str(self.product.pk),'name':'Updated shirt','description':'Cotton','category':'Shirts','image':'https://example.test/shirt.jpg','active':False,'variants':[{'id':str(self.variant.pk),'sku':'SHIRT-M','label':'M','price':3200,'stock':20}]}
  r=self.owner('product',product=payload);self.assertEqual(r.status_code,200,r.content)
  self.product.refresh_from_db();self.assertFalse(self.product.active);self.assertEqual(self.public('catalog').json()['products'],[])
  payload['variants'][0]['stock']=-1;self.assertEqual(self.owner('product',product=payload).status_code,400)
 def test_unpaid_order_cannot_be_fulfilled_and_refund_uses_owner_account(self):
  o=self.pending();self.assertEqual(self.owner('fulfil',orderId=str(o.pk)).status_code,409)
  o.status='paid';o.payment_id='pi_test_paid';o.save()
  r=self.owner('fulfil',orderId=str(o.pk),trackingUrl='https://example.test/tracking');self.assertEqual(r.status_code,200)
  with patch('stores.payments.request',return_value={'status':'succeeded'}) as provider:
   self.assertEqual(self.owner('refund',orderId=str(o.pk)).status_code,200)
   self.assertEqual(self.owner('refund',orderId=str(o.pk)).status_code,200);self.assertEqual(provider.call_count,1)
   self.assertEqual(provider.call_args.kwargs['account'],o.payment_account)
 def test_settings_cannot_open_store_without_policies_or_provider(self):
  r=self.owner('settings',settings={'policies':{},'acceptingOrders':True});self.assertEqual(r.status_code,409)
  with override_settings(STORE_STRIPE_KEY=''):
   self.assertEqual(self.owner('settings',settings={'acceptingOrders':True}).status_code,409)
 def test_customer_disable_revokes_sessions_and_enquiries_are_scoped(self):
  c=Customer.objects.create(store=self.store,email='b@example.test',password='!',verified=True)
  token=S.issue_token(c,'session');self.assertIsNotNone(S.session_customer(self.store,token))
  self.assertEqual(self.owner('customer-access',customerId=str(c.pk),active=False).status_code,200)
  self.assertIsNone(S.session_customer(self.store,token))
  self.assertEqual(self.public('contact',{'email':'b@example.test','message':'When will this arrive?'}).status_code,200)
  self.assertEqual(self.store.enquiries.count(),1);self.assertEqual(self.other_store.enquiries.count(),0)

 def test_rejection_after_timeout_cannot_release_potentially_paid_stock(self):
  with patch('stores.payments.request',side_effect=APIError(502,'store_payment_provider','timeout')):
   with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  with patch('stores.payments.request',side_effect=APIError(502,'store_payment_rejected','permissions changed')):
   with self.assertRaises(APIError) as error:S.checkout(self.store,self.checkout(),None)
   self.assertEqual(error.exception.code,'store_payment_provider')
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,8)
  self.assertEqual(Order.objects.get().status,'pending')
 def test_recovered_expired_checkout_without_url_retains_reference_for_reconciliation(self):
  with patch('stores.payments.request',side_effect=APIError(502,'store_payment_provider','timeout')):
   with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  with patch('stores.payments.request',return_value={'id':'cs_test_recovered','url':None}):
   with self.assertRaises(APIError):S.checkout(self.store,self.checkout(),None)
  o=Order.objects.get();self.assertEqual(o.checkout_id,'cs_test_recovered')
  with patch('stores.payments.request',return_value=self.session(o,'unpaid')):S.reconcile(o)
  self.variant.refresh_from_db();self.assertEqual(self.variant.stock,10)
 def test_external_refund_before_checkout_notification_is_reconciled_once(self):
  o=self.pending();charge={'id':'ch_test_refund','payment_intent':'pi_test_order','refunded':True,'amount_refunded':o.total,'currency':o.currency,'livemode':False}
  event={'id':'evt_test_refund','type':'charge.refunded','account':o.payment_account,'livemode':False,'data':{'object':charge}}
  intent={'id':'pi_test_order','metadata':{'order':str(o.pk),'store':str(o.store_id)},'livemode':False}
  raw=json.dumps(event).encode();ts=str(int(time.time()));sig=hmac.new(b'whsec_isolated',ts.encode()+b'.'+raw,hashlib.sha256).hexdigest()
  with patch('stores.payments.request',side_effect=[intent,self.session(o),charge]) as provider:
   for _ in range(2):self.assertEqual(self.client.post('/api/stores/webhook',raw,content_type='application/json',HTTP_STRIPE_SIGNATURE=f't={ts},v1={sig}').status_code,200)
   self.assertEqual(provider.call_count,3)
  o.refresh_from_db();self.assertEqual(o.status,'refunded');self.variant.refresh_from_db();self.assertEqual(self.variant.stock,8)
  with patch('stores.payments.request',return_value=self.session(o)):S.reconcile(o)
  o.refresh_from_db();self.assertEqual(o.status,'refunded')
 def test_account_deletion_preserves_store_orders_and_owner_session(self):
  self.pending()
  r=self.client.post('/api/accounts/delete',json.dumps({'password':'test-password-42','confirmation':'DELETE MY ACCOUNT'}),content_type='application/json',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk))
  self.assertEqual(r.status_code,409,r.content);self.assertEqual(r.json()['error']['code'],'store_records')
  self.assertTrue(User.objects.filter(pk=self.user.pk).exists());self.assertEqual(Order.objects.count(),1)
  self.assertEqual(self.client.get('/api/stores',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk)).status_code,200)
