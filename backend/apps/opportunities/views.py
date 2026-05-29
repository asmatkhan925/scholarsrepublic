import logging
import re
import secrets
from datetime import date, datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.conf import settings
from django.db.models import Count, F, Prefetch, Q
from django.db.utils import DataError
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from rest_framework import generics, parsers, permissions, status
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
    OpportunitySocialPostPlan,
    OpportunitySourceLinkCorrectionLog,
    ScholarshipResearchLead,
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
from apps.opportunities.services.duplicate_detector import (
    find_duplicate_opportunities,
    normalize_key,
    normalize_url,
    title_similarity,
)
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)
from apps.opportunities.services.deadline_checker import prepare_deadline_verification_package
from apps.opportunities.services.social_posting import (
    DEFAULT_PLATFORM,
    generate_facebook_post_text,
    get_due_facebook_post_plans,
    mark_social_image_stale_for_deadline_change,
    post_plan_to_facebook_now,
    record_facebook_post_result,
    regenerate_facebook_caption_for_opportunity,
    schedule_facebook_plan,
    scholarship_detail_url,
)
from apps.opportunities.services.social_image_uploads import (
    SocialImageError,
    get_preferred_social_image_source,
    get_preferred_social_image_url,
    save_social_image_from_base64,
    save_social_image_from_file,
    save_social_image_from_url,
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
        return _normalize_agent_draft_payload(payload)

    if isinstance(data.get("opportunity"), dict):
        return data

    return None


def _agent_string_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    text = str(value or "").strip()
    if not text:
        return []

    return [item.strip(" -\t") for item in re.split(r"[\n;,]+", text) if item.strip(" -\t")]


def _normalize_agent_draft_payload(payload):
    if isinstance(payload.get("opportunity"), dict):
        return payload

    opportunity = {
        "title": payload.get("title", ""),
        "provider_name": payload.get("provider_name", ""),
        "country": payload.get("country", ""),
        "short_description": payload.get("summary", ""),
        "description": payload.get("description", ""),
        "eligibility": payload.get("eligibility", ""),
        "benefits": payload.get("benefits", ""),
        "how_to_apply": payload.get("how_to_apply", ""),
        "deadline": payload.get("deadline", ""),
        "official_link": payload.get("official_url", ""),
        "source_url": payload.get("source_url", ""),
        "application_url": payload.get("application_url", ""),
        "funding_type": payload.get("funding_type", ""),
        "degree_levels": _agent_string_list(payload.get("degree_level")),
        "fields_of_study": _agent_string_list(payload.get("fields")),
        "required_documents": _agent_string_list(payload.get("required_documents")),
    }
    normalized = {
        "confidence": payload.get("confidence", ""),
        "create_missing_references": payload.get("create_missing_references", True),
        "opportunity": opportunity,
    }
    if payload.get("notes"):
        normalized["notes"] = payload.get("notes")
    return normalized


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
        return None, ""

    if isinstance(value, datetime):
        return value.date(), ""

    if isinstance(value, date):
        return value, ""

    try:
        return date.fromisoformat(str(value)), ""
    except ValueError:
        return None, "Invalid date format. Use YYYY-MM-DD."


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


def _social_image_response(obj, draft_id=None):
    post_text = getattr(obj, "facebook_post_text", None)
    if post_text is None:
        post_text = getattr(obj, "post_text", "")

    link_url = getattr(obj, "link_url", "")
    return {
        "ok": obj.social_image_status == obj.SocialImageStatus.SAVED,
        "draft_id": draft_id,
        "image_url": get_preferred_social_image_url(obj),
        "image_source": get_preferred_social_image_source(obj),
        "image_status": obj.social_image_status,
        "image_error": obj.social_image_error,
        "image_is_stale": bool(getattr(obj, "social_image_is_stale", False)),
        "image_prompt": getattr(obj, "facebook_image_prompt", None)
        if hasattr(obj, "facebook_image_prompt")
        else getattr(obj, "image_prompt", ""),
        "post_text": post_text,
        "link_url": link_url,
        "plan_status": getattr(obj, "status", ""),
        "next_post_at": getattr(obj, "next_post_at", None),
    }


def _clean_research_text(data, field, max_length=None):
    value = str(data.get(field) or "").strip()
    return value[:max_length] if max_length else value


def _validate_research_url(value, field_name, required=False):
    value = str(value or "").strip()
    if not value:
        if required:
            return "", f"{field_name} is required."
        return "", ""
    if len(value) > 2000:
        return "", f"{field_name} is too long."
    if not value.startswith(("http://", "https://")):
        return "", f"{field_name} must be an http or https URL."
    try:
        URLValidator(schemes=["http", "https"])(value)
    except ValidationError:
        return "", f"{field_name} must be a valid URL."
    return value, ""


def _serialize_research_match(kind, obj, confidence, reasons):
    return {
        "type": kind,
        "id": obj.pk,
        "title": obj.title,
        "provider_name": getattr(obj, "provider_name", "") or getattr(obj, "university", ""),
        "country": getattr(obj, "country", ""),
        "deadline": (
            obj.deadline.isoformat()
            if getattr(obj, "deadline", None)
            else obj.detected_deadline.isoformat()
            if getattr(obj, "detected_deadline", None)
            else None
        ),
        "official_url": getattr(obj, "official_link", "") or getattr(obj, "official_url", ""),
        "source_url": getattr(obj, "source_url", ""),
        "confidence": confidence,
        "reasons": reasons,
        "slug": getattr(obj, "slug", ""),
        "review_status": getattr(obj, "review_status", ""),
    }


def _find_research_lead_duplicates(data, exclude_lead_id=None, limit=10):
    official_url = str(data.get("official_url") or data.get("official_link") or "").strip()
    source_url = str(data.get("source_url") or "").strip()
    normalized_urls = {normalize_url(official_url), normalize_url(source_url)}
    normalized_urls.discard("")
    title_key = normalize_key(data.get("title"))
    provider_key = normalize_key(data.get("provider_name") or data.get("university"))
    country_key = normalize_key(data.get("country"))
    detected_deadline = parse_date(str(data.get("detected_deadline") or data.get("deadline") or ""))

    matches = []
    for opportunity_match in find_duplicate_opportunities(
        {
            "title": data.get("title"),
            "provider_name": data.get("provider_name"),
            "university_name": data.get("university"),
            "country": data.get("country"),
            "official_link": official_url,
            "source_url": source_url,
            "deadline": data.get("detected_deadline") or data.get("deadline"),
        },
        limit=limit,
    ):
        matches.append({"type": "opportunity", **opportunity_match})

    leads = ScholarshipResearchLead.objects.all()
    if exclude_lead_id:
        leads = leads.exclude(pk=exclude_lead_id)
    for lead in leads:
        reasons = []
        confidence = "medium"
        lead_urls = {normalize_url(lead.official_url), normalize_url(lead.source_url)}
        lead_urls.discard("")
        if normalized_urls and normalized_urls & lead_urls:
            reasons.append("Same normalized official/source URL")
            confidence = "exact"
        same_provider = provider_key and provider_key == normalize_key(lead.provider_name or lead.university)
        same_country = country_key and country_key == normalize_key(lead.country)
        if title_key and title_key == normalize_key(lead.title) and (same_provider or same_country):
            reasons.append("Same title with matching provider/country")
            confidence = "high" if confidence != "exact" else confidence
        if (
            title_similarity(str(data.get("title") or ""), lead.title) >= 0.86
            and same_provider
            and same_country
            and detected_deadline
            and lead.detected_deadline == detected_deadline
        ):
            reasons.append("Similar title with same provider, country, and deadline")
            confidence = "high" if confidence != "exact" else confidence
        if reasons:
            matches.append(_serialize_research_match("research_lead", lead, confidence, reasons))

    rank = {"exact": 4, "high": 3, "medium": 2, "low": 1}
    matches.sort(key=lambda item: (-rank.get(item.get("confidence", "low"), 0), item.get("title", "")))
    return matches[:limit]


def _research_duplicate_status(matches):
    if any(match.get("confidence") == "exact" for match in matches):
        return ScholarshipResearchLead.DuplicateStatus.DUPLICATE
    if matches:
        return ScholarshipResearchLead.DuplicateStatus.POSSIBLE_DUPLICATE
    return ScholarshipResearchLead.DuplicateStatus.NEW


def _serialize_research_lead(lead):
    return {
        "id": lead.pk,
        "title": lead.title,
        "provider_name": lead.provider_name,
        "country": lead.country,
        "city": lead.city,
        "university": lead.university,
        "degree_level": lead.degree_level,
        "funding_type": lead.funding_type,
        "official_url": lead.official_url,
        "source_url": lead.source_url,
        "detected_deadline": lead.detected_deadline.isoformat() if lead.detected_deadline else None,
        "deadline_text": lead.deadline_text,
        "eligibility_summary": lead.eligibility_summary,
        "pakistan_relevance_score": lead.pakistan_relevance_score,
        "duplicate_status": lead.duplicate_status,
        "duplicate_matches": lead.duplicate_matches,
        "review_status": lead.review_status,
        "notes": lead.notes,
        "created_by_agent": lead.created_by_agent,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None,
    }


def _build_research_lead_defaults(data, duplicate_matches=None):
    deadline = parse_date(str(data.get("detected_deadline") or ""))
    score = data.get("pakistan_relevance_score", 0)
    try:
        score = max(0, min(100, int(score)))
    except (TypeError, ValueError):
        score = 0
    duplicate_matches = duplicate_matches or []
    review_status = str(data.get("review_status") or "").strip()
    valid_review_statuses = {choice[0] for choice in ScholarshipResearchLead.ReviewStatus.choices}
    if review_status not in valid_review_statuses:
        review_status = (
            ScholarshipResearchLead.ReviewStatus.NEEDS_REVIEW
            if duplicate_matches
            else ScholarshipResearchLead.ReviewStatus.READY_FOR_DRAFT
        )
    return {
        "title": _clean_research_text(data, "title", 255),
        "provider_name": _clean_research_text(data, "provider_name", 255),
        "country": _clean_research_text(data, "country", 120),
        "city": _clean_research_text(data, "city", 120),
        "university": _clean_research_text(data, "university", 255),
        "degree_level": _clean_research_text(data, "degree_level", 120),
        "funding_type": _clean_research_text(data, "funding_type", 120),
        "official_url": str(data.get("official_url") or "").strip(),
        "source_url": str(data.get("source_url") or "").strip(),
        "detected_deadline": deadline,
        "deadline_text": _clean_research_text(data, "deadline_text", 255),
        "eligibility_summary": _clean_research_text(data, "eligibility_summary"),
        "pakistan_relevance_score": score,
        "duplicate_status": _research_duplicate_status(duplicate_matches),
        "duplicate_matches": duplicate_matches,
        "review_status": review_status,
        "notes": _clean_research_text(data, "notes"),
        "created_by_agent": bool(data.get("created_by_agent", True)),
    }


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


class AgentScholarshipResearchDuplicateView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matches = _find_research_lead_duplicates(request.data)
        is_duplicate = any(match.get("confidence") == "exact" for match in matches)
        recommendation = "duplicate" if is_duplicate else "needs_review" if matches else "new"
        return Response(
            {
                "is_duplicate": is_duplicate,
                "possible_matches": matches,
                "recommendation": recommendation,
            }
        )


class AgentScholarshipResearchLeadCreateView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response
        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        official_url, official_error = _validate_research_url(
            request.data.get("official_url"),
            "official_url",
        )
        source_url, source_error = _validate_research_url(
            request.data.get("source_url"),
            "source_url",
        )
        errors = [error for error in [official_error, source_error] if error]
        if not official_url and not source_url:
            errors.append("official_url or source_url is required.")
        if not _clean_research_text(request.data, "title", 255):
            errors.append("title is required.")
        if errors:
            return Response(
                {"detail": "Invalid research lead.", "errors": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = dict(request.data)
        payload["official_url"] = official_url
        payload["source_url"] = source_url
        matches = _find_research_lead_duplicates(payload)
        exact_duplicate = any(match.get("confidence") == "exact" for match in matches)
        allow_duplicate = parse_bool(payload.get("allow_duplicate")) is True
        if exact_duplicate and not allow_duplicate:
            return Response(
                {
                    "detail": "Duplicate research lead.",
                    "is_duplicate": True,
                    "possible_matches": matches,
                    "recommendation": "duplicate",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        lead = ScholarshipResearchLead.objects.create(
            **_build_research_lead_defaults(payload, duplicate_matches=matches)
        )
        return Response(
            {"ok": True, "lead": _serialize_research_lead(lead)},
            status=status.HTTP_201_CREATED,
        )


class AgentScholarshipResearchLeadListView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response
        data = request.data if isinstance(request.data, dict) else {}
        limit = min(parse_positive_int(data.get("limit")) or 20, 100)
        queryset = ScholarshipResearchLead.objects.all().order_by("-created_at")
        review_status = str(
            data.get("review_status") or data.get("status") or "ready_for_draft"
        ).strip()
        if review_status and review_status != "all":
            queryset = queryset.filter(review_status=review_status)
        for field in ["country", "degree_level", "provider_name", "duplicate_status"]:
            value = str(data.get(field) or "").strip()
            if value:
                queryset = queryset.filter(**{f"{field}__iexact": value})
        items = [_serialize_research_lead(lead) for lead in queryset[:limit]]
        return Response({"ok": True, "count": len(items), "items": items, "leads": items})


class AgentScholarshipResearchLeadMarkImportedView(AgentScholarshipBaseView):
    def post(self, request, lead_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response
        lead = ScholarshipResearchLead.objects.filter(pk=lead_id).first()
        if not lead:
            return Response(
                {"detail": "Research lead not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        lead.review_status = ScholarshipResearchLead.ReviewStatus.IMPORTED
        lead.save(update_fields=["review_status", "updated_at"])
        return Response({"ok": True, "lead": _serialize_research_lead(lead)})


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
        facebook_image_prompt = (
            request.data.get("facebook_image_prompt")
            or request.data.get("image_prompt")
            or ""
        )
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

        try:
            social_draft, _ = OpportunitySocialDraft.objects.update_or_create(
                opportunity_draft=draft,
                defaults={
                    "facebook_post_text": str(facebook_post_text).strip(),
                    "facebook_image_prompt": str(facebook_image_prompt).strip(),
                    "status": requested_status,
                },
            )
            if request.data.get("facebook_image_base64"):
                save_social_image_from_base64(
                    social_draft,
                    request.data.get("facebook_image_base64"),
                    filename=request.data.get("facebook_image_filename"),
                    source=social_draft.SocialImageSource.GPT_BASE64,
                )
            elif facebook_image_url:
                save_social_image_from_url(
                    social_draft,
                    facebook_image_url,
                    source=social_draft.SocialImageSource.GPT_IMAGE_URL,
                )
            elif facebook_image_prompt:
                social_draft.social_image_status = social_draft.SocialImageStatus.MISSING
                social_draft.social_image_error = ""
                social_draft.save(
                    update_fields=[
                        "social_image_status",
                        "social_image_error",
                        "updated_at",
                    ]
                )
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
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
                "facebook_image_url": get_preferred_social_image_url(social_draft),
                "image_url": get_preferred_social_image_url(social_draft),
                "image_source": get_preferred_social_image_source(social_draft),
                "image_status": social_draft.social_image_status,
                "image_error": social_draft.social_image_error,
                "edit_url": _agent_admin_edit_url(draft),
                "admin_edit_url": _agent_admin_edit_url(draft),
                "facebook_post_text": social_draft.facebook_post_text,
                "facebook_image_prompt": social_draft.facebook_image_prompt,
            },
            status=status.HTTP_200_OK,
        )


class AgentScholarshipDraftSocialImageView(AgentScholarshipBaseView):
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

        social_draft, _ = OpportunitySocialDraft.objects.get_or_create(
            opportunity_draft=draft
        )
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            social_draft.facebook_image_prompt = image_prompt
            social_draft.save(update_fields=["facebook_image_prompt", "updated_at"])

        try:
            if request.data.get("image_base64"):
                save_social_image_from_base64(
                    social_draft,
                    request.data.get("image_base64"),
                    filename=request.data.get("filename"),
                    source=social_draft.SocialImageSource.GPT_UPLOADED,
                )
            elif request.data.get("image_url"):
                save_social_image_from_url(
                    social_draft,
                    request.data.get("image_url"),
                    source=social_draft.SocialImageSource.GPT_IMAGE_URL,
                )
            else:
                return Response(
                    {"detail": "image_base64 or image_url is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = _social_image_response(social_draft, draft_id=draft.pk)
        response_data["social_draft_id"] = social_draft.pk
        return Response(response_data)


class AgentScholarshipOpportunitySocialImageView(AgentScholarshipBaseView):
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
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            plan.image_prompt = image_prompt
            plan.save(update_fields=["image_prompt", "updated_at"])

        try:
            if request.data.get("image_base64"):
                save_social_image_from_base64(
                    plan,
                    request.data.get("image_base64"),
                    filename=request.data.get("filename"),
                    source=plan.SocialImageSource.GPT_UPLOADED,
                )
            elif request.data.get("image_url"):
                save_social_image_from_url(
                    plan,
                    request.data.get("image_url"),
                    source=plan.SocialImageSource.GPT_IMAGE_URL,
                )
            else:
                return Response(
                    {"detail": "image_base64 or image_url is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = _social_image_response(plan)
        response_data["opportunity_id"] = opportunity.pk
        response_data["plan_id"] = plan.pk
        return Response(response_data)


class AdminScholarshipDraftSocialImageUploadView(APIView):
    permission_classes = [IsPlatformAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, draft_id):
        try:
            draft = OpportunityDraft.objects.get(pk=draft_id)
        except OpportunityDraft.DoesNotExist:
            return Response(
                {"detail": "Scholarship draft not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"detail": "image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        social_draft, _ = OpportunitySocialDraft.objects.get_or_create(
            opportunity_draft=draft
        )
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            social_draft.facebook_image_prompt = image_prompt
            social_draft.save(update_fields=["facebook_image_prompt", "updated_at"])

        image_source = (
            str(request.data.get("image_source") or "").strip()
            or social_draft.SocialImageSource.GPT_UPLOADED
        )
        valid_sources = {choice[0] for choice in social_draft.SocialImageSource.choices}
        if image_source not in valid_sources:
            image_source = social_draft.SocialImageSource.GPT_UPLOADED

        try:
            save_social_image_from_file(
                social_draft,
                image_file,
                source=image_source,
            )
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = _social_image_response(social_draft, draft_id=draft.pk)
        response_data["social_draft_id"] = social_draft.pk
        return Response(response_data)


class AdminScholarshipSocialImageUploadView(APIView):
    permission_classes = [IsPlatformAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, opportunity_id):
        opportunity = Opportunity.objects.filter(pk=opportunity_id).first()
        if not opportunity:
            return Response(
                {"detail": "Scholarship not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        image_file = request.FILES.get("image")
        if not image_file:
            return Response(
                {"detail": "image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
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
        image_prompt = str(request.data.get("image_prompt") or "").strip()
        if image_prompt:
            plan.image_prompt = image_prompt
            plan.save(update_fields=["image_prompt", "updated_at"])

        image_source = (
            str(request.data.get("image_source") or "").strip()
            or plan.SocialImageSource.GPT_UPLOADED
        )
        valid_sources = {choice[0] for choice in plan.SocialImageSource.choices}
        if image_source not in valid_sources:
            image_source = plan.SocialImageSource.GPT_UPLOADED

        try:
            save_social_image_from_file(plan, image_file, source=image_source)
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = _social_image_response(plan)
        response_data["opportunity_id"] = opportunity.pk
        response_data["plan_id"] = plan.pk
        return Response(response_data)


class AdminScholarshipDraftSocialPostReviewView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, draft_id):
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
        plan.save(update_fields=["post_text", "link_url", "image_prompt", "updated_at"])

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
    opportunity_max = Opportunity._meta.get_field("deadline_check_source_url").max_length or 200
    log_max = OpportunityDeadlineCheckLog._meta.get_field("source_url").max_length or 200
    return source_url[: min(opportunity_max, log_max)]


def _validated_source_link(payload, key):
    raw_value = str(payload.get(key) or "").strip()
    if not raw_value:
        return ""
    if len(raw_value) > 200:
        raise ValueError(f"{key} is too long. Maximum length is 200 characters.")
    if not raw_value.lower().startswith(("http://", "https://")):
        raise ValueError(f"{key} must be a valid http or https URL.")
    try:
        URLValidator(schemes=["http", "https"])(raw_value)
    except ValidationError as exc:
        raise ValueError(f"{key} must be a valid http or https URL.") from exc
    return raw_value


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


class AdminScholarshipResearchLeadListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        limit = min(parse_positive_int(request.query_params.get("limit")) or 50, 100)
        queryset = ScholarshipResearchLead.objects.all().order_by("-created_at")
        for field in [
            "review_status",
            "country",
            "degree_level",
            "provider_name",
            "duplicate_status",
        ]:
            value = str(request.query_params.get(field) or "").strip()
            if value and value != "all":
                queryset = queryset.filter(**{f"{field}__iexact": value})
        items = [_serialize_research_lead(lead) for lead in queryset[:limit]]
        return Response({"ok": True, "count": len(items), "items": items})


class AdminScholarshipResearchLeadActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, lead_id):
        lead = ScholarshipResearchLead.objects.filter(pk=lead_id).first()
        if not lead:
            return Response(
                {"detail": "Research lead not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        action = str(request.data.get("action") if isinstance(request.data, dict) else "").strip()
        status_map = {
            "ready_for_draft": ScholarshipResearchLead.ReviewStatus.READY_FOR_DRAFT,
            "reject": ScholarshipResearchLead.ReviewStatus.REJECTED,
            "rejected": ScholarshipResearchLead.ReviewStatus.REJECTED,
            "imported": ScholarshipResearchLead.ReviewStatus.IMPORTED,
            "needs_review": ScholarshipResearchLead.ReviewStatus.NEEDS_REVIEW,
        }
        if action not in status_map:
            return Response({"detail": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
        lead.review_status = status_map[action]
        lead.save(update_fields=["review_status", "updated_at"])
        return Response({"ok": True, "lead": _serialize_research_lead(lead)})


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
