from django.contrib import admin

from apps.applications.models import SavedOpportunity


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
        "opportunity__country",
        "created_at",
    )
    readonly_fields = ("created_at", "updated_at")

    def opportunity_type(self, obj):
        return obj.opportunity.opportunity_type

    def country(self, obj):
        return obj.opportunity.country
