from django.urls import path

from apps.applications.views import OpportunitySaveView, ScholarshipSaveView
from apps.opportunities.views import (
    AdminOpportunityDetailView,
    AdminOpportunityListCreateView,
    OpportunityMatchView,
    PublicOpportunityDetailView,
    PublicOpportunityListView,
    PublicScholarshipDetailView,
    PublicScholarshipListView,
    RecommendedOpportunitiesView,
    RecommendedScholarshipsView,
    ScholarshipMatchView,
)

urlpatterns = [
    path("opportunities/", PublicOpportunityListView.as_view(), name="opportunity-list"),
    path(
        "opportunities/recommended/",
        RecommendedOpportunitiesView.as_view(),
        name="opportunity-recommended",
    ),
    path(
        "opportunities/<slug:slug>/match/",
        OpportunityMatchView.as_view(),
        name="opportunity-match",
    ),
    path(
        "opportunities/<slug:slug>/save/",
        OpportunitySaveView.as_view(),
        name="opportunity-save",
    ),
    path(
        "opportunities/<slug:slug>/",
        PublicOpportunityDetailView.as_view(),
        name="opportunity-detail",
    ),
    path("scholarships/", PublicScholarshipListView.as_view(), name="scholarship-list"),
    path(
        "scholarships/recommended/",
        RecommendedScholarshipsView.as_view(),
        name="scholarship-recommended",
    ),
    path(
        "scholarships/<slug:slug>/match/",
        ScholarshipMatchView.as_view(),
        name="scholarship-match",
    ),
    path(
        "scholarships/<slug:slug>/save/",
        ScholarshipSaveView.as_view(),
        name="scholarship-save",
    ),
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
