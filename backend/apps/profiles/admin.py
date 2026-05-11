from django.contrib import admin

from apps.profiles.models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "nationality_country",
        "current_country_ref",
        "current_education_level",
        "target_degree_level",
        "readiness_level",
        "completion_percentage",
        "scholarship_readiness_score",
        "updated_at",
    )
    list_filter = (
        "nationality_country",
        "current_country_ref",
        "current_education_level",
        "target_degree_level",
        "funding_preference",
        "profile_data_consent",
        "email_alerts_enabled",
        "whatsapp_alerts_enabled",
        "profile_source",
    )
    search_fields = (
        "user__email",
        "user__full_name",
        "city",
        "domicile",
        "current_institution",
        "custom_current_study_field",
        "nationality_country__name",
        "current_country_ref__name",
        "target_country_refs__name",
        "current_study_field_ref__name",
        "target_study_field_refs__name",
    )
    autocomplete_fields = (
        "nationality_country",
        "current_country_ref",
        "current_study_field_ref",
        "target_country_refs",
        "target_study_field_refs",
        "supervisor_country_ref",
    )
    readonly_fields = (
        "completion_percentage",
        "scholarship_readiness_score",
        "readiness_level",
        "missing_profile_fields",
        "missing_core_documents",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Student",
            {
                "fields": (
                    "user",
                    "profile_source",
                    "ai_autofill_reviewed",
                )
            },
        ),
        (
            "Personal and location",
            {
                "fields": (
                    "phone_number",
                    "whatsapp_number",
                    "date_of_birth",
                    "nationality_country",
                    "current_country_ref",
                    "city",
                    "province",
                    "domicile",
                )
            },
        ),
        (
            "Education",
            {
                "fields": (
                    "current_education_level",
                    "current_institution",
                    "current_study_field_ref",
                    "custom_current_study_field",
                    "graduation_year",
                    "result_status",
                    "grading_system",
                    "cgpa",
                    "percentage",
                    "division",
                )
            },
        ),
        (
            "Scholarship targets",
            {
                "fields": (
                    "target_degree_level",
                    "target_country_refs",
                    "target_study_field_refs",
                    "custom_target_study_fields",
                    "preferred_intake",
                    "study_mode_preference",
                    "funding_preference",
                    "application_fee_preference",
                    "language_instruction_preference",
                )
            },
        ),
        (
            "Language and tests",
            {
                "fields": (
                    "has_ielts",
                    "ielts_score",
                    "has_toefl",
                    "toefl_score",
                    "has_duolingo",
                    "duolingo_score",
                    "has_pte",
                    "pte_score",
                    "has_hsk",
                    "hsk_level",
                    "has_gre",
                    "gre_score",
                    "has_gmat",
                    "gmat_score",
                    "english_proficiency_certificate",
                )
            },
        ),
        (
            "Documents",
            {
                "fields": (
                    "has_cnic",
                    "has_domicile",
                    "has_passport",
                    "passport_expiry_date",
                    "has_transcript",
                    "has_degree",
                    "has_cv",
                    "has_sop",
                    "has_study_plan",
                    "has_recommendation_letters",
                    "recommendation_letters_count",
                    "has_research_proposal",
                    "has_publications",
                    "has_english_proficiency_letter",
                    "has_income_certificate",
                    "has_bank_statement",
                    "has_police_clearance",
                    "has_medical_certificate",
                    "additional_documents",
                )
            },
        ),
        (
            "Research and experience",
            {
                "fields": (
                    "research_interests",
                    "has_research_experience",
                    "publications_count",
                    "has_supervisor_acceptance",
                    "supervisor_country_ref",
                    "custom_supervisor_country",
                    "supervisor_university",
                    "skills",
                    "work_experience_years",
                    "has_internship_experience",
                    "linkedin_url",
                    "portfolio_url",
                    "github_url",
                )
            },
        ),
        (
            "Funding and alerts",
            {
                "fields": (
                    "need_based_support_required",
                    "can_pay_application_fee",
                    "max_application_fee_usd",
                    "can_self_fund_partial",
                    "special_scholarship_categories",
                    "email_alerts_enabled",
                    "whatsapp_alerts_enabled",
                    "profile_data_consent",
                )
            },
        ),
        (
            "Readiness",
            {
                "fields": (
                    "completion_percentage",
                    "scholarship_readiness_score",
                    "readiness_level",
                    "missing_profile_fields",
                    "missing_core_documents",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
