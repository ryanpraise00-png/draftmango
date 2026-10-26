import json
from urllib.parse import parse_qs, urlsplit
from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from .models import User, Project

@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class AccountTests(TestCase):
    secret = 'A-test-mango-phrase!29'
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.csrf(self.client)

    def csrf(self, client):
        data = client.get('/api/accounts/session').json()
        client.token = data['csrfToken']
        client.owner = data['user']['id'] if data['user'] else ''
        return data

    def send(self, client, route, data, method='post', **headers):
        response = getattr(client, method)(route, json.dumps(data), content_type='application/json', HTTP_X_CSRFTOKEN=client.token, HTTP_X_DRAFTMANGO_ACCOUNT=client.owner, HTTP_ORIGIN=settings.APP_ORIGIN, **headers)
        result = response.json()
        if 'csrfToken' in result:
            client.token = result['csrfToken']
        if result.get('user'):
            client.owner = result['user']['id']
        return response

    def signup(self, client=None, email='owner@example.test'):
        client = client or self.client
        return self.send(client, '/api/accounts/signup', {'email': email, 'password': self.secret})

    def project(self, client=None, version=0, title='Mango shop'):
        return self.send(client or self.client, '/api/projects', {'project_id': 'same-project', 'project_document': {'id': 'same-project', 'title': title, 'history': [{'design': {}}]}, 'expected_version': version}, method='put')

    def link(self):
        line = next(line for line in mail.outbox[-1].body.splitlines() if '/auth.html#' in line)
        return {key: values[0] for key, values in parse_qs(urlsplit(line).fragment).items()}

    def test_signup_normalizes_email_hashes_password_and_sets_private_cookie(self):
        response = self.signup(email='OWNER@EXAMPLE.TEST')
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(email='owner@example.test')
        self.assertNotEqual(user.password, self.secret)
        self.assertTrue(user.check_password(self.secret))
        cookie = response.cookies[settings.SESSION_COOKIE_NAME]
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertNotIn(self.secret, response.content.decode())
        other_tab = Client(); other_tab.cookies = self.client.cookies.copy()
        self.assertEqual(other_tab.get('/api/accounts/session').json()['user']['id'], str(user.pk))
        self.assertEqual(self.signup().status_code, 409)

    def test_authentication_validation_and_logout_protect_projects(self):
        self.assertEqual(self.send(self.client, '/api/accounts/signup', {'email': 'bad', 'password': self.secret}).status_code, 400)
        self.assertEqual(self.send(self.client, '/api/accounts/signup', {'email': 'good@example.test', 'password': '12345678'}).status_code, 400)
        self.signup()
        self.send(self.client, '/api/accounts/logout', {})
        self.assertIsNone(self.client.get('/api/accounts/session').json()['user'])
        self.assertEqual(self.client.get('/api/projects').status_code, 401)
        response = self.send(self.client, '/api/accounts/login', {'email': 'owner@example.test', 'password': 'wrong-password'})
        self.assertEqual(response.status_code, 401)
        response = self.send(self.client, '/api/accounts/login', {'email': 'OWNER@example.test', 'password': self.secret})
        self.assertEqual(response.status_code, 200)

    def test_csrf_required_for_signup_login_logout_and_project_writes(self):
        for path in ['signup', 'login', 'logout', 'reset', 'reset-confirm', 'verify']:
            response = self.client.post('/api/accounts/' + path, '{}', content_type='application/json')
            self.assertEqual(response.status_code, 403)
        self.signup()
        self.assertEqual(self.client.put('/api/projects', '{}', content_type='application/json').status_code, 403)
        response = self.client.post('/api/accounts/logout', '{}', content_type='application/json', HTTP_X_CSRFTOKEN=self.client.token, HTTP_ORIGIN='https://evil.example')
        self.assertEqual(response.status_code, 403)

    def test_two_accounts_cannot_read_or_update_each_others_projects(self):
        self.signup(); self.assertEqual(self.project().status_code, 201)
        second = Client(enforce_csrf_checks=True); self.csrf(second); self.signup(second, 'second@example.test')
        self.assertEqual(second.get('/api/projects', HTTP_X_DRAFTMANGO_ACCOUNT=second.owner).json()['projects'], [])
        self.assertEqual(self.project(second, 1, 'overwrite attempt').status_code, 409)
        self.assertEqual(Project.objects.get(owner_id=self.client.owner).document['title'], 'Mango shop')
        self.assertEqual(second.get('/api/projects', HTTP_X_DRAFTMANGO_ACCOUNT=self.client.owner).status_code, 401)
        second.owner = self.client.owner
        self.assertEqual(self.project(second).status_code, 401)

    def test_project_versions_reject_stale_writes(self):
        self.signup(); self.project()
        self.assertEqual(self.project().status_code, 409)
        self.assertEqual(self.project(version=1, title='Newer title').json(), {'version': 2})
        self.assertEqual(self.project(version=1, title='Old tab').status_code, 409)
        self.assertEqual(Project.objects.get().document['title'], 'Newer title')
        self.assertEqual(self.client.get('/api/projects?offset=invalid', HTTP_X_DRAFTMANGO_ACCOUNT=self.client.owner).status_code, 400)

    def test_project_summary_lists_versions_without_documents_and_ids_fetch_only_owned(self):
        self.signup(); self.project(); self.project(version=1, title='Second save')
        headers = {'HTTP_X_DRAFTMANGO_ACCOUNT': self.client.owner}
        summary = self.client.get('/api/projects?summary=1', **headers).json()
        self.assertEqual(summary['projects'], [{'id': 'same-project', 'version': 2}])
        self.assertNotIn('Second save', json.dumps(summary))
        rows = self.client.get('/api/projects?id=same-project&id=missing', **headers).json()['projects']
        self.assertEqual([(row['id'], row['version'], row['document']['title']) for row in rows], [('same-project', 2, 'Second save')])
        too_many = '&'.join('id=p%d' % number for number in range(21))
        self.assertEqual(self.client.get('/api/projects?' + too_many, **headers).status_code, 400)
        self.assertEqual(self.client.get('/api/projects?id=' + 'x' * 81, **headers).status_code, 400)
        second = Client(enforce_csrf_checks=True); self.csrf(second); self.signup(second, 'second@example.test')
        self.assertEqual(second.get('/api/projects?id=same-project', HTTP_X_DRAFTMANGO_ACCOUNT=second.owner).json()['projects'], [])
        self.assertEqual(second.get('/api/projects?summary=1', HTTP_X_DRAFTMANGO_ACCOUNT=second.owner).json()['projects'], [])

    def test_reset_link_is_single_use_and_invalidates_other_sessions(self):
        self.signup()
        second = Client(); second.force_login(User.objects.get())
        response = self.send(self.client, '/api/accounts/reset', {'email': 'owner@example.test'})
        self.assertEqual(response.status_code, 200)
        data = self.link(); data['password'] = 'Another-mango-password!53'
        self.assertEqual(self.send(self.client, '/api/accounts/reset-confirm', data).status_code, 200)
        self.assertIsNone(second.get('/api/accounts/session').json()['user'])
        self.assertEqual(self.send(self.client, '/api/accounts/reset-confirm', data).status_code, 400)
        self.assertTrue(User.objects.get().check_password(data['password']))

    def test_reset_does_not_disclose_unknown_account(self):
        response = self.send(self.client, '/api/accounts/reset', {'email': 'unknown@example.test'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'sent': True, 'emailDelivery': 'local'})
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(REQUIRE_EMAIL_VERIFICATION=True)
    def test_optional_email_verification_and_resend(self):
        response = self.signup()
        self.assertTrue(response.json()['confirmationRequired'])
        self.assertFalse(User.objects.get().is_active)
        response = self.send(self.client, '/api/accounts/login', {'email': 'owner@example.test', 'password': self.secret})
        self.assertEqual(response.json()['error']['code'], 'email_not_confirmed')
        self.assertEqual(self.send(self.client, '/api/accounts/resend-verification', {'email': 'owner@example.test'}).status_code, 200)
        data = self.link()
        self.assertEqual(self.send(self.client, '/api/accounts/verify', data).status_code, 200)
        self.assertTrue(User.objects.get().email_verified)
        self.assertEqual(self.send(self.client, '/api/accounts/verify', data).status_code, 400)

    def test_rate_limits_login_attempts(self):
        for _ in range(15):
            self.assertEqual(self.send(self.client, '/api/accounts/login', {'email': 'unknown@example.test', 'password': self.secret}).status_code, 401)
        self.assertEqual(self.send(self.client, '/api/accounts/login', {'email': 'unknown@example.test', 'password': self.secret}).status_code, 429)

    def test_invalid_payloads_and_large_bodies_are_rejected(self):
        self.signup()
        for payload in [{}, {'project_id': 'x', 'project_document': {'id': 'different'}, 'expected_version': 0}]:
            self.assertEqual(self.send(self.client, '/api/projects', payload, method='put').status_code, 400)
        with override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=100):
            self.assertEqual(self.send(self.client, '/api/projects', {'large': 'x' * 200}, method='put').status_code, 413)
