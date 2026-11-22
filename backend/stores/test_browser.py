"""A real Django database + publisher boundary + Chromium store/owner workflow.
Payment provider and mail are isolated fixtures; no external charge or email occurs.
"""
import json, os, subprocess
from unittest.mock import patch
from django.conf import settings
from django.test import LiveServerTestCase, Client, override_settings
from django.contrib.auth.hashers import make_password
from django.core import mail
from accounts.models import User, Project, PublishedAddress, PublishedSite, PublishedRelease
from .models import Store, Product, Variant, Customer, Order

@override_settings(STATIC_URL="/static/",MEDIA_URL="/media/",STORES_ENABLED=True,PRODUCTION=False,PUBLISHING_TOKEN='store-browser-private-token-123456789',PUBLISHING_BASE_DOMAIN='localhost',STORE_STRIPE_MODE='test',STORE_STRIPE_KEY='sk_test_isolated',STORE_STRIPE_WEBHOOK_SECRET='whsec_isolated',EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class StoreBrowserTest(LiveServerTestCase):
 def test_customer_purchase_and_owner_management(self):
  user=User.objects.create_user('owner@example.test','test-password-42',email_verified=True)
  p=Project.objects.create(owner=user,project_id='browser-store',document={'title':'Studio store','files':{}})
  site=PublishedSite.objects.create(owner=user,project=p,address=PublishedAddress.objects.create(slug='browser-store'))
  release=PublishedRelease.objects.create(site=site,number=1,files={},digest='a'*64,byte_size=0,project_version=1);site.active_release=release;site.save()
  store=Store.objects.create(project=p,name='Studio store',currency='gbp',support_email='help@example.test',shipping_countries=['GB'],shipping_amount=400,policies={k:'Owner-supplied policy for the studio store. Please contact us with any questions.' for k in ['shipping','returns','privacy','terms']},accepting_orders=True,stripe_account='acct_browser',charges_enabled=True)
  product=Product.objects.create(store=store,name='Cotton overshirt',description='A soft cotton overshirt.',category='Shirts',image='https://draftmango.com/assets/coffee.jpg',active=True)
  variant=Variant.objects.create(product=product,label='Medium',sku='COT-M',price=3200,stock=8)
  Customer.objects.create(store=store,email='buyer@example.test',password=make_password('customer-password-42'),verified=True,name='Test buyer')
  owner=Client();owner.force_login(user);csrf=owner.get('/api/accounts/session').json()['csrfToken']
  def provider(method,route,fields=None,**kw):
   if route=='checkout/sessions' and method=='POST':return {'id':'cs_test_browser','url':'https://checkout.stripe.com/c/pay/browser-test'}
   if route=='checkout/sessions/cs_test_browser':
    order=Order.objects.get(checkout_id='cs_test_browser')
    return {'id':order.checkout_id,'metadata':{'order':str(order.pk),'store':str(store.pk)},'payment_status':'paid','status':'complete','payment_intent':'pi_browser','currency':order.currency,'amount_total':order.total,'livemode':False}
   raise AssertionError('Unexpected provider fixture request: '+route)
  payload={'port':self.server_thread.port,'owner':str(user.pk),'cookie':owner.cookies[settings.SESSION_COOKIE_NAME].value,'csrf':csrf,'csrfCookie':owner.cookies[settings.CSRF_COOKIE_NAME].value,'cookieName':settings.SESSION_COOKIE_NAME,'csrfName':settings.CSRF_COOKIE_NAME,'projectId':p.project_id,'variantId':str(variant.pk),'productId':str(product.pk)}
  with patch('stores.payments.request',side_effect=provider):
   result=subprocess.run(['node','tests/store-browser.mjs'],cwd=settings.BASE_DIR,input=json.dumps(payload),text=True,capture_output=True,timeout=120,env={**os.environ,'DJANGO_PORT':str(self.server_thread.port),'DJANGO_HOST':'127.0.0.1'})
  self.assertEqual(result.returncode,0,result.stdout+'\n'+result.stderr)
  order=Order.objects.get();self.assertEqual(order.status,'paid');self.assertEqual(order.fulfilment,'fulfilled');self.assertEqual(order.total,3600)
  variant.refresh_from_db();self.assertEqual(variant.stock,7)
  self.assertEqual(store.enquiries.count(),1);self.assertEqual(len(mail.outbox),1)
