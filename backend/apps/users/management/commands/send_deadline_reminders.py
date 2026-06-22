"""
Daily command: send 7-day and 2-day deadline reminders for saved scholarships.
Run every day at 8 AM PKT (3 AM UTC):
    0 3 * * * cd /home/scholarsrepublic/scholarsrepublic/backend && \
        /home/scholarsrepublic/scholarsrepublic/backend/venv/bin/python \
        manage.py send_deadline_reminders >> /home/scholarsrepublic/logs/deadline_reminders.log 2>&1
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

REMINDER_DAYS = [7, 2]


def build_unsubscribe_url(user, pref: str) -> str:
    token = signing.dumps({"user_id": user.pk, "pref": pref}, salt="sr-unsub")
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return f"{frontend_url}/unsubscribe?token={token}"


def deadline_reminder_body(user, opportunity, days_before: int) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    scholarship_url = f"{frontend_url}/scholarships/{opportunity.slug}"
    source_url = opportunity.source_url or scholarship_url
    deadline_str = opportunity.deadline.strftime("%-d %B %Y") if opportunity.deadline else "soon"
    provider = opportunity.provider_name or opportunity.university_name or "the provider"
    unsubscribe_url = build_unsubscribe_url(user, "reminder")
    first_name = (user.full_name or "there").strip().split()[0]

    if days_before == 7:
        urgency = "closes in 7 days — time to finalise your documents."
        action = "Review your application materials and make sure everything is ready before the final push."
    else:
        urgency = f"closes in {days_before} days — last chance to prepare."
        action = "Check your documents, confirm the official deadline, and submit before it closes."

    return f"""Hi {first_name},

One of your saved scholarships {urgency}

  {opportunity.title}
  Provider: {provider}
  Deadline: {deadline_str}

View on Scholars Republic:
  {scholarship_url}

Apply on the official source:
  {source_url}

{action} Always confirm the final deadline on the official scholarship page before submitting.

---
You are receiving this email because you saved this scholarship on Scholars Republic and have deadline reminders enabled.
Unsubscribe from deadline reminders: {unsubscribe_url}
"""


class Command(BaseCommand):
    help = "Send 7-day and 2-day deadline reminders for saved scholarships."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending emails.",
        )

    def _run_for_days(self, days_before: int, dry_run: bool) -> tuple[int, int]:
        today = timezone.localdate()
        target_date = today + timedelta(days=days_before)

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
            subject = f"Deadline in {days_before} days: {opportunity.title}"
            body = deadline_reminder_body(user, opportunity, days_before)

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
                logger.info(
                    "Deadline reminder (%dd) sent to %s for %s",
                    days_before, user.email, opportunity.slug,
                )
            except Exception:
                logger.exception(
                    "Failed to send deadline reminder to %s for %s", user.email, opportunity.slug
                )
                skipped += 1

        return sent, skipped

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        total_sent = 0
        total_skipped = 0

        for days in REMINDER_DAYS:
            sent, skipped = self._run_for_days(days, dry_run)
            total_sent += sent
            total_skipped += skipped

        self.stdout.write(
            self.style.SUCCESS(
                f"send_deadline_reminders: sent={total_sent} skipped={total_skipped} "
                f"days_checked={REMINDER_DAYS}"
            )
        )
