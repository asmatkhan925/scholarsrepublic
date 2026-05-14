from django.contrib import admin

from apps.desktop_automation.models import (
    DesktopAutomationJob,
    DesktopWorkerHeartbeat,
)


@admin.register(DesktopAutomationJob)
class DesktopAutomationJobAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "kind",
        "status",
        "priority",
        "claimed_by",
        "attempts",
        "max_attempts",
        "created_at",
        "updated_at",
    )
    list_filter = ("status", "kind", "claimed_by")
    search_fields = ("kind", "claimed_by", "error_message")
    readonly_fields = (
        "claimed_at",
        "started_at",
        "completed_at",
        "failed_at",
        "created_at",
        "updated_at",
    )
    ordering = ("-priority", "-created_at")


@admin.register(DesktopWorkerHeartbeat)
class DesktopWorkerHeartbeatAdmin(admin.ModelAdmin):
    list_display = (
        "worker_id",
        "status",
        "current_job_id",
        "last_seen_at",
        "updated_at",
    )
    list_filter = ("status",)
    search_fields = ("worker_id", "error_message")
    readonly_fields = ("created_at", "updated_at")
