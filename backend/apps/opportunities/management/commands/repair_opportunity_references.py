from dataclasses import dataclass

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.opportunities.models import Opportunity
from apps.reference_data.models import Country, Region, StudyField


@dataclass(frozen=True)
class ReferenceMapping:
    country: str
    eligible_countries: tuple[str, ...]
    eligible_regions: tuple[str, ...] = ()
    study_fields: tuple[str, ...] = ()
    all_study_fields: bool = False
    note: str = ""


# Source: seed_opportunities.py sample records currently present in production.
#
# The legacy seed data used non-reference placeholders such as "All Countries",
# "Developing Countries", and province names in target_regions. Those are not
# Country/Region rows, so this command does not map them. Each mapped record
# keeps the exact valid country from the seed and the exact valid Pakistan
# eligibility from the seed.
#
# For study fields, the seed data either used "All Fields" or old category-style
# labels that do not consistently exist as StudyField rows (for example
# "Engineering", "Business", "Health Sciences", and "Food Security"). To avoid
# partial field matching, these sample opportunities are repaired as broad field
# opportunities by setting all_study_fields=True and clearing study_field_refs.
REFERENCE_MAPPINGS = {
    "chinese-government-scholarship": ReferenceMapping(
        country="China",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "taiwan-icdf-scholarship": ReferenceMapping(
        country="Taiwan",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed used legacy category-level field labels; avoid partial mapping.",
    ),
    "turkiye-burslari-scholarship": ReferenceMapping(
        country="Turkey",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "daad-scholarship": ReferenceMapping(
        country="Germany",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "fulbright-pakistan": ReferenceMapping(
        country="USA",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "hec-need-based-scholarship": ReferenceMapping(
        country="Pakistan",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "peef-scholarship": ReferenceMapping(
        country="Pakistan",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
    "scotland-pakistan-scholarship": ReferenceMapping(
        country="Pakistan",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed used legacy category-level field labels; avoid partial mapping.",
    ),
    "university-scholarship-in-china": ReferenceMapping(
        country="China",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed used mixed exact/category field labels; avoid partial mapping.",
    ),
    "no-ielts-scholarship-example": ReferenceMapping(
        country="Malaysia",
        eligible_countries=("Pakistan",),
        all_study_fields=True,
        note="Seed fields_of_study included All Fields.",
    ),
}


class Command(BaseCommand):
    help = "Repair normalized references for known seeded opportunity records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Apply the explicit repair mapping. Default is dry-run only.",
        )

    def handle(self, *args, **options):
        fix = options["fix"]
        references = self.resolve_references()
        opportunities = list(
            Opportunity.objects.select_related("country_ref")
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
            .order_by("id")
        )
        plans = self.build_plans(opportunities)

        self.stdout.write("Opportunity reference repair")
        self.stdout.write("Mode: apply changes" if fix else "Mode: dry run")
        self.stdout.write("")
        self.write_summary("Before", self.summarize(opportunities))
        projected_summary = self.project_summary(opportunities, plans)
        self.write_summary("Projected after", projected_summary)
        self.stdout.write("")

        if plans:
            self.stdout.write("Mapped opportunities:")
            for opportunity, mapping in plans:
                self.stdout.write(self.describe_change(opportunity, mapping))
        else:
            self.stdout.write("Mapped opportunities: none found in database.")

        skipped = [
            opportunity.slug
            for opportunity in opportunities
            if opportunity.slug not in REFERENCE_MAPPINGS
        ]
        if skipped:
            self.stdout.write("")
            self.stdout.write("Skipped opportunities without explicit mapping:")
            for slug in skipped:
                self.stdout.write(f" - {slug}")

        missing_slugs = [
            slug
            for slug in REFERENCE_MAPPINGS
            if slug not in {opportunity.slug for opportunity in opportunities}
        ]
        if missing_slugs:
            self.stdout.write("")
            self.stdout.write("Mappings not present in database:")
            for slug in missing_slugs:
                self.stdout.write(f" - {slug}")

        if not fix:
            self.stdout.write("")
            self.stdout.write("Dry run only. No changes made.")
            return

        with transaction.atomic():
            for opportunity, mapping in plans:
                self.apply_mapping(opportunity, mapping, references)

        repaired = list(
            Opportunity.objects.select_related("country_ref")
            .prefetch_related(
                "eligible_country_refs",
                "eligible_region_refs",
                "study_field_refs",
            )
            .order_by("id")
        )
        self.stdout.write("")
        self.write_summary("After", self.summarize(repaired))
        self.stdout.write(self.style.SUCCESS("Opportunity references repaired."))

    def resolve_references(self):
        country_names = set()
        region_names = set()
        study_field_names = set()

        for mapping in REFERENCE_MAPPINGS.values():
            country_names.add(mapping.country)
            country_names.update(mapping.eligible_countries)
            region_names.update(mapping.eligible_regions)
            study_field_names.update(mapping.study_fields)

        countries = self.lookup_by_name(Country, country_names)
        regions = self.lookup_by_name(Region, region_names)
        study_fields = self.lookup_by_name(StudyField, study_field_names)

        errors = []
        missing_countries = sorted(
            name for name in country_names if name not in countries
        )
        missing_regions = sorted(name for name in region_names if name not in regions)
        missing_study_fields = sorted(
            name for name in study_field_names if name not in study_fields
        )

        if missing_countries:
            errors.append(
                "Missing active country references: " + ", ".join(missing_countries)
            )
        if missing_regions:
            errors.append(
                "Missing active region references: " + ", ".join(missing_regions)
            )
        if missing_study_fields:
            errors.append(
                "Missing active study field references: "
                + ", ".join(missing_study_fields)
            )

        if errors:
            raise CommandError("; ".join(errors))

        return {
            "countries": countries,
            "regions": regions,
            "study_fields": study_fields,
        }

    def lookup_by_name(self, model, names):
        if not names:
            return {}

        records = model.objects.filter(is_active=True, name__in=names)
        return {record.name: record for record in records}

    def build_plans(self, opportunities):
        plans = []

        for opportunity in opportunities:
            mapping = REFERENCE_MAPPINGS.get(opportunity.slug)
            if not mapping:
                continue

            plans.append((opportunity, mapping))

        return plans

    def apply_mapping(self, opportunity, mapping, references):
        opportunity.country_ref = references["countries"][mapping.country]
        opportunity.all_study_fields = mapping.all_study_fields
        opportunity.save(
            update_fields=[
                "country_ref",
                "all_study_fields",
                "updated_at",
            ]
        )
        opportunity.eligible_country_refs.set(
            [references["countries"][name] for name in mapping.eligible_countries]
        )
        opportunity.eligible_region_refs.set(
            [references["regions"][name] for name in mapping.eligible_regions]
        )

        if mapping.all_study_fields:
            opportunity.study_field_refs.clear()
        else:
            opportunity.study_field_refs.set(
                [references["study_fields"][name] for name in mapping.study_fields]
            )

    def summarize(self, opportunities):
        total = len(opportunities)
        missing_country_ref = 0
        missing_eligible_country_refs = 0
        missing_study_field_refs = 0
        all_study_fields_count = 0

        for opportunity in opportunities:
            if not opportunity.country_ref_id:
                missing_country_ref += 1
            if not opportunity.eligible_countries:
                missing_eligible_country_refs += 1
            if opportunity.all_study_fields:
                all_study_fields_count += 1
            elif not opportunity.fields_of_study:
                missing_study_field_refs += 1

        return {
            "total": total,
            "missing_country_ref": missing_country_ref,
            "missing_eligible_country_refs": missing_eligible_country_refs,
            "missing_study_field_refs": missing_study_field_refs,
            "all_study_fields_count": all_study_fields_count,
        }

    def project_summary(self, opportunities, plans):
        mapped_slugs = {opportunity.slug for opportunity, _mapping in plans}
        mapping_by_slug = {opportunity.slug: mapping for opportunity, mapping in plans}
        total = len(opportunities)
        missing_country_ref = 0
        missing_eligible_country_refs = 0
        missing_study_field_refs = 0
        all_study_fields_count = 0

        for opportunity in opportunities:
            if opportunity.slug in mapped_slugs:
                mapping = mapping_by_slug[opportunity.slug]
                has_country = bool(mapping.country)
                has_eligible_countries = bool(mapping.eligible_countries)
                has_study_fields = mapping.all_study_fields or bool(
                    mapping.study_fields
                )
                all_study_fields = mapping.all_study_fields
            else:
                has_country = bool(opportunity.country_ref_id)
                has_eligible_countries = bool(opportunity.eligible_countries)
                has_study_fields = bool(opportunity.fields_of_study)
                all_study_fields = opportunity.all_study_fields

            if not has_country:
                missing_country_ref += 1
            if not has_eligible_countries:
                missing_eligible_country_refs += 1
            if all_study_fields:
                all_study_fields_count += 1
            elif not has_study_fields:
                missing_study_field_refs += 1

        return {
            "total": total,
            "missing_country_ref": missing_country_ref,
            "missing_eligible_country_refs": missing_eligible_country_refs,
            "missing_study_field_refs": missing_study_field_refs,
            "all_study_fields_count": all_study_fields_count,
        }

    def write_summary(self, label, summary):
        self.stdout.write(f"{label} summary:")
        self.stdout.write(f"  total opportunities: {summary['total']}")
        self.stdout.write(f"  missing country_ref: {summary['missing_country_ref']}")
        self.stdout.write(
            "  missing eligible_country_refs: "
            f"{summary['missing_eligible_country_refs']}"
        )
        self.stdout.write(
            "  missing study_field_refs while all_study_fields is false: "
            f"{summary['missing_study_field_refs']}"
        )
        self.stdout.write(
            f"  all_study_fields true count: {summary['all_study_fields_count']}"
        )

    def describe_change(self, opportunity, mapping):
        current_country = opportunity.country or "-"
        current_eligible_countries = self.format_list(opportunity.eligible_countries)
        current_eligible_regions = self.format_list(opportunity.target_regions)
        current_study_fields = self.format_list(opportunity.fields_of_study)
        mapped_study_fields = (
            "All Fields"
            if mapping.all_study_fields
            else self.format_list(mapping.study_fields)
        )

        return (
            f" - {opportunity.slug}: "
            f"country {current_country} -> {mapping.country}; "
            "eligible_countries "
            f"{current_eligible_countries} -> "
            f"{self.format_list(mapping.eligible_countries)}; "
            "eligible_regions "
            f"{current_eligible_regions} -> "
            f"{self.format_list(mapping.eligible_regions)}; "
            f"fields {current_study_fields} -> {mapped_study_fields}; "
            f"note: {mapping.note}"
        )

    def format_list(self, values):
        return ", ".join(values) if values else "-"
