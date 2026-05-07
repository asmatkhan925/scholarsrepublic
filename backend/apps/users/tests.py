from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User


class AuthenticationAPITests(APITestCase):
    def register_payload(self, email="ali@example.com"):
        return {
            "full_name": "Ali Khan",
            "email": email,
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
        }

    def test_register_student_success(self):
        response = self.client.post(
            reverse("register"),
            self.register_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["role"], User.Role.STUDENT)
        self.assertEqual(response.data["user"]["email"], "ali@example.com")
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

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

    def test_login_success(self):
        User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
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
