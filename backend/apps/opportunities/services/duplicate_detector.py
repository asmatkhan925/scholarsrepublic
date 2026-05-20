from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from difflib import SequenceMatcher
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django.utils.dateparse import parse_date
from django.utils.text import slugify

from apps.opportunities.models import Opportunity, OpportunityPathway

TRACKING_QUERY_PREFIXES = ("utm_",)
TRACKING_QUERY_PARAMS = {"fbclid", "gclid", "mc_cid", "mc_eid"}
CONFIDENCE_RANK = {"low": 1, "medium": 2, "high": 3, "exact": 4}


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
    query = [
        (key, query_value)
        for key, query_value in parse_qsl(parts.query, keep_blank_values=True)
        if key.casefold() not in TRACKING_QUERY_PARAMS
        and not key.casefold().startswith(TRACKING_QUERY_PREFIXES)
    ]
    normalized_path = parts.path.rstrip("/") or ""
    normalized_netloc = parts.netloc.casefold()
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
        official_link=normalize_text(data.get("official_link")),
        source_url=normalize_text(data.get("source_url")),
        provider_name=normalize_text(data.get("provider_name")),
        university_name=normalize_text(data.get("university_name")),
        country=normalize_text(data.get("country")),
        deadline=parse_candidate_date(data.get("deadline")),
        degree_levels=clean_string_list(data.get("degree_levels")),
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
