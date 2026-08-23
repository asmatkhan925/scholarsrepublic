"""Backfill application_fee_status from existing data.

The old boolean `application_fee_required` defaulted to False for every record,
which conflated "confirmed free" with "not stated". This migration classifies
existing scholarships conservatively:

- default stays "unknown" (we genuinely do not know for most records);
- records whose body text clearly mentions an application fee become "paid";
- `application_fee_required` is kept consistent with the new status.

Nothing is marked "free" here, because the old data never actually confirmed a
zero fee -- an admin must confirm that going forward.
"""
from django.db import migrations
from django.db.models import Q

FEE_PHRASES = [
    "application fee",
    "pay the fee",
    "processing fee",
    "non-refundable fee",
    "registration fee",
]

# Phrases that indicate the fee is explicitly waived / absent, so we do NOT
# mislabel a "no application fee" sentence as paid.
FREE_PHRASES = [
    "no application fee",
    "application fee is waived",
    "fee waiver",
    "free of charge",
    "no fee",
]


def backfill(apps, schema_editor):
    Opportunity = apps.get_model("opportunities", "Opportunity")

    text_fields = ["how_to_apply", "eligibility", "description", "benefits"]

    fee_q = Q()
    for phrase in FEE_PHRASES:
        for field in text_fields:
            fee_q |= Q(**{f"{field}__icontains": phrase})

    candidates = Opportunity.objects.filter(fee_q)

    paid_ids = []
    for opp in candidates.iterator():
        blob = " ".join(
            (getattr(opp, f, "") or "").lower() for f in text_fields
        )
        mentions_fee = any(p in blob for p in FEE_PHRASES)
        mentions_free = any(p in blob for p in FREE_PHRASES)
        # Only classify as paid when a fee is mentioned and it is not clearly
        # described as waived/absent.
        if mentions_fee and not mentions_free:
            paid_ids.append(opp.pk)

    if paid_ids:
        Opportunity.objects.filter(pk__in=paid_ids).update(
            application_fee_status="paid",
            application_fee_required=True,
        )


def reverse(apps, schema_editor):
    Opportunity = apps.get_model("opportunities", "Opportunity")
    Opportunity.objects.update(application_fee_status="unknown")


class Migration(migrations.Migration):
    dependencies = [
        ("opportunities", "0028_opportunity_application_fee_status"),
    ]

    operations = [
        migrations.RunPython(backfill, reverse),
    ]
