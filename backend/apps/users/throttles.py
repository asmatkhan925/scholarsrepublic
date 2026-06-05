from rest_framework.throttling import SimpleRateThrottle


class AuthEndpointRateThrottle(SimpleRateThrottle):
    scope = ""

    def get_cache_key(self, request, view):
        if not self.scope:
            return None

        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class RegisterRateThrottle(AuthEndpointRateThrottle):
    scope = "auth_register"


class LoginRateThrottle(AuthEndpointRateThrottle):
    scope = "auth_login"


class LoginEmailRateThrottle(SimpleRateThrottle):
    """Per-email rate limit so brute-forcing one account from many IPs is blocked."""

    scope = "auth_login_email"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}


class ResendVerificationRateThrottle(AuthEndpointRateThrottle):
    scope = "auth_resend_verification"


class PasswordResetRequestRateThrottle(AuthEndpointRateThrottle):
    scope = "auth_password_reset_request"


class PasswordResetConfirmRateThrottle(AuthEndpointRateThrottle):
    scope = "auth_password_reset_confirm"
