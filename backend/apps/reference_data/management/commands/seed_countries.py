from django.core.management.base import BaseCommand

from apps.reference_data.models import Country


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
    help = "Seed reference countries and regions."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for region, countries in COUNTRY_REGIONS.items():
            for index, name in enumerate(countries, start=1):
                country, created = Country.objects.update_or_create(
                    name=name,
                    defaults={
                        "region": region,
                        "iso2": ISO2.get(name, ""),
                        "is_active": True,
                        "display_order": index,
                    },
                )

                if created:
                    created_count += 1
                else:
                    updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded countries. Created: {created_count}. Updated: {updated_count}."
            )
        )
