from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):
    dependencies = [('accounts', '0001_initial')]
    operations = [
        migrations.AddField(model_name='user', name='workspace_preferences', field=models.JSONField(default=dict, blank=True)),
        migrations.CreateModel(name='WorkspaceActivity', fields=[
            ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
            ('event_id', models.CharField(max_length=80)), ('project_id', models.CharField(max_length=80, blank=True)),
            ('kind', models.CharField(max_length=30)), ('success', models.BooleanField(default=True)),
            ('created_at', models.DateTimeField(auto_now_add=True)),
            ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
        ], options={'constraints': [models.UniqueConstraint(fields=('owner', 'event_id'), name='activity_owner_event_unique')]}),
    ]
