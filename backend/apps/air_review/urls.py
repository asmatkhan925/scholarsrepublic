from django.urls import path

from apps.air_review import views

# Mounted at /api/air/ by config/urls.py
urlpatterns = [
    path("", views.index, name="air-index"),
    path("health", views.health, name="air-health"),
    path("latest", views.latest, name="air-latest"),
    path("manifest", views.manifest, name="air-manifest"),
    path("file", views.file, name="air-file"),
    path("refresh", views.refresh, name="air-refresh"),
    # Trailing-slash variants so callers don't get a redirect either way.
    path("health/", views.health),
    path("latest/", views.latest),
    path("manifest/", views.manifest),
    path("file/", views.file),
    path("refresh/", views.refresh),
]
