from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.opportunities.models import Opportunity, OpportunityDraft, OpportunityPathway
from apps.reference_data.models import Country, StudyField

ALL_STUDY_FIELD_MARKERS = {"all fields", "all", "any"}

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

    cleaned = {
        "confidence": clean_text(payload.get("confidence")),
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

    country = resolve_country(opportunity["country"])
    cleaned["country_ref"] = country

    if opportunity["country"] and not country:
        errors.append(f'Unknown country "{opportunity["country"]}".')

    eligible_countries = []
    for country_name in clean_string_list(opportunity_payload.get("eligible_countries")):
        eligible_country = resolve_country(country_name)

        if eligible_country:
            eligible_countries.append(eligible_country)
        else:
            warnings.append(f'Unknown eligible country "{country_name}" skipped.')

    cleaned["eligible_countries"] = dedupe_models(eligible_countries)

    fields_of_study = clean_string_list(opportunity_payload.get("fields_of_study"))
    all_study_fields = bool(opportunity_payload.get("all_study_fields")) or bool(
        {field.casefold() for field in fields_of_study} & ALL_STUDY_FIELD_MARKERS
    )
    cleaned["all_study_fields"] = all_study_fields

    if all_study_fields:
        cleaned["study_fields"] = []
    else:
        study_fields = []

        for field_name in fields_of_study:
            study_field = resolve_study_field(field_name)

            if study_field:
                study_fields.append(study_field)
            else:
                warnings.append(f'Unknown study field "{field_name}" skipped.')

        cleaned["study_fields"] = dedupe_models(study_fields)

        if not cleaned["study_fields"]:
            errors.append(
                "At least one known study field is required when all_study_fields is false."
            )

    pathway_id = parse_positive_int(opportunity_payload.get("pathway_id"))
    pathway_value = clean_text(opportunity_payload.get("pathway"))
    if pathway_id or pathway_value:
        pathway = resolve_pathway(pathway_id or pathway_value)
        if pathway:
            cleaned["pathway"] = pathway
        else:
            warnings.append(f"Unknown pathway: {pathway_id or pathway_value}. Please select manually before publishing.")

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
    opportunity["degree_levels"] = clean_string_list(opportunity_payload.get("degree_levels"))
    opportunity["required_documents"] = clean_string_list(
        opportunity_payload.get("required_documents")
    )
    opportunity["tags"] = clean_string_list(opportunity_payload.get("tags"))

    for field_name in (
        "slug",
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
        except ValueError:
            errors.append("deadline must use YYYY-MM-DD format.")
    elif not is_rolling_deadline:
        warnings.append("Deadline is empty while is_rolling_deadline is false.")

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


def normalize_key(value):
    return clean_text(value).casefold().replace("-", "_").replace(" ", "_")


def parse_positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None

    return parsed if parsed > 0 else None


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
