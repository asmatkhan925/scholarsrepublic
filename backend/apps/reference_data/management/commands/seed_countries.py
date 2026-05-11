from django.core.management.base import BaseCommand

from apps.reference_data.models import Country, Region


COUNTRY_REGIONS = {
    "Asia": [
        "Afghanistan",
        "Bangladesh",
        "Bhutan",
        "Brunei",
        "Cambodia",
        "China",
        "Hong Kong",
        "India",
        "Indonesia",
        "Japan",
        "Kazakhstan",
        "Kyrgyzstan",
        "Laos",
        "Malaysia",
        "Maldives",
        "Mongolia",
        "Myanmar",
        "Nepal",
        "Pakistan",
        "Philippines",
        "Singapore",
        "South Korea",
        "Sri Lanka",
        "Taiwan",
        "Tajikistan",
        "Thailand",
        "Turkmenistan",
        "Uzbekistan",
        "Vietnam",
    ],
    "Europe": [
        "Austria",
        "Belgium",
        "Bulgaria",
        "Croatia",
        "Cyprus",
        "Czech Republic",
        "Denmark",
        "Estonia",
        "Finland",
        "France",
        "Germany",
        "Greece",
        "Hungary",
        "Ireland",
        "Italy",
        "Latvia",
        "Lithuania",
        "Luxembourg",
        "Malta",
        "Netherlands",
        "Norway",
        "Poland",
        "Portugal",
        "Romania",
        "Slovakia",
        "Slovenia",
        "Spain",
        "Sweden",
        "Switzerland",
        "Turkey",
        "UK",
    ],
    "Middle East": [
        "Bahrain",
        "Iran",
        "Iraq",
        "Israel",
        "Jordan",
        "Kuwait",
        "Lebanon",
        "Oman",
        "Palestine",
        "Qatar",
        "Saudi Arabia",
        "Syria",
        "UAE",
        "Yemen",
    ],
    "Africa": [
        "Algeria",
        "Botswana",
        "Cameroon",
        "Egypt",
        "Ethiopia",
        "Ghana",
        "Kenya",
        "Morocco",
        "Nigeria",
        "Rwanda",
        "Senegal",
        "South Africa",
        "Tanzania",
        "Tunisia",
        "Uganda",
        "Zambia",
        "Zimbabwe",
    ],
    "North America": [
        "Canada",
        "Mexico",
        "USA",
    ],
    "Latin America": [
        "Argentina",
        "Brazil",
        "Chile",
        "Colombia",
        "Costa Rica",
        "Ecuador",
        "Peru",
        "Uruguay",
    ],
    "Oceania": [
        "Australia",
        "Fiji",
        "New Zealand",
    ],
    "Other": [
        "Other",
    ],
}


ISO2 = {
    "Afghanistan": "AF",
    "Bangladesh": "BD",
    "Bhutan": "BT",
    "Brunei": "BN",
    "Cambodia": "KH",
    "China": "CN",
    "Hong Kong": "HK",
    "India": "IN",
    "Indonesia": "ID",
    "Japan": "JP",
    "Kazakhstan": "KZ",
    "Kyrgyzstan": "KG",
    "Malaysia": "MY",
    "Maldives": "MV",
    "Mongolia": "MN",
    "Myanmar": "MM",
    "Nepal": "NP",
    "Pakistan": "PK",
    "Philippines": "PH",
    "Singapore": "SG",
    "South Korea": "KR",
    "Sri Lanka": "LK",
    "Taiwan": "TW",
    "Tajikistan": "TJ",
    "Thailand": "TH",
    "Turkmenistan": "TM",
    "Uzbekistan": "UZ",
    "Vietnam": "VN",
    "Germany": "DE",
    "Turkey": "TR",
    "UK": "GB",
    "USA": "US",
    "Canada": "CA",
    "Australia": "AU",
    "New Zealand": "NZ",
    "Saudi Arabia": "SA",
    "Qatar": "QA",
    "UAE": "AE",
}


class Command(BaseCommand):
    help = "Seed regions and countries."

    def handle(self, *args, **options):
        created_regions = 0
        created_countries = 0
        updated_countries = 0

        for region_order, region_name in enumerate(COUNTRY_REGIONS.keys(), start=1):
            region, region_created = Region.objects.update_or_create(
                name=region_name,
                defaults={
                    "code": region_name.upper().replace(" ", "_"),
                    "is_active": True,
                    "display_order": region_order,
                },
            )

            if region_created:
                created_regions += 1

            for country_order, country_name in enumerate(COUNTRY_REGIONS[region_name], start=1):
                _, country_created = Country.objects.update_or_create(
                    name=country_name,
                    defaults={
                        "region": region,
                        "iso2": ISO2.get(country_name, ""),
                        "is_active": True,
                        "display_order": country_order,
                    },
                )

                if country_created:
                    created_countries += 1
                else:
                    updated_countries += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded reference countries. "
                f"Regions created: {created_regions}. "
                f"Countries created: {created_countries}. "
                f"Countries updated: {updated_countries}."
            )
        )
