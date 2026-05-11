from datetime import timedelta
from io import StringIO

from django.contrib.admin.sites import AdminSite
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

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
    testcase.taiwan, _ = Country.objects.get_or_create(
        name="Taiwan",
        defaults={"region": testcase.asia, "iso2": "TW"},
    )
    testcase.malaysia, _ = Country.objects.get_or_create(
        name="Malaysia",
        defaults={"region": testcase.asia, "iso2": "MY"},
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


from apps.opportunities.admin import OpportunityAdmin
from apps.opportunities.models import Opportunity
from apps.profiles.models import StudentProfile
from apps.users.models import User


class OpportunityAPITests(APITestCase):
    def setUp(self):
        create_reference_data(self)
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

    def empty_opportunity(self, slug, title="Repair Test Scholarship"):
        return Opportunity.objects.create(
            title=title,
            slug=slug,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            status=Opportunity.Status.PUBLISHED,
        )

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

    def test_admin_can_create_opportunity_with_normalized_reference_ids(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            {
                "title": "Normalized Reference Scholarship",
                "slug": "normalized-reference-scholarship",
                "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
                "status": Opportunity.Status.PUBLISHED,
                "provider_name": "Normalized Provider",
                "deadline": timezone.localdate() + timedelta(days=45),
                "country_ref": self.china.id,
                "eligible_country_refs": [self.usa.id],
                "study_field_refs": [self.computer_science.id],
                "all_study_fields": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        opportunity = Opportunity.objects.get(slug="normalized-reference-scholarship")
        self.assertEqual(opportunity.country_ref.name, "China")
        self.assertEqual(
            list(opportunity.eligible_country_refs.values_list("name", flat=True)),
            ["USA"],
        )
        self.assertEqual(
            list(opportunity.study_field_refs.values_list("name", flat=True)),
            ["Computer Science"],
        )

    def test_admin_can_create_opportunity_with_legacy_reference_names(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            {
                "title": "Legacy Reference Scholarship",
                "slug": "legacy-reference-scholarship",
                "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
                "status": Opportunity.Status.PUBLISHED,
                "provider_name": "Legacy Provider",
                "deadline": timezone.localdate() + timedelta(days=45),
                "country": "China",
                "eligible_countries": ["USA"],
                "fields_of_study": ["Medicine"],
                "target_regions": ["Asia"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        opportunity = Opportunity.objects.get(slug="legacy-reference-scholarship")
        self.assertEqual(opportunity.country_ref.name, "China")
        self.assertEqual(
            list(opportunity.eligible_country_refs.values_list("name", flat=True)),
            ["USA"],
        )
        self.assertEqual(
            list(opportunity.study_field_refs.values_list("name", flat=True)),
            ["Medicine"],
        )
        self.assertEqual(
            list(opportunity.eligible_region_refs.values_list("name", flat=True)),
            ["Asia"],
        )

    def test_admin_create_rejects_unknown_legacy_reference_names(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            {
                "title": "Unknown Reference Scholarship",
                "slug": "unknown-reference-scholarship",
                "opportunity_type": Opportunity.OpportunityType.SCHOLARSHIP,
                "status": Opportunity.Status.PUBLISHED,
                "provider_name": "Unknown Provider",
                "country": "Fake Country",
                "eligible_countries": ["Fake Country"],
                "fields_of_study": ["Fake Field"],
                "target_regions": ["Fake Region"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("country", response.data)
        self.assertIn("eligible_countries", response.data)
        self.assertIn("fields_of_study", response.data)
        self.assertIn("target_regions", response.data)

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

    def test_admin_can_patch_opportunity_with_legacy_reference_names(self):
        opportunity = self.opportunity(
            slug="legacy-patch-reference-scholarship",
            country="China",
            fields_of_study=["Computer Science"],
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/opportunities/{opportunity.id}/",
            {
                "country": "USA",
                "fields_of_study": ["Medicine"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.country_ref.name, "USA")
        self.assertEqual(
            list(opportunity.study_field_refs.values_list("name", flat=True)),
            ["Medicine"],
        )

    def test_admin_can_delete_opportunity(self):
        opportunity = self.opportunity()
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f"/api/admin/opportunities/{opportunity.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Opportunity.objects.filter(id=opportunity.id).exists())

    def test_opportunity_admin_reference_display_helpers(self):
        opportunity = self.opportunity()
        opportunity.eligible_region_refs.set([self.asia])
        opportunity_admin = OpportunityAdmin(Opportunity, AdminSite())

        self.assertEqual(opportunity_admin.display_country(opportunity), "China")
        self.assertEqual(
            opportunity_admin.display_eligible_countries(opportunity),
            "Pakistan",
        )
        self.assertEqual(
            opportunity_admin.display_eligible_regions(opportunity),
            "Asia",
        )
        self.assertEqual(
            opportunity_admin.display_study_fields(opportunity),
            "Computer Science",
        )

        all_fields = self.opportunity(
            slug="all-fields-admin-display",
            fields_of_study=["All Fields"],
        )
        self.assertEqual(
            opportunity_admin.display_study_fields(all_fields),
            "All Fields",
        )

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

    def test_repair_opportunity_references_dry_run_does_not_modify_records(self):
        opportunity = self.empty_opportunity("fulbright-pakistan")
        output = StringIO()

        call_command("repair_opportunity_references", stdout=output)

        opportunity.refresh_from_db()
        self.assertIsNone(opportunity.country_ref)
        self.assertEqual(list(opportunity.eligible_country_refs.all()), [])
        self.assertFalse(opportunity.all_study_fields)
        self.assertIn("Dry run only. No changes made.", output.getvalue())

    def test_repair_opportunity_references_fix_updates_mapped_opportunity(self):
        opportunity = self.empty_opportunity("fulbright-pakistan")
        output = StringIO()

        call_command("repair_opportunity_references", "--fix", stdout=output)

        opportunity.refresh_from_db()
        self.assertEqual(opportunity.country_ref.name, "USA")
        self.assertEqual(
            list(opportunity.eligible_country_refs.values_list("name", flat=True)),
            ["Pakistan"],
        )
        self.assertTrue(opportunity.all_study_fields)
        self.assertEqual(list(opportunity.study_field_refs.all()), [])
        self.assertIn("Opportunity references repaired.", output.getvalue())

    def test_repair_opportunity_references_aborts_when_mapping_reference_missing(self):
        opportunity = self.empty_opportunity("fulbright-pakistan")
        self.malaysia.is_active = False
        self.malaysia.save(update_fields=["is_active"])

        with self.assertRaises(CommandError) as error:
            call_command("repair_opportunity_references", "--fix", stdout=StringIO())

        self.assertIn(
            "Missing active country references: Malaysia",
            str(error.exception),
        )
        opportunity.refresh_from_db()
        self.assertIsNone(opportunity.country_ref)

    def test_repair_opportunity_references_skips_unmapped_opportunities(self):
        opportunity = self.empty_opportunity("manual-unmapped-scholarship")
        output = StringIO()

        call_command("repair_opportunity_references", "--fix", stdout=output)

        opportunity.refresh_from_db()
        self.assertIsNone(opportunity.country_ref)
        self.assertIn(
            "Skipped opportunities without explicit mapping",
            output.getvalue(),
        )
        self.assertIn("manual-unmapped-scholarship", output.getvalue())

    def test_repair_opportunity_references_broad_scholarship_clears_fields(self):
        opportunity = self.empty_opportunity("chinese-government-scholarship")
        opportunity.study_field_refs.set([self.computer_science])

        call_command("repair_opportunity_references", "--fix", stdout=StringIO())

        opportunity.refresh_from_db()
        self.assertEqual(opportunity.country_ref.name, "China")
        self.assertTrue(opportunity.all_study_fields)
        self.assertEqual(list(opportunity.study_field_refs.all()), [])

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


class ScholarshipCommentThrottleTests(OpportunityAPITests):
    def test_public_can_read_comments_without_auth(self):
        opportunity = self.opportunity(slug="comments-public-read")
        response = self.client.get(f"/api/scholarships/{opportunity.slug}/comments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_student_comment_posts_are_throttled(self):
        opportunity = self.opportunity(slug="comments-throttle")
        self.client.force_authenticate(self.student)

        last_response = None
        for index in range(11):
            last_response = self.client.post(
                f"/api/scholarships/{opportunity.slug}/comments/",
                {"body": f"Helpful comment {index}"},
                format="json",
            )

        self.assertEqual(last_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
