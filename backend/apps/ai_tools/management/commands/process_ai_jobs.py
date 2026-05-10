import os
import time

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.ai_tools.models import AIJob


def get_ai_setting(name: str, default=None):
    return getattr(settings, name, os.getenv(name, default))


class Command(BaseCommand):
    help = "Process Scholars Republic AI jobs one by one."

    def add_arguments(self, parser):
        parser.add_argument(
            "--sleep",
            type=int,
            default=3,
            help="Seconds to sleep when no pending jobs exist.",
        )

    def handle(self, *args, **options):
        sleep_seconds = options["sleep"]

        ai_service_url = str(get_ai_setting("AI_SERVICE_URL", "")).rstrip("/")
        ai_service_token = str(get_ai_setting("AI_SERVICE_TOKEN", ""))

        if not ai_service_url:
            raise RuntimeError("AI_SERVICE_URL is not configured.")

        if not ai_service_token:
            raise RuntimeError("AI_SERVICE_TOKEN is not configured.")

        self.stdout.write(self.style.SUCCESS("AI worker started."))

        while True:
            job = self.get_next_job()

            if not job:
                time.sleep(sleep_seconds)
                continue

            self.process_job(job, ai_service_url, ai_service_token)

    def get_next_job(self):
        with transaction.atomic():
            job = (
                AIJob.objects.select_for_update(skip_locked=True)
                .filter(status=AIJob.Status.PENDING)
                .order_by("created_at")
                .first()
            )

            if not job:
                return None

            job.status = AIJob.Status.RUNNING
            job.started_at = timezone.now()
            job.error_message = ""
            job.save(update_fields=["status", "started_at", "error_message"])

            return job

    def process_job(self, job, ai_service_url, ai_service_token):
        self.stdout.write(f"Processing AI job {job.id} ({job.tool_type})")

        endpoint = None

        if job.tool_type == AIJob.ToolType.SOP_GENERATE:
            endpoint = f"{ai_service_url}/sop/generate"
        else:
            job.status = AIJob.Status.FAILED
            job.error_message = f"Unsupported AI tool type: {job.tool_type}"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at"])
            return

        try:
            response = requests.post(
                endpoint,
                json=job.request_payload,
                headers={
                    "Authorization": f"Bearer {ai_service_token}",
                    "Content-Type": "application/json",
                },
                timeout=600,
            )
            response.raise_for_status()
            data = response.json()

            usage = data.get("usage", {}) or {}

            job.status = AIJob.Status.SUCCESS
            job.result_text = data.get("result", "")
            job.error_message = ""
            job.prompt_tokens = int(usage.get("prompt_tokens") or 0)
            job.completion_tokens = int(usage.get("completion_tokens") or 0)
            job.total_tokens = int(usage.get("total_tokens") or 0)
            job.elapsed_seconds = data.get("elapsed_seconds")
            job.finished_at = timezone.now()
            job.save(
                update_fields=[
                    "status",
                    "result_text",
                    "error_message",
                    "prompt_tokens",
                    "completion_tokens",
                    "total_tokens",
                    "elapsed_seconds",
                    "finished_at",
                ]
            )

            self.stdout.write(self.style.SUCCESS(f"AI job {job.id} completed."))

        except requests.exceptions.ConnectionError as exc:
            job.status = AIJob.Status.FAILED
            job.error_message = (
                "The AI server is currently offline. Please try again later."
            )
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at"])

            self.stdout.write(self.style.ERROR(f"AI job {job.id} failed: AI server offline: {exc}"))

        except requests.exceptions.Timeout as exc:
            job.status = AIJob.Status.FAILED
            job.error_message = (
                "The AI server is taking too long to respond. Please try again later."
            )
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at"])

            self.stdout.write(self.style.ERROR(f"AI job {job.id} failed: AI server timeout: {exc}"))

        except requests.exceptions.RequestException as exc:
            job.status = AIJob.Status.FAILED
            job.error_message = (
                "The AI service is temporarily unavailable. Please try again later."
            )
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at"])

            self.stdout.write(self.style.ERROR(f"AI job {job.id} failed: AI request error: {exc}"))

        except Exception as exc:
            job.status = AIJob.Status.FAILED
            job.error_message = (
                "Something went wrong while generating your SOP. Please try again later."
            )
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "finished_at"])

            self.stdout.write(self.style.ERROR(f"AI job {job.id} failed: {exc}"))
