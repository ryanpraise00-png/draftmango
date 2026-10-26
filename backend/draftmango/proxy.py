import ipaddress
from django.conf import settings


class PrivateProxyMiddleware:
    """Only enable on the private backend network. Node overwrites this header."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.PRODUCTION:
            value = request.META.get('HTTP_X_DRAFTMANGO_CLIENT_IP', '')
            try:
                request.META['REMOTE_ADDR'] = str(ipaddress.ip_address(value))
            except ValueError:
                pass
        return self.get_response(request)
