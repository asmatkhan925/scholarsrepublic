from django.utils.text import slugify
from rest_framework import serializers

from apps.applications.models import OpportunityApplication, SavedOpportunity

from apps.opportunities.models import Opportunity, OpportunityComment


class OpportunityListSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    days_until_deadline = serializers.IntegerField(read_only=True)

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
            "provider_name",
            "organization_type",
            "university_name",
            "company_name",
            "country",
            "city",
            "location_type",
            "short_description",
            "funding_type",
            "degree_levels",
            "fields_of_study",
            "eligible_countries",
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
    is_saved = serializers.SerializerMethodField()
    saved_opportunity_id = serializers.SerializerMethodField()
    is_tracking = serializers.SerializerMethodField()
    application_id = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = "__all__"
        read_only_fields = (
            "id",
            "is_expired",
            "days_until_deadline",
            "is_saved",
            "saved_opportunity_id",
            "is_tracking",
            "application_id",
            "created_at",
            "updated_at",
        )

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

        saved = (
            SavedOpportunity.objects.filter(user=user, opportunity=obj)
            .only("id")
            .first()
        )
        return saved.id if saved else None

    def get_is_saved(self, obj):
        return self.get_saved_opportunity_id(obj) is not None

    def get_application_id(self, obj):
        user = self._student_user()
        if not user:
            return None

        application = (
            OpportunityApplication.objects.filter(user=user, opportunity=obj)
            .only("id")
            .first()
        )
        return application.id if application else None

    def get_is_tracking(self, obj):
        return self.get_application_id(obj) is not None


class OpportunityAdminSerializer(serializers.ModelSerializer):
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
        if obj.is_deleted:
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
        if obj.is_deleted:
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
