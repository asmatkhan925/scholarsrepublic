"""Backfill application_fee_status='free' for records that explicitly confirm it.

Complements 0029 (which flagged 'paid'). Only records whose body text contains an
unambiguous statement that the *application* fee is absent or waived are marked
'free'. Tuition waivers and generic "funded" language are deliberately excluded,
because they do not confirm the application fee itself. Records already marked
'paid' are never overridden.
"""
from django.db import migrations

# Application-fee-specific phrases only. Kept strict to avoid false positives
# (e.g. "full tuition waiver" is about tuition, not the application fee).
FREE_PHRASES = [
    "no application fee",
    "no application fees",
    "application fee is waived",
    "application fee waiver",
    "without any application fee",
    "there is no application fee",
    "no fee to apply",
    "no charge to apply",
    "application fee: none",
    "application fee is not required",
]

TEXT_FIELDS = ["how_to_apply", "eligibility", "description", "benefits"]


def backfill(apps, schema_editor):
    Opportunity = apps.get_model("opportunities", "Opportunity")

    free_ids = []
    for opp in Opportunity.objects.filter(application_fee_status="unknown").iterator():
        blob = " ".join((getattr(opp, f, "") or "").lower() for f in TEXT_FIELDS)
        if any(phrase in blob for phrase in FREE_PHRASES):
            free_ids.append(opp.pk)

    if free_ids:
        Opportunity.objects.filter(pk__in=free_ids).update(
            application_fee_status="free",
            application_fee_required=False,
        )


def reverse(apps, schema_editor):
    # Revert only the records this migration would have set to 'free'.
    Opportunity = apps.get_model("opportunities", "Opportunity")
    revert_ids = []
    for opp in Opportunity.objects.filter(application_fee_status="free").iterator():
        blob = " ".join((getattr(opp, f, "") or "").lower() for f in TEXT_FIELDS)
        if any(phrase in blob for phrase in FREE_PHRASES):
            revert_ids.append(opp.pk)
    if revert_ids:
        Opportunity.objects.filter(pk__in=revert_ids).update(
            application_fee_status="unknown",
        )


class Migration(migrations.Migration):
    dependencies = [
        ("opportunities", "0029_backfill_application_fee_status"),
    ]

    operations = [
        migrations.RunPython(backfill, reverse),
    ]
