"""
Weekly command: send scholarship digest to every opted-in user.
Run every Monday at 9 AM PKT (4 AM UTC):
    0 4 * * 1 /home/scholarsrepublic/scholarsrepublic/backend/venv/bin/python \
        /home/scholarsrepublic/scholarsrepublic/backend/manage.py send_weekly_digest
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
from apps.users.models import User

logger = logging.getLogger(__name__)

UPCOMING_DAYS = 30


def build_unsubscribe_url(user, pref: str) -> str:
    token = signing.dumps({"user_id": user.pk, "pref": pref}, salt="sr-unsub")
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    return f"{frontend_url}/unsubscribe?token={token}"


def format_deadline(opportunity) -> str:
    if opportunity.is_rolling_deadline:
        return "Rolling deadline"
    if opportunity.deadline:
        days_left = (opportunity.deadline - timezone.localdate()).days
        date_str = opportunity.deadline.strftime("%-d %B %Y")
        if days_left == 0:
            return f"{date_str} (TODAY)"
        if days_left == 1:
            return f"{date_str} (tomorrow)"
        return f"{date_str} ({days_left} days)"
    return "Deadline not listed"


def weekly_digest_body(user, upcoming, new_count: int) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    unsubscribe_url = build_unsubscribe_url(user, "digest")
    first_name = (user.full_name or "there").strip().split()[0]

    lines = [f"Hi {first_name},", "", "Here are your saved scholarships with upcoming deadlines:", ""]

    for saved in upcoming:
        opp = saved.opportunity
        provider = opp.provider_name or opp.university_name or ""
        provider_str = f" — {provider}" if provider else ""
        deadline_str = format_deadline(opp)
        url = f"{frontend_url}/scholarships/{opp.slug}"
        lines.append(f"  • {opp.title}{provider_str}")
        lines.append(f"    Deadline: {deadline_str}")
        lines.append(f"    {url}")
        lines.append("")

    if new_count > 0:
        lines += [
            f"  {new_count} new scholarship{'s' if new_count != 1 else ''} added this week.",
            f"  Browse all: {frontend_url}/scholarships",
            "",
        ]

    lines += [
        "Always confirm deadlines and eligibility on the official scholarship page before applying.",
        "",
        f"Open your dashboard: {frontend_url}/dashboard",
        "",
        "---",
        "You are receiving this email because you have weekly digest emails enabled on Scholars Republic.",
        f"Unsubscribe from weekly digest: {unsubscribe_url}",
    ]

    return "\n".join(lines)


class Command(BaseCommand):
    help = "Send weekly scholarship digest to opted-in users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without actually sending emails.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()
        cutoff = today + timedelta(days=UPCOMING_DAYS)
        week_ago = timezone.now() - timedelta(days=7)

        # Count new scholarships published in the last 7 days
        new_count = Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED,
            published_at__gte=week_ago,
        ).count()

        users = User.objects.filter(
            email_verified=True,
            notify_weekly_digest=True,
            role=User.Role.STUDENT,
        )

        sent = 0
        skipped = 0

        for user in users:
            upcoming = list(
                SavedOpportunity.objects.filter(
                    user=user,
                    opportunity__status=Opportunity.Status.PUBLISHED,
                    opportunity__is_rolling_deadline=False,
                    opportunity__deadline__isnull=False,
                    opportunity__deadline__gte=today,
                    opportunity__deadline__lte=cutoff,
                )
                .select_related("opportunity", "opportunity__country_ref")
                .order_by("opportunity__deadline")
            )

            if not upcoming and new_count == 0:
                skipped += 1
                continue

            subject = (
                f"Your Scholars Republic weekly update — {len(upcoming)} upcoming deadline{'s' if len(upcoming) != 1 else ''}"
                if upcoming
                else "New scholarships added this week — Scholars Republic"
            )
            body = weekly_digest_body(user, upcoming, new_count)

            if dry_run:
                self.stdout.write(
                    f"[DRY RUN] Would send to {user.email}: {subject} "
                    f"({len(upcoming)} deadlines)"
                )
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
                logger.info("Weekly digest sent to %s (%d upcoming)", user.email, len(upcoming))
            except Exception:
                logger.exception("Failed to send weekly digest to %s", user.email)
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"send_weekly_digest: sent={sent} skipped={skipped} new_scholarships={new_count}"
            )
        )
