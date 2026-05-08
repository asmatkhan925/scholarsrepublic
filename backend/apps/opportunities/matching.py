import re
from decimal import Decimal

from apps.opportunities.models import Opportunity
from apps.profiles.models import StudentProfile


def normalize_text(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip().lower())


def normalize_list(values):
    if not isinstance(values, list):
        return []
    return [normalize_text(value) for value in values if normalize_text(value)]


def list_contains_any(source_list, target_list):
    normalized_source = normalize_list(source_list)
    normalized_targets = normalize_list(target_list)
    return any(target in normalized_source for target in normalized_targets)


def match_string(value, candidates):
    return normalize_text(value) in normalize_list(candidates)


def add_unique(list_obj, message):
    if message and message not in list_obj:
        list_obj.append(message)


def _decimal_or_none(value):
    if value is None or value == "":
        return None
    return Decimal(str(value))


DOCUMENT_FIELD_MAP = {
    "cnic": "has_cnic",
    "domicile": "has_domicile",
    "passport": "has_passport",
    "transcript": "has_transcript",
    "degree": "has_degree",
    "cv": "has_cv",
    "sop": "has_sop",
    "statement of purpose": "has_sop",
    "study plan": "has_study_plan",
    "research proposal": "has_research_proposal",
    "publications": "has_publications",
    "income certificate": "has_income_certificate",
    "bank statement": "has_bank_statement",
    "police clearance": "has_police_clearance",
    "medical certificate": "has_medical_certificate",
    "ielts": "has_ielts",
    "toefl": "has_toefl",
    "duolingo": "has_duolingo",
    "hsk": "has_hsk",
    "gre": "has_gre",
    "gmat": "has_gmat",
}


def _has_recommendation_letter(profile):
    return profile.has_recommendation_letters or profile.recommendation_letters_count >= 1


def _has_english_proof(profile):
    return (
        profile.has_english_proficiency_letter
        or profile.english_proficiency_certificate
        or profile.has_ielts
        or profile.has_toefl
        or profile.has_duolingo
        or profile.has_pte
    )


def _has_document(profile, document):
    normalized = normalize_text(document)
    if normalized == "recommendation letters":
        return _has_recommendation_letter(profile)
    if normalized == "english proficiency certificate":
        return _has_english_proof(profile)

    field_name = DOCUMENT_FIELD_MAP.get(normalized)
    if field_name:
        return bool(getattr(profile, field_name, False))

    return normalize_text(document) in normalize_list(profile.additional_documents)


def _match_readiness_level(score):
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"


def _score_eligibility(profile, opportunity, matched_reasons, missing_requirements, warnings):
    eligible_countries = normalize_list(opportunity.eligible_countries)
    nationality = normalize_text(profile.nationality)
    current_country = normalize_text(profile.current_country)

    if "all countries" in eligible_countries:
        score = 20
        add_unique(matched_reasons, "Students from all countries are eligible.")
    elif nationality and nationality in eligible_countries:
        score = 20
        add_unique(matched_reasons, f"{profile.nationality} students are eligible.")
    elif "pakistan" in eligible_countries and "pakistan" in {nationality, current_country}:
        score = 20
        add_unique(matched_reasons, "Pakistani students are eligible.")
    elif not eligible_countries:
        score = 10
        add_unique(warnings, "Eligibility countries are not clearly specified.")
    else:
        score = 0
        add_unique(missing_requirements, "Your country may not be eligible.")
        add_unique(warnings, "Your country may not be eligible for this opportunity.")

    target_regions = normalize_list(opportunity.target_regions)
    if target_regions and not list_contains_any(
        [profile.province, profile.domicile],
        target_regions,
    ):
        add_unique(warnings, "This opportunity may be limited to specific regions.")

    return score


def _score_degree_level(profile, opportunity, matched_reasons, missing_requirements, warnings):
    degree_levels = normalize_list(opportunity.degree_levels)
    target_degree = normalize_text(profile.target_degree_level)

    if not degree_levels:
        add_unique(warnings, "Degree levels are not clearly specified.")
        return 8
    if "all levels" in degree_levels or (target_degree and target_degree in degree_levels):
        add_unique(matched_reasons, "Your target degree level matches this opportunity.")
        return 15

    add_unique(missing_requirements, "Target degree level does not match.")
    return 0


def _score_field_fit(profile, opportunity, matched_reasons, missing_requirements, warnings):
    fields = normalize_list(opportunity.fields_of_study)
    target_fields = normalize_list(profile.target_fields)
    current_field = normalize_text(profile.current_field_of_study)

    if not fields:
        add_unique(warnings, "Fields are not clearly specified.")
        return 8
    if "all fields" in fields:
        add_unique(matched_reasons, "This opportunity accepts all fields of study.")
        return 15
    if any(field in fields for field in target_fields):
        add_unique(matched_reasons, "Your target field matches this opportunity.")
        return 15
    if current_field and current_field in fields:
        add_unique(matched_reasons, "Your current field of study matches this opportunity.")
        return 12

    add_unique(missing_requirements, "Your target field may not be listed.")
    return 0


def _score_country_preference(profile, opportunity, matched_reasons, warnings):
    country = normalize_text(opportunity.country)
    target_countries = normalize_list(profile.target_countries)

    if country and country in target_countries:
        add_unique(matched_reasons, "Your selected target country matches this opportunity.")
        return 10
    if not target_countries:
        add_unique(warnings, "Add target countries to improve recommendations.")
        return 5
    if not country:
        add_unique(warnings, "Opportunity country is not clearly specified.")
        return 4

    add_unique(warnings, "This country is not currently in your target country preferences.")
    return 2


def _score_funding_fee(profile, opportunity, matched_reasons, warnings):
    funding_score = 1
    funding_preference = profile.funding_preference
    funding_type = opportunity.funding_type

    if (
        funding_preference == StudentProfile.FundingPreference.FULLY_FUNDED
        and funding_type == Opportunity.FundingType.FULLY_FUNDED
    ):
        funding_score = 5
        add_unique(matched_reasons, "This is fully funded, matching your funding preference.")
    elif funding_preference == StudentProfile.FundingPreference.PARTIAL and funding_type in {
        Opportunity.FundingType.PARTIALLY_FUNDED,
        Opportunity.FundingType.TUITION_WAIVER,
        Opportunity.FundingType.STIPEND_ONLY,
        Opportunity.FundingType.FULLY_FUNDED,
    }:
        funding_score = 5
        add_unique(matched_reasons, "The funding type fits your preference.")
    elif funding_preference == StudentProfile.FundingPreference.LOW_TUITION and funding_type in {
        Opportunity.FundingType.TUITION_WAIVER,
        Opportunity.FundingType.PARTIALLY_FUNDED,
        Opportunity.FundingType.FULLY_FUNDED,
    }:
        funding_score = 5
        add_unique(matched_reasons, "This funding option supports lower study costs.")
    elif funding_preference == StudentProfile.FundingPreference.ANY:
        funding_score = 4
    elif funding_preference == StudentProfile.FundingPreference.SELF_FUNDED:
        funding_score = 3
    else:
        add_unique(warnings, "Funding type may not match your preference.")

    fee_score = 0
    fee_preference = profile.application_fee_preference
    fee_required = opportunity.application_fee_required
    fee_amount = opportunity.application_fee_amount

    if fee_preference == StudentProfile.ApplicationFeePreference.NO_FEE and not fee_required:
        fee_score = 5
        add_unique(matched_reasons, "No application fee is required.")
    elif fee_preference == StudentProfile.ApplicationFeePreference.CAN_PAY:
        fee_score = 5
    elif fee_preference == StudentProfile.ApplicationFeePreference.LOW_FEE and not fee_required:
        fee_score = 5
    elif (
        fee_preference == StudentProfile.ApplicationFeePreference.LOW_FEE
        and fee_amount is not None
        and fee_amount <= Decimal("50")
    ):
        fee_score = 3
    elif fee_preference == StudentProfile.ApplicationFeePreference.ANY:
        fee_score = 4
    elif fee_required and not profile.can_pay_application_fee:
        add_unique(warnings, "Application fee may be required.")
    elif not fee_required:
        fee_score = 4

    return min(funding_score + fee_score, 10)


def _score_language(profile, opportunity, matched_reasons, missing_requirements, warnings):
    requirements = [
        ("IELTS", opportunity.ielts_required, profile.has_ielts),
        ("TOEFL", opportunity.toefl_required, profile.has_toefl),
        ("Duolingo", opportunity.duolingo_required, profile.has_duolingo),
        ("HSK", opportunity.hsk_required, profile.has_hsk),
    ]
    explicit_requirements = [item for item in requirements if item[1]]

    if not explicit_requirements:
        add_unique(matched_reasons, "No language test is required.")
        return 10

    missing_tests = [label for label, required, has_test in explicit_requirements if not has_test]
    if not missing_tests:
        add_unique(matched_reasons, "Your language test profile satisfies the requirement.")
        return 10

    if (
        opportunity.english_proficiency_certificate_accepted
        and profile.english_proficiency_certificate
    ):
        add_unique(matched_reasons, "English proficiency certificate is accepted.")
        return 8

    for test_name in missing_tests:
        add_unique(missing_requirements, test_name)
    add_unique(warnings, "A required language test may be missing.")
    return 0


def _score_academic(profile, opportunity, matched_reasons, missing_requirements, warnings):
    min_cgpa = _decimal_or_none(opportunity.min_cgpa)
    min_percentage = _decimal_or_none(opportunity.min_percentage)
    profile_cgpa = _decimal_or_none(profile.cgpa)
    profile_percentage = _decimal_or_none(profile.percentage)
    has_minimum = min_cgpa is not None or min_percentage is not None
    if not has_minimum:
        add_unique(matched_reasons, "No strict minimum academic score is specified.")
        return 7

    if min_cgpa is not None:
        if profile_cgpa is None:
            add_unique(warnings, "Add CGPA for accurate matching.")
            return 3
        if profile.grading_system not in [
            StudentProfile.GradingSystem.CGPA_4,
            StudentProfile.GradingSystem.CGPA_5,
        ]:
            add_unique(warnings, "Your grading system may not match the CGPA requirement.")
            return 3
        if profile_cgpa >= min_cgpa:
            add_unique(matched_reasons, "Your CGPA meets the listed academic requirement.")
            return 10
        add_unique(missing_requirements, "Academic score may be below requirement.")
        return 0

    if min_percentage is not None:
        if profile_percentage is None:
            add_unique(warnings, "Add percentage for accurate matching.")
            return 3
        if profile.grading_system != StudentProfile.GradingSystem.PERCENTAGE:
            add_unique(warnings, "Your grading system may not match the percentage requirement.")
            return 3
        if profile_percentage >= min_percentage:
            add_unique(matched_reasons, "Your percentage meets the listed academic requirement.")
            return 10
        add_unique(missing_requirements, "Academic score may be below requirement.")
        return 0

    return 7


def _score_documents(
    profile, opportunity, matched_reasons, missing_requirements, warnings, suggestions
):
    documents = (
        opportunity.required_documents if isinstance(opportunity.required_documents, list) else []
    )
    if not documents:
        add_unique(warnings, "Required documents are not clearly listed.")
        return 3

    missing_documents = [document for document in documents if not _has_document(profile, document)]
    ready_count = len(documents) - len(missing_documents)
    ready_ratio = ready_count / len(documents)

    for document in missing_documents:
        add_unique(missing_requirements, document)
        add_unique(suggestions, f"Prepare {document} before applying.")

    if not missing_documents:
        add_unique(matched_reasons, "Your required documents are marked ready.")
        return 5
    if ready_ratio >= 0.7:
        return 4
    if ready_ratio >= 0.4:
        return 2
    return 1


def _score_deadline(opportunity, warnings):
    if opportunity.is_rolling_deadline:
        return 5
    if not opportunity.deadline:
        add_unique(warnings, "Deadline is not clearly specified.")
        return 3
    if opportunity.is_expired:
        add_unique(warnings, "This opportunity appears expired.")
        return 0

    days_left = opportunity.days_until_deadline
    if days_left is None:
        add_unique(warnings, "Deadline is not clearly specified.")
        return 3
    if days_left > 30:
        return 5
    if 15 <= days_left <= 30:
        return 4
    if 7 <= days_left <= 14:
        add_unique(warnings, "Deadline is approaching.")
        return 2
    if 1 <= days_left <= 6:
        add_unique(warnings, "Deadline is very close.")
        return 1

    add_unique(warnings, "Deadline has passed or is today.")
    return 0


def calculate_opportunity_match(profile, opportunity):
    matched_reasons = []
    missing_requirements = []
    warnings = []
    suggestions = []

    breakdown = {
        "eligibility": _score_eligibility(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
        ),
        "degree_level": _score_degree_level(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
        ),
        "field_fit": _score_field_fit(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
        ),
        "country_preference": _score_country_preference(
            profile,
            opportunity,
            matched_reasons,
            warnings,
        ),
        "funding_fee": _score_funding_fee(profile, opportunity, matched_reasons, warnings),
        "language_test": _score_language(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
        ),
        "academic_requirement": _score_academic(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
        ),
        "document_readiness": _score_documents(
            profile,
            opportunity,
            matched_reasons,
            missing_requirements,
            warnings,
            suggestions,
        ),
        "deadline_safety": _score_deadline(opportunity, warnings),
    }
    score = min(sum(breakdown.values()), 100)

    if missing_requirements and not suggestions:
        add_unique(suggestions, "Review missing requirements before applying.")
    if score < 60:
        add_unique(suggestions, "Update your profile and documents to improve future matches.")

    return {
        "score": score,
        "readiness_level": _match_readiness_level(score),
        "breakdown": breakdown,
        "matched_reasons": matched_reasons,
        "missing_requirements": missing_requirements,
        "warnings": warnings,
        "suggestions": suggestions,
    }
