from django.core.management.base import BaseCommand

from apps.opportunities.models import OpportunitySocialPostPlan
from apps.opportunities.services.social_posting import (
    DEFAULT_PLATFORM,
    generate_facebook_post_text,
    scholarship_detail_url,
)


class Command(BaseCommand):
    help = "Regenerate professional Facebook post text for social post plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-empty",
            action="store_true",
            help="Only regenerate plans where post_text is empty.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N matching plans.",
        )
        parser.add_argument(
            "--include-expired",
            action="store_true",
            help="Include expired scholarships. Expired scholarships are skipped by default.",
        )

    def handle(self, *args, **options):
        queryset = (
            OpportunitySocialPostPlan.objects.select_related("opportunity")
            .filter(platform=DEFAULT_PLATFORM)
            .order_by("id")
        )
        if options["only_empty"]:
            queryset = queryset.filter(post_text="")

        limit = options["limit"]
        if limit:
            queryset = queryset[: max(1, int(limit))]

        updated = 0
        skipped = 0
        failed = 0
        for plan in queryset:
            if plan.opportunity.is_expired and not options["include_expired"]:
                skipped += 1
                continue

            try:
                link_url = plan.link_url or scholarship_detail_url(plan.opportunity)
                post_text = generate_facebook_post_text(plan.opportunity, link_url)
                if not post_text:
                    plan.last_error = "Facebook caption could not be generated from scholarship fields."
                    plan.save(update_fields=["last_error", "updated_at"])
                    failed += 1
                    continue

                plan.post_text = post_text
                plan.link_url = link_url
                plan.last_error = ""
                plan.save(update_fields=["post_text", "link_url", "last_error", "updated_at"])
                updated += 1
            except Exception as exc:
                plan.last_error = str(exc)
                plan.save(update_fields=["last_error", "updated_at"])
                failed += 1

        self.stdout.write(f"Social post text regenerated: {updated}")
        self.stdout.write(f"Skipped: {skipped}")
        self.stdout.write(f"Failed: {failed}")
