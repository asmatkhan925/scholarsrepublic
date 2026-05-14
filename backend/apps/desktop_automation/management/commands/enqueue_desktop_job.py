import json

from django.core.management.base import BaseCommand, CommandError

from apps.desktop_automation.models import DesktopAutomationJob


class Command(BaseCommand):
    help = "Queue a desktop automation job for the trusted WSL/Desktop worker."

    def add_arguments(self, parser):
        parser.add_argument("--kind", default="echo")
        parser.add_argument("--priority", type=int, default=0)
        parser.add_argument(
            "--payload",
            default="{}",
            help='JSON payload, for example: {"query":"hello"}',
        )

    def handle(self, *args, **options):
        try:
            payload = json.loads(options["payload"])
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON payload: {exc}") from exc

        job = DesktopAutomationJob.objects.create(
            kind=options["kind"],
            priority=options["priority"],
            input_payload=payload,
        )

        self.stdout.write(
            self.style.SUCCESS(f"Queued desktop automation job #{job.pk}")
        )
