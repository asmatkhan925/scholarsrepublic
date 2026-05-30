from collections import Counter

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunitySocialPostPlan
from apps.opportunities.services.social_scheduler import score_opportunity_for_social


DEFAULT_STATUSES = [
    OpportunitySocialPostPlan.Status.READY,
    OpportunitySocialPostPlan.Status.DRAFT,
    OpportunitySocialPostPlan.Status.PAUSED,
]
SAMPLE_LIMIT = 10


class Command(BaseCommand):
    help = "Recalculate Facebook social priority scores for existing post plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--all",
            action="store_true",
            help="Process all Facebook plans regardless of status or opportunity state.",
        )
        parser.add_argument(
            "--status",
            type=str,
            default=None,
            help="Only process plans with this status, for example: ready.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print changes without writing recalculated scores to the database.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N matching plans.",
        )
        parser.add_argument(
            "--only-zero",
            action="store_true",
            help="Only process plans whose current priority_score is 0.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        status_filter = options["status"]

        if limit is not None and limit < 1:
            raise CommandError("--limit must be greater than 0.")
        if status_filter and status_filter not in OpportunitySocialPostPlan.Status.values:
            valid_statuses = ", ".join(OpportunitySocialPostPlan.Status.values)
            raise CommandError(f"--status must be one of: {valid_statuses}.")

        queryset = self.build_queryset(options)
        plans = list(queryset[:limit] if limit else queryset)

        before_counts = self.decision_counts(plan.auto_social_decision for plan in plans)
        after_decisions = []
        changed_samples = []
        changed_count = 0

        for plan in plans:
            old_score = plan.priority_score
            old_reason = plan.priority_reason
            old_decision = plan.auto_social_decision

            result = score_opportunity_for_social(plan.opportunity)
            new_score = result["score"]
            new_reason = result["reasons"]
            new_decision = result["decision"]
            after_decisions.append(new_decision)

            changed = (
                old_score != new_score
                or old_reason != new_reason
                or old_decision != new_decision
            )
            if not changed:
                continue

            changed_count += 1
            if len(changed_samples) < SAMPLE_LIMIT:
                changed_samples.append(
                    {
                        "id": plan.id,
                        "opportunity_id": plan.opportunity_id,
                        "old_score": old_score,
                        "new_score": new_score,
                        "old_decision": old_decision,
                        "new_decision": new_decision,
                        "title": plan.opportunity.title,
                    }
                )

            if not dry_run:
                plan.priority_score = new_score
                plan.priority_reason = new_reason
                plan.auto_social_decision = new_decision
                plan.save(
                    update_fields=[
                        "priority_score",
                        "priority_reason",
                        "auto_social_decision",
                        "updated_at",
                    ]
                )

        after_counts = self.decision_counts(after_decisions)

        self.stdout.write("Facebook social priority score recalculation")
        self.stdout.write(f"Dry run: {'yes' if dry_run else 'no'}")
        self.stdout.write(f"Plans processed: {len(plans)}")
        self.stdout.write(f"Plans changed: {changed_count}")
        self.stdout.write(
            "Scope: "
            + (
                "all Facebook plans"
                if options["all"]
                else "ready/draft/paused Facebook plans for active published opportunities"
            )
        )
        if status_filter:
            self.stdout.write(f"Status filter: {status_filter}")
        if options["only_zero"]:
            self.stdout.write("Only zero scores: yes")
        if limit:
            self.stdout.write(f"Limit: {limit}")
        self.stdout.write("")
        self.stdout.write(f"Before decisions: {self.format_counts(before_counts)}")
        self.stdout.write(f"After decisions: {self.format_counts(after_counts)}")

        if changed_samples:
            self.stdout.write("")
            self.stdout.write("Sample changed plans:")
            for sample in changed_samples:
                self.stdout.write(
                    " - "
                    f"id={sample['id']}; "
                    f"opportunity_id={sample['opportunity_id']}; "
                    f"old_score={sample['old_score']}; "
                    f"new_score={sample['new_score']}; "
                    f"old_decision={sample['old_decision']}; "
                    f"new_decision={sample['new_decision']}; "
                    f"title={sample['title']}"
                )

    def build_queryset(self, options):
        queryset = OpportunitySocialPostPlan.objects.select_related("opportunity").filter(
            platform="facebook",
        )

        if not options["all"]:
            today = timezone.localdate()
            expired_check_statuses = [
                Opportunity.DeadlineCheckStatus.EXPIRED,
                Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
            ]
            queryset = queryset.filter(
                status__in=DEFAULT_STATUSES,
                opportunity__status=Opportunity.Status.PUBLISHED,
            ).filter(
                Q(opportunity__deadline__isnull=True)
                | Q(opportunity__is_rolling_deadline=True)
                | Q(opportunity__deadline__gte=today)
            ).exclude(opportunity__deadline_check_status__in=expired_check_statuses)

        if options["status"]:
            queryset = queryset.filter(status=options["status"])
        if options["only_zero"]:
            queryset = queryset.filter(priority_score=0)

        return queryset.order_by("id")

    def decision_counts(self, decisions):
        counts = Counter(decisions)
        return {
            decision: counts.get(decision, 0)
            for decision in OpportunitySocialPostPlan.AutoSocialDecision.values
        }

    def format_counts(self, counts):
        return ", ".join(
            f"{decision}={counts[decision]}"
            for decision in OpportunitySocialPostPlan.AutoSocialDecision.values
        )
