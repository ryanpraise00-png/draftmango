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
        self.clients = []
        for n in range(3):
            user = User.objects.create_user(f'user{n}@example.test', 'A-test-mango-phrase!29')
            client = Client(); client.force_login(user); self.clients.append(client)

    def call(self, client, action='acquire', kind='build', token=TOKEN, hold=60):
        return client.post('/internal/limits', json.dumps({'action': action, 'kind': kind, 'hold': hold}), content_type='application/json', HTTP_X_DRAFTMANGO_INTERNAL=token)

    def test_private_token_and_session_are_required(self):
        self.assertEqual(self.call(self.clients[0], token='wrong').status_code, 404)
        self.assertEqual(self.clients[0].get('/internal/limits', HTTP_X_DRAFTMANGO_INTERNAL=TOKEN).status_code, 404)
        self.assertEqual(self.call(Client()).status_code, 401)
        with override_settings(BUILD_TOKEN='short'):
            self.assertEqual(self.call(self.clients[0], token='short').status_code, 404)

    def test_removed_generation_kind_is_rejected(self):
        for action in ['acquire', 'release']:
            self.assertEqual(self.call(self.clients[0], action, kind='generate').status_code, 400)

    def test_one_compilation_per_account_and_release(self):
        client = self.clients[0]
        self.assertEqual(self.call(client).status_code, 200)
        busy = self.call(client)
        self.assertEqual((busy.status_code, busy.json()['error']['code']), (429, 'build_busy'))
        self.assertEqual(self.call(client, 'release').status_code, 200)
        self.assertEqual(self.call(client).status_code, 200)

    def test_accounts_compile_independently(self):
        for client in self.clients:
            self.assertEqual(self.call(client).status_code, 200)

    def test_thirty_starts_per_minute_and_refusal_does_not_stick(self):
        client = self.clients[0]
        with mock.patch('accounts.limits.time.time', return_value=6000.0):
            for _ in range(30):
                self.assertEqual(self.call(client).status_code, 200)
                self.call(client, 'release')
            self.assertEqual(self.call(client).status_code, 429)
        with mock.patch('accounts.limits.time.time', return_value=6060.0):
            self.assertEqual(self.call(client).status_code, 200)

    def test_orphaned_compilation_lock_has_a_bounded_lifetime(self):
        with mock.patch('accounts.limits.cache.add', wraps=cache.add) as add:
            self.assertEqual(self.call(self.clients[0]).status_code, 200)
            busy_call = next(call for call in add.call_args_list if ':busy:' in call.args[0])
            self.assertEqual(busy_call.args[2], 120)
