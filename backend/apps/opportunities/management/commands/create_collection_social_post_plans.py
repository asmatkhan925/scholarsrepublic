from datetime import date

from django.core.management.base import BaseCommand, CommandError

from apps.opportunities.models import OpportunityCollection
from apps.opportunities.services.social_collection_posting import (
    create_due_collection_social_post_plans,
)


class Command(BaseCommand):
    help = "Create Facebook social post plans for approved scholarship collections without posting."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview collection social post plans without saving them.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of plans to create.",
        )
        parser.add_argument(
            "--status",
            type=str,
            default=OpportunityCollection.Status.APPROVED,
            help="Collection status to evaluate. Defaults to approved.",
        )
        parser.add_argument(
            "--collection-id",
            type=int,
            default=None,
            help="Create a plan for one collection by ID.",
        )
        parser.add_argument(
            "--schedule-now",
            action="store_true",
            help="Set next_post_at to the current time.",
        )
        parser.add_argument(
            "--start-date",
            type=str,
            default=None,
            help="Schedule from this date in YYYY-MM-DD format.",
        )
        parser.add_argument(
            "--per-day",
            type=int,
            default=3,
            help="Number of collection plans to schedule per day. Defaults to 3.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Bypass duplicate active plan checks.",
        )

    def handle(self, *args, **options):
        start_date = None
        if options["start_date"]:
            try:
                start_date = date.fromisoformat(options["start_date"])
            except ValueError as exc:
                raise CommandError("--start-date must be in YYYY-MM-DD format.") from exc

        try:
            result = create_due_collection_social_post_plans(
                dry_run=options["dry_run"],
                limit=options["limit"],
                status=options["status"],
                collection_id=options["collection_id"],
                schedule_now=options["schedule_now"],
                start_date=start_date,
                per_day=options["per_day"],
                force=options["force"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write("Collection social post plan creation")
        self.stdout.write(f"Dry run: {'yes' if result['dry_run'] else 'no'}")
        self.stdout.write(f"Collections evaluated: {result['evaluated_count']}")
        self.stdout.write(f"Plans created: {result['created_count']}")
        self.stdout.write(f"Status filter: {options['status']}")
        if options["collection_id"]:
            self.stdout.write(f"Collection ID: {options['collection_id']}")
        if options["limit"]:
            self.stdout.write(f"Limit: {options['limit']}")
        if options["schedule_now"]:
            self.stdout.write("Schedule now: yes")
        elif start_date:
            self.stdout.write(f"Start date: {start_date.isoformat()}")
        self.stdout.write(f"Per day: {options['per_day']}")
        if options["force"]:
            self.stdout.write("Force: yes")

        if result["results"]:
            self.stdout.write("")
            self.stdout.write("Plan results:")
            for item in result["results"]:
                collection = item["collection"]
                plan = item["plan"]
                blockers = ", ".join(item["eligibility"]["blockers"]) or "-"
                created = "yes" if item["created"] else "no"
                next_post_at = plan.next_post_at.isoformat() if plan and plan.next_post_at else "-"
                link_url = plan.link_url if plan else "-"
                self.stdout.write(
                    " - "
                    f"id={collection.pk}; "
                    f"title={collection.title}; "
                    f"created={created}; "
                    f"blockers={blockers}; "
                    f"next_post_at={next_post_at}; "
                    f"url={link_url}"
                )
