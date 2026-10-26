"""Back up, then replace one account's projects with a single fresh project.

Run through `npm run reset:projects`, which builds the replacement project with
the same browser model the workspace uses. Nothing is deleted until a JSON
backup of every project has been written to data/backups/.
"""
import json
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from accounts.models import User, Project


class Command(BaseCommand):
    help = "Back up and delete an account's projects, optionally creating one replacement project."

    def add_arguments(self, parser):
        parser.add_argument('--email', help='Account email. Optional when exactly one account exists.')
        parser.add_argument('--document', help='JSON file holding the replacement project document.')
        parser.add_argument('--yes', action='store_true', help='Confirm deletion without an interactive prompt.')

    def handle(self, *args, **options):
        user = self.account(options.get('email'))
        document = self.document(options.get('document'))
        projects = list(Project.objects.filter(owner=user).order_by('project_id'))
        self.stdout.write(f'Account {user.email}: {len(projects)} project(s) will be backed up and deleted.')
        if document:
            self.stdout.write(f'A new project "{document["title"]}" will be created.')
        if not options['yes']:
            if input('Type DELETE to continue: ').strip() != 'DELETE':
                raise CommandError('Cancelled. Nothing was changed.')
        backup = self.backup(user, projects)
        self.stdout.write(f'Backup written: {backup}')
        with transaction.atomic():
            deleted = Project.objects.filter(owner=user).delete()[1].get('accounts.Project', 0)
            if document:
                Project.objects.create(owner=user, project_id=document['id'], document=document, version=1)
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} project(s).' + (f' Created "{document["title"]}".' if document else '')))

    def account(self, email):
        if email:
            user = User.objects.filter(email=email.strip().lower()).first()
            if not user:
                raise CommandError(f'No account uses {email}.')
            return user
        users = list(User.objects.all()[:2])
        if len(users) != 1:
            raise CommandError('Pass --email: this database has ' + ('no accounts.' if not users else 'more than one account.'))
        return users[0]

    def document(self, path):
        if not path:
            return None
        try:
            value = json.loads(Path(path).read_text(encoding='utf-8'))
        except (OSError, ValueError) as error:
            raise CommandError(f'Could not read the replacement project: {error}')
        valid = isinstance(value, dict) and isinstance(value.get('id'), str) and 1 <= len(value['id']) <= 80 \
            and isinstance(value.get('title'), str) and isinstance(value.get('history'), list) and value['history']
        if not valid:
            raise CommandError('The replacement project is not a valid project document.')
        return value

    def backup(self, user, projects):
        folder = Path(settings.DATA_DIR) / 'backups'
        folder.mkdir(parents=True, exist_ok=True)
        stamp = timezone.now().strftime('%Y%m%d-%H%M%S')
        path = folder / f'projects-{stamp}.json'
        payload = {'exportedAt': timezone.now().isoformat(), 'account': user.email,
                   'projects': [{'id': row.project_id, 'version': row.version, 'updatedAt': row.updated_at.isoformat(), 'document': row.document} for row in projects]}
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding='utf-8')
        return path
