from django.core.management.base import BaseCommand

from apps.reference_data.models import StudyField, StudyFieldCategory


STUDY_FIELDS = {
    "Computer Science & IT": [
        "Computer Science",
        "Software Engineering",
        "Data Science",
        "Artificial Intelligence",
        "Cybersecurity",
        "Information Technology",
        "Computer Engineering",
    ],
    "Engineering": [
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Industrial Engineering",
        "Mechatronics",
        "Aerospace Engineering",
        "Petroleum Engineering",
    ],
    "Medical & Health Sciences": [
        "Medicine",
        "Dentistry",
        "Pharmacy",
        "Nursing",
        "Public Health",
        "Biomedical Sciences",
        "Medical Laboratory Technology",
        "Physiotherapy",
    ],
    "Business & Economics": [
        "Business Administration",
        "Finance",
        "Accounting",
        "Economics",
        "Marketing",
        "Management",
        "Entrepreneurship",
        "Supply Chain Management",
    ],
    "Social Sciences": [
        "International Relations",
        "Political Science",
        "Sociology",
        "Psychology",
        "Development Studies",
        "Media and Communication",
        "Public Administration",
    ],
    "Natural Sciences": [
        "Physics",
        "Chemistry",
        "Mathematics",
        "Biology",
        "Biotechnology",
        "Statistics",
        "Geology",
    ],
    "Agriculture & Environment": [
        "Agriculture",
        "Environmental Sciences",
        "Food Science",
        "Forestry",
        "Climate Change",
        "Renewable Energy",
    ],
    "Arts & Humanities": [
        "English Literature",
        "Linguistics",
        "History",
        "Philosophy",
        "Fine Arts",
        "Design",
    ],
    "Education": [
        "Education",
        "Educational Leadership",
        "Curriculum Studies",
        "TESOL",
    ],
    "Law & Public Policy": [
        "Law",
        "Public Policy",
        "Human Rights",
        "Governance",
    ],
    "Other": [
        "Other",
    ],
}


class Command(BaseCommand):
    help = "Seed study field categories and fields."

    def handle(self, *args, **options):
        created_categories = 0
        created_fields = 0
        updated_fields = 0

        for category_order, category_name in enumerate(STUDY_FIELDS.keys(), start=1):
            category, category_created = StudyFieldCategory.objects.update_or_create(
                name=category_name,
                defaults={
                    "is_active": True,
                    "display_order": category_order,
                },
            )

            if category_created:
                created_categories += 1

            for field_order, field_name in enumerate(STUDY_FIELDS[category_name], start=1):
                _, field_created = StudyField.objects.update_or_create(
                    name=field_name,
                    defaults={
                        "category": category,
                        "is_active": True,
                        "display_order": field_order,
                    },
                )

                if field_created:
                    created_fields += 1
                else:
                    updated_fields += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded study fields. "
                f"Categories created: {created_categories}. "
                f"Fields created: {created_fields}. "
                f"Fields updated: {updated_fields}."
            )
        )
