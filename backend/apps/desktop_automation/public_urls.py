from django.urls import path

from apps.desktop_automation.public_views import (
    DeepSeekJobCreateView,
    DesktopJobCancelView,
    DesktopJobStatusView,
    DesktopWorkerPublicStatusView,
    MyDesktopJobsView,
)

urlpatterns = [
    path("deepseek-jobs/", DeepSeekJobCreateView.as_view(), name="desktop-deepseek-job-create"),
    path("jobs/", MyDesktopJobsView.as_view(), name="my-desktop-jobs"),
    path("jobs/<int:job_id>/", DesktopJobStatusView.as_view(), name="desktop-job-status"),
    path("jobs/<int:job_id>/cancel/", DesktopJobCancelView.as_view(), name="desktop-job-cancel"),
    path("workers/status/", DesktopWorkerPublicStatusView.as_view(), name="desktop-worker-public-status"),
]
