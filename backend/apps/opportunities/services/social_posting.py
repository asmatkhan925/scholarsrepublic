from datetime import date, timedelta

from django.conf import settings
from django.db.models import F
from django.utils import timezone

from apps.opportunities.models import (
    Opportunity,
    OpportunityDraft,
    OpportunitySocialDraft,
    OpportunitySocialPostLog,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.social_image_uploads import (
    get_preferred_social_image_source,
    get_preferred_social_image_url,
)


DEFAULT_PLATFORM = "facebook"


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


def generate_facebook_post_text(opportunity, link_url=None):
    if not opportunity or not str(getattr(opportunity, "title", "") or "").strip():
        return ""

    link_url = link_url or scholarship_detail_url(opportunity)
    if not link_url:
        return ""

    provider = provider_label(opportunity)
    degree = degree_label(opportunity)
    funding = funding_label(opportunity)
    deadline = deadline_label(opportunity)

    lines = [opportunity.title.strip(), ""]
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
    lines.extend([paragraph, "", "Key Details:"])

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


def promote_social_draft_to_plan(draft):
    if not draft.created_opportunity_id:
        return None

    opportunity = draft.created_opportunity
    social_draft = draft.social_drafts.order_by("-updated_at").first()
    if not social_draft:
        return None

    status = OpportunitySocialPostPlan.Status.DRAFT
    if opportunity.status == Opportunity.Status.PUBLISHED and not opportunity.is_expired:
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

    if opportunity.is_expired:
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
        days_left = (opportunity.deadline - timezone.localdate()).days
        if days_left <= 7 and days_left >= 0:
            return now + timedelta(hours=24)

    return now + timedelta(days=7)


def plan_image_url(plan):
    return get_preferred_social_image_url(plan)


def serialize_due_plan(plan):
    opportunity = plan.opportunity
    link_url = plan.link_url or scholarship_detail_url(opportunity)
    message = ensure_plan_post_text(plan)
    days_left = opportunity.days_until_deadline
    image_url = plan_image_url(plan)

    return {
        "plan_id": plan.pk,
        "opportunity_id": opportunity.pk,
        "slug": opportunity.slug,
        "title": opportunity.title,
        "message": message,
        "image_url": image_url,
        "image_source": get_preferred_social_image_source(plan),
        "has_image": bool(image_url),
        "link_url": link_url,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "days_left": days_left,
    }


def due_plan_sort_key(plan, today):
    opportunity = plan.opportunity

    if opportunity.deadline and not opportunity.is_rolling_deadline:
        days_left = (opportunity.deadline - today).days
        if days_left <= 7:
            return (0, opportunity.deadline, plan.pk)
        return (2, opportunity.deadline, plan.pk)

    return (1, date.max, plan.pk)


def get_due_facebook_post_plans(limit=10, now=None):
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 10

    limit = max(1, min(limit, 50))
    plans = (
        OpportunitySocialPostPlan.objects.select_related("opportunity", "opportunity__country_ref")
        .filter(
            platform=DEFAULT_PLATFORM,
            enabled=True,
            status=OpportunitySocialPostPlan.Status.READY,
            opportunity__status=Opportunity.Status.PUBLISHED,
        )
        .order_by("id")
    )

    now = now or timezone.now()
    today = timezone.localtime(now).date()
    due_plans = []
    for plan in plans:
        if not is_plan_due(plan, now=now):
            continue
        if not ensure_plan_post_text(plan):
            continue
        else:
            due_plans.append(plan)

    due_plans.sort(key=lambda plan: due_plan_sort_key(plan, today))
    items = [serialize_due_plan(plan) for plan in due_plans[:limit]]
    return items


def record_facebook_post_result(payload):
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
