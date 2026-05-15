import hmac
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.desktop_automation.models import (
    DesktopAutomationJob,
    DesktopWorkerHeartbeat,
)
from apps.desktop_automation.serializers import (
    ClaimJobSerializer,
    CompleteJobSerializer,
    DesktopAutomationJobSerializer,
    DesktopAutomationJobStatusSerializer,
    DesktopWorkerHeartbeatSerializer,
    FailJobSerializer,
    HeartbeatSerializer,
)


def get_worker_token_from_request(request) -> str:
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()
    return request.headers.get("X-Desktop-Worker-Token", "").strip()


class IsDesktopWorker(BasePermission):
    message = "Invalid desktop worker token."

    def has_permission(self, request, view) -> bool:
        expected_token = getattr(settings, "DESKTOP_WORKER_TOKEN", "")
        supplied_token = get_worker_token_from_request(request)
        return bool(expected_token) and hmac.compare_digest(
            supplied_token,
            expected_token,
        )


def safe_unavailable_payload(public_message: str | None = None) -> dict:
    message = public_message or (
        "Our AI system is temporarily unavailable. Please try again later."
    )
    return {
        "ok": False,
        "text": message,
        "user_message": message,
        "source": "desktop-worker-error",
    }


class ClaimDesktopJobView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def post(self, request):
        serializer = ClaimJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        worker_id = serializer.validated_data.get("worker_id") or "desktop-worker"
        now = timezone.now()

        with transaction.atomic():
            job = (
                DesktopAutomationJob.objects.select_for_update(skip_locked=True)
                .filter(status=DesktopAutomationJob.Status.QUEUED)
                .order_by("-priority", "created_at")
                .first()
            )

            if job is None:
                return Response({"job": None}, status=status.HTTP_200_OK)

            job.status = DesktopAutomationJob.Status.RUNNING
            job.claimed_by = worker_id
            job.claimed_at = now
            job.started_at = now
            job.attempts += 1
            job.error_message = ""
            job.save(
                update_fields=[
                    "status",
                    "claimed_by",
                    "claimed_at",
                    "started_at",
                    "attempts",
                    "error_message",
                    "updated_at",
                ],
            )

        return Response(
            {"job": DesktopAutomationJobSerializer(job).data},
            status=status.HTTP_200_OK,
        )


class CompleteDesktopJobView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def post(self, request):
        serializer = CompleteJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job_id = serializer.validated_data["job_id"]
        result_payload = serializer.validated_data["result_payload"]

        with transaction.atomic():
            try:
                job = DesktopAutomationJob.objects.select_for_update().get(pk=job_id)
            except DesktopAutomationJob.DoesNotExist:
                return Response(
                    {"detail": "Job not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if job.status != DesktopAutomationJob.Status.RUNNING:
                return Response(
                    {"detail": f"Job is not running. Current status: {job.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            job.status = DesktopAutomationJob.Status.COMPLETED
            job.result_payload = result_payload
            job.completed_at = timezone.now()
            job.error_message = ""
            job.save(
                update_fields=[
                    "status",
                    "result_payload",
                    "completed_at",
                    "error_message",
                    "updated_at",
                ],
            )

        return Response({"job": DesktopAutomationJobSerializer(job).data})


class FailDesktopJobView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def post(self, request):
        serializer = FailJobSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        job_id = serializer.validated_data["job_id"]
        error_message = serializer.validated_data.get("error_message", "")
        public_message = serializer.validated_data.get("public_message", "").strip()
        retry = serializer.validated_data["retry"]

        if not public_message:
            public_message = (
                "Our AI system is temporarily unavailable. Please try again later."
            )

        with transaction.atomic():
            try:
                job = DesktopAutomationJob.objects.select_for_update().get(pk=job_id)
            except DesktopAutomationJob.DoesNotExist:
                return Response(
                    {"detail": "Job not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if job.status not in {
                DesktopAutomationJob.Status.RUNNING,
                DesktopAutomationJob.Status.QUEUED,
            }:
                return Response(
                    {
                        "detail": f"Job is no longer active. Current status: {job.status}.",
                        "job": DesktopAutomationJobSerializer(job).data,
                    },
                    status=status.HTTP_200_OK,
                )

            now = timezone.now()
            should_retry = retry and job.attempts < job.max_attempts

            job.status = (
                DesktopAutomationJob.Status.QUEUED
                if should_retry
                else DesktopAutomationJob.Status.FAILED
            )
            job.error_message = error_message
            job.failed_at = None if should_retry else now
            job.claimed_by = "" if should_retry else job.claimed_by
            job.claimed_at = None if should_retry else job.claimed_at
            job.started_at = None if should_retry else job.started_at

            update_fields = [
                "status",
                "error_message",
                "failed_at",
                "claimed_by",
                "claimed_at",
                "started_at",
                "updated_at",
            ]

            if not should_retry:
                job.result_payload = safe_unavailable_payload(public_message)
                update_fields.append("result_payload")

            job.save(update_fields=update_fields)

        return Response({"job": DesktopAutomationJobSerializer(job).data})


class DesktopWorkerHealthView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def get(self, request):
        return Response({"status": "ok", "message": "Desktop worker API is available."})


class DesktopWorkerHeartbeatView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def post(self, request):
        serializer = HeartbeatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        heartbeat, _created = DesktopWorkerHeartbeat.objects.update_or_create(
            worker_id=data["worker_id"],
            defaults={
                "status": data.get("status") or "online",
                "current_job_id": data.get("current_job_id"),
                "last_seen_at": timezone.now(),
                "error_message": data.get("error_message", ""),
                "metadata": data.get("metadata", {}),
            },
        )

        return Response({"worker": DesktopWorkerHeartbeatSerializer(heartbeat).data})


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

        if job.created_by_id and job.created_by_id != request.user.id and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to view this job."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not job.created_by_id and not request.user.is_staff:
            return Response(
                {"detail": "You do not have permission to view this job."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(DesktopAutomationJobStatusSerializer(job).data)


class DesktopWorkerPublicStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cutoff = timezone.now() - timedelta(seconds=90)
        workers = DesktopWorkerHeartbeat.objects.order_by("worker_id")
        online_workers = workers.filter(last_seen_at__gte=cutoff)

        return Response(
            {
                "online": online_workers.exists(),
                "workers": DesktopWorkerHeartbeatSerializer(workers, many=True).data,
            }
        )
