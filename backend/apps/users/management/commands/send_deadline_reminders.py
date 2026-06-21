"""
Daily command: send 2-day deadline reminders for saved scholarships.
Run every day at 8 AM PKT (3 AM UTC):
    0 3 * * * /home/scholarsrepublic/scholarsrepublic/backend/venv/bin/python \
        /home/scholarsrepublic/scholarsrepublic/backend/manage.py send_deadline_reminders
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.applications.models import SavedOpportunity
from apps.opportunities.models import Opportunity

logger = logging.getLogger(__name__)

DAYS_BEFORE = 2


def build_unsubscribe_url(user, pref: str) -> str:
    token = signing.dumps({"user_id": user.pk, "pref": pref}, salt="sr-unsub")
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return f"{frontend_url}/unsubscribe?token={token}"


def deadline_reminder_body(user, opportunity) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    scholarship_url = f"{frontend_url}/scholarships/{opportunity.slug}"
    source_url = opportunity.source_url or scholarship_url
    deadline_str = opportunity.deadline.strftime("%-d %B %Y") if opportunity.deadline else "soon"
    provider = opportunity.provider_name or opportunity.university_name or "the provider"
    unsubscribe_url = build_unsubscribe_url(user, "reminder")

    return f"""Hi {user.full_name or "there"},

This is a reminder that one of your saved scholarships closes in {DAYS_BEFORE} days.

  {opportunity.title}
  Provider: {provider}
  Deadline: {deadline_str}

View on Scholars Republic:
  {scholarship_url}

Apply on the official source:
  {source_url}

Make sure your documents are ready before the deadline. Always confirm the final deadline on the official scholarship page before submitting.

---
You are receiving this email because you saved this scholarship on Scholars Republic and have deadline reminders enabled.
Unsubscribe from deadline reminders: {unsubscribe_url}
"""


class Command(BaseCommand):
    help = f"Send {DAYS_BEFORE}-day deadline reminders for saved scholarships."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending emails.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()
        target_date = today + timedelta(days=DAYS_BEFORE)

        saved = (
            SavedOpportunity.objects.filter(
                user__email_verified=True,
                user__notify_deadline_reminder=True,
                opportunity__status=Opportunity.Status.PUBLISHED,
                opportunity__is_rolling_deadline=False,
                opportunity__deadline=target_date,
            )
            .select_related("user", "opportunity", "opportunity__country_ref")
            .order_by("user__email")
        )

        sent = 0
        skipped = 0

        for item in saved:
            user = item.user
            opportunity = item.opportunity

            subject = f"Deadline in {DAYS_BEFORE} days: {opportunity.title}"
            body = deadline_reminder_body(user, opportunity)

            if dry_run:
                self.stdout.write(f"[DRY RUN] Would send to {user.email}: {subject}")
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
                logger.info("Deadline reminder sent to %s for %s", user.email, opportunity.slug)
            except Exception:
                logger.exception(
                    "Failed to send deadline reminder to %s for %s", user.email, opportunity.slug
                )
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"send_deadline_reminders: sent={sent} skipped={skipped} "
                f"target_date={target_date}"
            )
        )
