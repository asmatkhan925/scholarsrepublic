from datetime import date
from decimal import Decimal
import re
from urllib.parse import urlparse

from rest_framework import serializers

from apps.profiles.models import StudentProfile
from apps.reference_data.models import Country, StudyField


PHONE_PATTERN = re.compile(r"[^0-9+()\-\s]")
HSK_LEVELS = {f"HSK {index}" for index in range(1, 7)}
URL_FIELDS = ("linkedin_url", "portfolio_url", "github_url")
PHONE_FIELDS = ("phone_number", "whatsapp_number")
LIST_FIELDS = (
    "target_countries",
    "target_fields",
    "additional_documents",
    "research_interests",
    "skills",
    "special_scholarship_categories",
)


def sanitize_phone_number(value):
    if value in (None, ""):
        return ""

    cleaned = PHONE_PATTERN.sub("", str(value).strip())
    return re.sub(r"(?!^)\+", "", cleaned)


def normalize_url(value):
    if value in (None, ""):
        return ""

    value = str(value).strip()

    if not value:
        return ""

    if not re.match(r"^https?://", value, flags=re.IGNORECASE):
        value = f"https://{value}"

    return value


def normalize_hsk_level(value):
    if value in (None, ""):
        return ""

    compact = str(value).strip().upper().replace(" ", "")

    for index in range(1, 7):
        if compact == f"HSK{index}":
            return f"HSK {index}"

    return str(value).strip()


def clean_text_list(value):
    if value is None:
        return []

    if not isinstance(value, list):
        raise serializers.ValidationError("Must be a list.")

    cleaned = []
    seen = set()

    for item in value:
        if not isinstance(item, str):
            raise serializers.ValidationError("All items must be text.")

        item = item.strip()

        if not item:
            continue

        key = item.casefold()

        if key not in seen:
            cleaned.append(item)
            seen.add(key)

    return cleaned


class StudentProfileSerializer(serializers.ModelSerializer):
    nationality = serializers.CharField(required=False, allow_blank=True)
    current_country = serializers.CharField(required=False, allow_blank=True)
    current_field_of_study = serializers.CharField(required=False, allow_blank=True)
    target_countries = serializers.ListField(
        child=serializers.CharField(allow_blank=True, trim_whitespace=True),
        required=False,
    )
    target_fields = serializers.ListField(
        child=serializers.CharField(allow_blank=True, trim_whitespace=True),
        required=False,
    )
    supervisor_country = serializers.CharField(required=False, allow_blank=True)

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
            "profile_source",
            "created_at",
            "updated_at",
        )

    def to_internal_value(self, data):
        data = data.copy()
        data.pop("profile_source", None)

        for field_name in PHONE_FIELDS:
            if field_name in data:
                data[field_name] = sanitize_phone_number(data.get(field_name))

        for field_name in URL_FIELDS:
            if field_name in data:
                data[field_name] = normalize_url(data.get(field_name))

        if "hsk_level" in data:
            data["hsk_level"] = normalize_hsk_level(data.get("hsk_level"))

        return super().to_internal_value(data)

    def resolve_country(self, value, field_name, allow_custom=False):
        value = str(value or "").strip()

        if not value:
            return None, ""

        country = Country.objects.filter(is_active=True, name__iexact=value).first()

        if country:
            return country, ""

        if allow_custom:
            return None, value

        raise serializers.ValidationError({field_name: f"Unknown country: {value}."})

    def resolve_study_field(self, value):
        value = str(value or "").strip()

        if not value:
            return None, ""

        study_field = StudyField.objects.filter(is_active=True, name__iexact=value).first()

        if study_field:
            return study_field, ""

        return None, value

    def extract_reference_payload(self, validated_data):
        reference_payload = {}

        for field_name in [
            "nationality",
            "current_country",
            "current_field_of_study",
            "target_countries",
            "target_fields",
            "supervisor_country",
        ]:
            if field_name in validated_data:
                reference_payload[field_name] = validated_data.pop(field_name)

        return reference_payload

    def apply_reference_payload(self, instance, reference_payload):
        if "nationality" in reference_payload:
            country, _ = self.resolve_country(
                reference_payload.get("nationality") or "Pakistan",
                "nationality",
            )
            instance.nationality_country = country

        if "current_country" in reference_payload:
            country, _ = self.resolve_country(
                reference_payload.get("current_country") or "Pakistan",
                "current_country",
            )
            instance.current_country_ref = country

        if "current_field_of_study" in reference_payload:
            study_field, custom = self.resolve_study_field(
                reference_payload.get("current_field_of_study")
            )
            instance.current_study_field_ref = study_field
            instance.custom_current_study_field = custom

        if "supervisor_country" in reference_payload:
            country, custom = self.resolve_country(
                reference_payload.get("supervisor_country"),
                "supervisor_country",
                allow_custom=True,
            )
            instance.supervisor_country_ref = country
            instance.custom_supervisor_country = custom

        instance.save()

        if "target_countries" in reference_payload:
            countries = []
            for country_name in clean_text_list(reference_payload.get("target_countries")):
                country, _ = self.resolve_country(country_name, "target_countries")
                if country:
                    countries.append(country)

            instance.target_country_refs.set(countries)

        if "target_fields" in reference_payload:
            study_fields = []
            custom_fields = []

            for field_name in clean_text_list(reference_payload.get("target_fields")):
                study_field, custom = self.resolve_study_field(field_name)

                if study_field:
                    study_fields.append(study_field)
                elif custom:
                    custom_fields.append(custom)

            instance.target_study_field_refs.set(study_fields)
            instance.custom_target_study_fields = custom_fields
            instance.save(update_fields=["custom_target_study_fields", "updated_at"])

    def create(self, validated_data):
        reference_payload = self.extract_reference_payload(validated_data)

        reference_payload.setdefault("nationality", "Pakistan")
        reference_payload.setdefault("current_country", "Pakistan")

        profile = StudentProfile.objects.create(**validated_data)
        self.apply_reference_payload(profile, reference_payload)
        return profile

    def update(self, instance, validated_data):
        reference_payload = self.extract_reference_payload(validated_data)

        for field_name, value in validated_data.items():
            setattr(instance, field_name, value)

        instance.save()
        self.apply_reference_payload(instance, reference_payload)
        return instance

    def validate_list_field(self, attrs, field_name, max_items=50, max_length=100):
        if field_name not in attrs:
            return

        try:
            value = clean_text_list(attrs.get(field_name))
        except serializers.ValidationError as error:
            raise serializers.ValidationError({field_name: error.detail}) from error

        if len(value) > max_items:
            raise serializers.ValidationError({field_name: f"Cannot contain more than {max_items} items."})

        for item in value:
            if len(item) > max_length:
                raise serializers.ValidationError(
                    {field_name: f"Each item must be {max_length} characters or less."}
                )

        attrs[field_name] = value

    def validate_range(self, attrs, field_name, minimum, maximum):
        value = attrs.get(field_name)

        if value is None:
            return

        if value < minimum or value > maximum:
            raise serializers.ValidationError(
                {field_name: f"Must be between {minimum} and {maximum}."}
            )

    def validate_phone(self, attrs, field_name, label):
        value = attrs.get(field_name)

        if not value:
            return

        digit_count = len(re.sub(r"\D", "", value))

        if digit_count < 7 or digit_count > 15:
            raise serializers.ValidationError({field_name: f"{label} should contain 7 to 15 digits."})

    def validate_url_field(self, attrs, field_name):
        value = attrs.get(field_name)

        if not value:
            return

        parsed = urlparse(value)

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise serializers.ValidationError(
                {field_name: "Enter a valid URL, for example https://example.com."}
            )

    def current_value(self, attrs, field_name):
        if field_name in attrs:
            return attrs[field_name]

        if self.instance is not None:
            return getattr(self.instance, field_name)

        return None

    def validate(self, attrs):
        for field_name in LIST_FIELDS:
            self.validate_list_field(attrs, field_name)

        self.validate_phone(attrs, "phone_number", "Phone number")
        self.validate_phone(attrs, "whatsapp_number", "WhatsApp number")

        for field_name in URL_FIELDS:
            self.validate_url_field(attrs, field_name)

        for field_name, minimum, maximum in [
            ("ielts_score", Decimal("0"), Decimal("9")),
            ("toefl_score", 0, 120),
            ("duolingo_score", 0, 160),
            ("pte_score", 0, 90),
            ("gre_score", 0, 340),
            ("gmat_score", 0, 800),
            ("percentage", Decimal("0"), Decimal("100")),
            ("recommendation_letters_count", 0, 20),
            ("publications_count", 0, 500),
            ("work_experience_years", Decimal("0"), Decimal("60")),
            ("max_application_fee_usd", 0, 10000),
        ]:
            self.validate_range(attrs, field_name, minimum, maximum)

        cgpa = attrs.get("cgpa")
        grading_system = attrs.get("grading_system") or getattr(self.instance, "grading_system", "")

        if cgpa is not None:
            if cgpa < 0:
                raise serializers.ValidationError({"cgpa": "Cannot be negative."})

            if grading_system == StudentProfile.GradingSystem.CGPA_4 and cgpa > 4:
                raise serializers.ValidationError({"cgpa": "CGPA cannot exceed 4."})

            if grading_system == StudentProfile.GradingSystem.CGPA_5 and cgpa > 5:
                raise serializers.ValidationError({"cgpa": "CGPA cannot exceed 5."})

            if grading_system not in {
                StudentProfile.GradingSystem.CGPA_4,
                StudentProfile.GradingSystem.CGPA_5,
            } and cgpa > 5:
                raise serializers.ValidationError({"cgpa": "CGPA cannot exceed 5."})

        graduation_year = attrs.get("graduation_year")
        if graduation_year is not None and not (1900 <= graduation_year <= 2100):
            raise serializers.ValidationError({"graduation_year": "Must be between 1900 and 2100."})

        hsk_level = attrs.get("hsk_level")
        if hsk_level and hsk_level not in HSK_LEVELS:
            raise serializers.ValidationError({"hsk_level": "Must be HSK 1 to HSK 6 or blank."})

        date_of_birth = attrs.get("date_of_birth")
        if date_of_birth and date_of_birth > date.today():
            raise serializers.ValidationError({"date_of_birth": "Date of birth cannot be in the future."})

        has_passport = self.current_value(attrs, "has_passport")
        passport_expiry_date = self.current_value(attrs, "passport_expiry_date")

        if has_passport and passport_expiry_date and passport_expiry_date < date.today():
            raise serializers.ValidationError(
                {"passport_expiry_date": "Passport expiry date must be today or a future date."}
            )

        return attrs
