from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
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
from apps.users.tokens import email_verification_token
from apps.users.utils import send_verification_email

User = get_user_model()


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
        user = serializer.save()

        try:
            send_verification_email(user)
        except Exception as exc:
            user.delete()
            raise APIException(
                "Account was not created because the verification email could not be sent. "
                "Please check email settings and try again."
            ) from exc

        return Response(
            {
                "detail": "Account created. Please check your email to verify your address before logging in. The email may take 1–2 minutes to arrive. Also check spam or promotions.",
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

        return auth_response_for_user(user)


class ResendVerificationEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = User.objects.normalize_email(request.data.get("email", "").strip())
        user = User.objects.filter(email__iexact=email).first()

        if user and not user.email_verified:
            try:
                send_verification_email(user)
            except Exception as exc:
                raise APIException(
                    "Verification email could not be sent. Please try again later."
                ) from exc

        return Response(
            {
                "detail": "If this account needs verification, a new verification email has been sent."
            }
        )


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get("credential")

        if not credential:
            return Response(
                {"detail": "Google credential is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response(
                {"detail": "Google login is not configured yet."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            google_user = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid Google sign-in token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = User.objects.normalize_email(google_user.get("email", ""))
        email_verified = bool(google_user.get("email_verified"))

        if not email or not email_verified:
            return Response(
                {"detail": "Google account email must be verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        full_name = google_user.get("name") or email.split("@")[0]
        user = User.objects.filter(email__iexact=email).first()

        if user is None:
            user = User.objects.create_user(
                email=email,
                password=None,
                full_name=full_name,
                role=User.Role.STUDENT,
                is_active=True,
                email_verified=True,
            )
        else:
            changed_fields = []
            if not user.email_verified:
                user.email_verified = True
                changed_fields.append("email_verified")
            if not user.is_active:
                user.is_active = True
                changed_fields.append("is_active")
            if not user.full_name:
                user.full_name = full_name
                changed_fields.append("full_name")
            if changed_fields:
                changed_fields.append("updated_at")
                user.save(update_fields=changed_fields)

        return auth_response_for_user(user)


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
