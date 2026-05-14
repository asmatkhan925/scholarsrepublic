import json

from django.core.management.base import BaseCommand, CommandError

from apps.desktop_automation.models import DesktopAutomationJob


class Command(BaseCommand):
    help = "Show desktop automation job status and user-facing result."

    def add_arguments(self, parser):
        parser.add_argument("job_id", type=int)

    def handle(self, *args, **options):
        try:
            job = DesktopAutomationJob.objects.get(id=options["job_id"])
        except DesktopAutomationJob.DoesNotExist as exc:
            raise CommandError("Job not found.") from exc

        payload = job.result_payload or {}
        user_message = (
            payload.get("user_message")
            or payload.get("text")
            or (
                "The job is still being processed."
                if job.status in {
                    DesktopAutomationJob.Status.QUEUED,
                    DesktopAutomationJob.Status.RUNNING,
                }
                else "No result message is available."
            )
        )

        self.stdout.write(f"id: {job.id}")
        self.stdout.write(f"kind: {job.kind}")
        self.stdout.write(f"status: {job.status}")
        self.stdout.write(f"claimed_by: {job.claimed_by}")
        self.stdout.write(f"user_message: {user_message}")

        if job.error_message:
            self.stdout.write("")
            self.stdout.write("internal_error:")
            self.stdout.write(job.error_message[:2000])

        self.stdout.write("")
        self.stdout.write("result_payload:")
        self.stdout.write(json.dumps(payload, indent=2, ensure_ascii=False))
