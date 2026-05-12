from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        sent_at = (
            user.email_verification_sent_at.isoformat()
            if user.email_verification_sent_at
            else ""
        )
        return (
            f"{user.pk}{timestamp}{user.email}{user.password}"
            f"{user.email_verified}{user.is_active}{sent_at}"
        )


email_verification_token = EmailVerificationTokenGenerator()
