import base64
import json
import time
from io import BytesIO
from unittest.mock import patch
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from .models import User

CLIENT_ID = 'test-client.apps.googleusercontent.com'

def id_token(**claims):
    body = {'iss': 'https://accounts.google.com', 'aud': CLIENT_ID, 'exp': time.time() + 300, 'sub': '1098765', 'email': 'mango@example.test', 'email_verified': True, 'given_name': 'Mara', **claims}
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b'=').decode()
    return encode({'alg': 'RS256'}) + '.' + encode(body) + '.signature'

class TokenResponse(BytesIO):
    def __enter__(self): return self
    def __exit__(self, *args): self.close()

@override_settings(GOOGLE_CLIENT_ID=CLIENT_ID, GOOGLE_CLIENT_SECRET='test-secret', APP_ORIGIN='http://testserver', REGISTRATION_OPEN=True,
                   PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class GoogleSignInTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client()

    def begin(self):
        response = self.client.get('/api/accounts/google/start')
        self.assertEqual(response.status_code, 302)
        return parse_qs(urlsplit(response['Location']).query)

    def finish(self, token_claims=None, state=None, **extra):
        query = self.begin()
        nonce = query['nonce'][0]
        claims = {'nonce': nonce, **(token_claims or {})}
        payload = json.dumps({'id_token': id_token(**claims), 'access_token': 'unused'}).encode()
        with patch('accounts.google.urlopen', return_value=TokenResponse(payload)) as urlopen:
            response = self.client.get('/api/accounts/google/callback', {'state': state or query['state'][0], 'code': 'auth-code', **extra})
        return response, urlopen

    def test_session_lists_google_only_when_configured(self):
        self.assertEqual(self.client.get('/api/accounts/session').json()['providers'], ['google'])
        with override_settings(GOOGLE_CLIENT_SECRET=''):
            self.assertEqual(self.client.get('/api/accounts/session').json()['providers'], [])
            response = self.client.get('/api/accounts/google/start')
            self.assertEqual(response['Location'], '/auth#mode=login&error=google_unavailable')

    def test_start_sends_the_browser_to_google_with_state_and_pkce(self):
        response = self.client.get('/api/accounts/google/start')
        location = urlsplit(response['Location'])
        query = parse_qs(location.query)
        self.assertEqual((location.netloc, location.path), ('accounts.google.com', '/o/oauth2/v2/auth'))
        self.assertEqual(query['client_id'], [CLIENT_ID])
        self.assertEqual(query['redirect_uri'], ['http://testserver/api/accounts/google/callback'])
        self.assertEqual(query['code_challenge_method'], ['S256'])
        self.assertEqual(response['Cache-Control'], 'no-store')
        self.assertEqual(self.client.session['google_oauth']['state'], query['state'][0])

    def test_start_moves_to_the_configured_origin_first(self):
        with override_settings(APP_ORIGIN='http://127.0.0.1:4175', ALLOWED_HOSTS=['*']):
            response = self.client.get('/api/accounts/google/start', HTTP_HOST='localhost:4175')
        self.assertEqual(response['Location'], 'http://127.0.0.1:4175/api/accounts/google/start')

    def test_new_google_user_is_created_verified_and_signed_in(self):
        response, urlopen = self.finish()
        self.assertEqual(response['Location'], '/auth')
        sent = parse_qs(urlopen.call_args.args[0].data.decode())
        self.assertEqual(sent['code'], ['auth-code'])
        self.assertTrue(sent['code_verifier'][0])
        user = User.objects.get(email='mango@example.test')
        self.assertEqual((user.google_subject, user.email_verified, user.first_name), ('1098765', True, 'Mara'))
        self.assertFalse(user.has_usable_password())
        self.assertEqual(self.client.get('/api/accounts/session').json()['user']['email'], 'mango@example.test')
        self.assertNotIn('google_oauth', self.client.session)

    def test_existing_email_account_is_linked(self):
        user = User.objects.create_user('mango@example.test', 'A-test-mango-phrase!29')
        self.finish()
        user.refresh_from_db()
        self.assertEqual((user.google_subject, user.email_verified), ('1098765', True))
        self.assertTrue(user.check_password('A-test-mango-phrase!29'))

    def test_unconfirmed_signup_is_activated_without_its_password(self):
        user = User.objects.create_user('mango@example.test', 'Someone-elses-phrase!29', is_active=False)
        response, _ = self.finish()
        self.assertEqual(response['Location'], '/auth')
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.has_usable_password())

    def test_registration_closed_does_not_create_an_account(self):
        with override_settings(REGISTRATION_OPEN=False):
            response, _ = self.finish()
        self.assertEqual(response['Location'], '/auth#mode=login&error=registration_closed')
        self.assertFalse(User.objects.exists())

    def test_disabled_account_is_refused(self):
        User.objects.create_user('mango@example.test', None, google_subject='1098765', email_verified=True, is_active=False)
        response, _ = self.finish()
        self.assertEqual(response['Location'], '/auth#mode=login&error=account_disabled')

    def test_email_linked_to_another_google_account_is_refused(self):
        User.objects.create_user('mango@example.test', None, google_subject='other-subject', email_verified=True)
        response, _ = self.finish()
        self.assertEqual(response['Location'], '/auth#mode=login&error=google_failed')

    def test_tampered_or_mismatched_responses_are_rejected(self):
        cases = [({'state': 'forged'}, {}, 'google_failed'), ({}, {'aud': 'someone-else'}, 'google_failed'), ({}, {'iss': 'https://evil.example'}, 'google_failed'),
                 ({}, {'nonce': 'wrong'}, 'google_failed'), ({}, {'email_verified': False}, 'google_unverified'), ({}, {'exp': time.time() - 5}, 'google_expired')]
        for request, claims, code in cases:
            with self.subTest(code=code, claims=claims):
                response, _ = self.finish(claims, **request)
                self.assertEqual(response['Location'], '/auth#mode=login&error=' + code)
        self.assertFalse(User.objects.exists())

    def test_callback_without_a_started_flow_or_after_cancelling_fails_safely(self):
        response = self.client.get('/api/accounts/google/callback', {'state': 'x', 'code': 'y'})
        self.assertEqual(response['Location'], '/auth#mode=login&error=google_failed')
        query = self.begin()
        response = self.client.get('/api/accounts/google/callback', {'state': query['state'][0], 'error': 'access_denied'})
        self.assertEqual(response['Location'], '/auth#mode=login&error=google_cancelled')

    def test_token_endpoint_failure_is_reported(self):
        query = self.begin()
        with patch('accounts.google.urlopen', side_effect=URLError('down')):
            response = self.client.get('/api/accounts/google/callback', {'state': query['state'][0], 'code': 'auth-code'})
        self.assertEqual(response['Location'], '/auth#mode=login&error=google_failed')
        self.assertFalse(User.objects.exists())
