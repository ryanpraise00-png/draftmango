import json
from unittest.mock import patch
from django.test import TestCase,Client,override_settings
from django.core import mail
from django.core.cache import cache
from .models import User,BisukReport
from .bisuk_testing import PROGRAM,deliver
@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',BISUK_TESTING_RECIPIENT='owner@example.test',BISUK_TESTING_ADMIN_EMAILS='owner@example.test',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class BisukTestingTests(TestCase):
 def setUp(self):
  cache.clear()
  self.user=User.objects.create_user('tester@example.test','safe-test-password',email_verified=True)
  self.admin=User.objects.create_user('owner@example.test','safe-test-password',email_verified=True)
  self.client.force_login(self.user)
 def call(self,path='report',data=None,client=None,user=None):
  c=client or self.client;headers={'HTTP_X_DRAFTMANGO_ACCOUNT':str((user or self.user).pk)}
  return c.post('/api/bisuk-testing/'+path,json.dumps(data),content_type='application/json',**headers) if data is not None else c.get('/api/bisuk-testing/'+path,**headers)
 def claim(self):return self.call(data={'action':'claim','testerId':'T01'}).json()['report']
 def payload(self):
  return {'overall':'partial','stages':{s['id']:{'status':'partial','expected':'Works as briefed','actual':'Some behavior worked','ratings':{'design':3},'issues':[]} for s in PROGRAM['stages']}}
 def final(self):
  r=self.claim();return self.call(data={'action':'submit','version':r['version'],'payload':self.payload()})
 def test_assignment_is_unique_and_cannot_be_reclaimed(self):
  self.claim();other=User.objects.create_user('second@example.test','safe-test-password')
  c=Client();c.force_login(other)
  self.assertEqual(self.call(data={'action':'claim','testerId':'T01'},client=c,user=other).status_code,409)
  self.assertEqual(self.call(data={'action':'claim','testerId':'T02'}).status_code,409)
 def test_login_account_and_admin_controls(self):
  self.assertEqual(Client().get('/api/bisuk-testing/program').status_code,401)
  self.assertEqual(self.client.get('/api/bisuk-testing/program',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.admin.pk)).status_code,409)
  self.assertEqual(self.call('admin').status_code,403)
  self.assertEqual(self.call('export').status_code,403)
 def test_draft_recovery_and_stale_write_protection(self):
  r=self.claim();p=self.payload();p['stages']['generation']['issues']=[{'category':'navigation','severity':'high','source':'unknown','steps':'Click cart','actual':'No change'},{'category':'design','severity':'low','source':'unknown','steps':'Open mobile view','actual':'Text overlaps'}]
  saved=self.call(data={'action':'save','version':r['version'],'payload':p})
  self.assertEqual(saved.status_code,200)
  self.assertEqual(len(self.call().json()['report']['payload']['stages']['generation']['issues']),2)
  self.assertEqual(self.call(data={'action':'save','version':r['version'],'payload':p}).status_code,409)
 def test_submission_persists_before_email_and_duplicate_does_not_resend(self):
  r=self.claim()
  def send(*args,**kwargs):
   self.assertTrue(BisukReport.objects.get().submitted_at)
   return 1
  with patch('accounts.bisuk_testing.send_mail',side_effect=send) as smtp:
   result=self.call(data={'action':'submit','version':r['version'],'payload':self.payload()})
   self.assertEqual(result.json()['report']['emailStatus'],'sent')
   duplicate=self.call(data={'action':'submit','version':r['version'],'payload':self.payload()})
   self.assertTrue(duplicate.json()['duplicate']);self.assertEqual(smtp.call_count,1)
 def test_mail_failure_retains_report_and_can_retry(self):
  with patch('accounts.bisuk_testing.send_mail',side_effect=RuntimeError('secret SMTP detail')):
   response=self.final()
  self.assertEqual(response.status_code,200);r=BisukReport.objects.get()
  self.assertEqual(r.email_status,'failed');self.assertNotIn('secret',r.email_error)
  self.assertTrue(deliver(r.pk));r.refresh_from_db();self.assertEqual(r.email_status,'sent')
  self.assertEqual(mail.outbox[0].to,['owner@example.test'])
 def test_final_requires_all_stages_and_issue_details(self):
  r=self.claim()
  self.assertEqual(self.call(data={'action':'submit','version':r['version'],'payload':{'overall':'blocked','stages':{}}}).status_code,400)
  p=self.payload();p['stages']['generation']['issues']=[{'category':'other','severity':'low'}]
  self.assertEqual(self.call(data={'action':'submit','version':r['version'],'payload':p}).status_code,400)
 def test_unsafe_evidence_and_invalid_ratings_rejected(self):
  r=self.claim();p=self.payload();p['stages']['generation']['url']='javascript:alert(1)'
  self.assertEqual(self.call(data={'action':'save','version':r['version'],'payload':p}).status_code,400)
  p=self.payload();p['stages']['generation']['ratings']['design']=True
  self.assertEqual(self.call(data={'action':'save','version':r['version'],'payload':p}).status_code,400)
 def test_admin_exports_and_summary(self):
  self.final();c=Client();c.force_login(self.admin)
  data=self.call('admin',client=c,user=self.admin).json()
  self.assertEqual(data['summary']['submitted'],1);self.assertEqual(data['summary']['scores']['design']['mean'],3)
  self.assertEqual(self.call('export?format=csv',client=c,user=self.admin).status_code,200)
  self.admin.email_verified=False;self.admin.save()
  self.assertEqual(self.call('admin',client=c,user=self.admin).status_code,403)
 def test_csrf_is_required(self):
  c=Client(enforce_csrf_checks=True);c.force_login(self.user)
  self.assertEqual(self.call(data={'action':'claim','testerId':'T01'},client=c).status_code,403)
 def test_notifications_redact_credentials(self):
  r=self.claim();p=self.payload();p['observations']='Bearer abcdefghijklmnop token=supersecretvalue sk-12345678901234567890'
  self.call(data={'action':'submit','version':r['version'],'payload':p})
  for s in ['abcdefghijklmnop','supersecretvalue','sk-12345678901234567890']:self.assertNotIn(s,mail.outbox[0].body)

 def test_assignment_titles_match_whatsapp_ids(self):
  titles={a['testerId']:a['title'] for a in self.call('program').json()['assignments']}
  self.assertEqual(titles['T01'],'Storefront');self.assertEqual(titles['T02'],'SaaS dashboard');self.assertEqual(titles['T10'],'Pulse Operations');self.assertEqual(titles['T04'],'Hotel booking')
