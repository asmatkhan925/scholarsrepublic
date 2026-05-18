import re

from rest_framework import serializers

from django.utils import timezone

from apps.opportunities.models import Opportunity

from .models import AIJob, SOPDraft


SOP_SAFETY_MESSAGE = (
    "Please remove instructions that ask the AI to ignore rules, invent achievements, "
    "or include sensitive personal information. Your SOP should only use honest details you provide."
)

SOP_SAFETY_FIELD_LABELS = {
    "target_scholarship": "Scholarship",
    "target_country": "Target country",
    "target_degree": "Target degree",
    "field_of_study": "Field of study",
    "why_scholarship": "Why this scholarship?",
    "future_goals": "Future goal",
    "contribution_goal": "Contribution goal",
    "existing_draft": "Notes or existing draft",
}

SOP_PROMPT_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"ignore\s+(all\s+)?(previous|above|system|developer)\s+instructions?",
        r"ignore\s+(the\s+)?rules",
        r"do\s+not\s+follow\s+(the\s+)?(rules|instructions)",
        r"reveal\s+(the\s+)?(system\s+prompt|developer\s+message|hidden\s+instructions?|prompt)",
        r"show\s+(the\s+)?(system\s+prompt|developer\s+message|hidden\s+instructions?)",
        r"\b(jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+ai)\b",
        r"bypass\s+(the\s+)?(rules|safety|instructions|filters?)",
        r"(act|pretend)\s+as\s+(an?\s+)?(unrestricted|uncensored|jailbroken)",
    ]
]

SOP_FAKE_ACHIEVEMENT_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"(invent|make\s+up|fabricate|fake|create|add|write|lie\s+about).{0,60}\b(cgpa|gpa|grade|grades|award|awards|achievement|achievements|publication|publications|research|internship|internships|work\s+experience|job|university|certificate|transcript|recommendation|ielts|toefl)\b",
        r"\b(fake|forged|fabricated)\b.{0,60}\b(transcript|certificate|degree|recommendation|ielts|toefl|award|publication|experience)\b",
        r"\b(say|claim|mention)\b.{0,40}\b(i\s+have|i\s+had|i\s+won|i\s+published|i\s+worked)\b.{0,60}\b(even\s+if|although|but)\b.{0,40}\b(not\s+true|did\s+not|never)\b",
    ]
]

SOP_SENSITIVE_DATA_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\b(password|passcode|api\s*key|secret\s*key|private\s*key|jwt|bearer\s+token|access\s+token)\b\s*[:=]\s*\S+",
        r"\b(cnic|passport|national\s+id|id\s+card)\b.{0,20}\d{4,}",
        r"\b\d{5}-\d{7}-\d\b",
        r"\b(card\s+number|credit\s+card|debit\s+card|cvv|cvc)\b.{0,30}\d{4,}",
        r"-----BEGIN\s+(RSA|OPENSSH|DSA|EC|PRIVATE)\s+PRIVATE\s+KEY-----",
    ]
]

SOP_SPAM_OR_SCRIPT_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"<\s*script\b",
        r"javascript\s*:",
        r"<\s*iframe\b",
        r"(.)\1{40,}",
    ]
]


def _sop_url_count(value):
    return len(re.findall(r"https?://|www\.", value, flags=re.IGNORECASE))


def validate_sop_safety(attrs):
    errors = {}

    for field, label in SOP_SAFETY_FIELD_LABELS.items():
        value = str(attrs.get(field, "") or "").strip()

        if not value:
            continue

        if any(pattern.search(value) for pattern in SOP_PROMPT_INJECTION_PATTERNS):
            errors[field] = (
                f"The {label} field appears to include instructions that ask the AI "
                "to ignore rules. Please remove them."
            )
            continue

        if any(pattern.search(value) for pattern in SOP_FAKE_ACHIEVEMENT_PATTERNS):
            errors[field] = (
                f"The {label} field appears to ask for invented or fake details. "
                "Please use only honest information."
            )
            continue

        if any(pattern.search(value) for pattern in SOP_SENSITIVE_DATA_PATTERNS):
            errors[field] = (
                f"The {label} field appears to include sensitive personal information. "
                "Please remove passwords, tokens, ID numbers, or card details."
            )
            continue

        if any(pattern.search(value) for pattern in SOP_SPAM_OR_SCRIPT_PATTERNS) or _sop_url_count(value) >= 3:
            errors[field] = (
                f"The {label} field contains content that does not look suitable for an SOP. "
                "Please remove scripts, repeated junk text, or excessive links."
            )

    if errors:
        errors["detail"] = SOP_SAFETY_MESSAGE
        raise serializers.ValidationError(errors)



class SOPGenerateSerializer(serializers.Serializer):
    target_scholarship = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=300,
        error_messages={
            "blank": "Please choose the scholarship you are applying for.",
            "required": "Please choose the scholarship you are applying for.",
        },
    )
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

        validate_sop_safety(attrs)

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
    opportunity = serializers.PrimaryKeyRelatedField(
        queryset=Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        ),
        required=False,
        allow_null=True,
    )
    opportunity_slug = serializers.CharField(source="opportunity.slug", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)

    class Meta:
        model = SOPDraft
        fields = [
            "id",
            "title",
            "provider",
            "provider_label",
            "opportunity",
            "opportunity_slug",
            "opportunity_title",
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
