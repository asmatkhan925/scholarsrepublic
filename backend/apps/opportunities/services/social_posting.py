import logging
from datetime import date, datetime, time, timedelta

import requests
from django.conf import settings
from django.db.models import F, Q
from django.utils import timezone

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityCollectionSocialPostLog,
    OpportunityCollectionSocialPostPlan,
    OpportunityDraft,
    OpportunitySocialDraft,
    OpportunitySocialPostLog,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.social_collection_posting import (
    build_deadline_window_caption_intro,
    build_collection_social_post_text,
    collection_public_url,
)
from apps.opportunities.services.social_image_uploads import (
    get_preferred_social_image_source,
    get_preferred_social_image_url,
)
from apps.opportunities.services.social_scheduler import apply_social_priority


DEFAULT_PLATFORM = "facebook"
FACEBOOK_WORKER_TIMEOUT_SECONDS = 30
FACEBOOK_WORKER_USER_AGENT = "ScholarsRepublicBackend/1.0"
AUTO_POST_DEADLINE_WINDOW_DAYS = 21
AUTO_POST_BLOCKED_REASON_CODES = [
    "missing_image",
    "missing_caption",
    "deadline_not_near",
    "deadline_missing",
    "expired",
    "not_individual_decision",
    "collection_not_approved",
    "collection_missing_image",
    "collection_missing_caption",
    "collection_has_expired_item",
    "collection_no_near_deadline_item",
    "missing_link",
    "not_ready",
    "not_due",
    "unpublished",
    "already_posted",
    "manual_review_deadline_uncertain",
]
AUTO_POST_TIER_LABELS = {
    "strict_best": "Strict best",
    "near_deadline_no_image": "Near deadline, no image",
    "has_image_caption_far_deadline": "Image and caption, far deadline",
    "caption_only_fallback": "Caption-only fallback",
    "manual_review_last_resort": "Manual review last resort",
    "collection_strict_best": "Collection strict best",
    "collection_no_image_fallback": "Collection no-image fallback",
    "collection_general_fallback": "Collection general fallback",
    "hard_blocked": "Hard blocked",
}
AUTO_POST_TIER_RANKS = {
    "strict_best": 1,
    "collection_strict_best": 1,
    "near_deadline_no_image": 2,
    "collection_no_image_fallback": 2,
    "has_image_caption_far_deadline": 3,
    "collection_general_fallback": 3,
    "caption_only_fallback": 4,
    "manual_review_last_resort": 5,
    "hard_blocked": 99,
}
DEADLINE_WINDOW_LABELS = {
    "urgent": "Urgent",
    "soon": "Soon",
    "advance_notice": "Advance notice",
    "early_awareness": "Early awareness",
    "far": "Far",
    "missing": "Missing deadline",
    "expired": "Expired",
}
DEADLINE_WINDOW_RANKS = {
    "soon": 1,
    "advance_notice": 2,
    "urgent": 3,
    "early_awareness": 4,
    "far": 5,
    "missing": 6,
    "expired": 99,
}
DEADLINE_WINDOWS = [
    "urgent",
    "soon",
    "advance_notice",
    "early_awareness",
    "far",
    "missing",
    "expired",
]
EXPIRED_AUTOMATIC_SKIP_MESSAGE = (
    "Skipped automatic Facebook post because opportunity is expired."
)
logger = logging.getLogger(__name__)


def site_url():
    return getattr(settings, "FRONTEND_URL", "https://scholarsrepublic.org").rstrip("/")


def absolute_url(value):
    value = str(value or "").strip()
    if not value:
        return ""

    if value.startswith(("http://", "https://")):
        return value

    if not value.startswith("/"):
        value = f"/{value}"

    return f"{site_url()}{value}"


def scholarship_detail_url(opportunity):
    return f"{site_url()}/scholarships/{opportunity.slug}"


def format_funding(value):
    return str(value or "").replace("_", " ").strip().title()


def funding_label(opportunity):
    return format_funding(opportunity.funding_type) or str(
        opportunity.stipend_summary or ""
    ).strip()


def provider_label(opportunity):
    return (
        opportunity.provider_name
        or opportunity.university_name
        or opportunity.company_name
        or opportunity.source_name
        or ""
    )


def degree_label(opportunity):
    return ", ".join(opportunity.degree_levels or [])


def deadline_label(opportunity):
    if not opportunity.deadline:
        return ""

    return (
        f"{opportunity.deadline.strftime('%B')} "
        f"{opportunity.deadline.day}, "
        f"{opportunity.deadline.year}"
    )


def deadline_days_left(opportunity, today=None):
    if not opportunity.deadline or opportunity.is_rolling_deadline:
        return None

    today = today or timezone.localdate()
    return (opportunity.deadline - today).days


def get_deadline_window(deadline_date, now_date=None):
    now_date = now_date or timezone.localdate()
    if not deadline_date:
        return "missing"
    days_left = (deadline_date - now_date).days
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


def deadline_window_label(window):
    return DEADLINE_WINDOW_LABELS.get(window, str(window or "").replace("_", " ").title())


def is_near_deadline(opportunity, today=None):
    days_left = deadline_days_left(opportunity, today=today)
    return days_left is not None and 0 <= days_left <= 7


def is_near_auto_post_deadline(opportunity, today=None):
    days_left = deadline_days_left(opportunity, today=today)
    return days_left is not None and 0 <= days_left <= AUTO_POST_DEADLINE_WINDOW_DAYS


def is_opportunity_expired_for_social(opportunity, today=None):
    if not opportunity:
        return True

    today = today or timezone.localdate()
    if opportunity.deadline_check_status in {
        Opportunity.DeadlineCheckStatus.EXPIRED,
        Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
    }:
        return True

    if (
        opportunity.deadline
        and not opportunity.is_rolling_deadline
        and opportunity.deadline < today
    ):
        return True

    return False


def deadline_reminder_line(opportunity, today=None):
    days_left = deadline_days_left(opportunity, today=today)
    if days_left is None or days_left < 0 or days_left > 7:
        return ""
    if days_left == 0:
        return "Reminder: deadline is today."
    if days_left == 1:
        return "Reminder: deadline is in 1 day."
    return f"Reminder: deadline is in {days_left} days."


def generate_facebook_post_text(opportunity, link_url=None, include_reminder=False):
    if not opportunity or not str(getattr(opportunity, "title", "") or "").strip():
        return ""

    link_url = link_url or scholarship_detail_url(opportunity)
    if not link_url:
        return ""

    provider = provider_label(opportunity)
    degree = degree_label(opportunity)
    funding = funding_label(opportunity)
    deadline = deadline_label(opportunity)
    deadline_window = "missing"
    if opportunity.deadline and not opportunity.is_rolling_deadline:
        deadline_window = get_deadline_window(opportunity.deadline, timezone.localdate())

    lines = [
        f"Scholars Republic opportunity: {opportunity.title.strip()}",
        "",
        build_deadline_window_caption_intro(deadline_window, "opportunity"),
    ]
    reminder = deadline_reminder_line(opportunity) if include_reminder else ""
    if reminder:
        lines.extend(["", reminder])
    sentence_parts = []
    if provider:
        sentence_parts.append(f"{provider} is offering this opportunity")
    else:
        sentence_parts.append("This scholarship opportunity is available")

    context_bits = []
    if opportunity.country:
        context_bits.append(f"in {opportunity.country}")
    if degree:
        context_bits.append(f"for {degree} students")
    if funding:
        context_bits.append(f"with {funding.lower()} funding")

    paragraph = sentence_parts[0]
    if context_bits:
        paragraph += " " + ", ".join(context_bits)
    paragraph += ". Review the full details before applying."
    lines.extend(["", paragraph, "", "Key Details:"])

    detail_lines = []
    if opportunity.country:
        detail_lines.append(f"• Country: {opportunity.country}")
    if provider:
        detail_lines.append(f"• Provider: {provider}")
    if degree:
        detail_lines.append(f"• Degree Level: {degree}")
    if funding:
        detail_lines.append(f"• Funding: {funding}")
    if deadline:
        detail_lines.append(f"• Deadline: {deadline}")

    lines.extend(detail_lines)
    lines.extend(["", "Read full details and apply through Scholars Republic:", link_url])
    return "\n".join(line for line in lines if line.strip())


fallback_social_post_text = generate_facebook_post_text


def ensure_plan_post_text(plan):
    message = plan.post_text.strip()
    if message:
        return message

    link_url = plan.link_url or scholarship_detail_url(plan.opportunity)
    message = generate_facebook_post_text(plan.opportunity, link_url)
    if not message:
        plan.last_error = "Facebook caption could not be generated from scholarship fields."
        plan.save(update_fields=["last_error", "updated_at"])
        return ""

    plan.post_text = message
    plan.link_url = link_url
    plan.last_error = ""
    plan.save(update_fields=["post_text", "link_url", "last_error", "updated_at"])
    return message


def regenerate_facebook_caption_for_opportunity(opportunity, *, force=False):
    plan = get_or_create_facebook_plan(opportunity)
    plan.link_url = plan.link_url or scholarship_detail_url(opportunity)
    if plan.post_text.strip() and not force:
        plan.last_error = ""
        plan.save(update_fields=["link_url", "last_error", "updated_at"])
        return plan

    plan.post_text = generate_facebook_post_text(opportunity, plan.link_url)
    plan.last_error = "" if plan.post_text else "Facebook caption could not be generated from scholarship fields."
    plan.save(update_fields=["post_text", "link_url", "last_error", "updated_at"])
    return plan


def mark_social_image_stale_for_deadline_change(opportunity):
    plan = (
        opportunity.social_post_plans.filter(platform=DEFAULT_PLATFORM)
        .order_by("-updated_at")
        .first()
    )
    if not plan:
        return None

    if plan.image or plan.image_url:
        plan.social_image_is_stale = True
        plan.social_image_status = plan.SocialImageStatus.FALLBACK
        plan.social_image_error = (
            "Deadline changed. Uploaded social image may contain the old deadline."
        )
        plan.save(
            update_fields=[
                "social_image_is_stale",
                "social_image_status",
                "social_image_error",
                "updated_at",
            ]
        )
    return plan


def promote_social_draft_to_plan(draft):
    if not draft.created_opportunity_id:
        return None

    opportunity = draft.created_opportunity
    social_draft = draft.social_drafts.order_by("-updated_at").first()
    if not social_draft:
        return None

    status = OpportunitySocialPostPlan.Status.DRAFT
    if (
        opportunity.status == Opportunity.Status.PUBLISHED
        and not is_opportunity_expired_for_social(opportunity)
    ):
        status = OpportunitySocialPostPlan.Status.READY

    plan, _ = OpportunitySocialPostPlan.objects.get_or_create(
        opportunity=opportunity,
        platform=DEFAULT_PLATFORM,
        defaults={"link_url": scholarship_detail_url(opportunity)},
    )
    plan.enabled = True
    plan.status = status
    plan.post_text = social_draft.facebook_post_text.strip() or generate_facebook_post_text(
        opportunity,
        plan.link_url or scholarship_detail_url(opportunity),
    )
    plan.image_prompt = social_draft.facebook_image_prompt
    plan.image = social_draft.facebook_image
    plan.image_url = social_draft.facebook_image_url
    plan.social_image_source = social_draft.social_image_source
    plan.social_image_status = social_draft.social_image_status
    plan.social_image_error = social_draft.social_image_error
    plan.social_image_saved_at = social_draft.social_image_saved_at
    plan.link_url = plan.link_url or scholarship_detail_url(opportunity)
    if status == OpportunitySocialPostPlan.Status.READY and plan.next_post_at is None:
        plan.next_post_at = timezone.now()
    plan.last_error = "" if plan.post_text else "Facebook caption could not be generated from scholarship fields."
    apply_social_priority(plan, save=False)
    plan.save(
        update_fields=[
            "enabled",
            "status",
            "post_text",
            "image_prompt",
            "image",
            "image_url",
            "social_image_source",
            "social_image_status",
            "social_image_error",
            "social_image_saved_at",
            "link_url",
            "next_post_at",
            "priority_score",
            "priority_reason",
            "auto_social_decision",
            "last_error",
            "updated_at",
        ]
    )
    return plan


def promote_published_opportunity_social_draft(opportunity):
    if opportunity.status != Opportunity.Status.PUBLISHED:
        return None

    draft = (
        OpportunityDraft.objects.filter(created_opportunity=opportunity)
        .prefetch_related("social_drafts")
        .order_by("-imported_at", "-updated_at")
        .first()
    )
    if not draft:
        return None

    return promote_social_draft_to_plan(draft)


def is_plan_due(plan, now=None):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    opportunity = plan.opportunity

    if opportunity.status != Opportunity.Status.PUBLISHED:
        return False

    if is_opportunity_expired_for_social(opportunity, today=today):
        return False

    if plan.next_post_at and plan.next_post_at > now:
        return False

    if not plan.last_posted_at:
        return True

    if opportunity.deadline and not opportunity.is_rolling_deadline:
        days_left = (opportunity.deadline - today).days
        if days_left <= 7:
            return timezone.localtime(plan.last_posted_at).date() < today

    return plan.last_posted_at <= now - timedelta(days=7)


def next_post_time_for_plan(plan, now=None):
    now = now or timezone.now()
    opportunity = plan.opportunity

    if opportunity.deadline and not opportunity.is_rolling_deadline:
        days_left = (opportunity.deadline - timezone.localtime(now).date()).days
        if days_left <= 7 and days_left >= 0:
            tomorrow = timezone.localtime(now).date() + timedelta(days=1)
            next_time = datetime.combine(tomorrow, time(hour=9))
            return timezone.make_aware(next_time, timezone.get_current_timezone())

    return now + timedelta(days=7)


def plan_image_url(plan):
    return get_preferred_social_image_url(plan)


def plan_has_social_image(plan):
    if getattr(plan, "social_image_is_stale", False):
        return False
    return bool(getattr(plan, "image", None) or str(getattr(plan, "image_url", "") or "").strip())


def plan_has_caption(plan):
    return bool(str(getattr(plan, "post_text", "") or "").strip())


def plan_link_url(plan):
    if str(getattr(plan, "link_url", "") or "").strip():
        return str(plan.link_url).strip()
    if getattr(plan, "opportunity", None) and getattr(plan.opportunity, "slug", ""):
        return scholarship_detail_url(plan.opportunity)
    return ""


def collection_plan_has_image(plan):
    return bool(str(getattr(plan, "image_url", "") or "").strip())


def collection_plan_has_caption(plan):
    return bool(str(getattr(plan, "post_text", "") or "").strip())


def collection_plan_link_url(plan):
    if str(getattr(plan, "link_url", "") or "").strip():
        return str(plan.link_url).strip()
    if getattr(plan, "collection", None) and getattr(plan.collection, "slug", ""):
        return collection_public_url(plan.collection)
    return ""


def collection_item_deadline_summary(collection, today=None):
    today = today or timezone.localdate()
    has_near_deadline_item = False
    has_expired_item = False
    nearest_days_until_deadline = None
    nearest_deadline = None
    for item in collection.items.select_related("opportunity").all():
        opportunity = item.opportunity
        if is_opportunity_expired_for_social(opportunity, today=today):
            has_expired_item = True
            continue
        days_left = deadline_days_left(opportunity, today=today)
        if days_left is not None and 0 <= days_left <= AUTO_POST_DEADLINE_WINDOW_DAYS:
            has_near_deadline_item = True
        if days_left is not None and days_left >= 0 and (
            nearest_days_until_deadline is None or days_left < nearest_days_until_deadline
        ):
            nearest_days_until_deadline = days_left
            nearest_deadline = opportunity.deadline
    deadline_window = get_deadline_window(nearest_deadline, today)
    if has_expired_item and nearest_deadline is None:
        deadline_window = "expired"
    return {
        "has_near_deadline_item": has_near_deadline_item,
        "has_expired_item": has_expired_item,
        "days_until_deadline": nearest_days_until_deadline,
        "deadline": nearest_deadline,
        "deadline_window": deadline_window,
        "deadline_window_label": deadline_window_label(deadline_window),
    }


def evaluate_opportunity_auto_post_eligibility(plan, now=None):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    opportunity = plan.opportunity
    days_until_deadline = deadline_days_left(opportunity, today=today)
    deadline_window = get_deadline_window(opportunity.deadline, today)
    if opportunity.is_rolling_deadline:
        deadline_window = "missing"
    has_image = plan_has_social_image(plan)
    has_caption = plan_has_caption(plan)
    has_link = bool(plan_link_url(plan))
    is_near_deadline_value = (
        days_until_deadline is not None
        and 0 <= days_until_deadline <= AUTO_POST_DEADLINE_WINDOW_DAYS
    )
    hard_blocking_reasons = []
    quality_warnings = []
    tier = "hard_blocked"
    rank_score = AUTO_POST_TIER_RANKS[tier]

    if plan.status != OpportunitySocialPostPlan.Status.READY or not plan.enabled:
        hard_blocking_reasons.append("not_ready")
    if plan.next_post_at and plan.next_post_at > now:
        hard_blocking_reasons.append("not_due")
    if opportunity.status != Opportunity.Status.PUBLISHED:
        hard_blocking_reasons.append("unpublished")
    if is_opportunity_expired_for_social(opportunity, today=today):
        hard_blocking_reasons.append("expired")
    if not has_caption:
        hard_blocking_reasons.append("missing_caption")
    if not has_link:
        hard_blocking_reasons.append("missing_link")
    if (
        plan.auto_social_decision == OpportunitySocialPostPlan.AutoSocialDecision.MANUAL_REVIEW
        and days_until_deadline is None
    ):
        hard_blocking_reasons.append("manual_review_deadline_uncertain")

    if not has_image:
        quality_warnings.append("missing_image")
    if days_until_deadline is None:
        quality_warnings.append("deadline_missing")
    elif not is_near_deadline_value:
        quality_warnings.append("deadline_not_near")
    if plan.auto_social_decision != OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL:
        quality_warnings.append("not_individual_decision")

    if not hard_blocking_reasons:
        if has_image and is_near_deadline_value and plan.auto_social_decision == OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL:
            tier = "strict_best"
        elif is_near_deadline_value:
            tier = "near_deadline_no_image"
        elif has_image and days_until_deadline is not None and days_until_deadline > AUTO_POST_DEADLINE_WINDOW_DAYS:
            tier = "has_image_caption_far_deadline"
        elif plan.auto_social_decision == OpportunitySocialPostPlan.AutoSocialDecision.MANUAL_REVIEW:
            tier = "manual_review_last_resort"
        else:
            tier = "caption_only_fallback"
        rank_score = AUTO_POST_TIER_RANKS[tier]

    blocking_reasons = hard_blocking_reasons + quality_warnings
    auto_post_eligible = not hard_blocking_reasons
    return {
        "has_image": has_image,
        "has_caption": has_caption,
        "has_link": has_link,
        "is_near_deadline": is_near_deadline_value,
        "auto_post_eligible": auto_post_eligible,
        "fallback_eligible": auto_post_eligible and tier != "strict_best",
        "auto_post_tier": tier,
        "auto_post_tier_label": AUTO_POST_TIER_LABELS[tier],
        "auto_post_rank_score": rank_score,
        "ranking_explanation": AUTO_POST_TIER_LABELS[tier],
        "hard_blocking_reasons": hard_blocking_reasons,
        "quality_warnings": quality_warnings,
        "blocking_reasons": blocking_reasons,
        "days_until_deadline": days_until_deadline,
        "deadline": opportunity.deadline,
        "deadline_window": deadline_window,
        "deadline_window_label": deadline_window_label(deadline_window),
    }


def evaluate_collection_auto_post_eligibility(plan, now=None):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    collection = plan.collection
    item_summary = collection_item_deadline_summary(collection, today=today)
    has_image = collection_plan_has_image(plan)
    has_caption = collection_plan_has_caption(plan)
    has_link = bool(collection_plan_link_url(plan))
    hard_blocking_reasons = []
    quality_warnings = []
    tier = "hard_blocked"
    rank_score = AUTO_POST_TIER_RANKS[tier]

    if plan.status != OpportunityCollectionSocialPostPlan.Status.READY:
        hard_blocking_reasons.append("not_ready")
    if plan.next_post_at is None or plan.next_post_at > now:
        hard_blocking_reasons.append("not_due")
    if collection.status != OpportunityCollection.Status.APPROVED:
        hard_blocking_reasons.append("collection_not_approved")
    if not has_caption:
        hard_blocking_reasons.append("collection_missing_caption")
    if not has_link:
        hard_blocking_reasons.append("missing_link")
    if item_summary["has_expired_item"]:
        hard_blocking_reasons.append("collection_has_expired_item")
    if not has_image:
        quality_warnings.append("collection_missing_image")
    if not item_summary["has_near_deadline_item"]:
        quality_warnings.append("collection_no_near_deadline_item")

    if not hard_blocking_reasons:
        if has_image and item_summary["has_near_deadline_item"]:
            tier = "collection_strict_best"
        elif item_summary["has_near_deadline_item"]:
            tier = "collection_no_image_fallback"
        else:
            tier = "collection_general_fallback"
        rank_score = AUTO_POST_TIER_RANKS[tier]

    blocking_reasons = hard_blocking_reasons + quality_warnings
    auto_post_eligible = not hard_blocking_reasons
    return {
        "has_image": has_image,
        "has_caption": has_caption,
        "has_link": has_link,
        "has_near_deadline_item": item_summary["has_near_deadline_item"],
        "has_expired_item": item_summary["has_expired_item"],
        "days_until_deadline": item_summary["days_until_deadline"],
        "deadline": item_summary["deadline"],
        "deadline_window": item_summary["deadline_window"],
        "deadline_window_label": item_summary["deadline_window_label"],
        "auto_post_eligible": auto_post_eligible,
        "fallback_eligible": auto_post_eligible and tier != "collection_strict_best",
        "auto_post_tier": tier,
        "auto_post_tier_label": AUTO_POST_TIER_LABELS[tier],
        "auto_post_rank_score": rank_score,
        "ranking_explanation": AUTO_POST_TIER_LABELS[tier],
        "hard_blocking_reasons": hard_blocking_reasons,
        "quality_warnings": quality_warnings,
        "blocking_reasons": blocking_reasons,
    }


def count_blocked_reasons(reasons, reason_counts):
    for reason in reasons:
        if reason in AUTO_POST_BLOCKED_REASON_CODES:
            reason_counts[reason] = reason_counts.get(reason, 0) + 1


def serialize_due_plan(plan):
    opportunity = plan.opportunity
    link_url = plan.link_url or scholarship_detail_url(opportunity)
    message = ensure_plan_post_text(plan)
    if is_near_deadline(opportunity) and latest_successful_facebook_log(plan):
        reminder = deadline_reminder_line(opportunity)
        if reminder and reminder not in message:
            title, separator, rest = message.partition("\n")
            message = (
                f"{title}\n\n{reminder}\n{rest}"
                if separator
                else f"{title}\n\n{reminder}"
            )
    days_left = opportunity.days_until_deadline
    image_url = plan_image_url(plan) if plan_has_social_image(plan) else ""

    return {
        "type": "opportunity",
        "plan_id": plan.pk,
        "opportunity_id": opportunity.pk,
        "slug": opportunity.slug,
        "title": opportunity.title,
        "message": message,
        "image_url": image_url,
        "image_source": get_preferred_social_image_source(plan) if image_url else "",
        "has_image": bool(image_url),
        "link_url": link_url,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "days_left": days_left,
        "days_until_deadline": days_left,
        "auto_social_decision": plan.auto_social_decision,
        "priority_score": plan.priority_score,
        "priority_reason": plan.priority_reason,
    }


def serialize_due_collection_plan(plan):
    collection = plan.collection
    link_url = plan.link_url or collection_public_url(collection)
    if not plan.link_url:
        plan.link_url = link_url
        plan.save(update_fields=["link_url", "updated_at"])
    message = str(plan.post_text or "").strip()
    if not message:
        message = build_collection_social_post_text(collection)
        plan.post_text = message
        plan.save(update_fields=["post_text", "updated_at"])

    return {
        "type": "collection",
        "plan_id": plan.pk,
        "collection_id": collection.pk,
        "collection_title": collection.title,
        "message": message,
        "image_url": str(plan.image_url or ""),
        "image_source": str(plan.image_source or ""),
        "has_image": bool(plan.image_url),
        "link_url": link_url,
        "priority_score": plan.priority_score,
        "next_post_at": serialize_cap_datetime(plan.next_post_at),
        "days_until_deadline": None,
    }


def successful_facebook_logs(opportunity):
    return OpportunitySocialPostLog.objects.filter(
        opportunity=opportunity,
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostLog.Status.POSTED,
    )


def latest_successful_facebook_log(plan):
    return (
        successful_facebook_logs(plan.opportunity)
        .order_by("-posted_at", "-created_at")
        .first()
    )


def facebook_post_cap_settings():
    daily_cap = getattr(settings, "SCHOLARS_FACEBOOK_DAILY_POST_CAP", 15)
    per_run_cap = getattr(settings, "SCHOLARS_FACEBOOK_PER_RUN_POST_CAP", 5)
    min_spacing_minutes = getattr(
        settings,
        "SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES",
        30,
    )
    try:
        daily_cap = int(daily_cap)
    except (TypeError, ValueError):
        daily_cap = 15
    try:
        per_run_cap = int(per_run_cap)
    except (TypeError, ValueError):
        per_run_cap = 5
    try:
        min_spacing_minutes = int(min_spacing_minutes)
    except (TypeError, ValueError):
        min_spacing_minutes = 30

    return {
        "daily_cap": max(0, daily_cap),
        "per_run_cap": max(1, per_run_cap),
        "min_spacing_minutes": max(0, min_spacing_minutes),
    }


def facebook_posting_cap_status(now=None):
    now = now or timezone.now()
    local_now = timezone.localtime(now)
    current_tz = timezone.get_current_timezone()
    today_start = timezone.make_aware(
        datetime.combine(local_now.date(), time.min),
        current_tz,
    )
    tomorrow_start = today_start + timedelta(days=1)
    settings_data = facebook_post_cap_settings()
    successful_opportunity_posts = OpportunitySocialPostLog.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostLog.Status.POSTED,
        posted_at__gte=today_start,
        posted_at__lt=tomorrow_start,
    )
    successful_collection_posts = OpportunityCollectionSocialPostLog.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunityCollectionSocialPostLog.Status.POSTED,
        created_at__gte=today_start,
        created_at__lt=tomorrow_start,
    )
    posted_today = successful_opportunity_posts.count() + successful_collection_posts.count()
    daily_remaining = max(0, settings_data["daily_cap"] - posted_today)
    latest_opportunity_log = (
        OpportunitySocialPostLog.objects.filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at__isnull=False,
        )
        .order_by("-posted_at", "-created_at")
        .first()
    )
    latest_collection_log = (
        OpportunityCollectionSocialPostLog.objects.filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunityCollectionSocialPostLog.Status.POSTED,
        )
        .order_by("-created_at")
        .first()
    )
    latest_posted_at = latest_opportunity_log.posted_at if latest_opportunity_log else None
    if latest_collection_log and (
        not latest_posted_at or latest_collection_log.created_at > latest_posted_at
    ):
        latest_posted_at = latest_collection_log.created_at
    next_allowed_post_at = None
    if latest_posted_at and settings_data["min_spacing_minutes"] > 0:
        next_allowed_post_at = latest_posted_at + timedelta(
            minutes=settings_data["min_spacing_minutes"],
        )

    reason = ""
    if daily_remaining <= 0:
        reason = "daily_cap_reached"
    elif next_allowed_post_at and next_allowed_post_at > now:
        reason = "minimum_interval_not_reached"

    return {
        **settings_data,
        "posted_today": posted_today,
        "daily_remaining": daily_remaining,
        "latest_posted_at": latest_posted_at,
        "next_allowed_post_at": next_allowed_post_at,
        "reason": reason,
    }


def facebook_posting_block_response(now=None):
    cap_status = facebook_posting_cap_status(now=now)
    if cap_status["daily_remaining"] <= 0:
        return {
            "ok": False,
            "status": "daily_cap_reached",
            "error": "Facebook daily post cap has been reached.",
            **cap_status,
        }
    if cap_status["reason"] == "minimum_interval_not_reached":
        return {
            "ok": False,
            "status": "minimum_interval_not_reached",
            "error": "Minimum spacing between Facebook posts is still active.",
            **cap_status,
        }
    return None


def latest_successful_facebook_log_today(opportunity, today=None):
    today = today or timezone.localdate()
    return (
        successful_facebook_logs(opportunity)
        .filter(posted_at__date=today)
        .order_by("-posted_at", "-created_at")
        .first()
    )


def can_post_opportunity_today(opportunity, plan, force=False, today=None):
    today = today or timezone.localdate()
    if force:
        return {"can_post": True, "status": "posted", "latest_log": None}

    if is_opportunity_expired_for_social(opportunity, today=today):
        return {"can_post": False, "status": "expired", "latest_log": None}

    if is_near_deadline(opportunity, today=today):
        today_log = latest_successful_facebook_log_today(opportunity, today=today)
        if today_log:
            return {
                "can_post": False,
                "status": "already_posted_today",
                "latest_log": today_log,
            }
        return {"can_post": True, "status": "posted", "latest_log": None}

    latest_log = latest_successful_facebook_log(plan)
    if latest_log:
        return {"can_post": False, "status": "already_posted", "latest_log": latest_log}

    return {"can_post": True, "status": "posted", "latest_log": None}


def worker_post_headers(token):
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": FACEBOOK_WORKER_USER_AGENT,
        "X-Social-Worker-Token": token,
    }


def parse_worker_response(response):
    worker_status_code = response.status_code
    worker_response_body = response.text or ""
    try:
        payload = response.json()
    except ValueError:
        payload = {}

    if not isinstance(payload, dict):
        payload = {}

    payload["worker_status_code"] = worker_status_code
    payload["worker_response_body"] = worker_response_body

    if not response.ok:
        error_text = worker_response_body.strip() or str(payload.get("error") or "").strip()
        payload.update(
            {
                "ok": False,
                "status": str(payload.get("status") or "failed"),
                "error": f"Worker HTTP {worker_status_code}: {error_text}",
            }
        )
    else:
        payload.setdefault("ok", True)
        payload.setdefault("status", "posted" if payload.get("ok") else "failed")

    return payload


def call_worker_post_one(payload):
    worker_url = getattr(settings, "FACEBOOK_POSTER_WORKER_URL", "").rstrip("/")
    token = getattr(settings, "SCHOLARS_SOCIAL_WORKER_TOKEN", "")
    if not worker_url or not token:
        return {
            "ok": False,
            "status": "failed",
            "error": "Facebook Worker posting is not configured.",
        }

    try:
        response = requests.post(
            f"{worker_url}/post-one",
            json=payload,
            headers=worker_post_headers(token),
            timeout=FACEBOOK_WORKER_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.warning("Facebook post-now Worker request failed: %s", exc)
        return {
            "ok": False,
            "status": "failed",
            "error": str(getattr(exc, "reason", exc)),
        }

    parsed = parse_worker_response(response)
    log_method = logger.warning if not parsed.get("ok") else logger.info
    log_method(
        "Facebook post-now Worker response: worker_status_code=%s "
        "worker_response_body=%s facebook_post_id=%s facebook_post_url=%s",
        parsed.get("worker_status_code", ""),
        parsed.get("worker_response_body", ""),
        parsed.get("facebook_post_id", ""),
        parsed.get("facebook_post_url", ""),
    )
    return parsed


def post_to_facebook_worker(item):
    return call_worker_post_one(item)


def get_or_create_facebook_plan(opportunity):
    plan, _ = OpportunitySocialPostPlan.objects.get_or_create(
        opportunity=opportunity,
        platform=DEFAULT_PLATFORM,
        defaults={
            "enabled": True,
            "status": OpportunitySocialPostPlan.Status.READY
            if (
                opportunity.status == Opportunity.Status.PUBLISHED
                and not is_opportunity_expired_for_social(opportunity)
            )
            else OpportunitySocialPostPlan.Status.DRAFT,
            "link_url": scholarship_detail_url(opportunity),
        },
    )
    apply_social_priority(plan)
    return plan


def post_plan_to_facebook_now(opportunity, force=False):
    if not opportunity:
        return {"ok": False, "status": "not_found", "error": "Scholarship not found."}

    plan = get_or_create_facebook_plan(opportunity)
    apply_social_priority(plan)
    plan.link_url = plan.link_url or scholarship_detail_url(opportunity)
    plan.enabled = True

    if opportunity.status != Opportunity.Status.PUBLISHED:
        plan.status = OpportunitySocialPostPlan.Status.DRAFT
        plan.save(update_fields=["enabled", "status", "link_url", "updated_at"])
        return {
            "ok": False,
            "status": "not_published",
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
            "error": "Scholarship must be published before posting to Facebook.",
        }

    post_check = can_post_opportunity_today(opportunity, plan, force=force)
    if not post_check["can_post"]:
        latest_log = post_check.get("latest_log")
        if post_check["status"] == "expired":
            plan.status = OpportunitySocialPostPlan.Status.PAUSED
            plan.save(update_fields=["enabled", "status", "link_url", "updated_at"])
        return {
            "ok": False,
            "status": post_check["status"],
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
            "latest_facebook_post_url": latest_log.facebook_post_url if latest_log else "",
            "message": "This scholarship has already been posted today."
            if post_check["status"] == "already_posted_today"
            else "This scholarship has already been posted before."
            if post_check["status"] == "already_posted"
            else "",
            "error": "Scholarship deadline has passed. Use force=true to repost anyway."
            if post_check["status"] == "expired"
            else "",
        }

    cap_response = facebook_posting_block_response()
    if cap_response:
        return {
            **cap_response,
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
        }

    plan.status = OpportunitySocialPostPlan.Status.READY
    plan.save(update_fields=["enabled", "status", "link_url", "updated_at"])
    message = ensure_plan_post_text(plan)
    if not message:
        return {
            "ok": False,
            "status": "failed",
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
            "error": plan.last_error,
        }

    item = serialize_due_plan(plan)
    facebook_result = post_to_facebook_worker(item) or {}
    if not isinstance(facebook_result, dict):
        facebook_result = {}
    posted = bool(facebook_result.get("ok"))
    facebook_post_id = str(facebook_result.get("facebook_post_id") or "")
    facebook_post_url = str(facebook_result.get("facebook_post_url") or "")
    error_message = "" if posted else str(facebook_result.get("error") or "Facebook post failed.")

    try:
        log, log_error = record_facebook_post_result(
            {
                "plan_id": plan.pk,
                "opportunity_id": opportunity.pk,
                "status": OpportunitySocialPostLog.Status.POSTED
                if posted
                else OpportunitySocialPostLog.Status.FAILED,
                "facebook_post_id": facebook_post_id,
                "facebook_post_url": facebook_post_url,
                "message": item.get("message", ""),
                "image_url": item.get("image_url", ""),
                "image_source": item.get("image_source", ""),
                "link_url": item.get("link_url", ""),
                "error_message": error_message,
            }
        )
    except Exception:
        logger.exception(
            "Facebook post-now failed while saving post log: "
            "opportunity_id=%s plan_id=%s worker_status_code=%s "
            "worker_response_body=%s facebook_post_id=%s facebook_post_url=%s",
            opportunity.pk,
            plan.pk,
            facebook_result.get("worker_status_code", ""),
            facebook_result.get("worker_response_body", ""),
            facebook_post_id,
            facebook_post_url,
        )
        return {
            "ok": False,
            "status": "failed",
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
            "facebook_post_id": facebook_post_id,
            "facebook_post_url": facebook_post_url,
            "image_source": item.get("image_source", ""),
            "image_url": item.get("image_url", ""),
            "message": "",
            "caption": item.get("message", ""),
            "error": "Facebook post succeeded, but backend could not save the result."
            if posted
            else error_message,
            "log_id": None,
        }

    if log_error:
        logger.error(
            "Facebook post-now post-result rejected: opportunity_id=%s plan_id=%s "
            "worker_status_code=%s worker_response_body=%s facebook_post_id=%s "
            "facebook_post_url=%s log_error=%s",
            opportunity.pk,
            plan.pk,
            facebook_result.get("worker_status_code", ""),
            facebook_result.get("worker_response_body", ""),
            facebook_post_id,
            facebook_post_url,
            log_error,
        )
        return {
            "ok": False,
            "status": "failed",
            "plan_id": plan.pk,
            "opportunity_id": opportunity.pk,
            "facebook_post_id": facebook_post_id,
            "facebook_post_url": facebook_post_url,
            "image_source": item.get("image_source", ""),
            "image_url": item.get("image_url", ""),
            "message": "",
            "caption": item.get("message", ""),
            "error": "Facebook post succeeded, but backend could not save the result."
            if posted
            else error_message,
            "log_id": None,
        }

    logger.info(
        "Facebook post-now result saved: worker_status_code=%s worker_response_body=%s "
        "facebook_post_id=%s facebook_post_url=%s log_id=%s",
        facebook_result.get("worker_status_code", ""),
        facebook_result.get("worker_response_body", ""),
        facebook_post_id,
        facebook_post_url,
        log.pk if log else "",
    )

    return {
        "ok": posted,
        "status": "posted" if posted else "failed",
        "plan_id": plan.pk,
        "opportunity_id": opportunity.pk,
        "facebook_post_id": facebook_post_id,
        "facebook_post_url": facebook_post_url,
        "image_source": item.get("image_source", ""),
        "image_url": item.get("image_url", ""),
        "message": "Posted to Facebook successfully." if posted else "",
        "caption": item.get("message", ""),
        "error": "" if posted else error_message,
        "log_id": log.pk if log else None,
    }


def schedule_facebook_plan(opportunity, next_post_at):
    plan = get_or_create_facebook_plan(opportunity)
    apply_social_priority(plan)
    plan.enabled = True
    plan.status = OpportunitySocialPostPlan.Status.READY
    plan.link_url = plan.link_url or scholarship_detail_url(opportunity)
    plan.next_post_at = next_post_at
    ensure_plan_post_text(plan)
    plan.save(update_fields=["enabled", "status", "link_url", "next_post_at", "updated_at"])
    return plan


def due_plan_sort_key(plan, today):
    opportunity = plan.opportunity
    decision_rank = 0
    if plan.auto_social_decision != OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL:
        decision_rank = 1
    priority = -int(plan.priority_score or 0)

    if opportunity.deadline and not opportunity.is_rolling_deadline:
        days_left = (opportunity.deadline - today).days
        if days_left <= 7:
            return (0, decision_rank, priority, opportunity.deadline, plan.pk)
        return (2, decision_rank, priority, opportunity.deadline, plan.pk)

    return (1, decision_rank, priority, date.max, plan.pk)


def due_collection_plan_sort_key(plan):
    return (
        1,
        -int(plan.priority_score or 0),
        plan.next_post_at or timezone.now(),
        plan.pk,
    )


def mixed_due_candidate_sort_key(candidate, today):
    if candidate["type"] == "opportunity":
        plan = candidate["plan"]
        opportunity = plan.opportunity
        urgency_rank = 1
        scheduled_at = plan.next_post_at or timezone.now()
        if opportunity.deadline and not opportunity.is_rolling_deadline:
            days_left = (opportunity.deadline - today).days
            urgency_rank = 0 if days_left <= 7 else 2
            scheduled_at = timezone.make_aware(
                datetime.combine(opportunity.deadline, time.min),
                timezone.get_current_timezone(),
            )
        decision_rank = 0
        if plan.auto_social_decision != OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL:
            decision_rank = 1
        return (
            urgency_rank,
            decision_rank,
            -int(plan.priority_score or 0),
            scheduled_at,
            plan.pk,
        )

    plan = candidate["plan"]
    return (
        1,
        0,
        -int(plan.priority_score or 0),
        plan.next_post_at or timezone.now(),
        plan.pk,
    )


def record_skipped_expired_automatic_post(plan):
    if plan.last_error == EXPIRED_AUTOMATIC_SKIP_MESSAGE:
        return None

    message = str(plan.post_text or "")
    image_url = plan_image_url(plan)
    link_url = plan.link_url or scholarship_detail_url(plan.opportunity)
    log = OpportunitySocialPostLog.objects.create(
        opportunity=plan.opportunity,
        plan=plan,
        platform=DEFAULT_PLATFORM,
        message=message,
        image_url=image_url,
        image_source=get_preferred_social_image_source(plan),
        link_url=link_url,
        status=OpportunitySocialPostLog.Status.SKIPPED,
        error_message=EXPIRED_AUTOMATIC_SKIP_MESSAGE,
    )
    plan.status = OpportunitySocialPostPlan.Status.PAUSED
    plan.enabled = False
    plan.last_error = EXPIRED_AUTOMATIC_SKIP_MESSAGE
    plan.save(update_fields=["enabled", "status", "last_error", "updated_at"])
    return log


def parse_due_post_limit(limit):
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 10

    return max(1, min(limit, 50))


def serialize_cap_datetime(value):
    if not value:
        return None
    return timezone.localtime(value).isoformat()


def empty_tier_counts():
    return {tier: 0 for tier in AUTO_POST_TIER_RANKS if tier != "hard_blocked"}


def empty_deadline_window_counts():
    return {window: 0 for window in DEADLINE_WINDOWS}


def count_candidate_tier(tier, counts):
    if tier != "hard_blocked":
        counts[tier] = counts.get(tier, 0) + 1


def count_deadline_window(window, counts):
    counts[window] = counts.get(window, 0) + 1


def ranked_candidate_sort_key(candidate):
    plan = candidate["plan"]
    eligibility = candidate["eligibility"]
    next_post_at = getattr(plan, "next_post_at", None) or timezone.now()
    created_at = getattr(plan, "created_at", None) or timezone.now()
    return (
        eligibility["auto_post_rank_score"],
        DEADLINE_WINDOW_RANKS.get(eligibility.get("deadline_window"), 99),
        -int(getattr(plan, "priority_score", 0) or 0),
        0 if eligibility.get("has_image") else 1,
        0 if eligibility.get("has_caption") else 1,
        next_post_at,
        created_at,
        plan.pk,
    )


def take_candidates_for_window(candidates, selected_ids, window, limit, selected):
    if limit <= 0:
        return
    added = 0
    for candidate in candidates:
        if added >= limit:
            break
        plan_key = (candidate["type"], candidate["plan"].pk)
        if plan_key in selected_ids:
            continue
        if candidate["eligibility"].get("deadline_window") != window:
            continue
        selected.append(candidate)
        selected_ids.add(plan_key)
        added += 1


def select_balanced_deadline_candidates(candidates, available_slots):
    selected = []
    selected_ids = set()
    if available_slots <= 0:
        return selected

    take_candidates_for_window(candidates, selected_ids, "urgent", min(2, available_slots), selected)
    take_candidates_for_window(
        candidates,
        selected_ids,
        "soon",
        min(2, available_slots - len(selected)),
        selected,
    )
    take_candidates_for_window(
        candidates,
        selected_ids,
        "advance_notice",
        min(2, available_slots - len(selected)),
        selected,
    )

    for preferred_window in ("early_awareness", "far", "missing"):
        if len(selected) >= available_slots:
            break
        take_candidates_for_window(
            candidates,
            selected_ids,
            preferred_window,
            available_slots - len(selected),
            selected,
        )

    if len(selected) < available_slots:
        for candidate in candidates:
            if len(selected) >= available_slots:
                break
            plan_key = (candidate["type"], candidate["plan"].pk)
            if plan_key in selected_ids:
                continue
            if candidate["eligibility"].get("deadline_window") == "urgent":
                continue
            selected.append(candidate)
            selected_ids.add(plan_key)
    return selected


def build_ranked_facebook_post_candidates(now=None):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    candidates = []
    blocked_reason_counts = {}
    candidate_counts_by_tier = empty_tier_counts()
    candidate_counts_by_deadline_window = empty_deadline_window_counts()

    plans = (
        OpportunitySocialPostPlan.objects.select_related("opportunity", "opportunity__country_ref")
        .filter(platform=DEFAULT_PLATFORM, enabled=True, status=OpportunitySocialPostPlan.Status.READY)
        .filter(Q(next_post_at__isnull=True) | Q(next_post_at__lte=now))
        .order_by("id")
    )
    for plan in plans:
        if plan.status == OpportunitySocialPostPlan.Status.READY and plan.enabled and is_opportunity_expired_for_social(plan.opportunity, today=today):
            count_blocked_reasons(["expired"], blocked_reason_counts)
            record_skipped_expired_automatic_post(plan)
            continue
        eligibility = evaluate_opportunity_auto_post_eligibility(plan, now=now)
        if not eligibility["auto_post_eligible"]:
            count_blocked_reasons(eligibility["hard_blocking_reasons"], blocked_reason_counts)
            continue
        apply_social_priority(plan)
        eligibility = evaluate_opportunity_auto_post_eligibility(plan, now=now)
        post_check = can_post_opportunity_today(plan.opportunity, plan, today=today)
        if not post_check["can_post"]:
            count_blocked_reasons(["already_posted"], blocked_reason_counts)
            continue
        count_candidate_tier(eligibility["auto_post_tier"], candidate_counts_by_tier)
        count_deadline_window(eligibility["deadline_window"], candidate_counts_by_deadline_window)
        candidates.append({"type": "opportunity", "plan": plan, "eligibility": eligibility})

    collection_plans = (
        OpportunityCollectionSocialPostPlan.objects.select_related("collection")
        .prefetch_related("collection__items__opportunity")
        .filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at__isnull=False,
            next_post_at__lte=now,
        )
        .order_by("id")
    )
    for plan in collection_plans:
        eligibility = evaluate_collection_auto_post_eligibility(plan, now=now)
        if not eligibility["auto_post_eligible"]:
            count_blocked_reasons(eligibility["hard_blocking_reasons"], blocked_reason_counts)
            continue
        count_candidate_tier(eligibility["auto_post_tier"], candidate_counts_by_tier)
        count_deadline_window(eligibility["deadline_window"], candidate_counts_by_deadline_window)
        candidates.append({"type": "collection", "plan": plan, "eligibility": eligibility})

    candidates.sort(key=ranked_candidate_sort_key)
    return {
        "candidates": candidates,
        "candidate_counts_by_tier": candidate_counts_by_tier,
        "candidate_counts_by_deadline_window": candidate_counts_by_deadline_window,
        "blocked_reason_counts": blocked_reason_counts,
    }


def build_due_posts_response(
    items,
    due_count,
    cap_status,
    reason="",
    blocked_reason_counts=None,
    candidate_counts_by_tier=None,
    selected_counts_by_tier=None,
    candidate_counts_by_deadline_window=None,
    selected_counts_by_deadline_window=None,
    fallback_used=False,
):
    latest_posted_at = cap_status["latest_posted_at"]
    next_allowed_post_at = cap_status["next_allowed_post_at"]
    returned_count = len(items)
    response_reason = reason
    if returned_count:
        response_reason = ""
    elif not response_reason:
        response_reason = cap_status["reason"] or "no_due_posts"

    return {
        "ok": True,
        "due_count": due_count,
        "returned_count": returned_count,
        "posted_today": cap_status["posted_today"],
        "daily_cap": cap_status["daily_cap"],
        "daily_remaining": cap_status["daily_remaining"],
        "per_run_cap": cap_status["per_run_cap"],
        "min_spacing_minutes": cap_status["min_spacing_minutes"],
        "latest_posted_at": serialize_cap_datetime(latest_posted_at),
        "next_allowed_post_at": serialize_cap_datetime(next_allowed_post_at),
        "reason": response_reason,
        "blocked_reason_counts": blocked_reason_counts or {},
        "candidate_counts_by_tier": candidate_counts_by_tier or empty_tier_counts(),
        "selected_counts_by_tier": selected_counts_by_tier or empty_tier_counts(),
        "candidate_counts_by_deadline_window": (
            candidate_counts_by_deadline_window or empty_deadline_window_counts()
        ),
        "selected_counts_by_deadline_window": (
            selected_counts_by_deadline_window or empty_deadline_window_counts()
        ),
        "deadline_balance_policy": "balanced_deadline_windows",
        "urgent_selected_count": (
            selected_counts_by_deadline_window or {}
        ).get("urgent", 0),
        "advance_notice_selected_count": (
            selected_counts_by_deadline_window or {}
        ).get("advance_notice", 0),
        "fallback_used": fallback_used,
        "selection_policy": "ranked_fallback",
        "daily_target": cap_status["daily_cap"],
        "per_run_target": cap_status["per_run_cap"],
        "items": items,
    }


def get_due_facebook_post_plan_response(limit=10, now=None):
    return get_due_facebook_post_plans(limit=limit, now=now)


def get_due_facebook_post_plans(limit=10, now=None):
    limit = parse_due_post_limit(limit)
    now = now or timezone.now()
    cap_status = facebook_posting_cap_status(now=now)
    effective_limit = min(limit, cap_status["per_run_cap"], cap_status["daily_remaining"])
    candidate_data = build_ranked_facebook_post_candidates(now=now)
    candidates = candidate_data["candidates"]
    blocked_reason_counts = candidate_data["blocked_reason_counts"]
    candidate_counts_by_tier = candidate_data["candidate_counts_by_tier"]
    candidate_counts_by_deadline_window = candidate_data["candidate_counts_by_deadline_window"]
    selected_counts_by_tier = empty_tier_counts()
    selected_counts_by_deadline_window = empty_deadline_window_counts()

    if (
        cap_status["daily_remaining"] <= 0
        or cap_status["reason"] == "minimum_interval_not_reached"
    ):
        return build_due_posts_response(
            [],
            len(candidates),
            cap_status,
            blocked_reason_counts=blocked_reason_counts,
            candidate_counts_by_tier=candidate_counts_by_tier,
            selected_counts_by_tier=selected_counts_by_tier,
            candidate_counts_by_deadline_window=candidate_counts_by_deadline_window,
            selected_counts_by_deadline_window=selected_counts_by_deadline_window,
        )

    if effective_limit <= 0:
        return build_due_posts_response(
            [],
            len(candidates),
            cap_status,
            reason="no_capacity",
            blocked_reason_counts=blocked_reason_counts,
            candidate_counts_by_tier=candidate_counts_by_tier,
            selected_counts_by_tier=selected_counts_by_tier,
            candidate_counts_by_deadline_window=candidate_counts_by_deadline_window,
            selected_counts_by_deadline_window=selected_counts_by_deadline_window,
        )

    selected_candidates = select_balanced_deadline_candidates(candidates, effective_limit)
    items = []
    for candidate in selected_candidates:
        eligibility = candidate["eligibility"]
        count_candidate_tier(eligibility["auto_post_tier"], selected_counts_by_tier)
        count_deadline_window(eligibility["deadline_window"], selected_counts_by_deadline_window)
        if candidate["type"] == "opportunity":
            plan = candidate["plan"]
            today = timezone.localtime(now).date()
            days_left = deadline_days_left(plan.opportunity, today=today)
            recently_checked = (
                plan.opportunity.deadline_last_checked_at
                and plan.opportunity.deadline_last_checked_at >= now - timedelta(hours=24)
            )
            if days_left is not None and 0 <= days_left <= 3 and not recently_checked:
                plan.opportunity.deadline_check_status = Opportunity.DeadlineCheckStatus.NEEDS_REVIEW
                plan.opportunity.deadline_check_note = (
                    "Near-deadline social post is due, but the deadline has not been "
                    "checked in the last 24 hours."
                )
                plan.opportunity.save(
                    update_fields=[
                        "deadline_check_status",
                        "deadline_check_note",
                        "updated_at",
                    ]
                )
                logger.warning(
                    "Near-deadline Facebook plan needs deadline verification before posting: "
                    "opportunity_id=%s plan_id=%s days_left=%s",
                    plan.opportunity_id,
                    plan.pk,
                    days_left,
                )
            item = serialize_due_plan(plan)
        else:
            item = serialize_due_collection_plan(candidate["plan"])
        item.update(
            {
                "auto_post_tier": eligibility["auto_post_tier"],
                "auto_post_tier_label": eligibility["auto_post_tier_label"],
                "auto_post_rank_score": eligibility["auto_post_rank_score"],
                "fallback_eligible": eligibility["fallback_eligible"],
                "hard_blocking_reasons": eligibility["hard_blocking_reasons"],
                "quality_warnings": eligibility["quality_warnings"],
                "deadline_window": eligibility["deadline_window"],
                "deadline_window_label": eligibility["deadline_window_label"],
                "days_until_deadline": eligibility.get("days_until_deadline"),
            }
        )
        items.append(item)
    return build_due_posts_response(
        items,
        len(candidates),
        cap_status,
        blocked_reason_counts=blocked_reason_counts,
        candidate_counts_by_tier=candidate_counts_by_tier,
        selected_counts_by_tier=selected_counts_by_tier,
        candidate_counts_by_deadline_window=candidate_counts_by_deadline_window,
        selected_counts_by_deadline_window=selected_counts_by_deadline_window,
        fallback_used=any(
            item["auto_post_tier"] not in {"strict_best", "collection_strict_best"}
            for item in items
        ),
    )


def get_due_facebook_post_plan_items(limit=10, now=None):
    return get_due_facebook_post_plans(limit=limit, now=now)["items"]


def record_facebook_post_result(payload):
    item_type = str(payload.get("type") or "opportunity").strip() or "opportunity"
    if item_type == "collection":
        return record_collection_facebook_post_result(payload)
    if item_type != "opportunity":
        return None, {"detail": "Invalid post type."}

    status_value = payload.get("status")
    valid_statuses = {choice[0] for choice in OpportunitySocialPostLog.Status.choices}
    if status_value not in valid_statuses:
        return None, {"detail": "Invalid status."}

    plan = None
    plan_id = payload.get("plan_id")
    opportunity_id = payload.get("opportunity_id")

    if plan_id:
        plan = (
            OpportunitySocialPostPlan.objects.select_related("opportunity")
            .filter(pk=plan_id)
            .first()
        )

    if not plan and opportunity_id:
        plan = (
            OpportunitySocialPostPlan.objects.select_related("opportunity")
            .filter(opportunity_id=opportunity_id, platform=DEFAULT_PLATFORM)
            .first()
        )

    if not plan:
        return None, {"detail": "Social post plan not found."}

    now = timezone.now()
    posted_at = now if status_value == OpportunitySocialPostLog.Status.POSTED else None
    log = OpportunitySocialPostLog.objects.create(
        opportunity=plan.opportunity,
        plan=plan,
        platform=DEFAULT_PLATFORM,
        message=str(payload.get("message") or ""),
        image_url=str(payload.get("image_url") or ""),
        image_source=str(payload.get("image_source") or ""),
        link_url=str(payload.get("link_url") or ""),
        facebook_post_id=str(payload.get("facebook_post_id") or ""),
        facebook_post_url=str(payload.get("facebook_post_url") or ""),
        status=status_value,
        error_message=str(payload.get("error_message") or ""),
        posted_at=posted_at,
    )

    if status_value == OpportunitySocialPostLog.Status.POSTED:
        plan.last_posted_at = now
        plan.post_count = F("post_count") + 1
        plan.last_error = ""
        plan.next_post_at = next_post_time_for_plan(plan, now=now)
        plan.save(
            update_fields=[
                "last_posted_at",
                "post_count",
                "last_error",
                "next_post_at",
                "updated_at",
            ]
        )
        plan.refresh_from_db(fields=["post_count"])
    elif status_value == OpportunitySocialPostLog.Status.FAILED:
        plan.last_error = log.error_message
        plan.save(update_fields=["last_error", "updated_at"])

    return log, None


def record_collection_facebook_post_result(payload):
    status_value = payload.get("status")
    valid_statuses = {choice[0] for choice in OpportunityCollectionSocialPostLog.Status.choices}
    if status_value not in valid_statuses:
        return None, {"detail": "Invalid status."}

    plan = None
    plan_id = payload.get("plan_id")
    collection_id = payload.get("collection_id")

    if plan_id:
        plan = (
            OpportunityCollectionSocialPostPlan.objects.select_related("collection")
            .filter(pk=plan_id)
            .first()
        )

    if not plan and collection_id:
        plan = (
            OpportunityCollectionSocialPostPlan.objects.select_related("collection")
            .filter(collection_id=collection_id, platform=DEFAULT_PLATFORM)
            .order_by("-updated_at")
            .first()
        )

    if not plan:
        return None, {"detail": "Collection social post plan not found."}

    now = timezone.now()
    log = OpportunityCollectionSocialPostLog.objects.create(
        collection=plan.collection,
        plan=plan,
        platform=DEFAULT_PLATFORM,
        status=status_value,
        facebook_post_id=str(payload.get("facebook_post_id") or ""),
        error_message=str(payload.get("error_message") or ""),
        response_payload={
            "facebook_post_url": str(payload.get("facebook_post_url") or ""),
            "message": str(payload.get("message") or ""),
            "image_url": str(payload.get("image_url") or ""),
            "image_source": str(payload.get("image_source") or ""),
            "link_url": str(payload.get("link_url") or ""),
        },
    )

    if status_value == OpportunityCollectionSocialPostLog.Status.POSTED:
        plan.status = OpportunityCollectionSocialPostPlan.Status.POSTED
        plan.posted_at = now
        plan.facebook_post_id = log.facebook_post_id
        plan.save(update_fields=["status", "posted_at", "facebook_post_id", "updated_at"])

        plan.collection.status = OpportunityCollection.Status.POSTED
        plan.collection.save(update_fields=["status", "updated_at"])
    elif status_value == OpportunityCollectionSocialPostLog.Status.FAILED:
        plan.status = OpportunityCollectionSocialPostPlan.Status.FAILED
        plan.save(update_fields=["status", "updated_at"])

    return log, None
