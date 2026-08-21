from django.db import migrations


def classify_legacy_research_leads(apps, schema_editor):
    Lead = apps.get_model("opportunities", "ScholarshipResearchLead")
    Lead.objects.filter(
        resolution="new",
        duplicate_status="duplicate",
    ).update(
        resolution="unchanged_duplicate",
        resolution_reason="Migrated from the legacy exact-duplicate classification.",
    )
    Lead.objects.filter(
        resolution="new",
        duplicate_status="possible_duplicate",
    ).update(
        resolution="needs_review",
        resolution_reason="Migrated from the legacy possible-duplicate classification.",
    )


class Migration(migrations.Migration):
    dependencies = [
        ("opportunities", "0026_scholarship_cycle_refresh"),
    ]

    operations = [
        migrations.RunPython(
            classify_legacy_research_leads,
            migrations.RunPython.noop,
        ),
    ]
