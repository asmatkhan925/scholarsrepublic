from decimal import Decimal

from rest_framework import serializers

from apps.profiles.models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    completion_percentage = serializers.IntegerField(read_only=True)
    scholarship_readiness_score = serializers.IntegerField(read_only=True)
    readiness_level = serializers.CharField(read_only=True)
    missing_profile_fields = serializers.ListField(read_only=True)
    missing_core_documents = serializers.ListField(read_only=True)

    class Meta:
        model = StudentProfile
        fields = "__all__"
        read_only_fields = (
            "id",
            "user",
            "completion_percentage",
            "scholarship_readiness_score",
            "readiness_level",
            "missing_profile_fields",
            "missing_core_documents",
            "created_at",
            "updated_at",
        )

    def validate_list_field(self, attrs, field_name):
        value = attrs.get(field_name)
        if value is not None and not isinstance(value, list):
            raise serializers.ValidationError({field_name: "Must be a list."})

    def validate_range(self, attrs, field_name, minimum, maximum):
        value = attrs.get(field_name)
        if value is not None and not (minimum <= value <= maximum):
            raise serializers.ValidationError(
                {field_name: f"Must be between {minimum} and {maximum}."}
            )

    def validate(self, attrs):
        for field_name in [
            "target_countries",
            "target_fields",
            "additional_documents",
            "research_interests",
            "skills",
            "special_scholarship_categories",
        ]:
            self.validate_list_field(attrs, field_name)

        for field_name, minimum, maximum in [
            ("ielts_score", Decimal("0"), Decimal("9")),
            ("toefl_score", 0, 120),
            ("duolingo_score", 0, 160),
            ("pte_score", 0, 90),
            ("gre_score", 0, 340),
            ("gmat_score", 0, 800),
            ("percentage", Decimal("0"), Decimal("100")),
        ]:
            self.validate_range(attrs, field_name, minimum, maximum)

        cgpa = attrs.get("cgpa")
        grading_system = attrs.get("grading_system") or getattr(
            self.instance, "grading_system", ""
        )
        if cgpa is not None:
            if cgpa < 0:
                raise serializers.ValidationError({"cgpa": "Cannot be negative."})
            if grading_system == StudentProfile.GradingSystem.CGPA_4 and cgpa > 4:
                raise serializers.ValidationError({"cgpa": "CGPA cannot exceed 4."})
            if grading_system == StudentProfile.GradingSystem.CGPA_5 and cgpa > 5:
                raise serializers.ValidationError({"cgpa": "CGPA cannot exceed 5."})

        graduation_year = attrs.get("graduation_year")
        if graduation_year is not None and not (1970 <= graduation_year <= 2100):
            raise serializers.ValidationError(
                {"graduation_year": "Must be between 1970 and 2100."}
            )

        hsk_level = attrs.get("hsk_level")
        if hsk_level and hsk_level not in [f"HSK{i}" for i in range(1, 7)]:
            raise serializers.ValidationError(
                {"hsk_level": "Must be HSK1 to HSK6 or blank."}
            )

        for field_name in [
            "recommendation_letters_count",
            "publications_count",
            "work_experience_years",
        ]:
            value = attrs.get(field_name)
            if value is not None and value < 0:
                raise serializers.ValidationError(
                    {field_name: "Cannot be negative."}
                )

        return attrs
