"""
Agent draft creation, research leads, and social image views.
"""
import logging

from django.db.utils import DataError
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date

from rest_framework import parsers, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.models import (
    Opportunity,
    OpportunityDraft,
    OpportunitySocialDraft,
    OpportunitySocialPostPlan,
    ScholarshipResearchLead,
)
from apps.opportunities.services.duplicate_detector import (
    find_duplicate_opportunities,
    normalize_key,
    normalize_url,
    title_similarity,
)
from apps.opportunities.services.opportunity_draft_importer import (
    validate_opportunity_draft_payload,
)
from apps.opportunities.services.social_posting import (
    DEFAULT_PLATFORM,
    scholarship_detail_url,
)
from apps.opportunities.services.social_scheduler import apply_social_priority
from apps.opportunities.services.social_image_uploads import (
    SocialImageError,
    get_preferred_social_image_source,
    get_preferred_social_image_url,
    save_social_image_from_base64,
    save_social_image_from_file,
    save_social_image_from_openai_file_ref,
    save_social_image_from_url,
)

from ._shared import (
    AgentScholarshipBaseView,
    IsPlatformAdmin,
    _agent_admin_edit_url,
    _agent_missing_information,
    _agent_source_value,
    _extract_agent_payload,
    _invalid_agent_payload_response,
    _normalize_agent_validation,
    _social_image_response,
    parse_bool,
    parse_positive_int,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Research-lead helpers (private to this module)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AgentDebugAuthView(AgentScholarshipBaseView):
    def get(self, request):
        import secrets as _secrets
        from django.conf import settings as _settings
        configured_token = getattr(_settings, "SCHOLARS_AGENT_TOKEN", "") or ""
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
                and _secrets.compare_digest(header_token, configured_token),
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
            source_name = opportunity.get("source_name", "")
            draft_source_url = source_url or opportunity.get("source_url", "")
            logger.info(
                "Creating agent scholarship draft: title_length=%s source_url_length=%s source_name_length=%s",
                len(title or ""),
                len(draft_source_url or ""),
                len(source_name or ""),
            )
            draft = OpportunityDraft.objects.create(
                title=title or "Imported scholarship draft",
                raw_payload=draft_payload,
                status=OpportunityDraft.Status.VALIDATED,
                source_url=draft_source_url,
                source_name=source_name,
                confidence=cleaned.get("confidence", ""),
                validation_warnings=warnings,
                validation_errors=[],
            )
        except DataError:
            logger.exception(
                "Agent scholarship draft creation hit database length limit: title_length=%s source_url_length=%s source_name_length=%s",
                len((locals().get("title") or "")),
                len((locals().get("draft_source_url") or "")),
                len((locals().get("source_name") or "")),
            )
            return Response(
                {
                    "ok": False,
                    "error": "create_draft_failed",
                    "stage": "draft_creation",
                    "detail": "A URL or draft field exceeded the database length limit.",
                    "field": "source_url",
                    "max_length": OpportunityDraft._meta.get_field("source_url").max_length,
                },
                status=status.HTTP_400_BAD_REQUEST,
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
        notes = str(request.data.get("notes") or "").strip()
        warnings = []
        if image_prompt:
            social_draft.facebook_image_prompt = image_prompt
            social_draft.save(update_fields=["facebook_image_prompt", "updated_at"])
        if notes:
            warnings.append("notes_not_stored")

        file_refs = request.data.get("openaiFileIdRefs")
        if not isinstance(file_refs, list):
            return Response(
                {"detail": "openaiFileIdRefs must contain exactly one image file."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(file_refs) != 1:
            return Response(
                {"detail": "openaiFileIdRefs must contain exactly one image file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            save_social_image_from_openai_file_ref(
                social_draft,
                file_refs[0],
                filename=request.data.get("image_filename"),
            )
        except SocialImageError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response_data = _social_image_response(social_draft, draft_id=draft.pk)
        response_data["social_draft_id"] = social_draft.pk
        response_data["warnings"] = warnings
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
        apply_social_priority(plan)
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
        apply_social_priority(plan)
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
