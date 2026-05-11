from dataclasses import dataclass

from django.core.management.base import BaseCommand

from apps.opportunities.models import OpportunityPathway
from apps.reference_data.models import Country


@dataclass(frozen=True)
class PathwaySeed:
    title: str
    slug: str
    pathway_type: str
    country: str
    parent_slug: str = ""
    display_order: int = 100


PATHWAY_SEEDS = (
    PathwaySeed(
        title="China Scholarships",
        slug="china-scholarships",
        pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        country="China",
        display_order=10,
    ),
    PathwaySeed(
        title="Chinese Government Scholarship / CSC",
        slug="chinese-government-scholarship-csc",
        pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
        country="China",
        parent_slug="china-scholarships",
        display_order=20,
    ),
    PathwaySeed(
        title="CSC Embassy Track",
        slug="csc-embassy-track",
        pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        country="China",
        parent_slug="chinese-government-scholarship-csc",
        display_order=30,
    ),
    PathwaySeed(
        title="CSC University Track",
        slug="csc-university-track",
        pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        country="China",
        parent_slug="chinese-government-scholarship-csc",
        display_order=40,
    ),
    PathwaySeed(
        title="South Korea Scholarships",
        slug="south-korea-scholarships",
        pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        country="South Korea",
        display_order=50,
    ),
    PathwaySeed(
        title="Global Korea Scholarship / GKS",
        slug="global-korea-scholarship-gks",
        pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
        country="South Korea",
        parent_slug="south-korea-scholarships",
        display_order=60,
    ),
    PathwaySeed(
        title="GKS Embassy Track",
        slug="gks-embassy-track",
        pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        country="South Korea",
        parent_slug="global-korea-scholarship-gks",
        display_order=70,
    ),
    PathwaySeed(
        title="GKS University Track",
        slug="gks-university-track",
        pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        country="South Korea",
        parent_slug="global-korea-scholarship-gks",
        display_order=80,
    ),
    PathwaySeed(
        title="Korean Professor / Lab Scholarships",
        slug="korean-professor-lab-scholarships",
        pathway_type=OpportunityPathway.PathwayType.PROFESSOR_LAB_GROUP,
        country="South Korea",
        parent_slug="south-korea-scholarships",
        display_order=90,
    ),
    PathwaySeed(
        title="Italy Scholarships",
        slug="italy-scholarships",
        pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        country="Italy",
        display_order=100,
    ),
    PathwaySeed(
        title="Italian Government Scholarships",
        slug="italian-government-scholarships",
        pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
        country="Italy",
        parent_slug="italy-scholarships",
        display_order=110,
    ),
    PathwaySeed(
        title="Italy Regional Scholarships",
        slug="italy-regional-scholarships",
        pathway_type=OpportunityPathway.PathwayType.REGIONAL_SCHOLARSHIP,
        country="Italy",
        parent_slug="italy-scholarships",
        display_order=120,
    ),
    PathwaySeed(
        title="Italy University Scholarships",
        slug="italy-university-scholarships",
        pathway_type=OpportunityPathway.PathwayType.UNIVERSITY_SCHOLARSHIP,
        country="Italy",
        parent_slug="italy-scholarships",
        display_order=130,
    ),
    PathwaySeed(
        title="Italy Professor / PhD / Lab Positions",
        slug="italy-professor-phd-lab-positions",
        pathway_type=OpportunityPathway.PathwayType.PROFESSOR_LAB_GROUP,
        country="Italy",
        parent_slug="italy-scholarships",
        display_order=140,
    ),
)


class Command(BaseCommand):
    help = "Seed structural opportunity pathways without creating opportunities."

    def handle(self, *args, **options):
        country_names = {seed.country for seed in PATHWAY_SEEDS if seed.country}
        countries = {
            country.name: country
            for country in Country.objects.filter(is_active=True, name__in=country_names)
        }
        pathways = {}
        created_count = 0
        updated_count = 0

        self.stdout.write("Seeding opportunity pathways")

        for seed in PATHWAY_SEEDS:
            country = countries.get(seed.country)
            parent = pathways.get(seed.parent_slug) if seed.parent_slug else None
            pathway, created = OpportunityPathway.objects.update_or_create(
                slug=seed.slug,
                defaults={
                    "title": seed.title,
                    "pathway_type": seed.pathway_type,
                    "country_ref": country,
                    "parent": parent,
                    "display_order": seed.display_order,
                    "is_active": True,
                },
            )
            pathways[seed.slug] = pathway

            if created:
                created_count += 1
            else:
                updated_count += 1

            country_note = seed.country if country else "country not linked"
            self.stdout.write(f" - {pathway.full_path} ({country_note})")

        missing_countries = sorted(country_names - set(countries))
        if missing_countries:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "Missing active countries; related pathways were created without "
                    f"country_ref: {', '.join(missing_countries)}"
                )
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Opportunity pathways seeded. Created: {created_count}. "
                f"Updated: {updated_count}."
            )
        )
