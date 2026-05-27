from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils import timezone

from apps.opportunities.models import (
    Opportunity,
    OpportunityComment,
    OpportunityDeadlineCheckLog,
    OpportunityDraft,
    OpportunityPathway,
    OpportunitySocialDraft,
    OpportunitySocialPostLog,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)


@admin.register(OpportunityPathway)
class OpportunityPathwayAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "pathway_type",
        "country_ref",
        "parent",
        "is_active",
        "display_order",
        "updated_at",
    )
    list_filter = ("pathway_type", "country_ref", "is_active")
    search_fields = (
        "title",
        "slug",
        "description",
        "country_ref__name",
        "parent__title",
    )
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = ("country_ref", "parent")
    ordering = ("display_order", "title")


@admin.register(OpportunityDraft)
class OpportunityDraftAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "source_name",
        "confidence",
        "created_opportunity",
        "updated_at",
        "imported_at",
    )
    list_filter = ("status", "confidence", "source_name", "updated_at")
    search_fields = (
        "title",
        "slug",
        "source_url",
        "source_name",
        "created_opportunity__title",
    )
    readonly_fields = (
        "validation_warnings",
        "validation_errors",
        "created_opportunity",
        "imported_at",
        "created_at",
        "updated_at",
    )
    prepopulated_fields = {"slug": ("title",)}
    actions = ("validate_selected_drafts", "import_selected_drafts")

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id and request.user.is_authenticated:
            obj.created_by = request.user

        super().save_model(request, obj, form, change)

    @admin.action(description="Validate selected drafts")
    def validate_selected_drafts(self, request, queryset):
        validated_count = 0
        error_count = 0

        for draft in queryset:
            cleaned, warnings, errors = validate_opportunity_draft_payload(draft.raw_payload)
            opportunity = cleaned.get("opportunity", {})
            draft.confidence = cleaned.get("confidence", "")
            draft.source_url = opportunity.get("source_url", "")
            draft.source_name = opportunity.get("source_name", "")
            draft.validation_warnings = warnings
            draft.validation_errors = errors
            draft.status = (
                OpportunityDraft.Status.ERROR if errors else OpportunityDraft.Status.VALIDATED
            )
            draft.save(
                update_fields=[
                    "confidence",
                    "source_url",
                    "source_name",
                    "validation_warnings",
                    "validation_errors",
                    "status",
                    "updated_at",
                ]
            )

            if errors:
                error_count += 1
            else:
                validated_count += 1

        self.message_user(
            request,
            f"Validated {validated_count} draft(s); {error_count} draft(s) have errors.",
            messages.INFO,
        )

    @admin.action(description="Import selected drafts as draft opportunities")
    def import_selected_drafts(self, request, queryset):
        imported_count = 0
        error_count = 0

        for draft in queryset:
            opportunity = import_opportunity_draft(draft, user=request.user)

            if opportunity:
                imported_count += 1
            else:
                error_count += 1

        self.message_user(
            request,
            f"Imported {imported_count} draft opportunity(s); "
            f"{error_count} draft(s) have errors.",
            messages.INFO if error_count == 0 else messages.WARNING,
        )


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "opportunity_type",
        "application_track",
        "provider_name",
        "pathway",
        "display_country",
        "display_eligible_countries",
        "display_study_fields",
        "funding_type",
        "deadline",
        "deadline_check_status",
        "deadline_last_checked_at",
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
        "stipend_summary",
        "featured",
        "verified_status",
        "pathway",
        "application_track",
        "country_ref",
        "eligible_country_refs",
        "eligible_region_refs",
        "all_study_fields",
        "study_field_refs",
        "deadline",
        "deadline_check_status",
    )
    search_fields = (
        "title",
        "provider_name",
        "university_name",
        "pathway__title",
        "country_ref__name",
        "eligible_country_refs__name",
        "eligible_region_refs__name",
        "study_field_refs__name",
        "stipend_summary",
        "search_keywords",
        "tags",
    )
    prepopulated_fields = {"slug": ("title",)}
    autocomplete_fields = (
        "country_ref",
        "pathway",
        "eligible_country_refs",
        "eligible_region_refs",
        "study_field_refs",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "published_at",
        "last_verified_at",
        "deadline_last_checked_at",
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
            "Pathway and specific opportunity details",
            {
                "fields": (
                    "pathway",
                    "application_track",
                    "department_name",
                    "lab_name",
                    "professor_name",
                    "professor_email",
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
                    "stipend_summary",
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
                    "deadline_last_checked_at",
                    "deadline_check_status",
                    "deadline_check_source_url",
                    "deadline_check_evidence",
                    "deadline_check_note",
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
            .select_related("country_ref", "pathway")
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
        if self.has_sample_text(obj.short_description) or self.has_sample_text(obj.description):
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


@admin.register(OpportunitySocialDraft)
class OpportunitySocialDraftAdmin(admin.ModelAdmin):
    list_display = (
        "opportunity_draft",
        "status",
        "has_facebook_image",
        "social_image_source",
        "social_image_status",
        "updated_at",
    )
    list_filter = ("status", "social_image_source", "social_image_status", "updated_at")
    search_fields = (
        "opportunity_draft__title",
        "facebook_post_text",
        "facebook_image_prompt",
        "facebook_image_url",
    )
    readonly_fields = ("social_image_preview", "created_at", "updated_at")
    actions = ("clear_social_image",)

    @admin.display(description="Image")
    def has_facebook_image(self, obj):
        return bool(obj.facebook_image or obj.facebook_image_url)

    @admin.display(description="Social image preview")
    def social_image_preview(self, obj):
        if obj.facebook_image:
            return format_html(
                '<img src="{}" style="max-width: 260px; height: auto;" />',
                obj.facebook_image.url,
            )
        return "-"

    @admin.action(description="Clear social image")
    def clear_social_image(self, request, queryset):
        updated = 0
        for obj in queryset:
            if obj.facebook_image:
                obj.facebook_image.delete(save=False)
            obj.facebook_image_url = ""
            obj.social_image_source = ""
            obj.social_image_status = obj.SocialImageStatus.MISSING
            obj.social_image_error = ""
            obj.social_image_saved_at = None
            obj.save(
                update_fields=[
                    "facebook_image",
                    "facebook_image_url",
                    "social_image_source",
                    "social_image_status",
                    "social_image_error",
                    "social_image_saved_at",
                    "updated_at",
                ]
            )
            updated += 1
        self.message_user(request, f"Cleared {updated} social image(s).", messages.INFO)


@admin.register(OpportunitySocialPostPlan)
class OpportunitySocialPostPlanAdmin(admin.ModelAdmin):
    list_display = (
        "opportunity",
        "platform",
        "status",
        "enabled",
        "next_post_at",
        "last_posted_at",
        "post_count",
        "social_image_source",
        "social_image_status",
        "updated_at",
    )
    list_filter = (
        "platform",
        "status",
        "enabled",
        "social_image_source",
        "social_image_status",
        "last_posted_at",
        "next_post_at",
    )
    search_fields = (
        "opportunity__title",
        "opportunity__slug",
        "post_text",
        "image_prompt",
        "image_url",
        "last_error",
    )
    raw_id_fields = ("opportunity",)
    readonly_fields = (
        "social_image_preview",
        "created_at",
        "updated_at",
        "last_posted_at",
        "post_count",
    )
    actions = ("clear_social_image", "regenerate_fallback_image")

    @admin.display(description="Social image preview")
    def social_image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 260px; height: auto;" />',
                obj.image.url,
            )
        if obj.image_url:
            return format_html(
                '<a href="{}" target="_blank" rel="noreferrer">{}</a>',
                obj.image_url,
                obj.image_url,
            )
        return "-"

    @admin.action(description="Clear social image")
    def clear_social_image(self, request, queryset):
        updated = 0
        for obj in queryset:
            if obj.image:
                obj.image.delete(save=False)
            obj.image_url = ""
            obj.social_image_source = ""
            obj.social_image_status = obj.SocialImageStatus.MISSING
            obj.social_image_error = ""
            obj.social_image_saved_at = None
            obj.save(
                update_fields=[
                    "image",
                    "image_url",
                    "social_image_source",
                    "social_image_status",
                    "social_image_error",
                    "social_image_saved_at",
                    "updated_at",
                ]
            )
            updated += 1
        self.message_user(request, f"Cleared {updated} social image(s).", messages.INFO)

    @admin.action(description="Regenerate fallback image metadata")
    def regenerate_fallback_image(self, request, queryset):
        updated = queryset.update(
            social_image_source=OpportunitySocialPostPlan.SocialImageSource.OG_FALLBACK,
            social_image_status=OpportunitySocialPostPlan.SocialImageStatus.FALLBACK,
            social_image_error="",
            updated_at=timezone.now(),
        )
        self.message_user(
            request,
            f"Marked {updated} plan(s) to use OG image fallback.",
            messages.INFO,
        )


@admin.register(OpportunitySocialPostLog)
class OpportunitySocialPostLogAdmin(admin.ModelAdmin):
    list_display = (
        "opportunity",
        "platform",
        "status",
        "facebook_post_id",
        "image_source",
        "posted_at",
        "created_at",
    )
    list_filter = ("platform", "status", "posted_at", "created_at")
    search_fields = (
        "opportunity__title",
        "opportunity__slug",
        "facebook_post_id",
        "facebook_post_url",
        "error_message",
    )
    raw_id_fields = ("opportunity", "plan")
    readonly_fields = ("created_at",)


@admin.register(OpportunityComment)
class OpportunityCommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "opportunity",
        "user",
        "display_moderation_status",
        "display_comment_excerpt",
        "parent",
        "created_at",
        "updated_at",
    )
    list_filter = ("is_deleted", "created_at", "updated_at", "opportunity__status")
    search_fields = (
        "body",
        "user__email",
        "user__first_name",
        "user__last_name",
        "opportunity__title",
        "opportunity__slug",
    )
    raw_id_fields = ("opportunity", "user", "parent")
    readonly_fields = ("created_at", "updated_at", "display_moderation_status")
    actions = ("approve_selected_comments", "hide_selected_comments", "remove_selected_comments")
    ordering = ("-created_at",)

    @admin.display(description="Moderation")
    def display_moderation_status(self, obj):
        return "Pending or hidden" if obj.is_deleted else "Approved"

    @admin.display(description="Comment")
    def display_comment_excerpt(self, obj):
        text = (obj.body or "").strip()
        return text[:120] + "..." if len(text) > 120 else text

    @admin.action(description="Approve selected comments")
    def approve_selected_comments(self, request, queryset):
        updated = queryset.update(is_deleted=False, updated_at=timezone.now())
        self.message_user(request, f"Approved {updated} comment(s).", messages.SUCCESS)

    @admin.action(description="Hide selected comments")
    def hide_selected_comments(self, request, queryset):
        updated = queryset.update(is_deleted=True, updated_at=timezone.now())
        self.message_user(request, f"Hid {updated} comment(s).", messages.WARNING)

    @admin.action(description="Remove selected comments and clear text")
    def remove_selected_comments(self, request, queryset):
        removed_count = 0

        for comment in queryset:
            comment.soft_delete()
            removed_count += 1

        self.message_user(
            request,
            f"Removed {removed_count} comment(s) and cleared their text.",
            messages.WARNING,
        )


@admin.register(OpportunityDeadlineCheckLog)
class OpportunityDeadlineCheckLogAdmin(admin.ModelAdmin):
    list_display = (
        "opportunity",
        "status",
        "check_status",
        "confidence",
        "old_deadline",
        "detected_deadline",
        "new_deadline",
        "verifier",
        "checked_at",
        "created_at",
    )
    list_filter = ("status", "check_status", "confidence", "verifier", "created_at")
    search_fields = (
        "opportunity__title",
        "opportunity__slug",
        "source_url",
        "evidence",
        "evidence_text",
        "note",
    )
    raw_id_fields = ("opportunity",)
    readonly_fields = ("created_at", "checked_at")
    ordering = ("-checked_at", "-created_at")
