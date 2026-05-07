from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.opportunities.models import Opportunity


class Command(BaseCommand):
    help = "Seed development/sample scholarship opportunities."

    def handle(self, *args, **options):
        today = timezone.localdate()
        samples = [
            {
                "title": "Chinese Government Scholarship",
                "slug": "chinese-government-scholarship",
                "provider_name": "Chinese Scholarship Council",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "university_name": "Multiple Chinese universities",
                "country": "China",
                "deadline": today + timedelta(days=120),
                "funding_type": Opportunity.FundingType.FULLY_FUNDED,
                "degree_levels": ["Undergraduate", "Master", "PhD"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan", "All Countries"],
                "required_documents": [
                    "Passport",
                    "Transcript",
                    "Degree",
                    "CV",
                    "Study Plan",
                    "Recommendation Letters",
                ],
                "ielts_required": False,
                "hsk_required": False,
                "tags": ["Sample Data", "Fully Funded", "China", "No IELTS"],
            },
            {
                "title": "Taiwan ICDF Scholarship",
                "slug": "taiwan-icdf-scholarship",
                "provider_name": "Taiwan ICDF",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "country": "Taiwan",
                "deadline": today + timedelta(days=90),
                "funding_type": Opportunity.FundingType.FULLY_FUNDED,
                "degree_levels": ["Undergraduate", "Master", "PhD"],
                "fields_of_study": ["Engineering", "Agriculture", "Business"],
                "eligible_countries": ["Pakistan", "Developing Countries"],
                "required_documents": [
                    "Passport",
                    "Transcript",
                    "CV",
                    "SOP",
                    "Recommendation Letters",
                    "English Proficiency Certificate",
                ],
                "ielts_required": False,
                "english_proficiency_certificate_accepted": True,
                "tags": ["Sample Data", "Fully Funded", "Taiwan"],
            },
            {
                "title": "Turkiye Burslari Scholarship",
                "slug": "turkiye-burslari-scholarship",
                "provider_name": "Government of Turkiye",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "country": "Turkey",
                "deadline": today + timedelta(days=75),
                "funding_type": Opportunity.FundingType.FULLY_FUNDED,
                "degree_levels": ["Undergraduate", "Master", "PhD"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan", "All Countries"],
                "required_documents": [
                    "CNIC",
                    "Passport",
                    "Transcript",
                    "CV",
                    "SOP",
                ],
                "application_fee_required": False,
                "tags": ["Sample Data", "Fully Funded", "Turkey", "No Application Fee"],
            },
            {
                "title": "DAAD Scholarship",
                "slug": "daad-scholarship",
                "provider_name": "DAAD",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "country": "Germany",
                "deadline": today + timedelta(days=160),
                "funding_type": Opportunity.FundingType.FULLY_FUNDED,
                "degree_levels": ["Master", "PhD"],
                "fields_of_study": ["Engineering", "Social Sciences", "All Fields"],
                "eligible_countries": ["Pakistan", "Developing Countries"],
                "required_documents": [
                    "Passport",
                    "Transcript",
                    "Degree",
                    "CV",
                    "SOP",
                    "Recommendation Letters",
                    "IELTS",
                ],
                "ielts_required": True,
                "tags": ["Sample Data", "Fully Funded", "Germany"],
            },
            {
                "title": "Fulbright Pakistan",
                "slug": "fulbright-pakistan",
                "provider_name": "USEFP",
                "organization_type": Opportunity.OrganizationType.FOUNDATION,
                "country": "USA",
                "deadline": today + timedelta(days=110),
                "funding_type": Opportunity.FundingType.FULLY_FUNDED,
                "degree_levels": ["Master", "PhD"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan"],
                "required_documents": [
                    "CNIC",
                    "Transcript",
                    "Degree",
                    "CV",
                    "SOP",
                    "Recommendation Letters",
                    "GRE",
                ],
                "tags": ["Sample Data", "Fully Funded", "USA", "Pakistan"],
            },
            {
                "title": "HEC Need-Based Scholarship",
                "slug": "hec-need-based-scholarship",
                "provider_name": "Higher Education Commission Pakistan",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "country": "Pakistan",
                "deadline": today + timedelta(days=45),
                "funding_type": Opportunity.FundingType.NEED_BASED,
                "degree_levels": ["Undergraduate", "Master"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan"],
                "target_regions": ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan"],
                "required_documents": [
                    "CNIC",
                    "Domicile",
                    "Transcript",
                    "Income Certificate",
                ],
                "hec_required": True,
                "tags": ["Sample Data", "HEC", "Need Based", "Pakistan"],
            },
            {
                "title": "PEEF Scholarship",
                "slug": "peef-scholarship",
                "provider_name": "Punjab Educational Endowment Fund",
                "organization_type": Opportunity.OrganizationType.GOVERNMENT,
                "country": "Pakistan",
                "deadline": today + timedelta(days=55),
                "funding_type": Opportunity.FundingType.NEED_BASED,
                "degree_levels": ["Undergraduate", "Master"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan"],
                "target_regions": ["Punjab"],
                "required_documents": [
                    "CNIC",
                    "Domicile",
                    "Transcript",
                    "Income Certificate",
                ],
                "tags": ["Sample Data", "PEEF", "Punjab", "Need Based"],
            },
            {
                "title": "Scotland Pakistan Scholarship",
                "slug": "scotland-pakistan-scholarship",
                "provider_name": "British Council",
                "organization_type": Opportunity.OrganizationType.INTERNATIONAL,
                "country": "Pakistan",
                "deadline": today + timedelta(days=80),
                "funding_type": Opportunity.FundingType.PARTIALLY_FUNDED,
                "degree_levels": ["Undergraduate", "Master"],
                "fields_of_study": ["Education", "Health Sciences", "Food Security"],
                "eligible_countries": ["Pakistan"],
                "gender_eligibility": Opportunity.GenderEligibility.WOMEN_ONLY,
                "required_documents": [
                    "CNIC",
                    "Transcript",
                    "Degree",
                    "SOP",
                ],
                "tags": ["Sample Data", "Women-focused scholarships", "Pakistan"],
            },
            {
                "title": "University Scholarship in China",
                "slug": "university-scholarship-in-china",
                "provider_name": "Sample Chinese University",
                "organization_type": Opportunity.OrganizationType.UNIVERSITY,
                "university_name": "Sample Chinese University",
                "country": "China",
                "deadline": today + timedelta(days=100),
                "funding_type": Opportunity.FundingType.TUITION_WAIVER,
                "degree_levels": ["Master", "PhD"],
                "fields_of_study": ["Computer Science", "Engineering", "Business"],
                "eligible_countries": ["Pakistan", "All Countries"],
                "required_documents": [
                    "Passport",
                    "Transcript",
                    "CV",
                    "Study Plan",
                    "Recommendation Letters",
                ],
                "application_fee_required": True,
                "application_fee_amount": "60.00",
                "application_fee_currency": "USD",
                "tags": ["Sample Data", "China", "Tuition Waiver"],
            },
            {
                "title": "No IELTS Scholarship Example",
                "slug": "no-ielts-scholarship-example",
                "provider_name": "Sample International University",
                "organization_type": Opportunity.OrganizationType.UNIVERSITY,
                "country": "Malaysia",
                "deadline": today + timedelta(days=70),
                "funding_type": Opportunity.FundingType.PARTIALLY_FUNDED,
                "degree_levels": ["Undergraduate", "Master"],
                "fields_of_study": ["All Fields"],
                "eligible_countries": ["Pakistan", "All Countries"],
                "required_documents": [
                    "Passport",
                    "Transcript",
                    "CV",
                    "English Proficiency Certificate",
                ],
                "ielts_required": False,
                "english_proficiency_certificate_accepted": True,
                "tags": ["Sample Data", "No IELTS", "Malaysia"],
            },
        ]

        created = 0
        updated = 0
        for sample in samples:
            base = {
                "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
                "status": Opportunity.Status.PUBLISHED,
                "verified_status": False,
                "featured": sample["slug"]
                in {
                    "chinese-government-scholarship",
                    "taiwan-icdf-scholarship",
                    "turkiye-burslari-scholarship",
                },
                "location_type": Opportunity.LocationType.NOT_APPLICABLE,
                "short_description": (
                    "Development sample opportunity. Verify details from the "
                    "official source before using in production."
                ),
                "description": (
                    "This is sample seed data for local development of Scholars "
                    "Republic. It is not production-verified scholarship data."
                ),
                "benefits": "Sample benefits may include tuition support, stipend, or other assistance.",
                "eligibility": "Sample eligibility criteria for Pakistani students and related applicants.",
                "how_to_apply": "Use the official link after replacing sample data with verified sources.",
                "official_link": "https://example.com",
                "source_url": "https://example.com",
                "source_name": "Sample development source",
                "application_method": Opportunity.ApplicationMethod.OFFICIAL_WEBSITE,
                "search_keywords": " ".join(sample.get("tags", [])),
            }
            base.update(sample)
            _, was_created = Opportunity.objects.update_or_create(
                slug=sample["slug"],
                defaults=base,
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded sample opportunities: {created} created, {updated} updated."
            )
        )
