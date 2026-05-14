import hmac

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.desktop_automation.models import DesktopAutomationJob
from apps.desktop_automation.serializers import (
    ClaimJobSerializer,
    CompleteJobSerializer,
    DesktopAutomationJobSerializer,
    FailJobSerializer,
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

        try:
            job = DesktopAutomationJob.objects.get(pk=job_id)
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
        retry = serializer.validated_data["retry"]

        try:
            job = DesktopAutomationJob.objects.get(pk=job_id)
        except DesktopAutomationJob.DoesNotExist:
            return Response(
                {"detail": "Job not found."},
                status=status.HTTP_404_NOT_FOUND,
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
        job.save(
            update_fields=[
                "status",
                "error_message",
                "failed_at",
                "claimed_by",
                "claimed_at",
                "started_at",
                "updated_at",
            ],
        )

        return Response({"job": DesktopAutomationJobSerializer(job).data})


class DesktopWorkerHealthView(APIView):
    authentication_classes = []
    permission_classes = [IsDesktopWorker]

    def get(self, request):
        return Response({"status": "ok", "message": "Desktop worker API is available."})
