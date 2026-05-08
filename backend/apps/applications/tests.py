from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.applications.models import SavedOpportunity
from apps.opportunities.models import Opportunity
from apps.users.models import User


class SavedOpportunityAPITests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="student@example.com",
            password="StrongPassword123!",
            full_name="Student User",
        )
        self.other_student = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            full_name="Other Student",
        )
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPassword123!",
            full_name="Admin User",
        )

    def opportunity(self, **overrides):
        data = {
            "title": "Published Scholarship",
            "slug": "published-scholarship",
            "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
            "status": Opportunity.Status.PUBLISHED,
            "country": "China",
            "provider_name": "Sample Provider",
            "funding_type": Opportunity.FundingType.FULLY_FUNDED,
            "eligible_countries": ["Pakistan"],
            "degree_levels": ["Master"],
            "fields_of_study": ["Computer Science"],
            "deadline": timezone.localdate() + timedelta(days=30),
            "required_documents": ["Passport", "Transcript"],
            "tags": ["Sample Data"],
        }
        data.update(overrides)
        return Opportunity.objects.create(**data)

    def test_guest_cannot_list_saved_opportunities(self):
        response = self.client.get("/api/saved-opportunities/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_can_save_published_opportunity(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/saved-opportunities/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["opportunity"], opportunity.id)
        self.assertTrue(
            SavedOpportunity.objects.filter(user=self.student, opportunity=opportunity).exists()
        )

    def test_student_cannot_save_draft_opportunity(self):
        opportunity = self.opportunity(status=Opportunity.Status.DRAFT)
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/saved-opportunities/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only published opportunities", str(response.data))

    def test_student_cannot_save_same_opportunity_twice(self):
        opportunity = self.opportunity()
        SavedOpportunity.objects.create(user=self.student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/saved-opportunities/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Opportunity already saved.", str(response.data))

    def test_student_can_list_only_own_saved_opportunities(self):
        own = self.opportunity(slug="own-saved")
        other = self.opportunity(slug="other-saved")
        SavedOpportunity.objects.create(user=self.student, opportunity=own)
        SavedOpportunity.objects.create(user=self.other_student, opportunity=other)
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/saved-opportunities/")

        slugs = [item["opportunity_detail"]["slug"] for item in response.data["results"]]
        self.assertIn("own-saved", slugs)
        self.assertNotIn("other-saved", slugs)

    def test_student_can_delete_own_saved_opportunity(self):
        opportunity = self.opportunity()
        saved = SavedOpportunity.objects.create(user=self.student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.delete(f"/api/saved-opportunities/{saved.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavedOpportunity.objects.filter(id=saved.id).exists())

    def test_student_cannot_delete_other_students_saved_opportunity(self):
        opportunity = self.opportunity()
        saved = SavedOpportunity.objects.create(user=self.other_student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.delete(f"/api/saved-opportunities/{saved.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(SavedOpportunity.objects.filter(id=saved.id).exists())

    def test_admin_cannot_use_student_saved_flow(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/saved-opportunities/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_saved_slugs_endpoint_returns_current_user_saved_slugs(self):
        first = self.opportunity(slug="first-saved")
        second = self.opportunity(slug="second-saved")
        SavedOpportunity.objects.create(user=self.student, opportunity=first)
        SavedOpportunity.objects.create(user=self.student, opportunity=second)
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/saved-opportunities/slugs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertCountEqual(response.data["slugs"], ["first-saved", "second-saved"])
        self.assertCountEqual(response.data["ids"], [first.id, second.id])

    def test_save_by_opportunity_slug(self):
        opportunity = self.opportunity(slug="save-by-slug")
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/opportunities/{opportunity.slug}/save/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            SavedOpportunity.objects.filter(user=self.student, opportunity=opportunity).exists()
        )

        second_response = self.client.post(f"/api/opportunities/{opportunity.slug}/save/")
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)

    def test_unsave_by_opportunity_slug(self):
        opportunity = self.opportunity(slug="unsave-by-slug")
        SavedOpportunity.objects.create(user=self.student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.delete(f"/api/opportunities/{opportunity.slug}/save/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            SavedOpportunity.objects.filter(user=self.student, opportunity=opportunity).exists()
        )

    def test_scholarship_save_alias_rejects_non_scholarship(self):
        opportunity = self.opportunity(
            title="Published Job",
            slug="published-job",
            opportunity_type=Opportunity.OpportunityType.JOB,
        )
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/scholarships/{opportunity.slug}/save/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
