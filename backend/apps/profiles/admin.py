from django.contrib import admin

from apps.profiles.models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "nationality",
        "city",
        "province",
        "current_education_level",
        "target_degree_level",
        "current_field_of_study",
        "funding_preference",
        "profile_source",
        "completion_percentage_display",
        "scholarship_readiness_score_display",
        "updated_at",
    )
    search_fields = (
        "user__email",
        "user__full_name",
        "city",
        "current_institution",
        "current_field_of_study",
    )
    list_filter = (
        "nationality",
        "province",
        "current_education_level",
        "target_degree_level",
        "funding_preference",
        "has_passport",
        "has_cv",
        "has_ielts",
        "need_based_support_required",
        "email_alerts_enabled",
        "profile_source",
        "ai_autofill_reviewed",
    )
    readonly_fields = (
        "completion_percentage_display",
        "scholarship_readiness_score_display",
        "readiness_level_display",
        "missing_profile_fields_display",
        "missing_core_documents_display",
        "created_at",
        "updated_at",
    )

    @admin.display(description="Completion %")
    def completion_percentage_display(self, obj):
        return obj.completion_percentage

    @admin.display(description="Readiness score")
    def scholarship_readiness_score_display(self, obj):
        return obj.scholarship_readiness_score

    @admin.display(description="Readiness level")
    def readiness_level_display(self, obj):
        return obj.readiness_level

    @admin.display(description="Missing profile fields")
    def missing_profile_fields_display(self, obj):
        return ", ".join(obj.missing_profile_fields)

    @admin.display(description="Missing core documents")
    def missing_core_documents_display(self, obj):
        return ", ".join(obj.missing_core_documents)
