import json
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import urlsplit
from django.core import mail
from django.test import TestCase, override_settings
from . import tests as helpers
from .models import User
from .views import verification_token, email_intent


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', REQUIRE_EMAIL_VERIFICATION=True, REGISTRATION_OPEN=True, PASSWORD_HASHERS=['django.contrib.auth.hashers.MD5PasswordHasher'])
class LaunchAuthTests(TestCase):
    setUp = helpers.AccountTests.setUp
    csrf = helpers.AccountTests.csrf
    send = helpers.AccountTests.send
    signup = helpers.AccountTests.signup
    link = helpers.AccountTests.link
    secret = helpers.AccountTests.secret

    def test_signup_email_preserves_only_internal_intent_and_prefills_login(self):
        response = self.send(self.client, '/api/accounts/signup', {'email': 'OWNER@EXAMPLE.TEST', 'password': self.secret, 'intent': {'idea': 'My flower shop', 'template': 'cafe-1', 'plan': 'basic', 'billing': 'yearly', 'draft': '12345678-1234-1234-1234-123456789012', 'references': 'private file contents', 'next': 'https://evil.test', 'token': 'evil'}})
        self.assertEqual(response.status_code, 201)
        data = self.link()
        self.assertEqual(data['idea'], 'My flower shop')
        self.assertEqual(data['template'], 'cafe-1')
        self.assertEqual(data['mode'], 'login')
        self.assertEqual(data['email'], 'owner@example.test')
        self.assertEqual(data['plan'], 'basic')
        self.assertEqual(data['draft'], '12345678-1234-1234-1234-123456789012')
        self.assertNotIn('private file contents', mail.outbox[-1].body)
        self.assertNotIn('next', data)
        self.assertNotEqual(data['token'], 'evil')
        self.assertIn('/auth#', mail.outbox[-1].body)
        self.assertNotIn('/auth.html', mail.outbox[-1].body)
        self.assertIsNone(self.client.get('/api/accounts/session').json()['user'])

    def test_mail_failure_can_be_retried_without_replacing_pending_password(self):
        with patch('accounts.views.send_mail', side_effect=RuntimeError('private SMTP detail')):
            response = self.signup()
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private SMTP', response.content.decode())
        pending = User.objects.get(); old_hash = pending.password
        self.assertFalse(pending.is_active)
        self.assertEqual(self.signup().status_code, 201)
        pending.refresh_from_db(); self.assertEqual(pending.password, old_hash)
        self.assertEqual(User.objects.count(), 1)
        bad = self.send(self.client, '/api/accounts/signup', {'email': pending.email, 'password': 'Different-secret!38'})
        self.assertEqual(bad.status_code, 409)
        self.assertEqual(len(mail.outbox), 1)

    def test_zero_deliveries_is_an_error_and_resend_recovers(self):
        with patch('accounts.views.send_mail', return_value=0):
            self.assertEqual(self.signup().json()['error']['code'], 'email_delivery')
        response = self.send(self.client, '/api/accounts/resend-verification', {'email': 'owner@example.test', 'intent': {'plan': 'pro', 'billing': 'monthly'}})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.link()['plan'], 'pro')
        self.assertEqual(len(mail.outbox), 1)

    def test_expired_wrong_purpose_and_replayed_verification_are_rejected(self):
        self.signup(); data = self.link()
        with patch.object(verification_token, '_now', return_value=verification_token._now() + timedelta(hours=2)):
            self.assertEqual(self.send(self.client, '/api/accounts/verify', data).status_code, 400)
        self.assertFalse(User.objects.get().is_active)
        self.assertEqual(self.send(self.client, '/api/accounts/reset-confirm', {**data, 'password': self.secret}).status_code, 400)
        self.assertEqual(self.send(self.client, '/api/accounts/verify', data).status_code, 200)
        self.assertEqual(self.send(self.client, '/api/accounts/verify', data).status_code, 400)
        result = self.send(self.client, '/api/accounts/login', {'email': 'owner@example.test', 'password': self.secret})
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.json()['user']['emailVerified'])

    def test_disabled_verified_account_cannot_be_reactivated_by_resend(self):
        User.objects.create_user('owner@example.test', self.secret, is_active=False, email_verified=True)
        response = self.send(self.client, '/api/accounts/login', {'email': 'owner@example.test', 'password': self.secret})
        self.assertEqual(response.json()['error']['code'], 'invalid_credentials')
        self.assertEqual(self.send(self.client, '/api/accounts/resend-verification', {'email': 'owner@example.test'}).status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertFalse(User.objects.get().is_active)

    def test_session_reports_registration_status_and_closed_signup_creates_nothing(self):
        self.assertTrue(self.client.get('/api/accounts/session').json()['registrationOpen'])
        with override_settings(REGISTRATION_OPEN=False):
            self.assertFalse(self.client.get('/api/accounts/session').json()['registrationOpen'])
            self.assertEqual(self.signup().status_code, 503)
        self.assertEqual(User.objects.count(), 0)

    def test_reset_mail_contains_same_validated_destination(self):
        User.objects.create_user('owner@example.test', self.secret, is_active=True, email_verified=True)
        self.send(self.client, '/api/accounts/reset', {'email': 'owner@example.test', 'intent': {'project': 'project-1', 'plan': 'pro'}})
        self.assertEqual(self.link()['project'], 'project-1')
        self.assertEqual(self.link()['flow'], 'recovery')

    def test_email_intent_drops_invalid_and_oversized_values(self):
        self.assertEqual(email_intent({'intent': 'bad'}), {})
        self.assertEqual(email_intent({'intent': {'template': '../../secrets', 'plan': 'enterprise', 'billing': 'daily', 'color': 'javascript:', 'idea': 'x'*1201, 'project': 42, 'next': '//evil', 'draft': '../../secrets'}}), {})
