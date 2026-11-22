import uuid
from django.utils import timezone
from django.db import models


class Store(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.OneToOneField('accounts.Project', on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    currency = models.CharField(max_length=3, default='usd')
    support_email = models.EmailField(blank=True)
    country = models.CharField(max_length=2, default='US')
    shipping_countries = models.JSONField(default=list)
    shipping_amount = models.PositiveIntegerField(default=0)
    tax_basis_points = models.PositiveIntegerField(default=0)
    policies = models.JSONField(default=dict)
    accepting_orders = models.BooleanField(default=False)
    stripe_account = models.CharField(max_length=100, blank=True)
    payment_mode = models.CharField(max_length=8, default='test')
    charges_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=80, blank=True)
    image = models.URLField(max_length=2000, blank=True)
    active = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class Variant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    label = models.CharField(max_length=100, default='Standard')
    sku = models.CharField(max_length=80)
    price = models.PositiveIntegerField()
    stock = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['product', 'sku'], name='store_product_sku')]


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='customers')
    email = models.EmailField()
    name = models.CharField(max_length=120, blank=True)
    password = models.CharField(max_length=128)
    verified = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['store', 'email'], name='store_customer_email')]


class CustomerToken(models.Model):
    digest = models.CharField(max_length=64, primary_key=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    purpose = models.CharField(max_length=10)
    expires_at = models.DateTimeField()


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name='orders')
    customer = models.ForeignKey(Customer, null=True, on_delete=models.SET_NULL)
    email = models.EmailField()
    address = models.JSONField(default=dict)
    items = models.JSONField(default=list)
    subtotal = models.PositiveIntegerField()
    shipping = models.PositiveIntegerField()
    tax = models.PositiveIntegerField()
    total = models.PositiveIntegerField()
    currency = models.CharField(max_length=3)
    status = models.CharField(max_length=20, default='pending')
    fulfilment = models.CharField(max_length=20, default='unfulfilled')
    tracking_url = models.URLField(max_length=2000, blank=True)
    checkout_id = models.CharField(max_length=100, blank=True)
    checkout_url = models.URLField(max_length=2000, blank=True)
    checkout_uncertain = models.BooleanField(default=False)
    payment_id = models.CharField(max_length=100, blank=True)
    payment_account = models.CharField(max_length=100)
    payment_mode = models.CharField(max_length=8)
    request_key = models.CharField(max_length=64)
    request_digest = models.CharField(max_length=64)
    access_digest = models.CharField(max_length=64)
    reserved_until = models.DateTimeField()
    inventory_released = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    last_checked_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['store', 'request_key'], name='store_checkout_key')]


class PaymentEvent(models.Model):
    event_id = models.CharField(max_length=100, primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Enquiry(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='enquiries')
    email = models.EmailField()
    message = models.TextField()
    kind = models.CharField(max_length=20, default='contact')
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
