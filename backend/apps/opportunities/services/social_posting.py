import logging
from datetime import date, datetime, time, timedelta

import requests
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
FACEBOOK_WORKER_TIMEOUT_SECONDS = 30
FACEBOOK_WORKER_USER_AGENT = "ScholarsRepublicBackend/1.0"
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


def is_near_deadline(opportunity, today=None):
    days_left = deadline_days_left(opportunity, today=today)
    return days_left is not None and 0 <= days_left <= 7


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

    lines = [opportunity.title.strip(), ""]
    reminder = deadline_reminder_line(opportunity) if include_reminder else ""
    if reminder:
        lines.extend([reminder, ""])
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
        days_left = (opportunity.deadline - timezone.localtime(now).date()).days
        if days_left <= 7 and days_left >= 0:
            tomorrow = timezone.localtime(now).date() + timedelta(days=1)
            next_time = datetime.combine(tomorrow, time(hour=9))
            return timezone.make_aware(next_time, timezone.get_current_timezone())

    return now + timedelta(days=7)


def plan_image_url(plan):
    return get_preferred_social_image_url(plan)


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

    if opportunity.is_expired:
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
            if opportunity.status == Opportunity.Status.PUBLISHED and not opportunity.is_expired
            else OpportunitySocialPostPlan.Status.DRAFT,
            "link_url": scholarship_detail_url(opportunity),
        },
    )
    return plan


def post_plan_to_facebook_now(opportunity, force=False):
    if not opportunity:
        return {"ok": False, "status": "not_found", "error": "Scholarship not found."}

    plan = get_or_create_facebook_plan(opportunity)
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
    plan.enabled = True
    plan.status = OpportunitySocialPostPlan.Status.READY
    plan.link_url = plan.link_url or scholarship_detail_url(opportunity)
    plan.next_post_at = next_post_at
    ensure_plan_post_text(plan)
    plan.save(update_fields=["enabled", "status", "link_url", "next_post_at", "updated_at"])
    return plan


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
        post_check = can_post_opportunity_today(plan.opportunity, plan, today=today)
        if not post_check["can_post"]:
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
