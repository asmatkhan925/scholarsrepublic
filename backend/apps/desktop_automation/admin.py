from django.contrib import admin

from apps.desktop_automation.models import DesktopAutomationJob


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
