from rest_framework import status
from rest_framework.test import APITestCase

from apps.reference_data.models import Country


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
