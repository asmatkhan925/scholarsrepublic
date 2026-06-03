from django.core.management.base import BaseCommand

from apps.opportunities.models import OpportunityReelLog, OpportunityReelPlan
from apps.opportunities.services.social_reel_rendering import expected_reel_duration, render_reel_plan


class Command(BaseCommand):
    help = "Render low-cost Scholars Republic social reels as 1080x1920 MP4 files."

    def add_arguments(self, parser):
        parser.add_argument("--plan-id", type=int, default=None, help="Render one reel plan by ID.")
        parser.add_argument("--limit", type=int, default=10, help="Maximum queued plans to render.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List matching plans without rendering MP4 files.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-render plans that already have rendered video files.",
        )

    def handle(self, *args, **options):
        queryset = OpportunityReelPlan.objects.all().order_by("-priority_score", "created_at")
        if options["plan_id"]:
            queryset = queryset.filter(pk=options["plan_id"])
        elif not options["force"]:
            queryset = queryset.filter(
                status__in=[
                    OpportunityReelPlan.Status.READY_FOR_RENDER,
                    OpportunityReelPlan.Status.FAILED,
                ]
            )

        limit = max(1, int(options["limit"] or 10))
        plans = list(queryset[:limit])

        if options["dry_run"]:
            self.stdout.write(f"Matched {len(plans)} reel plan(s):")
            for plan in plans:
                try:
                    duration = expected_reel_duration(plan)
                except Exception as exc:
                    duration = f"error: {exc}"
                self.stdout.write(
                    f"- #{plan.pk} {plan.status} {plan.reel_type}: {plan.title} "
                    f"expected_duration={duration}s"
                )
                OpportunityReelLog.objects.create(
                    reel_plan=plan,
                    status=OpportunityReelLog.Status.SKIPPED,
                    response_payload={"reason": "dry_run"},
                )
            return

        rendered = 0
        skipped = 0
        failed = 0
        for plan in plans:
            try:
                result = render_reel_plan(plan, force=options["force"])
                if result.get("skipped"):
                    skipped += 1
                    self.stdout.write(f"Skipped #{plan.pk}: already rendered")
                else:
                    rendered += 1
                    self.stdout.write(
                        f"Rendered #{plan.pk}: {result.get('video_file')} "
                        f"({result.get('duration_seconds')}s) "
                        f"status={result.get('status')} "
                        f"audio={'yes' if result.get('audio_added') else 'silent'}"
                    )
            except Exception as exc:
                failed += 1
                self.stderr.write(f"Failed #{plan.pk}: {exc}")

        self.stdout.write(f"Rendered: {rendered}")
        self.stdout.write(f"Skipped: {skipped}")
        self.stdout.write(f"Failed: {failed}")
