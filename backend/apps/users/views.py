from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


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
        return auth_response_for_user(user, status.HTTP_201_CREATED)


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
