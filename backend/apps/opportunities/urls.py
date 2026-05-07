from django.urls import path

from apps.opportunities.views import (
    AdminOpportunityDetailView,
    AdminOpportunityListCreateView,
    PublicOpportunityDetailView,
    PublicOpportunityListView,
    PublicScholarshipDetailView,
    PublicScholarshipListView,
)

urlpatterns = [
    path("opportunities/", PublicOpportunityListView.as_view(), name="opportunity-list"),
    path(
        "opportunities/<slug:slug>/",
        PublicOpportunityDetailView.as_view(),
        name="opportunity-detail",
    ),
    path("scholarships/", PublicScholarshipListView.as_view(), name="scholarship-list"),
    path(
        "scholarships/<slug:slug>/",
        PublicScholarshipDetailView.as_view(),
        name="scholarship-detail",
    ),
    path(
        "admin/opportunities/",
        AdminOpportunityListCreateView.as_view(),
        name="admin-opportunity-list",
    ),
    path(
        "admin/opportunities/<int:pk>/",
        AdminOpportunityDetailView.as_view(),
        name="admin-opportunity-detail",
    ),
]
