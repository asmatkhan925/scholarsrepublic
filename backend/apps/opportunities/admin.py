from django.contrib import admin

from apps.opportunities.models import Opportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "opportunity_type",
        "provider_name",
        "display_country",
        "display_eligible_countries",
        "display_study_fields",
        "funding_type",
        "deadline",
        "status",
        "featured",
        "display_content_quality",
        "verified_status",
        "last_verified_at",
        "updated_at",
    )
    list_filter = (
        "status",
        "opportunity_type",
        "funding_type",
        "featured",
        "verified_status",
        "country_ref",
        "eligible_country_refs",
        "eligible_region_refs",
        "all_study_fields",
        "study_field_refs",
        "deadline",
    )
    search_fields = (
        "title",
        "provider_name",
        "university_name",
        "country_ref__name",
        "eligible_country_refs__name",
        "eligible_region_refs__name",
        "study_field_refs__name",
        "search_keywords",
        "tags",
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
        "display_content_quality",
        "display_country",
        "display_eligible_countries",
        "display_eligible_regions",
        "display_study_fields",
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
                    "display_content_quality",
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
            "Country, eligibility, and study fields",
            {
                "fields": (
                    "display_country",
                    "display_eligible_countries",
                    "display_eligible_regions",
                    "display_study_fields",
                    "country_ref",
                    "eligible_country_refs",
                    "eligible_region_refs",
                    "study_field_refs",
                    "all_study_fields",
                )
            },
        ),
        (
            "Eligibility",
            {
                "fields": (
                    "degree_levels",
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

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("country_ref")
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
        )

    @admin.display(description="Country", ordering="country_ref__name")
    def display_country(self, obj):
        return obj.country_ref.name if obj.country_ref else "-"

    @admin.display(description="Eligible countries")
    def display_eligible_countries(self, obj):
        return self.join_names(obj.eligible_country_refs.all())

    @admin.display(description="Eligible regions")
    def display_eligible_regions(self, obj):
        return self.join_names(obj.eligible_region_refs.all())

    @admin.display(description="Study fields")
    def display_study_fields(self, obj):
        if obj.all_study_fields:
            return "All Fields"

        return self.join_names(obj.study_field_refs.all())

    @admin.display(description="Content quality")
    def display_content_quality(self, obj):
        if self.has_sample_text(obj.short_description) or self.has_sample_text(
            obj.description
        ):
            return "Sample text"

        if self.is_blank(obj.official_link):
            return "Needs official link"

        if self.is_blank(obj.source_url) or self.is_blank(obj.source_name):
            return "Needs source"

        if (
            self.is_blank(obj.description)
            or self.is_blank(obj.eligibility)
            or self.is_blank(obj.benefits)
        ):
            return "Needs content"

        if self.is_blank(obj.how_to_apply):
            return "Needs content"

        if obj.verified_status:
            return "Verified"

        return "Needs verification"

    def join_names(self, references):
        names = [reference.name for reference in references]
        return ", ".join(names) if names else "-"

    def has_sample_text(self, value):
        text = (value or "").casefold()
        weak_phrases = (
            "development sample",
            "sample opportunity",
            "verify details from the official source before using in production",
            "sample data",
            "placeholder",
        )
        return any(phrase in text for phrase in weak_phrases)

    def is_blank(self, value):
        return not (value or "").strip()
