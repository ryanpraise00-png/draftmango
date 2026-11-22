import io,json
from PIL import Image
from django.test import TestCase,Client,override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from accounts.models import User,BisukReport,BisukScreenshot
from accounts.bisuk_testing import PROGRAM
@override_settings(BISUK_TESTING_ADMIN_EMAILS='admin@example.test',EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',BISUK_TESTING_RECIPIENT='admin@example.test',PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class ScreenshotTests(TestCase):
 def setUp(self):
  cache.clear()
  self.user=User.objects.create_user('upload@example.test','fixture-only',email_verified=True)
  self.other=User.objects.create_user('other@example.test','fixture-only',email_verified=True)
  self.admin=User.objects.create_user('admin@example.test','fixture-only',email_verified=True)
  self.client.force_login(self.user)
  self.report=BisukReport.objects.create(owner=self.user,program=PROGRAM['id'],tester_id='T01',task_id='storefront')
 def image(self,fmt='PNG'):
  out=io.BytesIO();Image.new('RGB',(32,24),'blue').save(out,format=fmt)
  return SimpleUploadedFile('screenshot.'+fmt.lower(),out.getvalue(),content_type='image/'+fmt.lower())
 def upload(self,image=None,client=None,header=None):
  return (client or self.client).post('/api/bisuk-testing/screenshots',{'image':image or self.image()},HTTP_X_DRAFTMANGO_ACCOUNT=str(header or self.user.pk))
 def payload(self,ids):
  return {'overall':'partial','stages':{s['id']:{'status':'partial','expected':'Expected','actual':'Actual','issues':[{'category':'other','severity':'low','steps':'Inspect','actual':'Mismatch','screenshots':ids}] if s['id']=='generation' else []} for s in PROGRAM['stages']}}
 def save(self,ids,action='save'):
  self.report.refresh_from_db()
  return self.client.post('/api/bisuk-testing/report',json.dumps({'action':action,'version':self.report.version,'payload':self.payload(ids)}),content_type='application/json',HTTP_X_DRAFTMANGO_ACCOUNT=str(self.user.pk))
 def test_upload_attach_reload_and_private_access(self):
  r=self.upload();self.assertEqual(r.status_code,201)
  image=r.json()['screenshot'];self.assertEqual(image['width'],32)
  self.assertEqual(self.save([image['id']]).status_code,200)
  self.report.refresh_from_db();self.assertEqual(self.report.payload['stages']['generation']['issues'][0]['screenshots'],[image['id']])
  self.assertEqual(self.client.get(image['url']).status_code,200)
  self.assertEqual(Client().get(image['url']).status_code,401)
  c=Client();c.force_login(self.other);self.assertEqual(c.get(image['url']).status_code,404)
  c.force_login(self.admin);self.assertEqual(c.get(image['url']).status_code,200)
  self.assertEqual(self.save([image['id']],'submit').status_code,200)
  self.assertEqual(self.client.get(image['url']).status_code,200)
  self.assertEqual(self.upload().status_code,409)
 def test_invalid_images_and_size_are_rejected(self):
  for raw in [b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',b'not an image']:
   self.assertEqual(self.upload(SimpleUploadedFile('fake.png',raw,content_type='image/png')).status_code,400)
  self.assertEqual(self.upload(SimpleUploadedFile('big.png',b'x'*(5*1024*1024+1),content_type='image/png')).status_code,413)
  self.assertEqual(BisukScreenshot.objects.count(),0)
 def test_csrf_account_and_cross_report_references(self):
  self.assertEqual(self.upload(header=self.other.pk).status_code,409)
  c=Client(enforce_csrf_checks=True);c.force_login(self.user);self.assertEqual(self.upload(client=c).status_code,403)
  image=self.upload().json()['screenshot']
  other_report=BisukReport.objects.create(owner=self.other,program=PROGRAM['id'],tester_id='T02',task_id='saas')
  foreign=BisukScreenshot.objects.create(report=other_report,content=b'x',content_type='image/png',byte_size=1,width=1,height=1)
  self.assertEqual(self.save([str(foreign.pk)]).status_code,400)
  self.assertEqual(self.save(['../../bad']).status_code,400)
  self.assertEqual(self.save([image['id']]*2).status_code,400)
 def test_png_jpeg_webp_and_removal_preserve_other_feedback(self):
  ids=[self.upload(self.image(fmt)).json()['screenshot']['id'] for fmt in ['PNG','JPEG','WEBP']]
  self.assertEqual(self.save(ids).status_code,200)
  self.assertEqual(self.save([]).status_code,200)
  self.report.refresh_from_db();self.assertEqual(self.report.payload['stages']['generation']['issues'][0]['screenshots'],[])
  self.assertEqual(self.report.payload['stages']['generation']['actual'],'Actual')
 def test_report_quota_and_per_issue_limit(self):
  image=self.upload().json()['screenshot'];row=BisukScreenshot.objects.get(pk=image['id'])
  BisukScreenshot.objects.bulk_create([BisukScreenshot(report=self.report,content=b'x',content_type='image/png',byte_size=1,width=1,height=1) for _ in range(39)])
  self.assertEqual(self.upload().status_code,400)
  ids=[str(x) for x in self.report.screenshots.values_list('pk',flat=True)[:4]]
  self.assertEqual(self.save(ids).status_code,400)
