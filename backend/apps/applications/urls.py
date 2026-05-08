from django.urls import path

from apps.applications.views import (
    SavedOpportunityDetailView,
    SavedOpportunityListCreateView,
    SavedOpportunitySlugsView,
)

urlpatterns = [
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
]
