from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.desktop_automation.models import DesktopAutomationJob


class Command(BaseCommand):
    help = "Recover desktop automation jobs stuck in running state."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=10)
        parser.add_argument(
            "--fail",
            action="store_true",
            help="Fail stale jobs instead of requeueing them.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving.",
        )

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=options["minutes"])
        stale_jobs = DesktopAutomationJob.objects.filter(
            status=DesktopAutomationJob.Status.RUNNING,
            started_at__lt=cutoff,
        ).order_by("started_at")

        count = stale_jobs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS("No stale running jobs found."))
            return

        self.stdout.write(f"Found {count} stale running job(s).")

        for job in stale_jobs:
            action = "fail" if options["fail"] or job.attempts >= job.max_attempts else "requeue"
            self.stdout.write(
                f"Job #{job.id}: started_at={job.started_at}, attempts={job.attempts}, action={action}"
            )

            if options["dry_run"]:
                continue

            if action == "fail":
                public_message = (
                    "Our AI system is temporarily unavailable. Please try again later."
                )
                job.status = DesktopAutomationJob.Status.FAILED
                job.failed_at = timezone.now()
                job.error_message = (
                    f"Recovered stale running job after {options['minutes']} minutes; marked failed."
                )
                job.result_payload = {
                    "ok": False,
                    "text": public_message,
                    "user_message": public_message,
                    "source": "desktop-worker-stale-recovery",
                }
                job.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_message",
                        "result_payload",
                        "updated_at",
                    ]
                )
            else:
                job.status = DesktopAutomationJob.Status.QUEUED
                job.claimed_by = ""
                job.claimed_at = None
                job.started_at = None
                job.error_message = (
                    f"Recovered stale running job after {options['minutes']} minutes; requeued."
                )
                job.save(
                    update_fields=[
                        "status",
                        "claimed_by",
                        "claimed_at",
                        "started_at",
                        "error_message",
                        "updated_at",
                    ]
                )

        self.stdout.write(self.style.SUCCESS("Recovery complete."))
