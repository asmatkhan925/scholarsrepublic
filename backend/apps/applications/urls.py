from django.urls import path

from apps.applications.views import (
    ApplicationSummaryView,
    OpportunityApplicationDetailView,
    OpportunityApplicationListCreateView,
    SavedOpportunityDetailView,
    SavedOpportunityListCreateView,
    SavedOpportunitySlugsView,
    StartApplicationFromSavedView,
)

urlpatterns = [
    path(
        "applications/",
        OpportunityApplicationListCreateView.as_view(),
        name="application-list",
    ),
    path(
        "applications/summary/",
        ApplicationSummaryView.as_view(),
        name="application-summary",
    ),
    path(
        "applications/<int:pk>/",
        OpportunityApplicationDetailView.as_view(),
        name="application-detail",
    ),
    path(
        "saved-opportunities/",
        SavedOpportunityListCreateView.as_view(),
        name="saved-opportunity-list",
    ),
    path(
        "saved-opportunities/slugs/",
        SavedOpportunitySlugsView.as_view(),
        name="saved-opportunity-slugs",
    ),
    path(
        "saved-opportunities/<int:pk>/",
        SavedOpportunityDetailView.as_view(),
        name="saved-opportunity-detail",
    ),
    path(
        "saved-opportunities/<int:pk>/start-application/",
        StartApplicationFromSavedView.as_view(),
        name="start-application-from-saved",
    ),
]
