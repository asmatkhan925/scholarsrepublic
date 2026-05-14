from django.urls import path

from apps.desktop_automation.views import (
    ClaimDesktopJobView,
    CompleteDesktopJobView,
    DesktopWorkerHealthView,
    DesktopWorkerHeartbeatView,
    FailDesktopJobView,
)

urlpatterns = [
    path("health/", DesktopWorkerHealthView.as_view(), name="desktop-worker-health"),
    path("heartbeat/", DesktopWorkerHeartbeatView.as_view(), name="desktop-worker-heartbeat"),
    path("claim/", ClaimDesktopJobView.as_view(), name="desktop-worker-claim"),
    path("complete/", CompleteDesktopJobView.as_view(), name="desktop-worker-complete"),
    path("fail/", FailDesktopJobView.as_view(), name="desktop-worker-fail"),
]
