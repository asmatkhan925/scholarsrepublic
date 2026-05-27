from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity
from apps.opportunities.services.deadline_checker import prepare_deadline_verification_package


class Command(BaseCommand):
    help = "Prepare scholarship deadline verification packages for backend/admin review."

    def add_arguments(self, parser):
        parser.add_argument("--only-near-deadline", action="store_true")
        parser.add_argument("--days", type=int, default=7)
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        today = timezone.localdate()
        days = max(1, int(options["days"]))
        limit = max(1, min(int(options["limit"]), 200))

        queryset = (
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
            .filter(Q(official_link__gt="") | Q(source_url__gt=""))
            .distinct()
            .order_by("deadline", "id")
        )
        if options["only_near_deadline"]:
            queryset = queryset.filter(
                deadline__isnull=False,
                deadline__gte=today,
                deadline__lte=today + timedelta(days=days),
            )

        prepared = 0
        needs_review = 0
        for opportunity in queryset[:limit]:
            package = prepare_deadline_verification_package(opportunity)
            candidate_count = len(package["candidate_dates"])
            status = (
                Opportunity.DeadlineCheckStatus.NEEDS_REVIEW
                if candidate_count
                else Opportunity.DeadlineCheckStatus.UNCLEAR
            )
            opportunity.deadline_check_status = status
            opportunity.deadline_check_note = (
                f"Prepared deadline check package with {candidate_count} candidate date(s)."
            )
            opportunity.save(update_fields=["deadline_check_status", "deadline_check_note", "updated_at"])
            prepared += 1
            if status == Opportunity.DeadlineCheckStatus.NEEDS_REVIEW:
                needs_review += 1
            self.stdout.write(
                f"{opportunity.pk}: {opportunity.title} candidates={candidate_count} status={status}"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Prepared {prepared} deadline check package(s); {needs_review} need review."
            )
        )
