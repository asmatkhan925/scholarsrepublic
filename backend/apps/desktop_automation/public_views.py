from datetime import timedelta

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

# Per-user safety limits.
MAX_ACTIVE_DEEPSEEK_JOBS_PER_USER = 1
MIN_SECONDS_BETWEEN_DEEPSEEK_JOBS_PER_USER = 60
MAX_DEEPSEEK_JOBS_PER_USER_PER_HOUR = 10

# Global safety limits.
MAX_DEEPSEEK_JOBS_GLOBAL_PER_HOUR = 60
GLOBAL_BURST_SAMPLE_SIZE = 8
GLOBAL_BURST_MAX_JOBS_PER_MINUTE = 2
GLOBAL_BURST_WAIT_SECONDS = 30

WORKER_ONLINE_SECONDS = 90


class DeepSeekJobCreateSerializer(serializers.Serializer):
    query = serializers.CharField(
        max_length=MAX_DEEPSEEK_PROMPT_LENGTH,
        trim_whitespace=True,
    )
    priority = serializers.IntegerField(
        required=False,
        default=0,
        min_value=0,
        max_value=10,
    )

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


def active_deepseek_job_count_for_user(user) -> int:
    return DesktopAutomationJob.objects.filter(
        created_by=user,
        kind="deepseek_query",
        status__in=[
            DesktopAutomationJob.Status.QUEUED,
            DesktopAutomationJob.Status.RUNNING,
        ],
    ).count()


def deepseek_job_count_for_user_since(user, since) -> int:
    return DesktopAutomationJob.objects.filter(
        created_by=user,
        kind="deepseek_query",
        created_at__gte=since,
    ).count()


def deepseek_job_count_global_since(since) -> int:
    return DesktopAutomationJob.objects.filter(
        kind="deepseek_query",
        created_at__gte=since,
    ).count()


def seconds_since_last_deepseek_job_for_user(user) -> int | None:
    latest_job = (
        DesktopAutomationJob.objects.filter(
            created_by=user,
            kind="deepseek_query",
        )
        .order_by("-created_at")
        .first()
    )

    if latest_job is None:
        return None

    return int((timezone.now() - latest_job.created_at).total_seconds())


def global_burst_retry_after_seconds() -> int | None:
    recent_jobs = list(
        DesktopAutomationJob.objects.filter(kind="deepseek_query")
        .order_by("-created_at")
        .values_list("created_at", flat=True)[:GLOBAL_BURST_SAMPLE_SIZE]
    )

    if len(recent_jobs) < GLOBAL_BURST_SAMPLE_SIZE:
        return None

    newest = recent_jobs[0]
    oldest = recent_jobs[-1]

    sample_span_seconds = max(1, int((newest - oldest).total_seconds()))
    allowed_span_seconds = int(
        (GLOBAL_BURST_SAMPLE_SIZE / GLOBAL_BURST_MAX_JOBS_PER_MINUTE) * 60
    )

    # Example: 8 jobs at more than 2/min means 8 jobs in under 4 minutes.
    if sample_span_seconds > allowed_span_seconds:
        return None

    seconds_since_newest = int((timezone.now() - newest).total_seconds())
    retry_after = GLOBAL_BURST_WAIT_SECONDS - seconds_since_newest

    if retry_after <= 0:
        return None

    return retry_after


def rate_limited_response(payload: dict, retry_after_seconds: int | None = None):
    response = Response(payload, status=status.HTTP_429_TOO_MANY_REQUESTS)
    if retry_after_seconds is not None:
        response["Retry-After"] = str(max(1, retry_after_seconds))
    return response


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
                    "retry_after_seconds": 60,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        active_count = active_deepseek_job_count_for_user(request.user)
        if active_count >= MAX_ACTIVE_DEEPSEEK_JOBS_PER_USER:
            return rate_limited_response(
                {
                    "detail": (
                        "You already have an AI request being processed. "
                        "Please wait for it to finish before starting another one."
                    ),
                    "status": "too_many_active_jobs",
                    "active_jobs": active_count,
                }
            )

        seconds_since_last = seconds_since_last_deepseek_job_for_user(request.user)
        if seconds_since_last is not None:
            remaining = (
                MIN_SECONDS_BETWEEN_DEEPSEEK_JOBS_PER_USER - seconds_since_last
            )
            if remaining > 0:
                return rate_limited_response(
                    {
                        "detail": (
                            f"Please wait {remaining} more second(s) before starting another AI request."
                        ),
                        "status": "cooldown",
                        "retry_after_seconds": remaining,
                    },
                    retry_after_seconds=remaining,
                )

        one_hour_ago = timezone.now() - timedelta(hours=1)

        user_jobs_last_hour = deepseek_job_count_for_user_since(
            request.user,
            one_hour_ago,
        )
        if user_jobs_last_hour >= MAX_DEEPSEEK_JOBS_PER_USER_PER_HOUR:
            return rate_limited_response(
                {
                    "detail": (
                        "You have reached the hourly AI request limit. Please try again later."
                    ),
                    "status": "hourly_limit_reached",
                    "limit": MAX_DEEPSEEK_JOBS_PER_USER_PER_HOUR,
                }
            )

        global_jobs_last_hour = deepseek_job_count_global_since(one_hour_ago)
        if global_jobs_last_hour >= MAX_DEEPSEEK_JOBS_GLOBAL_PER_HOUR:
            return rate_limited_response(
                {
                    "detail": (
                        "The AI system is busy because the hourly system limit has been reached. "
                        "Please try again later."
                    ),
                    "status": "global_hourly_limit_reached",
                    "limit": MAX_DEEPSEEK_JOBS_GLOBAL_PER_HOUR,
                }
            )

        global_retry_after = global_burst_retry_after_seconds()
        if global_retry_after is not None:
            return rate_limited_response(
                {
                    "detail": (
                        f"The AI system is receiving requests too quickly. "
                        f"Please wait {global_retry_after} second(s) and try again."
                    ),
                    "status": "global_burst_cooldown",
                    "retry_after_seconds": global_retry_after,
                },
                retry_after_seconds=global_retry_after,
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


class DesktopJobCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, job_id: int):
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
                    {"detail": "You do not have permission to cancel this job."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to cancel this job."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if job.status not in {
            DesktopAutomationJob.Status.QUEUED,
            DesktopAutomationJob.Status.RUNNING,
        }:
            return Response(DesktopAutomationJobStatusSerializer(job).data)

        message = "This AI request was canceled."
        job.status = DesktopAutomationJob.Status.CANCELED
        job.error_message = ""
        job.result_payload = {
            "ok": False,
            "text": message,
            "user_message": message,
            "source": "desktop-worker-cancel",
        }
        job.save(
            update_fields=[
                "status",
                "error_message",
                "result_payload",
                "updated_at",
            ],
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
