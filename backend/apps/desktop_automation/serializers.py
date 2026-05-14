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

    class Meta:
        model = DesktopAutomationJob
        fields = (
            "id",
            "kind",
            "status",
            "ok",
            "text",
            "user_message",
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
