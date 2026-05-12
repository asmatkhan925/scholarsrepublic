from datetime import timedelta

from django.core import mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User
from apps.users.tokens import email_verification_token
from apps.users.utils import build_email_verification_url


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
        self.assertTrue(response.data["email_sent"])

        user = User.objects.get(email="ali@example.com")
        self.assertFalse(user.email_verified)
        self.assertFalse(user.is_active)
        self.assertIsNotNone(user.email_verification_sent_at)
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

    def test_verify_email_success_does_not_return_tokens(self):
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
        self.assertEqual(
            response.data["detail"],
            "Email verified successfully. Please log in to continue.",
        )
        self.assertEqual(response.data["email"], "ali@example.com")
        self.assertEqual(response.data["user"]["email"], "ali@example.com")
        self.assertTrue(response.data["user"]["email_verified"])
        self.assertNotIn("tokens", response.data)

        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        self.assertTrue(user.is_active)

    def test_login_after_email_verification_succeeds(self):
        user = User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            is_active=False,
            email_verified=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        self.client.post(reverse("verify-email"), {"uid": uid, "token": token}, format="json")
        response = self.client.post(
            reverse("login"),
            {
                "email": "ali@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["tokens"])

    def test_resend_immediately_after_register_is_throttled(self):
        self.client.post(reverse("register"), self.register_payload(), format="json")

        response = self.client.post(
            reverse("resend-verification"),
            {"email": "ali@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(response.data["email_sent"])
        self.assertGreater(response.data["retry_after_seconds"], 0)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_after_cooldown_sends_email(self):
        self.client.post(reverse("register"), self.register_payload(), format="json")
        user = User.objects.get(email="ali@example.com")
        user.email_verification_sent_at = timezone.now() - timedelta(seconds=61)
        user.save(update_fields=["email_verification_sent_at", "updated_at"])

        response = self.client.post(
            reverse("resend-verification"),
            {
                "email": "ali@example.com",
                "next": "/scholarships/example-scholarship",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["email_sent"])
        self.assertEqual(response.data["retry_after_seconds"], 60)
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("next=%2Fscholarships%2Fexample-scholarship", mail.outbox[-1].body)

    def test_resend_does_not_reveal_missing_or_verified_email(self):
        verified_user = User.objects.create_user(
            email="verified@example.com",
            password="StrongPassword123!",
            full_name="Verified User",
            email_verified=True,
            is_active=True,
        )

        missing_response = self.client.post(
            reverse("resend-verification"),
            {"email": "missing@example.com"},
            format="json",
        )
        verified_response = self.client.post(
            reverse("resend-verification"),
            {"email": verified_user.email},
            format="json",
        )

        self.assertEqual(missing_response.status_code, status.HTTP_200_OK)
        self.assertEqual(verified_response.status_code, status.HTTP_200_OK)
        self.assertFalse(missing_response.data["email_sent"])
        self.assertFalse(verified_response.data["email_sent"])
        self.assertEqual(len(mail.outbox), 0)

    def test_safe_next_path_is_included_in_verification_link(self):
        user = User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            is_active=False,
            email_verified=False,
        )

        url = build_email_verification_url(user, next_path="/scholarships/example-slug")

        self.assertIn("next=%2Fscholarships%2Fexample-slug", url)

    def test_unsafe_next_path_is_ignored_in_verification_link(self):
        user = User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            is_active=False,
            email_verified=False,
        )

        for next_path in [
            "https://evil.com",
            "//evil.com",
            "/api/health/",
            "/login",
            "/register",
            "/verify-email",
        ]:
            with self.subTest(next_path=next_path):
                self.assertNotIn(
                    "next=",
                    build_email_verification_url(user, next_path=next_path),
                )

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

    def test_resending_verification_email_invalidates_previous_token(self):
        from django.test import override_settings

        from apps.users.tokens import email_verification_token
        from apps.users.utils import send_verification_email

        user = User.objects.create_user(
            email="rotate@example.com",
            password="StrongPassword123!",
            full_name="Rotate Test",
            is_active=False,
            email_verified=False,
        )

        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
        ):
            send_verification_email(user)
            user.refresh_from_db()
            old_token = email_verification_token.make_token(user)

            send_verification_email(user)
            user.refresh_from_db()

        self.assertFalse(email_verification_token.check_token(user, old_token))
        self.assertTrue(
            email_verification_token.check_token(
                user,
                email_verification_token.make_token(user),
            )
        )

