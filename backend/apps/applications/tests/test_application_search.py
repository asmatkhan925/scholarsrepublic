from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.applications.models import OpportunityApplication
from apps.opportunities.models import Opportunity


class ApplicationSearchTests(APITestCase):
    def setUp(self):
        User = get_user_model()

        self.student = User.objects.create_user(
            email="student-search@example.com",
            password="StrongPass123!",
            full_name="Search Test Student",
            role=User.Role.STUDENT,
        )

        self.other_student = User.objects.create_user(
            email="other-search@example.com",
            password="StrongPass123!",
            full_name="Other Student",
            role=User.Role.STUDENT,
        )

        self.china_opportunity = Opportunity.objects.create(
            title="China Government Scholarship",
            slug="china-government-scholarship-search-test",
            status=Opportunity.Status.PUBLISHED,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            provider_name="China Scholarship Council",
            university_name="Tsinghua University",
            short_description="Fully funded scholarship in China",
            search_keywords="china csc fully funded",
        )

        self.germany_opportunity = Opportunity.objects.create(
            title="Germany Research Scholarship",
            slug="germany-research-scholarship-search-test",
            status=Opportunity.Status.PUBLISHED,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            provider_name="German Academic Exchange Service",
            university_name="Technical University",
            short_description="Research scholarship in Germany",
            search_keywords="germany daad research",
        )

        OpportunityApplication.objects.create(
            user=self.student,
            opportunity=self.china_opportunity,
            notes="Prepare SOP and transcript",
            next_step="Review China scholarship portal",
        )

        OpportunityApplication.objects.create(
            user=self.student,
            opportunity=self.germany_opportunity,
            notes="Request recommendation letter",
            next_step="Prepare research proposal",
        )

        OpportunityApplication.objects.create(
            user=self.other_student,
            opportunity=self.china_opportunity,
            notes="This must not appear for the logged-in student",
        )

        self.url = reverse("application-list")

    def test_application_search_returns_200_and_filters_results(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.get(self.url, {"search": "china"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["opportunity_detail"]["title"],
            "China Government Scholarship",
        )

    def test_application_search_checks_notes_and_next_step(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.get(self.url, {"search": "research proposal"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["opportunity_detail"]["title"],
            "Germany Research Scholarship",
        )

    def test_application_search_is_limited_to_authenticated_student(self):
        self.client.force_authenticate(user=self.other_student)

        response = self.client.get(self.url, {"search": "china"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["opportunity_detail"]["title"],
            "China Government Scholarship",
        )
