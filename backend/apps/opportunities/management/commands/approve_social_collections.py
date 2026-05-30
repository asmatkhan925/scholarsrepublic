from django.core.management.base import BaseCommand, CommandError

from apps.opportunities.services.social_collections import approve_social_collections


class Command(BaseCommand):
    help = "Auto-approve high-confidence reviewable scholarship collections."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Evaluate collections without saving approvals.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of collections to evaluate.",
        )
        parser.add_argument(
            "--min-score",
            type=int,
            default=None,
            help="Optional minimum auto-approval score override.",
        )
        parser.add_argument(
            "--include-ready",
            action="store_true",
            help="Evaluate ready collections in addition to draft collections.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Bypass approved/posted duplicate opportunity blocker.",
        )
        parser.add_argument(
            "--collection-id",
            type=int,
            default=None,
            help="Evaluate a single collection by ID.",
        )

    def handle(self, *args, **options):
        try:
            result = approve_social_collections(
                dry_run=options["dry_run"],
                limit=options["limit"],
                min_score=options["min_score"],
                include_ready=options["include_ready"],
                force=options["force"],
                collection_id=options["collection_id"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write("Smart social collection auto-approval")
        self.stdout.write(f"Dry run: {'yes' if result['dry_run'] else 'no'}")
        self.stdout.write(f"Collections evaluated: {result['evaluated_count']}")
        self.stdout.write(f"Collections approved: {result['approved_count']}")
        if options["include_ready"]:
            self.stdout.write("Include ready: yes")
        if options["force"]:
            self.stdout.write("Force: yes")
        if options["min_score"] is not None:
            self.stdout.write(f"Minimum score override: {options['min_score']}")
        if options["collection_id"]:
            self.stdout.write(f"Collection ID: {options['collection_id']}")

        if result["results"]:
            self.stdout.write("")
            self.stdout.write("Evaluations:")
            for item in result["results"]:
                collection = item["collection"]
                evaluation = item["evaluation"]
                self.stdout.write(
                    " - "
                    f"id={collection.pk}; "
                    f"title={collection.title}; "
                    f"can_auto_approve={evaluation['can_auto_approve']}; "
                    f"score={evaluation['score']}; "
                    f"blockers={', '.join(evaluation['blockers']) or '-'}"
                )
