from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from apps.opportunities.models import Opportunity


class Command(BaseCommand):
    help = "Audit normalized opportunity reference data quality."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Apply only safe exact repairs. Currently no repairs are inferred.",
        )

    def handle(self, *args, **options):
        opportunities = Opportunity.objects.annotate(
            eligible_country_count=Count("eligible_country_refs", distinct=True),
            study_field_count=Count("study_field_refs", distinct=True),
        )

        total = opportunities.count()
        missing_country_ref = opportunities.filter(country_ref__isnull=True).count()
        missing_eligible_country_refs = opportunities.filter(
            eligible_country_count=0
        ).count()
        missing_study_field_refs = opportunities.filter(
            all_study_fields=False,
            study_field_count=0,
        ).count()
        all_study_fields_count = opportunities.filter(all_study_fields=True).count()

        self.stdout.write("Opportunity reference audit")
        self.stdout.write(f"Total opportunities: {total}")
        self.stdout.write(f"Missing country_ref: {missing_country_ref}")
        self.stdout.write(
            f"Missing eligible_country_refs: {missing_eligible_country_refs}"
        )
        self.stdout.write(
            "Missing study_field_refs while all_study_fields is false: "
            f"{missing_study_field_refs}"
        )
        self.stdout.write(f"all_study_fields true count: {all_study_fields_count}")

        problematic = (
            opportunities.filter(
                Q(country_ref__isnull=True)
                | Q(eligible_country_count=0)
                | Q(all_study_fields=False, study_field_count=0)
            )
            .select_related("country_ref")
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
            .order_by("id")[:10]
        )

        if problematic:
            self.stdout.write("")
            self.stdout.write("Sample problematic opportunities:")

            for opportunity in problematic:
                self.stdout.write(
                    " - "
                    f"id={opportunity.id}; "
                    f"title={opportunity.title}; "
                    f"slug={opportunity.slug}; "
                    f"country={opportunity.country or '-'}; "
                    "eligible_countries="
                    f"{self.format_list(opportunity.eligible_countries)}; "
                    f"fields_of_study={self.format_list(opportunity.fields_of_study)}; "
                    f"target_regions={self.format_list(opportunity.target_regions)}"
                )

        if options["fix"]:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "No fixes applied. The legacy DB columns were removed, so this "
                    "command has no safe exact source for automated repairs yet."
                )
            )
        else:
            self.stdout.write("")
            self.stdout.write("Dry run only. No changes made.")

    def format_list(self, values):
        return ", ".join(values) if values else "-"
