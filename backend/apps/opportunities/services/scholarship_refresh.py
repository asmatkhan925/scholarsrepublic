from __future__ import annotations

import hashlib
import json
from datetime import date

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.opportunities.models import (
    Opportunity,
    OpportunityRefreshLog,
    ScholarshipResearchLead,
)
from apps.opportunities.services.duplicate_detector import resolve_scholarship_candidate
from apps.opportunities.services.social_posting import (
    mark_social_image_stale_for_deadline_change,
    regenerate_facebook_caption_for_opportunity,
)
from apps.opportunities.services.social_scheduler import apply_social_priority


MIN_EVIDENCE_LENGTH = 20
VISIBLE_FACT_FIELDS = {
    "application_cycle",
    "benefits",
    "deadline",
    "degree_levels",
    "eligibility",
    "funding_type",
    "official_link",
    "short_description",
    "source_url",
    "stipend_summary",
    "title",
}


class ScholarshipRefreshError(ValueError):
    pass


def _source_url(candidate: dict, explicit_source_url: str) -> str:
    value = str(
        explicit_source_url
        or candidate.get("official_url")
        or candidate.get("official_link")
        or candidate.get("source_url")
        or ""
    ).strip()
    try:
        URLValidator(schemes=["http", "https"])(value)
    except ValidationError as exc:
        raise ScholarshipRefreshError("A valid official source URL is required.") from exc
    return value


def _idempotency_key(opportunity_id: int, candidate: dict, source_url: str) -> str:
    payload = json.dumps(
        {
            "opportunity_id": opportunity_id,
            "candidate": candidate,
            "source_url": source_url,
        },
        sort_keys=True,
        ensure_ascii=False,
        default=str,
        separators=(",", ":"),
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _coerce_model_value(opportunity: Opportunity, field_name: str, value):
    if field_name in {"deadline", "application_open_date"}:
        parsed = parse_date(str(value or ""))
        if value and parsed is None:
            raise ScholarshipRefreshError(f"{field_name} must use YYYY-MM-DD format.")
        value = parsed
    field = opportunity._meta.get_field(field_name)
    try:
        return field.clean(value, opportunity)
    except ValidationError as exc:
        message = "; ".join(exc.messages) if exc.messages else str(exc)
        raise ScholarshipRefreshError(f"Invalid {field_name}: {message}") from exc


def _deadline_is_safe(old_deadline: date | None, new_deadline: date | None) -> bool:
    if new_deadline is None or new_deadline < timezone.localdate():
        return False
    if old_deadline is None or old_deadline < timezone.localdate():
        return True
    return new_deadline >= old_deadline


def _validate_candidate_identity(candidate: dict) -> None:
    missing = []
    if not str(candidate.get("title") or "").strip():
        missing.append("title")
    if not str(
        candidate.get("provider_name")
        or candidate.get("provider")
        or candidate.get("university_name")
        or candidate.get("university")
        or ""
    ).strip():
        missing.append("provider_name or university")
    degree_levels = candidate.get("degree_levels")
    if not (
        str(candidate.get("degree_level") or "").strip()
        or isinstance(degree_levels, list)
        and any(str(value or "").strip() for value in degree_levels)
    ):
        missing.append("degree_level or degree_levels")
    if missing:
        raise ScholarshipRefreshError(
            "Candidate identity is incomplete; required: " + ", ".join(missing) + "."
        )


@transaction.atomic
def apply_scholarship_refresh(
    opportunity_id: int,
    candidate: dict,
    *,
    evidence_text: str,
    source_url: str = "",
    lead_id: int | None = None,
) -> dict:
    _validate_candidate_identity(candidate)
    evidence_text = str(evidence_text or "").strip()
    if len(evidence_text) < MIN_EVIDENCE_LENGTH:
        raise ScholarshipRefreshError(
            "Official-source evidence of at least 20 characters is required."
        )
    source_url = _source_url(candidate, source_url)
    opportunity = Opportunity.objects.select_for_update().filter(pk=opportunity_id).first()
    if opportunity is None:
        raise ScholarshipRefreshError("Scholarship not found.")

    resolution = resolve_scholarship_candidate(candidate)
    match = resolution.get("matched_opportunity") or {}
    if match.get("id") != opportunity.pk:
        raise ScholarshipRefreshError("Candidate identity does not match this scholarship.")
    if resolution.get("identity_confidence") not in {"exact", "high"}:
        raise ScholarshipRefreshError("Scholarship identity confidence is not high enough to update.")

    key = _idempotency_key(opportunity.pk, candidate, source_url)
    existing_log = OpportunityRefreshLog.objects.filter(idempotency_key=key).first()
    if existing_log:
        return {
            "ok": True,
            "applied": False,
            "idempotent_replay": True,
            "resolution": resolution,
            "refresh_log_id": existing_log.pk,
            "applied_fields": existing_log.applied_fields,
            "skipped_fields": existing_log.skipped_fields,
        }

    if resolution.get("resolution") == "unchanged_duplicate":
        return {
            "ok": True,
            "applied": False,
            "idempotent_replay": False,
            "resolution": resolution,
            "refresh_log_id": None,
            "applied_fields": [],
            "skipped_fields": [],
        }
    if resolution.get("resolution") != "update_existing":
        raise ScholarshipRefreshError("Candidate requires review and cannot be updated automatically.")

    changes = resolution.get("proposed_changes") or {}
    applied_fields = []
    skipped_fields = []
    old_values = {}
    new_values = {}
    update_fields = set()

    for field_name, change in changes.items():
        if not change.get("automatic"):
            skipped_fields.append(field_name)
            continue
        new_value = _coerce_model_value(opportunity, field_name, change.get("new"))
        if field_name == "deadline" and not _deadline_is_safe(opportunity.deadline, new_value):
            skipped_fields.append(field_name)
            continue
        old_values[field_name] = change.get("old")
        new_values[field_name] = change.get("new")
        setattr(opportunity, field_name, new_value)
        applied_fields.append(field_name)
        update_fields.add(field_name)

    now = timezone.now()
    if applied_fields:
        if "deadline" in applied_fields:
            opportunity.deadline_previous_value = parse_date(str(old_values.get("deadline") or ""))
            opportunity.deadline_updated_from_source_at = now
            opportunity.deadline_last_checked_at = now
            opportunity.deadline_check_status = Opportunity.DeadlineCheckStatus.VERIFIED_ACTIVE
            opportunity.deadline_check_source_url = source_url
            opportunity.deadline_check_evidence = evidence_text
            opportunity.deadline_check_confidence = Opportunity.DeadlineCheckConfidence.HIGH
            update_fields.update(
                {
                    "deadline_previous_value",
                    "deadline_updated_from_source_at",
                    "deadline_last_checked_at",
                    "deadline_check_status",
                    "deadline_check_source_url",
                    "deadline_check_evidence",
                    "deadline_check_confidence",
                }
            )
        opportunity.identity_key = resolution.get("identity_key") or opportunity.identity_key
        opportunity.application_cycle = (
            resolution.get("application_cycle") or opportunity.application_cycle
        )
        opportunity.last_verified_at = now
        opportunity.verified_status = True
        update_fields.update(
            {"identity_key", "application_cycle", "last_verified_at", "verified_status", "updated_at"}
        )
        opportunity.save(update_fields=sorted(update_fields))
        plan = regenerate_facebook_caption_for_opportunity(opportunity, force=True)
        if set(applied_fields) & VISIBLE_FACT_FIELDS:
            mark_social_image_stale_for_deadline_change(
                opportunity,
                reason="Scholarship details changed. Uploaded social image may contain old facts.",
            )
        apply_social_priority(plan)

    lead = None
    if lead_id:
        lead = ScholarshipResearchLead.objects.select_for_update().filter(pk=lead_id).first()
        if lead:
            lead.resolution = ScholarshipResearchLead.Resolution.UPDATE_EXISTING
            lead.matched_opportunity = opportunity
            lead.proposed_changes = changes
            lead.resolution_reason = resolution.get("reason", "")
            lead.identity_key = resolution.get("identity_key", "")
            lead.application_cycle = resolution.get("application_cycle", "")
            lead.source_verified_at = now
            lead.refresh_applied_at = now if applied_fields and not skipped_fields else None
            lead.review_status = (
                ScholarshipResearchLead.ReviewStatus.IMPORTED
                if applied_fields and not skipped_fields
                else ScholarshipResearchLead.ReviewStatus.NEEDS_REVIEW
            )
            lead.save(
                update_fields=[
                    "resolution",
                    "matched_opportunity",
                    "proposed_changes",
                    "resolution_reason",
                    "identity_key",
                    "application_cycle",
                    "source_verified_at",
                    "refresh_applied_at",
                    "review_status",
                    "updated_at",
                ]
            )

    refresh_log = OpportunityRefreshLog.objects.create(
        opportunity=opportunity,
        research_lead=lead,
        application_cycle=resolution.get("application_cycle", ""),
        old_values=old_values,
        new_values=new_values,
        applied_fields=applied_fields,
        skipped_fields=skipped_fields,
        source_url=source_url,
        evidence_text=evidence_text,
        identity_confidence=resolution.get("identity_confidence", ""),
        idempotency_key=key,
    )
    return {
        "ok": True,
        "applied": bool(applied_fields),
        "idempotent_replay": False,
        "resolution": resolution,
        "refresh_log_id": refresh_log.pk,
        "opportunity_id": opportunity.pk,
        "applied_fields": applied_fields,
        "skipped_fields": skipped_fields,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "application_cycle": opportunity.application_cycle,
    }
