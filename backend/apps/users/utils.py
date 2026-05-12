from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.users.safe_redirects import clean_next_path
from apps.users.tokens import email_verification_token


def build_email_verification_url(user, next_path="") -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    frontend_url = settings.FRONTEND_URL.rstrip("/")

    params = {
        "uid": uid,
        "token": token,
    }

    safe_next_path = clean_next_path(next_path)
    if safe_next_path:
        params["next"] = safe_next_path

    return f"{frontend_url}/verify-email?{urlencode(params)}"


def send_verification_email(user, next_path="") -> None:
    # Rotate verification timestamp before generating the token.
    # This invalidates all older verification links whenever a new one is sent.
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=["email_verification_sent_at", "updated_at"])

    verification_url = build_email_verification_url(user, next_path=next_path)
    subject = "Verify your Scholars Republic email address"
    body = f"""Hi {user.full_name or "there"},

Welcome to Scholars Republic.

Please verify your email address before logging in:

{verification_url}

This link replaces any older verification links. If you requested a new email, use the latest link only.

If you did not create a Scholars Republic account, you can ignore this email.

Scholars Republic
"""
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
