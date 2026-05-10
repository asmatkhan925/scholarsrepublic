from django.urls import path

from .views import AIHealthView, AIJobDetailView, SOPGenerateView

urlpatterns = [
    path("health/", AIHealthView.as_view(), name="ai-health"),
    path("sop/generate/", SOPGenerateView.as_view(), name="ai-sop-generate"),
    path("jobs/<int:job_id>/", AIJobDetailView.as_view(), name="ai-job-detail"),
]
