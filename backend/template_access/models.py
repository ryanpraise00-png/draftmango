"""Machine identities only: these are independent of customer accounts."""
from django.db import models


class ServiceClient(models.Model):
    client_id = models.CharField(primary_key=True, max_length=80)
    secret_hash = models.CharField(max_length=64)
    scopes = models.JSONField(default=list)
    active = models.BooleanField(default=True)
    revision = models.PositiveIntegerField(default=1)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)


class AccessToken(models.Model):
    digest = models.CharField(primary_key=True, max_length=64)
    client = models.ForeignKey(ServiceClient, on_delete=models.CASCADE)
    revision = models.PositiveIntegerField()
    scopes = models.JSONField(default=list)
    resource = models.URLField(max_length=300)
    expires_at = models.DateTimeField(db_index=True)
