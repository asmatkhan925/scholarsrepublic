import re
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.opportunities.models import Opportunity, OpportunityDraft, OpportunityPathway
from apps.opportunities.services.duplicate_detector import find_duplicate_opportunities
from apps.opportunities.services.social_posting import promote_social_draft_to_plan
from apps.reference_data.models import Country, Region, StudyField, StudyFieldCategory

ALL_STUDY_FIELD_MARKERS = {
    "all fields",
    "all",
    "any",
    "any discipline",
    "all programmes",
    "all programs",
}
UNSAFE_COUNTRY_VALUES = {
    "all countries",
    "any country",
    "international students",
    "international applicants",
    "worldwide",
}
UNSAFE_STUDY_FIELD_VALUES = {
    "all fields",
    "all",
    "any",
    "any discipline",
    "all programmes",
    "all programs",
}
DEFAULT_REGION_NAME = "Other"
DEFAULT_STUDY_FIELD_CATEGORY_NAME = "Other"
AMOUNT_TEXT_RE = re.compile(
    r"(\$|€|£|USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD)\s?\d|"
    r"\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|PKR|CNY|TRY|CAD|AUD|€|£|\$)",
    re.IGNORECASE,
)

CHOICE_ALIASES = {
    "funding_type": {
        "full_funding": Opportunity.FundingType.FULLY_FUNDED,
        "fully_funded": Opportunity.FundingType.FULLY_FUNDED,
        "fully-funded": Opportunity.FundingType.FULLY_FUNDED,
        "fully funded": Opportunity.FundingType.FULLY_FUNDED,
        "full scholarship": Opportunity.FundingType.FULLY_FUNDED,
        "partial_funding": Opportunity.FundingType.PARTIALLY_FUNDED,
        "partial-funded": Opportunity.FundingType.PARTIALLY_FUNDED,
        "partial funded": Opportunity.FundingType.PARTIALLY_FUNDED,
        "partial": Opportunity.FundingType.PARTIALLY_FUNDED,
        "partially funded": Opportunity.FundingType.PARTIALLY_FUNDED,
        "partially_funded": Opportunity.FundingType.PARTIALLY_FUNDED,
        "tuition waiver": Opportunity.FundingType.TUITION_WAIVER,
        "tuition_waiver": Opportunity.FundingType.TUITION_WAIVER,
        "stipend": Opportunity.FundingType.STIPEND_ONLY,
        "stipend_only": Opportunity.FundingType.STIPEND_ONLY,
        "need based": Opportunity.FundingType.NEED_BASED,
        "need_based": Opportunity.FundingType.NEED_BASED,
        "merit based": Opportunity.FundingType.MERIT_BASED,
        "merit_based": Opportunity.FundingType.MERIT_BASED,
        "self funded": Opportunity.FundingType.SELF_FUNDED,
        "self_funded": Opportunity.FundingType.SELF_FUNDED,
    },
}

COUNTRY_ALIASES = {
    "united_states": ("United States", "United States of America", "USA", "US"),
    "united_states_of_america": ("United States of America", "United States", "USA", "US"),
    "usa": ("United States of America", "United States", "USA", "US"),
    "us": ("United States of America", "United States", "USA", "US"),
    "u_s": ("United States of America", "United States", "USA", "US"),
    "u_s_a": ("United States of America", "United States", "USA", "US"),
    "uk": ("United Kingdom", "UK", "Great Britain", "Britain"),
    "u_k": ("United Kingdom", "UK", "Great Britain", "Britain"),
}

STUDY_FIELD_ALIASES = {
    "engineering": (
        "Engineering",
        "Engineering & Technology",
        "Engineering and Technology",
        "Engineering, Manufacturing and Construction",
    ),
    "engineering_and_technology": (
        "Engineering & Technology",
        "Engineering and Technology",
        "Engineering",
    ),
    "computer_science": (
        "Computer Science",
        "Computer Science & IT",
        "Computer Science and IT",
        "Information Technology",
    ),
    "business": (
        "Business",
        "Business & Management",
        "Business and Management",
        "Management",
    ),
}
REQUIRED_TEXT_FIELDS = (
    "title",
    "country",
    "short_description",
    "description",
    "eligibility",
    "benefits",
    "how_to_apply",
)


def validate_opportunity_draft_payload(payload):
    warnings = []
    errors = []

    if not isinstance(payload, dict):
        return {}, warnings, ["Payload must be a JSON object."]

    opportunity_payload = payload.get("opportunity")
    if not isinstance(opportunity_payload, dict):
        return {}, warnings, ['Payload must contain an "opportunity" object.']

    create_missing_references = parse_bool_flag(payload.get("create_missing_references"), True)
    cleaned = {
        "confidence": clean_text(payload.get("confidence")),
        "create_missing_references": create_missing_references,
        "pending_reference_creations": [],
        "opportunity": {},
        "eligible_countries": [],
        "study_fields": [],
        "all_study_fields": False,
        "pathway": None,
    }
    opportunity = cleaned["opportunity"]

    for field_name in REQUIRED_TEXT_FIELDS:
        value = clean_text(opportunity_payload.get(field_name))
        opportunity[field_name] = value

        if not value:
            errors.append(f"Missing required opportunity field: {field_name}.")

    source_url = clean_text(opportunity_payload.get("source_url"))
    source_name = clean_text(opportunity_payload.get("source_name"))
    official_link = clean_text(opportunity_payload.get("official_link"))

    opportunity["official_link"] = official_link
    opportunity["source_url"] = source_url
    opportunity["source_name"] = source_name

    if not official_link and not source_url:
        errors.append("Missing required opportunity field: official_link or source_url.")

    country_region = clean_text(opportunity_payload.get("country_region"))
    country = resolve_or_create_country(
        opportunity["country"],
        region_name=country_region,
        warnings=warnings,
        create_missing=create_missing_references,
        create_records=False,
    )
    cleaned["country_ref"] = country

    if opportunity["country"] and not country and not create_missing_references:
        errors.append(f'Unknown country "{opportunity["country"]}".')

    eligible_countries = []
    for country_name in clean_string_list(opportunity_payload.get("eligible_countries")):
        eligible_country = resolve_or_create_country(
            country_name,
            warnings=warnings,
            create_missing=create_missing_references,
            create_records=False,
            warning_label="eligible country",
        )

        if eligible_country:
            eligible_countries.append(eligible_country)
        elif not create_missing_references:
            warnings.append(f'Unknown eligible country "{country_name}" skipped.')

    cleaned["eligible_countries"] = dedupe_models(eligible_countries)

    fields_of_study = clean_string_list(opportunity_payload.get("fields_of_study"))
    all_study_fields = get_all_study_fields_flag(payload, opportunity_payload, fields_of_study)
    cleaned["all_study_fields"] = all_study_fields

    if all_study_fields:
        warn_ignored_study_fields_for_all_fields(fields_of_study, warnings)
        cleaned["study_fields"] = []
    else:
        study_field_categories = opportunity_payload.get("study_field_categories")
        if not isinstance(study_field_categories, dict):
            study_field_categories = {}

        cleaned["study_fields"] = resolve_study_fields_for_draft(
            fields_of_study,
            study_field_categories,
            warnings,
            create_missing=create_missing_references,
            create_records=False,
        )

        if not cleaned["study_fields"] and not create_missing_references:
            errors.append(
                "At least one known study field is required when all_study_fields is false."
            )

    pathway = resolve_or_create_pathway(
        opportunity_payload,
        country_ref=country,
        warnings=warnings,
        create_missing=create_missing_references,
        create_records=False,
    )
    cleaned["pathway"] = pathway

    application_track = clean_text(opportunity_payload.get("application_track"))
    valid_tracks = {choice[0] for choice in Opportunity.ApplicationTrack.choices}
    if application_track and application_track not in valid_tracks:
        warnings.append(f'Unknown application_track "{application_track}" changed to "other".')
        application_track = Opportunity.ApplicationTrack.OTHER
    opportunity["application_track"] = application_track

    opportunity["opportunity_type"] = clean_choice(
        opportunity_payload.get("opportunity_type"),
        Opportunity.OpportunityType.choices,
        Opportunity.OpportunityType.SCHOLARSHIP,
        "opportunity_type",
        warnings,
    )
    opportunity["funding_type"] = clean_choice(
        opportunity_payload.get("funding_type"),
        Opportunity.FundingType.choices,
        "",
        "funding_type",
        warnings,
    )
    opportunity["stipend_summary"] = clean_text(
        opportunity_payload.get("stipend_summary")
    )[: Opportunity._meta.get_field("stipend_summary").max_length]
    opportunity["funding_amount"] = clean_funding_amount(
        opportunity_payload.get("funding_amount"),
        warnings,
    )
    opportunity["funding_currency"] = clean_text(
        opportunity_payload.get("funding_currency")
    ).upper()[: Opportunity._meta.get_field("funding_currency").max_length]

    if (
        looks_like_amount_text(opportunity["stipend_summary"])
        and opportunity["funding_amount"] is None
    ):
        warnings.append(
            "Stipend amount appears to be in stipend_summary. Move the numeric amount to funding_amount and currency to funding_currency."
        )

    if opportunity["funding_amount"] is not None and not opportunity["funding_currency"]:
        warnings.append("Funding amount is provided but funding_currency is missing.")

    if opportunity["funding_currency"] and opportunity["funding_amount"] is None:
        warnings.append("Funding currency is provided but funding_amount is missing.")

    if len(opportunity["stipend_summary"]) > 120:
        warnings.append(
            "stipend_summary should be a short note only. Put full funding explanation in benefits."
        )

    opportunity["degree_levels"] = clean_string_list(opportunity_payload.get("degree_levels"))
    opportunity["required_documents"] = clean_string_list(
        opportunity_payload.get("required_documents")
    )
    opportunity["tags"] = clean_string_list(opportunity_payload.get("tags"))

    for field_name in (
        "slug",
        "provider_name",
        "university_name",
        "department_name",
        "lab_name",
        "professor_name",
    ):
        opportunity[field_name] = clean_text(opportunity_payload.get(field_name))

    is_rolling_deadline = bool(opportunity_payload.get("is_rolling_deadline"))
    opportunity["is_rolling_deadline"] = is_rolling_deadline
    deadline_value = clean_text(opportunity_payload.get("deadline"))
    opportunity["deadline"] = None

    if deadline_value:
        try:
            opportunity["deadline"] = date.fromisoformat(deadline_value)
            if (
                opportunity["deadline"] < timezone.localdate()
                and not is_rolling_deadline
            ):
                errors.append("Deadline has already passed.")
        except ValueError:
            errors.append("deadline must use YYYY-MM-DD format.")
    elif not is_rolling_deadline:
        warnings.append("Deadline is empty while is_rolling_deadline is false.")

    duplicate_matches = find_duplicate_opportunities(
        build_duplicate_candidate_data(opportunity, cleaned["pathway"])
    )
    cleaned["duplicate_matches"] = duplicate_matches
    for match in duplicate_matches[:3]:
        reasons = ", ".join(match["reasons"])
        confidence = match["confidence"]
        warnings.append(
            f'Possible duplicate ({confidence}): "{match["title"]}" ({reasons}).'
        )

    return cleaned, warnings, errors


@transaction.atomic
def import_opportunity_draft(draft, user=None, update_existing=False):
    cleaned, warnings, errors = validate_opportunity_draft_payload(draft.raw_payload)
    opportunity_data = cleaned.get("opportunity", {})
    slug = opportunity_data.get("slug") or slugify(opportunity_data.get("title", ""))[:250]

    if not slug and opportunity_data.get("title"):
        slug = slugify(opportunity_data["title"])[:250]

    existing = Opportunity.objects.filter(slug=slug).first() if slug else None
    if existing and not update_existing:
        errors.append(f'Opportunity with slug "{slug}" already exists.')

    duplicate_matches = find_duplicate_opportunities(
        build_duplicate_candidate_data(
            opportunity_data,
            cleaned.get("pathway"),
            exclude_id=existing.id if existing and update_existing else None,
        )
    )
    for match in duplicate_matches:
        if match["confidence"] == "exact" and not update_existing:
            reasons = ", ".join(match["reasons"])
            duplicate_error = (
                f'Exact duplicate found: "{match["title"]}" ({reasons}). '
                "Open the existing scholarship instead of importing a new one."
            )
            if duplicate_error not in errors:
                errors.append(duplicate_error)

    if not errors and cleaned.get("create_missing_references"):
        reference_errors = create_missing_references_for_import(
            cleaned,
            draft.raw_payload.get("opportunity", {}),
            warnings,
        )
        errors.extend(reference_errors)

    draft.confidence = cleaned.get("confidence", "")
    draft.source_url = opportunity_data.get("source_url", "")
    draft.source_name = opportunity_data.get("source_name", "")
    draft.validation_warnings = warnings
    draft.validation_errors = errors

    if errors:
        draft.status = OpportunityDraft.Status.ERROR
        if user and not draft.created_by_id:
            draft.created_by = user
        draft.save(
            update_fields=[
                "created_by",
                "confidence",
                "source_url",
                "source_name",
                "validation_warnings",
                "validation_errors",
                "status",
                "updated_at",
            ]
        )
        return None

    opportunity = existing if existing and update_existing else Opportunity()
    opportunity.title = opportunity_data["title"]
    opportunity.slug = slug
    opportunity.opportunity_type = opportunity_data["opportunity_type"]
    opportunity.status = Opportunity.Status.DRAFT
    opportunity.featured = False
    opportunity.verified_status = False
    opportunity.last_verified_at = None
    opportunity.published_at = None
    opportunity.verification_note = "Imported draft. Admin must verify before publishing."
    opportunity.country_ref = cleaned["country_ref"]
    opportunity.pathway = cleaned["pathway"]
    opportunity.application_track = opportunity_data["application_track"]
    opportunity.provider_name = opportunity_data["provider_name"]
    opportunity.university_name = opportunity_data["university_name"]
    opportunity.department_name = opportunity_data["department_name"]
    opportunity.lab_name = opportunity_data["lab_name"]
    opportunity.professor_name = opportunity_data["professor_name"]
    opportunity.short_description = opportunity_data["short_description"]
    opportunity.description = opportunity_data["description"]
    opportunity.benefits = opportunity_data["benefits"]
    opportunity.eligibility = opportunity_data["eligibility"]
    opportunity.how_to_apply = opportunity_data["how_to_apply"]
    opportunity.official_link = opportunity_data["official_link"]
    opportunity.source_url = opportunity_data["source_url"]
    opportunity.source_name = opportunity_data["source_name"]
    opportunity.deadline = opportunity_data["deadline"]
    opportunity.is_rolling_deadline = opportunity_data["is_rolling_deadline"]
    opportunity.funding_type = opportunity_data["funding_type"]
    opportunity.stipend_summary = opportunity_data["stipend_summary"]
    opportunity.funding_amount = opportunity_data["funding_amount"]
    opportunity.funding_currency = opportunity_data["funding_currency"]
    opportunity.degree_levels = opportunity_data["degree_levels"]
    opportunity.required_documents = opportunity_data["required_documents"]
    opportunity.tags = opportunity_data["tags"]
    opportunity.search_keywords = build_search_keywords(opportunity_data)
    opportunity.all_study_fields = cleaned["all_study_fields"]

    try:
        opportunity.full_clean()
        opportunity.save()
    except ValidationError as error:
        draft.status = OpportunityDraft.Status.ERROR
        draft.validation_errors = normalize_validation_error(error)
        draft.save(
            update_fields=[
                "validation_warnings",
                "validation_errors",
                "status",
                "updated_at",
            ]
        )
        return None

    opportunity.eligible_country_refs.set(cleaned["eligible_countries"])

    if cleaned["all_study_fields"]:
        opportunity.study_field_refs.clear()
    else:
        opportunity.study_field_refs.set(cleaned["study_fields"])

    draft.created_opportunity = opportunity
    draft.status = OpportunityDraft.Status.IMPORTED
    draft.imported_at = timezone.now()
    draft.validation_warnings = warnings
    draft.validation_errors = []
    if user and not draft.created_by_id:
        draft.created_by = user
    draft.save(
        update_fields=[
            "created_by",
            "confidence",
            "source_url",
            "source_name",
            "validation_warnings",
            "validation_errors",
            "created_opportunity",
            "status",
            "imported_at",
            "updated_at",
        ]
    )
    promote_social_draft_to_plan(draft)

    return opportunity


def clean_text(value):
    if value in (None, ""):
        return ""

    return str(value).strip()


def clean_string_list(value):
    if value in (None, ""):
        return []

    if not isinstance(value, list):
        return []

    cleaned = []
    seen = set()

    for item in value:
        item = clean_text(item)
        key = item.casefold()

        if item and key not in seen:
            cleaned.append(item)
            seen.add(key)

    return cleaned


def is_all_study_fields_marker(value):
    normalized = clean_text(value).casefold()
    return normalized in ALL_STUDY_FIELD_MARKERS or normalize_key(normalized) in {
        normalize_key(marker) for marker in ALL_STUDY_FIELD_MARKERS
    }


def get_all_study_fields_flag(payload, opportunity_payload, fields_of_study):
    return (
        parse_bool_flag(opportunity_payload.get("all_study_fields"), False)
        or parse_bool_flag(payload.get("all_study_fields"), False)
        or any(is_all_study_fields_marker(field) for field in fields_of_study)
    )


def warn_ignored_study_fields_for_all_fields(fields_of_study, warnings):
    ignored_fields = [
        field_name
        for field_name in fields_of_study
        if field_name and not is_all_study_fields_marker(field_name)
    ]

    if ignored_fields and warnings is not None:
        preview = ", ".join(ignored_fields[:5])
        suffix = f", and {len(ignored_fields) - 5} more" if len(ignored_fields) > 5 else ""
        warnings.append(
            "Specific fields_of_study values were ignored because all_study_fields is true: "
            f"{preview}{suffix}."
        )


def resolve_study_fields_for_draft(
    fields_of_study,
    study_field_categories,
    warnings,
    create_missing=False,
    create_records=False,
):
    study_fields = []

    for field_name in fields_of_study:
        if is_all_study_fields_marker(field_name):
            continue

        try:
            study_field = resolve_or_create_study_field(
                field_name,
                category_name=clean_text(study_field_categories.get(field_name)),
                warnings=warnings,
                create_missing=create_missing,
                create_records=create_records,
            )
        except Exception:
            if warnings is not None:
                warnings.append(
                    f'Unknown study field "{field_name}" skipped during validation.'
                )
            continue

        if study_field:
            study_fields.append(study_field)
        elif not create_missing and warnings is not None:
            warnings.append(f'Unknown study field "{field_name}" skipped.')

    return dedupe_models(study_fields)


def normalize_key(value):
    return clean_text(value).casefold().replace("-", "_").replace(" ", "_")


def parse_positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


def parse_bool_flag(value, default=False):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    return str(value).strip().casefold() in {"1", "true", "yes", "on"}


def clean_funding_amount(value, warnings):
    if value in (None, ""):
        return None

    cleaned_value = clean_text(value).replace(",", "")

    try:
        amount = Decimal(cleaned_value)
    except (InvalidOperation, ValueError):
        warnings.append(f'Invalid funding_amount "{clean_text(value)}" skipped.')
        return None

    if not amount.is_finite():
        warnings.append(f'Invalid funding_amount "{clean_text(value)}" skipped.')
        return None

    if amount < 0:
        warnings.append("Invalid funding_amount cannot be negative; skipped.")
        return None

    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def looks_like_amount_text(value):
    if not value:
        return False

    return bool(AMOUNT_TEXT_RE.search(str(value)))


def is_unsafe_reference_name(value, max_length, blocked_values):
    value = clean_text(value)
    normalized = value.casefold()

    if len(value) < 2 or len(value) > max_length:
        return True

    if "http://" in normalized or "https://" in normalized or "www." in normalized:
        return True

    if normalized in blocked_values:
        return True

    return False


def is_safe_country_name(value):
    value = clean_text(value)
    if is_unsafe_reference_name(value, 120, UNSAFE_COUNTRY_VALUES):
        return False

    return value.count(",") <= 1


def is_safe_study_field_name(value):
    value = clean_text(value)
    if is_unsafe_reference_name(value, 150, UNSAFE_STUDY_FIELD_VALUES):
        return False

    if len(value.split()) > 8 or value.endswith((".", "!", "?")):
        return False

    return True


def is_safe_pathway_title(value):
    value = clean_text(value)
    if is_unsafe_reference_name(value, 255, set()):
        return False

    return len(value.split()) <= 12 and not value.endswith((".", "!", "?"))


def get_or_create_region(name=None):
    region_name = clean_text(name) or DEFAULT_REGION_NAME
    region = Region.objects.filter(name__iexact=region_name).first()
    if region:
        return region

    slug = slugify(region_name) or "other"
    region = Region.objects.filter(slug=slug).first()
    if region:
        return region

    return Region.objects.create(
        name=region_name,
        slug=slug,
        code=slug.replace("-", "_").upper()[:40] or "OTHER",
        is_active=True,
    )


def get_or_create_study_field_category(name=None):
    category_name = clean_text(name) or DEFAULT_STUDY_FIELD_CATEGORY_NAME
    category = StudyFieldCategory.objects.filter(name__iexact=category_name).first()
    if category:
        return category

    slug = slugify(category_name) or "other"
    category = StudyFieldCategory.objects.filter(slug=slug).first()
    if category:
        return category

    return StudyFieldCategory.objects.create(name=category_name, slug=slug, is_active=True)


def resolve_or_create_country(
    name,
    region_name=None,
    warnings=None,
    create_missing=False,
    create_records=False,
    warning_label="country",
):
    country_name = clean_text(name)
    country = resolve_country(country_name)
    if country:
        return country

    if not country_name or not create_missing:
        return None

    if not is_safe_country_name(country_name):
        if warnings is not None:
            warnings.append(f'Unknown {warning_label} "{country_name}" could not be created automatically.')
        return None

    warning_prefix = "New eligible country" if warning_label == "eligible country" else "New country"

    if not create_records:
        if warnings is not None:
            warnings.append(f"{warning_prefix} will be created: {country_name}.")
        return None

    slug = slugify(country_name)
    if not slug:
        return None

    existing = Country.objects.filter(slug=slug).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.save(update_fields=["is_active", "updated_at"])
        return existing

    country = Country.objects.create(
        name=country_name,
        slug=slug,
        region=get_or_create_region(region_name),
        is_active=True,
    )
    if warnings is not None:
        created_prefix = "New eligible country" if warning_label == "eligible country" else "New country"
        warnings.append(f"{created_prefix} created: {country.name}.")
    return country


def resolve_or_create_study_field(
    name,
    category_name=None,
    warnings=None,
    create_missing=False,
    create_records=False,
):
    field_name = clean_text(name)
    study_field = resolve_study_field(field_name)
    if study_field:
        return study_field

    if not field_name or not create_missing:
        return None

    if normalize_key(field_name) in {normalize_key(value) for value in UNSAFE_STUDY_FIELD_VALUES}:
        return None

    if not is_safe_study_field_name(field_name):
        if warnings is not None:
            warnings.append(f'Unknown study field "{field_name}" could not be created automatically.')
        return None

    if not create_records:
        if warnings is not None:
            warnings.append(f"New study field will be created: {field_name}.")
        return None

    slug = slugify(field_name)
    if not slug:
        return None

    existing = StudyField.objects.filter(slug=slug).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            existing.save(update_fields=["is_active", "updated_at"])
        return existing

    study_field = StudyField.objects.create(
        name=field_name,
        slug=slug,
        category=get_or_create_study_field_category(category_name),
        is_active=True,
    )
    if warnings is not None:
        warnings.append(f"New study field created: {study_field.name}.")
    return study_field


def build_duplicate_candidate_data(opportunity_data, pathway=None, exclude_id=None):
    return {
        "title": opportunity_data.get("title"),
        "slug": opportunity_data.get("slug"),
        "official_link": opportunity_data.get("official_link"),
        "source_url": opportunity_data.get("source_url"),
        "provider_name": opportunity_data.get("provider_name"),
        "university_name": opportunity_data.get("university_name"),
        "country": opportunity_data.get("country"),
        "deadline": opportunity_data.get("deadline"),
        "degree_levels": opportunity_data.get("degree_levels"),
        "pathway_id": pathway.id if pathway else None,
        "pathway": pathway.full_path if pathway else None,
        "exclude_id": exclude_id,
    }


def clean_choice(value, choices, default, field_name, warnings):
    value = clean_text(value)

    if not value:
        return default

    valid_values = {choice[0] for choice in choices}

    if value in valid_values:
        return value

    normalized_value = normalize_key(value)
    if normalized_value in valid_values:
        return normalized_value

    aliases = CHOICE_ALIASES.get(field_name, {})
    alias_value = aliases.get(value.casefold()) or aliases.get(normalized_value)

    if alias_value in valid_values:
        return alias_value

    warnings.append(f'Unknown {field_name} "{value}" changed to default.')
    return default


def resolve_study_field(name):
    name = clean_text(name)

    if not name:
        return None

    candidates = [name]
    candidates.extend(STUDY_FIELD_ALIASES.get(normalize_key(name), ()))

    seen = set()
    for candidate in candidates:
        candidate = clean_text(candidate)
        key = candidate.casefold()

        if not candidate or key in seen:
            continue

        seen.add(key)

        study_field = StudyField.objects.filter(is_active=True, name__iexact=candidate).first()
        if study_field:
            return study_field

        study_field = StudyField.objects.filter(is_active=True, slug=slugify(candidate)).first()
        if study_field:
            return study_field

    normalized_name = normalize_key(name)
    for study_field in StudyField.objects.filter(is_active=True).only("id", "name", "aliases"):
        aliases = study_field.aliases if isinstance(study_field.aliases, list) else []
        searchable_values = [study_field.name, *aliases]

        if any(normalize_key(value) == normalized_name for value in searchable_values):
            return study_field

    return None


def resolve_country(name):
    name = clean_text(name)

    if not name:
        return None

    candidates = [name]
    candidates.extend(COUNTRY_ALIASES.get(normalize_key(name), ()))

    seen = set()
    for candidate in candidates:
        candidate = clean_text(candidate)
        key = candidate.casefold()

        if not candidate or key in seen:
            continue

        seen.add(key)

        country = Country.objects.filter(is_active=True, name__iexact=candidate).first()
        if country:
            return country

        country = Country.objects.filter(is_active=True, slug=slugify(candidate)).first()
        if country:
            return country

        if len(candidate) == 2:
            country = Country.objects.filter(is_active=True, iso2__iexact=candidate).first()
            if country:
                return country

        if len(candidate) == 3:
            country = Country.objects.filter(is_active=True, iso3__iexact=candidate).first()
            if country:
                return country

    return None


def resolve_pathway(value):
    pathway_id = parse_positive_int(value)
    if pathway_id:
        return OpportunityPathway.objects.filter(is_active=True, pk=pathway_id).first()

    value = clean_text(value)
    if not value:
        return None

    pathway = OpportunityPathway.objects.filter(is_active=True, slug=value).first()
    if pathway:
        return pathway

    normalized_value = normalize_key(value)
    for candidate in OpportunityPathway.objects.filter(is_active=True).select_related("parent"):
        if normalize_key(candidate.title) == normalized_value:
            return candidate

        if normalize_key(candidate.full_path) == normalized_value:
            return candidate

    return None


def title_from_pathway_value(value):
    value = clean_text(value)
    if not value:
        return ""

    if ">" in value:
        value = value.split(">")[-1]

    return value.replace("-", " ").replace("_", " ").strip().title()


def get_valid_pathway_type(value, default=OpportunityPathway.PathwayType.OTHER):
    value = clean_text(value)
    valid_values = {choice[0] for choice in OpportunityPathway.PathwayType.choices}
    normalized = normalize_key(value)

    if value in valid_values:
        return value

    if normalized in valid_values:
        return normalized

    return default


def get_or_create_pathway_record(title, country_ref=None, parent=None, pathway_type=None):
    pathway_title = clean_text(title)
    slug = slugify(pathway_title)
    if not pathway_title or not slug:
        return None, False

    pathway = OpportunityPathway.objects.filter(slug=slug).first()
    if pathway:
        changed = False
        if not pathway.is_active:
            pathway.is_active = True
            changed = True
        if country_ref and not pathway.country_ref_id:
            pathway.country_ref = country_ref
            changed = True
        if parent and not pathway.parent_id:
            pathway.parent = parent
            changed = True
        if changed:
            pathway.save(update_fields=["is_active", "country_ref", "parent", "updated_at"])
        return pathway, False

    pathway = OpportunityPathway.objects.create(
        title=pathway_title,
        slug=slug,
        country_ref=country_ref,
        parent=parent,
        pathway_type=pathway_type or OpportunityPathway.PathwayType.OTHER,
        is_active=True,
    )
    return pathway, True


def resolve_or_create_pathway(
    opportunity_payload,
    country_ref=None,
    warnings=None,
    create_missing=False,
    create_records=False,
):
    pathway_id = parse_positive_int(opportunity_payload.get("pathway_id"))
    pathway_value = clean_text(opportunity_payload.get("pathway"))
    pathway_title = clean_text(opportunity_payload.get("pathway_title"))
    pathway_parent = clean_text(opportunity_payload.get("pathway_parent"))
    pathway_country = clean_text(opportunity_payload.get("pathway_country"))

    for candidate in (pathway_id, pathway_value, pathway_title):
        if candidate:
            pathway = resolve_pathway(candidate)
            if pathway:
                return pathway

    if not any([pathway_id, pathway_value, pathway_title, pathway_parent]):
        return None

    if not create_missing:
        unknown_value = pathway_id or pathway_value or pathway_title
        if unknown_value and warnings is not None:
            warnings.append(f"Unknown pathway: {unknown_value}. Please select manually before publishing.")
        return None

    title = pathway_title or title_from_pathway_value(pathway_value)
    if not title or not is_safe_pathway_title(title):
        if warnings is not None:
            warnings.append("Unknown pathway could not be created automatically. Please select or create manually.")
        return None

    pathway_country_ref = country_ref
    if pathway_country:
        pathway_country_ref = resolve_or_create_country(
            pathway_country,
            warnings=warnings,
            create_missing=True,
            create_records=create_records,
        ) or country_ref

    parent = None
    parent_title = pathway_parent
    if parent_title:
        parent = resolve_pathway(parent_title)
        if not parent:
            if not is_safe_pathway_title(parent_title):
                if warnings is not None:
                    warnings.append("Unknown pathway could not be created automatically. Please select or create manually.")
                return None

            if create_records:
                parent, parent_created = get_or_create_pathway_record(
                    parent_title,
                    country_ref=pathway_country_ref,
                    pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
                )
                if parent_created and warnings is not None:
                    warnings.append(f"New pathway created: {parent.full_path}.")
            elif warnings is not None:
                warnings.append(f"New pathway will be created: {parent_title}.")

    full_path = f"{parent.full_path} > {title}" if parent else title
    if not create_records:
        if warnings is not None:
            warnings.append(f"New pathway will be created: {full_path}.")
        return None

    pathway, created = get_or_create_pathway_record(
        title,
        country_ref=pathway_country_ref,
        parent=parent,
        pathway_type=get_valid_pathway_type(opportunity_payload.get("pathway_type")),
    )
    if pathway and created and warnings is not None:
        warnings.append(f"New pathway created: {pathway.full_path}.")
    return pathway


def create_missing_references_for_import(cleaned, opportunity_payload, warnings):
    errors = []
    create_missing = cleaned.get("create_missing_references", False)
    if not create_missing:
        return errors

    opportunity_data = cleaned.get("opportunity", {})

    country_ref = resolve_or_create_country(
        opportunity_data.get("country"),
        region_name=clean_text(opportunity_payload.get("country_region")),
        warnings=warnings,
        create_missing=True,
        create_records=True,
    )
    if opportunity_data.get("country") and not country_ref:
        errors.append(f'Unknown country "{opportunity_data["country"]}" could not be created.')
    cleaned["country_ref"] = country_ref

    eligible_countries = []
    for country_name in clean_string_list(opportunity_payload.get("eligible_countries")):
        country = resolve_or_create_country(
            country_name,
            warnings=warnings,
            create_missing=True,
            create_records=True,
            warning_label="eligible country",
        )
        if country:
            eligible_countries.append(country)
    cleaned["eligible_countries"] = dedupe_models(eligible_countries)

    fields_of_study = clean_string_list(opportunity_payload.get("fields_of_study"))
    all_study_fields = get_all_study_fields_flag(cleaned, opportunity_payload, fields_of_study)
    cleaned["all_study_fields"] = all_study_fields
    if all_study_fields:
        warn_ignored_study_fields_for_all_fields(fields_of_study, warnings)
        cleaned["study_fields"] = []
    else:
        categories = opportunity_payload.get("study_field_categories")
        if not isinstance(categories, dict):
            categories = {}

        cleaned["study_fields"] = resolve_study_fields_for_draft(
            fields_of_study,
            categories,
            warnings,
            create_missing=True,
            create_records=True,
        )
        if fields_of_study and not cleaned["study_fields"]:
            errors.append("At least one known study field is required when all_study_fields is false.")

    cleaned["pathway"] = resolve_or_create_pathway(
        opportunity_payload,
        country_ref=cleaned.get("country_ref"),
        warnings=warnings,
        create_missing=True,
        create_records=True,
    )

    return errors


def dedupe_models(records):
    deduped = []
    seen = set()

    for record in records:
        if record.pk not in seen:
            deduped.append(record)
            seen.add(record.pk)

    return deduped


def build_search_keywords(opportunity_data):
    values = [
        opportunity_data.get("title"),
        opportunity_data.get("university_name"),
        opportunity_data.get("department_name"),
        opportunity_data.get("lab_name"),
        opportunity_data.get("professor_name"),
        opportunity_data.get("country"),
        opportunity_data.get("application_track"),
        opportunity_data.get("funding_type"),
        opportunity_data.get("stipend_summary"),
        opportunity_data.get("funding_currency"),
    ]
    values.extend(opportunity_data.get("degree_levels", []))
    values.extend(opportunity_data.get("tags", []))
    return " ".join(value for value in values if value)


def normalize_validation_error(error):
    if hasattr(error, "message_dict"):
        messages = []

        for field_name, field_errors in error.message_dict.items():
            for field_error in field_errors:
                messages.append(f"{field_name}: {field_error}")

        return messages

    return list(error.messages)
