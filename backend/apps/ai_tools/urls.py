from django.urls import path

from .views import (
    AIHealthView,
    AIJobDetailView,
    SOPDraftDetailView,
    SOPDraftListCreateView,
    SOPGenerateView,
)

urlpatterns = [
    path("health/", AIHealthView.as_view(), name="ai-health"),
    path("sop/generate/", SOPGenerateView.as_view(), name="ai-sop-generate"),
    path("sop-drafts/", SOPDraftListCreateView.as_view(), name="ai-sop-draft-list"),
    path(
        "sop-drafts/<int:draft_id>/",
        SOPDraftDetailView.as_view(),
        name="ai-sop-draft-detail",
    ),
    path("jobs/<int:job_id>/", AIJobDetailView.as_view(), name="ai-job-detail"),
]
