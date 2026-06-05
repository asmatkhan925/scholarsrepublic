"""
Reel plan management views — admin.
"""
import logging

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityReelLog,
    OpportunityReelPlan,
)
from apps.opportunities.services.social_reel_planning import generate_social_reel_plans
from apps.opportunities.services.social_reel_posting import (
    get_due_facebook_reel_plan_response,
    mark_facebook_reel_failed,
    mark_facebook_reel_posted,
)
from apps.opportunities.services.social_reel_rendering import (
    TEMPLATE_KEYS_BY_REEL_TYPE,
    background_music_summary,
    expected_reel_duration,
    render_reel_plan,
    resolved_template_key,
    shorten_reel_title,
    template_key_is_valid_for_reel_type,
)

from ._shared import (
    AgentScholarshipBaseView,
    IsPlatformAdmin,
    parse_bool,
    parse_positive_int,
)
from .social import _serialize_social_datetime, _admin_social_plan_limit, _filter_text_search

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Reel helpers
# ---------------------------------------------------------------------------

def _clean_reel_source_ids(value):
    if value in (None, ""):
        return []
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


def _serialize_reel_file(request, file_field, fallback_url=""):
    if file_field:
        url = file_field.url
        return request.build_absolute_uri(url) if request else url
    return fallback_url or ""


def _serialize_admin_reel_plan(plan, request=None):
    source_ids = _clean_reel_source_ids(plan.source_opportunity_ids)
    opportunities = Opportunity.objects.filter(id__in=source_ids).select_related("country_ref")
    opportunities_by_id = {opportunity.id: opportunity for opportunity in opportunities}
    source_opportunities = []
    for opportunity_id in source_ids:
        opportunity = opportunities_by_id.get(opportunity_id)
        if not opportunity:
            continue
        source_opportunities.append(
            {
                "id": opportunity.pk,
                "title": opportunity.title,
                "short_title": shorten_reel_title(opportunity.title),
                "slug": opportunity.slug,
                "provider_name": opportunity.provider_name,
                "country": opportunity.country,
                "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
            }
        )

    try:
        expected_duration = expected_reel_duration(plan)
    except Exception:
        expected_duration = None
    music = background_music_summary()
    latest_render_log = plan.logs.filter(status=OpportunityReelLog.Status.RENDERED).first()
    latest_render_payload = latest_render_log.response_payload if latest_render_log else {}
    if not isinstance(latest_render_payload, dict):
        latest_render_payload = {}
    audio_status = music["audio_status"]
    if latest_render_payload.get("audio_added"):
        audio_status = "enabled"
    elif latest_render_payload.get("audio_error"):
        audio_status = "mix_failed_fallback"

    return {
        "id": plan.pk,
        "title": plan.title,
        "reel_type": plan.reel_type,
        "template_key": resolved_template_key(plan),
        "status": plan.status,
        "scenes_json": plan.scenes_json if isinstance(plan.scenes_json, list) else [],
        "script_text": plan.script_text,
        "voiceover_text": plan.voiceover_text,
        "caption_text": plan.caption_text,
        "hashtags": plan.hashtags,
        "source_opportunity_ids": source_ids,
        "source_opportunities": source_opportunities,
        "source_collection_id": plan.source_collection_id,
        "source_collection_title": plan.source_collection.title if plan.source_collection else "",
        "video_url": _serialize_reel_file(request, plan.video_file, plan.video_url),
        "thumbnail_url": _serialize_reel_file(request, plan.thumbnail_file),
        "render_error": plan.render_error,
        "next_post_at": _serialize_social_datetime(plan.next_post_at),
        "priority_score": plan.priority_score,
        "deadline_window": plan.deadline_window,
        "expected_duration_seconds": expected_duration,
        "audio_added": bool(latest_render_payload.get("audio_added")),
        "audio_path": latest_render_payload.get("audio_path") or music["music_path"],
        "audio_track_name": latest_render_payload.get("audio_track_name") or "",
        "audio_error": latest_render_payload.get("audio_error") or "",
        "audio_status": audio_status,
        "renderer_used": latest_render_payload.get("renderer_used") or "",
        "renderer_error": latest_render_payload.get("renderer_error") or "",
        "music_configured": music["music_configured"],
        "music_paths": music.get("music_paths", []),
        "music_track_count": music.get("music_track_count", 0),
        "music_volume": music["music_volume"],
        "music_license_metadata": music["license_metadata"],
        "facebook_post_id": plan.facebook_post_id,
        "facebook_video_id": plan.facebook_video_id,
        "posted_at": _serialize_social_datetime(plan.facebook_posted_at),
        "facebook_post_error": plan.facebook_post_error,
        "ready_for_facebook": bool(
            plan.status == OpportunityReelPlan.Status.READY
            and (plan.video_file or plan.video_url)
            and not plan.render_error
            and not plan.facebook_posted_at
            and not plan.facebook_post_id
            and not plan.facebook_video_id
        ),
        "created_at": _serialize_social_datetime(plan.created_at),
        "updated_at": _serialize_social_datetime(plan.updated_at),
        "admin_url": f"/admin/opportunities/opportunityreelplan/{plan.pk}/change/",
    }


def _parse_reel_datetime(value):
    if value in (None, ""):
        return None, ""
    parsed = parse_datetime(str(value))
    if not parsed:
        return None, "Invalid datetime format. Use ISO 8601."
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed, ""


def _reel_plan_payload(data):
    if not isinstance(data, dict):
        return None, {"detail": "Request body must be a JSON object."}

    title = str(data.get("title") or "").strip()
    if not title:
        return None, {"title": "This field is required."}

    reel_type = str(data.get("reel_type") or OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP).strip()
    valid_reel_types = {choice[0] for choice in OpportunityReelPlan.ReelType.choices}
    if reel_type not in valid_reel_types:
        return None, {"reel_type": "Invalid reel type."}
    template_key = str(data.get("template_key") or "").strip()[:80]
    if template_key and not template_key_is_valid_for_reel_type(template_key, reel_type):
        return None, {"template_key": "Template key does not match reel type."}

    status_value = str(data.get("status") or OpportunityReelPlan.Status.READY_FOR_RENDER).strip()
    valid_statuses = {choice[0] for choice in OpportunityReelPlan.Status.choices}
    if status_value not in valid_statuses:
        return None, {"status": "Invalid status."}

    scenes_json = data.get("scenes_json", [])
    if scenes_json in ("", None):
        scenes_json = []
    if not isinstance(scenes_json, list):
        return None, {"scenes_json": "Must be a list."}
    if len(scenes_json) > 5:
        scenes_json = scenes_json[:5]

    source_collection_id = data.get("source_collection_id")
    if source_collection_id in ("", None):
        source_collection_id = None
    elif not OpportunityCollection.objects.filter(pk=source_collection_id).exists():
        return None, {"source_collection_id": "Collection not found."}

    next_post_at, datetime_error = _parse_reel_datetime(data.get("next_post_at"))
    if datetime_error:
        return None, {"next_post_at": datetime_error}

    try:
        priority_score = int(data.get("priority_score") or 0)
    except (TypeError, ValueError):
        return None, {"priority_score": "Must be an integer."}

    return {
        "title": title[:255],
        "reel_type": reel_type,
        "template_key": template_key,
        "status": status_value,
        "scenes_json": scenes_json,
        "script_text": str(data.get("script_text") or "").strip(),
        "voiceover_text": str(data.get("voiceover_text") or "").strip(),
        "caption_text": str(data.get("caption_text") or "").strip(),
        "hashtags": str(data.get("hashtags") or "").strip(),
        "source_opportunity_ids": _clean_reel_source_ids(data.get("source_opportunity_ids")),
        "source_collection_id": source_collection_id,
        "next_post_at": next_post_at,
        "priority_score": priority_score,
        "deadline_window": str(data.get("deadline_window") or "").strip()[:60],
    }, None


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class AdminSocialReelPlanListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = OpportunityReelPlan.objects.select_related("source_collection").all()
        status_filter = str(request.query_params.get("status") or "").strip()
        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)
        reel_type = str(request.query_params.get("reel_type") or "").strip()
        if reel_type and reel_type != "all":
            queryset = queryset.filter(reel_type=reel_type)
        queryset = _filter_text_search(
            queryset,
            request.query_params.get("q"),
            ["title", "script_text", "caption_text", "hashtags", "render_error"],
        )
        count = queryset.count()
        items = [
            _serialize_admin_reel_plan(plan, request)
            for plan in queryset.order_by("-priority_score", "-created_at")[
                : _admin_social_plan_limit(request)
            ]
        ]
        return Response({"count": count, "items": items})

    def post(self, request):
        payload, errors = _reel_plan_payload(request.data)
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        plan = OpportunityReelPlan.objects.create(**payload)
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.CREATED,
            response_payload={"source": "admin_api"},
        )
        return Response(
            _serialize_admin_reel_plan(plan, request),
            status=status.HTTP_201_CREATED,
        )


class AdminSocialReelPlanDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request, pk):
        plan = OpportunityReelPlan.objects.select_related("source_collection").filter(pk=pk).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_admin_reel_plan(plan, request))

    def patch(self, request, pk):
        plan = OpportunityReelPlan.objects.select_related("source_collection").filter(pk=pk).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)
        payload, errors = _reel_plan_payload({**_reel_plan_current_data(plan), **request.data})
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        for field, value in payload.items():
            setattr(plan, field, value)
        plan.save()
        return Response(_serialize_admin_reel_plan(plan, request))

    def delete(self, request, pk):
        plan = OpportunityReelPlan.objects.filter(pk=pk).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _reel_plan_current_data(plan):
    """Return a dict of current plan fields suitable for merge with request.data."""
    return {
        "title": plan.title,
        "reel_type": plan.reel_type,
        "template_key": plan.template_key or "",
        "status": plan.status,
        "scenes_json": plan.scenes_json if isinstance(plan.scenes_json, list) else [],
        "script_text": plan.script_text or "",
        "voiceover_text": plan.voiceover_text or "",
        "caption_text": plan.caption_text or "",
        "hashtags": plan.hashtags or "",
        "source_opportunity_ids": plan.source_opportunity_ids,
        "source_collection_id": plan.source_collection_id,
        "next_post_at": plan.next_post_at,
        "priority_score": plan.priority_score or 0,
        "deadline_window": plan.deadline_window or "",
    }


class AdminSocialReelPlanGenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        try:
            limit = max(1, int(data.get("limit") or 1))
        except (TypeError, ValueError):
            return Response({"limit": "Must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

        reel_type = str(data.get("reel_type") or "auto").strip()
        dry_run = parse_bool(data.get("dry_run")) is True
        render = parse_bool(data.get("render")) is True
        force = parse_bool(data.get("force")) is True
        template_key = str(data.get("template_key") or "").strip()
        if template_key and reel_type != "auto":
            known_template_keys = {key for keys in TEMPLATE_KEYS_BY_REEL_TYPE.values() for key in keys}
            if template_key not in known_template_keys:
                return Response({"template_key": "Invalid template key."}, status=status.HTTP_400_BAD_REQUEST)
            if not template_key_is_valid_for_reel_type(template_key, reel_type):
                return Response(
                    {"template_key": "Template key does not match reel type."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        result = generate_social_reel_plans(
            reel_type=reel_type,
            limit=limit,
            dry_run=dry_run,
            render=render,
            force=force,
            template_key=template_key,
        )
        if "invalid_template_key" in result["skipped_reasons"]:
            return Response({"template_key": "Invalid template key."}, status=status.HTTP_400_BAD_REQUEST)
        if "template_key_does_not_match_reel_type" in result["skipped_reasons"]:
            return Response(
                {"template_key": "Template key does not match reel type."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(result)


class AdminSocialReelPlanRenderView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def post(self, request, pk):
        plan = OpportunityReelPlan.objects.select_related("source_collection").filter(pk=pk).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)

        force = parse_bool(request.data.get("force") if isinstance(request.data, dict) else None) is True
        try:
            result = render_reel_plan(plan, force=force)
        except Exception as exc:
            plan.refresh_from_db()
            return Response(
                {
                    "detail": "Reel render failed.",
                    "error": str(exc),
                    "plan": _serialize_admin_reel_plan(plan, request),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        plan.refresh_from_db()
        return Response({"result": result, "plan": _serialize_admin_reel_plan(plan, request)})


class AgentFacebookDueReelsView(AgentScholarshipBaseView):
    def post(self, request):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            get_due_facebook_reel_plan_response(
                limit=request.data.get("limit", 1),
                request=request,
            )
        )


class AgentFacebookReelPostedView(AgentScholarshipBaseView):
    def post(self, request, plan_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = OpportunityReelPlan.objects.filter(pk=plan_id).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)

        log = mark_facebook_reel_posted(plan, request.data)
        return Response(
            {
                "ok": True,
                "log_id": log.pk,
                "plan_id": plan.pk,
                "status": plan.status,
                "facebook_post_id": plan.facebook_post_id,
                "facebook_video_id": plan.facebook_video_id,
                "posted_at": _serialize_social_datetime(plan.facebook_posted_at),
            }
        )


class AgentFacebookReelFailedView(AgentScholarshipBaseView):
    def post(self, request, plan_id):
        auth_response = self.authorize_agent(request)
        if auth_response is not None:
            return auth_response

        if not isinstance(request.data, dict):
            return Response(
                {"detail": "Request body must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan = OpportunityReelPlan.objects.filter(pk=plan_id).first()
        if not plan:
            return Response({"detail": "Reel plan not found."}, status=status.HTTP_404_NOT_FOUND)

        log = mark_facebook_reel_failed(plan, request.data)
        return Response(
            {
                "ok": True,
                "log_id": log.pk,
                "plan_id": plan.pk,
                "status": plan.status,
                "facebook_post_error": plan.facebook_post_error,
            }
        )
