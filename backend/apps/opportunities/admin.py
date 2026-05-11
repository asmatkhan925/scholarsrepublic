from django.contrib import admin

from apps.opportunities.models import Opportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "opportunity_type",
        "country_ref",
        "provider_name",
        "funding_type",
        "deadline",
        "status",
        "verified_status",
        "featured",
        "updated_at",
    )
    list_filter = (
        "opportunity_type",
        "status",
        "verified_status",
        "featured",
        "country_ref",
        "funding_type",
        "application_fee_required",
        "ielts_required",
        "hec_required",
        "location_type",
    )
    search_fields = (
        "title",
        "provider_name",
        "university_name",
        "company_name",
        "country_ref",
        "city",
        "search_keywords",
    )
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = (
        "country_ref",
        "eligible_country_refs",
        "eligible_region_refs",
        "study_field_refs",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "published_at",
        "last_verified_at",
    )
    fieldsets = (
        (
            "Identity and status",
            {
                "fields": (
                    "title",
                    "slug",
                    "opportunity_type",
                    "status",
                    "featured",
                    "verified_status",
                    "verification_note",
                    "last_verified_at",
                )
            },
        ),
        (
            "Provider and organization",
            {
                "fields": (
                    "provider_name",
                    "organization_type",
                    "university_name",
                    "company_name",
                    "country_ref",
                    "city",
                    "location_type",
                )
            },
        ),
        (
            "Content",
            {
                "fields": (
                    "short_description",
                    "description",
                    "benefits",
                    "eligibility",
                    "how_to_apply",
                    "official_link",
                    "source_url",
                    "source_name",
                )
            },
        ),
        (
            "Eligibility",
            {
                "fields": (
                    "eligible_country_refs",
                    "eligible_region_refs",
                    "degree_levels",
                    "study_field_refs",
                    "all_study_fields",
                    
                    "gender_eligibility",
                    "min_cgpa",
                    "min_percentage",
                    "min_education_level",
                )
            },
        ),
        (
            "Scholarship fields",
            {
                "fields": (
                    "funding_type",
                    "funding_amount",
                    "funding_currency",
                    "application_fee_required",
                    "application_fee_amount",
                    "application_fee_currency",
                    "hec_required",
                    "ielts_required",
                    "toefl_required",
                    "duolingo_required",
                    "hsk_required",
                    "english_proficiency_certificate_accepted",
                )
            },
        ),
        (
            "Job and internship fields",
            {
                "fields": (
                    "employment_type",
                    "experience_level",
                    "min_experience_years",
                    "required_skills",
                    "salary_min",
                    "salary_max",
                    "salary_currency",
                )
            },
        ),
        (
            "Deadline and application",
            {
                "fields": (
                    "deadline",
                    "is_rolling_deadline",
                    "application_open_date",
                    "application_method",
                    "required_documents",
                )
            },
        ),
        (
            "Search and metadata",
            {"fields": ("tags", "search_keywords")},
        ),
        (
            "Timestamps",
            {"fields": ("published_at", "created_at", "updated_at")},
        ),
    )
