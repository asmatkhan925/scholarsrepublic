"""
Shared permissions, base views, auth helpers, and utilities used across multiple
views submodules.
"""
import re
import secrets
from datetime import date, datetime
from decimal import Decimal

from django.conf import settings
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.db.models import Count, Q

from rest_framework import permissions
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

from apps.opportunities.models import Opportunity, OpportunityPathway
from apps.opportunities.services.social_image_uploads import (
    get_preferred_social_image_source,
    get_preferred_social_image_url,
)
from apps.users.models import User


# ---------------------------------------------------------------------------
# Simple scalar helpers
# ---------------------------------------------------------------------------

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


def public_pathway_queryset():
    return (
        OpportunityPathway.objects.filter(is_active=True)
        .select_related(
            "country_ref",
            "parent",
            "parent__parent",
            "parent__parent__parent",
        )
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


# ---------------------------------------------------------------------------
# Agent auth helpers
# ---------------------------------------------------------------------------

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


def _social_image_response(obj, draft_id=None):
    post_text = getattr(obj, "facebook_post_text", None)
    if post_text is None:
        post_text = getattr(obj, "post_text", "")

    link_url = getattr(obj, "link_url", "")
    image_field = getattr(obj, "facebook_image", None) or getattr(obj, "image", None)
    image_filename = ""
    if image_field and getattr(image_field, "name", ""):
        image_filename = str(image_field.name).replace("\\", "/").split("/")[-1]
    return {
        "ok": obj.social_image_status == obj.SocialImageStatus.SAVED,
        "draft_id": draft_id,
        "image_url": get_preferred_social_image_url(obj),
        "image_filename": image_filename,
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
        "priority_score": getattr(obj, "priority_score", None),
        "priority_reason": getattr(obj, "priority_reason", None),
        "auto_social_decision": getattr(obj, "auto_social_decision", ""),
    }


# ---------------------------------------------------------------------------
# URL validation helper (used in deadline.py and agent_core.py)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Base views
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Filter mixins
# ---------------------------------------------------------------------------

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
        from django.db.models import F
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
