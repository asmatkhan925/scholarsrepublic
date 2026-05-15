from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.desktop_automation.models import DesktopAutomationJob, DesktopWorkerHeartbeat
from apps.users.models import User


@override_settings(DESKTOP_WORKER_TOKEN="test-desktop-worker-token")
class DesktopAutomationPublicAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="student@example.com",
            password="StrongPassword123!",
            full_name="Student User",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            full_name="Other User",
        )
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="StrongPassword123!",
            full_name="Staff User",
            is_staff=True,
            role=User.Role.ADMIN,
        )

    def create_recent_worker_heartbeat(self):
        return DesktopWorkerHeartbeat.objects.create(
            worker_id="test-worker",
            status="idle",
            last_seen_at=timezone.now(),
        )

    def create_deepseek_job(
        self,
        *,
        user=None,
        status_value=DesktopAutomationJob.Status.QUEUED,
        created_at=None,
        result_payload=None,
    ):
        job = DesktopAutomationJob.objects.create(
            kind="deepseek_query",
            status=status_value,
            input_payload={"query": "Write a scholarship SOP."},
            result_payload=result_payload or {},
            created_by=user or self.user,
        )

        if created_at is not None:
            DesktopAutomationJob.objects.filter(pk=job.pk).update(created_at=created_at)
            job.refresh_from_db()

        return job

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.user)

    def authenticate_worker(self):
        self.client.credentials(HTTP_X_DESKTOP_WORKER_TOKEN="test-desktop-worker-token")

    def post_deepseek_job(self):
        return self.client.post(
            reverse("desktop-deepseek-job-create"),
            {"query": "Write a scholarship SOP for my degree."},
            format="json",
        )

    def test_unauthenticated_user_cannot_create_deepseek_job(self):
        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(DesktopAutomationJob.objects.count(), 0)

    def test_authenticated_user_cannot_create_job_without_online_worker(self):
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "offline")
        self.assertEqual(DesktopAutomationJob.objects.count(), 0)

    def test_authenticated_user_can_create_job_with_recent_worker_heartbeat(self):
        self.create_recent_worker_heartbeat()
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], DesktopAutomationJob.Status.QUEUED)

        job = DesktopAutomationJob.objects.get(pk=response.data["job_id"])
        self.assertEqual(job.kind, "deepseek_query")
        self.assertEqual(job.created_by, self.user)
        self.assertEqual(job.input_payload["query"], "Write a scholarship SOP for my degree.")

    def test_user_cannot_create_more_than_one_active_deepseek_job(self):
        self.create_recent_worker_heartbeat()
        self.create_deepseek_job(status_value=DesktopAutomationJob.Status.QUEUED)
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["status"], "too_many_active_jobs")

    def test_user_cooldown_blocks_second_job_within_60_seconds(self):
        self.create_recent_worker_heartbeat()
        self.create_deepseek_job(
            status_value=DesktopAutomationJob.Status.COMPLETED,
            created_at=timezone.now() - timedelta(seconds=10),
        )
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["status"], "cooldown")
        self.assertGreater(response.data["retry_after_seconds"], 0)

    def test_user_hourly_limit_blocks_after_10_jobs_in_one_hour(self):
        self.create_recent_worker_heartbeat()
        created_at = timezone.now() - timedelta(minutes=10)
        for index in range(10):
            self.create_deepseek_job(
                status_value=DesktopAutomationJob.Status.COMPLETED,
                created_at=created_at + timedelta(seconds=index),
            )
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["status"], "hourly_limit_reached")
        self.assertEqual(response.data["limit"], 10)

    def test_global_hourly_limit_blocks_after_60_jobs_in_one_hour(self):
        self.create_recent_worker_heartbeat()
        created_at = timezone.now() - timedelta(minutes=10)
        for index in range(60):
            self.create_deepseek_job(
                user=self.other_user,
                status_value=DesktopAutomationJob.Status.COMPLETED,
                created_at=created_at + timedelta(seconds=index),
            )
        self.authenticate()

        response = self.post_deepseek_job()

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["status"], "global_hourly_limit_reached")
        self.assertEqual(response.data["limit"], 60)

    def test_job_owner_can_view_own_job_status(self):
        job = self.create_deepseek_job()
        self.authenticate()

        response = self.client.get(reverse("desktop-job-status", kwargs={"job_id": job.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], job.id)

    def test_another_normal_user_cannot_view_someone_elses_job(self):
        job = self.create_deepseek_job()
        self.authenticate(self.other_user)

        response = self.client.get(reverse("desktop-job-status", kwargs={"job_id": job.id}))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_view_any_job(self):
        job = self.create_deepseek_job()
        self.authenticate(self.staff)

        response = self.client.get(reverse("desktop-job-status", kwargs={"job_id": job.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], job.id)

    def test_owner_can_cancel_queued_job(self):
        job = self.create_deepseek_job(status_value=DesktopAutomationJob.Status.QUEUED)
        self.authenticate()

        response = self.client.post(
            reverse("desktop-job-cancel", kwargs={"job_id": job.id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], DesktopAutomationJob.Status.CANCELED)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.CANCELED)
        self.assertEqual(job.result_payload["user_message"], "This AI request was canceled.")

    def test_owner_can_cancel_running_job(self):
        job = self.create_deepseek_job(status_value=DesktopAutomationJob.Status.RUNNING)
        self.authenticate()

        response = self.client.post(
            reverse("desktop-job-cancel", kwargs={"job_id": job.id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], DesktopAutomationJob.Status.CANCELED)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.CANCELED)

    def test_another_normal_user_cannot_cancel_someone_elses_job(self):
        job = self.create_deepseek_job(status_value=DesktopAutomationJob.Status.QUEUED)
        self.authenticate(self.other_user)

        response = self.client.post(
            reverse("desktop-job-cancel", kwargs={"job_id": job.id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.QUEUED)

    def test_cancel_preserves_canceled_state(self):
        existing_payload = {
            "ok": False,
            "text": "Already canceled.",
            "user_message": "Already canceled.",
        }
        job = self.create_deepseek_job(
            status_value=DesktopAutomationJob.Status.CANCELED,
            result_payload=existing_payload,
        )
        self.authenticate()

        response = self.client.post(
            reverse("desktop-job-cancel", kwargs={"job_id": job.id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], DesktopAutomationJob.Status.CANCELED)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.CANCELED)
        self.assertEqual(job.result_payload, existing_payload)

    def test_internal_fail_endpoint_does_not_overwrite_canceled_job_as_failed(self):
        existing_payload = {
            "ok": False,
            "text": "This AI request was canceled.",
            "user_message": "This AI request was canceled.",
        }
        job = self.create_deepseek_job(
            status_value=DesktopAutomationJob.Status.CANCELED,
            result_payload=existing_payload,
        )
        self.authenticate_worker()

        response = self.client.post(
            reverse("desktop-worker-fail"),
            {
                "job_id": job.id,
                "error_message": "DeepSeek failed after cancellation.",
                "public_message": "The request failed.",
                "retry": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.CANCELED)
        self.assertEqual(job.result_payload, existing_payload)

    def test_internal_complete_endpoint_does_not_overwrite_canceled_job_as_completed(self):
        existing_payload = {
            "ok": False,
            "text": "This AI request was canceled.",
            "user_message": "This AI request was canceled.",
        }
        job = self.create_deepseek_job(
            status_value=DesktopAutomationJob.Status.CANCELED,
            result_payload=existing_payload,
        )
        self.authenticate_worker()

        response = self.client.post(
            reverse("desktop-worker-complete"),
            {
                "job_id": job.id,
                "result_payload": {
                    "ok": True,
                    "text": "Completed SOP text.",
                    "user_message": "Completed SOP text.",
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        job.refresh_from_db()
        self.assertEqual(job.status, DesktopAutomationJob.Status.CANCELED)
        self.assertEqual(job.result_payload, existing_payload)
