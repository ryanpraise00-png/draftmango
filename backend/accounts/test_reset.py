import json
import tempfile
from io import StringIO
from pathlib import Path
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from .models import User, Project

class ResetProjectsTests(TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.data = Path(self.folder.name)
        self.owner = User.objects.create_user('owner@example.test', 'A-test-mango-phrase!29')
        self.other = User.objects.create_user('other@example.test', 'A-test-mango-phrase!29')
        for n in range(3):
            Project.objects.create(owner=self.owner, project_id=f'p{n}', document={'id': f'p{n}', 'title': f'P{n}', 'history': [{'design': {}}]})
        Project.objects.create(owner=self.other, project_id='keep', document={'id': 'keep', 'title': 'Keep', 'history': [{'design': {}}]})
        self.doc = self.data / 'test.json'
        self.doc.write_text(json.dumps({'id': 'test-1', 'title': 'Test', 'history': [{'design': {'kind': 'blank'}}]}))

    def tearDown(self):
        self.folder.cleanup()

    def run_reset(self, *args):
        with override_settings(DATA_DIR=self.data):
            call_command('reset_projects', *args, stdout=StringIO())

    def test_backs_up_then_replaces_only_that_accounts_projects(self):
        self.run_reset('--email', 'OWNER@example.test', '--document', str(self.doc), '--yes')
        self.assertEqual(list(Project.objects.filter(owner=self.owner).values_list('project_id', 'version')), [('test-1', 1)])
        self.assertTrue(Project.objects.filter(owner=self.other, project_id='keep').exists())
        backups = list((self.data / 'backups').glob('projects-*.json'))
        self.assertEqual(len(backups), 1)
        saved = json.loads(backups[0].read_text(encoding='utf-8'))
        self.assertEqual(saved['account'], 'owner@example.test')
        self.assertEqual(sorted(p['id'] for p in saved['projects']), ['p0', 'p1', 'p2'])

    def test_refuses_ambiguous_account_unknown_email_bad_document_and_unconfirmed_runs(self):
        with self.assertRaises(CommandError):
            self.run_reset('--yes')
        with self.assertRaises(CommandError):
            self.run_reset('--email', 'nobody@example.test', '--yes')
        bad = self.data / 'bad.json'; bad.write_text('{"id": "x"}')
        with self.assertRaises(CommandError):
            self.run_reset('--email', 'owner@example.test', '--document', str(bad), '--yes')
        from unittest import mock
        with mock.patch('builtins.input', return_value='no'), self.assertRaises(CommandError):
            self.run_reset('--email', 'owner@example.test')
        self.assertEqual(Project.objects.filter(owner=self.owner).count(), 3)
        self.assertFalse((self.data / 'backups').exists())
