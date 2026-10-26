import json
import base64
from io import BytesIO
from unittest.mock import patch
from django.test import Client, TestCase, override_settings
from . import tests as account_tests
from .models import User, Project, WorkspaceActivity

@override_settings(PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class WorkspaceTests(TestCase):
    secret = account_tests.AccountTests.secret
    setUp = account_tests.AccountTests.setUp
    csrf = account_tests.AccountTests.csrf
    send = account_tests.AccountTests.send
    signup = account_tests.AccountTests.signup
    project = account_tests.AccountTests.project

    def get_owned(self, client, path):
        return client.get(path, HTTP_X_DRAFTMANGO_ACCOUNT=client.owner)

    def test_profile_preferences_persist_and_reject_invalid_values(self):
        self.signup()
        result = self.send(self.client, '/api/accounts/profile', {'name':'Studio owner', 'preferences':{'theme':'dark','fontSize':16,'wordWrap':True}}, 'patch')
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['user']['name'], 'Studio owner')
        result = self.get_owned(self.client, '/api/accounts/profile').json()
        self.assertTrue(result['preferences']['wordWrap'])
        for invalid in [{'fontSize':True}, {'theme':'unknown'}, {'wordWrap':'false'}, {'fontSize':500}]:
            self.assertEqual(self.send(self.client, '/api/accounts/profile', {'preferences':invalid}, 'patch').status_code, 400)
        self.assertEqual(self.client.get('/api/accounts/profile').status_code, 401)

    def test_sessions_are_owned_and_revoke_only_other_devices(self):
        self.signup()
        other = Client(enforce_csrf_checks=True); self.csrf(other)
        self.send(other, '/api/accounts/login', {'email':'owner@example.test','password':self.secret})
        foreign = Client(enforce_csrf_checks=True); self.csrf(foreign); self.signup(foreign, 'foreign@example.test')
        sessions = self.get_owned(self.client, '/api/accounts/sessions').json()['sessions']
        self.assertEqual(len(sessions), 2)
        self.assertEqual(sum(row['current'] for row in sessions), 1)
        self.assertTrue(all(len(row['id']) == 64 for row in sessions))
        self.send(self.client, '/api/accounts/sessions', {'action':'others'})
        self.assertIsNone(other.get('/api/accounts/session').json()['user'])
        self.assertIsNotNone(foreign.get('/api/accounts/session').json()['user'])
        self.assertIsNotNone(self.client.get('/api/accounts/session').json()['user'])

    def test_password_change_requires_old_password_and_preserves_current_session(self):
        self.signup()
        self.assertEqual(self.send(self.client, '/api/accounts/password', {'currentPassword':'wrong','password':'Another-test-phrase!33'}).status_code, 400)
        self.assertEqual(self.send(self.client, '/api/accounts/password', {'currentPassword':self.secret,'password':'Another-test-phrase!33'}).status_code, 200)
        self.assertTrue(User.objects.get(email='owner@example.test').check_password('Another-test-phrase!33'))
        self.assertIsNotNone(self.client.get('/api/accounts/session').json()['user'])

    def test_activity_is_idempotent_and_account_scoped(self):
        self.signup()
        item = {'id':'build-123','projectId':'project-1','kind':'build','success':True}
        for _ in range(2): self.assertEqual(self.send(self.client, '/api/accounts/activity', item).status_code, 200)
        self.assertEqual(WorkspaceActivity.objects.count(), 1)
        foreign = Client(enforce_csrf_checks=True); self.csrf(foreign); self.signup(foreign, 'foreign@example.test')
        self.assertEqual(self.get_owned(foreign, '/api/accounts/activity').json()['activity'], [])

    def test_export_excludes_other_accounts_and_auth_secrets(self):
        self.signup(); self.project()
        data = self.get_owned(self.client, '/api/accounts/export').json()
        self.assertEqual(len(data['projects']), 1)
        self.assertNotIn('password', data['profile'])
        self.assertNotIn(self.secret, json.dumps(data))
        foreign = Client(enforce_csrf_checks=True); self.csrf(foreign); self.signup(foreign, 'foreign@example.test')
        self.assertEqual(self.get_owned(foreign, '/api/accounts/export').json()['projects'], [])

    def test_delete_requires_password_confirmation_and_csrf(self):
        self.signup(); self.project()
        self.send(self.client, '/api/accounts/activity', {'id':'a','kind':'test'})
        data = {'password':self.secret,'confirmation':'DELETE MY ACCOUNT'}
        self.assertEqual(self.send(self.client, '/api/accounts/delete', {**data,'password':'wrong'}).status_code, 400)
        self.assertEqual(self.client.post('/api/accounts/delete', json.dumps(data), content_type='application/json').status_code, 403)
        self.assertEqual(self.send(self.client, '/api/accounts/delete', data).status_code, 200)
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(Project.objects.count(), 0)
        self.assertEqual(WorkspaceActivity.objects.count(), 0)
        self.assertIsNone(self.client.get('/api/accounts/session').json()['user'])

    @patch('accounts.workspace_views.urlopen')
    def test_repository_import_rejects_arbitrary_hosts_before_network(self, open_url):
        self.signup()
        for url in ['http://127.0.0.1/private', 'https://github.com.evil.test/a/b', 'https://github.com/a/b/../../private']:
            self.assertEqual(self.send(self.client, '/api/accounts/import-github', {'url':url}).status_code, 400)
        open_url.assert_not_called()

    @patch('accounts.workspace_views.urlopen')
    def test_public_import_loads_only_bounded_source_from_github(self, open_url):
        self.signup()
        def response(request, **kwargs):
            if '/git/trees/' in request.full_url:
                data = {'tree':[{'type':'blob','path':'src/title.js','sha':'a'*40,'size':28},{'type':'blob','path':'.env','sha':'b'*40,'size':30}]}
            elif '/git/blobs/' in request.full_url:
                self.assertTrue(request.full_url.endswith('a'*40))
                data = {'content':base64.b64encode(b'export const title="Studio";').decode()}
            else:
                data = {'name':'studio'}
            return BytesIO(json.dumps(data).encode())
        open_url.side_effect = response
        result = self.send(self.client, '/api/accounts/import-github', {'url':'https://github.com/example/studio'})
        self.assertEqual(result.status_code, 200)
        files = result.json()['files']
        self.assertIn('src/title.js', files)
        self.assertIn('index.html', files)
        self.assertNotIn('.env', files)
        self.assertEqual(open_url.call_count, 3)
