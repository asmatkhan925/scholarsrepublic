from django.utils.text import slugify
from rest_framework import serializers

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityComment,
    OpportunityDraft,
    OpportunityPathway,
)
from apps.opportunities.services.social_image_uploads import (
    get_preferred_social_image_source,
    get_preferred_social_image_url,
)
from apps.reference_data.models import Country, Region, StudyField
from apps.reference_data.serializers import (
    CountrySerializer,
    RegionSerializer,
    StudyFieldSerializer,
)

LEGACY_REFERENCE_LIST_FIELDS = (
    "eligible_countries",
    "fields_of_study",
    "target_regions",
)
ALL_STUDY_FIELD_MARKERS = {"all fields", "all", "any"}


class OpportunityPathwaySerializer(serializers.ModelSerializer):
    country = serializers.SerializerMethodField()
    country_id = serializers.PrimaryKeyRelatedField(
        source="country_ref",
        queryset=Country.objects.filter(is_active=True),
        allow_null=True,
        required=False,
    )
    parent = serializers.SerializerMethodField()
    parent_id = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=OpportunityPathway.objects.all(),
        allow_null=True,
        required=False,
    )
    parent_slug = serializers.CharField(source="parent.slug", read_only=True)
    full_path = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()
    published_opportunity_count = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityPathway
        fields = (
            "id",
            "title",
            "slug",
            "pathway_type",
            "country",
            "country_id",
            "parent",
            "parent_id",
            "parent_slug",
            "full_path",
            "description",
            "official_link",
            "display_order",
            "is_active",
            "children_count",
            "published_opportunity_count",
        )

    def get_country(self, obj):
        return obj.country_ref.name if obj.country_ref else ""

    def get_parent(self, obj):
        return obj.parent.title if obj.parent else ""

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))

        if self.instance and parent:
            if parent.pk == self.instance.pk:
                raise serializers.ValidationError(
                    {"parent_id": "A pathway cannot be its own parent."}
                )

            current = parent
            seen = set()
            while current:
                if current.pk in seen or current.pk == self.instance.pk:
                    raise serializers.ValidationError(
                        {"parent_id": "Circular pathway parent chain detected."}
                    )

                seen.add(current.pk)
                current = current.parent

        return attrs

    def get_children_count(self, obj):
        if hasattr(obj, "active_children_count"):
            return obj.active_children_count

        return obj.children.filter(is_active=True).count()

    def get_pathway_and_descendant_ids(self, obj):
        seen = set()
        queue = [obj.id]

        while queue:
            current_ids = []

            for pathway_id in queue:
                if pathway_id not in seen:
                    current_ids.append(pathway_id)
                    seen.add(pathway_id)

            if not current_ids:
                break

            queue = list(
                OpportunityPathway.objects.filter(
                    is_active=True,
                    parent_id__in=current_ids,
                ).values_list("id", flat=True)
            )

        return list(seen)

    def get_published_opportunity_count(self, obj):
        return Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED,
            pathway_id__in=self.get_pathway_and_descendant_ids(obj),
        ).count()


class OpportunityListSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    days_until_deadline = serializers.IntegerField(read_only=True)
    country = serializers.CharField(read_only=True)
    eligible_countries = serializers.ListField(read_only=True)
    fields_of_study = serializers.ListField(read_only=True)
    target_regions = serializers.ListField(read_only=True)
    country_ref_detail = CountrySerializer(source="country_ref", read_only=True)
    eligible_country_ref_details = CountrySerializer(
        source="eligible_country_refs",
        many=True,
        read_only=True,
    )
    eligible_region_ref_details = RegionSerializer(
        source="eligible_region_refs",
        many=True,
        read_only=True,
    )
    study_field_ref_details = StudyFieldSerializer(
        source="study_field_refs",
        many=True,
        read_only=True,
    )
    pathway_detail = OpportunityPathwaySerializer(source="pathway", read_only=True)

    class Meta:
        model = Opportunity
        fields = (
            "id",
            "title",
            "slug",
            "opportunity_type",
            "status",
            "featured",
            "verified_status",
            "pathway_detail",
            "application_track",
            "department_name",
            "lab_name",
            "professor_name",
            "provider_name",
            "organization_type",
            "university_name",
            "company_name",
            "country",
            "city",
            "location_type",
            "short_description",
            "funding_type",
            "funding_amount",
            "funding_currency",
            "stipend_summary",
            "degree_levels",
            "fields_of_study",
            "eligible_countries",
            "target_regions",
            "study_field_ref_details",
            "eligible_region_ref_details",
            "eligible_country_ref_details",
            "country_ref_detail",
            "deadline",
            "is_rolling_deadline",
            "application_fee_required",
            "hec_required",
            "ielts_required",
            "english_proficiency_certificate_accepted",
            "required_skills",
            "employment_type",
            "experience_level",
            "tags",
            "is_expired",
            "days_until_deadline",
            "published_at",
            "updated_at",
        )


class OpportunityDetailSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    days_until_deadline = serializers.IntegerField(read_only=True)
    country = serializers.CharField(read_only=True)
    eligible_countries = serializers.ListField(read_only=True)
    fields_of_study = serializers.ListField(read_only=True)
    target_regions = serializers.ListField(read_only=True)
    country_ref_detail = CountrySerializer(source="country_ref", read_only=True)
    eligible_country_ref_details = CountrySerializer(
        source="eligible_country_refs",
        many=True,
        read_only=True,
    )
    eligible_region_ref_details = RegionSerializer(
        source="eligible_region_refs",
        many=True,
        read_only=True,
    )
    study_field_ref_details = StudyFieldSerializer(
        source="study_field_refs",
        many=True,
        read_only=True,
    )
    pathway_detail = OpportunityPathwaySerializer(source="pathway", read_only=True)
    is_saved = serializers.SerializerMethodField()
    saved_opportunity_id = serializers.SerializerMethodField()
    is_tracking = serializers.SerializerMethodField()
    application_id = serializers.SerializerMethodField()
    social_image = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = OpportunityListSerializer.Meta.fields + (
            "verification_note",
            "last_verified_at",
            "description",
            "benefits",
            "eligibility",
            "how_to_apply",
            "official_link",
            "source_url",
            "source_name",
            "gender_eligibility",
            "min_cgpa",
            "min_percentage",
            "min_education_level",
            "funding_amount",
            "funding_currency",
            "application_fee_amount",
            "application_fee_currency",
            "toefl_required",
            "duolingo_required",
            "hsk_required",
            "min_experience_years",
            "salary_min",
            "salary_max",
            "salary_currency",
            "application_open_date",
            "application_method",
            "required_documents",
            "is_saved",
            "saved_opportunity_id",
            "is_tracking",
            "application_id",
            "social_image",
            "deadline_last_checked_at",
            "deadline_check_status",
            "deadline_check_confidence",
            "deadline_check_note",
            "deadline_check_source_url",
            "deadline_check_evidence",
            "deadline_previous_value",
            "deadline_updated_from_source_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "is_expired",
            "days_until_deadline",
            "is_saved",
            "saved_opportunity_id",
            "is_tracking",
            "application_id",
            "social_image",
            "deadline_last_checked_at",
            "deadline_check_status",
            "deadline_check_confidence",
            "deadline_check_note",
            "deadline_check_source_url",
            "deadline_check_evidence",
            "deadline_previous_value",
            "deadline_updated_from_source_at",
            "created_at",
            "updated_at",
        )

    def get_social_image(self, obj):
        plan = obj.social_post_plans.filter(platform="facebook").order_by("-updated_at").first()
        if not plan:
            return None

        return {
            "image_url": get_preferred_social_image_url(plan, request=self.context.get("request")),
            "image_source": get_preferred_social_image_source(plan),
            "image_status": plan.social_image_status,
            "image_error": plan.social_image_error,
            "image_is_stale": plan.social_image_is_stale,
            "image_prompt": plan.image_prompt,
            "post_text": plan.post_text,
            "link_url": plan.link_url,
            "plan_status": plan.status,
            "next_post_at": plan.next_post_at,
            "priority_score": plan.priority_score,
            "priority_reason": plan.priority_reason,
            "auto_social_decision": plan.auto_social_decision,
            "saved_at": plan.social_image_saved_at,
        }

    def _student_user(self):
        request = self.context.get("request")

        if not request or not request.user or not request.user.is_authenticated:
            return None

        if getattr(request.user, "role", None) != "student":
            return None

        return request.user

    def get_saved_opportunity_id(self, obj):
        user = self._student_user()

        if not user:
            return None

        saved = SavedOpportunity.objects.filter(user=user, opportunity=obj).only("id").first()
        return saved.id if saved else None

    def get_is_saved(self, obj):
        return self.get_saved_opportunity_id(obj) is not None

    def get_application_id(self, obj):
        user = self._student_user()

        if not user:
            return None

        application = (
            OpportunityApplication.objects.filter(user=user, opportunity=obj).only("id").first()
        )
        return application.id if application else None

    def get_is_tracking(self, obj):
        return self.get_application_id(obj) is not None


class PublicOpportunityCollectionItemSerializer(serializers.Serializer):
    position = serializers.IntegerField()
    reason = serializers.CharField()
    opportunity = serializers.SerializerMethodField()

    def get_opportunity(self, obj):
        opportunity = obj.opportunity
        return {
            "id": opportunity.pk,
            "title": opportunity.title,
            "slug": opportunity.slug,
            "country": opportunity.country,
            "provider_name": opportunity.provider_name,
            "university_name": opportunity.university_name,
            "company_name": opportunity.company_name,
            "degree_levels": opportunity.degree_levels,
            "funding_type": opportunity.funding_type,
            "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
            "is_rolling_deadline": opportunity.is_rolling_deadline,
            "days_until_deadline": opportunity.days_until_deadline,
            "summary": opportunity.short_description,
            "official_link": opportunity.official_link,
            "source_url": opportunity.source_url,
            "application_url": opportunity.official_link or opportunity.source_url,
        }


class PublicOpportunityCollectionSerializer(serializers.ModelSerializer):
    items = PublicOpportunityCollectionItemSerializer(many=True, read_only=True)

    class Meta:
        model = OpportunityCollection
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "intro_text",
            "collection_type",
            "country",
            "degree_level",
            "funding_type",
            "field_label",
            "deadline_start",
            "deadline_end",
            "priority_score",
            "items",
        )


class OpportunityAdminSerializer(serializers.ModelSerializer):
    pathway_id = serializers.PrimaryKeyRelatedField(
        source="pathway",
        queryset=OpportunityPathway.objects.filter(is_active=True),
        allow_null=True,
        required=False,
        write_only=True,
    )
    pathway_detail = OpportunityPathwaySerializer(source="pathway", read_only=True)

    def clean_text_list(self, value, field_name):
        if value in (None, ""):
            return []

        if not isinstance(value, list):
            raise serializers.ValidationError({field_name: "Must be a list."})

        cleaned = []
        seen = set()

        for item in value:
            if not isinstance(item, str):
                raise serializers.ValidationError({field_name: "Must be a list of strings."})

            item = item.strip()

            if not item:
                continue

            key = item.casefold()

            if key not in seen:
                cleaned.append(item)
                seen.add(key)

        return cleaned

    def clean_text_value(self, value, field_name):
        if value in (None, ""):
            return ""

        if not isinstance(value, str):
            raise serializers.ValidationError({field_name: "Must be a string."})

        return value.strip()

    def resolve_country_name(self, name, field_name):
        if not name:
            return None

        country = Country.objects.filter(is_active=True, name__iexact=name).first()

        if not country:
            raise serializers.ValidationError({field_name: f'Unknown country "{name}".'})

        return country

    def resolve_region_name(self, name, field_name):
        region = Region.objects.filter(is_active=True, name__iexact=name).first()

        if not region:
            raise serializers.ValidationError({field_name: f'Unknown region "{name}".'})

        return region

    def resolve_study_field_name(self, name, field_name):
        study_field = StudyField.objects.filter(
            is_active=True,
            name__iexact=name,
        ).first()

        if not study_field:
            raise serializers.ValidationError({field_name: f'Unknown study field "{name}".'})

        return study_field

    def resolve_reference_names(self, names, resolver, field_name):
        resolved = []
        errors = []

        for name in names:
            try:
                resolved.append(resolver(name, field_name))
            except serializers.ValidationError as error:
                errors.append(error.detail[field_name])

        if errors:
            raise serializers.ValidationError({field_name: errors})

        return resolved

    def extract_legacy_references(self, data):
        references = {}
        errors = {}

        if "country" in data:
            try:
                country_name = self.clean_text_value(data.pop("country"), "country")
                references["country_ref"] = self.resolve_country_name(
                    country_name,
                    "country",
                )
            except serializers.ValidationError as error:
                errors.update(error.detail)

        if "eligible_countries" in data:
            try:
                country_names = self.clean_text_list(
                    data.pop("eligible_countries"),
                    "eligible_countries",
                )
                references["eligible_country_refs"] = self.resolve_reference_names(
                    country_names,
                    self.resolve_country_name,
                    "eligible_countries",
                )
            except serializers.ValidationError as error:
                errors.update(error.detail)

        if "target_regions" in data:
            try:
                region_names = self.clean_text_list(
                    data.pop("target_regions"),
                    "target_regions",
                )
                references["eligible_region_refs"] = self.resolve_reference_names(
                    region_names,
                    self.resolve_region_name,
                    "target_regions",
                )
            except serializers.ValidationError as error:
                errors.update(error.detail)

        if "fields_of_study" in data:
            try:
                field_names = self.clean_text_list(
                    data.pop("fields_of_study"),
                    "fields_of_study",
                )
                normalized_names = {name.casefold() for name in field_names}

                if normalized_names & ALL_STUDY_FIELD_MARKERS:
                    references["all_study_fields"] = True
                    references["study_field_refs"] = []
                else:
                    references["all_study_fields"] = False
                    references["study_field_refs"] = self.resolve_reference_names(
                        field_names,
                        self.resolve_study_field_name,
                        "fields_of_study",
                    )
            except serializers.ValidationError as error:
                errors.update(error.detail)

        if errors:
            raise serializers.ValidationError(errors)

        return references

    def to_internal_value(self, data):
        data = data.copy()
        legacy_references = self.extract_legacy_references(data)
        internal_value = super().to_internal_value(data)
        internal_value.update(legacy_references)

        return internal_value

    is_expired = serializers.BooleanField(read_only=True)
    days_until_deadline = serializers.IntegerField(read_only=True)

    class Meta:
        model = Opportunity
        fields = "__all__"
        read_only_fields = (
            "id",
            "is_expired",
            "days_until_deadline",
            "created_at",
            "updated_at",
        )

    def validate_list_field(self, attrs, field_name):
        value = attrs.get(field_name)
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError({field_name: "Must be a list."})

    def validate_non_negative(self, attrs, field_name):
        value = attrs.get(field_name)
        if value is not None and value < 0:
            raise serializers.ValidationError({field_name: "Cannot be negative."})

    def validate(self, attrs):
        for field_name in [
            "eligible_countries",
            "degree_levels",
            "fields_of_study",
            "target_regions",
            "required_skills",
            "required_documents",
            "tags",
        ]:
            self.validate_list_field(attrs, field_name)

        for field_name in [
            "min_cgpa",
            "funding_amount",
            "application_fee_amount",
            "min_experience_years",
            "salary_min",
            "salary_max",
        ]:
            self.validate_non_negative(attrs, field_name)

        min_percentage = attrs.get("min_percentage")
        if min_percentage is not None and not (0 <= min_percentage <= 100):
            raise serializers.ValidationError({"min_percentage": "Must be between 0 and 100."})

        salary_min = attrs.get(
            "salary_min",
            getattr(self.instance, "salary_min", None),
        )
        salary_max = attrs.get(
            "salary_max",
            getattr(self.instance, "salary_max", None),
        )
        if salary_min is not None and salary_max is not None and salary_min > salary_max:
            raise serializers.ValidationError(
                {"salary_min": "Minimum salary cannot exceed maximum salary."}
            )

        slug = attrs.get("slug")
        title = attrs.get("title", getattr(self.instance, "title", ""))
        if slug == "" and title:
            attrs["slug"] = slugify(title)

        return attrs


class RecommendedOpportunitySerializer(serializers.Serializer):
    opportunity = OpportunityListSerializer(read_only=True)
    match = serializers.DictField(read_only=True)


class OpportunityDraftSerializer(serializers.ModelSerializer):
    created_opportunity_detail = OpportunityListSerializer(source="created_opportunity", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    social_image = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityDraft
        fields = (
            "id",
            "title",
            "slug",
            "raw_payload",
            "status",
            "source_url",
            "source_name",
            "confidence",
            "validation_warnings",
            "validation_errors",
            "created_opportunity",
            "created_opportunity_detail",
            "created_by",
            "created_by_email",
            "social_image",
            "imported_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "source_url",
            "source_name",
            "confidence",
            "validation_warnings",
            "validation_errors",
            "created_opportunity",
            "created_opportunity_detail",
            "created_by",
            "created_by_email",
            "social_image",
            "imported_at",
            "created_at",
            "updated_at",
        )

    def get_social_image(self, obj):
        social_draft = obj.social_drafts.order_by("-updated_at").first()
        if not social_draft:
            return None

        return {
            "image_url": get_preferred_social_image_url(
                social_draft,
                request=self.context.get("request"),
            ),
            "image_source": get_preferred_social_image_source(social_draft),
            "image_status": social_draft.social_image_status,
            "image_error": social_draft.social_image_error,
            "image_prompt": social_draft.facebook_image_prompt,
            "post_text": social_draft.facebook_post_text,
            "link_url": "",
            "plan_status": social_draft.status,
            "next_post_at": None,
            "saved_at": social_draft.social_image_saved_at,
        }


class OpportunityCommentReplySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.CharField(source="user.role", read_only=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityComment
        fields = (
            "id",
            "user",
            "user_name",
            "user_role",
            "body",
            "is_deleted",
            "can_delete",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "user_name",
            "user_role",
            "is_deleted",
            "can_delete",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj):
        if obj.is_deleted and not obj.body:
            return "Deleted user"

        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email

    def get_can_delete(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False

        return (
            obj.user_id == request.user.id
            or request.user.role == "admin"
            or request.user.is_staff
            or request.user.is_superuser
        )


class OpportunityCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_role = serializers.CharField(source="user.role", read_only=True)
    replies = OpportunityCommentReplySerializer(many=True, read_only=True)
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityComment
        fields = (
            "id",
            "user",
            "user_name",
            "user_role",
            "body",
            "is_deleted",
            "replies",
            "can_delete",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "user",
            "user_name",
            "user_role",
            "is_deleted",
            "replies",
            "can_delete",
            "created_at",
            "updated_at",
        )

    def get_user_name(self, obj):
        if obj.is_deleted and not obj.body:
            return "Deleted user"

        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email

    def get_can_delete(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False

        return (
            obj.user_id == request.user.id
            or request.user.role == "admin"
            or request.user.is_staff
            or request.user.is_superuser
        )


class AdminOpportunityCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    opportunity_title = serializers.CharField(source="opportunity.title", read_only=True)
    opportunity_slug = serializers.CharField(source="opportunity.slug", read_only=True)
    opportunity_status = serializers.CharField(source="opportunity.status", read_only=True)
    parent_id = serializers.IntegerField(read_only=True)
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = OpportunityComment
        fields = (
            "id",
            "opportunity",
            "opportunity_title",
            "opportunity_slug",
            "opportunity_status",
            "parent",
            "parent_id",
            "user",
            "user_name",
            "user_email",
            "user_role",
            "body",
            "moderation_status",
            "is_deleted",
            "replies_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_user_name(self, obj):
        if obj.is_deleted and not obj.body:
            return "Deleted user"

        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email

    def get_replies_count(self, obj):
        if hasattr(obj, "moderation_replies_count"):
            return obj.moderation_replies_count

        return obj.replies.count()


class OpportunityCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpportunityComment
        fields = ("body",)

    def validate_body(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Comment cannot be empty.")

        if len(value) > 2000:
            raise serializers.ValidationError("Comment is too long.")

        return value
