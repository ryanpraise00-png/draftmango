import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('An email address is required.')
        user = self.model(email=email.strip().lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.update(is_staff=True, is_superuser=True, is_active=True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    workspace_preferences = models.JSONField(default=dict, blank=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    objects = UserManager()

class Project(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    project_id = models.CharField(max_length=80)
    document = models.JSONField()
    version = models.PositiveBigIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'project_id'], name='project_owner_id_unique')]

class WorkspaceActivity(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    event_id = models.CharField(max_length=80)
    project_id = models.CharField(max_length=80, blank=True)
    kind = models.CharField(max_length=30)
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'event_id'], name='activity_owner_event_unique')]

class BillingAccount(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    mode = models.CharField(max_length=8, default='test')
    customer_id = models.CharField(max_length=100, blank=True)
    subscription_id = models.CharField(max_length=100, blank=True)
    plan = models.CharField(max_length=12, default='free')
    cadence = models.CharField(max_length=12, blank=True)
    status = models.CharField(max_length=30, default='none')
    period_end = models.DateTimeField(null=True)
    cancel_at_period_end = models.BooleanField(default=False)
    checkout_id = models.CharField(max_length=100, blank=True)
    checkout_url = models.URLField(max_length=2000, blank=True)
    checkout_expires = models.DateTimeField(null=True)
    checkout_plan = models.CharField(max_length=12, blank=True)
    checkout_cadence = models.CharField(max_length=12, blank=True)
    checkout_key = models.UUIDField(default=uuid.uuid4)
    busy_until = models.DateTimeField(null=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['owner', 'mode'], name='billing_owner_mode_unique')]

class BillingEvent(models.Model):
    event_id = models.CharField(max_length=100, unique=True)
    mode = models.CharField(max_length=8)
    kind = models.CharField(max_length=100)
    handled_at = models.DateTimeField(auto_now_add=True)

class PublishedAddress(models.Model):
    # Never recycle a former site's origin: browsers may retain its storage/workers.
    slug = models.CharField(max_length=48, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PublishedSite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.OneToOneField(Project, on_delete=models.CASCADE)
    address = models.OneToOneField(PublishedAddress, on_delete=models.PROTECT)
    revision = models.PositiveIntegerField(default=0)
    active_release = models.ForeignKey('PublishedRelease', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    updated_at = models.DateTimeField(auto_now=True)

class PublishedRelease(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    site = models.ForeignKey(PublishedSite, on_delete=models.CASCADE, related_name='releases')
    number = models.PositiveIntegerField()
    files = models.JSONField()
    digest = models.CharField(max_length=64)
    byte_size = models.PositiveIntegerField()
    project_version = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['site', 'number'], name='site_release_number_unique')]
