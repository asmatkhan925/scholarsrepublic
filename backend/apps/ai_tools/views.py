import os

import requests

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import StudentProfile

from .models import AIJob
from .serializers import AIJobSerializer, SOPGenerateSerializer


def get_ai_setting(name: str, default=None):
    return getattr(settings, name, os.getenv(name, default))


def is_ai_enabled() -> bool:
    value = str(get_ai_setting("AI_FEATURES_ENABLED", "False")).lower()
    return value in {"1", "true", "yes", "on"}


def list_to_text(value):
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item)
    return value or ""


def build_profile_summary(user) -> str:
    profile = StudentProfile.objects.filter(user=user).first()

    if not profile:
        return (
            f"Student name: {getattr(user, 'full_name', '') or 'Not provided'}\n"
            f"Email: {getattr(user, 'email', '')}\n"
            "Profile: No detailed profile has been created yet."
        )

    candidate_fields = [
        "nationality",
        "current_country",
        "city",
        "current_education_level",
        "current_institution",
        "current_field_of_study",
        "result_status",
        "grading_system",
        "cgpa",
        "percentage",
        "target_degree_level",
        "target_countries",
        "target_fields",
        "research_interests",
        "skills",
        "has_research_experience",
        "publications_count",
        "work_experience_years",
        "has_internship_experience",
    ]

    lines = [
        f"Student name: {getattr(user, 'full_name', '') or 'Not provided'}",
        f"Email: {getattr(user, 'email', '')}",
    ]

    for field in candidate_fields:
        if hasattr(profile, field):
            value = getattr(profile, field)
            if isinstance(value, list):
                value = list_to_text(value)

            lines.append(
                f"{field.replace('_', ' ').title()}: "
                f"{value if value not in [None, ''] else 'Not provided'}"
            )

    if hasattr(profile, "scholarship_readiness_score"):
        lines.append(f"Scholarship readiness score: {profile.scholarship_readiness_score}/100")

    if hasattr(profile, "readiness_level"):
        lines.append(f"Readiness level: {profile.readiness_level}")

    return "\n".join(lines)


def estimate_wait_seconds(queue_position: int, output_type: str) -> int:
    average_seconds_per_job = 45

    if output_type == "medium_sop":
        average_seconds_per_job = 75
    elif output_type == "full_sop":
        average_seconds_per_job = 120

    return max(queue_position, 1) * average_seconds_per_job



class AIHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_ai_enabled():
            return Response(
                {
                    "available": False,
                    "status": "disabled",
                    "message": "AI writing tools are currently disabled.",
                },
                status=status.HTTP_200_OK,
            )

        ai_service_url = str(get_ai_setting("AI_SERVICE_URL", "")).rstrip("/")

        if not ai_service_url:
            return Response(
                {
                    "available": False,
                    "status": "not_configured",
                    "message": "AI writing tools are not configured yet.",
                },
                status=status.HTTP_200_OK,
            )

        try:
            response = requests.get(f"{ai_service_url}/health", timeout=3)
            response.raise_for_status()
            data = response.json()
            return Response(
                {
                    "available": True,
                    "status": "online",
                    "message": "AI writing tools are available.",
                    "service": data.get("service", "AI service"),
                    "model": data.get("model", ""),
                },
                status=status.HTTP_200_OK,
            )
        except requests.RequestException:
            return Response(
                {
                    "available": False,
                    "status": "offline",
                    "message": (
                        "Our AI writing server is currently offline. "
                        "Please try again later."
                    ),
                },
                status=status.HTTP_200_OK,
            )


class SOPGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not is_ai_enabled():
            return Response(
                {"detail": "AI features are currently disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = SOPGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        ai_service_url = str(get_ai_setting("AI_SERVICE_URL", "")).rstrip("/")

        if not ai_service_url:
            return Response(
                {"detail": "AI service is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            health_response = requests.get(f"{ai_service_url}/health", timeout=5)
            health_response.raise_for_status()
        except requests.RequestException:
            return Response(
                {
                    "detail": (
                        "The AI server is currently offline. Please try again later."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        pending_before = AIJob.objects.filter(
            status__in=[AIJob.Status.PENDING, AIJob.Status.RUNNING],
        ).count()

        queue_position = pending_before + 1
        output_type = data.get("output_type", "paragraph")
        estimated_wait = estimate_wait_seconds(queue_position, output_type)

        payload = {
            "profile_summary": build_profile_summary(request.user),
            "target_scholarship": data.get("target_scholarship", ""),
            "target_country": data.get("target_country", ""),
            "target_degree": data.get("target_degree", ""),
            "field_of_study": data.get("field_of_study", ""),
            "why_scholarship": data.get("why_scholarship", ""),
            "future_goals": data.get("future_goals", ""),
            "contribution_goal": data.get("contribution_goal", ""),
            "existing_draft": data.get("existing_draft", ""),
            "output_type": output_type,
            "tone": data.get("tone", "formal"),
        }

        job = AIJob.objects.create(
            user=request.user,
            tool_type=AIJob.ToolType.SOP_GENERATE,
            status=AIJob.Status.PENDING,
            request_payload=payload,
            queue_position_at_submit=queue_position,
            estimated_wait_seconds=estimated_wait,
        )

        return Response(
            {
                "job_id": job.id,
                "status": job.status,
                "queue_position": queue_position,
                "estimated_wait_seconds": estimated_wait,
                "message": (
                    f"Your SOP request has been added to the queue. "
                    f"Queue position: {queue_position}. "
                    f"Estimated wait: about {estimated_wait} seconds."
                ),
            },
            status=status.HTTP_202_ACCEPTED,
        )


class AIJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        try:
            job = AIJob.objects.get(id=job_id, user=request.user)
        except AIJob.DoesNotExist:
            return Response(
                {"detail": "AI job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(AIJobSerializer(job).data)
