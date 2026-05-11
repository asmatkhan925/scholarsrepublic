from django.contrib import admin

from apps.reference_data.models import Country


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "iso2", "is_active", "display_order")
    list_filter = ("region", "is_active")
    search_fields = ("name", "iso2", "iso3")
    ordering = ("region", "display_order", "name")
    prepopulated_fields = {"slug": ("name",)}
