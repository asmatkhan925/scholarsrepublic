import logging
import secrets
import base64
import binascii
import uuid
from datetime import date, datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.matching import calculate_opportunity_match
from apps.opportunities.models import (
    Opportunity,
    OpportunityComment,
    OpportunityDeadlineCheckLog,
    OpportunityDraft,
    OpportunityPathway,
    OpportunitySocialDraft,
)
from apps.opportunities.serializers import (
    AdminOpportunityCommentSerializer,
    OpportunityAdminSerializer,
    OpportunityCommentCreateSerializer,
    OpportunityDraftSerializer,
    OpportunityCommentReplySerializer,
    OpportunityCommentSerializer,
    OpportunityDetailSerializer,
    OpportunityListSerializer,
    OpportunityPathwaySerializer,
)
from apps.opportunities.services.duplicate_detector import find_duplicate_opportunities
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)
from apps.opportunities.services.social_posting import (
    get_due_facebook_post_plans,
    record_facebook_post_result,
)
from apps.users.models import User

logger = logging.getLogger(__name__)


def parse_bool(value):
    if value is None:
        return None
    return str(value).lower() in {"1", "true", "yes", "on"}


def parse_positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


def collect_pathway_and_descendant_ids(pathways):
    seen = set()
    queue = list(pathways.values_list("id", flat=True))

    while queue:
        current_ids = []

        for pathway_id in queue:
            if pathway_id not in seen:
                current_ids.append(pathway_id)
                seen.add(pathway_id)

        if not current_ids:
            break

        queue = list(
            OpportunityPathway.objects.filter(
                is_active=True,
                parent_id__in=current_ids,
            ).values_list("id", flat=True)
        )

    return list(seen)


def _agent_api_configured():
    return bool(getattr(settings, "SCHOLARS_AGENT_TOKEN", ""))


def _agent_token_valid(request):
    expected = getattr(settings, "SCHOLARS_AGENT_TOKEN", "")
    provided = request.headers.get("X-Agent-Token", "")
    return bool(expected) and secrets.compare_digest(provided, expected)


def _social_worker_token_valid(request):
    expected = getattr(settings, "SCHOLARS_SOCIAL_WORKER_TOKEN", "")
    provided = request.headers.get("X-Social-Worker-Token", "")
    return bool(expected) and secrets.compare_digest(provided, expected)


def _extract_agent_payload(request):
    data = request.data

    if not isinstance(data, dict):
        return None

    payload = data.get("payload")
    if isinstance(payload, dict):
        return payload

    if isinstance(data.get("opportunity"), dict):
        return data

    return None


def _invalid_agent_payload_response():
    return {
        "valid": False,
        "errors": ["Request body must include a payload object."],
        "warnings": [],
        "missing_information": [],
        "normalized_payload": None,
    }


def _json_safe_value(value):
    if isinstance(value, (date, Decimal)):
        return value

    if hasattr(value, "pk"):
        return {
            "id": value.pk,
            "name": getattr(value, "name", None) or getattr(value, "title", str(value)),
        }

    if isinstance(value, list):
        return [_json_safe_value(item) for item in value]

    if isinstance(value, dict):
        return {key: _json_safe_value(item) for key, item in value.items()}

    return value


def _normalize_agent_validation(cleaned):
    if not isinstance(cleaned, dict):
        return {}

    normalized = _json_safe_value(cleaned)
    duplicate_matches = normalized.get("duplicate_matches")
    if isinstance(duplicate_matches, list):
        normalized["duplicate_matches"] = [
            {
                "id": match.get("id"),
                "title": match.get("title"),
                "slug": match.get("slug"),
                "confidence": match.get("confidence"),
                "reasons": match.get("reasons", []),
            }
            for match in duplicate_matches
            if isinstance(match, dict)
        ]

    return normalized


def _agent_missing_information(payload):
    opportunity = payload.get("opportunity", {}) if isinstance(payload, dict) else {}
    missing_information = opportunity.get("missing_information", [])
    return missing_information if isinstance(missing_information, list) else []


def _agent_source_value(request, payload, field_name):
    value = request.data.get(field_name) if isinstance(request.data, dict) else ""
    if value:
        return value

    if isinstance(payload, dict):
        if payload.get(field_name):
            return payload.get(field_name)

        opportunity = payload.get("opportunity")
        if isinstance(opportunity, dict):
            return opportunity.get(field_name, "")

    return ""


def _agent_admin_edit_url(draft):
    base_url = getattr(settings, "FRONTEND_URL", "https://scholarsrepublic.org").rstrip("/")
    return f"{base_url}/dashboard/admin/scholarships/drafts/{draft.pk}/edit"


def _frontend_base_url():
    return getattr(settings, "FRONTEND_URL", "https://scholarsrepublic.org").rstrip("/")


def _opportunity_detail_url(opportunity):
    return f"{_frontend_base_url()}/scholarships/{opportunity.slug}"


def _opportunity_admin_url(opportunity):
    return f"{_frontend_base_url()}/dashboard/admin/scholarships/{opportunity.pk}/edit"


def _parse_iso_date_or_none(value):
    if value in (None, ""):
        return None, None

    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None, "verified_deadline must be YYYY-MM-DD or null."


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


MAX_SOCIAL_IMAGE_BYTES = 8 * 1024 * 1024


def _social_image_extension(image_bytes):
    if image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"

    if image_bytes.startswith(b"\xff\xd8\xff"):
        return "jpg"

    if image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP":
        return "webp"

    return ""


def _decode_social_image_base64(value):
    raw_value = str(value or "").strip()
    if not raw_value:
        return None, None

    if "," in raw_value and raw_value.split(",", 1)[0].startswith("data:"):
        raw_value = raw_value.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_value, validate=True)
    except (binascii.Error, ValueError):
        return None, "facebook_image_base64 must be valid base64."

    if len(image_bytes) > MAX_SOCIAL_IMAGE_BYTES:
        return None, "facebook_image_base64 exceeds the 8 MB limit."

    extension = _social_image_extension(image_bytes)
    if not extension:
        return None, "facebook_image_base64 must be a png, jpg, jpeg, or webp image."

    return (image_bytes, extension), None


def _social_image_filename(filename, extension):
    cleaned = str(filename or "").strip().replace("\\", "/").split("/")[-1]
    if not cleaned:
        return f"{uuid.uuid4().hex}.{extension}"

    base = cleaned.rsplit(".", 1)[0][:90] or uuid.uuid4().hex
    return f"{base}.{extension}"


def public_pathway_queryset():
    return (
        OpportunityPathway.objects.filter(is_active=True)
        .select_related("country_ref", "parent")
        .annotate(
            active_children_count=Count(
                "children",
                filter=Q(children__is_active=True),
                distinct=True,
            ),
            direct_published_opportunity_count=Count(
                "opportunities",
                filter=Q(opportunities__status=Opportunity.Status.PUBLISHED),
                distinct=True,
            ),
        )
    )


class IsPlatformAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.ADMIN
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class IsStudentUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class AgentScholarshipBaseView(APIView):
    authentication_classes = []
    permission_classes = []
    renderer_classes = [JSONRenderer]

    def authorize_agent(self, request):
        if not _agent_api_configured():
            return Response(
                {"detail": "Agent API is not configured."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not _agent_token_valid(request):
            return Response(
                {"detail": "Missing or invalid agent token."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return None


class AgentDebugAuthView(AgentScholarshipBaseView):
    def get(self, request):
        configured_token = getattr(settings, "SCHOLARS_AGENT_TOKEN", "") or ""
        header_token = request.headers.get("X-Agent-Token", "") or ""
        configured = bool(configured_token)
        header_present = bool(header_token)

        return Response(
            {
                "configured": configured,
                "configured_token_length": len(configured_token),
                "header_present": header_present,
                "header_length": len(header_token),
                "valid": configured
                and header_present
                and secrets.compare_digest(header_token, configured_token),
            }
        )


class AgentScholarshipValidateView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        payload = _extract_agent_payload(request)
        if payload is None:
            return Response(
                _invalid_agent_payload_response(),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cleaned, warnings, errors = validate_opportunity_draft_payload(payload)
            response_data = {
                "valid": not bool(errors),
                "errors": errors,
                "warnings": warnings,
                "missing_information": _agent_missing_information(payload),
                "normalized_payload": _normalize_agent_validation(cleaned),
            }
        except Exception:
            logger.exception("Agent scholarship validation failed.")
            return Response(
                {"detail": "Agent API request failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(response_data, status=status.HTTP_200_OK)


class AgentScholarshipCreateDraftView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        payload = _extract_agent_payload(request)
        if payload is None:
            return Response(
                _invalid_agent_payload_response(),
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cleaned, warnings, errors = validate_opportunity_draft_payload(payload)
            normalized_payload = _normalize_agent_validation(cleaned)
            if errors:
                return Response(
                    {
                        "draft_id": None,
                        "edit_url": "",
                        "warnings": warnings,
                        "validation_errors": errors,
                        "normalized_payload": normalized_payload,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            opportunity = cleaned.get("opportunity", {})
            title = opportunity.get("title") or payload.get("opportunity", {}).get("title")
            draft_payload = dict(payload)
            source_url = _agent_source_value(request, payload, "source_url")
            source_text = _agent_source_value(request, payload, "source_text")
            if source_url:
                draft_payload["source_url"] = source_url
            if source_text:
                draft_payload["source_text"] = source_text
            draft = OpportunityDraft.objects.create(
                title=title or "Imported scholarship draft",
                raw_payload=draft_payload,
                status=OpportunityDraft.Status.VALIDATED,
                source_url=source_url or opportunity.get("source_url", ""),
                source_name=opportunity.get("source_name", ""),
                confidence=cleaned.get("confidence", ""),
                validation_warnings=warnings,
                validation_errors=[],
            )
        except Exception:
            logger.exception("Agent scholarship draft creation failed.")
            return Response(
                {"detail": "Agent API request failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "draft_id": draft.pk,
                "edit_url": _agent_admin_edit_url(draft),
                "warnings": warnings,
                "validation_errors": [],
                "normalized_payload": normalized_payload,
            },
            status=status.HTTP_201_CREATED,
        )


class AgentScholarshipSocialDraftView(AgentScholarshipBaseView):
    def post(self, request, draft_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            draft = OpportunityDraft.objects.get(pk=draft_id)
        except OpportunityDraft.DoesNotExist:
            return Response(
                {"detail": "Scholarship draft not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        facebook_post_text = request.data.get("facebook_post_text") or ""
        facebook_image_prompt = request.data.get("facebook_image_prompt") or ""
        facebook_image_url = request.data.get("facebook_image_url") or ""
        requested_status = request.data.get("status") or OpportunitySocialDraft.Status.DRAFT
        valid_statuses = {
            OpportunitySocialDraft.Status.DRAFT,
            OpportunitySocialDraft.Status.READY,
        }

        if requested_status not in valid_statuses:
            return Response(
                {"detail": 'status must be "draft" or "ready".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decoded_image = None
        if request.data.get("facebook_image_base64"):
            decoded_image, image_error = _decode_social_image_base64(
                request.data.get("facebook_image_base64")
            )
            if image_error:
                return Response({"detail": image_error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            social_draft, _ = OpportunitySocialDraft.objects.update_or_create(
                opportunity_draft=draft,
                defaults={
                    "facebook_post_text": str(facebook_post_text).strip(),
                    "facebook_image_prompt": str(facebook_image_prompt).strip(),
                    "facebook_image_url": str(facebook_image_url).strip(),
                    "status": requested_status,
                },
            )
            if decoded_image:
                image_bytes, extension = decoded_image
                filename = _social_image_filename(
                    request.data.get("facebook_image_filename"),
                    extension,
                )
                social_draft.facebook_image.save(
                    filename,
                    ContentFile(image_bytes),
                    save=True,
                )
        except Exception:
            logger.exception("Agent scholarship social draft save failed.")
            return Response(
                {"detail": "Agent API request failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "draft_id": draft.pk,
                "social_draft_id": social_draft.pk,
                "status": social_draft.status,
                "has_image_file": bool(social_draft.facebook_image),
                "facebook_image_url": social_draft.facebook_image.url
                if social_draft.facebook_image
                else social_draft.facebook_image_url,
                "edit_url": _agent_admin_edit_url(draft),
                "admin_edit_url": _agent_admin_edit_url(draft),
                "facebook_post_text": social_draft.facebook_post_text,
                "facebook_image_prompt": social_draft.facebook_image_prompt,
            },
            status=status.HTTP_200_OK,
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
        include_missing_deadline = parse_bool(
            request.query_params.get("include_missing_deadline")
        )
        if include_missing_deadline is None:
            include_missing_deadline = True

        today = timezone.localdate()
        horizon = today + timedelta(days=days_ahead)
        stale_before = timezone.now() - timedelta(days=14)

        needs_check = (
            Q(deadline__lte=horizon)
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
        opportunities.sort(key=lambda opportunity: self.queue_sort_key(opportunity, today))

        return Response(
            {
                "items": [
                    _deadline_check_summary(opportunity)
                    for opportunity in opportunities[:limit]
                ]
            }
        )

    def queue_sort_key(self, opportunity, today):
        if opportunity.deadline is None:
            deadline_group = 0
            deadline_value = date.min
        elif opportunity.deadline < today:
            deadline_group = 1
            deadline_value = opportunity.deadline
        else:
            deadline_group = 2
            deadline_value = opportunity.deadline

        checked_at = opportunity.deadline_last_checked_at or datetime.min.replace(
            tzinfo=dt_timezone.utc
        )
        return (deadline_group, deadline_value, checked_at, opportunity.pk)


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


class SocialWorkerBaseView(APIView):
    authentication_classes = []
    permission_classes = []
    renderer_classes = [JSONRenderer]

    def authorize_worker(self, request):
        if not _social_worker_token_valid(request):
            return Response(
                {"detail": "Missing or invalid social worker token."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return None


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
            {
                "items": get_due_facebook_post_plans(
                    limit=request.data.get("limit", 5),
                )
            }
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
                "plan_id": log.plan_id,
                "opportunity_id": log.opportunity_id,
                "status": log.status,
            }
        )


class AdminOverviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        today = timezone.localdate()
        soon = today + timedelta(days=30)

        scholarships = Opportunity.objects.filter(
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP
        )
        drafts = OpportunityDraft.objects.all()
        drafts_needing_review = drafts.filter(created_opportunity__isnull=True).exclude(
            status=OpportunityDraft.Status.IMPORTED
        )
        comments = OpportunityComment.objects.all()

        return Response(
            {
                "scholarships": {
                    "total": scholarships.count(),
                    "draft": scholarships.filter(status=Opportunity.Status.DRAFT).count(),
                    "published": scholarships.filter(status=Opportunity.Status.PUBLISHED).count(),
                    "archived": scholarships.filter(status=Opportunity.Status.ARCHIVED).count(),
                    "featured": scholarships.filter(featured=True).count(),
                    "unverified": scholarships.filter(verified_status=False).count(),
                    "expiring_soon": scholarships.filter(
                        status=Opportunity.Status.PUBLISHED,
                        is_rolling_deadline=False,
                        deadline__isnull=False,
                        deadline__gte=today,
                        deadline__lte=soon,
                    ).count(),
                },
                "drafts": {
                    "total": drafts.count(),
                    "needs_review": drafts_needing_review.count(),
                    "new": drafts.filter(status=OpportunityDraft.Status.NEW).count(),
                    "validated": drafts.filter(status=OpportunityDraft.Status.VALIDATED).count(),
                    "imported": drafts.filter(status=OpportunityDraft.Status.IMPORTED).count(),
                    "error": drafts.filter(status=OpportunityDraft.Status.ERROR).count(),
                },
                "comments": {
                    "pending": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.PENDING
                    ).count(),
                    "active": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.ACTIVE
                    ).count(),
                    "deleted": comments.filter(
                        moderation_status=OpportunityComment.ModerationStatus.DELETED
                    ).count(),
                },
                "students": {
                    "total": User.objects.filter(role=User.Role.STUDENT).count(),
                },
                "applications": {
                    "total": OpportunityApplication.objects.count(),
                    "saved": SavedOpportunity.objects.count(),
                },
            }
        )


class AdminOpportunityDuplicateCheckView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request):
        matches = find_duplicate_opportunities(request.data if isinstance(request.data, dict) else {})
        return Response({"matches": matches})


class OpportunityFilterMixin:
    allowed_ordering = {
        "deadline": "deadline",
        "-deadline": "-deadline",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "published_at": "published_at",
        "-published_at": "-published_at",
    }

    def filter_queryset(self, queryset):
        params = self.request.query_params

        opportunity_status = params.get("status")
        if opportunity_status:
            queryset = queryset.filter(status=opportunity_status)

        opportunity_type = params.get("opportunity_type")
        if opportunity_type:
            queryset = queryset.filter(opportunity_type=opportunity_type)

        pathway_id = parse_positive_int(params.get("pathway_id"))
        pathway = params.get("pathway")
        if pathway_id or pathway:
            pathways = OpportunityPathway.objects.filter(is_active=True)

            if pathway_id:
                pathways = pathways.filter(pk=pathway_id)
            else:
                pathway_as_id = parse_positive_int(pathway)
                if pathway_as_id:
                    pathways = pathways.filter(pk=pathway_as_id)
                else:
                    pathways = pathways.filter(slug=pathway)

            if parse_bool(params.get("exact_pathway")):
                pathway_ids = list(pathways.values_list("id", flat=True))
            else:
                pathway_ids = collect_pathway_and_descendant_ids(pathways)

            if not pathway_ids:
                return queryset.none()

            queryset = queryset.filter(pathway_id__in=pathway_ids)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway__pathway_type=pathway_type)

        missing_pathway = parse_bool(params.get("missing_pathway"))
        if missing_pathway is not None:
            queryset = queryset.filter(pathway__isnull=missing_pathway)

        application_track = params.get("application_track")
        if application_track:
            queryset = queryset.filter(application_track=application_track)

        country = params.get("country")
        if country:
            country_text_fallback = (
                Q(title__icontains=country)
                | Q(short_description__icontains=country)
                | Q(provider_name__icontains=country)
                | Q(university_name__icontains=country)
                | Q(search_keywords__icontains=country)
            )

            queryset = queryset.filter(
                Q(country_ref__name__iexact=country)
                | Q(eligible_country_refs__name__iexact=country)
                | Q(eligible_region_refs__name__iexact=country)
                | country_text_fallback
            ).distinct()

        degree_level = params.get("degree_level")
        if degree_level:
            queryset = queryset.filter(degree_levels__contains=[degree_level])

        field = params.get("field")
        if field:
            queryset = queryset.filter(
                Q(study_field_refs__name__iexact=field) | Q(all_study_fields=True)
            ).distinct()

        funding_type = params.get("funding_type")
        if funding_type:
            queryset = queryset.filter(funding_type=funding_type)

        verified = parse_bool(params.get("verified"))
        if verified is not None:
            queryset = queryset.filter(verified_status=verified)

        featured = parse_bool(params.get("featured"))
        if featured is not None:
            queryset = queryset.filter(featured=featured)

        no_ielts = parse_bool(params.get("no_ielts"))
        if no_ielts is not None:
            queryset = queryset.filter(ielts_required=not no_ielts)

        no_application_fee = parse_bool(params.get("no_application_fee"))
        if no_application_fee is not None:
            queryset = queryset.filter(application_fee_required=not no_application_fee)

        hec_required = parse_bool(params.get("hec_required"))
        if hec_required is not None:
            queryset = queryset.filter(hec_required=hec_required)

        remote = parse_bool(params.get("remote"))
        if remote is not None:
            queryset = queryset.filter(
                location_type=(
                    Opportunity.LocationType.REMOTE if remote else Opportunity.LocationType.ON_SITE
                )
            )

        search = params.get("search") or params.get("q")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(provider_name__icontains=search)
                | Q(university_name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(country_ref__name__icontains=search)
                | Q(eligible_country_refs__name__icontains=search)
                | Q(eligible_region_refs__name__icontains=search)
                | Q(study_field_refs__name__icontains=search)
                | Q(city__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
                | Q(search_keywords__icontains=search)
            )

        ordering = params.get("ordering")
        if ordering in self.allowed_ordering:
            return queryset.order_by(self.allowed_ordering[ordering])

        return queryset.order_by(
            "-featured",
            F("deadline").asc(nulls_last=True),
            "-published_at",
        )


class PublicOpportunityPathwayListView(generics.ListAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = public_pathway_queryset()
        params = self.request.query_params

        country = params.get("country")
        if country:
            queryset = queryset.filter(
                Q(country_ref__name__iexact=country) | Q(country_ref__slug__iexact=country)
            )

        country_id = parse_positive_int(params.get("country_id"))
        if country_id:
            queryset = queryset.filter(country_ref_id=country_id)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway_type=pathway_type)

        parent = params.get("parent")
        if parent:
            queryset = queryset.filter(parent__slug=parent)

        parent_id = parse_positive_int(params.get("parent_id"))
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        if parse_bool(params.get("root_only")):
            queryset = queryset.filter(parent__isnull=True)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        return queryset.order_by("display_order", "title")


class PublicOpportunityPathwayDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return public_pathway_queryset()


class AdminOpportunityPathwayListCreateView(generics.ListCreateAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityPathway.objects.all()
            .select_related("country_ref", "parent")
            .annotate(
                active_children_count=Count(
                    "children",
                    filter=Q(children__is_active=True),
                    distinct=True,
                )
            )
        )

        params = self.request.query_params

        active = parse_bool(params.get("active"))
        if active is not None:
            queryset = queryset.filter(is_active=active)

        root_only = parse_bool(params.get("root_only"))
        if root_only is not None:
            queryset = queryset.filter(parent__isnull=root_only)

        parent = params.get("parent")
        if parent:
            queryset = queryset.filter(parent__slug=parent)

        parent_id = parse_positive_int(params.get("parent_id"))
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)

        pathway_type = params.get("pathway_type")
        if pathway_type:
            queryset = queryset.filter(pathway_type=pathway_type)

        search = params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(slug__icontains=search)
                | Q(description__icontains=search)
                | Q(country_ref__name__icontains=search)
            )

        return queryset.order_by("display_order", "title")


class AdminOpportunityPathwayDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OpportunityPathwaySerializer
    permission_classes = [IsPlatformAdmin]
    queryset = OpportunityPathway.objects.select_related("country_ref", "parent").all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class PublicOpportunityListView(OpportunityFilterMixin, generics.ListAPIView):
    serializer_class = OpportunityListSerializer
    permission_classes = [permissions.AllowAny]

    def _has_public_search_query(self):
        params = self.request.query_params
        return bool(
            (params.get("search") or "").strip()
            or (params.get("q") or "").strip()
        )

    def _apply_public_expiration_filter(self, queryset):
        params = self.request.query_params
        today = timezone.localdate()

        include_expired = parse_bool(params.get("include_expired"))
        expired = parse_bool(params.get("expired"))
        has_search = self._has_public_search_query()

        expired_filter = {
            "is_rolling_deadline": False,
            "deadline__isnull": False,
            "deadline__lt": today,
        }

        if expired is True:
            return queryset.filter(**expired_filter)

        if include_expired is True or has_search:
            return queryset

        return queryset.exclude(**expired_filter)

    def get_queryset(self):
        queryset = (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )

        return self._apply_public_expiration_filter(queryset)


class PublicOpportunityDetailView(generics.RetrieveAPIView):
    serializer_class = OpportunityDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


class PublicScholarshipListView(PublicOpportunityListView):
    def get_queryset(self):
        return (
            super().get_queryset().filter(opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP)
        )


class PublicScholarshipDetailView(PublicOpportunityDetailView):
    def get_queryset(self):
        return (
            super().get_queryset().filter(opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP)
        )


class AdminOpportunityListCreateView(OpportunityFilterMixin, generics.ListCreateAPIView):
    permission_classes = [IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OpportunityListSerializer

        return OpportunityAdminSerializer

    def get_queryset(self):
        return (
            Opportunity.objects.all()
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


class AdminOpportunityDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return OpportunityDetailSerializer

        return OpportunityAdminSerializer

    def get_queryset(self):
        return (
            Opportunity.objects.all()
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )


class AdminOpportunityDraftListCreateView(generics.ListCreateAPIView):
    serializer_class = OpportunityDraftSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityDraft.objects.all()
            .select_related(
                "created_opportunity",
                "created_opportunity__country_ref",
                "created_opportunity__pathway",
                "created_by",
            )
            .prefetch_related(
                "created_opportunity__eligible_country_refs",
                "created_opportunity__eligible_region_refs",
                "created_opportunity__study_field_refs",
            )
        )

        if parse_bool(self.request.query_params.get("needs_review")):
            queryset = queryset.filter(created_opportunity__isnull=True).exclude(
                status=OpportunityDraft.Status.IMPORTED
            )

        draft_status = self.request.query_params.get("status")
        if draft_status:
            queryset = queryset.filter(status=draft_status)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(source_name__icontains=search)
                | Q(source_url__icontains=search)
                | Q(slug__icontains=search)
            )

        return queryset.order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminOpportunityDraftDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OpportunityDraftSerializer
    permission_classes = [IsPlatformAdmin]
    queryset = OpportunityDraft.objects.all()


class AdminOpportunityDraftValidateView(APIView):
    permission_classes = [IsPlatformAdmin]
    renderer_classes = [JSONRenderer]

    def post(self, request, pk):
        try:
            draft = OpportunityDraft.objects.get(pk=pk)
        except OpportunityDraft.DoesNotExist:
            return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            cleaned, warnings, errors = validate_opportunity_draft_payload(draft.raw_payload)
            opportunity = cleaned.get("opportunity", {})

            draft.confidence = cleaned.get("confidence", "")
            draft.source_url = opportunity.get("source_url", "")
            draft.source_name = opportunity.get("source_name", "")
            draft.validation_warnings = warnings
            draft.validation_errors = errors
            draft.status = (
                OpportunityDraft.Status.ERROR if errors else OpportunityDraft.Status.VALIDATED
            )

            if not draft.created_by_id:
                draft.created_by = request.user

            draft.save(
                update_fields=[
                    "created_by",
                    "confidence",
                    "source_url",
                    "source_name",
                    "validation_warnings",
                    "validation_errors",
                    "status",
                    "updated_at",
                ]
            )
        except Exception:
            logger.exception("Admin opportunity draft validation failed.")
            return Response(
                {"detail": "Agent API request failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(OpportunityDraftSerializer(draft, context={"request": request}).data)


class AdminOpportunityDraftImportView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, pk):
        try:
            draft = OpportunityDraft.objects.get(pk=pk)
        except OpportunityDraft.DoesNotExist:
            return Response({"detail": "Draft not found."}, status=status.HTTP_404_NOT_FOUND)

        opportunity = import_opportunity_draft(draft, user=request.user)

        draft.refresh_from_db()

        if not opportunity:
            return Response(
                {
                    "detail": "Draft could not be imported. Review validation errors.",
                    "draft": OpportunityDraftSerializer(draft, context={"request": request}).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "draft": OpportunityDraftSerializer(draft, context={"request": request}).data,
                "opportunity": OpportunityListSerializer(
                    opportunity,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class StudentMatchMixin:
    permission_classes = [permissions.IsAuthenticated, IsStudentUser]
    opportunity_type = None

    def get_profile(self, request):
        if not hasattr(request.user, "student_profile"):
            return None
        return request.user.student_profile

    def get_published_queryset(self):
        queryset = Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        if self.opportunity_type:
            queryset = queryset.filter(opportunity_type=self.opportunity_type)
        return queryset

    def profile_missing_response(self):
        return Response(
            {"detail": "Complete your student profile to calculate a match score."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class OpportunityMatchView(StudentMatchMixin, APIView):
    def get(self, request, slug):
        profile = self.get_profile(request)
        if not profile:
            return self.profile_missing_response()

        try:
            opportunity = self.get_published_queryset().get(slug=slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(calculate_opportunity_match(profile, opportunity))


class ScholarshipMatchView(OpportunityMatchView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP


class RecommendedOpportunitiesView(OpportunityFilterMixin, StudentMatchMixin, APIView):
    limit = 20

    def get_user_state_maps(self, request, opportunity_ids):
        saved_by_opportunity = dict(
            SavedOpportunity.objects.filter(
                user=request.user,
                opportunity_id__in=opportunity_ids,
            ).values_list("opportunity_id", "id")
        )
        applications_by_opportunity = dict(
            OpportunityApplication.objects.filter(
                user=request.user,
                opportunity_id__in=opportunity_ids,
            ).values_list("opportunity_id", "id")
        )

        return saved_by_opportunity, applications_by_opportunity

    def serialize_recommended_opportunity(
        self,
        request,
        opportunity,
        saved_by_opportunity,
        applications_by_opportunity,
    ):
        data = OpportunityListSerializer(opportunity, context={"request": request}).data
        saved_id = saved_by_opportunity.get(opportunity.id)
        application_id = applications_by_opportunity.get(opportunity.id)

        data["is_saved"] = saved_id is not None
        data["saved_opportunity_id"] = saved_id
        data["is_tracking"] = application_id is not None
        data["application_id"] = application_id

        return data

    def get(self, request):
        profile = self.get_profile(request)
        if not profile:
            return self.profile_missing_response()

        queryset = self.filter_queryset(self.get_published_queryset())
        opportunities = list(queryset[:100])
        opportunity_ids = [opportunity.id for opportunity in opportunities]
        saved_by_opportunity, applications_by_opportunity = self.get_user_state_maps(
            request,
            opportunity_ids,
        )

        recommendations = []
        for opportunity in opportunities:
            match = calculate_opportunity_match(profile, opportunity)
            recommendations.append(
                {
                    "opportunity": self.serialize_recommended_opportunity(
                        request,
                        opportunity,
                        saved_by_opportunity,
                        applications_by_opportunity,
                    ),
                    "match": match,
                }
            )

        recommendations.sort(
            key=lambda item: (
                item["match"]["score"],
                item["opportunity"]["featured"],
            ),
            reverse=True,
        )
        recommendations = recommendations[: self.limit]
        return Response({"count": len(recommendations), "results": recommendations})


class RecommendedScholarshipsView(RecommendedOpportunitiesView):
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP



class ScholarshipPickerView(StudentMatchMixin, APIView):
    """Compact authenticated picker for SOP scholarship selection."""

    limit = 20
    max_limit = 50
    pool_size = 120
    opportunity_type = Opportunity.OpportunityType.SCHOLARSHIP

    def get_saved_ids(self, request):
        return set(
            SavedOpportunity.objects.filter(
                user=request.user,
                opportunity__status=Opportunity.Status.PUBLISHED,
                opportunity__opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            ).values_list("opportunity_id", flat=True)
        )

    def apply_search(self, queryset, query):
        if not query:
            return queryset

        return queryset.filter(
            Q(title__icontains=query)
            | Q(provider_name__icontains=query)
            | Q(university_name__icontains=query)
            | Q(country_ref__name__icontains=query)
            | Q(study_field_refs__name__icontains=query)
            | Q(short_description__icontains=query)
            | Q(search_keywords__icontains=query)
        ).distinct()

    def serialize_picker_item(self, request, opportunity, is_saved, match_score):
        data = OpportunityListSerializer(opportunity, context={"request": request}).data
        data["is_saved"] = bool(is_saved)
        data["match_score"] = match_score
        return data

    def get(self, request):
        raw_limit = parse_positive_int(request.query_params.get("limit"))
        limit = min(raw_limit or self.limit, self.max_limit)
        query = (request.query_params.get("q") or "").strip()

        saved_ids = self.get_saved_ids(request)
        profile = self.get_profile(request)

        queryset = (
            Opportunity.objects.filter(
                status=Opportunity.Status.PUBLISHED,
                opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            )
            .select_related(
                "country_ref",
                "pathway",
                "pathway__country_ref",
                "pathway__parent",
            )
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )

        queryset = self.apply_search(queryset, query).order_by(
            "-featured",
            F("deadline").asc(nulls_last=True),
            "-published_at",
            "title",
        )

        saved_opportunities = list(queryset.filter(id__in=saved_ids)[: self.max_limit])
        other_opportunities = list(
            queryset.exclude(id__in=saved_ids)[: max(self.pool_size, limit * 5)]
        )

        ranked_items = []
        seen_ids = set()

        for opportunity in [*saved_opportunities, *other_opportunities]:
            if opportunity.id in seen_ids:
                continue
            seen_ids.add(opportunity.id)

            match_score = None
            if profile:
                try:
                    match_score = calculate_opportunity_match(profile, opportunity).get("score")
                except Exception:
                    match_score = None

            is_saved = opportunity.id in saved_ids
            rank_group = 0 if is_saved else (1 if match_score is not None else 2)

            ranked_items.append(
                {
                    "opportunity": opportunity,
                    "is_saved": is_saved,
                    "match_score": match_score,
                    "rank_group": rank_group,
                }
            )

        ranked_items.sort(
            key=lambda item: (
                item["rank_group"],
                -(item["match_score"] or -1),
                item["opportunity"].title.lower(),
            )
        )

        results = [
            self.serialize_picker_item(
                request,
                item["opportunity"],
                item["is_saved"],
                item["match_score"],
            )
            for item in ranked_items[:limit]
        ]

        return Response({"count": len(results), "results": results})


class ScholarshipCommentThrottle(UserRateThrottle):
    scope = "scholarship_comments"
    rate = "10/hour"


class ScholarshipCommentListCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScholarshipCommentThrottle]

    def get_throttles(self):
        if self.request.method == "GET":
            return []

        return super().get_throttles()

    def get_opportunity(self, slug):
        return Opportunity.objects.get(
            slug=slug,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            status=Opportunity.Status.PUBLISHED,
        )

    def get(self, request, slug):
        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        approved_replies = OpportunityComment.objects.filter(is_deleted=False).select_related(
            "user"
        )
        comments = (
            OpportunityComment.objects.filter(
                opportunity=opportunity,
                parent__isnull=True,
                is_deleted=False,
            )
            .select_related("user")
            .prefetch_related(Prefetch("replies", queryset=approved_replies))
            .order_by("-created_at")
        )

        serializer = OpportunityCommentSerializer(
            comments,
            many=True,
            context={"request": request},
        )
        return Response({"count": comments.count(), "results": serializer.data})

    def post(self, request, slug):
        if not request.user or not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            opportunity = self.get_opportunity(slug)
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunityCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = OpportunityComment.objects.create(
            opportunity=opportunity,
            user=request.user,
            body=serializer.validated_data["body"],
            moderation_status=OpportunityComment.ModerationStatus.PENDING,
            is_deleted=True,
        )

        return Response(
            OpportunityCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ScholarshipCommentReplyCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScholarshipCommentThrottle]

    def post(self, request, slug, pk):
        try:
            opportunity = Opportunity.objects.get(
                slug=slug,
                opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
                status=Opportunity.Status.PUBLISHED,
            )
        except Opportunity.DoesNotExist:
            return Response({"detail": "Scholarship not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            parent = OpportunityComment.objects.get(
                pk=pk,
                opportunity=opportunity,
                parent__isnull=True,
                is_deleted=False,
            )
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OpportunityCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reply = OpportunityComment.objects.create(
            opportunity=opportunity,
            user=request.user,
            parent=parent,
            body=serializer.validated_data["body"],
            moderation_status=OpportunityComment.ModerationStatus.PENDING,
            is_deleted=True,
        )

        return Response(
            OpportunityCommentReplySerializer(reply, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminOpportunityCommentListView(generics.ListAPIView):
    serializer_class = AdminOpportunityCommentSerializer
    permission_classes = [IsPlatformAdmin]

    def get_queryset(self):
        queryset = (
            OpportunityComment.objects.select_related("user", "opportunity", "parent")
            .annotate(moderation_replies_count=Count("replies"))
            .order_by("-created_at")
        )

        moderation_status = self.request.query_params.get("status")
        if moderation_status in {
            OpportunityComment.ModerationStatus.PENDING,
            OpportunityComment.ModerationStatus.ACTIVE,
            OpportunityComment.ModerationStatus.DELETED,
        }:
            queryset = queryset.filter(moderation_status=moderation_status)


        comment_type = self.request.query_params.get("type")
        if comment_type == "top_level":
            queryset = queryset.filter(parent__isnull=True)
        elif comment_type == "reply":
            queryset = queryset.filter(parent__isnull=False)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(body__icontains=search)
                | Q(opportunity__title__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )

        return queryset


class AdminOpportunityCommentModerateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, pk):
        try:
            comment = OpportunityComment.objects.select_related("user", "opportunity", "parent").get(pk=pk)
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")

        if action == "approve":
            if not comment.body:
                return Response(
                    {"detail": "Deleted comments without body cannot be approved."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            comment.moderation_status = OpportunityComment.ModerationStatus.ACTIVE
            comment.is_deleted = False
            comment.save(update_fields=["moderation_status", "is_deleted", "updated_at"])

        elif action == "hide":
            if not comment.body:
                return Response(
                    {"detail": "Deleted comments without body are already hidden."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            comment.moderation_status = OpportunityComment.ModerationStatus.PENDING
            comment.is_deleted = True
            comment.save(update_fields=["moderation_status", "is_deleted", "updated_at"])

        elif action == "delete":
            comment.soft_delete()

        else:
            return Response(
                {"detail": "Invalid action. Use approve, hide, or delete."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(AdminOpportunityCommentSerializer(comment, context={"request": request}).data)


class OpportunityCommentDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            comment = OpportunityComment.objects.select_related("user").get(pk=pk)
        except OpportunityComment.DoesNotExist:
            return Response({"detail": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)

        can_delete = (
            comment.user_id == request.user.id
            or request.user.role == User.Role.ADMIN
            or request.user.is_staff
            or request.user.is_superuser
        )

        if not can_delete:
            return Response(
                {"detail": "You cannot delete this comment."}, status=status.HTTP_403_FORBIDDEN
            )

        comment.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
