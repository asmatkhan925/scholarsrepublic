from rest_framework import serializers

from apps.desktop_automation.models import DesktopAutomationJob


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
