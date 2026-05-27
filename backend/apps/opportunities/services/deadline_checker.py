import re
from dataclasses import dataclass
from datetime import date
from html.parser import HTMLParser

import requests


FETCH_TIMEOUT_SECONDS = 20
USER_AGENT = "ScholarsRepublicDeadlineChecker/1.0"
MAX_PAGE_TEXT_CHARS = 12000
MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


@dataclass
class DeadlineCandidate:
    date: date
    evidence: str


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if self.skip_depth:
            return
        value = " ".join(str(data or "").split())
        if value:
            self.parts.append(value)

    def text(self):
        return " ".join(self.parts)


def source_url_for_opportunity(opportunity):
    return str(opportunity.official_link or opportunity.source_url or "").strip()


def fetch_page_text(url):
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
        timeout=FETCH_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    extractor = TextExtractor()
    extractor.feed(response.text or "")
    return extractor.text()[:MAX_PAGE_TEXT_CHARS]


def _snippet(text, start, end, radius=140):
    return text[max(0, start - radius) : min(len(text), end + radius)].strip()


def _safe_date(year, month, day):
    try:
        return date(int(year), int(month), int(day))
    except ValueError:
        return None


def extract_candidate_dates(page_text):
    text = " ".join(str(page_text or "").split())
    candidates = {}

    for match in re.finditer(r"\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b", text):
        parsed = _safe_date(match.group(1), match.group(2), match.group(3))
        if parsed:
            candidates.setdefault(parsed.isoformat(), DeadlineCandidate(parsed, _snippet(text, *match.span())))

    month_names = "|".join(MONTHS)
    month_pattern = re.compile(
        rf"\b(\d{{1,2}})\s+({month_names})\s+(20\d{{2}})\b|\b({month_names})\s+(\d{{1,2}}),?\s+(20\d{{2}})\b",
        re.IGNORECASE,
    )
    for match in month_pattern.finditer(text):
        if match.group(1):
            day = match.group(1)
            month = MONTHS[match.group(2).lower()]
            year = match.group(3)
        else:
            month = MONTHS[match.group(4).lower()]
            day = match.group(5)
            year = match.group(6)
        parsed = _safe_date(year, month, day)
        if parsed:
            candidates.setdefault(parsed.isoformat(), DeadlineCandidate(parsed, _snippet(text, *match.span())))

    return sorted(candidates.values(), key=lambda item: item.date)


def prepare_deadline_verification_package(opportunity):
    source_url = source_url_for_opportunity(opportunity)
    page_text = ""
    error = ""
    if source_url:
        try:
            page_text = fetch_page_text(source_url)
        except requests.RequestException as exc:
            error = str(exc)

    candidates = extract_candidate_dates(page_text)
    return {
        "opportunity_id": opportunity.pk,
        "title": opportunity.title,
        "provider": opportunity.provider_name or opportunity.university_name or opportunity.source_name or "",
        "current_deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "official_link": opportunity.official_link,
        "source_url": opportunity.source_url,
        "page_text_excerpt": page_text[:4000],
        "candidate_dates": [
            {"date": candidate.date.isoformat(), "evidence": candidate.evidence}
            for candidate in candidates
        ],
        "fetch_error": error,
        "instructions": (
            "Verify if the deadline is confirmed, extended, expired, unclear, "
            "or needs_review. Use official_link first, then source_url. Do not "
            "update from Scholars Republic page content."
        ),
    }
