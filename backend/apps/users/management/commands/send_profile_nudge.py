"""
Daily command: nudge users who verified their email 48–72 hours ago but haven't
completed their profile (no profile record or completion < 30%).

Run daily at 10 AM PKT (5 AM UTC):
    0 5 * * * cd /home/scholarsrepublic/scholarsrepublic/backend && \
        /home/scholarsrepublic/scholarsrepublic/backend/venv/bin/python manage.py \
        send_profile_nudge >> /home/scholarsrepublic/logs/profile_nudge.log 2>&1
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.users.models import User

logger = logging.getLogger(__name__)


def nudge_body(user) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    first_name = (user.full_name or "there").strip().split()[0]
    profile_url = f"{frontend_url}/dashboard/profile"
    scholarships_url = f"{frontend_url}/scholarships"

    return f"""Hi {first_name},

You signed up for Scholars Republic a couple of days ago — welcome again.

One quick thing: your scholarship matches, recommendations, and deadline alerts all depend on your profile. Students with a complete profile get significantly more relevant results.

It takes about 5 minutes to fill in the essentials:
  • Current education level and CGPA
  • Target degree and countries
  • Documents you already have

Complete your profile here:
{profile_url}

Once it's done, browse scholarships filtered to your background:
{scholarships_url}

If you have any questions, reply to this email or reach us at support@scholarsrepublic.org.

Scholars Republic · {frontend_url}
"""


class Command(BaseCommand):
    help = "Send profile completion nudge to users who signed up 48–72 hours ago with incomplete profiles."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print who would be nudged without sending emails.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()
        window_start = now - timedelta(hours=72)
        window_end = now - timedelta(hours=48)

        # Users who verified their email within the 48–72h window
        candidates = User.objects.filter(
            email_verified=True,
            role=User.Role.STUDENT,
            date_joined__gte=window_start,
            date_joined__lte=window_end,
        )

        sent = 0
        skipped = 0

        for user in candidates:
            # Check if they have a profile and whether it's reasonably complete
            try:
                profile = user.studentprofile
                if profile.completion_percentage >= 30:
                    skipped += 1
                    continue
            except Exception:
                # No profile at all — definitely nudge them
                pass

            subject = f"{(user.full_name or 'there').strip().split()[0]}, your scholarship matches are waiting"
            body = nudge_body(user)

            if dry_run:
                self.stdout.write(f"[DRY RUN] Would nudge {user.email} (joined {user.date_joined:%Y-%m-%d %H:%M})")
                skipped += 1
                continue

            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                sent += 1
                logger.info("Profile nudge sent to %s", user.email)
            except Exception:
                logger.exception("Failed to send profile nudge to %s", user.email)
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(f"send_profile_nudge: sent={sent} skipped={skipped}")
        )
