from datetime import timedelta

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


def fallback_social_post_text(opportunity, link_url=None):
    lines = [f"Scholarship opportunity: {opportunity.title}", ""]
    details = []

    if opportunity.country:
        details.append(f"Country: {opportunity.country}")

    provider = (
        opportunity.provider_name
        or opportunity.university_name
        or opportunity.company_name
        or opportunity.source_name
    )
    if provider:
        details.append(f"Provider: {provider}")

    if opportunity.degree_levels:
        details.append(f"Degree: {', '.join(opportunity.degree_levels[:2])}")

    if opportunity.funding_type:
        details.append(f"Funding: {format_funding(opportunity.funding_type)}")

    if opportunity.deadline:
        details.append(f"Deadline: {opportunity.deadline.isoformat()}")

    lines.extend(details)
    lines.extend(["", "View details and official source:", link_url or scholarship_detail_url(opportunity)])
    return "\n".join(line for line in lines if line != "")


def promote_social_draft_to_plan(draft):
    if not draft.created_opportunity_id:
        return None

    opportunity = draft.created_opportunity
    social_draft = draft.social_drafts.order_by("-updated_at").first()
    if not social_draft:
        return None

    status = OpportunitySocialPostPlan.Status.DRAFT
    if opportunity.status == Opportunity.Status.PUBLISHED:
        status = OpportunitySocialPostPlan.Status.READY

    plan, _ = OpportunitySocialPostPlan.objects.update_or_create(
        opportunity=opportunity,
        platform=DEFAULT_PLATFORM,
        defaults={
            "enabled": True,
            "status": status,
            "post_text": social_draft.facebook_post_text,
            "image_prompt": social_draft.facebook_image_prompt,
            "image": social_draft.facebook_image,
            "image_url": social_draft.facebook_image_url,
            "link_url": scholarship_detail_url(opportunity),
        },
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
    today = timezone.localdate()
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
            if plan.last_posted_at.date() == today:
                return False
            return plan.last_posted_at <= now - timedelta(hours=24)

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
    if plan.image:
        return absolute_url(plan.image.url)

    if plan.image_url:
        return plan.image_url

    return ""


def serialize_due_plan(plan):
    opportunity = plan.opportunity
    link_url = plan.link_url or scholarship_detail_url(opportunity)
    message = plan.post_text.strip() or fallback_social_post_text(opportunity, link_url)
    days_left = opportunity.days_until_deadline

    return {
        "plan_id": plan.pk,
        "opportunity_id": opportunity.pk,
        "slug": opportunity.slug,
        "title": opportunity.title,
        "message": message,
        "image_url": plan_image_url(plan),
        "link_url": link_url,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "days_left": days_left,
    }


def get_due_facebook_post_plans(limit=5, now=None):
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 5

    limit = max(1, min(limit, 50))
    plans = (
        OpportunitySocialPostPlan.objects.select_related("opportunity", "opportunity__country_ref")
        .filter(
            platform=DEFAULT_PLATFORM,
            enabled=True,
            status=OpportunitySocialPostPlan.Status.READY,
            opportunity__status=Opportunity.Status.PUBLISHED,
        )
        .order_by("next_post_at", "last_posted_at", "id")
    )

    items = []
    for plan in plans:
        if is_plan_due(plan, now=now):
            items.append(serialize_due_plan(plan))
        if len(items) >= limit:
            break

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
