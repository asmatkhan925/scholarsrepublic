from django.contrib import admin

from apps.reference_data.models import Country, StudyField


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "iso2", "is_active", "display_order")
    list_filter = ("region", "is_active")
    search_fields = ("name", "iso2", "iso3")
    ordering = ("region", "display_order", "name")
    prepopulated_fields = {"slug": ("name",)}



@admin.register(StudyField)
class StudyFieldAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "display_order")
    list_filter = ("category", "is_active")
    search_fields = ("name", "aliases")
    ordering = ("category", "display_order", "name")
    prepopulated_fields = {"slug": ("name",)}
