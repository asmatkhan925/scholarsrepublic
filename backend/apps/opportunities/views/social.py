"""
Social posting, scheduling, Facebook, and social plan views — agent + admin.
"""
import logging
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityCollectionSocialPostLog,
    OpportunityCollectionSocialPostPlan,
    OpportunitySocialPostLog,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.social_posting import (
    DEFAULT_PLATFORM,
    AUTO_POST_BLOCKED_REASON_CODES,
    AUTO_POST_TIER_RANKS,
    count_blocked_reasons,
    evaluate_collection_auto_post_eligibility,
    evaluate_opportunity_auto_post_eligibility,
    generate_facebook_post_text,
    get_due_facebook_post_plan_response,
    mark_social_image_stale_for_deadline_change,
    post_plan_to_facebook_now,
    record_facebook_post_result,
    regenerate_facebook_caption_for_opportunity,
    schedule_facebook_plan,
    scholarship_detail_url,
)
from apps.opportunities.services.social_scheduler import apply_social_priority
from apps.opportunities.services.social_image_uploads import (
    get_preferred_social_image_source,
    get_preferred_social_image_url,
)

from ._shared import (
    AgentScholarshipBaseView,
    IsPlatformAdmin,
    SocialWorkerBaseView,
    _social_image_response,
    parse_bool,
    parse_positive_int,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Social serialization helpers
# ---------------------------------------------------------------------------

def _serialize_scheduler_datetime(value):
    if not value:
        return None
    return timezone.localtime(value).isoformat()


def _serialize_social_datetime(value):
    return _serialize_scheduler_datetime(value)


def _count_by_status(model, statuses, **filters):
    counts = dict(
        model.objects.filter(**filters).values_list("status").annotate(total=Count("id"))
    )
    return {status_value: counts.get(status_value, 0) for status_value in statuses}


def _serialize_due_preview_item(item):
    item_type = item.get("type") or "opportunity"
    data = {
        "type": item_type,
        "plan_id": item.get("plan_id"),
        "message": item.get("message"),
        "image_url": item.get("image_url"),
        "image_source": item.get("image_source"),
        "link_url": item.get("link_url"),
        "priority_score": item.get("priority_score"),
        "deadline_window": item.get("deadline_window"),
        "deadline_window_label": item.get("deadline_window_label"),
        "days_until_deadline": item.get("days_until_deadline"),
        "auto_post_tier": item.get("auto_post_tier"),
        "auto_post_tier_label": item.get("auto_post_tier_label"),
        "auto_post_rank_score": item.get("auto_post_rank_score"),
        "fallback_eligible": item.get("fallback_eligible"),
        "hard_blocking_reasons": item.get("hard_blocking_reasons") or [],
        "quality_warnings": item.get("quality_warnings") or [],
    }
    if item_type == "collection":
        data.update(
            {
                "collection_id": item.get("collection_id"),
                "collection_title": item.get("collection_title"),
                "next_post_at": item.get("next_post_at"),
            }
        )
    else:
        data.update(
            {
                "opportunity_id": item.get("opportunity_id"),
                "title": item.get("title"),
                "auto_social_decision": item.get("auto_social_decision"),
                "priority_reason": item.get("priority_reason"),
            }
        )
    return data


def _admin_social_plan_limit(request):
    return min(parse_positive_int(request.query_params.get("limit")) or 50, 100)


def _filter_text_search(queryset, query, fields):
    query = str(query or "").strip()
    if not query:
        return queryset
    condition = Q()
    for field in fields:
        condition |= Q(**{f"{field}__icontains": query})
    if query.isdigit():
        condition |= Q(pk=int(query))
    return queryset.filter(condition)


def _admin_social_log_date_range(request):
    date_from = parse_date(str(request.query_params.get("date_from") or "").strip())
    date_to = parse_date(str(request.query_params.get("date_to") or "").strip())
    current_tz = timezone.get_current_timezone()
    start_at = None
    end_at = None
    if date_from:
        start_at = timezone.make_aware(datetime.combine(date_from, datetime.min.time()), current_tz)
    if date_to:
        end_at = timezone.make_aware(datetime.combine(date_to, datetime.max.time()), current_tz)
    return start_at, end_at


def _apply_social_log_filters(queryset, request, title_field):
    status_filter = str(request.query_params.get("status") or "").strip()
    if status_filter and status_filter != "all":
        queryset = queryset.filter(status=status_filter)
    start_at, end_at = _admin_social_log_date_range(request)
    if start_at:
        queryset = queryset.filter(created_at__gte=start_at)
    if end_at:
        queryset = queryset.filter(created_at__lte=end_at)
    return _filter_text_search(queryset, request.query_params.get("q"), [title_field])


def _serialize_admin_opportunity_social_plan(plan):
    opportunity = plan.opportunity
    eligibility = evaluate_opportunity_auto_post_eligibility(plan)
    return {
        "id": plan.pk,
        "type": "opportunity",
        "platform": plan.platform,
        "status": plan.status,
        "enabled": plan.enabled,
        "opportunity_id": plan.opportunity_id,
        "opportunity_title": opportunity.title,
        "opportunity_slug": opportunity.slug,
        "opportunity_status": opportunity.status,
        "provider_name": opportunity.provider_name,
        "country": opportunity.country,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "days_until_deadline": eligibility["days_until_deadline"],
        "deadline_window": eligibility["deadline_window"],
        "deadline_window_label": eligibility["deadline_window_label"],
        "post_text": plan.post_text,
        "link_url": plan.link_url,
        "image_url": get_preferred_social_image_url(plan),
        "image_source": get_preferred_social_image_source(plan),
        "has_image": eligibility["has_image"],
        "has_caption": eligibility["has_caption"],
        "is_near_deadline": eligibility["is_near_deadline"],
        "auto_post_eligible": eligibility["auto_post_eligible"],
        "fallback_eligible": eligibility["fallback_eligible"],
        "auto_post_tier": eligibility["auto_post_tier"],
        "auto_post_tier_label": eligibility["auto_post_tier_label"],
        "auto_post_rank_score": eligibility["auto_post_rank_score"],
        "ranking_explanation": eligibility["ranking_explanation"],
        "hard_blocking_reasons": eligibility["hard_blocking_reasons"],
        "quality_warnings": eligibility["quality_warnings"],
        "blocking_reasons": eligibility["blocking_reasons"],
        "next_post_at": _serialize_social_datetime(plan.next_post_at),
        "last_posted_at": _serialize_social_datetime(plan.last_posted_at),
        "priority_score": plan.priority_score,
        "priority_reason": plan.priority_reason,
        "auto_social_decision": plan.auto_social_decision,
        "last_error": plan.last_error,
        "updated_at": _serialize_social_datetime(plan.updated_at),
        "admin_url": f"/admin/opportunities/opportunitysocialpostplan/{plan.pk}/change/",
    }


def _serialize_admin_collection_social_plan(plan):
    collection = plan.collection
    eligibility = evaluate_collection_auto_post_eligibility(plan)
    return {
        "id": plan.pk,
        "type": "collection",
        "platform": plan.platform,
        "status": plan.status,
        "collection_id": plan.collection_id,
        "collection_title": collection.title,
        "collection_slug": collection.slug,
        "collection_status": collection.status,
        "collection_type": collection.collection_type,
        "deadline": eligibility["deadline"].isoformat() if eligibility["deadline"] else None,
        "days_until_deadline": eligibility["days_until_deadline"],
        "deadline_window": eligibility["deadline_window"],
        "deadline_window_label": eligibility["deadline_window_label"],
        "post_text": plan.post_text,
        "link_url": plan.link_url,
        "image_url": plan.image_url,
        "image_source": plan.image_source,
        "has_image": eligibility["has_image"],
        "has_caption": eligibility["has_caption"],
        "has_near_deadline_item": eligibility["has_near_deadline_item"],
        "has_expired_item": eligibility["has_expired_item"],
        "auto_post_eligible": eligibility["auto_post_eligible"],
        "fallback_eligible": eligibility["fallback_eligible"],
        "auto_post_tier": eligibility["auto_post_tier"],
        "auto_post_tier_label": eligibility["auto_post_tier_label"],
        "auto_post_rank_score": eligibility["auto_post_rank_score"],
        "ranking_explanation": eligibility["ranking_explanation"],
        "hard_blocking_reasons": eligibility["hard_blocking_reasons"],
        "quality_warnings": eligibility["quality_warnings"],
        "blocking_reasons": eligibility["blocking_reasons"],
        "next_post_at": _serialize_social_datetime(plan.next_post_at),
        "posted_at": _serialize_social_datetime(plan.posted_at),
        "priority_score": plan.priority_score,
        "facebook_post_id": plan.facebook_post_id,
        "updated_at": _serialize_social_datetime(plan.updated_at),
        "admin_url": f"/admin/opportunities/opportunitycollectionsocialpostplan/{plan.pk}/change/",
    }


def _matches_social_plan_quality_filters(item, request):
    if parse_bool(request.query_params.get("auto_post_eligible")) is True and not item.get(
        "auto_post_eligible"
    ):
        return False
    if parse_bool(request.query_params.get("strict_best")) is True and item.get("auto_post_rank_score") != 1:
        return False
    if parse_bool(request.query_params.get("fallback_eligible")) is True and not item.get(
        "fallback_eligible"
    ):
        return False
    if parse_bool(request.query_params.get("hard_blocked")) is True and not item.get(
        "hard_blocking_reasons"
    ):
        return False
    if parse_bool(request.query_params.get("missing_image")) is True and item.get("has_image"):
        return False
    if parse_bool(request.query_params.get("missing_caption")) is True and item.get("has_caption"):
        return False
    if parse_bool(request.query_params.get("near_deadline")) is True:
        if item.get("type") == "collection":
            if not item.get("has_near_deadline_item"):
                return False
        elif not item.get("is_near_deadline"):
            return False
    deadline_window = str(request.query_params.get("deadline_window") or "").strip()
    if deadline_window and deadline_window != "all" and item.get("deadline_window") != deadline_window:
        return False
    if parse_bool(request.query_params.get("blocked")) is True and not item.get(
        "hard_blocking_reasons"
    ):
        return False
    return True


def _social_health_alert(level, code, title, message, suggested_action, related_url=""):
    return {
        "level": level,
        "code": code,
        "title": title,
        "message": message,
        "suggested_action": suggested_action,
        "related_url": related_url,
    }


def _latest_social_posted_at():
    latest_opportunity = (
        OpportunitySocialPostLog.objects.filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at__isnull=False,
        )
        .order_by("-posted_at", "-created_at")
        .first()
    )
    latest_collection = (
        OpportunityCollectionSocialPostLog.objects.filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunityCollectionSocialPostLog.Status.POSTED,
        )
        .order_by("-created_at")
        .first()
    )
    latest_posted_at = latest_opportunity.posted_at if latest_opportunity else None
    if latest_collection and (
        latest_posted_at is None or latest_collection.created_at > latest_posted_at
    ):
        latest_posted_at = latest_collection.created_at
    return latest_posted_at


def _ready_opportunity_quality_counts(now):
    counts = {reason: 0 for reason in AUTO_POST_BLOCKED_REASON_CODES}
    counts["near_deadline_missing_image"] = 0
    counts["near_deadline_missing_caption"] = 0
    queryset = OpportunitySocialPostPlan.objects.select_related(
        "opportunity",
        "opportunity__country_ref",
    ).filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostPlan.Status.READY,
        enabled=True,
    )
    for plan in queryset:
        eligibility = evaluate_opportunity_auto_post_eligibility(plan, now=now)
        count_blocked_reasons(eligibility["blocking_reasons"], counts)
        if eligibility["is_near_deadline"] and not eligibility["has_image"]:
            counts["near_deadline_missing_image"] += 1
        if eligibility["is_near_deadline"] and not eligibility["has_caption"]:
            counts["near_deadline_missing_caption"] += 1
    return counts


def _ready_collection_quality_counts(now):
    counts = {reason: 0 for reason in AUTO_POST_BLOCKED_REASON_CODES}
    queryset = OpportunityCollectionSocialPostPlan.objects.select_related(
        "collection",
    ).prefetch_related("collection__items__opportunity").filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunityCollectionSocialPostPlan.Status.READY,
    )
    for plan in queryset:
        eligibility = evaluate_collection_auto_post_eligibility(plan, now=now)
        count_blocked_reasons(eligibility["blocking_reasons"], counts)
    return counts


def _serialize_admin_opportunity_social_log(log):
    return {
        "id": log.pk,
        "type": "opportunity",
        "created_at": _serialize_social_datetime(log.created_at),
        "status": log.status,
        "title": log.opportunity.title,
        "plan_id": log.plan_id,
        "facebook_post_id": log.facebook_post_id,
        "error_message": log.error_message,
        "link_url": log.link_url or scholarship_detail_url(log.opportunity),
        "admin_url": f"/admin/opportunities/opportunitysocialpostlog/{log.pk}/change/",
        "record_admin_url": f"/admin/opportunities/opportunity/{log.opportunity_id}/change/",
    }


def _serialize_admin_collection_social_log(log):
    link_url = ""
    if log.collection.slug:
        link_url = f"https://scholarsrepublic.org/scholarships/collections/{log.collection.slug}"
    return {
        "id": log.pk,
        "type": "collection",
        "created_at": _serialize_social_datetime(log.created_at),
        "status": log.status,
        "title": log.collection.title,
        "plan_id": log.plan_id,
        "facebook_post_id": log.facebook_post_id,
        "error_message": log.error_message,
        "link_url": link_url,
        "admin_url": f"/admin/opportunities/opportunitycollectionsocialpostlog/{log.pk}/change/",
        "record_admin_url": f"/admin/opportunities/opportunitycollection/{log.collection_id}/change/",
    }


def _build_social_health_alerts(
    *,
    now,
    due_response,
    opportunity_failed_today,
    collection_failed_today,
):
    alerts = []
    overdue_cutoff = now - timedelta(hours=2)
    next_day = now + timedelta(hours=24)
    ready_opportunity_quality_counts = _ready_opportunity_quality_counts(now)
    ready_collection_quality_counts = _ready_collection_quality_counts(now)
    strict_candidate_count = sum(
        due_response.get("candidate_counts_by_tier", {}).get(tier, 0)
        for tier in ("strict_best", "collection_strict_best")
    )
    fallback_candidate_count = max(0, due_response.get("due_count", 0) - strict_candidate_count)

    empty_opportunity_count = OpportunitySocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostPlan.Status.READY,
        enabled=True,
    ).filter(Q(post_text__isnull=True) | Q(post_text__exact="")).count()
    empty_collection_count = OpportunityCollectionSocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunityCollectionSocialPostPlan.Status.READY,
    ).filter(Q(post_text__isnull=True) | Q(post_text__exact="")).count()
    overdue_opportunity_count = OpportunitySocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostPlan.Status.READY,
        enabled=True,
        next_post_at__isnull=False,
        next_post_at__lt=overdue_cutoff,
    ).count()
    overdue_collection_count = OpportunityCollectionSocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunityCollectionSocialPostPlan.Status.READY,
        next_post_at__isnull=False,
        next_post_at__lt=overdue_cutoff,
    ).count()
    manual_review_count = OpportunitySocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.MANUAL_REVIEW,
    ).count()
    unapproved_collection_plan_count = OpportunityCollectionSocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
    ).exclude(collection__status=OpportunityCollection.Status.APPROVED).count()
    upcoming_opportunity_count = OpportunitySocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunitySocialPostPlan.Status.READY,
        enabled=True,
        auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        opportunity__status=Opportunity.Status.PUBLISHED,
    ).filter(Q(next_post_at__isnull=True) | Q(next_post_at__lte=next_day)).count()
    upcoming_collection_count = OpportunityCollectionSocialPostPlan.objects.filter(
        platform=DEFAULT_PLATFORM,
        status=OpportunityCollectionSocialPostPlan.Status.READY,
        collection__status=OpportunityCollection.Status.APPROVED,
        next_post_at__isnull=False,
        next_post_at__lte=next_day,
    ).count()

    if opportunity_failed_today + collection_failed_today > 0:
        alerts.append(
            _social_health_alert(
                "critical",
                "failed_posts_today",
                "Social posts failed today",
                f"{opportunity_failed_today + collection_failed_today} social post result(s) failed today.",
                "Open Social Logs, inspect the error messages, and confirm the Worker/backend credentials are healthy.",
                "/dashboard/admin/social/logs",
            )
        )
    if due_response.get("fallback_used"):
        alerts.append(
            _social_health_alert(
                "info",
                "using_fallback_social_candidates",
                "Using fallback social candidates",
                f"{strict_candidate_count} strict candidate(s) are available, so the queue is filling remaining slots from {fallback_candidate_count} safe fallback candidate(s).",
                "Review fallback candidates for image and deadline quality when possible.",
                "/dashboard/admin/social/scheduler",
            )
        )
    elif strict_candidate_count == 0 and fallback_candidate_count > 0:
        alerts.append(
            _social_health_alert(
                "info",
                "fallback_candidates_available",
                "Fallback social candidates are available",
                f"No strict candidates are available, but {fallback_candidate_count} safe fallback candidate(s) can still post.",
                "Review missing images and deadline quality to improve future strict candidates.",
                "/dashboard/admin/social/scheduler",
            )
        )
    if due_response.get("due_count", 0) == 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "no_safe_social_candidates",
                "No safe social candidates available",
                "No ready due opportunity or collection plans currently pass the hard safety checks.",
                "Add reviewed captions and links, publish active opportunities, or approve safe collections.",
                "/dashboard/admin/social",
            )
        )
    if (
        due_response.get("returned_count", 0) > 1
        and due_response.get("urgent_selected_count", 0) == due_response.get("returned_count", 0)
    ):
        alerts.append(
            _social_health_alert(
                "info",
                "urgent_only_selection",
                "Only urgent social candidates selected",
                "The current due queue selection is all urgent reminders because no broader deadline mix was selected.",
                "Add or review soon and advance-notice candidates so students get more preparation time.",
                "/dashboard/admin/social/scheduler",
            )
        )
    if due_response.get("candidate_counts_by_deadline_window", {}).get("advance_notice", 0) == 0:
        alerts.append(
            _social_health_alert(
                "info",
                "no_advance_notice_candidates",
                "No advance-notice social candidates",
                "There are no safe due candidates with deadlines 11 to 21 days away.",
                "Review upcoming plans so the queue can notify students earlier.",
                "/dashboard/admin/social/opportunity-plans?deadline_window=advance_notice",
            )
        )
    if collection_failed_today > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "collection_failed_posts_today",
                "Collection posts failed today",
                f"{collection_failed_today} collection social post result(s) failed today.",
                "Review collection social logs and collection post plans before the next Worker run.",
                "/dashboard/admin/social/logs",
            )
        )
    if empty_opportunity_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "empty_opportunity_post_text",
                "Ready opportunity plans need captions",
                f"{empty_opportunity_count} ready opportunity social plan(s) have empty post text.",
                "Open Opportunity Social Plans and add or review captions before posting.",
                "/dashboard/admin/social/opportunity-plans",
            )
        )
    missing_image_count = ready_opportunity_quality_counts.get("missing_image", 0)
    if missing_image_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "ready_opportunity_missing_image",
                "Ready opportunity plans need images",
                f"{missing_image_count} ready opportunity social plan(s) are lower-ranked fallback candidates because they are missing a reviewed social image.",
                "Open Opportunity Social Plans and add image URLs or uploads to improve ranking.",
                "/dashboard/admin/social/opportunity-plans?missing_image=true",
            )
        )
    missing_caption_count = ready_opportunity_quality_counts.get("missing_caption", 0)
    if missing_caption_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "ready_opportunity_missing_caption",
                "Ready opportunity plans need captions",
                f"{missing_caption_count} ready opportunity social plan(s) are blocked because they are missing captions.",
                "Use the Custom GPT workflow, review the caption, and save it to the plan.",
                "/dashboard/admin/social/opportunity-plans?missing_caption=true",
            )
        )
    deadline_not_near_count = ready_opportunity_quality_counts.get("deadline_not_near", 0)
    if deadline_not_near_count > 0:
        alerts.append(
            _social_health_alert(
                "info",
                "ready_opportunity_deadline_not_near",
                "Ready opportunity plans are outside the posting window",
                f"{deadline_not_near_count} ready opportunity social plan(s) are fallback candidates because their deadline is not within 21 days.",
                "Leave them for lower-priority fallback unless closer-deadline candidates run out.",
                "/dashboard/admin/social/opportunity-plans?blocked=true",
            )
        )
    near_missing_image_count = ready_opportunity_quality_counts.get("near_deadline_missing_image", 0)
    if near_missing_image_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "near_deadline_opportunity_missing_image",
                "Near-deadline opportunity plans need images",
                f"{near_missing_image_count} ready near-deadline opportunity plan(s) may post as fallback because they are missing an image.",
                "Prioritize image review for these near-deadline plans to make them strict candidates.",
                "/dashboard/admin/social/opportunity-plans?near_deadline=true&missing_image=true",
            )
        )
    near_missing_caption_count = ready_opportunity_quality_counts.get("near_deadline_missing_caption", 0)
    if near_missing_caption_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "near_deadline_opportunity_missing_caption",
                "Near-deadline opportunity plans need captions",
                f"{near_missing_caption_count} ready near-deadline opportunity plan(s) cannot auto-post until a caption is saved.",
                "Prioritize caption review for these near-deadline plans.",
                "/dashboard/admin/social/opportunity-plans?near_deadline=true&missing_caption=true",
            )
        )
    if empty_collection_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "empty_collection_post_text",
                "Ready collection plans need captions",
                f"{empty_collection_count} ready collection social plan(s) have empty post text.",
                "Open Collection Social Plans and add or review captions before posting.",
                "/dashboard/admin/social/collection-plans",
            )
        )
    collection_missing_image_count = ready_collection_quality_counts.get(
        "collection_missing_image", 0
    )
    if collection_missing_image_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "ready_collection_missing_image",
                "Ready collection plans need images",
                f"{collection_missing_image_count} ready collection social plan(s) are fallback candidates because they are missing image URLs.",
                "Add collection social images to improve ranking.",
                "/dashboard/admin/social/collection-plans?missing_image=true",
            )
        )
    collection_missing_caption_count = ready_collection_quality_counts.get(
        "collection_missing_caption", 0
    )
    if collection_missing_caption_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "ready_collection_missing_caption",
                "Ready collection plans need captions",
                f"{collection_missing_caption_count} ready collection social plan(s) are blocked because they are missing captions.",
                "Review and save collection captions before posting.",
                "/dashboard/admin/social/collection-plans?missing_caption=true",
            )
        )
    collection_no_near_deadline_count = ready_collection_quality_counts.get(
        "collection_no_near_deadline_item", 0
    )
    if collection_no_near_deadline_count > 0:
        alerts.append(
            _social_health_alert(
                "info",
                "ready_collection_no_near_deadline_item",
                "Ready collection plans have no near-deadline item",
                f"{collection_no_near_deadline_count} ready collection social plan(s) are general fallback candidates because no item has a deadline within 21 days.",
                "Use these only after stronger opportunity and collection candidates.",
                "/dashboard/admin/social/collection-plans?blocked=true",
            )
        )
    if overdue_opportunity_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "overdue_opportunity_plans",
                "Opportunity plans are overdue",
                f"{overdue_opportunity_count} ready opportunity plan(s) are more than 2 hours past next_post_at.",
                "Check spacing/cap status and review the due opportunity plans.",
                "/dashboard/admin/social/opportunity-plans",
            )
        )
    if overdue_collection_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "overdue_collection_plans",
                "Collection plans are overdue",
                f"{overdue_collection_count} ready collection plan(s) are more than 2 hours past next_post_at.",
                "Check Worker runs and review the due collection plans.",
                "/dashboard/admin/social/collection-plans",
            )
        )
    if due_response["daily_remaining"] <= 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "daily_cap_reached",
                "Daily social cap reached",
                "The configured daily Facebook post cap has been reached.",
                "No action is needed unless the cap is too low for today; otherwise wait for the next UTC day.",
                "/dashboard/admin/social/scheduler",
            )
        )
    elif due_response["daily_remaining"] <= 2:
        alerts.append(
            _social_health_alert(
                "warning",
                "daily_remaining_low",
                "Daily social capacity is low",
                f"Only {due_response['daily_remaining']} Facebook post slot(s) remain today.",
                "Prioritize high-value plans and let lower-priority posts wait.",
                "/dashboard/admin/social/scheduler",
            )
        )
    if upcoming_opportunity_count + upcoming_collection_count == 0:
        alerts.append(
            _social_health_alert(
                "info",
                "no_ready_plans_next_24h",
                "No ready plans for the next 24 hours",
                "There are no ready opportunity or approved collection plans scheduled for the next 24 hours.",
                "Run the daily social scheduler or review draft/paused plans if social posting should continue.",
                "/dashboard/admin/social",
            )
        )
    latest_scheduled_hour = None
    utc_now = now.astimezone(dt_timezone.utc)
    for scheduled_hour in (9, 12, 15):
        if utc_now.hour > scheduled_hour or (utc_now.hour == scheduled_hour and utc_now.minute >= 30):
            latest_scheduled_hour = scheduled_hour
    if latest_scheduled_hour is not None:
        scheduled_time = utc_now.replace(
            hour=latest_scheduled_hour,
            minute=0,
            second=0,
            microsecond=0,
        )
        latest_posted_at = _latest_social_posted_at()
        if (
            due_response["due_count"] > 0
            and (latest_posted_at is None or latest_posted_at.astimezone(dt_timezone.utc) < scheduled_time)
        ):
            alerts.append(
                _social_health_alert(
                    "warning",
                    "worker_may_not_have_posted",
                    "Worker may not have posted after a scheduled run",
                    f"The {latest_scheduled_hour:02d}:00 UTC run window has passed and due posts still exist.",
                    "Check Cloudflare Worker logs and confirm the due-post endpoint is reachable.",
                    "/dashboard/admin/social/scheduler",
                )
            )
    if manual_review_count > 0:
        alerts.append(
            _social_health_alert(
                "info",
                "manual_review_opportunity_plans",
                "Opportunity plans need manual review",
                f"{manual_review_count} opportunity social plan(s) are marked manual_review.",
                "Review these plans before turning them into ready posts.",
                "/dashboard/admin/social/opportunity-plans",
            )
        )
    if unapproved_collection_plan_count > 0:
        alerts.append(
            _social_health_alert(
                "warning",
                "collection_plan_parent_not_approved",
                "Collection plans are attached to unapproved collections",
                f"{unapproved_collection_plan_count} collection social plan(s) have a parent collection that is not approved.",
                "Approve the collection or pause/archive its social plan.",
                "/dashboard/admin/social/collection-plans",
            )
        )
    if (
        due_response["due_count"] > 0
        and due_response["returned_count"] == 0
        and due_response["reason"] in {"daily_cap_reached", "minimum_interval_not_reached"}
    ):
        alerts.append(
            _social_health_alert(
                "warning",
                "due_queue_blocked_by_cap_or_spacing",
                "Due queue is blocked by cap or spacing",
                f"{due_response['due_count']} post(s) are due, but none are returned because {due_response['reason']}.",
                "Wait for spacing to clear or the next daily cap reset.",
                "/dashboard/admin/social/scheduler",
            )
        )
    return alerts


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AdminScholarshipDraftSocialPostReviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, draft_id):
        from apps.opportunities.models import OpportunityDraft, OpportunitySocialDraft

        try:
            draft = OpportunityDraft.objects.get(pk=draft_id)
        except OpportunityDraft.DoesNotExist:
            return Response(
                {"detail": "Scholarship draft not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        social_draft, _ = OpportunitySocialDraft.objects.get_or_create(
            opportunity_draft=draft
        )
        social_draft.facebook_post_text = str(request.data.get("post_text") or "").strip()
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            social_draft.facebook_image_prompt = image_prompt
        social_draft.save(
            update_fields=[
                "facebook_post_text",
                "facebook_image_prompt",
                "updated_at",
            ]
        )

        response_data = _social_image_response(social_draft, draft_id=draft.pk)
        response_data["social_draft_id"] = social_draft.pk
        return Response(response_data)


class AdminScholarshipSocialPostReviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response(
                {"detail": "Scholarship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        plan, _ = OpportunitySocialPostPlan.objects.get_or_create(
            opportunity=opportunity,
            platform=DEFAULT_PLATFORM,
            defaults={
                "enabled": True,
                "status": OpportunitySocialPostPlan.Status.READY
                if opportunity.status == Opportunity.Status.PUBLISHED
                else OpportunitySocialPostPlan.Status.DRAFT,
                "link_url": scholarship_detail_url(opportunity),
            },
        )
        link_url = str(request.data.get("link_url") or plan.link_url or "").strip()
        if not link_url:
            link_url = scholarship_detail_url(opportunity)
        post_text = str(request.data.get("post_text") or "").strip()
        if not post_text:
            post_text = generate_facebook_post_text(opportunity, link_url)

        plan.post_text = post_text
        plan.link_url = link_url
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            plan.image_prompt = image_prompt
        apply_social_priority(plan, save=False)
        plan.save(
            update_fields=[
                "post_text",
                "link_url",
                "image_prompt",
                "priority_score",
                "priority_reason",
                "auto_social_decision",
                "updated_at",
            ]
        )

        response_data = _social_image_response(plan)
        response_data["opportunity_id"] = opportunity.pk
        response_data["plan_id"] = plan.pk
        return Response(response_data)


class AdminScholarshipFacebookPostNowView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response(
                {"ok": False, "status": "not_found", "error": "Scholarship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        force = parse_bool(request.data.get("force")) if isinstance(request.data, dict) else False
        try:
            result = post_plan_to_facebook_now(opportunity, force=bool(force))
        except Exception:
            logger.exception(
                "Admin Facebook post-now request failed: opportunity_id=%s",
                opportunity_id,
            )
            return Response(
                {
                    "ok": False,
                    "status": "failed",
                    "opportunity_id": opportunity.pk,
                    "error": "Facebook post request failed. Check server logs.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not isinstance(result, dict):
            logger.error(
                "Admin Facebook post-now returned invalid result: opportunity_id=%s result=%r",
                opportunity_id,
                result,
            )
            result = {
                "ok": False,
                "status": "failed",
                "opportunity_id": opportunity.pk,
                "error": "Facebook post request failed. Check server logs.",
            }

        response_status = status.HTTP_200_OK
        if result.get("status") in {"not_published", "expired"}:
            response_status = status.HTTP_400_BAD_REQUEST
        elif result.get("status") in {
            "daily_cap_reached",
            "min_spacing_active",
            "minimum_interval_not_reached",
        }:
            response_status = status.HTTP_429_TOO_MANY_REQUESTS
        elif result.get("status") == "failed":
            response_status = status.HTTP_502_BAD_GATEWAY

        return Response(result, status=response_status)


class AdminScholarshipFacebookScheduleView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response(
                {"ok": False, "status": "not_found", "error": "Scholarship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        next_post_at_value = request.data.get("next_post_at") if isinstance(request.data, dict) else ""
        next_post_at = parse_datetime(str(next_post_at_value or ""))
        if not next_post_at:
            return Response(
                {"ok": False, "error": "next_post_at must be a valid ISO datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(next_post_at):
            next_post_at = timezone.make_aware(next_post_at, timezone.get_current_timezone())

        plan = schedule_facebook_plan(opportunity, next_post_at)
        return Response(
            {
                "ok": True,
                "status": plan.status,
                "plan_id": plan.pk,
                "opportunity_id": opportunity.pk,
                "next_post_at": plan.next_post_at,
                "message": plan.post_text,
                "link_url": plan.link_url,
            }
        )


class AgentFacebookDuePostsView(SocialWorkerBaseView):
    def post(self, request):
        auth_response = self.authorize_worker(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            get_due_facebook_post_plan_response(
                limit=request.data.get("limit", 5),
            )
        )


class AgentFacebookPostResultView(SocialWorkerBaseView):
    def post(self, request):
        auth_response = self.authorize_worker(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        log, error = record_facebook_post_result(request.data)
        if error:
            return Response(error, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "log_id": log.pk,
                "type": request.data.get("type") or "opportunity",
                "plan_id": log.plan_id,
                "opportunity_id": getattr(log, "opportunity_id", None),
                "collection_id": getattr(log, "collection_id", None),
                "status": log.status,
            }
        )


class AdminSocialOpportunityPlanListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = OpportunitySocialPostPlan.objects.select_related(
            "opportunity",
            "opportunity__country_ref",
        ).filter(platform=DEFAULT_PLATFORM)
        status_filter = str(request.query_params.get("status") or "").strip()
        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)
        decision = str(request.query_params.get("auto_social_decision") or "").strip()
        if decision and decision != "all":
            queryset = queryset.filter(auto_social_decision=decision)
        due = parse_bool(request.query_params.get("due"))
        if due is True:
            queryset = queryset.filter(Q(next_post_at__isnull=True) | Q(next_post_at__lte=timezone.now()))
        queryset = _filter_text_search(
            queryset,
            request.query_params.get("q"),
            ["opportunity__title", "opportunity__provider_name", "link_url", "post_text"],
        )
        items = [
            _serialize_admin_opportunity_social_plan(plan)
            for plan in queryset.order_by("next_post_at", "-priority_score", "-updated_at")
        ]
        items = [item for item in items if _matches_social_plan_quality_filters(item, request)]
        count = len(items)
        items = items[: _admin_social_plan_limit(request)]
        return Response({"count": count, "items": items})


class AdminSocialOpportunityPlanCaptionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, plan_id):
        plan = OpportunitySocialPostPlan.objects.select_related("opportunity").filter(pk=plan_id).first()
        if not plan:
            return Response(
                {"detail": "Opportunity social post plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        post_text = str(request.data.get("post_text") if isinstance(request.data, dict) else "").strip()
        plan.post_text = post_text
        plan.save(update_fields=["post_text", "updated_at"])
        return Response(_serialize_admin_opportunity_social_plan(plan))


class AdminSocialCollectionPlanListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = OpportunityCollectionSocialPostPlan.objects.select_related("collection").filter(
            platform=DEFAULT_PLATFORM,
        )
        status_filter = str(request.query_params.get("status") or "").strip()
        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)
        collection_status = str(request.query_params.get("collection_status") or "").strip()
        if collection_status and collection_status != "all":
            queryset = queryset.filter(collection__status=collection_status)
        due = parse_bool(request.query_params.get("due"))
        if due is True:
            queryset = queryset.filter(next_post_at__isnull=False, next_post_at__lte=timezone.now())
        queryset = _filter_text_search(
            queryset,
            request.query_params.get("q"),
            ["collection__title", "link_url", "post_text"],
        )
        items = [
            _serialize_admin_collection_social_plan(plan)
            for plan in queryset.order_by("next_post_at", "-priority_score", "-updated_at")
        ]
        items = [item for item in items if _matches_social_plan_quality_filters(item, request)]
        count = len(items)
        items = items[: _admin_social_plan_limit(request)]
        return Response({"count": count, "items": items})


class AdminSocialCollectionPlanCaptionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, plan_id):
        plan = (
            OpportunityCollectionSocialPostPlan.objects.select_related("collection")
            .filter(pk=plan_id)
            .first()
        )
        if not plan:
            return Response(
                {"detail": "Collection social post plan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        post_text = str(request.data.get("post_text") if isinstance(request.data, dict) else "").strip()
        plan.post_text = post_text
        plan.save(update_fields=["post_text", "updated_at"])
        return Response(_serialize_admin_collection_social_plan(plan))


class AdminSocialLogListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        type_filter = str(request.query_params.get("type") or "all").strip()
        if type_filter not in {"all", "opportunity", "collection"}:
            type_filter = "all"
        limit = _admin_social_plan_limit(request)
        now = timezone.now()
        local_now = timezone.localtime(now)
        today_start = timezone.make_aware(
            datetime.combine(local_now.date(), datetime.min.time()),
            timezone.get_current_timezone(),
        )
        tomorrow_start = today_start + timedelta(days=1)

        opportunity_base = OpportunitySocialPostLog.objects.select_related(
            "opportunity",
            "plan",
        ).filter(platform=DEFAULT_PLATFORM)
        collection_base = OpportunityCollectionSocialPostLog.objects.select_related(
            "collection",
            "plan",
        ).filter(platform=DEFAULT_PLATFORM)

        opportunity_queryset = _apply_social_log_filters(
            opportunity_base,
            request,
            "opportunity__title",
        )
        collection_queryset = _apply_social_log_filters(
            collection_base,
            request,
            "collection__title",
        )

        logs = []
        if type_filter in {"all", "opportunity"}:
            logs.extend(
                _serialize_admin_opportunity_social_log(log)
                for log in opportunity_queryset.order_by("-created_at")[:limit]
            )
        if type_filter in {"all", "collection"}:
            logs.extend(
                _serialize_admin_collection_social_log(log)
                for log in collection_queryset.order_by("-created_at")[:limit]
            )
        logs = sorted(logs, key=lambda item: item["created_at"] or "", reverse=True)[:limit]

        opportunity_today = opportunity_base.filter(
            created_at__gte=today_start,
            created_at__lt=tomorrow_start,
        )
        collection_today = collection_base.filter(
            created_at__gte=today_start,
            created_at__lt=tomorrow_start,
        )

        return Response(
            {
                "count": opportunity_queryset.count() + collection_queryset.count()
                if type_filter == "all"
                else (
                    opportunity_queryset.count()
                    if type_filter == "opportunity"
                    else collection_queryset.count()
                ),
                "items": logs,
                "summary": {
                    "posted_today": opportunity_today.filter(
                        status=OpportunitySocialPostLog.Status.POSTED,
                    ).count()
                    + collection_today.filter(
                        status=OpportunityCollectionSocialPostLog.Status.POSTED,
                    ).count(),
                    "failed_today": opportunity_today.filter(
                        status=OpportunitySocialPostLog.Status.FAILED,
                    ).count()
                    + collection_today.filter(
                        status=OpportunityCollectionSocialPostLog.Status.FAILED,
                    ).count(),
                    "skipped_today": opportunity_today.filter(
                        status=OpportunitySocialPostLog.Status.SKIPPED,
                    ).count()
                    + collection_today.filter(
                        status=OpportunityCollectionSocialPostLog.Status.SKIPPED,
                    ).count(),
                    "collection_posts_today": collection_today.filter(
                        status=OpportunityCollectionSocialPostLog.Status.POSTED,
                    ).count(),
                    "opportunity_posts_today": opportunity_today.filter(
                        status=OpportunitySocialPostLog.Status.POSTED,
                    ).count(),
                },
            }
        )


class AdminSocialSchedulerStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        now = timezone.now()
        local_now = timezone.localtime(now)
        today_start = timezone.make_aware(
            datetime.combine(local_now.date(), datetime.min.time()),
            timezone.get_current_timezone(),
        )
        tomorrow_start = today_start + timedelta(days=1)
        due_response = get_due_facebook_post_plan_response(limit=10, now=now)

        opportunity_today = OpportunitySocialPostLog.objects.filter(
            created_at__gte=today_start,
            created_at__lt=tomorrow_start,
        )
        collection_today = OpportunityCollectionSocialPostLog.objects.filter(
            created_at__gte=today_start,
            created_at__lt=tomorrow_start,
        )

        individual_counts = _count_by_status(
            OpportunitySocialPostPlan,
            OpportunitySocialPostPlan.Status.values,
            platform=DEFAULT_PLATFORM,
        )
        decision_counts = dict(
            OpportunitySocialPostPlan.objects.filter(platform=DEFAULT_PLATFORM)
            .values_list("auto_social_decision")
            .annotate(total=Count("id"))
        )
        collection_counts = _count_by_status(
            OpportunityCollection,
            OpportunityCollection.Status.values,
        )
        collection_plan_counts = _count_by_status(
            OpportunityCollectionSocialPostPlan,
            OpportunityCollectionSocialPostPlan.Status.values,
            platform=DEFAULT_PLATFORM,
        )
        opportunity_failed_today = opportunity_today.filter(
            status=OpportunitySocialPostLog.Status.FAILED
        ).count()
        collection_failed_today = collection_today.filter(
            status=OpportunityCollectionSocialPostLog.Status.FAILED
        ).count()

        return Response(
            {
                "server_time": _serialize_scheduler_datetime(now),
                "posted_today": due_response["posted_today"],
                "skipped_today": opportunity_today.filter(
                    status=OpportunitySocialPostLog.Status.SKIPPED
                ).count()
                + collection_today.filter(
                    status=OpportunityCollectionSocialPostLog.Status.SKIPPED
                ).count(),
                "failed_today": opportunity_failed_today + collection_failed_today,
                "daily_cap": due_response["daily_cap"],
                "daily_remaining": due_response["daily_remaining"],
                "per_run_cap": due_response["per_run_cap"],
                "min_spacing_minutes": due_response["min_spacing_minutes"],
                "latest_posted_at": due_response["latest_posted_at"],
                "next_allowed_post_at": due_response["next_allowed_post_at"],
                "due_count": due_response["due_count"],
                "returned_count": due_response["returned_count"],
                "reason": due_response["reason"],
                "blocked_reason_counts": due_response.get("blocked_reason_counts", {}),
                "candidate_counts_by_tier": due_response.get("candidate_counts_by_tier", {}),
                "selected_counts_by_tier": due_response.get("selected_counts_by_tier", {}),
                "candidate_counts_by_deadline_window": due_response.get(
                    "candidate_counts_by_deadline_window", {}
                ),
                "selected_counts_by_deadline_window": due_response.get(
                    "selected_counts_by_deadline_window", {}
                ),
                "deadline_balance_policy": due_response.get(
                    "deadline_balance_policy", "balanced_deadline_windows"
                ),
                "urgent_selected_count": due_response.get("urgent_selected_count", 0),
                "advance_notice_selected_count": due_response.get(
                    "advance_notice_selected_count", 0
                ),
                "fallback_used": due_response.get("fallback_used", False),
                "selection_policy": due_response.get("selection_policy", "ranked_fallback"),
                "daily_target": due_response.get("daily_target", due_response["daily_cap"]),
                "per_run_target": due_response.get("per_run_target", due_response["per_run_cap"]),
                "strict_candidate_count": sum(
                    due_response.get("candidate_counts_by_tier", {}).get(tier, 0)
                    for tier in ("strict_best", "collection_strict_best")
                ),
                "fallback_candidate_count": max(
                    0,
                    due_response["due_count"]
                    - sum(
                        due_response.get("candidate_counts_by_tier", {}).get(tier, 0)
                        for tier in ("strict_best", "collection_strict_best")
                    ),
                ),
                "due_items": [_serialize_due_preview_item(item) for item in due_response["items"]],
                "health_alerts": _build_social_health_alerts(
                    now=now,
                    due_response=due_response,
                    opportunity_failed_today=opportunity_failed_today,
                    collection_failed_today=collection_failed_today,
                ),
                "individual_plans": {
                    "ready": individual_counts.get(OpportunitySocialPostPlan.Status.READY, 0),
                    "due_ready": self._due_individual_ready_count(now),
                    "posted": OpportunitySocialPostLog.objects.filter(
                        platform=DEFAULT_PLATFORM,
                        status=OpportunitySocialPostLog.Status.POSTED,
                    ).count(),
                    "failed": OpportunitySocialPostLog.objects.filter(
                        platform=DEFAULT_PLATFORM,
                        status=OpportunitySocialPostLog.Status.FAILED,
                    ).count(),
                    "paused": individual_counts.get(OpportunitySocialPostPlan.Status.PAUSED, 0),
                    "draft": individual_counts.get(OpportunitySocialPostPlan.Status.DRAFT, 0),
                    "by_auto_social_decision": {
                        decision: decision_counts.get(decision, 0)
                        for decision in OpportunitySocialPostPlan.AutoSocialDecision.values
                    },
                },
                "collections": {
                    "by_status": collection_counts,
                    "social_post_plans_by_status": collection_plan_counts,
                    "next_plans": [
                        self._serialize_collection_plan(plan)
                        for plan in OpportunityCollectionSocialPostPlan.objects.select_related(
                            "collection"
                        )
                        .filter(platform=DEFAULT_PLATFORM)
                        .order_by("next_post_at", "-priority_score", "id")[:10]
                    ],
                },
                "recent_logs": {
                    "opportunities": [
                        self._serialize_opportunity_log(log)
                        for log in OpportunitySocialPostLog.objects.select_related(
                            "opportunity",
                            "plan",
                        ).order_by("-created_at")[:10]
                    ],
                    "collections": [
                        self._serialize_collection_log(log)
                        for log in OpportunityCollectionSocialPostLog.objects.select_related(
                            "collection",
                            "plan",
                        ).order_by("-created_at")[:10]
                    ],
                },
            }
        )

    def _due_individual_ready_count(self, now):
        return OpportunitySocialPostPlan.objects.filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunitySocialPostPlan.Status.READY,
            enabled=True,
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
            opportunity__status=Opportunity.Status.PUBLISHED,
        ).filter(Q(next_post_at__isnull=True) | Q(next_post_at__lte=now)).count()

    def _serialize_collection_plan(self, plan):
        return {
            "id": plan.pk,
            "collection_id": plan.collection_id,
            "collection_title": plan.collection.title,
            "status": plan.status,
            "platform": plan.platform,
            "priority_score": plan.priority_score,
            "next_post_at": _serialize_scheduler_datetime(plan.next_post_at),
            "posted_at": _serialize_scheduler_datetime(plan.posted_at),
            "link_url": plan.link_url,
            "facebook_post_id": plan.facebook_post_id,
        }

    def _serialize_opportunity_log(self, log):
        return {
            "created_at": _serialize_scheduler_datetime(log.created_at),
            "status": log.status,
            "title": log.opportunity.title,
            "plan_id": log.plan_id,
            "error_message": log.error_message,
        }

    def _serialize_collection_log(self, log):
        return {
            "created_at": _serialize_scheduler_datetime(log.created_at),
            "status": log.status,
            "title": log.collection.title,
            "plan_id": log.plan_id,
            "error_message": log.error_message,
        }
