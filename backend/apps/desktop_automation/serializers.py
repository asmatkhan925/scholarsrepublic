from django.db.models import Q
from rest_framework import serializers

from apps.desktop_automation.models import (
    DesktopAutomationJob,
    DesktopWorkerHeartbeat,
)


class DesktopAutomationJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesktopAutomationJob
        fields = (
            "id",
            "kind",
            "status",
            "priority",
            "input_payload",
            "result_payload",
            "error_message",
            "claimed_by",
            "attempts",
            "max_attempts",
            "claimed_at",
            "started_at",
            "completed_at",
            "failed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class DesktopAutomationJobStatusSerializer(serializers.ModelSerializer):
    text = serializers.SerializerMethodField()
    user_message = serializers.SerializerMethodField()
    ok = serializers.SerializerMethodField()
    jobs_ahead = serializers.SerializerMethodField()
    queue_position = serializers.SerializerMethodField()
    processing_label = serializers.SerializerMethodField()

    class Meta:
        model = DesktopAutomationJob
        fields = (
            "id",
            "kind",
            "status",
            "ok",
            "text",
            "user_message",
            "jobs_ahead",
            "queue_position",
            "processing_label",
            "result_payload",
            "created_at",
            "updated_at",
            "claimed_at",
            "completed_at",
            "failed_at",
        )
        read_only_fields = fields

    def get_text(self, obj):
        payload = obj.result_payload or {}
        if obj.status in {
            DesktopAutomationJob.Status.QUEUED,
            DesktopAutomationJob.Status.RUNNING,
        }:
            return "Your request is still being processed."

        return (
            payload.get("text")
            or payload.get("user_message")
            or "No response is available."
        )

    def get_user_message(self, obj):
        payload = obj.result_payload or {}
        if obj.status in {
            DesktopAutomationJob.Status.QUEUED,
            DesktopAutomationJob.Status.RUNNING,
        }:
            return "Your request is still being processed."

        return (
            payload.get("user_message")
            or payload.get("text")
            or "No response is available."
        )

    def get_ok(self, obj):
        if obj.status == DesktopAutomationJob.Status.COMPLETED:
            return True
        if obj.status == DesktopAutomationJob.Status.FAILED:
            return False
        return None

    def _deepseek_jobs_ahead(self, obj) -> int | None:
        if obj.kind != "deepseek_query":
            return None

        if obj.status == DesktopAutomationJob.Status.RUNNING:
            return 0

        if obj.status != DesktopAutomationJob.Status.QUEUED:
            return 0

        running_count = DesktopAutomationJob.objects.filter(
            kind="deepseek_query",
            status=DesktopAutomationJob.Status.RUNNING,
        ).count()

        queued_ahead_count = (
            DesktopAutomationJob.objects.filter(
                kind="deepseek_query",
                status=DesktopAutomationJob.Status.QUEUED,
            )
            .exclude(pk=obj.pk)
            .filter(
                Q(priority__gt=obj.priority)
                | Q(priority=obj.priority, created_at__lt=obj.created_at)
                | Q(priority=obj.priority, created_at=obj.created_at, pk__lt=obj.pk)
            )
            .count()
        )

        return running_count + queued_ahead_count

    def get_jobs_ahead(self, obj):
        return self._deepseek_jobs_ahead(obj)

    def get_queue_position(self, obj):
        jobs_ahead = self._deepseek_jobs_ahead(obj)

        if jobs_ahead is None:
            return None

        if obj.status == DesktopAutomationJob.Status.QUEUED:
            return jobs_ahead + 1

        return 0

    def get_processing_label(self, obj):
        if obj.kind != "deepseek_query":
            return obj.get_status_display()

        if obj.status == DesktopAutomationJob.Status.QUEUED:
            jobs_ahead = self._deepseek_jobs_ahead(obj) or 0
            if jobs_ahead == 0:
                return "Queued - you are next"
            return f"Queued - {jobs_ahead} job(s) ahead of you"

        if obj.status == DesktopAutomationJob.Status.RUNNING:
            return "Processing now"

        if obj.status == DesktopAutomationJob.Status.COMPLETED:
            return "Completed"

        if obj.status == DesktopAutomationJob.Status.FAILED:
            return "Failed"

        if obj.status == DesktopAutomationJob.Status.CANCELED:
            return "Canceled"

        return obj.get_status_display()


class DesktopWorkerHeartbeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesktopWorkerHeartbeat
        fields = (
            "worker_id",
            "status",
            "current_job_id",
            "last_seen_at",
            "error_message",
            "metadata",
            "updated_at",
        )
        read_only_fields = fields


class ClaimJobSerializer(serializers.Serializer):
    worker_id = serializers.CharField(max_length=120, required=False, allow_blank=True)


class CompleteJobSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    result_payload = serializers.JSONField(default=dict)


class FailJobSerializer(serializers.Serializer):
    job_id = serializers.IntegerField()
    error_message = serializers.CharField(allow_blank=True, required=False)
    public_message = serializers.CharField(allow_blank=True, required=False)
    retry = serializers.BooleanField(default=True)


class HeartbeatSerializer(serializers.Serializer):
    worker_id = serializers.CharField(max_length=120)
    status = serializers.CharField(max_length=40, required=False, allow_blank=True)
    current_job_id = serializers.IntegerField(required=False, allow_null=True)
    error_message = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.JSONField(default=dict)
