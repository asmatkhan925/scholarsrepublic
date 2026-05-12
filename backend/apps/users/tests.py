from django.core import mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User
from apps.users.tokens import email_verification_token


class AuthenticationAPITests(APITestCase):
    def register_payload(self, email="ali@example.com"):
        return {
            "full_name": "Ali Khan",
            "email": email,
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
        }

    def test_register_student_success_requires_email_verification(self):
        response = self.client.post(
            reverse("register"),
            self.register_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], User.Role.STUDENT)
        self.assertEqual(response.data["user"]["email"], "ali@example.com")
        self.assertFalse(response.data["user"]["email_verified"])
        self.assertNotIn("tokens", response.data)

        user = User.objects.get(email="ali@example.com")
        self.assertFalse(user.email_verified)
        self.assertFalse(user.is_active)
        self.assertEqual(len(mail.outbox), 1)

    def test_register_requires_core_fields(self):
        for field_name in ["full_name", "email", "password", "password_confirm"]:
            payload = self.register_payload(email=f"{field_name}@example.com")
            payload.pop(field_name)
            response = self.client.post(reverse("register"), payload, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(field_name, response.data)

    def test_register_password_mismatch(self):
        payload = self.register_payload()
        payload["password_confirm"] = "DifferentPassword123!"
        response = self.client.post(reverse("register"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email(self):
        User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
        )
        response = self.client.post(
            reverse("register"),
            self.register_payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unverified_user_cannot_login(self):
        User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            is_active=False,
            email_verified=False,
        )
        response = self.client.post(
            reverse("login"),
            {
                "email": "ali@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verify", str(response.data).lower())

    def test_verify_email_success_returns_tokens(self):
        user = User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            is_active=False,
            email_verified=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        response = self.client.post(
            reverse("verify-email"),
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "ali@example.com")
        self.assertTrue(response.data["user"]["email_verified"])
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertTrue(user.is_active)

    def test_login_success(self):
        User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            email_verified=True,
            is_active=True,
        )
        response = self.client.post(
            reverse("login"),
            {
                "email": "ali@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "ali@example.com")
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_login_invalid_credentials(self):
        response = self.client.post(
            reverse("login"),
            {
                "email": "missing@example.com",
                "password": "WrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_requires_auth(self):
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_success(self):
        user = User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
        )
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], user.email)
        self.assertEqual(response.data["role"], User.Role.STUDENT)

    def test_create_superuser_role(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPassword123!",
            full_name="Admin User",
        )
        self.assertEqual(user.role, User.Role.ADMIN)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
