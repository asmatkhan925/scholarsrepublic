from datetime import timedelta
from unittest.mock import patch

from django.core.cache import cache
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import User
from apps.users.safe_redirects import clean_next_path
from apps.users.tokens import email_verification_token
from apps.users.utils import (
    build_email_verification_url,
    build_password_reset_url,
    send_verification_email,
)


PASSWORD_RESET_REQUEST_DETAIL = (
    "If an eligible account exists for this email, password reset instructions have been sent."
)


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        cache.clear()

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

    def test_register_does_not_return_tokens(self):
        response = self.client.post(
            reverse("register"),
            self.register_payload(email="no-tokens@example.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("tokens", response.data)

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

    def test_inactive_verified_user_cannot_login(self):
        User.objects.create_user(
            email="inactive@example.com",
            password="StrongPassword123!",
            full_name="Inactive Verified",
            is_active=False,
            email_verified=True,
        )
        response = self.client.post(
            reverse("login"),
            {
                "email": "inactive@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("tokens", response.data)

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

    def test_verify_email_activates_user(self):
        user = User.objects.create_user(
            email="activate@example.com",
            password="StrongPassword123!",
            full_name="Activate User",
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
        user = User.objects.get(email="ali@example.com")
        original_nonce = user.email_verification_nonce
        original_sent_at = user.email_verification_sent_at

        response = self.client.post(
            reverse("resend-verification"),
            {"email": "ali@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(response.data["email_sent"])
        self.assertGreater(response.data["retry_after_seconds"], 0)
        self.assertEqual(len(mail.outbox), 1)
        user.refresh_from_db()
        self.assertEqual(user.email_verification_nonce, original_nonce)
        self.assertEqual(user.email_verification_sent_at, original_sent_at)

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

    def test_resend_invalidates_previous_token_and_latest_token_works(self):
        self.client.post(reverse("register"), self.register_payload(), format="json")
        user = User.objects.get(email="ali@example.com")
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        old_token = email_verification_token.make_token(user)
        user.email_verification_sent_at = timezone.now() - timedelta(seconds=61)
        user.save(update_fields=["email_verification_sent_at", "updated_at"])

        response = self.client.post(
            reverse("resend-verification"),
            {"email": "ali@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        latest_token = email_verification_token.make_token(user)
        self.assertFalse(email_verification_token.check_token(user, old_token))
        self.assertTrue(email_verification_token.check_token(user, latest_token))

        old_response = self.client.post(
            reverse("verify-email"),
            {"uid": uid, "token": old_token},
            format="json",
        )
        latest_response = self.client.post(
            reverse("verify-email"),
            {"uid": uid, "token": latest_token},
            format="json",
        )

        self.assertEqual(old_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(latest_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("tokens", latest_response.data)

    def test_verification_token_cannot_be_reused_after_success(self):
        user = User.objects.create_user(
            email="reuse@example.com",
            password="StrongPassword123!",
            full_name="Reuse User",
            is_active=False,
            email_verified=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        first_response = self.client.post(
            reverse("verify-email"),
            {"uid": uid, "token": token},
            format="json",
        )
        second_response = self.client.post(
            reverse("verify-email"),
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("tokens", first_response.data)
        self.assertNotIn("tokens", second_response.data)

    def test_failed_verification_email_send_does_not_rotate_nonce(self):
        user = User.objects.create_user(
            email="send-fails@example.com",
            password="StrongPassword123!",
            full_name="Send Fails",
            is_active=False,
            email_verified=False,
            email_verification_nonce="original-nonce",
            email_verification_sent_at=timezone.now() - timedelta(days=1),
        )
        original_sent_at = user.email_verification_sent_at

        with patch("apps.users.utils.send_mail", side_effect=RuntimeError("SMTP failed")):
            with self.assertRaises(RuntimeError):
                send_verification_email(user)

        user.refresh_from_db()
        self.assertEqual(user.email_verification_nonce, "original-nonce")
        self.assertEqual(user.email_verification_sent_at, original_sent_at)

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

    def test_safe_next_path_accepts_valid_relative_paths(self):
        for next_path in [
            "/scholarships",
            "/scholarships/some-slug",
            "/dashboard/saved",
        ]:
            with self.subTest(next_path=next_path):
                self.assertEqual(clean_next_path(next_path), next_path)

    def test_safe_next_path_rejects_external_or_auth_paths(self):
        for next_path in [
            "https://evil.com",
            "//evil.com",
            "/api/health/",
            "/login",
            "/register",
            "/verify-email",
        ]:
            with self.subTest(next_path=next_path):
                self.assertEqual(clean_next_path(next_path), "")

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

    def test_raw_simplejwt_token_endpoint_is_not_public(self):
        User.objects.create_user(
            email="ali@example.com",
            password="StrongPassword123!",
            full_name="Ali Khan",
            email_verified=True,
            is_active=True,
        )

        response = self.client.post(
            "/api/auth/token/",
            {
                "email": "ali@example.com",
                "password": "StrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_raw_simplejwt_refresh_endpoint_is_not_public(self):
        response = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": "not-a-real-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_login_throttle_triggers_after_configured_limit(self):
        User.objects.create_user(
            email="throttle-login@example.com",
            password="StrongPassword123!",
            full_name="Throttle Login",
            email_verified=True,
            is_active=True,
        )
        payload = {
            "email": "throttle-login@example.com",
            "password": "WrongPassword123!",
        }

        responses = [
            self.client.post(reverse("login"), payload, format="json")
            for _ in range(6)
        ]

        for response in responses[:5]:
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(responses[5].status_code, status.HTTP_429_TOO_MANY_REQUESTS)

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

    def test_password_reset_request_existing_verified_user_sends_email(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="StrongPassword123!",
            full_name="Reset User",
            email_verified=True,
            is_active=True,
        )

        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "reset@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email_sent", response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("/reset-password?", mail.outbox[0].body)
        self.assertIn("uid=", mail.outbox[0].body)
        self.assertIn("token=", mail.outbox[0].body)
        self.assertNotIn("StrongPassword123!", mail.outbox[0].body)
        user.refresh_from_db()
        self.assertIsNotNone(user.password_reset_sent_at)

    def test_password_reset_request_unknown_email_returns_generic_and_sends_no_email(self):
        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "missing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email_sent", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_unverified_user_returns_generic_and_sends_no_email(self):
        User.objects.create_user(
            email="unverified@example.com",
            password="StrongPassword123!",
            full_name="Unverified User",
            email_verified=False,
            is_active=False,
        )

        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "unverified@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email_sent", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_inactive_user_returns_generic_and_sends_no_email(self):
        User.objects.create_user(
            email="inactive-reset@example.com",
            password="StrongPassword123!",
            full_name="Inactive User",
            email_verified=True,
            is_active=False,
        )

        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "inactive-reset@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email_sent", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_unusable_password_user_returns_generic_and_sends_no_email(self):
        user = User.objects.create_user(
            email="unusable-reset@example.com",
            password="StrongPassword123!",
            full_name="Unusable Password",
            email_verified=True,
            is_active=True,
        )
        user.set_unusable_password()
        user.save(update_fields=["password", "updated_at"])

        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "unusable-reset@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email_sent", response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_is_case_insensitive(self):
        user = User.objects.create_user(
            email="case-reset@example.com",
            password="StrongPassword123!",
            full_name="Case User",
            email_verified=True,
            is_active=True,
        )

        response = self.client.post(
            reverse("password-reset-request"),
            {"email": "CASE-RESET@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertEqual(len(mail.outbox), 1)
        user.refresh_from_db()
        self.assertIsNotNone(user.password_reset_sent_at)

    def test_password_reset_request_throttles_repeat_send_for_same_user(self):
        user = User.objects.create_user(
            email="throttle-reset@example.com",
            password="StrongPassword123!",
            full_name="Throttle User",
            email_verified=True,
            is_active=True,
        )

        first_response = self.client.post(
            reverse("password-reset-request"),
            {"email": "throttle-reset@example.com"},
            format="json",
        )
        user.refresh_from_db()
        first_sent_at = user.password_reset_sent_at
        second_response = self.client.post(
            reverse("password-reset-request"),
            {"email": "throttle-reset@example.com"},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(first_response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertEqual(second_response.data["detail"], PASSWORD_RESET_REQUEST_DETAIL)
        self.assertEqual(len(mail.outbox), 1)
        user.refresh_from_db()
        self.assertEqual(user.password_reset_sent_at, first_sent_at)

    def test_password_reset_confirm_valid_token_changes_password(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="OldStrongPassword123!",
            full_name="Reset User",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password_confirm": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["detail"],
            "Password reset successful. Please log in with your new password.",
        )

        user.refresh_from_db()
        self.assertTrue(user.check_password("NewStrongPassword123!"))

    def test_password_reset_confirm_does_not_return_tokens(self):
        user = User.objects.create_user(
            email="no-reset-tokens@example.com",
            password="OldStrongPassword123!",
            full_name="No Tokens",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password_confirm": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("tokens", response.data)
        self.assertNotIn("user", response.data)
        self.assertNotIn("email", response.data)

    def test_old_password_fails_after_reset(self):
        user = User.objects.create_user(
            email="old-password@example.com",
            password="OldStrongPassword123!",
            full_name="Old Password",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password_confirm": "NewStrongPassword123!",
            },
            format="json",
        )

        login_response = self.client.post(
            reverse("login"),
            {
                "email": "old-password@example.com",
                "password": "OldStrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_new_password_works_after_reset(self):
        user = User.objects.create_user(
            email="new-password@example.com",
            password="OldStrongPassword123!",
            full_name="New Password",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password_confirm": "NewStrongPassword123!",
            },
            format="json",
        )

        login_response = self.client.post(
            reverse("login"),
            {
                "email": "new-password@example.com",
                "password": "NewStrongPassword123!",
            },
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_password_reset_confirm_rejects_invalid_token(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="OldStrongPassword123!",
            full_name="Reset User",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        response = self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": "invalid-token",
                "password": "NewStrongPassword123!",
                "password_confirm": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertTrue(user.check_password("OldStrongPassword123!"))

    def test_password_reset_confirm_password_mismatch_rejected(self):
        user = User.objects.create_user(
            email="mismatch-reset@example.com",
            password="OldStrongPassword123!",
            full_name="Mismatch User",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "NewStrongPassword123!",
                "password_confirm": "DifferentStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertTrue(user.check_password("OldStrongPassword123!"))

    def test_password_reset_confirm_validates_password(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="OldStrongPassword123!",
            full_name="Reset User",
            email_verified=True,
            is_active=True,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        response = self.client.post(
            reverse("password-reset-confirm"),
            {
                "uid": uid,
                "token": token,
                "password": "password",
                "password_confirm": "password",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertTrue(user.check_password("OldStrongPassword123!"))

    def test_password_reset_url_contains_uid_and_token(self):
        user = User.objects.create_user(
            email="reset@example.com",
            password="StrongPassword123!",
            full_name="Reset User",
        )

        url = build_password_reset_url(user)

        self.assertIn("/reset-password?", url)
        self.assertIn("uid=", url)
        self.assertIn("token=", url)

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


class LogoutTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="logout@example.com",
            password="StrongPassword123!",
            full_name="Logout User",
            email_verified=True,
            is_active=True,
        )

    def _get_tokens(self):
        response = self.client.post(
            reverse("login"),
            {"email": "logout@example.com", "password": "StrongPassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data["tokens"]

    def test_logout_requires_authentication(self):
        response = self.client.post(reverse("logout"), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_succeeds_without_refresh_token(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_succeeds_and_blacklists_refresh_token(self):
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

        tokens = self._get_tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        response = self.client.post(
            reverse("logout"), {"refresh": tokens["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(BlacklistedToken.objects.exists())

    def test_blacklisted_refresh_token_cannot_be_reused(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        tokens = self._get_tokens()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        self.client.post(reverse("logout"), {"refresh": tokens["refresh"]}, format="json")

        with self.assertRaises(Exception):
            RefreshToken(tokens["refresh"]).blacklist()

    def test_logout_with_invalid_refresh_token_still_succeeds(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("logout"), {"refresh": "not-a-valid-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
