from rest_framework import status
from rest_framework.test import APITestCase

from apps.reference_data.models import Country, StudyField


class CountryReferenceAPITests(APITestCase):
    def test_public_can_list_active_countries_grouped_by_region(self):
        Country.objects.create(name="Pakistan", region=Country.Region.ASIA, iso2="PK")
        Country.objects.create(name="Germany", region=Country.Region.EUROPE, iso2="DE")

        response = self.client.get("/api/reference/countries/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertIn("Asia", response.data["regions"])
        self.assertIn("Europe", response.data["regions"])
        self.assertIn("Pakistan", response.data["regions"]["Asia"])
        self.assertIn("Germany", response.data["regions"]["Europe"])

    def test_inactive_countries_are_hidden(self):
        Country.objects.create(name="Visible Country", region=Country.Region.OTHER, is_active=True)
        Country.objects.create(name="Hidden Country", region=Country.Region.OTHER, is_active=False)

        response = self.client.get("/api/reference/countries/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [country["name"] for country in response.data["results"]]
        self.assertIn("Visible Country", names)
        self.assertNotIn("Hidden Country", names)


class StudyFieldReferenceAPITests(APITestCase):
    def test_public_can_list_active_study_fields_grouped_by_category(self):
        StudyField.objects.create(
            name="Computer Science",
            category=StudyField.Category.COMPUTER_SCIENCE,
        )
        StudyField.objects.create(
            name="Medicine",
            category=StudyField.Category.MEDICAL,
        )

        response = self.client.get("/api/reference/study-fields/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertIn("Computer Science & IT", response.data["categories"])
        self.assertIn("Medical & Health Sciences", response.data["categories"])
        self.assertIn("Computer Science", response.data["categories"]["Computer Science & IT"])
        self.assertIn("Medicine", response.data["categories"]["Medical & Health Sciences"])

    def test_inactive_study_fields_are_hidden(self):
        StudyField.objects.create(
            name="Visible Field",
            category=StudyField.Category.OTHER,
            is_active=True,
        )
        StudyField.objects.create(
            name="Hidden Field",
            category=StudyField.Category.OTHER,
            is_active=False,
        )

        response = self.client.get("/api/reference/study-fields/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [field["name"] for field in response.data["results"]]
        self.assertIn("Visible Field", names)
        self.assertNotIn("Hidden Field", names)
