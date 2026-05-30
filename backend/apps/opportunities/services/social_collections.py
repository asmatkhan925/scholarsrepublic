from collections import defaultdict
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityCollectionItem,
    OpportunitySocialPostPlan,
)


ACTIVE_COLLECTION_STATUSES = [
    OpportunityCollection.Status.DRAFT,
    OpportunityCollection.Status.READY,
    OpportunityCollection.Status.APPROVED,
]
AUTO_APPROVAL_DUPLICATE_STATUSES = [
    OpportunityCollection.Status.APPROVED,
    OpportunityCollection.Status.POSTED,
]
AUTO_APPROVAL_STRONG_TYPES = {
    OpportunityCollection.CollectionType.COUNTRY_DEGREE,
    OpportunityCollection.CollectionType.COUNTRY_FUNDING,
    OpportunityCollection.CollectionType.DEGREE_FUNDING,
    OpportunityCollection.CollectionType.FIELD,
}
AUTO_APPROVAL_STRONG_SCORE = 220
AUTO_APPROVAL_DEADLINE_WINDOW_SCORE = 250
AUTO_APPROVAL_GENERIC_TITLE_SCORE = 300
DEFAULT_MIN_SIZE = 3
DEFAULT_MAX_SIZE = 5


def _clean_label(value):
    return str(value or "").strip()


def _country_label(opportunity):
    if opportunity.country_ref_id:
        return opportunity.country_ref.name
    return ""


def _first_degree_label(opportunity):
    values = opportunity.degree_levels if isinstance(opportunity.degree_levels, list) else []
    for value in values:
        label = _clean_label(value)
        if label:
            return label
    return ""


def _funding_label(opportunity):
    value = _clean_label(opportunity.funding_type)
    return value.replace("_", " ").title()


def _field_label(opportunity):
    fields = opportunity.fields_of_study
    for value in fields:
        label = _clean_label(value)
        if label and label.casefold() not in {"all", "all fields", "any"}:
            return label
    return ""


def _deadline_window(opportunity, today):
    if not opportunity.deadline or opportunity.is_rolling_deadline:
        return None

    days_left = (opportunity.deadline - today).days
    if days_left <= 14:
        start = today
        end = today + timedelta(days=14)
        return ("closing_soon", start, end)

    month_start = opportunity.deadline.replace(day=1)
    if opportunity.deadline.month == 12:
        month_end = date(opportunity.deadline.year, 12, 31)
    else:
        month_end = date(opportunity.deadline.year, opportunity.deadline.month + 1, 1)
        month_end = month_end - timedelta(days=1)
    return (opportunity.deadline.strftime("%Y-%m"), month_start, month_end)


def _candidate_group_keys(plan, today):
    opportunity = plan.opportunity
    country = _country_label(opportunity)
    degree = _first_degree_label(opportunity)
    funding = _funding_label(opportunity)
    field = _field_label(opportunity)
    deadline_window = _deadline_window(opportunity, today)

    keys = []
    if country and degree:
        keys.append(
            (
                OpportunityCollection.CollectionType.COUNTRY_DEGREE,
                country,
                degree,
                "",
                "",
                None,
                None,
            )
        )
    if country and funding:
        keys.append(
            (
                OpportunityCollection.CollectionType.COUNTRY_FUNDING,
                country,
                "",
                funding,
                "",
                None,
                None,
            )
        )
    if degree and funding:
        keys.append(
            (
                OpportunityCollection.CollectionType.DEGREE_FUNDING,
                "",
                degree,
                funding,
                "",
                None,
                None,
            )
        )
    if field:
        keys.append(
            (
                OpportunityCollection.CollectionType.FIELD,
                "",
                "",
                "",
                field,
                None,
                None,
            )
        )
    if deadline_window:
        _, start, end = deadline_window
        keys.append(
            (
                OpportunityCollection.CollectionType.DEADLINE_WINDOW,
                "",
                "",
                "",
                "",
                start,
                end,
            )
        )

    return keys


def _active_collection_opportunity_ids():
    return set(
        OpportunityCollectionItem.objects.filter(
            collection__status__in=ACTIVE_COLLECTION_STATUSES,
        ).values_list("opportunity_id", flat=True)
    )


def _existing_active_group_keys():
    return {
        (
            item["collection_type"],
            item["country"],
            item["degree_level"],
            item["funding_type"],
            item["field_label"],
            item["deadline_start"],
            item["deadline_end"],
        )
        for item in OpportunityCollection.objects.filter(
            status__in=ACTIVE_COLLECTION_STATUSES,
        ).values(
            "collection_type",
            "country",
            "degree_level",
            "funding_type",
            "field_label",
            "deadline_start",
            "deadline_end",
        )
    }


def eligible_collection_candidate_plans(
    *,
    country="",
    degree_level="",
    force=False,
    now=None,
):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    expired_check_statuses = [
        Opportunity.DeadlineCheckStatus.EXPIRED,
        Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
    ]
    queryset = (
        OpportunitySocialPostPlan.objects.select_related(
            "opportunity",
            "opportunity__country_ref",
        )
        .prefetch_related("opportunity__study_field_refs")
        .filter(
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.COLLECTION_CANDIDATE,
            opportunity__status=Opportunity.Status.PUBLISHED,
        )
        .filter(
            Q(opportunity__deadline__isnull=True)
            | Q(opportunity__is_rolling_deadline=True)
            | Q(opportunity__deadline__gte=today)
        )
        .exclude(opportunity__deadline_check_status__in=expired_check_statuses)
        .order_by("-priority_score", "opportunity__deadline", "id")
    )

    if country:
        queryset = queryset.filter(opportunity__country_ref__name__iexact=country)
    if degree_level:
        queryset = queryset.filter(opportunity__degree_levels__contains=[degree_level])
    if not force:
        queryset = queryset.exclude(opportunity_id__in=_active_collection_opportunity_ids())

    return queryset


def _sort_group_plans(plans):
    return sorted(
        plans,
        key=lambda plan: (
            -int(plan.priority_score or 0),
            plan.opportunity.deadline or date.max,
            plan.pk,
        ),
    )


def _collection_title(collection_type, count, country, degree, funding, field, start, end):
    if collection_type == OpportunityCollection.CollectionType.COUNTRY_DEGREE:
        return f"{count} {degree} Scholarships in {country}"
    if collection_type == OpportunityCollection.CollectionType.COUNTRY_FUNDING:
        return f"{count} {funding} Scholarships in {country}"
    if collection_type == OpportunityCollection.CollectionType.DEGREE_FUNDING:
        return f"{count} {funding} {degree} Scholarships"
    if collection_type == OpportunityCollection.CollectionType.FIELD:
        return f"{count} {field} Scholarships Closing Soon"
    if collection_type == OpportunityCollection.CollectionType.DEADLINE_WINDOW:
        if start and end and end <= timezone.localdate() + timedelta(days=14):
            return f"{count} Scholarships Closing Soon"
        return f"{count} Scholarships with Upcoming Deadlines"
    return f"{count} Scholarship Opportunities"


def _collection_intro(title, plans):
    countries = sorted({_country_label(plan.opportunity) for plan in plans if _country_label(plan.opportunity)})
    deadline_values = [
        plan.opportunity.deadline for plan in plans if plan.opportunity.deadline
    ]
    country_text = ", ".join(countries[:3])
    if deadline_values:
        deadline_text = (
            f"Deadlines run from {min(deadline_values).isoformat()} "
            f"to {max(deadline_values).isoformat()}."
        )
    else:
        deadline_text = "Review each scholarship page for the latest deadline."

    location_text = f" across {country_text}" if country_text else ""
    return f"{title}{location_text}. {deadline_text}"


def _collection_social_text(title, plans):
    lines = [title, "", "Scholarships included:"]
    for plan in plans:
        deadline = plan.opportunity.deadline.isoformat() if plan.opportunity.deadline else "See details"
        lines.append(f"- {plan.opportunity.title} ({deadline})")
    lines.extend(["", "Review the full collection on Scholars Republic before applying."])
    return "\n".join(lines)


def _preview_from_group(key, plans):
    collection_type, country, degree, funding, field, start, end = key
    count = len(plans)
    title = _collection_title(
        collection_type,
        count,
        country,
        degree,
        funding,
        field,
        start,
        end,
    )
    priority_score = sum(int(plan.priority_score or 0) for plan in plans)
    intro_text = _collection_intro(title, plans)
    social_post_text = _collection_social_text(title, plans)

    return {
        "title": title,
        "description": intro_text,
        "intro_text": intro_text,
        "collection_type": collection_type,
        "country": country,
        "degree_level": degree,
        "funding_type": funding,
        "field_label": field,
        "deadline_start": start,
        "deadline_end": end,
        "social_post_text": social_post_text,
        "priority_score": priority_score,
        "plans": plans,
    }


def _save_collection(preview, status):
    with transaction.atomic():
        collection = OpportunityCollection.objects.create(
            title=preview["title"],
            description=preview["description"],
            intro_text=preview["intro_text"],
            collection_type=preview["collection_type"],
            country=preview["country"],
            degree_level=preview["degree_level"],
            funding_type=preview["funding_type"],
            field_label=preview["field_label"],
            deadline_start=preview["deadline_start"],
            deadline_end=preview["deadline_end"],
            status=status,
            source=OpportunityCollection.Source.SYSTEM,
            social_post_text=preview["social_post_text"],
            priority_score=preview["priority_score"],
        )
        OpportunityCollectionItem.objects.bulk_create(
            [
                OpportunityCollectionItem(
                    collection=collection,
                    opportunity=plan.opportunity,
                    social_post_plan=plan,
                    position=index,
                    reason=preview["collection_type"],
                )
                for index, plan in enumerate(preview["plans"], start=1)
            ]
        )

    return collection


def _opportunities_from_collection_or_preview(collection_or_preview):
    if isinstance(collection_or_preview, dict):
        return [plan.opportunity for plan in collection_or_preview.get("plans", [])]

    return [
        item.opportunity
        for item in collection_or_preview.items.select_related(
            "opportunity",
            "opportunity__country_ref",
        ).all()
    ]


def _collection_value(collection_or_preview, key, default=None):
    if isinstance(collection_or_preview, dict):
        return collection_or_preview.get(key, default)
    return getattr(collection_or_preview, key, default)


def _is_opportunity_active(opportunity, today):
    if opportunity.status != Opportunity.Status.PUBLISHED:
        return False
    if opportunity.deadline_check_status in {
        Opportunity.DeadlineCheckStatus.EXPIRED,
        Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
    }:
        return False
    return not (
        opportunity.deadline
        and not opportunity.is_rolling_deadline
        and opportunity.deadline < today
    )


def _title_is_too_generic(title, collection_type):
    normalized = str(title or "").strip().casefold()
    generic_titles = {
        "scholarships closing soon",
        "scholarships with upcoming deadlines",
        "scholarship opportunities",
    }
    if normalized in generic_titles:
        return True
    if collection_type == OpportunityCollection.CollectionType.DEADLINE_WINDOW:
        return True
    return normalized.startswith("3 scholarships") or normalized.startswith("4 scholarships")


def evaluate_collection_auto_approval(
    collection_or_preview,
    *,
    force=False,
    min_score=None,
    now=None,
):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    reasons = []
    blockers = []

    title = _collection_value(collection_or_preview, "title", "")
    collection_type = _collection_value(collection_or_preview, "collection_type", "")
    priority_score = int(_collection_value(collection_or_preview, "priority_score", 0) or 0)
    opportunities = _opportunities_from_collection_or_preview(collection_or_preview)
    item_count = len(opportunities)
    collection_id = None
    if not isinstance(collection_or_preview, dict):
        collection_id = collection_or_preview.pk

    if 3 <= item_count <= 5:
        reasons.append("item_count_in_range")
    else:
        blockers.append("item_count_out_of_range")

    required_score = AUTO_APPROVAL_STRONG_SCORE
    if collection_type in AUTO_APPROVAL_STRONG_TYPES:
        reasons.append("strong_collection_type")
    elif collection_type == OpportunityCollection.CollectionType.DEADLINE_WINDOW:
        required_score = AUTO_APPROVAL_DEADLINE_WINDOW_SCORE
        if item_count >= 5:
            reasons.append("deadline_window_has_enough_items")
        else:
            blockers.append("deadline_window_needs_at_least_5_items")
    else:
        blockers.append("unsupported_collection_type")

    if min_score is not None:
        required_score = max(required_score, int(min_score))

    if priority_score >= required_score:
        reasons.append(f"priority_score_at_least_{required_score}")
    else:
        blockers.append(f"priority_score_below_{required_score}")

    if _title_is_too_generic(title, collection_type):
        if priority_score >= AUTO_APPROVAL_GENERIC_TITLE_SCORE:
            reasons.append("generic_title_allowed_by_high_score")
        else:
            blockers.append("title_too_generic")
    else:
        reasons.append("title_specific")

    expired_or_inactive_ids = [
        opportunity.pk
        for opportunity in opportunities
        if not _is_opportunity_active(opportunity, today)
    ]
    if expired_or_inactive_ids:
        blockers.append("inactive_or_expired_opportunities")
    else:
        reasons.append("all_opportunities_active")

    missing_source_ids = [
        opportunity.pk
        for opportunity in opportunities
        if not (opportunity.official_link or opportunity.source_url)
    ]
    if missing_source_ids:
        blockers.append("missing_official_or_source_url")
    else:
        reasons.append("all_opportunities_have_source_url")

    if not force and opportunities:
        duplicate_queryset = OpportunityCollectionItem.objects.filter(
            opportunity_id__in=[opportunity.pk for opportunity in opportunities],
            collection__status__in=AUTO_APPROVAL_DUPLICATE_STATUSES,
        )
        if collection_id:
            duplicate_queryset = duplicate_queryset.exclude(collection_id=collection_id)
        if duplicate_queryset.exists():
            blockers.append("opportunity_already_in_approved_or_posted_collection")
        else:
            reasons.append("no_approved_or_posted_collection_duplicates")
    elif force:
        reasons.append("duplicate_check_bypassed")

    return {
        "can_auto_approve": not blockers,
        "score": priority_score,
        "reasons": reasons,
        "blockers": blockers,
    }


def approve_social_collection(collection, *, dry_run=False, force=False, min_score=None, now=None):
    evaluation = evaluate_collection_auto_approval(
        collection,
        force=force,
        min_score=min_score,
        now=now,
    )
    if evaluation["can_auto_approve"] and not dry_run:
        collection.status = OpportunityCollection.Status.APPROVED
        collection.auto_approval_score = evaluation["score"]
        collection.auto_approval_reason = {
            "reasons": evaluation["reasons"],
            "blockers": evaluation["blockers"],
        }
        collection.auto_approved_at = now or timezone.now()
        collection.approval_source = OpportunityCollection.ApprovalSource.SYSTEM
        collection.save(
            update_fields=[
                "status",
                "auto_approval_score",
                "auto_approval_reason",
                "auto_approved_at",
                "approval_source",
                "updated_at",
            ]
        )

    return evaluation


def approve_social_collections(
    *,
    dry_run=False,
    limit=None,
    min_score=None,
    include_ready=False,
    force=False,
    collection_id=None,
    now=None,
):
    if limit is not None and limit < 1:
        raise ValueError("limit must be greater than 0.")
    if min_score is not None and min_score < 0:
        raise ValueError("min_score must be greater than or equal to 0.")

    statuses = [OpportunityCollection.Status.DRAFT]
    if include_ready:
        statuses.append(OpportunityCollection.Status.READY)

    queryset = (
        OpportunityCollection.objects.prefetch_related(
            "items__opportunity",
            "items__opportunity__country_ref",
        )
        .filter(status__in=statuses)
        .order_by("-priority_score", "id")
    )
    if collection_id:
        queryset = queryset.filter(pk=collection_id)

    collections = list(queryset[:limit] if limit else queryset)
    results = []
    approved_count = 0
    for collection in collections:
        evaluation = approve_social_collection(
            collection,
            dry_run=dry_run,
            force=force,
            min_score=min_score,
            now=now,
        )
        if evaluation["can_auto_approve"]:
            approved_count += 1
        results.append(
            {
                "collection": collection,
                "evaluation": evaluation,
            }
        )

    return {
        "ok": True,
        "dry_run": dry_run,
        "evaluated_count": len(results),
        "approved_count": approved_count,
        "results": results,
    }


def generate_social_collections(
    *,
    dry_run=False,
    limit=None,
    min_size=DEFAULT_MIN_SIZE,
    max_size=DEFAULT_MAX_SIZE,
    status=OpportunityCollection.Status.READY,
    country="",
    degree_level="",
    force=False,
    auto_approve=False,
    now=None,
):
    if min_size < 2:
        raise ValueError("min_size must be at least 2.")
    if max_size < min_size:
        raise ValueError("max_size must be greater than or equal to min_size.")
    if status not in OpportunityCollection.Status.values:
        raise ValueError("status is not valid.")
    if limit is not None and limit < 1:
        raise ValueError("limit must be greater than 0.")

    now = now or timezone.now()
    today = timezone.localtime(now).date()
    plans = list(
        eligible_collection_candidate_plans(
            country=country,
            degree_level=degree_level,
            force=force,
            now=now,
        )
    )
    groups = defaultdict(list)
    for plan in plans:
        for key in _candidate_group_keys(plan, today):
            groups[key].append(plan)

    existing_group_keys = set() if force else _existing_active_group_keys()
    used_opportunity_ids = set()
    previews = []

    for key, group_plans in groups.items():
        if key in existing_group_keys:
            continue

        available = [
            plan
            for plan in _sort_group_plans(group_plans)
            if plan.opportunity_id not in used_opportunity_ids
        ]
        if len(available) < min_size:
            continue

        selected = available[:max_size]
        preview = _preview_from_group(key, selected)
        previews.append(preview)
        used_opportunity_ids.update(plan.opportunity_id for plan in selected)

        if limit and len(previews) >= limit:
            break

    collections = []
    auto_approved_count = 0
    evaluations = []
    if not dry_run:
        for preview in previews:
            collection = _save_collection(preview, status)
            collections.append(collection)
            if auto_approve:
                evaluation = approve_social_collection(collection, force=force, now=now)
                evaluations.append({"collection": collection, "evaluation": evaluation})
                if evaluation["can_auto_approve"]:
                    auto_approved_count += 1
    elif auto_approve:
        for preview in previews:
            evaluations.append(
                {
                    "collection": None,
                    "evaluation": evaluate_collection_auto_approval(
                        preview,
                        force=force,
                        now=now,
                    ),
                }
            )

    return {
        "ok": True,
        "dry_run": dry_run,
        "eligible_count": len(plans),
        "preview_count": len(previews),
        "created_count": len(collections),
        "auto_approved_count": auto_approved_count,
        "auto_approval_evaluations": evaluations,
        "previews": previews,
        "collections": collections,
    }
