import uuid
from django.db import migrations, models
import django.db.models.deletion
class Migration(migrations.Migration):
    dependencies=[('accounts','0006_bisukreport')]
    operations=[migrations.CreateModel(name='BisukScreenshot',fields=[
        ('id',models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False,serialize=False)),
        ('content',models.BinaryField()),('content_type',models.CharField(max_length=30)),
        ('byte_size',models.PositiveIntegerField()),('width',models.PositiveIntegerField()),
        ('height',models.PositiveIntegerField()),('created_at',models.DateTimeField(auto_now_add=True)),
        ('report',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name='screenshots',to='accounts.bisukreport')),
    ])]
