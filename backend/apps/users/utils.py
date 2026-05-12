from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.users.tokens import email_verification_token


def build_email_verification_url(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_verification_token.make_token(user)
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return f"{frontend_url}/verify-email?uid={uid}&token={token}"


def send_verification_email(user) -> None:
    verification_url = build_email_verification_url(user)
    subject = "Verify your Scholars Republic email address"
    body = f"""Hi {user.full_name or "there"},

Welcome to Scholars Republic.

Please verify your email address before logging in:

{verification_url}

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
