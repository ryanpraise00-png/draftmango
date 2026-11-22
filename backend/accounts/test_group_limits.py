
from django.core.cache import cache
from django.test import SimpleTestCase, RequestFactory, override_settings
from accounts.views import throttle, APIError

@override_settings(CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class GroupRateLimitTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.request = RequestFactory().get('/', REMOTE_ADDR='198.51.100.8')
    def test_fifteen_distinct_testers_share_a_network(self):
        for i in range(15):
            throttle(self.request, 'signup', f'tester-{i}@example.test', limit=8, seconds=3600, network_limit=64)
    def test_per_email_limit_survives_network_changes(self):
        for i in range(8):
            request = RequestFactory().get('/', REMOTE_ADDR=f'198.51.100.{i+1}')
            throttle(request, 'signup', 'same@example.test', limit=8, seconds=3600, network_limit=64)
        with self.assertRaises(APIError) as caught:
            throttle(self.request, 'signup', 'same@example.test', limit=8, seconds=3600, network_limit=64)
        self.assertEqual(caught.exception.status, 429)
    def test_network_limit_still_blocks_excessive_distinct_emails(self):
        for i in range(64):
            throttle(self.request, 'signup', f'tester-{i}@example.test', limit=8, seconds=3600, network_limit=64)
        with self.assertRaises(APIError):
            throttle(self.request, 'signup', 'extra@example.test', limit=8, seconds=3600, network_limit=64)
