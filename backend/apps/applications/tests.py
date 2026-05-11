from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.applications.models import OpportunityApplication, SavedOpportunity
from apps.reference_data.models import Country, Region, StudyField, StudyFieldCategory

def create_reference_data(testcase):
    testcase.asia, _ = Region.objects.get_or_create(
        name="Asia",
        defaults={"code": "ASIA", "display_order": 1},
    )
    testcase.europe, _ = Region.objects.get_or_create(
        name="Europe",
        defaults={"code": "EUROPE", "display_order": 2},
    )

    testcase.pakistan, _ = Country.objects.get_or_create(
        name="Pakistan",
        defaults={"region": testcase.asia, "iso2": "PK"},
    )
    testcase.china, _ = Country.objects.get_or_create(
        name="China",
        defaults={"region": testcase.asia, "iso2": "CN"},
    )
    testcase.germany, _ = Country.objects.get_or_create(
        name="Germany",
        defaults={"region": testcase.europe, "iso2": "DE"},
    )
    testcase.usa, _ = Country.objects.get_or_create(
        name="USA",
        defaults={"region": testcase.europe, "iso2": "US"},
    )
    testcase.turkey, _ = Country.objects.get_or_create(
        name="Turkey",
        defaults={"region": testcase.asia, "iso2": "TR"},
    )

    testcase.cs_category, _ = StudyFieldCategory.objects.get_or_create(
        name="Computer Science & IT",
        defaults={"display_order": 1},
    )
    testcase.computer_science, _ = StudyField.objects.get_or_create(
        name="Computer Science",
        defaults={"category": testcase.cs_category},
    )
    testcase.data_science, _ = StudyField.objects.get_or_create(
        name="Data Science",
        defaults={"category": testcase.cs_category},
    )
    testcase.medical_category, _ = StudyFieldCategory.objects.get_or_create(
        name="Medical & Health Sciences",
        defaults={"display_order": 2},
    )
    testcase.medicine, _ = StudyField.objects.get_or_create(
        name="Medicine",
        defaults={"category": testcase.medical_category},
    )


from apps.opportunities.models import Opportunity
from apps.users.models import User


class SavedOpportunityAPITests(APITestCase):
    def setUp(self):
        create_reference_data(self)
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

    def test_guest_cannot_list_applications(self):
        response = self.client.get("/api/applications/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_can_start_application_from_saved(self):
        opportunity = self.opportunity(slug="saved-start")
        saved = SavedOpportunity.objects.create(user=self.student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/saved-opportunities/{saved.id}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["opportunity"], opportunity.id)
        self.assertTrue(
            OpportunityApplication.objects.filter(
                user=self.student,
                opportunity=opportunity,
                saved_opportunity=saved,
            ).exists()
        )

    def test_start_application_from_saved_is_idempotent(self):
        opportunity = self.opportunity(slug="saved-idempotent")
        saved = SavedOpportunity.objects.create(user=self.student, opportunity=opportunity)
        application = OpportunityApplication.objects.create(
            user=self.student,
            opportunity=opportunity,
            saved_opportunity=saved,
        )
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/saved-opportunities/{saved.id}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], application.id)
        self.assertEqual(
            OpportunityApplication.objects.filter(
                user=self.student, opportunity=opportunity
            ).count(),
            1,
        )

    def test_student_can_start_application_by_opportunity_slug(self):
        opportunity = self.opportunity(slug="direct-start")
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/opportunities/{opportunity.slug}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            SavedOpportunity.objects.filter(user=self.student, opportunity=opportunity).exists()
        )
        self.assertTrue(
            OpportunityApplication.objects.filter(
                user=self.student, opportunity=opportunity
            ).exists()
        )

    def test_student_can_start_scholarship_application_alias(self):
        opportunity = self.opportunity(slug="scholarship-start")
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/scholarships/{opportunity.slug}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["opportunity"], opportunity.id)

    def test_scholarship_start_alias_rejects_non_scholarship(self):
        opportunity = self.opportunity(
            title="Published Internship",
            slug="internship-start",
            opportunity_type=Opportunity.OpportunityType.INTERNSHIP,
        )
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/scholarships/{opportunity.slug}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_track_draft_opportunity(self):
        opportunity = self.opportunity(slug="draft-track", status=Opportunity.Status.DRAFT)
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/applications/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only published opportunities", str(response.data))

    def test_student_cannot_create_duplicate_application(self):
        opportunity = self.opportunity(slug="duplicate-application")
        OpportunityApplication.objects.create(user=self.student, opportunity=opportunity)
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/applications/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already tracking", str(response.data))

    def test_student_can_list_only_own_applications(self):
        own = self.opportunity(slug="own-application")
        other = self.opportunity(slug="other-application")
        OpportunityApplication.objects.create(user=self.student, opportunity=own)
        OpportunityApplication.objects.create(user=self.other_student, opportunity=other)
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/applications/")

        slugs = [item["opportunity_detail"]["slug"] for item in response.data["results"]]
        self.assertIn("own-application", slugs)
        self.assertNotIn("other-application", slugs)

    def test_student_can_update_status_notes_and_next_step(self):
        opportunity = self.opportunity(slug="update-application")
        application = OpportunityApplication.objects.create(
            user=self.student,
            opportunity=opportunity,
        )
        self.client.force_authenticate(self.student)

        response = self.client.patch(
            f"/api/applications/{application.id}/",
            {
                "status": OpportunityApplication.Status.APPLIED,
                "notes": "Submitted form.",
                "next_step": "Wait for result",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        application.refresh_from_db()
        self.assertEqual(application.status, OpportunityApplication.Status.APPLIED)
        self.assertEqual(application.notes, "Submitted form.")
        self.assertEqual(application.next_step, "Wait for result")

    def test_student_cannot_update_other_students_application(self):
        opportunity = self.opportunity(slug="other-update")
        application = OpportunityApplication.objects.create(
            user=self.other_student,
            opportunity=opportunity,
        )
        self.client.force_authenticate(self.student)

        response = self.client.patch(
            f"/api/applications/{application.id}/",
            {"status": OpportunityApplication.Status.APPLIED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_can_delete_own_application(self):
        opportunity = self.opportunity(slug="delete-application")
        application = OpportunityApplication.objects.create(
            user=self.student,
            opportunity=opportunity,
        )
        self.client.force_authenticate(self.student)

        response = self.client.delete(f"/api/applications/{application.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OpportunityApplication.objects.filter(id=application.id).exists())

    def test_admin_cannot_use_student_application_flow(self):
        opportunity = self.opportunity(slug="admin-application")
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/applications/",
            {"opportunity_id": opportunity.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_application_summary_counts_by_status(self):
        preparing = self.opportunity(slug="summary-preparing")
        applied = self.opportunity(slug="summary-applied")
        OpportunityApplication.objects.create(user=self.student, opportunity=preparing)
        OpportunityApplication.objects.create(
            user=self.student,
            opportunity=applied,
            status=OpportunityApplication.Status.APPLIED,
        )
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/applications/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total"], 2)
        self.assertEqual(response.data["counts_by_status"]["preparing"], 1)
        self.assertEqual(response.data["counts_by_status"]["applied"], 1)

    def test_application_summary_upcoming_deadlines(self):
        opportunity = self.opportunity(slug="summary-deadline")
        OpportunityApplication.objects.create(
            user=self.student,
            opportunity=opportunity,
            personal_deadline=timezone.localdate() + timedelta(days=3),
        )
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/applications/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["upcoming_deadlines"][0]["opportunity"], opportunity.id)

    def test_checklist_snapshot_must_be_list(self):
        opportunity = self.opportunity(slug="bad-checklist")
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/applications/",
            {
                "opportunity_id": opportunity.id,
                "checklist_snapshot": "Prepare SOP",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("checklist_snapshot", response.data)

    def test_start_application_does_not_require_profile(self):
        opportunity = self.opportunity(slug="no-profile-needed")
        self.client.force_authenticate(self.student)

        response = self.client.post(f"/api/opportunities/{opportunity.slug}/start-application/")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            OpportunityApplication.objects.filter(
                user=self.student, opportunity=opportunity
            ).exists()
        )
