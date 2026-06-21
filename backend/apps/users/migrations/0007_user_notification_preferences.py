from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_user_email_verified_default_false"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="notify_weekly_digest",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="user",
            name="notify_deadline_reminder",
            field=models.BooleanField(default=True),
        ),
    ]
