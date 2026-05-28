from datetime import datetime, time, timedelta, timezone as dt_timezone

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunitySocialPostPlan
from apps.opportunities.services.social_posting import generate_facebook_post_text


SITE_URL = "https://scholarsrepublic.org"
POST_TIME = time(hour=9, minute=0, tzinfo=dt_timezone.utc)


class Command(BaseCommand):
    help = "Backfill ready Facebook social post plans for published active opportunities."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print plans that would be created without writing to the database.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N eligible opportunities.",
        )
        parser.add_argument(
            "--start-date",
            type=str,
            default=None,
            help=(
                "Optional first posting date in YYYY-MM-DD format when --stagger "
                "is used. Ignored by default."
            ),
        )
        parser.add_argument(
            "--per-day",
            type=int,
            default=1,
            help="Number of plans scheduled per day when --stagger is used. Defaults to 1.",
        )
        parser.add_argument(
            "--stagger",
            action="store_true",
            help=(
                "Optionally stagger next_post_at over future days. Production "
                "default is immediate eligibility."
            ),
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]
        per_day = options["per_day"]
        stagger = options["stagger"]
        start_date = self.parse_start_date(options["start_date"]) if stagger else None
        immediate_next_post_at = timezone.now()

        if limit is not None and limit < 1:
            raise CommandError("--limit must be greater than 0.")
        if per_day < 1:
            raise CommandError("--per-day must be greater than 0.")

        today = timezone.localdate()
        published = Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED)
        expired_check_statuses = [
            Opportunity.DeadlineCheckStatus.EXPIRED,
            Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
        ]
        active_published = published.filter(
            Q(deadline__isnull=True) | Q(deadline__gte=today)
        ).exclude(deadline_check_status__in=expired_check_statuses)
        expired_count = published.filter(
            Q(deadline__lt=today) | Q(deadline_check_status__in=expired_check_statuses)
        ).count()
        existing_count = (
            active_published.filter(social_post_plans__platform="facebook")
            .distinct()
            .count()
        )
        eligible_queryset = (
            active_published.exclude(social_post_plans__platform="facebook")
            .order_by("id")
            .distinct()
        )
        eligible_count = eligible_queryset.count()

        opportunities = list(eligible_queryset[:limit] if limit else eligible_queryset)

        self.stdout.write("Facebook social post plan backfill")
        self.stdout.write(f"Dry run: {'yes' if dry_run else 'no'}")
        self.stdout.write(f"Eligible opportunities found: {eligible_count}")
        self.stdout.write(f"Skipped because existing plan: {existing_count}")
        self.stdout.write(f"Skipped because expired: {expired_count}")
        self.stdout.write(
            "Scheduling: "
            + (
                f"staggered from {start_date.isoformat()} at {per_day} per day"
                if stagger
                else "immediate eligibility"
            )
        )
        if limit:
            self.stdout.write(f"Limit: {limit}")
        self.stdout.write("")

        plans_to_create = []
        for index, opportunity in enumerate(opportunities):
            next_post_at = (
                self.next_post_at(start_date, index, per_day)
                if stagger
                else immediate_next_post_at
            )
            plans_to_create.append(
                OpportunitySocialPostPlan(
                    opportunity=opportunity,
                    platform="facebook",
                    enabled=True,
                    status=OpportunitySocialPostPlan.Status.READY,
                    image_url="",
                    link_url=self.link_url(opportunity),
                    next_post_at=next_post_at,
                    post_text=generate_facebook_post_text(
                        opportunity,
                        self.link_url(opportunity),
                    ),
                )
            )
            self.stdout.write(
                " - "
                f"id={opportunity.id}; "
                f"slug={opportunity.slug}; "
                f"next_post_at={next_post_at.isoformat()}"
            )

        created_count = 0
        if plans_to_create and not dry_run:
            with transaction.atomic():
                OpportunitySocialPostPlan.objects.bulk_create(plans_to_create)
            created_count = len(plans_to_create)

        self.stdout.write("")
        self.stdout.write(f"Plans created: {created_count}")
        self.stdout.write(f"Dry-run status: {'enabled' if dry_run else 'disabled'}")

    def parse_start_date(self, value):
        if not value:
            return timezone.now().astimezone(dt_timezone.utc).date() + timedelta(days=1)

        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as exc:
            raise CommandError("--start-date must use YYYY-MM-DD format.") from exc

    def next_post_at(self, start_date, index, per_day):
        day_offset = index // per_day
        post_date = start_date + timedelta(days=day_offset)
        return datetime.combine(post_date, POST_TIME)

    def link_url(self, opportunity):
        return f"{SITE_URL}/scholarships/{opportunity.slug}/"
