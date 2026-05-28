from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("opportunities", "0014_alter_opportunitydeadlinechecklog_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="OpportunitySourceLinkCorrectionLog",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("old_official_url", models.TextField(blank=True)),
                ("old_source_url", models.TextField(blank=True)),
                ("old_application_url", models.TextField(blank=True)),
                ("suggested_official_url", models.TextField(blank=True)),
                ("suggested_source_url", models.TextField(blank=True)),
                ("suggested_application_url", models.TextField(blank=True)),
                ("reason", models.TextField(blank=True)),
                ("evidence_url", models.TextField(blank=True)),
                ("applied", models.BooleanField(db_index=True, default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "opportunity",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="source_link_correction_logs",
                        to="opportunities.opportunity",
                    ),
                ),
            ],
            options={
                "ordering": ("-created_at",),
                "indexes": [
                    models.Index(fields=["applied"], name="opportuniti_applied_3c43ed_idx"),
                    models.Index(fields=["created_at"], name="opportuniti_created_a10c86_idx"),
                ],
            },
        ),
    ]
