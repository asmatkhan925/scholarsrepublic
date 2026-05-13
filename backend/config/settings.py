import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_list(name: str, default: str | list[str] | None = None) -> list[str]:
    value = os.getenv(name)
    if value is None:
        if default is None:
            return []
        if isinstance(default, list):
            return default
        value = default
    return [item.strip() for item in value.split(",") if item.strip()]


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


def env_has_value(*names: str) -> bool:
    return any(os.getenv(name, "").strip() for name in names)


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", os.getenv("SECRET_KEY", "dev-only-insecure-key"))
DEBUG = env_bool("DJANGO_DEBUG", env_bool("DEBUG", True))
ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    env_list("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver"),
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "apps.users",
    "apps.profiles",
    "apps.reference_data",
    "apps.opportunities",
    "apps.scholarships",
    "apps.applications",
    "apps.services",
    "apps.blog",
    "apps.ai_tools.apps.AiToolsConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DATABASE_NAME", "scholars_republic"),
        "USER": os.getenv("DATABASE_USER", "postgres"),
        "PASSWORD": os.getenv("DATABASE_PASSWORD", "postgres"),
        "HOST": os.getenv("DATABASE_HOST", "localhost"),
        "PORT": os.getenv("DATABASE_PORT", "5432"),
        "CONN_MAX_AGE": env_int("DATABASE_CONN_MAX_AGE", 60),
        "OPTIONS": {
            "connect_timeout": env_int("DATABASE_CONNECT_TIMEOUT_SECONDS", 5),
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = os.getenv("STATIC_URL", "/static/")
STATIC_ROOT = Path(
    os.getenv(
        "STATIC_ROOT",
        "/var/www/scholarsrepublic/staticfiles" if not DEBUG else str(BASE_DIR / "staticfiles"),
    )
)
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = Path(
    os.getenv(
        "MEDIA_ROOT",
        "/var/www/scholarsrepublic/media" if not DEBUG else str(BASE_DIR / "media"),
    )
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    ["http://localhost:3000"] if DEBUG else [],
)
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [])

if not DEBUG:
    if not env_has_value("DJANGO_SECRET_KEY", "SECRET_KEY") or SECRET_KEY in {
        "dev-only-insecure-key",
        "change-me",
        "change-me-only-for-local-development",
    }:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set to a safe value when DEBUG=False.")

    unsafe_hosts = {"localhost", "127.0.0.1", "testserver"}
    if (
        not env_has_value("DJANGO_ALLOWED_HOSTS", "ALLOWED_HOSTS")
        or not ALLOWED_HOSTS
        or "*" in ALLOWED_HOSTS
        or any(host in unsafe_hosts for host in ALLOWED_HOSTS)
    ):
        raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be explicit when DEBUG=False.")

    if not CORS_ALLOWED_ORIGINS or "*" in CORS_ALLOWED_ORIGINS:
        raise ImproperlyConfigured("CORS_ALLOWED_ORIGINS must be explicit when DEBUG=False.")

    if not CSRF_TRUSTED_ORIGINS or "*" in CSRF_TRUSTED_ORIGINS:
        raise ImproperlyConfigured("CSRF_TRUSTED_ORIGINS must be explicit when DEBUG=False.")

    unsafe_origins = [
        origin
        for origin in [*CORS_ALLOWED_ORIGINS, *CSRF_TRUSTED_ORIGINS]
        if not origin.startswith("https://")
    ]
    if unsafe_origins:
        raise ImproperlyConfigured(
            "CORS_ALLOWED_ORIGINS and CSRF_TRUSTED_ORIGINS must use https:// when DEBUG=False."
        )

if env_bool("SECURE_PROXY_SSL_HEADER_ENABLED", not DEBUG):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

USE_X_FORWARDED_HOST = env_bool("USE_X_FORWARDED_HOST", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "5/minute",
        "auth_register": "5/hour",
        "auth_resend_verification": "3/hour",
        "auth_password_reset_request": "3/hour",
        "auth_password_reset_confirm": "10/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "60"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "7"))
    ),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Scholars Republic API",
    "DESCRIPTION": "API for the Scholars Republic scholarship matching platform.",
    "VERSION": "0.1.0",
}
AI_FEATURES_ENABLED = env_bool("AI_FEATURES_ENABLED", False)
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "")
AI_SERVICE_TOKEN = os.getenv("AI_SERVICE_TOKEN", "")
AI_SOP_MONTHLY_LIMIT = env_int("AI_SOP_MONTHLY_LIMIT", 5)


# Authentication and email verification
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000" if DEBUG else "https://scholarsrepublic.org",
)

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend"
    if DEBUG
    else "django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = env_int("EMAIL_PORT", 587)
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "Scholars Republic <noreply@scholarsrepublic.org>",
)
