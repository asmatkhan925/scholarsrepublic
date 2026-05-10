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
