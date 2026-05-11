from django.contrib import admin

from apps.reference_data.models import Country, Region, StudyField, StudyFieldCategory


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    ordering = ("display_order", "name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("name", "region", "iso2", "is_active", "display_order")
    list_filter = ("region", "is_active")
    search_fields = ("name", "iso2", "iso3")
    ordering = ("region__display_order", "display_order", "name")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("region",)


@admin.register(StudyFieldCategory)
class StudyFieldCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "display_order")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("display_order", "name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(StudyField)
class StudyFieldAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_active", "display_order")
    list_filter = ("category", "is_active")
    search_fields = ("name", "aliases")
    ordering = ("category__display_order", "display_order", "name")
    prepopulated_fields = {"slug": ("name",)}
    autocomplete_fields = ("category",)
