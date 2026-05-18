from django.conf import settings
from django.db import models


class AIJob(models.Model):
    class ToolType(models.TextChoices):
        SOP_GENERATE = "sop_generate", "SOP Generate"
        CV_GENERATE = "cv_generate", "CV Generate"
        MOTIVATION_LETTER = "motivation_letter", "Motivation Letter"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_jobs",
    )

    tool_type = models.CharField(max_length=50, choices=ToolType.choices)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    request_payload = models.JSONField(default=dict)
    result_text = models.TextField(blank=True)
    error_message = models.TextField(blank=True)

    queue_position_at_submit = models.PositiveIntegerField(default=1)
    estimated_wait_seconds = models.PositiveIntegerField(default=45)

    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    elapsed_seconds = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.tool_type} | {self.user_id} | {self.status}"


class SOPDraft(models.Model):
    class Provider(models.TextChoices):
        LOCAL = "local", "Server 1"
        PUTER = "puter", "Server 2"
        DEEPSEEK = "deepseek", "Server 3"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sop_drafts",
    )
    opportunity = models.ForeignKey(
        "opportunities.Opportunity",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sop_drafts",
    )
    title = models.CharField(max_length=180)
    provider = models.CharField(max_length=30, choices=Provider.choices)
    provider_label = models.CharField(max_length=80, blank=True)
    target_scholarship = models.CharField(max_length=300, blank=True)
    target_country = models.CharField(max_length=120, blank=True)
    target_degree = models.CharField(max_length=120, blank=True)
    field_of_study = models.CharField(max_length=200, blank=True)
    academic_background = models.TextField(blank=True)
    key_strength = models.TextField(blank=True)
    why_this_scholarship = models.TextField(blank=True)
    future_goal = models.TextField(blank=True)
    contribution_goal = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    sop_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "opportunity", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} | {self.user_id}"
