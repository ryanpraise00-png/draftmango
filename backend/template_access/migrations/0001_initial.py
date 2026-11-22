import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceClient',
            fields=[
                ('client_id', models.CharField(max_length=80, primary_key=True, serialize=False)),
                ('secret_hash', models.CharField(max_length=64)),
                ('scopes', models.JSONField(default=list)),
                ('active', models.BooleanField(default=True)),
                ('revision', models.PositiveIntegerField(default=1)),
                ('expires_at', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='AccessToken',
            fields=[
                ('digest', models.CharField(max_length=64, primary_key=True, serialize=False)),
                ('revision', models.PositiveIntegerField()),
                ('scopes', models.JSONField(default=list)),
                ('resource', models.URLField(max_length=300)),
                ('expires_at', models.DateTimeField(db_index=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='template_access.serviceclient')),
            ],
        ),
    ]
