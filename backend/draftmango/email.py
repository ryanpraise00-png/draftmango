from django.core.mail.backends.base import BaseEmailBackend


class UnconfiguredEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if email_messages:
            raise RuntimeError('Configure production SMTP before sending mail.')
        return 0
