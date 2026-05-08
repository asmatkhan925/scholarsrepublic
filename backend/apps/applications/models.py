from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class SavedOpportunity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_opportunities",
    )
    opportunity = models.ForeignKey(
        "opportunities.Opportunity",
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_saved_opportunity_per_user",
            )
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["opportunity"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} saved {self.opportunity.title}"


class OpportunityApplication(models.Model):
    class Status(models.TextChoices):
        PREPARING = "preparing", "Preparing"
        DOCUMENTS_PENDING = "documents_pending", "Documents Pending"
        DOCUMENTS_READY = "documents_ready", "Documents Ready"
        APPLIED = "applied", "Applied"
        INTERVIEW = "interview", "Interview"
        RESULT_WAITING = "result_waiting", "Result Waiting"
        SELECTED = "selected", "Selected"
        REJECTED = "rejected", "Rejected"
        WITHDRAWN = "withdrawn", "Withdrawn"
        DEFERRED = "deferred", "Deferred"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="opportunity_applications",
    )
    opportunity = models.ForeignKey(
        "opportunities.Opportunity",
        on_delete=models.CASCADE,
        related_name="application_trackers",
    )
    saved_opportunity = models.ForeignKey(
        "applications.SavedOpportunity",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="application_trackers",
    )
    status = models.CharField(max_length=40, choices=Status.choices, default=Status.PREPARING)
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    notes = models.TextField(blank=True)
    next_step = models.CharField(max_length=255, blank=True)
    reminder_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    decision_at = models.DateTimeField(null=True, blank=True)
    personal_deadline = models.DateField(null=True, blank=True)
    checklist_snapshot = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "opportunity"],
                name="unique_application_per_user_opportunity",
            )
        ]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["opportunity"]),
            models.Index(fields=["status"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["personal_deadline"]),
            models.Index(fields=["reminder_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.email} tracking {self.opportunity.title}"

    def clean(self):
        errors = {}
        if self.user_id and getattr(self.user, "role", None) != "student":
            errors["user"] = "Only student users can track applications."
        if self.opportunity_id and self.opportunity.status != "published":
            errors["opportunity"] = "Only published opportunities can be tracked."
        if not isinstance(self.checklist_snapshot, list):
            errors["checklist_snapshot"] = "Must be a list."
        if errors:
            raise ValidationError(errors)
