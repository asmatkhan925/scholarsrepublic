from datetime import timedelta

from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.opportunities.models import Opportunity
from apps.profiles.models import StudentProfile
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

    def profile(self, user=None, **overrides):
        data = {
            "user": user or self.student,
            "nationality": "Pakistan",
            "current_country": "Pakistan",
            "city": "Lahore",
            "province": StudentProfile.Province.PUNJAB,
            "domicile": "Punjab",
            "current_education_level": StudentProfile.EducationLevel.BACHELOR,
            "current_field_of_study": "Computer Science",
            "target_degree_level": StudentProfile.TargetDegree.MASTER,
            "target_fields": ["Computer Science"],
            "target_countries": ["China"],
            "funding_preference": StudentProfile.FundingPreference.FULLY_FUNDED,
            "application_fee_preference": StudentProfile.ApplicationFeePreference.NO_FEE,
            "grading_system": StudentProfile.GradingSystem.CGPA_4,
            "cgpa": "3.60",
            "has_passport": True,
            "has_transcript": True,
            "has_degree": True,
            "has_cv": True,
            "has_study_plan": True,
            "has_recommendation_letters": True,
            "recommendation_letters_count": 2,
            "english_proficiency_certificate": True,
            "has_english_proficiency_letter": True,
            "profile_data_consent": True,
        }
        data.update(overrides)
        return StudentProfile.objects.create(**data)

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

    def test_filter_verified(self):
        verified = self.opportunity(slug="verified-opportunity", verified_status=True)
        self.opportunity(slug="unverified-opportunity", verified_status=False)

        response = self.client.get("/api/opportunities/?verified=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(verified.slug, slugs)
        self.assertNotIn("unverified-opportunity", slugs)

    def test_search_filters_opportunities(self):
        china = self.opportunity(
            slug="china-search-opportunity",
            title="China Search Scholarship",
            search_keywords="china asia fully funded",
        )
        self.opportunity(
            slug="turkey-search-opportunity",
            title="Turkey Search Scholarship",
            country="Turkey",
            search_keywords="turkey europe",
        )

        response = self.client.get("/api/opportunities/?search=china")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(china.slug, slugs)
        self.assertNotIn("turkey-search-opportunity", slugs)

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

    def test_guest_cannot_access_match_endpoint(self):
        opportunity = self.opportunity()

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_cannot_use_student_match_endpoint(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.admin)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_without_profile_gets_helpful_match_error(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Complete your student profile", response.data["detail"])

    def test_student_gets_match_score_for_published_scholarship(self):
        self.profile()
        opportunity = self.opportunity(required_documents=["Passport", "Transcript", "CV"])
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("score", response.data)
        self.assertIn("breakdown", response.data)
        self.assertIn("matched_reasons", response.data)
        self.assertIn("missing_requirements", response.data)
        self.assertIn("warnings", response.data)

    def test_draft_opportunity_match_not_visible_to_student(self):
        self.profile()
        opportunity = self.opportunity(status=Opportunity.Status.DRAFT)
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_strong_match_scores_high(self):
        self.profile()
        opportunity = self.opportunity(
            slug="strong-match",
            eligible_countries=["Pakistan"],
            degree_levels=["Master"],
            fields_of_study=["Computer Science"],
            country="China",
            funding_type=Opportunity.FundingType.FULLY_FUNDED,
            application_fee_required=False,
            required_documents=["Passport", "Transcript", "CV", "Study Plan"],
            ielts_required=False,
            min_cgpa="3.00",
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertGreaterEqual(response.data["score"], 75)

    def test_weak_match_scores_low(self):
        self.profile(
            target_degree_level=StudentProfile.TargetDegree.MASTER,
            target_fields=["Computer Science"],
            target_countries=["China"],
            has_passport=False,
            has_transcript=False,
            has_cv=False,
            has_study_plan=False,
            has_recommendation_letters=False,
            recommendation_letters_count=0,
        )
        opportunity = self.opportunity(
            slug="weak-match",
            eligible_countries=["USA"],
            degree_levels=["PhD"],
            fields_of_study=["Medicine"],
            country="Germany",
            funding_type=Opportunity.FundingType.SELF_FUNDED,
            application_fee_required=True,
            required_documents=["Passport", "CV", "SOP"],
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertLessEqual(response.data["score"], 40)

    def test_missing_documents_are_reported(self):
        self.profile(has_sop=False, has_study_plan=False)
        opportunity = self.opportunity(
            slug="missing-documents-match",
            required_documents=["Passport", "CV", "SOP"],
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertIn("SOP", response.data["missing_requirements"])

    def test_deadline_warning_appears(self):
        self.profile()
        opportunity = self.opportunity(
            slug="close-deadline-match",
            deadline=timezone.localdate() + timedelta(days=5),
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertIn("Deadline is very close.", response.data["warnings"])

    def test_expired_opportunity_match_warns_student(self):
        self.profile()
        opportunity = self.opportunity(
            slug="expired-match",
            deadline=timezone.localdate() - timedelta(days=1),
        )
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("This opportunity appears expired.", response.data["warnings"])

    def test_recommended_scholarships_sorted_by_score(self):
        self.profile()
        high = self.opportunity(
            slug="recommended-high",
            country="China",
            eligible_countries=["Pakistan"],
            degree_levels=["Master"],
            fields_of_study=["Computer Science"],
            required_documents=["Passport", "CV"],
        )
        low = self.opportunity(
            slug="recommended-low",
            country="Germany",
            eligible_countries=["USA"],
            degree_levels=["PhD"],
            fields_of_study=["Medicine"],
            required_documents=["Passport", "SOP", "GRE"],
        )
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/scholarships/recommended/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["opportunity"]["slug"] for item in response.data["results"]]
        self.assertLess(slugs.index(high.slug), slugs.index(low.slug))
        scores = [item["match"]["score"] for item in response.data["results"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_recommended_opportunities_only_published(self):
        self.profile()
        published = self.opportunity(slug="published-recommended")
        draft = self.opportunity(slug="draft-recommended", status=Opportunity.Status.DRAFT)
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/opportunities/recommended/")

        slugs = [item["opportunity"]["slug"] for item in response.data["results"]]
        self.assertIn(published.slug, slugs)
        self.assertNotIn(draft.slug, slugs)

    def test_scholarship_recommended_alias_only_scholarships(self):
        self.profile()
        scholarship = self.opportunity(slug="recommended-scholarship-only")
        self.opportunity(
            slug="recommended-job-hidden",
            title="Recommended Job Hidden",
            opportunity_type=Opportunity.OpportunityType.JOB,
        )
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/scholarships/recommended/")

        slugs = [item["opportunity"]["slug"] for item in response.data["results"]]
        self.assertIn(scholarship.slug, slugs)
        self.assertNotIn("recommended-job-hidden", slugs)

    def test_academic_requirement_matching(self):
        self.profile(cgpa="3.60", grading_system=StudentProfile.GradingSystem.CGPA_4)
        opportunity = self.opportunity(slug="academic-match", min_cgpa="3.20")
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.data["breakdown"]["academic_requirement"], 10)

    def test_language_requirement_matching(self):
        self.profile(has_ielts=True)
        opportunity = self.opportunity(slug="language-match", ielts_required=True)
        self.client.force_authenticate(self.student)

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/match/")

        self.assertEqual(response.data["breakdown"]["language_test"], 10)
