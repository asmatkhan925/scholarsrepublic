from rest_framework import serializers

from django.utils import timezone

from .models import AIJob, SOPDraft


class SOPGenerateSerializer(serializers.Serializer):
    target_scholarship = serializers.CharField(required=False, allow_blank=True, max_length=300)
    target_country = serializers.CharField(required=False, allow_blank=True, max_length=120)
    target_degree = serializers.CharField(required=True, allow_blank=False, max_length=120)
    field_of_study = serializers.CharField(required=True, allow_blank=False, max_length=200)
    why_scholarship = serializers.CharField(required=False, allow_blank=True, max_length=1200)
    future_goals = serializers.CharField(required=False, allow_blank=True, max_length=1200)
    contribution_goal = serializers.CharField(required=False, allow_blank=True, max_length=1200)
    existing_draft = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    output_type = serializers.ChoiceField(
        choices=["paragraph", "medium_sop", "full_sop"],
        default="paragraph",
    )
    tone = serializers.ChoiceField(
        choices=["simple", "formal", "strong_academic"],
        default="formal",
    )

    def validate(self, attrs):
        future_goals = attrs.get("future_goals", "").strip()
        existing_draft = attrs.get("existing_draft", "").strip()

        if not future_goals and not existing_draft:
            raise serializers.ValidationError(
                "Please provide either future goals or an existing SOP draft."
            )

        return attrs


class AIJobSerializer(serializers.ModelSerializer):
    queue_position = serializers.SerializerMethodField()
    estimated_wait_seconds = serializers.SerializerMethodField()

    class Meta:
        model = AIJob
        fields = [
            "id",
            "tool_type",
            "status",
            "result_text",
            "error_message",
            "queue_position",
            "queue_position_at_submit",
            "estimated_wait_seconds",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "elapsed_seconds",
            "created_at",
            "started_at",
            "finished_at",
        ]

    def get_queue_position(self, obj):
        if obj.status not in [AIJob.Status.PENDING, AIJob.Status.RUNNING]:
            return 0

        if obj.status == AIJob.Status.RUNNING:
            return 1

        jobs_before = AIJob.objects.filter(
            status__in=[AIJob.Status.PENDING, AIJob.Status.RUNNING],
            created_at__lt=obj.created_at,
        ).count()

        return jobs_before + 1

    def get_estimated_wait_seconds(self, obj):
        if obj.status == AIJob.Status.SUCCESS:
            return 0

        if obj.status == AIJob.Status.FAILED:
            return 0

        queue_position = self.get_queue_position(obj)
        average_seconds_per_job = 45

        output_type = obj.request_payload.get("output_type", "paragraph")
        if output_type == "medium_sop":
            average_seconds_per_job = 75
        elif output_type == "full_sop":
            average_seconds_per_job = 120

        return max(queue_position, 1) * average_seconds_per_job


class SOPDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOPDraft
        fields = [
            "id",
            "title",
            "provider",
            "provider_label",
            "target_scholarship",
            "target_country",
            "target_degree",
            "field_of_study",
            "academic_background",
            "key_strength",
            "why_this_scholarship",
            "future_goal",
            "contribution_goal",
            "notes",
            "sop_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "title": {"required": False, "allow_blank": True, "max_length": 180},
            "sop_text": {"required": True, "allow_blank": False},
        }

    def validate_sop_text(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("SOP draft text is required.")
        return cleaned

    def validate_provider_label(self, value):
        return value.strip()[:80]

    def _build_title(self, attrs):
        provided_title = attrs.get("title", "").strip()
        if provided_title:
            return provided_title[:180]

        anchor = (
            attrs.get("target_scholarship", "").strip()
            or attrs.get("target_degree", "").strip()
            or timezone.localdate().isoformat()
        )
        return f"SOP Draft - {anchor}"[:180]

    def _provider_label(self, provider):
        labels = {
            SOPDraft.Provider.LOCAL: "Server 1",
            SOPDraft.Provider.PUTER: "Server 2",
            SOPDraft.Provider.DEEPSEEK: "Server 3",
        }
        return labels.get(provider, "")

    def create(self, validated_data):
        validated_data["title"] = self._build_title(validated_data)
        if not validated_data.get("provider_label"):
            validated_data["provider_label"] = self._provider_label(validated_data.get("provider"))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "title" in validated_data:
            validated_data["title"] = self._build_title(validated_data)
        if "provider" in validated_data and not validated_data.get("provider_label"):
            validated_data["provider_label"] = self._provider_label(validated_data.get("provider"))
        return super().update(instance, validated_data)
