from django.core.management.base import BaseCommand

from apps.opportunities.models import Opportunity


WEAK_SAMPLE_PHRASES = (
    "development sample",
    "sample opportunity",
    "verify details from the official source before using in production",
    "sample data",
    "placeholder",
)


class Command(BaseCommand):
    help = "Audit public opportunity content quality and trust signals."

    def handle(self, *args, **options):
        published = list(
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED).order_by("id")
        )

        totals = {
            "total_opportunities": Opportunity.objects.count(),
            "published_opportunities": len(published),
            "verified_published_opportunities": sum(
                opportunity.verified_status for opportunity in published
            ),
            "unverified_published_opportunities": sum(
                not opportunity.verified_status for opportunity in published
            ),
            "missing_official_link": sum(
                self.is_blank(opportunity.official_link) for opportunity in published
            ),
            "missing_source_url": sum(
                self.is_blank(opportunity.source_url) for opportunity in published
            ),
            "missing_source_name": sum(
                self.is_blank(opportunity.source_name) for opportunity in published
            ),
            "weak_sample_short_description": sum(
                self.has_weak_sample_text(opportunity.short_description)
                for opportunity in published
            ),
            "weak_sample_description": sum(
                self.has_weak_sample_text(opportunity.description)
                for opportunity in published
            ),
            "missing_eligibility": sum(
                self.is_blank(opportunity.eligibility) for opportunity in published
            ),
            "missing_benefits": sum(
                self.is_blank(opportunity.benefits) for opportunity in published
            ),
            "missing_how_to_apply": sum(
                self.is_blank(opportunity.how_to_apply) for opportunity in published
            ),
            "missing_deadline": sum(
                opportunity.deadline is None and not opportunity.is_rolling_deadline
                for opportunity in published
            ),
        }

        self.stdout.write("Opportunity content audit")
        self.stdout.write(f"Total opportunities: {totals['total_opportunities']}")
        self.stdout.write(f"Published opportunities: {totals['published_opportunities']}")
        self.stdout.write(
            "Verified published opportunities: "
            f"{totals['verified_published_opportunities']}"
        )
        self.stdout.write(
            "Unverified published opportunities: "
            f"{totals['unverified_published_opportunities']}"
        )
        self.stdout.write(f"Missing official_link: {totals['missing_official_link']}")
        self.stdout.write(f"Missing source_url: {totals['missing_source_url']}")
        self.stdout.write(f"Missing source_name: {totals['missing_source_name']}")
        self.stdout.write(
            "Weak/sample short_description: "
            f"{totals['weak_sample_short_description']}"
        )
        self.stdout.write(
            f"Weak/sample description: {totals['weak_sample_description']}"
        )
        self.stdout.write(f"Missing eligibility: {totals['missing_eligibility']}")
        self.stdout.write(f"Missing benefits: {totals['missing_benefits']}")
        self.stdout.write(f"Missing how_to_apply: {totals['missing_how_to_apply']}")
        self.stdout.write(
            "Missing deadline while is_rolling_deadline is false: "
            f"{totals['missing_deadline']}"
        )

        problematic = []
        for opportunity in published:
            issues = self.get_issues(opportunity)
            if issues:
                problematic.append((opportunity, issues))

        if problematic:
            self.stdout.write("")
            self.stdout.write("Problematic published opportunities:")

            for opportunity, issues in problematic:
                self.stdout.write(
                    " - "
                    f"id={opportunity.id}; "
                    f"slug={opportunity.slug}; "
                    f"title={opportunity.title}; "
                    f"issues={', '.join(issues)}"
                )

        self.stdout.write("")
        self.stdout.write("Dry audit only. No changes made.")

    def get_issues(self, opportunity):
        issues = []

        if self.is_blank(opportunity.official_link):
            issues.append("missing official_link")
        if self.is_blank(opportunity.source_url):
            issues.append("missing source_url")
        if self.is_blank(opportunity.source_name):
            issues.append("missing source_name")
        if self.has_weak_sample_text(opportunity.short_description):
            issues.append("weak/sample short_description")
        if self.has_weak_sample_text(opportunity.description):
            issues.append("weak/sample description")
        if self.is_blank(opportunity.eligibility):
            issues.append("missing eligibility")
        if self.is_blank(opportunity.benefits):
            issues.append("missing benefits")
        if self.is_blank(opportunity.how_to_apply):
            issues.append("missing how_to_apply")
        if opportunity.deadline is None and not opportunity.is_rolling_deadline:
            issues.append("missing deadline")

        return issues

    def has_weak_sample_text(self, value):
        text = (value or "").casefold()
        return any(phrase in text for phrase in WEAK_SAMPLE_PHRASES)

    def is_blank(self, value):
        return not (value or "").strip()
