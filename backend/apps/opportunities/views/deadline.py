"""
Deadline verification views — agent + admin.
"""
import logging
from datetime import date, datetime, timedelta, timezone as dt_timezone

from django.db.models import Q
from django.db.utils import DataError
from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.models import (
    Opportunity,
    OpportunityDeadlineCheckLog,
    OpportunitySourceLinkCorrectionLog,
)
from apps.opportunities.services.deadline_checker import prepare_deadline_verification_package
from apps.opportunities.services.social_posting import (
    mark_social_image_stale_for_deadline_change,
    regenerate_facebook_caption_for_opportunity,
)

from ._shared import (
    AgentScholarshipBaseView,
    IsPlatformAdmin,
    _opportunity_detail_url,
    _opportunity_admin_url,
    _parse_iso_date_or_none,
    _validated_source_link,
    parse_bool,
    parse_positive_int,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Deadline helper functions
# ---------------------------------------------------------------------------

def _deadline_check_summary(opportunity):
    return {
        "id": opportunity.pk,
        "title": opportunity.title,
        "slug": opportunity.slug,
        "provider_name": opportunity.provider_name,
        "country": opportunity.country,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "status": opportunity.status,
        "official_url": opportunity.official_link,
        "source_url": opportunity.source_url,
        "application_url": opportunity.official_link or opportunity.source_url,
        "deadline_last_checked_at": opportunity.deadline_last_checked_at.isoformat()
        if opportunity.deadline_last_checked_at
        else None,
        "deadline_check_status": opportunity.deadline_check_status,
        "detail_url": _opportunity_detail_url(opportunity),
        "admin_url": _opportunity_admin_url(opportunity),
    }


def _deadline_verification_status_to_legacy(status_value):
    mapping = {
        "confirmed": Opportunity.DeadlineCheckStatus.CONFIRMED,
        "extended": Opportunity.DeadlineCheckStatus.EXTENDED,
        "expired": Opportunity.DeadlineCheckStatus.EXPIRED,
        "unclear": Opportunity.DeadlineCheckStatus.UNCLEAR,
        "failed": Opportunity.DeadlineCheckStatus.FAILED,
        "needs_review": Opportunity.DeadlineCheckStatus.NEEDS_REVIEW,
    }
    return mapping.get(status_value, Opportunity.DeadlineCheckStatus.NEEDS_REVIEW)


def _degree_label_for_queue(opportunity):
    return ", ".join(opportunity.degree_levels or [])


def _provider_for_queue(opportunity):
    return (
        opportunity.provider_name
        or opportunity.university_name
        or opportunity.company_name
        or opportunity.source_name
        or ""
    )


def _deadline_verification_priority(opportunity, now=None, days=30):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    checked_at = opportunity.deadline_last_checked_at
    days_left = opportunity.days_until_deadline
    stale_24h = not checked_at or checked_at < now - timedelta(hours=24)
    stale_7d = not checked_at or checked_at < now - timedelta(days=7)

    if days_left is not None and 0 <= days_left <= 7:
        return 0, "deadline_within_7_days"
    if opportunity.deadline_check_status == Opportunity.DeadlineCheckStatus.UNCHECKED:
        return 1, "unchecked"
    if opportunity.deadline_check_status in {
        Opportunity.DeadlineCheckStatus.UNCLEAR,
        Opportunity.DeadlineCheckStatus.FAILED,
        Opportunity.DeadlineCheckStatus.NEEDS_REVIEW,
    }:
        return 2, opportunity.deadline_check_status
    if days_left is not None and 0 <= days_left <= 7 and stale_24h:
        return 3, "near_deadline_check_older_than_24_hours"
    if stale_7d:
        return 4, "check_older_than_7_days"
    if days_left is not None and 0 <= days_left <= days:
        return 5, "deadline_within_requested_days"
    return 6, "recently_checked"


VERIFIED_DEADLINE_STATUSES = {
    Opportunity.DeadlineCheckStatus.CONFIRMED,
    Opportunity.DeadlineCheckStatus.EXTENDED,
    Opportunity.DeadlineCheckStatus.EXPIRED,
    Opportunity.DeadlineCheckStatus.VERIFIED_ACTIVE,
    Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
    Opportunity.DeadlineCheckStatus.DEADLINE_CHANGED,
}

OPEN_DEADLINE_STATUSES = {
    "",
    Opportunity.DeadlineCheckStatus.UNCHECKED,
    Opportunity.DeadlineCheckStatus.UNCLEAR,
    Opportunity.DeadlineCheckStatus.FAILED,
    Opportunity.DeadlineCheckStatus.NEEDS_REVIEW,
    Opportunity.DeadlineCheckStatus.SOURCE_UNREACHABLE,
}


def _latest_deadline_check_log(opportunity):
    return opportunity.deadline_check_logs.order_by("-checked_at", "-created_at").first()


def _verification_fresh_until(opportunity, *, freshness_days):
    if not opportunity.deadline_last_checked_at:
        return None
    if opportunity.days_until_deadline is not None and 0 <= opportunity.days_until_deadline <= 7:
        return opportunity.deadline_last_checked_at + timedelta(hours=24)
    return opportunity.deadline_last_checked_at + timedelta(days=freshness_days)


def _deadline_unchanged_since_verification(opportunity):
    latest_log = _latest_deadline_check_log(opportunity)
    if not latest_log:
        return True
    return latest_log.new_deadline == opportunity.deadline


def _has_stale_social_image(opportunity):
    return opportunity.social_post_plans.filter(social_image_is_stale=True).exists()


def _deadline_queue_flags(opportunity, *, now, freshness_days):
    fresh_until = _verification_fresh_until(opportunity, freshness_days=freshness_days)
    recently_verified = (
        opportunity.deadline_check_status in VERIFIED_DEADLINE_STATUSES
        and fresh_until is not None
        and fresh_until > now
        and _deadline_unchanged_since_verification(opportunity)
    )
    needs_verification = (
        opportunity.deadline_check_status in OPEN_DEADLINE_STATUSES
        or _has_stale_social_image(opportunity)
        or (
            opportunity.deadline_check_status in VERIFIED_DEADLINE_STATUSES
            and not recently_verified
        )
    )
    return {
        "recently_verified": recently_verified,
        "needs_verification": needs_verification,
        "verification_fresh_until": fresh_until.isoformat() if fresh_until else None,
    }


def _deadline_verification_queue_item(opportunity, priority_reason, *, flags):
    return {
        "id": opportunity.pk,
        "title": opportunity.title,
        "provider": _provider_for_queue(opportunity),
        "country": opportunity.country,
        "degree_level": _degree_label_for_queue(opportunity),
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "days_left": opportunity.days_until_deadline,
        "official_link": opportunity.official_link,
        "source_url": opportunity.source_url,
        "deadline_check_status": opportunity.deadline_check_status,
        "deadline_check_confidence": opportunity.deadline_check_confidence,
        "deadline_last_checked_at": opportunity.deadline_last_checked_at.isoformat()
        if opportunity.deadline_last_checked_at
        else None,
        "priority_reason": priority_reason,
        "recently_verified": flags["recently_verified"],
        "needs_verification": flags["needs_verification"],
        "verification_fresh_until": flags["verification_fresh_until"],
    }


def _deadline_verification_dashboard_stats(queryset, *, now, days, freshness_days):
    stats = {
        "total_pending": 0,
        "near_deadline": 0,
        "unclear": 0,
        "failed": 0,
        "extended": 0,
        "stale_social_image": 0,
    }
    for opportunity in queryset:
        flags = _deadline_queue_flags(opportunity, now=now, freshness_days=freshness_days)
        priority, _reason = _deadline_verification_priority(opportunity, now=now, days=days)
        if flags["needs_verification"] and priority < 6:
            stats["total_pending"] += 1
        if opportunity.days_until_deadline is not None and 0 <= opportunity.days_until_deadline <= 7:
            stats["near_deadline"] += 1
        if opportunity.deadline_check_status == Opportunity.DeadlineCheckStatus.UNCLEAR:
            stats["unclear"] += 1
        if opportunity.deadline_check_status == Opportunity.DeadlineCheckStatus.FAILED:
            stats["failed"] += 1
        if opportunity.deadline_check_status == Opportunity.DeadlineCheckStatus.EXTENDED:
            stats["extended"] += 1
        if _has_stale_social_image(opportunity):
            stats["stale_social_image"] += 1
    return stats


def build_deadline_verification_queue(payload):
    payload = payload if isinstance(payload, dict) else {}
    limit = max(1, min(parse_positive_int(payload.get("limit")) or 10, 50))
    days = max(1, min(parse_positive_int(payload.get("days")) or 30, 365))
    freshness_days = max(1, min(parse_positive_int(payload.get("freshness_days")) or 7, 90))
    only_near_deadline = bool(payload.get("only_near_deadline"))
    include_expired = bool(payload.get("include_expired"))
    include_recently_verified = bool(parse_bool(payload.get("include_recently_verified")))
    requested_status = str(payload.get("status") or "needs_verification").strip()
    allowed_statuses = {
        "needs_verification",
        "recently_verified",
        "unchecked",
        "unclear",
        "failed",
        "needs_review",
        "confirmed",
        "extended",
        "image_stale",
        "near",
        "all",
    }
    if requested_status not in allowed_statuses:
        requested_status = "needs_verification"

    today = timezone.localdate()
    base_queryset = (
        Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        .filter(Q(official_link__gt="") | Q(source_url__gt=""))
        .select_related("country_ref")
        .distinct()
    )
    queryset = base_queryset
    if not include_expired:
        queryset = queryset.filter(
            Q(is_rolling_deadline=True) | Q(deadline__isnull=True) | Q(deadline__gte=today)
        )
    stats_queryset = queryset
    if only_near_deadline or requested_status == "near":
        queryset = queryset.filter(
            deadline__isnull=False,
            deadline__gte=today,
            deadline__lte=today + timedelta(days=days),
        )
    if requested_status in {"unchecked", "unclear", "failed", "needs_review", "confirmed", "extended"}:
        queryset = queryset.filter(deadline_check_status=requested_status)
    if requested_status == "image_stale":
        queryset = queryset.filter(social_post_plans__social_image_is_stale=True)

    now = timezone.now()
    items = []
    stats = _deadline_verification_dashboard_stats(
        stats_queryset,
        now=now,
        days=days,
        freshness_days=freshness_days,
    )
    for opportunity in queryset:
        priority, reason = _deadline_verification_priority(opportunity, now=now, days=days)
        flags = _deadline_queue_flags(opportunity, now=now, freshness_days=freshness_days)
        if requested_status == "needs_verification" and not flags["needs_verification"]:
            continue
        if requested_status == "recently_verified" and not flags["recently_verified"]:
            continue
        if (
            requested_status == "needs_verification"
            and flags["recently_verified"]
            and not include_recently_verified
        ):
            continue
        if priority == 6 and requested_status == "needs_verification":
            continue
        deadline_sort = opportunity.deadline or date.max
        if flags["recently_verified"] and requested_status == "all":
            priority = max(priority, 7)
        items.append((priority, deadline_sort, opportunity.pk, opportunity, reason, flags))

    items.sort(key=lambda item: (item[0], item[1], item[2]))
    selected = [
        _deadline_verification_queue_item(opportunity, reason, flags=flags)
        for _, _, _, opportunity, reason, flags in items[:limit]
    ]
    return {"ok": True, "count": len(selected), "stats": stats, "items": selected}


def _deadline_verification_response(opportunity, log=None):
    latest_log = log or opportunity.deadline_check_logs.order_by("-checked_at", "-created_at").first()
    return {
        "ok": True,
        "opportunity": _deadline_check_summary(opportunity),
        "log_id": latest_log.pk if latest_log else None,
        "status": latest_log.status if latest_log else opportunity.deadline_check_status,
        "confidence": opportunity.deadline_check_confidence,
        "detected_deadline": latest_log.detected_deadline.isoformat()
        if latest_log and latest_log.detected_deadline
        else None,
        "evidence_text": opportunity.deadline_check_evidence,
        "source_url": opportunity.deadline_check_source_url,
        "deadline_previous_value": opportunity.deadline_previous_value.isoformat()
        if opportunity.deadline_previous_value
        else None,
        "deadline_updated_from_source_at": opportunity.deadline_updated_from_source_at.isoformat()
        if opportunity.deadline_updated_from_source_at
        else None,
    }


def _deadline_result_source_url(payload):
    source_url = str(payload.get("source_url") or "").strip()
    return source_url[:200]


def _save_agent_deadline_verification_result(opportunity, payload):
    allowed_statuses = {"confirmed", "extended", "expired", "unclear", "needs_review", "failed"}
    status_value = str(payload.get("status") or "").strip()
    if status_value not in allowed_statuses:
        return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

    confidence = str(payload.get("confidence") or "").strip()
    if confidence not in {choice[0] for choice in Opportunity.DeadlineCheckConfidence.choices}:
        return Response({"detail": "Invalid confidence."}, status=status.HTTP_400_BAD_REQUEST)

    detected_deadline, date_error = _parse_iso_date_or_none(payload.get("detected_deadline"))
    if date_error:
        return Response({"detail": date_error}, status=status.HTTP_400_BAD_REQUEST)

    old_deadline = opportunity.deadline
    old_status = opportunity.status
    source_url = _deadline_result_source_url(payload)
    evidence_text = str(payload.get("evidence_text") or "").strip()
    notes = str(payload.get("notes") or "").strip()
    raw_response_excerpt = str(payload.get("raw_response_excerpt") or "")[:4000]
    apply_update = bool(parse_bool(payload.get("apply_update")))
    now = timezone.now()
    should_update_deadline = (
        status_value == "extended"
        and confidence == Opportunity.DeadlineCheckConfidence.HIGH
        and apply_update
        and detected_deadline is not None
        and detected_deadline != old_deadline
    )

    if should_update_deadline:
        opportunity.deadline_previous_value = old_deadline
        opportunity.deadline = detected_deadline
        opportunity.deadline_updated_from_source_at = now
        regenerate_facebook_caption_for_opportunity(opportunity)
        mark_social_image_stale_for_deadline_change(opportunity)
    elif status_value == "extended" and confidence != Opportunity.DeadlineCheckConfidence.HIGH:
        status_value = "needs_review"

    opportunity.deadline_last_checked_at = now
    opportunity.deadline_check_status = _deadline_verification_status_to_legacy(status_value)
    opportunity.deadline_check_confidence = confidence
    opportunity.deadline_check_source_url = source_url
    opportunity.deadline_check_evidence = evidence_text
    opportunity.deadline_check_note = notes
    opportunity.save(
        update_fields=[
            "deadline",
            "deadline_last_checked_at",
            "deadline_check_status",
            "deadline_check_confidence",
            "deadline_check_source_url",
            "deadline_check_evidence",
            "deadline_check_note",
            "deadline_previous_value",
            "deadline_updated_from_source_at",
            "updated_at",
        ]
    )

    log = OpportunityDeadlineCheckLog.objects.create(
        opportunity=opportunity,
        old_deadline=old_deadline,
        new_deadline=opportunity.deadline,
        detected_deadline=detected_deadline,
        old_status=old_status,
        new_status=opportunity.status,
        status=status_value,
        confidence=confidence,
        check_status=opportunity.deadline_check_status,
        source_url=source_url,
        evidence=evidence_text,
        evidence_text=evidence_text,
        note=notes,
        verifier="gpt_action",
        checked_by="gpt_action",
        raw_response_excerpt=raw_response_excerpt,
        error_message=str(payload.get("error_message") or ""),
        checked_at=now,
    )

    return Response(_deadline_verification_response(opportunity, log))


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AgentScholarshipDeadlineVerificationPackageView(AgentScholarshipBaseView):
    def post(self, request, opportunity_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(prepare_deadline_verification_package(opportunity))


class AgentScholarshipDeadlineVerificationQueueView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(build_deadline_verification_queue(request.data))


class AgentScholarshipDeadlineVerificationBatchPackageView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = request.data.get("ids") or []
        if not isinstance(ids, list):
            return Response({"detail": "ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        max_excerpt_chars = max(500, min(parse_positive_int(request.data.get("max_excerpt_chars")) or 6000, 12000))
        packages = []
        for raw_id in ids[:25]:
            try:
                opportunity_id = int(raw_id)
            except (TypeError, ValueError):
                packages.append({"id": raw_id, "status": "failed", "error": "Invalid opportunity id."})
                continue

            opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
            if not opportunity:
                packages.append({"id": opportunity_id, "status": "failed", "error": "Scholarship not found."})
                continue

            try:
                package = prepare_deadline_verification_package(opportunity)
                package["status"] = "ready"
                package["page_text_excerpt"] = package["page_text_excerpt"][:max_excerpt_chars]
                packages.append(package)
            except Exception as exc:
                logger.exception(
                    "Deadline verification batch package failed: opportunity_id=%s",
                    opportunity_id,
                )
                packages.append(
                    {
                        "id": opportunity_id,
                        "opportunity_id": opportunity_id,
                        "title": opportunity.title,
                        "status": "failed",
                        "error": str(exc),
                    }
                )

        return Response({"ok": True, "count": len(packages), "packages": packages})


class AgentScholarshipDeadlineVerificationResultView(AgentScholarshipBaseView):
    def post(self, request, opportunity_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            return _save_agent_deadline_verification_result(opportunity, request.data)
        except (DataError, ValueError) as exc:
            logger.exception(
                "Invalid deadline verification result payload: opportunity_id=%s status=%s",
                opportunity.pk,
                request.data.get("status"),
            )
            return Response(
                {"detail": "Invalid deadline verification result.", "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception(
                "Deadline verification result failed: opportunity_id=%s status=%s",
                opportunity.pk,
                request.data.get("status"),
            )
            return Response(
                {"detail": "Deadline verification result failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AgentScholarshipSourceLinkCorrectionView(AgentScholarshipBaseView):
    def post(self, request, opportunity_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            official_url = _validated_source_link(request.data, "official_url")
            source_url = _validated_source_link(request.data, "source_url")
            application_url = _validated_source_link(request.data, "application_url")
            evidence_url = _validated_source_link(request.data, "evidence_url")
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if not any([official_url, source_url, application_url]):
            return Response(
                {"detail": "At least one corrected URL is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        apply_update = bool(parse_bool(request.data.get("apply_update")))
        reason = str(request.data.get("reason") or "").strip()[:4000]
        old_official_url = opportunity.official_link
        old_source_url = opportunity.source_url
        old_application_url = opportunity.official_link or opportunity.source_url

        log = OpportunitySourceLinkCorrectionLog.objects.create(
            opportunity=opportunity,
            old_official_url=old_official_url,
            old_source_url=old_source_url,
            old_application_url=old_application_url,
            suggested_official_url=official_url,
            suggested_source_url=source_url,
            suggested_application_url=application_url,
            reason=reason,
            evidence_url=evidence_url,
            applied=apply_update,
        )

        updated_fields = []
        if apply_update:
            if official_url:
                opportunity.official_link = official_url
                updated_fields.append("official_link")
            if source_url:
                opportunity.source_url = source_url
                updated_fields.append("source_url")
            if updated_fields:
                updated_fields.append("updated_at")
                opportunity.save(update_fields=updated_fields)

        return Response(
            {
                "ok": True,
                "correction_log_id": log.pk,
                "opportunity_id": opportunity.pk,
                "applied": apply_update,
                "updated_fields": updated_fields,
                "old": {
                    "official_url": old_official_url,
                    "source_url": old_source_url,
                    "application_url": old_application_url,
                },
                "suggested": {
                    "official_url": official_url,
                    "source_url": source_url,
                    "application_url": application_url,
                },
                "current": {
                    "official_url": opportunity.official_link,
                    "source_url": opportunity.source_url,
                    "application_url": opportunity.official_link or opportunity.source_url,
                },
            }
        )


class AgentScholarshipDeadlineCheckQueueView(AgentScholarshipBaseView):
    def get(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        limit = parse_positive_int(request.query_params.get("limit")) or 10
        limit = min(limit, 50)
        days_ahead = parse_positive_int(request.query_params.get("days_ahead"))
        if days_ahead is None:
            days_ahead = 14
        check_stale_days = (
            parse_positive_int(request.query_params.get("check_stale_days")) or 14
        )
        check_stale_days = min(check_stale_days, 90)
        include_missing_deadline = parse_bool(
            request.query_params.get("include_missing_deadline")
        )
        if include_missing_deadline is None:
            include_missing_deadline = True

        today = timezone.localdate()
        horizon = today + timedelta(days=days_ahead)
        stale_before = timezone.now() - timedelta(days=check_stale_days)

        needs_check = (
            Q(deadline__lt=today)
            | Q(deadline__lte=horizon)
            | Q(deadline_last_checked_at__isnull=True)
            | Q(deadline_last_checked_at__lt=stale_before)
        )
        if include_missing_deadline:
            needs_check |= Q(deadline__isnull=True)

        queryset = (
            Opportunity.objects.select_related("country_ref")
            .filter(
                status=Opportunity.Status.PUBLISHED,
            )
            .filter(Q(official_link__gt="") | Q(source_url__gt=""))
            .filter(needs_check)
        )
        if not include_missing_deadline:
            queryset = queryset.filter(deadline__isnull=False)

        opportunities = list(queryset.distinct())
        opportunities.sort(
            key=lambda opportunity: self.queue_sort_key(opportunity, today, horizon)
        )

        return Response(
            {
                "items": [
                    _deadline_check_summary(opportunity)
                    for opportunity in opportunities[:limit]
                ]
            }
        )

    def queue_sort_key(self, opportunity, today, horizon):
        checked_at = opportunity.deadline_last_checked_at
        never_checked = checked_at is None

        if opportunity.deadline and opportunity.deadline < today:
            priority = 0
            deadline_value = opportunity.deadline
        elif opportunity.deadline == today:
            priority = 1
            deadline_value = opportunity.deadline
        elif opportunity.deadline and opportunity.deadline <= today + timedelta(days=7):
            priority = 2
            deadline_value = opportunity.deadline
        elif opportunity.deadline is None:
            priority = 3
            deadline_value = date.min
        elif never_checked:
            priority = 4
            deadline_value = opportunity.deadline
        elif checked_at:
            priority = 5
            deadline_value = opportunity.deadline
        else:
            priority = 6
            deadline_value = opportunity.deadline

        normalized_checked_at = checked_at or datetime.min.replace(
            tzinfo=dt_timezone.utc
        )
        if priority == 5 and opportunity.deadline and opportunity.deadline <= horizon:
            priority = 6

        if priority == 5:
            return (priority, normalized_checked_at, deadline_value, opportunity.pk)

        return (priority, deadline_value, normalized_checked_at, opportunity.pk)


class AgentScholarshipDeadlineCheckResultView(AgentScholarshipBaseView):
    def post(self, request, opportunity_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        opportunity = (
            Opportunity.objects.select_related("country_ref")
            .filter(pk=opportunity_id)
            .first()
        )
        if not opportunity:
            return Response(
                {"detail": "Scholarship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        check_status = request.data.get("check_status")
        allowed_statuses = {
            Opportunity.DeadlineCheckStatus.VERIFIED_ACTIVE,
            Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
            Opportunity.DeadlineCheckStatus.DEADLINE_CHANGED,
            Opportunity.DeadlineCheckStatus.UNCLEAR,
            Opportunity.DeadlineCheckStatus.SOURCE_UNREACHABLE,
        }
        if check_status not in allowed_statuses:
            return Response(
                {"detail": "Invalid check_status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified_deadline, date_error = _parse_iso_date_or_none(
            request.data.get("verified_deadline")
        )
        if date_error:
            return Response({"detail": date_error}, status=status.HTTP_400_BAD_REQUEST)

        old_deadline = opportunity.deadline
        old_status = opportunity.status
        source_url = str(request.data.get("source_url") or "").strip()
        evidence = str(request.data.get("evidence") or "").strip()
        note = str(request.data.get("note") or "").strip()
        should_unpublish = bool(request.data.get("should_unpublish_if_expired"))

        opportunity.deadline_last_checked_at = timezone.now()
        opportunity.deadline_check_status = check_status
        opportunity.deadline_check_source_url = source_url
        opportunity.deadline_check_evidence = evidence
        opportunity.deadline_check_note = note

        if (
            check_status == Opportunity.DeadlineCheckStatus.DEADLINE_CHANGED
            and verified_deadline is not None
        ):
            opportunity.deadline = verified_deadline

        if (
            check_status == Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED
            and should_unpublish
        ):
            opportunity.status = Opportunity.Status.ARCHIVED

        opportunity.save(
            update_fields=[
                "deadline",
                "status",
                "deadline_last_checked_at",
                "deadline_check_status",
                "deadline_check_source_url",
                "deadline_check_evidence",
                "deadline_check_note",
                "published_at",
                "updated_at",
            ]
        )

        log = OpportunityDeadlineCheckLog.objects.create(
            opportunity=opportunity,
            old_deadline=old_deadline,
            new_deadline=opportunity.deadline,
            old_status=old_status,
            new_status=opportunity.status,
            check_status=check_status,
            source_url=source_url,
            evidence=evidence,
            note=note,
            checked_by="agent",
        )

        return Response(
            {
                "opportunity": _deadline_check_summary(opportunity),
                "log_id": log.pk,
                "old_deadline": old_deadline.isoformat() if old_deadline else None,
                "new_deadline": opportunity.deadline.isoformat()
                if opportunity.deadline
                else None,
                "old_status": old_status,
                "new_status": opportunity.status,
            }
        )


class AdminScholarshipDeadlineVerificationPackageView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(prepare_deadline_verification_package(opportunity))


class AdminScholarshipDeadlineVerificationQueueView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(build_deadline_verification_queue(request.data))


class AdminScholarshipDeadlineVerificationActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action = str(request.data.get("action") or "").strip()
        ids = request.data.get("ids") or []
        if action not in {"prepare_packages", "mark_reviewed", "recheck"}:
            return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(ids, list):
            return Response({"detail": "ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        parsed_ids = []
        for item in ids:
            try:
                parsed_ids.append(int(item))
            except (TypeError, ValueError):
                continue
        opportunities = list(Opportunity.objects.filter(pk__in=parsed_ids))
        now = timezone.now()

        if action == "mark_reviewed":
            updated = 0
            for opportunity in opportunities:
                opportunity.deadline_last_checked_at = now
                opportunity.deadline_check_status = Opportunity.DeadlineCheckStatus.CONFIRMED
                opportunity.deadline_check_confidence = Opportunity.DeadlineCheckConfidence.MEDIUM
                opportunity.deadline_check_note = "Marked reviewed by admin batch action."
                opportunity.save(
                    update_fields=[
                        "deadline_last_checked_at",
                        "deadline_check_status",
                        "deadline_check_confidence",
                        "deadline_check_note",
                        "updated_at",
                    ]
                )
                updated += 1
            return Response({"ok": True, "action": action, "updated": updated})

        packages = []
        for opportunity in opportunities:
            try:
                package = prepare_deadline_verification_package(opportunity)
                assessment = package.get("deterministic_assessment") or {}
                if action == "recheck":
                    opportunity.deadline_last_checked_at = now
                    opportunity.deadline_check_status = _deadline_verification_status_to_legacy(
                        assessment.get("status")
                    )
                    opportunity.deadline_check_confidence = assessment.get("confidence", "")
                    opportunity.deadline_check_note = assessment.get("reason", "")
                    opportunity.save(
                        update_fields=[
                            "deadline_last_checked_at",
                            "deadline_check_status",
                            "deadline_check_confidence",
                            "deadline_check_note",
                            "updated_at",
                        ]
                    )
                packages.append(package)
            except Exception as exc:
                logger.exception(
                    "Admin deadline verification action failed: action=%s opportunity_id=%s",
                    action,
                    opportunity.pk,
                )
                packages.append(
                    {
                        "opportunity_id": opportunity.pk,
                        "title": opportunity.title,
                        "status": "failed",
                        "error": str(exc),
                    }
                )

        return Response({"ok": True, "action": action, "count": len(packages), "packages": packages})


class AdminScholarshipDeadlineApplyView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)
        detected_deadline, date_error = _parse_iso_date_or_none(request.data.get("detected_deadline"))
        if date_error or not detected_deadline:
            return Response({"detail": date_error or "detected_deadline is required."}, status=status.HTTP_400_BAD_REQUEST)

        old_deadline = opportunity.deadline
        now = timezone.now()
        opportunity.deadline_previous_value = old_deadline
        opportunity.deadline = detected_deadline
        opportunity.deadline_last_checked_at = now
        opportunity.deadline_check_status = Opportunity.DeadlineCheckStatus.EXTENDED
        opportunity.deadline_check_confidence = Opportunity.DeadlineCheckConfidence.HIGH
        opportunity.deadline_updated_from_source_at = now
        opportunity.deadline_check_evidence = str(request.data.get("evidence_text") or "")
        opportunity.deadline_check_source_url = str(request.data.get("source_url") or "")
        opportunity.save(
            update_fields=[
                "deadline",
                "deadline_previous_value",
                "deadline_last_checked_at",
                "deadline_check_status",
                "deadline_check_confidence",
                "deadline_updated_from_source_at",
                "deadline_check_evidence",
                "deadline_check_source_url",
                "updated_at",
            ]
        )
        regenerate_facebook_caption_for_opportunity(opportunity)
        mark_social_image_stale_for_deadline_change(opportunity)
        log = OpportunityDeadlineCheckLog.objects.create(
            opportunity=opportunity,
            old_deadline=old_deadline,
            new_deadline=opportunity.deadline,
            detected_deadline=detected_deadline,
            status="extended",
            confidence=Opportunity.DeadlineCheckConfidence.HIGH,
            check_status=opportunity.deadline_check_status,
            source_url=opportunity.deadline_check_source_url,
            evidence=opportunity.deadline_check_evidence,
            evidence_text=opportunity.deadline_check_evidence,
            verifier="admin",
            checked_by="admin",
            checked_at=now,
        )
        return Response(_deadline_verification_response(opportunity, log))
