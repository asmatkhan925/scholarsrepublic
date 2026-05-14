from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from config.views import health_check

urlpatterns = [
    path("api/reference/", include("apps.reference_data.urls")),
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="api-health"),
    path("api/auth/", include("apps.users.urls")),
    path("api/profile/", include("apps.profiles.urls")),
    path("api/", include("apps.applications.urls")),
    path("api/", include("apps.opportunities.urls")),
    path("api/ai/", include("apps.ai_tools.urls")),
    path("api/internal/desktop-worker/", include("apps.desktop_automation.urls")),
]

if settings.DEBUG:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
