from datetime import datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.opportunities.models import (
    OpportunityCollection,
    OpportunityCollectionSocialPostPlan,
)
from apps.opportunities.services.social_collections import evaluate_collection_auto_approval


ACTIVE_COLLECTION_PLAN_STATUSES = [
    OpportunityCollectionSocialPostPlan.Status.DRAFT,
    OpportunityCollectionSocialPostPlan.Status.READY,
    OpportunityCollectionSocialPostPlan.Status.PAUSED,
    OpportunityCollectionSocialPostPlan.Status.FAILED,
]
DEFAULT_PLATFORM = "facebook"
DEFAULT_PER_DAY = 3
DEFAULT_POST_TIME = time(hour=9)


def build_deadline_window_caption_intro(deadline_window, post_type):
    deadline_window = str(deadline_window or "missing").strip()
    post_type = str(post_type or "opportunity").strip()
    is_collection = post_type == "collection"

    if is_collection:
        if deadline_window == "urgent":
            return (
                "Scholarships closing soon: review this Scholars Republic "
                "collection before the listed deadlines."
            )
        if deadline_window == "soon":
            return (
                "Timely scholarship collection: students still have time to "
                "review eligibility and apply early."
            )
        if deadline_window == "advance_notice":
            return (
                "Scholarships to prepare for early: use this Scholars Republic "
                "collection to review requirements and plan documents."
            )
        if deadline_window == "early_awareness":
            return (
                "Scholarship collection for planning ahead: save this list "
                "and start checking requirements early."
            )
        return (
            "New scholarship collection on Scholars Republic: review the list "
            "and official application details."
        )

    if deadline_window == "urgent":
        return (
            "Deadline approaching. Apply before the deadline after reviewing "
            "the eligibility and official application details."
        )
    if deadline_window == "soon":
        return (
            "This is a timely scholarship opportunity. Students still have "
            "time to prepare, review eligibility, and apply early."
        )
    if deadline_window == "advance_notice":
        return (
            "Plan ahead for this scholarship. Start preparing documents early "
            "and review the requirements before applying."
        )
    if deadline_window == "early_awareness":
        return (
            "Scholarship planning opportunity. Save this on Scholars Republic "
            "and begin preparing before the deadline gets close."
        )
    return (
        "Scholarship opportunity on Scholars Republic. Review the details, "
        "eligibility, and official application instructions."
    )


def collection_public_url(collection):
    base_url = getattr(settings, "FRONTEND_URL", "https://scholarsrepublic.org").rstrip("/")
    if base_url.startswith(("http://localhost", "http://127.0.0.1")):
        base_url = "https://scholarsrepublic.org"
    return f"{base_url}/scholarships/collections/{collection.slug}"


def _provider_name(opportunity):
    return (
        opportunity.university_name
        or opportunity.provider_name
        or opportunity.company_name
        or "Provider not listed"
    )


def _deadline_text(opportunity):
    if opportunity.deadline:
        return opportunity.deadline.isoformat()
    if opportunity.is_rolling_deadline:
        return "rolling deadline"
    return "deadline not listed"


def _deadline_window(deadline):
    if not deadline:
        return "missing"
    days_left = (deadline - timezone.localdate()).days
    if days_left < 0:
        return "expired"
    if days_left <= 3:
        return "urgent"
    if days_left <= 10:
        return "soon"
    if days_left <= 21:
        return "advance_notice"
    if days_left <= 45:
        return "early_awareness"
    return "far"


def _collection_deadline_window(items):
    nearest_deadline = None
    for item in items:
        opportunity = item.opportunity
        if not opportunity.deadline or opportunity.is_rolling_deadline:
            continue
        if nearest_deadline is None or opportunity.deadline < nearest_deadline:
            nearest_deadline = opportunity.deadline
    return _deadline_window(nearest_deadline)


def build_collection_social_post_text(collection):
    url = collection_public_url(collection)
    items = list(
        collection.items.select_related("opportunity").order_by("position", "id")[:5]
    )
    deadline_window = _collection_deadline_window(items)

    lines = [
        f"Scholars Republic collection: {collection.title}",
        "",
        build_deadline_window_caption_intro(deadline_window, "collection"),
        "",
        (
            "Explore this scholarship list with deadlines, providers, and application "
            "links on Scholars Republic."
        ),
    ]

    if items:
        lines.extend(["", "Included scholarships:"])
        for item in items:
            opportunity = item.opportunity
            lines.append(
                f"- {opportunity.title} - {_provider_name(opportunity)}; "
                f"deadline: {_deadline_text(opportunity)}"
            )

    lines.extend(
        [
            "",
            (
                "Students should verify eligibility, deadlines, and application details "
                "from official sources before applying."
            ),
            "",
            "View the full collection:",
            url,
        ]
    )
    return "\n".join(lines)


def _next_post_at(index, *, schedule_now=False, start_date=None, per_day=DEFAULT_PER_DAY, now=None):
    now = now or timezone.now()
    if schedule_now:
        return now

    per_day = max(1, int(per_day or DEFAULT_PER_DAY))
    if start_date is None:
        start_date = timezone.localdate(now) + timedelta(days=1)

    day_offset = index // per_day
    slot = index % per_day
    scheduled_time = time(hour=min(DEFAULT_POST_TIME.hour + slot * 3, 21))
    scheduled_datetime = datetime.combine(start_date + timedelta(days=day_offset), scheduled_time)
    return timezone.make_aware(scheduled_datetime, timezone.get_current_timezone())


def has_active_collection_social_post_plan(collection, platform=DEFAULT_PLATFORM):
    return OpportunityCollectionSocialPostPlan.objects.filter(
        collection=collection,
        platform=platform,
        status__in=ACTIVE_COLLECTION_PLAN_STATUSES,
    ).exists()


def collection_is_eligible_for_social_post_plan(
    collection,
    *,
    platform=DEFAULT_PLATFORM,
    force=False,
    now=None,
):
    blockers = []
    item_count = collection.items.count()

    if collection.status != OpportunityCollection.Status.APPROVED:
        blockers.append("collection_not_approved")
    if not collection.slug:
        blockers.append("missing_public_slug")
    if not force and has_active_collection_social_post_plan(collection, platform=platform):
        blockers.append("active_plan_exists")
    if not 3 <= item_count <= 5:
        blockers.append("item_count_out_of_range")

    evaluation = evaluate_collection_auto_approval(collection, force=True, now=now)
    if not evaluation["can_auto_approve"]:
        blockers.extend(evaluation["blockers"])

    return {
        "eligible": not blockers,
        "blockers": blockers,
        "evaluation": evaluation,
        "item_count": item_count,
    }


@transaction.atomic
def create_collection_social_post_plan(
    collection,
    *,
    platform=DEFAULT_PLATFORM,
    status=OpportunityCollectionSocialPostPlan.Status.READY,
    next_post_at=None,
    force=False,
    dry_run=False,
    now=None,
):
    eligibility = collection_is_eligible_for_social_post_plan(
        collection,
        platform=platform,
        force=force,
        now=now,
    )
    if not eligibility["eligible"]:
        return {
            "created": False,
            "dry_run": dry_run,
            "collection": collection,
            "plan": None,
            "eligibility": eligibility,
        }

    post_text = build_collection_social_post_text(collection)
    link_url = collection_public_url(collection)
    plan_data = {
        "collection": collection,
        "platform": platform,
        "status": status,
        "post_text": post_text,
        "link_url": link_url,
        "image_url": "",
        "image_source": "",
        "next_post_at": next_post_at,
        "priority_score": int(collection.priority_score or eligibility["evaluation"]["score"] or 0),
    }
    if dry_run:
        plan = OpportunityCollectionSocialPostPlan(**plan_data)
        return {
            "created": True,
            "dry_run": True,
            "collection": collection,
            "plan": plan,
            "eligibility": eligibility,
        }

    plan = OpportunityCollectionSocialPostPlan.objects.create(**plan_data)

    return {
        "created": True,
        "dry_run": False,
        "collection": collection,
        "plan": plan,
        "eligibility": eligibility,
    }


def create_due_collection_social_post_plans(
    *,
    dry_run=False,
    limit=None,
    status=OpportunityCollection.Status.APPROVED,
    collection_id=None,
    schedule_now=False,
    start_date=None,
    per_day=DEFAULT_PER_DAY,
    force=False,
    platform=DEFAULT_PLATFORM,
    now=None,
):
    if limit is not None and limit < 1:
        raise ValueError("limit must be greater than 0.")
    if per_day < 1:
        raise ValueError("per_day must be greater than 0.")
    if status not in OpportunityCollection.Status.values:
        raise ValueError("status is not valid.")

    now = now or timezone.now()
    queryset = (
        OpportunityCollection.objects.prefetch_related("items__opportunity")
        .filter(status=status)
        .order_by("-priority_score", "id")
    )
    if collection_id:
        queryset = queryset.filter(pk=collection_id)

    collections = list(queryset)
    results = []
    created_count = 0
    scheduled_index = 0
    for collection in collections:
        if limit and created_count >= limit:
            break

        next_post_at = _next_post_at(
            scheduled_index,
            schedule_now=schedule_now,
            start_date=start_date,
            per_day=per_day,
            now=now,
        )
        result = create_collection_social_post_plan(
            collection,
            platform=platform,
            next_post_at=next_post_at,
            force=force,
            dry_run=dry_run,
            now=now,
        )
        results.append(result)
        if result["created"]:
            created_count += 1
            scheduled_index += 1

    return {
        "ok": True,
        "dry_run": dry_run,
        "evaluated_count": len(results),
        "created_count": created_count,
        "results": results,
    }
