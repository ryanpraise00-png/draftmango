import json
from unittest import mock
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from .models import User

TOKEN = 'limits-test-token-' + 'x' * 32

@override_settings(BUILD_TOKEN=TOKEN)
class SharedLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.users = [User.objects.create_user(f'user{n}@example.test', 'A-test-mango-phrase!29') for n in range(4)]
        self.clients = []
        for user in self.users:
            client = Client(); client.force_login(user); self.clients.append(client)

    def call(self, client, action='acquire', kind='generate', token=TOKEN, hold=900):
        return client.post('/internal/limits', json.dumps({'action': action, 'kind': kind, 'hold': hold}), content_type='application/json', HTTP_X_DRAFTMANGO_INTERNAL=token)

    def test_endpoint_is_hidden_without_the_private_token_and_needs_a_session(self):
        self.assertEqual(self.call(self.clients[0], token='wrong').status_code, 404)
        self.assertEqual(self.call(self.clients[0], token='').status_code, 404)
        self.assertEqual(self.clients[0].get('/internal/limits', HTTP_X_DRAFTMANGO_INTERNAL=TOKEN).status_code, 404)
        self.assertEqual(self.call(Client()).status_code, 401)
        with override_settings(BUILD_TOKEN='short'):
            self.assertEqual(self.call(self.clients[0], token='short').status_code, 404)
        self.assertEqual(self.call(self.clients[0], kind='unknown').status_code, 400)

    def test_one_generation_per_account_released_on_finish(self):
        first = self.clients[0]
        self.assertEqual(self.call(first).status_code, 200)
        busy = self.call(first)
        self.assertEqual(busy.status_code, 429)
        self.assertIn('Another draft', busy.json()['error']['message'])
        self.assertEqual(self.call(first, 'release').status_code, 200)
        cache.delete('limit:generate:cooldown:' + str(self.users[0].pk))
        self.assertEqual(self.call(first).status_code, 200)

    def test_site_wide_cap_of_two_generations_frees_slots_on_release(self):
        self.assertEqual(self.call(self.clients[0]).status_code, 200)
        self.assertEqual(self.call(self.clients[1]).status_code, 200)
        self.assertEqual(self.call(self.clients[2]).status_code, 429)
        self.call(self.clients[0], 'release')
        self.assertEqual(self.call(self.clients[3]).status_code, 200)

    def test_refused_start_does_not_leave_a_stuck_lock(self):
        self.call(self.clients[0]); self.call(self.clients[1])
        self.assertEqual(self.call(self.clients[2]).status_code, 429)
        self.call(self.clients[0], 'release'); self.call(self.clients[1], 'release')
        cache.delete('limit:generate:cooldown:' + str(self.users[2].pk))
        self.assertEqual(self.call(self.clients[2]).status_code, 200)

    def test_twenty_generation_starts_per_ten_minutes(self):
        client, user = self.clients[0], str(self.users[0].pk)
        with mock.patch('accounts.limits.time.time', return_value=6000.0):
            for _ in range(20):
                self.assertEqual(self.call(client).status_code, 200)
                self.call(client, 'release'); cache.delete('limit:generate:cooldown:' + user)
            self.assertEqual(self.call(client).status_code, 429)
        with mock.patch('accounts.limits.time.time', return_value=6600.0):
            self.assertEqual(self.call(client).status_code, 200)

    def test_builds_have_their_own_limits(self):
        client = self.clients[0]
        self.assertEqual(self.call(client).status_code, 200)
        self.assertEqual(self.call(client, kind='build', hold=30).status_code, 200)
        busy = self.call(client, kind='build', hold=30)
        self.assertEqual((busy.status_code, busy.json()['error']['code']), (429, 'build_busy'))
        for client in self.clients[1:]:
            self.assertEqual(self.call(client, kind='build', hold=30).status_code, 200)
