from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.opportunities.models import Opportunity
from apps.users.models import User


class OpportunityAPITests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="student@example.com",
            password="StrongPassword123!",
            full_name="Student User",
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
            "tags": ["Sample Data", "Fully Funded"],
        }
        data.update(overrides)
        return Opportunity.objects.create(**data)

    def admin_payload(self):
        return {
            "title": "Admin Created Scholarship",
            "slug": "admin-created-scholarship",
            "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
            "status": Opportunity.Status.PUBLISHED,
            "country": "Turkey",
            "provider_name": "Sample Government",
            "funding_type": Opportunity.FundingType.FULLY_FUNDED,
            "eligible_countries": ["Pakistan"],
            "degree_levels": ["Undergraduate"],
            "fields_of_study": ["All Fields"],
            "required_documents": ["Passport", "CV"],
        }

    def results(self, response):
        return response.data["results"]

    def test_public_can_list_published_opportunities(self):
        opportunity = self.opportunity()

        response = self.client.get("/api/opportunities/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(opportunity.slug, [item["slug"] for item in self.results(response)])

    def test_public_cannot_list_draft_opportunities(self):
        draft = self.opportunity(
            title="Draft Opportunity",
            slug="draft-opportunity",
            status=Opportunity.Status.DRAFT,
        )

        response = self.client.get("/api/opportunities/")

        self.assertNotIn(draft.slug, [item["slug"] for item in self.results(response)])

    def test_public_can_view_published_opportunity_detail(self):
        opportunity = self.opportunity()

        response = self.client.get(f"/api/opportunities/{opportunity.slug}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], opportunity.slug)

    def test_public_cannot_view_draft_detail(self):
        opportunity = self.opportunity(status=Opportunity.Status.DRAFT)

        response = self.client.get(f"/api/opportunities/{opportunity.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scholarships_alias_returns_only_scholarships(self):
        scholarship = self.opportunity(slug="scholarship-only")
        self.opportunity(
            title="Sample Job",
            slug="sample-job",
            opportunity_type=Opportunity.OpportunityType.JOB,
            country="Pakistan",
        )

        response = self.client.get("/api/scholarships/")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(scholarship.slug, slugs)
        self.assertNotIn("sample-job", slugs)

    def test_filter_by_country(self):
        china = self.opportunity(slug="china-opportunity", country="China")
        self.opportunity(slug="germany-opportunity", country="Germany")

        response = self.client.get("/api/opportunities/?country=China")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertEqual(slugs, [china.slug])

    def test_filter_no_ielts(self):
        no_ielts = self.opportunity(slug="no-ielts", ielts_required=False)
        self.opportunity(slug="ielts-required", ielts_required=True)

        response = self.client.get("/api/scholarships/?no_ielts=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(no_ielts.slug, slugs)
        self.assertNotIn("ielts-required", slugs)

    def test_filter_no_application_fee(self):
        no_fee = self.opportunity(slug="no-fee", application_fee_required=False)
        self.opportunity(slug="fee-required", application_fee_required=True)

        response = self.client.get("/api/scholarships/?no_application_fee=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(no_fee.slug, slugs)
        self.assertNotIn("fee-required", slugs)

    def test_admin_can_create_opportunity(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            self.admin_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Admin Created Scholarship")

    def test_student_cannot_create_admin_opportunity(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/admin/opportunities/",
            self.admin_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guest_cannot_create_admin_opportunity(self):
        response = self.client.post(
            "/api/admin/opportunities/",
            self.admin_payload(),
            format="json",
        )

        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_admin_can_update_opportunity(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/opportunities/{opportunity.id}/",
            {"title": "Updated Opportunity", "status": Opportunity.Status.ARCHIVED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Opportunity")
        self.assertEqual(response.data["status"], Opportunity.Status.ARCHIVED)

    def test_admin_can_delete_opportunity(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f"/api/admin/opportunities/{opportunity.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Opportunity.objects.filter(id=opportunity.id).exists())

    def test_model_is_expired(self):
        opportunity = self.opportunity(deadline=timezone.localdate() - timedelta(days=1))

        self.assertTrue(opportunity.is_expired)

    def test_model_days_until_deadline(self):
        opportunity = self.opportunity(deadline=timezone.localdate() + timedelta(days=14))

        self.assertEqual(opportunity.days_until_deadline, 14)

    def test_validation_salary_min_less_than_max(self):
        with self.assertRaises(ValidationError):
            self.opportunity(
                opportunity_type=Opportunity.OpportunityType.JOB,
                salary_min="5000.00",
                salary_max="4000.00",
            )

    def test_json_list_validation(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            {**self.admin_payload(), "eligible_countries": "Pakistan"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
