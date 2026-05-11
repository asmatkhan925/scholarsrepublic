from django.contrib import admin

from apps.applications.models import OpportunityApplication, SavedOpportunity


@admin.register(SavedOpportunity)
class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "opportunity",
        "opportunity_type",
        "country",
        "created_at",
    )
    search_fields = (
        "user__email",
        "user__full_name",
        "opportunity__title",
        "opportunity__slug",
    )
    list_filter = (
        "opportunity__opportunity_type",
        "opportunity__country_ref__name",
        "created_at",
    )
    readonly_fields = ("created_at", "updated_at")

    def opportunity_type(self, obj):
        return obj.opportunity.opportunity_type

    def country(self, obj):
        return obj.opportunity.country


@admin.register(OpportunityApplication)
class OpportunityApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "opportunity",
        "status",
        "priority",
        "personal_deadline",
        "reminder_at",
        "updated_at",
    )
    search_fields = (
        "user__email",
        "user__full_name",
        "opportunity__title",
        "opportunity__slug",
        "notes",
        "next_step",
    )
    list_filter = (
        "status",
        "priority",
        "opportunity__opportunity_type",
        "opportunity__country_ref__name",
        "personal_deadline",
        "created_at",
        "updated_at",
    )
    readonly_fields = ("created_at", "updated_at")
