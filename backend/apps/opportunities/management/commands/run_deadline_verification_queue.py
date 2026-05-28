from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunityDeadlineCheckLog
from apps.opportunities.services.deadline_checker import prepare_deadline_verification_package
from apps.opportunities.services.social_posting import (
    mark_social_image_stale_for_deadline_change,
    regenerate_facebook_caption_for_opportunity,
)


class Command(BaseCommand):
    help = (
        "Run deterministic deadline verification queue preparation. "
        "Dry-run mode prints candidates and likely status without changing records."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--limit", type=int, default=10)
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("--only-near-deadline", action="store_true")

    def handle(self, *args, **options):
        today = timezone.localdate()
        now = timezone.now()
        limit = max(1, min(int(options["limit"]), 200))
        days = max(1, min(int(options["days"]), 365))
        dry_run = bool(options["dry_run"])
        apply = bool(options["apply"])

        queryset = (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .filter(Q(official_link__gt="") | Q(source_url__gt=""))
            .filter(Q(is_rolling_deadline=True) | Q(deadline__isnull=True) | Q(deadline__gte=today))
            .distinct()
            .order_by("deadline", "id")
        )
        if options["only_near_deadline"]:
            queryset = queryset.filter(
                deadline__isnull=False,
                deadline__gte=today,
                deadline__lte=today + timedelta(days=days),
            )

        checked = 0
        updated = 0
        for opportunity in queryset[:limit]:
            package = prepare_deadline_verification_package(opportunity)
            assessment = package.get("deterministic_assessment") or {}
            candidates = package.get("candidate_dates") or []
            candidate_dates = ", ".join(candidate["date"] for candidate in candidates) or "none"
            likely_status = assessment.get("status") or "unclear"
            confidence = assessment.get("confidence") or Opportunity.DeadlineCheckConfidence.LOW
            reason = assessment.get("reason") or ""
            detected_deadline = assessment.get("detected_deadline")

            checked += 1
            self.stdout.write(
                f"{opportunity.pk}: {opportunity.title} current={opportunity.deadline or 'none'} "
                f"candidates={candidate_dates} likely={likely_status} confidence={confidence} "
                f"reason={reason}"
            )

            if dry_run or not apply:
                continue

            old_deadline = opportunity.deadline
            should_update_deadline = (
                likely_status == Opportunity.DeadlineCheckStatus.EXTENDED
                and confidence == Opportunity.DeadlineCheckConfidence.HIGH
                and detected_deadline
                and str(old_deadline or "") != detected_deadline
            )
            if should_update_deadline:
                parsed_deadline = date.fromisoformat(detected_deadline)
                opportunity.deadline_previous_value = old_deadline
                opportunity.deadline = parsed_deadline
                opportunity.deadline_updated_from_source_at = now
                regenerate_facebook_caption_for_opportunity(opportunity)
                mark_social_image_stale_for_deadline_change(opportunity)

            opportunity.deadline_last_checked_at = now
            opportunity.deadline_check_status = likely_status
            opportunity.deadline_check_confidence = confidence
            opportunity.deadline_check_note = reason
            opportunity.deadline_check_evidence = candidates[0]["evidence"] if candidates else ""
            opportunity.deadline_check_source_url = package.get("official_link") or package.get("source_url") or ""
            opportunity.save(
                update_fields=[
                    "deadline",
                    "deadline_last_checked_at",
                    "deadline_check_status",
                    "deadline_check_confidence",
                    "deadline_check_note",
                    "deadline_check_evidence",
                    "deadline_check_source_url",
                    "deadline_previous_value",
                    "deadline_updated_from_source_at",
                    "updated_at",
                ]
            )
            OpportunityDeadlineCheckLog.objects.create(
                opportunity=opportunity,
                old_deadline=old_deadline,
                new_deadline=opportunity.deadline,
                detected_deadline=opportunity.deadline,
                old_status=Opportunity.Status.PUBLISHED,
                new_status=opportunity.status,
                status=likely_status,
                confidence=confidence,
                check_status=opportunity.deadline_check_status,
                source_url=opportunity.deadline_check_source_url,
                evidence=opportunity.deadline_check_evidence,
                evidence_text=opportunity.deadline_check_evidence,
                note=reason,
                verifier="backend",
                checked_by="backend",
                checked_at=now,
            )
            updated += 1

        mode = "dry-run" if dry_run or not apply else "apply"
        self.stdout.write(
            self.style.SUCCESS(
                f"Deadline verification queue {mode} complete; checked={checked} updated={updated}"
            )
        )
