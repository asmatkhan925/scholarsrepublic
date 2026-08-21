from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from difflib import SequenceMatcher
import hashlib
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django.utils.dateparse import parse_date
from django.utils.text import slugify

from apps.opportunities.models import Opportunity, OpportunityPathway

TRACKING_QUERY_PREFIXES = ("utm_",)
TRACKING_QUERY_PARAMS = {"fbclid", "gclid", "mc_cid", "mc_eid"}
CONFIDENCE_RANK = {"low": 1, "medium": 2, "high": 3, "exact": 4}
AUTO_REFRESH_FIELDS = {
    "application_cycle",
    "application_open_date",
    "benefits",
    "deadline",
    "degree_levels",
    "eligibility",
    "english_proficiency_certificate_accepted",
    "funding_type",
    "how_to_apply",
    "ielts_required",
    "is_rolling_deadline",
    "official_link",
    "required_documents",
    "short_description",
    "source_url",
    "stipend_summary",
    "title",
    "toefl_required",
    "duolingo_required",
}
_CYCLE_RANGE_RE = re.compile(r"\b((?:19|20)\d{2})\s*[/\-–]\s*((?:19|20)?\d{2})\b")
_YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")


@dataclass
class DuplicateCandidate:
    title: str = ""
    slug: str = ""
    official_link: str = ""
    source_url: str = ""
    provider_name: str = ""
    university_name: str = ""
    country: str = ""
    deadline: date | None = None
    degree_levels: list[str] = field(default_factory=list)
    pathway_id: int | None = None
    pathway: str = ""
    exclude_id: int | None = None


def normalize_text(value) -> str:
    return str(value or "").strip()


def normalize_key(value) -> str:
    return " ".join(normalize_text(value).casefold().split())


def normalize_url(value) -> str:
    value = normalize_text(value)
    if not value:
        return ""

    parts = urlsplit(value)
    query = sorted([
        (key, query_value)
        for key, query_value in parse_qsl(parts.query, keep_blank_values=True)
        if key.casefold() not in TRACKING_QUERY_PARAMS
        and not key.casefold().startswith(TRACKING_QUERY_PREFIXES)
    ])
    normalized_path = parts.path.rstrip("/") or ""
    normalized_netloc = parts.netloc.casefold().removeprefix("www.")
    normalized_query = urlencode(query, doseq=True)

    return urlunsplit(
        (
            parts.scheme.casefold(),
            normalized_netloc,
            normalized_path,
            normalized_query,
            "",
        )
    )


def normalize_program_title(value) -> str:
    """Normalize a recurring scholarship title without its application cycle."""
    value = normalize_key(value).replace("–", "-")
    value = _CYCLE_RANGE_RE.sub(" ", value)
    value = _YEAR_RE.sub(" ", value)
    value = re.sub(r"\b(spring|summer|autumn|fall|winter)\s+(intake|entry|call)?\b", " ", value)
    value = re.sub(r"\b(intake|entry)\b", " ", value)
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def infer_application_cycle(data: dict) -> str:
    explicit = normalize_text(data.get("application_cycle") or data.get("cycle"))
    if explicit:
        return explicit[:40]

    title = normalize_text(data.get("title"))
    match = _CYCLE_RANGE_RE.search(title)
    if match:
        first, second = match.groups()
        if len(second) == 2:
            second = first[:2] + second
        return f"{first}/{second}"

    title_years = _YEAR_RE.findall(title)
    if title_years:
        return title_years[-1]

    deadline = parse_candidate_date(data.get("deadline") or data.get("detected_deadline"))
    return str(deadline.year) if deadline else ""


def _degree_values(data: dict) -> list[str]:
    values = clean_string_list(data.get("degree_levels"))
    if values:
        return values
    single = normalize_text(data.get("degree_level"))
    return [single] if single else []


def build_scholarship_identity_key(data: dict) -> str:
    """Return a cycle-independent identity key for a scholarship programme."""
    identity_parts = [
        normalize_program_title(data.get("title")),
        normalize_key(data.get("provider_name") or data.get("provider")),
        normalize_key(data.get("university_name") or data.get("university")),
        normalize_key(data.get("country")),
        "|".join(sorted(normalize_key(value) for value in _degree_values(data))),
    ]
    if not any(identity_parts):
        identity_parts.append(
            normalize_url(data.get("official_link") or data.get("official_url") or data.get("source_url"))
        )
    return hashlib.sha256("\x1f".join(identity_parts).encode("utf-8")).hexdigest()


def parse_candidate_date(value) -> date | None:
    if isinstance(value, date):
        return value

    value = normalize_text(value)
    if not value:
        return None

    return parse_date(value)


def clean_string_list(value) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned = []
    seen = set()
    for item in value:
        item = normalize_text(item)
        key = normalize_key(item)
        if item and key not in seen:
            cleaned.append(item)
            seen.add(key)

    return cleaned


def build_duplicate_candidate(data: dict) -> DuplicateCandidate:
    pathway_id = data.get("pathway_id")
    exclude_id = data.get("exclude_id")

    try:
        pathway_id = int(pathway_id) if pathway_id not in (None, "") else None
    except (TypeError, ValueError):
        pathway_id = None

    try:
        exclude_id = int(exclude_id) if exclude_id not in (None, "") else None
    except (TypeError, ValueError):
        exclude_id = None

    return DuplicateCandidate(
        title=normalize_text(data.get("title")),
        slug=normalize_text(data.get("slug")) or slugify(normalize_text(data.get("title")))[:250],
        official_link=normalize_text(data.get("official_link") or data.get("official_url")),
        source_url=normalize_text(data.get("source_url")),
        provider_name=normalize_text(data.get("provider_name") or data.get("provider")),
        university_name=normalize_text(data.get("university_name") or data.get("university")),
        country=normalize_text(data.get("country")),
        deadline=parse_candidate_date(data.get("deadline") or data.get("detected_deadline")),
        degree_levels=_degree_values(data),
        pathway_id=pathway_id,
        pathway=normalize_text(data.get("pathway")),
        exclude_id=exclude_id,
    )


def resolve_pathway_id(candidate: DuplicateCandidate) -> int | None:
    if candidate.pathway_id:
        return candidate.pathway_id

    if not candidate.pathway:
        return None

    pathway = OpportunityPathway.objects.filter(slug=candidate.pathway).only("id").first()
    if pathway:
        return pathway.id

    normalized = normalize_key(candidate.pathway)
    for pathway in OpportunityPathway.objects.select_related("parent").only("id", "title", "parent"):
        if normalize_key(pathway.title) == normalized or normalize_key(pathway.full_path) == normalized:
            return pathway.id

    return None


def existing_provider(opportunity: Opportunity) -> str:
    return (
        opportunity.provider_name
        or opportunity.university_name
        or opportunity.company_name
        or ""
    )


def candidate_provider(candidate: DuplicateCandidate) -> str:
    return candidate.provider_name or candidate.university_name


def country_name(opportunity: Opportunity) -> str:
    return opportunity.country_ref.name if opportunity.country_ref else ""


def title_similarity(first: str, second: str) -> float:
    first = normalize_key(first)
    second = normalize_key(second)
    if not first or not second:
        return 0

    return SequenceMatcher(None, first, second).ratio()


def degree_overlap(candidate_degrees: list[str], existing_degrees) -> bool:
    if not candidate_degrees or not isinstance(existing_degrees, list):
        return False

    candidate_keys = {normalize_key(value) for value in candidate_degrees}
    existing_keys = {normalize_key(value) for value in existing_degrees}
    return bool(candidate_keys & existing_keys)


def add_match(matches, opportunity, confidence, reason):
    current = matches.setdefault(
        opportunity.id,
        {
            "opportunity": opportunity,
            "confidence": confidence,
            "reasons": [],
        },
    )

    if CONFIDENCE_RANK[confidence] > CONFIDENCE_RANK[current["confidence"]]:
        current["confidence"] = confidence

    if reason not in current["reasons"]:
        current["reasons"].append(reason)


def serialize_match(match):
    opportunity = match["opportunity"]
    pathway = opportunity.pathway

    return {
        "id": opportunity.id,
        "title": opportunity.title,
        "slug": opportunity.slug,
        "status": opportunity.status,
        "confidence": match["confidence"],
        "reasons": match["reasons"],
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "country": country_name(opportunity),
        "provider_name": existing_provider(opportunity),
        "university_name": opportunity.university_name,
        "degree_levels": opportunity.degree_levels,
        "official_link": opportunity.official_link,
        "source_url": opportunity.source_url,
        "application_cycle": opportunity.application_cycle,
        "identity_key": opportunity.identity_key,
        "pathway_detail": (
            {
                "id": pathway.id,
                "title": pathway.title,
                "slug": pathway.slug,
                "full_path": pathway.full_path,
            }
            if pathway
            else None
        ),
    }


def find_duplicate_opportunities(data: dict, limit: int = 8) -> list[dict]:
    candidate = build_duplicate_candidate(data)
    candidate_urls = {
        normalize_url(candidate.official_link),
        normalize_url(candidate.source_url),
    }
    candidate_urls.discard("")
    candidate_title_key = normalize_key(candidate.title)
    candidate_provider_key = normalize_key(candidate_provider(candidate))
    candidate_country_key = normalize_key(candidate.country)
    candidate_identity_key = build_scholarship_identity_key(data)
    pathway_id = resolve_pathway_id(candidate)
    matches = {}

    queryset = (
        Opportunity.objects.select_related("country_ref", "pathway", "pathway__parent")
        .only(
            "id",
            "title",
            "slug",
            "status",
            "official_link",
            "source_url",
            "application_cycle",
            "identity_key",
            "provider_name",
            "university_name",
            "company_name",
            "country_ref__name",
            "deadline",
            "degree_levels",
            "pathway_id",
            "pathway__id",
            "pathway__title",
            "pathway__slug",
            "pathway__parent",
        )
        .all()
    )
    if candidate.exclude_id:
        queryset = queryset.exclude(pk=candidate.exclude_id)

    for opportunity in queryset:
        if opportunity.identity_key and opportunity.identity_key == candidate_identity_key:
            add_match(matches, opportunity, "exact", "Same cycle-independent identity key")

        if candidate.slug and opportunity.slug == candidate.slug:
            add_match(matches, opportunity, "exact", "Same slug")

        existing_urls = {
            normalize_url(opportunity.official_link),
            normalize_url(opportunity.source_url),
        }
        existing_urls.discard("")
        if candidate_urls and candidate_urls & existing_urls:
            if normalize_url(candidate.official_link) in existing_urls:
                add_match(matches, opportunity, "exact", "Same official link")
            if normalize_url(candidate.source_url) in existing_urls:
                add_match(matches, opportunity, "exact", "Same source URL")

        existing_title_key = normalize_key(opportunity.title)
        if candidate_title_key and candidate_title_key == existing_title_key:
            add_match(matches, opportunity, "high", "Same title")

        similarity = title_similarity(candidate.title, opportunity.title)
        same_provider = (
            candidate_provider_key
            and candidate_provider_key == normalize_key(existing_provider(opportunity))
        )
        same_country = (
            candidate_country_key
            and candidate_country_key == normalize_key(country_name(opportunity))
        )
        same_deadline = candidate.deadline and opportunity.deadline == candidate.deadline
        overlapping_degrees = degree_overlap(candidate.degree_levels, opportunity.degree_levels)
        same_pathway = pathway_id and opportunity.pathway_id == pathway_id

        if similarity >= 0.86 and (same_provider or same_country or same_deadline):
            confidence = "high" if sum([bool(same_provider), bool(same_country), bool(same_deadline)]) >= 2 else "medium"
            add_match(matches, opportunity, confidence, "Similar title with matching context")

        if same_provider and same_deadline and overlapping_degrees:
            add_match(matches, opportunity, "medium", "Same provider, deadline, and degree level")

        if same_pathway and similarity >= 0.76:
            add_match(matches, opportunity, "medium", "Same pathway and similar title")

    serialized = [serialize_match(match) for match in matches.values()]
    serialized.sort(
        key=lambda item: (
            -CONFIDENCE_RANK[item["confidence"]],
            item["title"],
        )
    )
    return serialized[:limit]


def _json_value(value):
    if isinstance(value, date):
        return value.isoformat()
    return value


def _candidate_field(data: dict, *keys):
    for key in keys:
        if key in data and data.get(key) not in (None, ""):
            return data.get(key)
    return None


def build_refresh_changes(data: dict, opportunity: Opportunity) -> dict:
    """Build a field-level, JSON-safe diff against an existing opportunity."""
    existing_cycle = opportunity.application_cycle or infer_application_cycle(
        {"title": opportunity.title, "deadline": opportunity.deadline}
    )
    proposed = {
        "title": _candidate_field(data, "title"),
        "application_cycle": infer_application_cycle(data),
        "deadline": parse_candidate_date(_candidate_field(data, "deadline", "detected_deadline")),
        "application_open_date": parse_candidate_date(_candidate_field(data, "application_open_date")),
        "is_rolling_deadline": data.get("is_rolling_deadline") if "is_rolling_deadline" in data else None,
        "official_link": _candidate_field(data, "official_link", "official_url"),
        "source_url": _candidate_field(data, "source_url"),
        "funding_type": _candidate_field(data, "funding_type"),
        "stipend_summary": _candidate_field(data, "stipend_summary"),
        "benefits": _candidate_field(data, "benefits"),
        "eligibility": _candidate_field(data, "eligibility", "eligibility_summary"),
        "how_to_apply": _candidate_field(data, "how_to_apply"),
        "short_description": _candidate_field(data, "short_description", "summary"),
        "degree_levels": _degree_values(data) or None,
        "required_documents": data.get("required_documents") if data.get("required_documents") else None,
        "ielts_required": data.get("ielts_required") if "ielts_required" in data else None,
        "toefl_required": data.get("toefl_required") if "toefl_required" in data else None,
        "duolingo_required": data.get("duolingo_required") if "duolingo_required" in data else None,
        "english_proficiency_certificate_accepted": (
            data.get("english_proficiency_certificate_accepted")
            if "english_proficiency_certificate_accepted" in data
            else None
        ),
    }
    changes = {}
    for field_name, new_value in proposed.items():
        if new_value in (None, "", []):
            continue
        old_value = (
            existing_cycle
            if field_name == "application_cycle"
            else getattr(opportunity, field_name, None)
        )
        old_comparable = _json_value(old_value)
        new_comparable = _json_value(new_value)
        if isinstance(old_comparable, list) and isinstance(new_comparable, list):
            if [normalize_key(v) for v in old_comparable] == [normalize_key(v) for v in new_comparable]:
                continue
        elif field_name in {"official_link", "source_url"}:
            if normalize_url(old_comparable) == normalize_url(new_comparable):
                continue
        elif isinstance(old_comparable, str) and isinstance(new_comparable, str):
            if old_comparable.strip() == new_comparable.strip():
                continue
        elif old_comparable == new_comparable:
            continue

        safe = field_name in AUTO_REFRESH_FIELDS
        if field_name == "title":
            safe = normalize_program_title(old_value) == normalize_program_title(new_value)
        changes[field_name] = {
            "old": old_comparable,
            "new": new_comparable,
            "automatic": safe,
        }
    return changes


def resolve_scholarship_candidate(data: dict) -> dict:
    """Classify a discovery as new, unchanged, refreshable, or uncertain."""
    matches = find_duplicate_opportunities(data, limit=8)
    identity_key = build_scholarship_identity_key(data)
    application_cycle = infer_application_cycle(data)
    if not matches:
        return {
            "resolution": "new",
            "recommendation": "create_lead",
            "identity_key": identity_key,
            "application_cycle": application_cycle,
            "identity_confidence": "none",
            "matched_opportunity": None,
            "possible_matches": [],
            "proposed_changes": {},
            "reason": "No matching scholarship identity was found.",
        }

    top = matches[0]
    opportunity = Opportunity.objects.filter(pk=top["id"]).first()
    if opportunity is None:
        return {
            "resolution": "needs_review",
            "recommendation": "needs_review",
            "identity_key": identity_key,
            "application_cycle": application_cycle,
            "identity_confidence": top.get("confidence", "low"),
            "matched_opportunity": top,
            "possible_matches": matches,
            "proposed_changes": {},
            "reason": "The top match could not be loaded.",
        }

    candidate_provider = normalize_key(data.get("provider_name") or data.get("provider"))
    existing_provider_key = normalize_key(existing_provider(opportunity))
    candidate_country = normalize_key(data.get("country"))
    existing_country = normalize_key(country_name(opportunity))
    candidate_university = normalize_key(data.get("university_name") or data.get("university"))
    existing_university = normalize_key(opportunity.university_name)
    candidate_degrees = _degree_values(data)
    existing_degrees = opportunity.degree_levels if isinstance(opportunity.degree_levels, list) else []
    same_title_identity = (
        normalize_program_title(data.get("title"))
        and normalize_program_title(data.get("title")) == normalize_program_title(opportunity.title)
    )
    exact_match = top.get("confidence") == "exact"
    context_matches = (
        (not candidate_provider or not existing_provider_key or candidate_provider == existing_provider_key)
        and (not candidate_country or not existing_country or candidate_country == existing_country)
        and (not candidate_university or not existing_university or candidate_university == existing_university)
        and (
            not candidate_degrees
            or not existing_degrees
            or degree_overlap(candidate_degrees, existing_degrees)
        )
    )
    same_identity = context_matches and (
        same_title_identity
        or (exact_match and title_similarity(data.get("title"), opportunity.title) >= 0.72)
    )
    changes = build_refresh_changes(data, opportunity) if same_identity else {}

    if not same_identity:
        resolution = "needs_review"
        recommendation = "needs_review"
        reason = "A similar scholarship exists, but provider, host, country, or programme identity differs."
    elif changes:
        resolution = "update_existing"
        recommendation = "refresh_existing"
        reason = "The same scholarship identity was found with newer or changed official details."
    else:
        resolution = "unchanged_duplicate"
        recommendation = "duplicate"
        reason = "The scholarship and its supplied cycle details are already current."

    return {
        "resolution": resolution,
        "recommendation": recommendation,
        "identity_key": identity_key,
        "application_cycle": application_cycle,
        "identity_confidence": top.get("confidence", "low"),
        "matched_opportunity": top,
        "possible_matches": matches,
        "proposed_changes": changes,
        "automatic_fields": sorted(name for name, change in changes.items() if change["automatic"]),
        "review_fields": sorted(name for name, change in changes.items() if not change["automatic"]),
        "reason": reason,
    }
