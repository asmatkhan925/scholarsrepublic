from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.users.safe_redirects import clean_next_path
from apps.users.tokens import email_verification_token
from apps.users.utils import send_verification_email

User = get_user_model()
RESEND_VERIFICATION_COOLDOWN_SECONDS = 60


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

        return Response(
            {
                "detail": "Email verified successfully. Please log in to continue.",
                "email": user.email,
                "user": UserSerializer(user).data,
            }
        )


class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]

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

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return auth_response_for_user(serializer.validated_data["user"])


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"detail": "Logged out successfully."})
