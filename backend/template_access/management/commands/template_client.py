"""Provision/rotate/revoke a backend identity without printing its secret."""
import json
import os
import secrets
from datetime import timedelta
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from template_access.models import ServiceClient, AccessToken
from template_access.views import CLIENT_ID, SCOPES, digest, resource


class Command(BaseCommand):
    help = 'Manage template-engine backend credentials; never place them in a desktop app.'

    def add_arguments(self, parser):
        parser.add_argument('action', choices=['create', 'rotate', 'revoke', 'status'])
        parser.add_argument('client_id')
        parser.add_argument('--secret-file', help='New absolute private file outside the repository; created with mode 0600.')
        parser.add_argument('--scopes', nargs='+', choices=SCOPES)
        parser.add_argument('--days', type=int, default=90)

    def handle(self, *args, **options):
        name, action = options['client_id'], options['action']
        if not CLIENT_ID.fullmatch(name) or not 1 <= options['days'] <= 365:
            raise CommandError('Use a lowercase client id (2–80 characters) and a lifetime of 1–365 days.')
        target = None
        if action in ('create', 'rotate'):
            target = Path(options['secret_file'] or '')
            if not target.is_absolute() or target.resolve().is_relative_to(settings.BASE_DIR.resolve()):
                raise CommandError('Supply a new absolute --secret-file outside the repository, in a private directory.')
            if target.exists():
                raise CommandError('Secret file already exists; choose a new path.')
        written = False
        try:
            with transaction.atomic():
                client = ServiceClient.objects.select_for_update().filter(pk=name).first()
                if action == 'create' and client:
                    raise CommandError('Client already exists. Use rotate.')
                if action != 'create' and not client:
                    raise CommandError('Client does not exist.')
                if action == 'status':
                    self.stdout.write(json.dumps({'client_id': name, 'active': client.active, 'expires_at': client.expires_at.isoformat(), 'scopes': client.scopes}))
                    return
                if action == 'revoke':
                    client.active = False
                    client.revision += 1
                    client.save(update_fields=['active', 'revision'])
                    AccessToken.objects.filter(client=client).delete()
                else:
                    raw = secrets.token_urlsafe(32)
                    client = client or ServiceClient(client_id=name)
                    client.secret_hash = digest(raw)
                    client.expires_at = timezone.now() + timedelta(days=options['days'])
                    client.scopes = sorted(set(options['scopes'] or client.scopes or SCOPES))
                    client.active = True
                    client.revision += 1
                    client.save()
                    AccessToken.objects.filter(client=client).delete()
                    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
                    with os.fdopen(os.open(target, flags, 0o600), 'w', encoding='utf-8') as output:
                        written = True
                        json.dump({'client_id': name, 'client_secret': raw, 'token_endpoint': settings.APP_ORIGIN + '/api/template-access/token', 'resource': resource(), 'scope': ' '.join(client.scopes), 'expires_at': client.expires_at.isoformat()}, output, indent=2)
                        output.write('\n')
        except Exception:
            if written:
                target.unlink(missing_ok=True)
            raise
        self.stdout.write(f'{name}: {action} complete.' + (f' Credentials saved to {target}.' if target else ' Existing access tokens are invalid.'))
