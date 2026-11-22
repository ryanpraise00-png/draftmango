from django.core.management.base import BaseCommand
from accounts.models import BisukReport
from accounts.bisuk_testing import deliver
class Command(BaseCommand):
    help='Retry persisted BISUK notification outbox; no report data is printed.'
    def handle(self,*args,**options):
        ids=BisukReport.objects.filter(submitted_at__isnull=False).exclude(email_status='sent').filter(email_attempts__lt=8).values_list('pk',flat=True)
        for report_id in ids:
            self.stdout.write(str(report_id)+': '+('sent' if deliver(report_id) else 'pending'))
