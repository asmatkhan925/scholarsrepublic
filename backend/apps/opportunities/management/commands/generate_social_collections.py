from django.core.management.base import BaseCommand, CommandError

from apps.opportunities.models import OpportunityCollection
from apps.opportunities.services.social_collections import generate_social_collections


class Command(BaseCommand):
    help = "Generate reviewable scholarship collections from collection-candidate social plans."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview collections without saving them.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of collections to generate.",
        )
        parser.add_argument(
            "--min-size",
            type=int,
            default=3,
            help="Minimum scholarships per collection. Defaults to 3.",
        )
        parser.add_argument(
            "--max-size",
            type=int,
            default=5,
            help="Maximum scholarships per collection. Defaults to 5.",
        )
        parser.add_argument(
            "--status",
            type=str,
            default=OpportunityCollection.Status.READY,
            help="Status for saved collections. Defaults to ready.",
        )
        parser.add_argument(
            "--country",
            type=str,
            default="",
            help="Only use candidates from this country.",
        )
        parser.add_argument(
            "--degree-level",
            type=str,
            default="",
            help="Only use candidates matching this exact degree level.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Ignore active collection exclusions and existing group checks.",
        )
        parser.add_argument(
            "--auto-approve",
            action="store_true",
            help="Immediately approve generated collections that pass quality checks.",
        )

    def handle(self, *args, **options):
        try:
            result = generate_social_collections(
                dry_run=options["dry_run"],
                limit=options["limit"],
                min_size=options["min_size"],
                max_size=options["max_size"],
                status=options["status"],
                country=options["country"],
                degree_level=options["degree_level"],
                force=options["force"],
                auto_approve=options["auto_approve"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write("Smart social collection generation")
        self.stdout.write(f"Dry run: {'yes' if result['dry_run'] else 'no'}")
        self.stdout.write(f"Eligible candidate plans: {result['eligible_count']}")
        self.stdout.write(f"Collections previewed: {result['preview_count']}")
        self.stdout.write(f"Collections created: {result['created_count']}")
        self.stdout.write(f"Collections auto-approved: {result['auto_approved_count']}")
        if options["country"]:
            self.stdout.write(f"Country filter: {options['country']}")
        if options["degree_level"]:
            self.stdout.write(f"Degree filter: {options['degree_level']}")
        if options["limit"]:
            self.stdout.write(f"Limit: {options['limit']}")
        if options["force"]:
            self.stdout.write("Force: yes")
        if options["auto_approve"]:
            self.stdout.write("Auto approve: yes")

        if result["previews"]:
            self.stdout.write("")
            self.stdout.write("Generated collection previews:")
            for index, preview in enumerate(result["previews"], start=1):
                plan_ids = ", ".join(str(plan.pk) for plan in preview["plans"])
                opportunity_ids = ", ".join(
                    str(plan.opportunity_id) for plan in preview["plans"]
                )
                self.stdout.write(
                    " - "
                    f"{index}. {preview['title']} "
                    f"({preview['collection_type']}; "
                    f"items={len(preview['plans'])}; "
                    f"priority_score={preview['priority_score']}; "
                    f"plan_ids={plan_ids}; "
                    f"opportunity_ids={opportunity_ids})"
                )

        if result["auto_approval_evaluations"]:
            self.stdout.write("")
            self.stdout.write("Auto-approval evaluations:")
            for item in result["auto_approval_evaluations"]:
                collection = item["collection"]
                evaluation = item["evaluation"]
                title = collection.title if collection else "preview"
                self.stdout.write(
                    " - "
                    f"{title}: "
                    f"can_auto_approve={evaluation['can_auto_approve']}; "
                    f"score={evaluation['score']}; "
                    f"blockers={', '.join(evaluation['blockers']) or '-'}"
                )
