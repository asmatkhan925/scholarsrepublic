from datetime import datetime, time, timedelta
import textwrap

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunityReelLog, OpportunityReelPlan
from apps.opportunities.services.social_posting import (
    degree_label,
    is_opportunity_expired_for_social,
    scholarship_detail_url,
    site_url,
)


SOCIAL_REELS_FACEBOOK_DAILY_CAP = 1


def configured_reel_daily_cap():
    try:
        return max(
            0,
            int(
                getattr(
                    settings,
                    "SOCIAL_REELS_FACEBOOK_DAILY_CAP",
                    SOCIAL_REELS_FACEBOOK_DAILY_CAP,
                )
            ),
        )
    except (TypeError, ValueError):
        return SOCIAL_REELS_FACEBOOK_DAILY_CAP


def clean_source_ids(value):
    if not isinstance(value, list):
        return []
    cleaned = []
    seen = set()
    for item in value:
        try:
            item_id = int(item)
        except (TypeError, ValueError):
            continue
        if item_id > 0 and item_id not in seen:
            cleaned.append(item_id)
            seen.add(item_id)
    return cleaned


def reel_video_exists(plan):
    if plan.video_file:
        try:
            return bool(plan.video_file.storage.exists(plan.video_file.name))
        except Exception:
            return bool(plan.video_file.name)
    return bool(str(plan.video_url or "").strip())


def source_opportunities_are_safe(plan, today=None):
    source_ids = clean_source_ids(plan.source_opportunity_ids)
    if not source_ids:
        return True

    today = today or timezone.localdate()
    opportunities = {
        opportunity.pk: opportunity
        for opportunity in Opportunity.objects.filter(pk__in=source_ids)
    }
    for source_id in source_ids:
        opportunity = opportunities.get(source_id)
        if not opportunity:
            return False
        if opportunity.status != Opportunity.Status.PUBLISHED:
            return False
        if opportunity.opportunity_type != Opportunity.OpportunityType.SCHOLARSHIP:
            return False
        if is_opportunity_expired_for_social(opportunity, today=today):
            return False
    return True


def get_source_opportunities_for_reel(plan):
    source_ids = clean_source_ids(plan.source_opportunity_ids)
    if not source_ids:
        return []
    opportunities = {
        opportunity.pk: opportunity
        for opportunity in Opportunity.objects.filter(pk__in=source_ids)
    }
    return [opportunities[source_id] for source_id in source_ids if source_id in opportunities]


def short_caption_title(value, width=74):
    return textwrap.shorten(" ".join(str(value or "").split()), width=width, placeholder="...")


def reel_deadline_label(opportunity):
    if not opportunity.deadline:
        return "Check official page"
    return opportunity.deadline.strftime("%b ") + str(opportunity.deadline.day)


def reel_public_url(opportunity):
    if not opportunity or not opportunity.slug:
        return ""
    return scholarship_detail_url(opportunity)


def source_opportunity_summary(opportunity):
    return {
        "id": opportunity.pk,
        "title": opportunity.title,
        "public_url": reel_public_url(opportunity),
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
    }


def build_reel_facebook_caption(plan):
    opportunities = get_source_opportunities_for_reel(plan)
    if not opportunities:
        text = str(plan.caption_text or "").strip()
        if text:
            return text
        return generic_reel_caption(plan)

    if plan.reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        lines = ["\U0001F393 Scholarships to Prepare Early", ""]
        action = (
            "Prepare your documents early and always confirm requirements from the official source."
        )
        link_label = "Details"
        max_items = 3
    elif plan.reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        opportunity = opportunities[0]
        lines = ["\U0001F393 Scholarship Alert", "", short_caption_title(opportunity.title), ""]
        lines.append(f"Deadline: {reel_deadline_label(opportunity)}")
        if opportunity.country:
            lines.append(f"Country: {opportunity.country}")
        degree = degree_label(opportunity)
        if degree:
            lines.append(f"Degree: {degree}")
        public_url = reel_public_url(opportunity)
        if public_url:
            lines.extend(["", "Details:", public_url])
        lines.extend(
            [
                "",
                "Check eligibility and official application instructions before applying.",
                "",
                "Scholars Republic",
                site_url(),
            ]
        )
        return trim_caption("\n".join(lines))
    else:
        lines = ["\U0001F393 Scholarships Closing Soon", ""]
        action = "Check eligibility, required documents, and official links before applying."
        link_label = "Apply/Details"
        max_items = 3

    for index, opportunity in enumerate(opportunities[:max_items], start=1):
        lines.append(f"{index}. {short_caption_title(opportunity.title)}")
        lines.append(f"Deadline: {reel_deadline_label(opportunity)}")
        public_url = reel_public_url(opportunity)
        if public_url:
            lines.append(f"{link_label}: {public_url}")
        lines.append("")

    lines.extend([action, "", "Scholars Republic", site_url()])
    return trim_caption("\n".join(lines))


def trim_caption(value, limit=1200):
    value = str(value or "").strip()
    if len(value) <= limit:
        return value
    return textwrap.shorten(value, width=limit, placeholder="...")


def generic_reel_caption(plan):
    if plan.reel_type == OpportunityReelPlan.ReelType.CLOSING_SOON:
        return "Scholarships closing soon. Check eligibility and official deadlines on Scholars Republic."
    if plan.reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        return "Start preparing early for these scholarship opportunities on Scholars Republic."
    return "Scholarship opportunity for international students. Review details on Scholars Republic."


def due_reel_caption(plan):
    return build_reel_facebook_caption(plan)


def reel_video_url(plan, request=None):
    if plan.video_file:
        url = plan.video_file.url
    else:
        url = plan.video_url or ""
    if not url:
        return ""
    if request is not None:
        return request.build_absolute_uri(url)
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return f"{site_url()}{url if url.startswith('/') else '/' + url}"


def due_facebook_reel_payload(plan, request=None):
    return {
        "type": "reel",
        "plan_id": plan.pk,
        "reel_type": plan.reel_type,
        "template_key": plan.template_key,
        "title": plan.title,
        "caption": due_reel_caption(plan),
        "video_url": reel_video_url(plan, request=request),
        "source_opportunity_ids": clean_source_ids(plan.source_opportunity_ids),
        "source_opportunities": [
            source_opportunity_summary(opportunity)
            for opportunity in get_source_opportunities_for_reel(plan)
        ],
        "next_post_at": plan.next_post_at.isoformat() if plan.next_post_at else None,
    }


def get_due_facebook_reel_plan_response(*, limit=1, request=None, now=None):
    now = now or timezone.now()
    today = timezone.localdate(now)
    daily_cap = configured_reel_daily_cap()
    posted_today = OpportunityReelPlan.objects.filter(
        facebook_posted_at__gte=timezone.make_aware(
            datetime.combine(today, time.min),
            timezone.get_current_timezone(),
        ),
        facebook_posted_at__lt=timezone.make_aware(
            datetime.combine(today + timedelta(days=1), time.min),
            timezone.get_current_timezone(),
        ),
    ).count()
    daily_remaining = max(0, daily_cap - posted_today)
    try:
        requested_limit = int(limit or 1)
    except (TypeError, ValueError):
        requested_limit = 1
    limit = min(max(1, requested_limit), daily_remaining or 1)

    if daily_remaining <= 0:
        return {
            "ok": True,
            "daily_cap": daily_cap,
            "posted_today": posted_today,
            "daily_remaining": 0,
            "due_count": 0,
            "returned_count": 0,
            "reason": "daily_cap_reached",
            "items": [],
        }

    queryset = (
        OpportunityReelPlan.objects.filter(
            status=OpportunityReelPlan.Status.READY,
            facebook_posted_at__isnull=True,
        )
        .filter(Q(video_file__gt="") | Q(video_url__gt=""))
        .filter(Q(next_post_at__isnull=True) | Q(next_post_at__lte=now))
        .exclude(render_error__gt="")
        .exclude(facebook_post_id__gt="")
        .exclude(facebook_video_id__gt="")
        .order_by("-priority_score", "-created_at")
    )

    items = []
    due_count = 0
    for plan in queryset:
        if not reel_video_exists(plan):
            continue
        if not source_opportunities_are_safe(plan, today=today):
            continue
        due_count += 1
        if len(items) < limit:
            items.append(due_facebook_reel_payload(plan, request=request))

    return {
        "ok": True,
        "daily_cap": daily_cap,
        "posted_today": posted_today,
        "daily_remaining": daily_remaining,
        "due_count": due_count,
        "returned_count": len(items),
        "reason": "" if items else "no_due_reels",
        "items": items,
    }


def mark_facebook_reel_posted(plan, payload):
    payload = payload if isinstance(payload, dict) else {}
    plan.status = OpportunityReelPlan.Status.POSTED
    plan.facebook_post_id = str(payload.get("facebook_post_id") or "")[:255]
    plan.facebook_video_id = str(payload.get("facebook_video_id") or "")[:255]
    plan.facebook_posted_at = timezone.now()
    plan.facebook_post_error = ""
    plan.save(
        update_fields=[
            "status",
            "facebook_post_id",
            "facebook_video_id",
            "facebook_posted_at",
            "facebook_post_error",
            "updated_at",
        ]
    )
    return OpportunityReelLog.objects.create(
        reel_plan=plan,
        status=OpportunityReelLog.Status.POSTED,
        response_payload=payload,
    )


def mark_facebook_reel_failed(plan, payload):
    payload = payload if isinstance(payload, dict) else {}
    error_message = str(
        payload.get("error_message") or payload.get("error") or "Facebook reel posting failed."
    ).strip()
    plan.facebook_post_error = error_message
    plan.save(update_fields=["facebook_post_error", "updated_at"])
    return OpportunityReelLog.objects.create(
        reel_plan=plan,
        status=OpportunityReelLog.Status.FAILED,
        error_message=error_message,
        response_payload=payload,
    )
