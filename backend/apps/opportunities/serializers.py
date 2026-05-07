from django.utils.text import slugify
from rest_framework import serializers

from apps.opportunities.models import Opportunity


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
