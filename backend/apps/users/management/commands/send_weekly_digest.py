"""
Weekly command: send scholarship digest to every opted-in student.
Run every Monday at 9 AM PKT (4 AM UTC):
    0 4 * * 1 cd /home/scholarsrepublic/scholarsrepublic/backend && \
        /home/scholarsrepublic/scholarsrepublic/backend/venv/bin/python \
        manage.py send_weekly_digest >> /home/scholarsrepublic/logs/weekly_digest.log 2>&1
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
MAX_UPCOMING = 5
MAX_NEW = 3


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
            return f"{date_str} — TODAY"
        if days_left == 1:
            return f"{date_str} — tomorrow"
        if days_left <= 7:
            return f"{date_str} — {days_left} days left ⚠"
        return f"{date_str} — {days_left} days left"
    return "Deadline not listed"


def build_digest_body(user, upcoming, new_scholarships, new_count: int) -> str:
    frontend_url = settings.FRONTEND_URL.rstrip("/")
    unsubscribe_url = build_unsubscribe_url(user, "digest")
    first_name = (user.full_name or "there").strip().split()[0]
    today_str = timezone.localdate().strftime("%-d %B %Y")

    separator = "-" * 60
    lines = [
        f"Hi {first_name},",
        "",
        f"Here is your Scholars Republic update for the week of {today_str}.",
        "",
    ]

    # ── Upcoming deadlines from saved list ──────────────────────────
    if upcoming:
        lines += [
            separator,
            f"UPCOMING DEADLINES ({len(upcoming)} from your saved list)",
            separator,
            "",
        ]
        for saved in upcoming:
            opp = saved.opportunity
            provider = opp.provider_name or opp.university_name or ""
            provider_str = f" — {provider}" if provider else ""
            url = f"{frontend_url}/scholarships/{opp.slug}"
            lines += [
                f"  {opp.title}{provider_str}",
                f"  Deadline: {format_deadline(opp)}",
                f"  {url}",
                "",
            ]
    else:
        lines += [
            separator,
            "YOUR SAVED LIST",
            separator,
            "",
            f"  No upcoming deadlines in your saved list right now.",
            f"  Browse scholarships: {frontend_url}/scholarships",
            "",
        ]

    # ── New scholarships this week ───────────────────────────────────
    if new_scholarships:
        lines += [
            separator,
            f"NEW THIS WEEK ({new_count} scholarships added)",
            separator,
            "",
        ]
        for opp in new_scholarships:
            provider = opp.provider_name or opp.university_name or ""
            provider_str = f" — {provider}" if provider else ""
            url = f"{frontend_url}/scholarships/{opp.slug}"
            lines += [
                f"  {opp.title}{provider_str}",
                f"  Deadline: {format_deadline(opp)}",
                f"  {url}",
                "",
            ]
        if new_count > MAX_NEW:
            lines += [
                f"  ... and {new_count - MAX_NEW} more. Browse all: {frontend_url}/scholarships",
                "",
            ]
    elif new_count > 0:
        lines += [
            separator,
            f"NEW THIS WEEK",
            separator,
            "",
            f"  {new_count} new scholarship{'s' if new_count != 1 else ''} added.",
            f"  Browse all: {frontend_url}/scholarships",
            "",
        ]

    # ── Quick links ──────────────────────────────────────────────────
    lines += [
        separator,
        "QUICK LINKS",
        separator,
        "",
        f"  Dashboard:           {frontend_url}/dashboard",
        f"  Saved scholarships:  {frontend_url}/dashboard/saved",
        f"  Application tracker: {frontend_url}/dashboard/applications",
        f"  Browse scholarships: {frontend_url}/scholarships",
        "",
        separator,
        "",
        "Always confirm deadlines and eligibility on the official scholarship page before applying.",
        "",
        "You are receiving this email because you have weekly digest emails enabled.",
        f"Unsubscribe: {unsubscribe_url}",
    ]

    return "\n".join(lines)


class Command(BaseCommand):
    help = "Send weekly scholarship digest to opted-in students."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be sent without sending.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        today = timezone.localdate()
        cutoff = today + timedelta(days=UPCOMING_DAYS)
        week_ago = timezone.now() - timedelta(days=7)

        new_count = Opportunity.objects.filter(
            status=Opportunity.Status.PUBLISHED,
            published_at__gte=week_ago,
        ).count()

        new_scholarships = list(
            Opportunity.objects.filter(
                status=Opportunity.Status.PUBLISHED,
                opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
                published_at__gte=week_ago,
            )
            .order_by("-published_at")[:MAX_NEW]
        )

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
                .order_by("opportunity__deadline")[:MAX_UPCOMING]
            )

            if not upcoming and new_count == 0:
                skipped += 1
                continue

            deadline_count = len(upcoming)
            if deadline_count > 0:
                subject = (
                    f"Your week ahead — {deadline_count} deadline{'s' if deadline_count != 1 else ''} coming up"
                )
            else:
                subject = f"{new_count} new scholarship{'s' if new_count != 1 else ''} added this week — Scholars Republic"

            body = build_digest_body(user, upcoming, new_scholarships, new_count)

            if dry_run:
                self.stdout.write(
                    f"[DRY RUN] {user.email}: {subject} "
                    f"({deadline_count} deadlines, {new_count} new)"
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
                logger.info(
                    "Weekly digest sent to %s (%d deadlines, %d new)",
                    user.email, deadline_count, new_count,
                )
            except Exception:
                logger.exception("Failed to send weekly digest to %s", user.email)
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"send_weekly_digest: sent={sent} skipped={skipped} new={new_count}"
            )
        )
