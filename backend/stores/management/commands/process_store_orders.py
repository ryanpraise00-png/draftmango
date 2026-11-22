import time
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import close_old_connections
from stores.models import Order
from stores import services, payments


class Command(BaseCommand):
    help = 'Reconcile store checkouts and retry paid-order receipts without running customer code.'

    def add_arguments(self, parser):
        parser.add_argument('--loop', action='store_true')

    def handle(self, *args, **options):
        while True:
            close_old_connections()
            if settings.STORES_ENABLED and payments.configured():
                for order in Order.objects.filter(status='pending', payment_mode=settings.STORE_STRIPE_MODE).order_by('last_checked_at')[:100]:
                    try:
                        if not order.checkout_id:
                            # Repeat exactly the original idempotent creation after an ambiguous timeout.
                            order = services.ensure_checkout(order, services.origin(order.store))
                        services.reconcile(order)
                    except Exception:
                        # Keep the reservation until Stripe confirms expiry; never release on a local timeout.
                        self.stderr.write('A store checkout needs another reconciliation attempt.')
                    finally:
                        Order.objects.filter(pk=order.pk).update(last_checked_at=timezone.now())
                for order in Order.objects.filter(status='paid', email_sent=False).order_by('last_checked_at')[:100]:
                    try: services.receipt(order)
                    except Exception: self.stderr.write('A store receipt is pending retry.')
                    finally: Order.objects.filter(pk=order.pk).update(last_checked_at=timezone.now())
            if not options['loop']: break
            time.sleep(30)
