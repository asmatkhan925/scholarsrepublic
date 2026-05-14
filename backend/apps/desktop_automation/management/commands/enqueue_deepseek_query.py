from django.core.management.base import BaseCommand, CommandError

from apps.desktop_automation.models import DesktopAutomationJob


class Command(BaseCommand):
    help = "Queue a DeepSeek query for the trusted desktop worker."

    def add_arguments(self, parser):
        parser.add_argument("query", nargs="+", help="Prompt/query to send to DeepSeek.")
        parser.add_argument("--priority", type=int, default=0)

    def handle(self, *args, **options):
        query = " ".join(options["query"]).strip()

        if not query:
            raise CommandError("Query cannot be empty.")

        job = DesktopAutomationJob.objects.create(
            kind="deepseek_query",
            priority=options["priority"],
            input_payload={"query": query},
        )

        self.stdout.write(
            self.style.SUCCESS(f"Queued DeepSeek desktop job #{job.pk}")
        )
