import base64
import gzip
import hashlib
import http.client
import io
import json
import os
import shutil
import subprocess
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlencode, urlsplit
from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command, CommandError
from django.test import Client, TestCase, LiveServerTestCase, override_settings
from django.utils import timezone
from .models import ServiceClient, AccessToken
from .views import digest, SCOPES

ORIGIN = 'https://draftmango.com'
RESOURCE = ORIGIN + '/mcp/templates'
SECRET = 's' * 43
INTERNAL = 'private-test-only-' * 3
SETTINGS = dict(TEMPLATE_REMOTE_ENABLED=True, APP_ORIGIN=ORIGIN, BUILD_TOKEN=INTERNAL,
                STATIC_URL='/static/', MEDIA_URL='/media/',
                CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}},
                ALLOWED_HOSTS=['testserver', 'localhost', '127.0.0.1', 'draftmango.com'])


def make_client():
    return ServiceClient.objects.create(client_id='isotris', secret_hash=digest(SECRET), scopes=list(SCOPES), expires_at=timezone.now()+timedelta(days=30))


def basic(secret=SECRET):
    return 'Basic ' + base64.b64encode(('isotris:' + secret).encode()).decode()


@override_settings(**SETTINGS)
class AccessTests(TestCase):
    def setUp(self):
        cache.clear()
        self.identity = make_client()
        self.http = Client(enforce_csrf_checks=True)

    def mint(self, **overrides):
        return self.http.post('/api/template-access/token', urlencode({'grant_type':'client_credentials','resource':RESOURCE, **overrides}), content_type='application/x-www-form-urlencoded', HTTP_AUTHORIZATION=basic())

    def auth(self, raw, **overrides):
        return self.http.post('/internal/template-access/authorize', json.dumps({'token':raw,'resource':RESOURCE,'operation':'mcp', **overrides}), content_type='application/json', HTTP_X_DRAFTMANGO_INTERNAL=INTERNAL)

    def test_no_customer_account_and_only_hashes_stored(self):
        response = self.mint(scope='templates:read')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['expires_in'], 900)
        self.assertEqual(data['scope'], 'templates:read')
        self.assertNotIn('refresh_token', data)
        row = AccessToken.objects.get()
        self.assertEqual(row.digest, digest(data['access_token']))
        self.assertNotEqual(row.digest, data['access_token'])
        self.assertEqual(self.auth(data['access_token']).json(), {'client_id':'isotris','scopes':['templates:read']})
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_disabled_by_default_at_both_private_and_public_handlers(self):
        with override_settings(TEMPLATE_REMOTE_ENABLED=False):
            self.assertEqual(self.mint().status_code, 404)
            self.assertEqual(self.auth('x'*43).status_code, 404)

    def test_no_secret_in_body_or_customer_session_fallback(self):
        for authorization in ('', 'Bearer ' + SECRET, basic('wrong'*8), 'Basic invalid'):
            response = self.http.post('/api/template-access/token', urlencode({'grant_type':'client_credentials','resource':RESOURCE}), content_type='application/x-www-form-urlencoded', HTTP_AUTHORIZATION=authorization)
            self.assertEqual(response.status_code, 401)
            self.assertNotIn(SECRET, response.content.decode())
        self.assertEqual(self.mint(client_secret=SECRET).status_code, 400)

    def test_scope_resource_and_grant_are_bound(self):
        self.identity.scopes = ['templates:read']; self.identity.save()
        for args in ({'scope':'templates:download'},{'scope':''},{'resource':'https://evil.example/mcp/templates'},{'grant_type':'password'}):
            self.assertEqual(self.mint(**args).status_code, 400)
        self.assertEqual(self.mint().json()['scope'], 'templates:read')

    def test_expiry_revocation_revision_and_scope_reduction_are_immediate(self):
        raw = self.mint().json()['access_token']
        self.identity.scopes = ['templates:read']; self.identity.save()
        self.assertEqual(self.auth(raw).json()['scopes'], ['templates:read'])
        self.identity.revision += 1; self.identity.save()
        self.assertEqual(self.auth(raw).status_code, 401)
        raw = self.mint().json()['access_token']
        self.identity.active = False; self.identity.save()
        self.assertEqual(self.auth(raw).status_code, 401)
        self.assertEqual(self.mint().status_code, 401)

    def test_expired_token_or_client_fails(self):
        raw = self.mint().json()['access_token']
        AccessToken.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.auth(raw).status_code, 401)
        self.identity.expires_at = timezone.now()-timedelta(seconds=1); self.identity.save()
        self.assertEqual(self.mint().status_code, 401)

    def test_private_authorization_requires_internal_credential(self):
        response = self.http.post('/internal/template-access/authorize', '{}', content_type='application/json')
        self.assertEqual(response.status_code, 404)
        raw = self.mint().json()['access_token']
        self.assertEqual(self.auth(raw, resource='https://elsewhere.example').status_code, 400)
        self.assertEqual(self.auth(raw, operation='arbitrary').status_code, 400)

    def test_cross_origin_duplicates_query_and_oversize_are_rejected(self):
        payload = urlencode({'grant_type':'client_credentials','resource':RESOURCE})
        self.assertEqual(self.http.post('/api/template-access/token', payload, content_type='application/x-www-form-urlencoded', HTTP_AUTHORIZATION=basic(), HTTP_ORIGIN='https://evil.example').status_code, 403)
        for route, body in (('/api/template-access/token?secret=bad',payload),('/api/template-access/token',payload+'&resource=elsewhere'),('/api/template-access/token','x'*4097)):
            self.assertEqual(self.http.post(route,body,content_type='application/x-www-form-urlencoded',HTTP_AUTHORIZATION=basic()).status_code,400)

    def test_shared_rate_limits_and_cache_failure_fail_closed(self):
        raw = self.mint().json()['access_token']
        for _ in range(60):
            self.assertEqual(self.auth(raw).status_code, 200)
        response = self.auth(raw)
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response['Retry-After'], '60')
        with patch('template_access.views.cache.add', side_effect=ConnectionError('test outage')):
            self.assertEqual(self.mint().status_code, 503)
            self.assertEqual(self.auth(raw).status_code, 503)

    def test_credentials_can_be_rotated_and_revoked_without_printing_secrets(self):
        raw = self.mint().json()['access_token']
        self.identity.scopes = ['templates:read']; self.identity.save()
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'private.json'
            output = io.StringIO()
            call_command('template_client','rotate','isotris',secret_file=str(target),stdout=output)
            credential = json.loads(target.read_text())
            self.assertNotIn(credential['client_secret'],output.getvalue())
            self.assertEqual(self.auth(raw).status_code,401)
            self.assertEqual(self.mint().status_code,401)
            self.identity.refresh_from_db()
            self.assertEqual(self.identity.secret_hash,digest(credential['client_secret']))
            self.assertEqual(self.identity.scopes,['templates:read'])
            with self.assertRaises(CommandError):
                call_command('template_client','rotate','isotris',secret_file=str(target),stdout=output)
            call_command('template_client','revoke','isotris',stdout=output)
            self.identity.refresh_from_db(); self.assertFalse(self.identity.active)

    def test_provisioning_is_explicit_and_secret_files_stay_outside_repo(self):
        with self.assertRaises(CommandError):
            call_command('template_client','create','second',secret_file=str(settings.BASE_DIR/'secret.json'))
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'second.json'
            call_command('template_client','create','second',secret_file=str(target),scopes=['templates:read'],stdout=io.StringIO())
            self.assertEqual(ServiceClient.objects.get(pk='second').scopes,['templates:read'])
            self.assertEqual(len(json.loads(target.read_text())['client_secret']),43)


@override_settings(**SETTINGS)
class GatewayIntegrationTests(LiveServerTestCase):
    """Real Node -> private Django -> database -> package export, isolated DB/files."""
    def test_backend_connection_download_and_revocation(self):
        cache.clear(); identity = make_client()
        node = shutil.which('node')
        self.assertIsNotNone(node, 'Node is required for the remote template integration test.')
        with tempfile.TemporaryDirectory() as folder:
            env = {**os.environ, 'DJANGO_HOST':'127.0.0.1', 'DJANGO_PORT':str(urlsplit(self.live_server_url).port), 'DRAFTMANGO_BUILD_TOKEN':INTERNAL, 'DRAFTMANGO_TEMPLATE_PACKAGES_DIR':folder}
            script = "import {createServer} from './server/serve.mjs'; const s=createServer({publicOrigin:'https://draftmango.com',templateRemoteOptions:{enabled:true}}); s.listen(0,'127.0.0.1',()=>console.log(s.address().port));"
            process = subprocess.Popen([node,'--input-type=module','-e',script],cwd=settings.BASE_DIR,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            try:
                port = int(process.stdout.readline().strip())
                def request(route, body=None, token=None, form=False):
                    connection = http.client.HTTPConnection('127.0.0.1',port,timeout=30)
                    headers = {'Host':'draftmango.com','Accept':'application/json, text/event-stream'}
                    if form:
                        headers.update({'Content-Type':'application/x-www-form-urlencoded','Authorization':basic()})
                    else:
                        headers['Content-Type'] = 'application/json'
                        if token: headers['Authorization'] = 'Bearer '+token
                    connection.request('POST' if body is not None else 'GET',route,body,headers)
                    response = connection.getresponse(); data = response.read(); status = response.status
                    connection.close(); return status,data
                status, body = request('/api/template-access/token',urlencode({'grant_type':'client_credentials','resource':RESOURCE}),form=True)
                self.assertEqual(status,200,body)
                raw = json.loads(body)['access_token']
                def tool(name,args):
                    return request('/mcp/templates',json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':args}}),token=raw)
                status, body = tool('get_template_package',{'id':'cafe-1'})
                self.assertEqual(status,200,body)
                descriptor = json.loads(body)['result']['structuredContent']
                route = urlsplit(descriptor['url']).path
                self.assertEqual(request(route)[0],401)
                status, data = request(route,token=raw)
                self.assertEqual(status,200,data[:100])
                self.assertEqual(hashlib.sha256(data).hexdigest(),descriptor['sha256'])
                bundle = json.loads(gzip.decompress(data))
                self.assertIn('src/App.jsx',bundle['files'])
                self.assertTrue(bundle['binaryFiles'])
                args = {'id':'cafe-1','version':bundle['template']['version'],'files':bundle['files']}
                self.assertTrue(json.loads(tool('validate_template_files',args)[1])['result']['structuredContent']['valid'])
                args['files']['src/styles.css'] += '\nbody{display:none}'
                self.assertFalse(json.loads(tool('validate_template_files',args)[1])['result']['structuredContent']['valid'])
                identity.active = False; identity.save()
                self.assertEqual(request(route,token=raw)[0],401)
            finally:
                process.terminate()
                try: process.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill(); process.communicate()
