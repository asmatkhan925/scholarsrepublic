from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.desktop_automation.models import (
    DesktopAutomationJob,
    DesktopWorkerHeartbeat,
)
from apps.desktop_automation.serializers import (
    DesktopAutomationJobStatusSerializer,
    DesktopWorkerHeartbeatSerializer,
)


AI_UNAVAILABLE_MESSAGE = (
    "Our AI system is temporarily unavailable. Please try again later."
)

MAX_DEEPSEEK_PROMPT_LENGTH = 4000
MAX_ACTIVE_DESKTOP_JOBS_PER_USER = 3
WORKER_ONLINE_SECONDS = 90


class DeepSeekJobCreateSerializer(serializers.Serializer):
    query = serializers.CharField(
        max_length=MAX_DEEPSEEK_PROMPT_LENGTH,
        trim_whitespace=True,
    )
    priority = serializers.IntegerField(required=False, default=0, min_value=0, max_value=10)

    def validate_query(self, value):
        cleaned = value.strip()

        if not cleaned:
            raise serializers.ValidationError("Query cannot be empty.")

        if len(cleaned) < 3:
            raise serializers.ValidationError("Query is too short.")

        return cleaned


def has_online_worker() -> bool:
    cutoff = timezone.now() - timedelta(seconds=WORKER_ONLINE_SECONDS)
    return DesktopWorkerHeartbeat.objects.filter(last_seen_at__gte=cutoff).exists()


def active_job_count_for_user(user) -> int:
    return DesktopAutomationJob.objects.filter(
        created_by=user,
        status__in=[
            DesktopAutomationJob.Status.QUEUED,
            DesktopAutomationJob.Status.RUNNING,
        ],
    ).count()


class DeepSeekJobCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeepSeekJobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not has_online_worker():
            return Response(
                {
                    "detail": AI_UNAVAILABLE_MESSAGE,
                    "available": False,
                    "status": "offline",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        active_count = active_job_count_for_user(request.user)
        if active_count >= MAX_ACTIVE_DESKTOP_JOBS_PER_USER:
            return Response(
                {
                    "detail": (
                        "You already have AI requests being processed. "
                        "Please wait for them to finish before starting another one."
                    ),
                    "status": "too_many_active_jobs",
                    "active_jobs": active_count,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        query = serializer.validated_data["query"]
        priority = serializer.validated_data["priority"]

        job = DesktopAutomationJob.objects.create(
            kind="deepseek_query",
            priority=priority,
            input_payload={"query": query},
            created_by=request.user,
        )

        return Response(
            {
                "job_id": job.id,
                "status": job.status,
                "message": "Your AI request has been queued.",
                "poll_url": f"/api/desktop-automation/jobs/{job.id}/",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class DesktopJobStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id: int):
        try:
            job = DesktopAutomationJob.objects.get(pk=job_id)
        except DesktopAutomationJob.DoesNotExist:
            return Response(
                {"detail": "Job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if job.created_by_id:
            if job.created_by_id != request.user.id and not request.user.is_staff:
                return Response(
                    {"detail": "You do not have permission to view this job."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to view this job."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(DesktopAutomationJobStatusSerializer(job).data)


class DesktopWorkerPublicStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = timezone.now() - timedelta(seconds=WORKER_ONLINE_SECONDS)

        workers = DesktopWorkerHeartbeat.objects.order_by("worker_id")
        online_workers = workers.filter(last_seen_at__gte=cutoff)

        return Response(
            {
                "online": online_workers.exists(),
                "status": "online" if online_workers.exists() else "offline",
                "message": (
                    "AI worker is available."
                    if online_workers.exists()
                    else AI_UNAVAILABLE_MESSAGE
                ),
                "workers": DesktopWorkerHeartbeatSerializer(workers, many=True).data
                if request.user.is_staff
                else [],
            }
        )


class MyDesktopJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = DesktopAutomationJob.objects.filter(created_by=request.user).order_by("-id")[:20]
        return Response(DesktopAutomationJobStatusSerializer(jobs, many=True).data)
