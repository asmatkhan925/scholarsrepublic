import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.users.safe_redirects import clean_next_path
from apps.users.throttles import (
    LoginEmailRateThrottle,
    LoginRateThrottle,
    PasswordResetConfirmRateThrottle,
    PasswordResetRequestRateThrottle,
    RegisterRateThrottle,
    ResendVerificationRateThrottle,
)
from apps.users.tokens import email_verification_token
from apps.users.utils import send_password_reset_email, send_verification_email, send_welcome_email

User = get_user_model()
RESEND_VERIFICATION_COOLDOWN_SECONDS = 60
PASSWORD_RESET_COOLDOWN_SECONDS = 60
PASSWORD_RESET_REQUEST_DETAIL = (
    "If an eligible account exists for this email, password reset instructions have been sent."
)
logger = logging.getLogger(__name__)


def auth_response_for_user(user, status_code=status.HTTP_200_OK):
    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "user": UserSerializer(user).data,
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        },
        status=status_code,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        next_path = clean_next_path(request.data.get("next"))
        user = serializer.save()

        try:
            send_verification_email(user, next_path=next_path)
        except Exception as exc:
            user.delete()
            raise APIException(
                "Account was not created because the verification email could not be sent. "
                "Please check email settings and try again."
            ) from exc

        return Response(
            {
                "detail": "Account created. Please check your email to verify your address before logging in. The email may take 1–2 minutes to arrive. Also check spam or promotions.",
                "email_sent": True,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")

        if not uid or not token:
            return Response(
                {"detail": "Verification link is missing required data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response(
                {"detail": "Invalid verification link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not email_verification_token.check_token(user, token):
            return Response(
                {"detail": "Verification link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.email_verified = True
        user.is_active = True
        user.save(update_fields=["email_verified", "is_active", "updated_at"])

        send_welcome_email(user)

        return Response(
            {
                "detail": "Email verified successfully. Please log in to continue.",
                "email": user.email,
                "user": UserSerializer(user).data,
            }
        )


class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ResendVerificationRateThrottle]

    def post(self, request):
        email = User.objects.normalize_email(str(request.data.get("email", "")).strip())
        next_path = clean_next_path(request.data.get("next"))
        user = User.objects.filter(email__iexact=email).first()

        if not user or user.email_verified:
            return Response(
                {
                    "detail": "If this account needs verification, a verification email will be sent.",
                    "email_sent": False,
                }
            )

        now = timezone.now()
        if user.email_verification_sent_at:
            elapsed_seconds = int((now - user.email_verification_sent_at).total_seconds())
            remaining_seconds = RESEND_VERIFICATION_COOLDOWN_SECONDS - elapsed_seconds

            if remaining_seconds > 0:
                return Response(
                    {
                        "detail": "Please wait before requesting another verification email.",
                        "retry_after_seconds": remaining_seconds,
                        "email_sent": False,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        try:
            send_verification_email(user, next_path=next_path)
        except Exception as exc:
            raise APIException(
                "Verification email could not be sent. Please try again later."
            ) from exc

        user.email_verification_sent_at = now
        user.save(update_fields=["email_verification_sent_at", "updated_at"])

        return Response(
            {
                "detail": "Verification email sent. It may take 1-2 minutes to arrive. Also check spam or promotions.",
                "retry_after_seconds": RESEND_VERIFICATION_COOLDOWN_SECONDS,
                "email_sent": True,
            }
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle, LoginEmailRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return auth_response_for_user(user)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRequestRateThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email).first()

        is_eligible_user = (
            user
            and user.has_usable_password()
            and user.is_active
            and user.email_verified
        )

        if not is_eligible_user:
            return Response({"detail": PASSWORD_RESET_REQUEST_DETAIL})

        now = timezone.now()
        if user.password_reset_sent_at:
            elapsed_seconds = int((now - user.password_reset_sent_at).total_seconds())
            if elapsed_seconds < PASSWORD_RESET_COOLDOWN_SECONDS:
                return Response({"detail": PASSWORD_RESET_REQUEST_DETAIL})

        try:
            send_password_reset_email(user)
        except Exception:
            logger.exception("Password reset email could not be sent.")
        else:
            user.password_reset_sent_at = now
            user.save(update_fields=["password_reset_sent_at", "updated_at"])

        return Response({"detail": PASSWORD_RESET_REQUEST_DETAIL})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "Password reset successful. Please log in with your new password.",
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data, context={"request": request})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            return Response(
                {"detail": "Refresh token is invalid or expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(serializer.validated_data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response({"detail": "Logged out successfully."})


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "notify_weekly_digest": request.user.notify_weekly_digest,
            "notify_deadline_reminder": request.user.notify_deadline_reminder,
        })

    def patch(self, request):
        user = request.user
        update_fields = []

        if "notify_weekly_digest" in request.data:
            user.notify_weekly_digest = bool(request.data["notify_weekly_digest"])
            update_fields.append("notify_weekly_digest")

        if "notify_deadline_reminder" in request.data:
            user.notify_deadline_reminder = bool(request.data["notify_deadline_reminder"])
            update_fields.append("notify_deadline_reminder")

        if update_fields:
            update_fields.append("updated_at")
            user.save(update_fields=update_fields)

        return Response({
            "notify_weekly_digest": user.notify_weekly_digest,
            "notify_deadline_reminder": user.notify_deadline_reminder,
        })


class UnsubscribeView(APIView):
    permission_classes = [AllowAny]

    # Max token age: 90 days
    _MAX_AGE = 60 * 60 * 24 * 90

    def get(self, request):
        token = request.query_params.get("token", "")
        if not token:
            return Response({"detail": "Missing token."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = signing.loads(token, salt="sr-unsub", max_age=self._MAX_AGE)
        except signing.SignatureExpired:
            return Response({"detail": "This unsubscribe link has expired."}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({"detail": "Invalid unsubscribe link."}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        try:
            user = User.objects.get(pk=data["user_id"])
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        pref = data.get("pref")
        if pref == "digest":
            user.notify_weekly_digest = False
            user.save(update_fields=["notify_weekly_digest", "updated_at"])
            label = "weekly digest"
        elif pref == "reminder":
            user.notify_deadline_reminder = False
            user.save(update_fields=["notify_deadline_reminder", "updated_at"])
            label = "deadline reminders"
        else:
            return Response({"detail": "Unknown preference."}, status=status.HTTP_400_BAD_REQUEST)

        frontend_url = settings.FRONTEND_URL.rstrip("/")
        redirect_url = f"{frontend_url}/dashboard/settings?unsubscribed={pref}"
        return Response({"detail": f"Unsubscribed from {label}.", "redirect": redirect_url})
