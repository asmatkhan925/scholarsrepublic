from datetime import date

from django.core.management.base import BaseCommand, CommandError

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollectionSocialPostPlan,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.social_collection_posting import (
    create_due_collection_social_post_plans,
)
from apps.opportunities.services.social_collections import (
    approve_social_collections,
    generate_social_collections,
)
from apps.opportunities.services.social_scheduler import score_opportunity_for_social
from apps.opportunities.services.social_posting import (
    DEFAULT_PLATFORM,
    evaluate_collection_auto_post_eligibility,
    evaluate_opportunity_auto_post_eligibility,
)


class Command(BaseCommand):
    help = "Run the daily smart social scheduler preparation pipeline."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--limit", type=int, default=None)
        parser.add_argument("--start-date", type=str, default=None)
        parser.add_argument("--per-day", type=int, default=3)
        parser.add_argument("--schedule-now", action="store_true")
        parser.add_argument("--skip-recalculate", action="store_true")
        parser.add_argument("--skip-collections", action="store_true")
        parser.add_argument("--skip-approval", action="store_true")
        parser.add_argument("--skip-plans", action="store_true")

    def handle(self, *args, **options):
        if options["limit"] is not None and options["limit"] < 1:
            raise CommandError("--limit must be greater than 0.")
        if options["per_day"] < 1:
            raise CommandError("--per-day must be greater than 0.")

        start_date = None
        if options["start_date"]:
            try:
                start_date = date.fromisoformat(options["start_date"])
            except ValueError as exc:
                raise CommandError("--start-date must be in YYYY-MM-DD format.") from exc

        dry_run = options["dry_run"]
        self.stdout.write("Daily smart social scheduler")
        self.stdout.write(f"Dry run: {'yes' if dry_run else 'no'}")
        if options["limit"]:
            self.stdout.write(f"Limit: {options['limit']}")
        if start_date:
            self.stdout.write(f"Start date: {start_date.isoformat()}")
        self.stdout.write(f"Per day: {options['per_day']}")
        if options["schedule_now"]:
            self.stdout.write("Schedule now: yes")

        recalculation = {"processed": 0, "changed": 0}
        if not options["skip_recalculate"]:
            recalculation = self.recalculate_scores(dry_run=dry_run, limit=options["limit"])
        self.stdout.write(
            "Scores recalculated: "
            f"processed={recalculation['processed']}; changed={recalculation['changed']}"
        )

        generated = {"created_count": 0, "preview_count": 0}
        if not options["skip_collections"]:
            generated = generate_social_collections(
                dry_run=dry_run,
                limit=options["limit"],
                auto_approve=False,
            )
        self.stdout.write(
            "Collections generated: "
            f"created={generated['created_count']}; previewed={generated['preview_count']}"
        )

        approved = {"approved_count": 0, "evaluated_count": 0}
        if not options["skip_approval"]:
            approved = approve_social_collections(
                dry_run=dry_run,
                limit=options["limit"],
                include_ready=True,
            )
        self.stdout.write(
            "Collections auto-approved: "
            f"approved={approved['approved_count']}; evaluated={approved['evaluated_count']}"
        )

        plans = {"created_count": 0, "evaluated_count": 0, "results": []}
        if not options["skip_plans"]:
            plans = create_due_collection_social_post_plans(
                dry_run=dry_run,
                limit=options["limit"],
                start_date=start_date,
                per_day=options["per_day"],
                schedule_now=options["schedule_now"],
            )
        skipped = self.skipped_counts(plans["results"])
        self.stdout.write(
            "Collection social post plans: "
            f"created={plans['created_count']}; evaluated={plans['evaluated_count']}"
        )
        self.stdout.write(f"Plan skipped reasons: {self.format_counts(skipped)}")
        eligibility_counts = self.auto_post_eligibility_counts()
        self.stdout.write(
            "Auto-post eligibility: "
            f"eligible_auto_post_plans={eligibility_counts['eligible_auto_post_plans']}; "
            f"blocked_missing_image={eligibility_counts['blocked_missing_image']}; "
            f"blocked_missing_caption={eligibility_counts['blocked_missing_caption']}; "
            f"blocked_deadline_not_near={eligibility_counts['blocked_deadline_not_near']}; "
            f"blocked_expired={eligibility_counts['blocked_expired']}; "
            f"blocked_collection_missing_image={eligibility_counts['blocked_collection_missing_image']}; "
            f"blocked_collection_no_near_deadline_item={eligibility_counts['blocked_collection_no_near_deadline_item']}"
        )

    def recalculate_scores(self, *, dry_run=False, limit=None):
        queryset = OpportunitySocialPostPlan.objects.select_related("opportunity").filter(
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            opportunity__status=Opportunity.Status.PUBLISHED,
        )
        plans = list(queryset.order_by("id")[:limit] if limit else queryset.order_by("id"))
        changed = 0
        for plan in plans:
            result = score_opportunity_for_social(plan.opportunity)
            if (
                plan.priority_score == result["score"]
                and plan.priority_reason == result["reasons"]
                and plan.auto_social_decision == result["decision"]
            ):
                continue
            changed += 1
            if not dry_run:
                plan.priority_score = result["score"]
                plan.priority_reason = result["reasons"]
                plan.auto_social_decision = result["decision"]
                plan.save(
                    update_fields=[
                        "priority_score",
                        "priority_reason",
                        "auto_social_decision",
                        "updated_at",
                    ]
                )
        return {"processed": len(plans), "changed": changed}

    def skipped_counts(self, results):
        counts = {}
        for item in results:
            if item.get("created"):
                continue
            blockers = item.get("eligibility", {}).get("blockers", []) or ["not_created"]
            for blocker in blockers:
                counts[blocker] = counts.get(blocker, 0) + 1
        return counts

    def format_counts(self, counts):
        if not counts:
            return "-"
        return ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))

    def auto_post_eligibility_counts(self):
        counts = {
            "eligible_auto_post_plans": 0,
            "blocked_missing_image": 0,
            "blocked_missing_caption": 0,
            "blocked_deadline_not_near": 0,
            "blocked_expired": 0,
            "blocked_collection_missing_image": 0,
            "blocked_collection_no_near_deadline_item": 0,
        }
        opportunity_plans = OpportunitySocialPostPlan.objects.select_related("opportunity").filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunitySocialPostPlan.Status.READY,
            enabled=True,
        )
        for plan in opportunity_plans:
            eligibility = evaluate_opportunity_auto_post_eligibility(plan)
            if eligibility["auto_post_eligible"]:
                counts["eligible_auto_post_plans"] += 1
            blockers = eligibility["blocking_reasons"]
            if "missing_image" in blockers:
                counts["blocked_missing_image"] += 1
            if "missing_caption" in blockers:
                counts["blocked_missing_caption"] += 1
            if "deadline_not_near" in blockers or "deadline_missing" in blockers:
                counts["blocked_deadline_not_near"] += 1
            if "expired" in blockers:
                counts["blocked_expired"] += 1

        collection_plans = OpportunityCollectionSocialPostPlan.objects.select_related(
            "collection",
        ).prefetch_related("collection__items__opportunity").filter(
            platform=DEFAULT_PLATFORM,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
        )
        for plan in collection_plans:
            eligibility = evaluate_collection_auto_post_eligibility(plan)
            if eligibility["auto_post_eligible"]:
                counts["eligible_auto_post_plans"] += 1
            blockers = eligibility["blocking_reasons"]
            if "collection_missing_image" in blockers:
                counts["blocked_collection_missing_image"] += 1
            if "collection_no_near_deadline_item" in blockers:
                counts["blocked_collection_no_near_deadline_item"] += 1
        return counts
