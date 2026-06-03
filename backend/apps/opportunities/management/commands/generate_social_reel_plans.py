from django.core.management.base import BaseCommand, CommandError

from apps.opportunities.models import OpportunityReelLog, OpportunityReelPlan
from apps.opportunities.services.social_reel_planning import generate_social_reel_plans


class Command(BaseCommand):
    help = "Generate automatic short Scholars Republic social reel plans."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=1)
        parser.add_argument(
            "--reel-type",
            choices=[
                "auto",
                OpportunityReelPlan.ReelType.CLOSING_SOON,
                OpportunityReelPlan.ReelType.PREPARE_EARLY,
                OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP,
            ],
            default="auto",
        )
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--render", action="store_true")
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--date", type=str, default=None, help="Selection date in YYYY-MM-DD.")
        parser.add_argument("--template-key", type=str, default="", help="Force a recognized reel template key.")

    def handle(self, *args, **options):
        if options["limit"] < 1:
            raise CommandError("--limit must be greater than 0.")

        result = generate_social_reel_plans(
            reel_type=options["reel_type"],
            limit=options["limit"],
            dry_run=options["dry_run"],
            render=options["render"],
            force=options["force"],
            run_date=options["date"],
            template_key=options["template_key"],
        )

        self.stdout.write("Automatic social reel planning")
        self.stdout.write(f"Dry run: {'yes' if options['dry_run'] else 'no'}")
        self.stdout.write(f"Reel type: {options['reel_type']}")
        self.stdout.write(f"Template key: {options['template_key'] or 'automatic'}")
        self.stdout.write(f"Created: {result['created_count']}")
        self.stdout.write(f"Rendered: {result['rendered_count']}")
        self.stdout.write(
            "Skipped reasons: "
            + (", ".join(result["skipped_reasons"]) if result["skipped_reasons"] else "-")
        )

        for plan in result["plans"]:
            prefix = "Preview" if options["dry_run"] or not plan.get("id") else f"Plan #{plan['id']}"
            render_payload = latest_render_payload(plan.get("id"))
            renderer_used = render_payload.get("renderer_used") or "-"
            video_path = render_payload.get("video_file") or plan.get("video_url") or "-"
            self.stdout.write(
                f"{prefix}: {plan['reel_type']} | template={plan.get('template_key') or '-'} | "
                f"expected_duration={plan.get('expected_duration_seconds')}s | status={plan.get('status')} | "
                f"renderer={renderer_used} | video={video_path} | source_ids={plan.get('source_opportunity_ids')}"
            )
            if plan.get("skip_reason"):
                self.stdout.write(f"  skip_reason={plan['skip_reason']}")
            for opportunity in plan.get("source_opportunities", []):
                self.stdout.write(
                    "  - "
                    f"#{opportunity['id']} {opportunity['short_title']} | "
                    f"{opportunity['deadline_window']} | "
                    f"days={opportunity['days_until_deadline']} | "
                    f"score={opportunity['priority_score']}"
                )


def latest_render_payload(plan_id):
    if not plan_id:
        return {}
    log = (
        OpportunityReelLog.objects.filter(reel_plan_id=plan_id, status=OpportunityReelLog.Status.RENDERED)
        .order_by("-created_at")
        .first()
    )
    if not log or not isinstance(log.response_payload, dict):
        return {}
    return log.response_payload
