from unittest.mock import patch
from django.test import RequestFactory, SimpleTestCase, TestCase, override_settings
from django.core import mail
from draftmango.proxy import PrivateProxyMiddleware
from .models import User
from . import tests as account_tests


class HostingTests(TestCase):
    setUp = account_tests.AccountTests.setUp
    csrf = account_tests.AccountTests.csrf
    send = account_tests.AccountTests.send
    signup = account_tests.AccountTests.signup
    secret = account_tests.AccountTests.secret

    @override_settings(REGISTRATION_OPEN=False)
    def test_closed_registration_never_creates_an_account(self):
        response = self.signup()
        self.assertEqual(response.status_code, 503)
        self.assertFalse(User.objects.exists())

    @override_settings(EMAIL_BACKEND='draftmango.email.UnconfiguredEmailBackend')
    def test_missing_production_smtp_cannot_silently_write_mail_to_disk(self):
        with self.assertRaises(RuntimeError):
            mail.send_mail('Test', 'Body', 'hello@draftmango.com', ['owner@example.test'])

    def test_health_reports_dependency_failure_without_details(self):
        self.assertEqual(self.client.get('/healthz').status_code, 200)
        with patch('draftmango.health.cache.set', side_effect=RuntimeError('private details')):
            result = self.client.get('/healthz')
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('private', result.content.decode())


class ProxyTests(SimpleTestCase):
    @override_settings(PRODUCTION=True)
    def test_private_proxy_uses_validated_ip_only(self):
        request = RequestFactory().get('/', HTTP_X_DRAFTMANGO_CLIENT_IP='198.51.100.8', HTTP_X_FORWARDED_FOR='evil')
        middleware = PrivateProxyMiddleware(lambda req: req.META['REMOTE_ADDR'])
        self.assertEqual(middleware(request), '198.51.100.8')
        request = RequestFactory().get('/', HTTP_X_DRAFTMANGO_CLIENT_IP='bad')
        self.assertEqual(middleware(request), '127.0.0.1')

    @override_settings(PRODUCTION=False)
    def test_local_backend_ignores_proxy_headers(self):
        request = RequestFactory().get('/', HTTP_X_DRAFTMANGO_CLIENT_IP='198.51.100.8')
        self.assertEqual(PrivateProxyMiddleware(lambda req: req.META['REMOTE_ADDR'])(request), '127.0.0.1')
