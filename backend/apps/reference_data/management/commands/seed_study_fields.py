from django.core.management.base import BaseCommand

from apps.reference_data.models import StudyField


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
    help = "Seed common study fields and categories."

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for category, fields in STUDY_FIELDS.items():
            for index, name in enumerate(fields, start=1):
                _, created = StudyField.objects.update_or_create(
                    name=name,
                    defaults={
                        "category": category,
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
                f"Seeded study fields. Created: {created_count}. Updated: {updated_count}."
            )
        )
