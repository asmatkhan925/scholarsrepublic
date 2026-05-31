from datetime import date, datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from io import BytesIO, StringIO
import base64
import json
import tempfile
from unittest.mock import patch

from django.contrib.admin.sites import AdminSite
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.utils import DataError
from django.test import RequestFactory, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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
    testcase.italy, _ = Country.objects.get_or_create(
        name="Italy",
        defaults={"region": testcase.europe, "iso2": "IT"},
    )
    testcase.south_korea, _ = Country.objects.get_or_create(
        name="South Korea",
        defaults={"region": testcase.asia, "iso2": "KR"},
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


from apps.opportunities.admin import OpportunityAdmin, OpportunityDraftAdmin
from apps.opportunities.models import (
    Opportunity,
    OpportunityCollection,
    OpportunityCollectionItem,
    OpportunityCollectionSocialPostLog,
    OpportunityCollectionSocialPostPlan,
    OpportunityComment,
    OpportunityDeadlineCheckLog,
    OpportunityDraft,
    OpportunityPathway,
    OpportunitySocialDraft,
    OpportunitySocialPostLog,
    OpportunitySocialPostPlan,
    OpportunitySourceLinkCorrectionLog,
    ScholarshipResearchLead,
)
from apps.opportunities.services.social_collections import (
    approve_social_collections,
    evaluate_collection_auto_approval,
    generate_social_collections,
)
from apps.opportunities.services.social_collection_posting import (
    build_collection_social_post_text,
    create_collection_social_post_plan,
    create_due_collection_social_post_plans,
)
from apps.opportunities.services.opportunity_draft_importer import (
    import_opportunity_draft,
    validate_opportunity_draft_payload,
)
from apps.opportunities.services.social_scheduler import (
    apply_social_priority,
    score_opportunity_for_social,
)
from apps.opportunities.services.social_image_uploads import save_social_image_from_base64
from apps.opportunities.services.social_posting import (
    generate_facebook_post_text,
    get_due_facebook_post_plans,
    plan_image_url,
)
from apps.opportunities.services.deadline_checker import classify_deadline_candidates
from apps.opportunities.services.duplicate_detector import find_duplicate_opportunities
from apps.profiles.models import StudentProfile
from apps.users.models import User


VALID_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGNg"
    "YPgPAAEDAQCqD6nFAAAAAElFTkSuQmCC"
)


class FakeImageResponse:
    headers = {"content-type": "image/png"}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, _size=-1):
        return VALID_PNG_BYTES


class FakeWorkerResponse:
    def __init__(self, payload=None, status_code=200, text=None):
        self.payload = payload if payload is not None else {
            "ok": True,
            "status": "posted",
            "facebook_post_id": "123_456",
            "facebook_post_url": "https://www.facebook.com/123/posts/456",
        }
        self.status_code = status_code
        self.ok = 200 <= status_code < 300
        self.text = text if text is not None else json.dumps(self.payload)

    def json(self):
        return self.payload


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
            "deadline": timezone.localdate() + timedelta(days=10),
            "short_description": "A complete scholarship summary.",
            "description": "A complete scholarship description for applicants.",
            "how_to_apply": "Apply through the official scholarship portal.",
            "official_link": "https://example.edu/scholarship",
            "source_url": "https://example.edu/scholarship/source",
            "university_name": "Sample University",
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

    def test_opportunity_save_generates_slug(self):
        opportunity = Opportunity.objects.create(
            title="Generated Slug Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )

        self.assertEqual(opportunity.slug, "generated-slug-scholarship")

    def test_opportunity_save_generates_unique_duplicate_slug(self):
        first = Opportunity.objects.create(
            title="Duplicate Slug Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        second = Opportunity.objects.create(
            title="Duplicate Slug Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )

        self.assertEqual(first.slug, "duplicate-slug-scholarship")
        self.assertEqual(second.slug, "duplicate-slug-scholarship-2")

    def test_opportunity_save_sets_published_at(self):
        opportunity = Opportunity.objects.create(
            title="Published Timestamp Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            status=Opportunity.Status.PUBLISHED,
        )

        self.assertIsNotNone(opportunity.published_at)

    def test_opportunity_save_sets_last_verified_at(self):
        opportunity = Opportunity.objects.create(
            title="Verified Timestamp Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
            verified_status=True,
        )

        self.assertIsNotNone(opportunity.last_verified_at)

    def test_opportunity_save_syncs_pending_eligible_countries(self):
        opportunity = Opportunity(
            title="Eligible Country Sync Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        opportunity.eligible_countries = ["Pakistan", "China"]
        opportunity.save()

        self.assertEqual(
            list(opportunity.eligible_country_refs.order_by("name").values_list("name", flat=True)),
            ["China", "Pakistan"],
        )

    def test_opportunity_save_syncs_pending_target_regions(self):
        opportunity = Opportunity(
            title="Target Region Sync Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        opportunity.target_regions = ["Asia"]
        opportunity.save()

        self.assertEqual(
            list(opportunity.eligible_region_refs.order_by("name").values_list("name", flat=True)),
            ["Asia"],
        )

    def test_opportunity_save_syncs_pending_fields_of_study(self):
        opportunity = Opportunity(
            title="Study Field Sync Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        opportunity.fields_of_study = ["Computer Science", "Medicine"]
        opportunity.save()

        self.assertFalse(opportunity.all_study_fields)
        self.assertEqual(
            list(opportunity.study_field_refs.order_by("name").values_list("name", flat=True)),
            ["Computer Science", "Medicine"],
        )

    def test_opportunity_save_all_fields_clears_field_refs(self):
        opportunity = Opportunity(
            title="All Fields Sync Scholarship",
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        opportunity.fields_of_study = ["Computer Science"]
        opportunity.save()

        opportunity.fields_of_study = ["All Fields"]
        opportunity.save()
        opportunity.refresh_from_db()

        self.assertTrue(opportunity.all_study_fields)
        self.assertFalse(opportunity.study_field_refs.exists())

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

    def pathway(self):
        parent = OpportunityPathway.objects.create(
            title="China Scholarships",
            slug="china-scholarships-draft-import",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            display_order=10,
        )
        program = OpportunityPathway.objects.create(
            title="Chinese Government Scholarship / CSC",
            slug="chinese-government-scholarship-csc-draft-import",
            country_ref=self.china,
            parent=parent,
            pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
            display_order=20,
        )
        return OpportunityPathway.objects.create(
            title="CSC University Track",
            slug="csc-university-track-draft-import",
            country_ref=self.china,
            parent=program,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
            display_order=30,
        )

    def collection_candidate_plan(
        self,
        slug,
        *,
        country="Italy",
        degree_level="PhD",
        funding_type=Opportunity.FundingType.PARTIALLY_FUNDED,
        field_label="Computer Science",
        deadline_days=20,
        priority_score=50,
    ):
        opportunity = self.opportunity(
            slug=slug,
            title=slug.replace("-", " ").title(),
            country=country,
            degree_levels=[degree_level],
            fields_of_study=[field_label],
            funding_type=funding_type,
            deadline=timezone.localdate() + timedelta(days=deadline_days),
            verified_status=True,
            official_link=f"https://example.edu/{slug}",
            source_url=f"https://example.edu/{slug}/source",
            university_name="Example University",
            published_at=timezone.now() - timedelta(days=10),
        )
        return OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            priority_score=priority_score,
            priority_reason={"test_collection_candidate": True},
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.COLLECTION_CANDIDATE,
        )

    def collection_from_plans(
        self,
        title,
        plans,
        *,
        collection_type=OpportunityCollection.CollectionType.COUNTRY_DEGREE,
        country="Italy",
        degree_level="PhD",
        funding_type="",
        status=OpportunityCollection.Status.READY,
        priority_score=None,
    ):
        collection = OpportunityCollection.objects.create(
            title=title,
            collection_type=collection_type,
            country=country,
            degree_level=degree_level,
            funding_type=funding_type,
            status=status,
            source=OpportunityCollection.Source.SYSTEM,
            priority_score=priority_score
            if priority_score is not None
            else sum(plan.priority_score for plan in plans),
        )
        for index, plan in enumerate(plans, start=1):
            OpportunityCollectionItem.objects.create(
                collection=collection,
                opportunity=plan.opportunity,
                social_post_plan=plan,
                position=index,
            )
        return collection

    def draft_payload(self, **opportunity_overrides):
        pathway = opportunity_overrides.pop("pathway", None)
        if pathway is None:
            pathway = self.pathway().full_path
        opportunity = {
            "title": "CSC Scholarship at Example University 2026",
            "slug": "csc-scholarship-example-university-2026",
            "pathway": pathway,
            "country": "China",
            "eligible_countries": ["Pakistan"],
            "university_name": "Example University",
            "department_name": "",
            "lab_name": "",
            "professor_name": "",
            "application_track": "university",
            "opportunity_type": "scholarship",
            "funding_type": "fully_funded",
            "degree_levels": ["Master", "PhD"],
            "fields_of_study": ["All Fields"],
            "all_study_fields": True,
            "deadline": (timezone.localdate() + timedelta(days=30)).isoformat(),
            "is_rolling_deadline": False,
            "official_link": "https://example.edu/scholarship",
            "source_url": "https://example.edu/scholarship",
            "source_name": "Example University official website",
            "short_description": "A concise student-facing summary.",
            "description": "Longer explanation.",
            "benefits": "Funding benefits from official source.",
            "eligibility": "Eligibility from official source.",
            "required_documents": ["Passport", "Transcripts", "Study plan"],
            "how_to_apply": "How to apply from official source.",
            "tags": ["China", "CSC", "University Track"],
        }
        opportunity.update(opportunity_overrides)
        return {
            "draft_type": "specific_opportunity",
            "parent_program": "Chinese Government Scholarship / CSC",
            "confidence": "medium",
            "publish_recommendation": "save_as_draft",
            "source_notes": [
                {
                    "source_name": "Official university page",
                    "url": "https://example.edu/scholarship",
                    "used_for": ["deadline", "eligibility", "application process"],
                }
            ],
            "opportunity": opportunity,
            "social_posts": {"facebook": "", "instagram": "", "x": ""},
            "admin_review_checklist": [
                "Verify final deadline on official source",
                "Verify eligibility",
                "Verify required documents",
            ],
        }

    def results(self, response):
        return response.data["results"]

    def agent_headers(self, token="test-token"):
        return {"HTTP_X_AGENT_TOKEN": token}

    def assert_json_response(self, response):
        self.assertIn("application/json", response["Content-Type"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_rejects_missing_token_with_json_403(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": self.draft_payload()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_rejects_wrong_token_with_json_403(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": self.draft_payload()},
            format="json",
            **self.agent_headers("wrong-token"),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="")
    def test_agent_validate_returns_json_403_when_token_not_configured(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": self.draft_payload()},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Agent API is not configured."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_accepts_payload_shape(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": self.draft_payload()},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["errors"], [])
        self.assertIn("normalized_payload", response.data)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_accepts_raw_payload_fallback(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            self.draft_payload(),
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["errors"], [])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_returns_400_json_for_invalid_body(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"unexpected": "shape"},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])
        self.assertEqual(
            response.data["errors"],
            ["Request body must include a payload object."],
        )
        self.assertIsNone(response.data["normalized_payload"])
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_rejects_url_longer_than_model_limit(self):
        max_length = Opportunity._meta.get_field("source_url").max_length
        payload = self.draft_payload(
            source_url="https://example.edu/" + ("a" * max_length)
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["valid"])
        self.assertIn(
            f"source_url is too long. Maximum length is {max_length} characters.",
            response.data["errors"],
        )
        self.assertEqual(OpportunityDraft.objects.count(), 0)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_does_not_create_draft_or_opportunity(self):
        draft_count = OpportunityDraft.objects.count()
        opportunity_count = Opportunity.objects.count()

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": self.draft_payload()},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(OpportunityDraft.objects.count(), draft_count)
        self.assertEqual(Opportunity.objects.count(), opportunity_count)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_does_not_create_missing_references(self):
        payload = self.draft_payload(
            slug="agent-validation-missing-references",
            country="Atlantis Testland",
            country_region="Europe",
            eligible_countries=["Nowhere Eligible Testland"],
            fields_of_study=["Quantum Basket Weaving"],
            all_study_fields=False,
            pathway="Uncreated Agent Pathway",
        )
        payload["create_missing_references"] = True
        country_count = Country.objects.count()
        field_count = StudyField.objects.count()
        pathway_count = OpportunityPathway.objects.count()

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Country.objects.count(), country_count)
        self.assertEqual(StudyField.objects.count(), field_count)
        self.assertEqual(OpportunityPathway.objects.count(), pathway_count)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_turin_all_fields_payload_returns_json_200(self):
        payload = self.draft_payload(
            title="University of Turin PhD Programmes 2026",
            slug="university-of-turin-phd-programmes-2026",
            pathway="University of Turin PhD programmes",
            country="Italy",
            country_region="Europe",
            university_name="University of Turin",
            provider_name="University of Turin",
            source_name="University of Turin official website",
            official_link="https://www.unito.it/research/doctoral-programmes",
            source_url="https://www.unito.it/research/doctoral-programmes",
            funding_type="stipend_only",
            funding_amount="16947.00",
            funding_currency="EUR",
            stipend_summary="Indicative annual PhD scholarship amount is about EUR 16,947.",
            degree_levels=["PhD"],
            fields_of_study=["All Fields"],
            all_study_fields=True,
            deadline="2026-06-09",
            short_description="University of Turin PhD call covering multiple doctoral programmes.",
            description=(
                "A broad University of Turin doctoral call covering multiple PhD programmes "
                "and research areas."
            ),
            benefits="Selected PhD candidates may receive an annual scholarship stipend.",
            eligibility="Applicants must meet the doctoral programme admission requirements.",
            how_to_apply=(
                "Apply through the University of Turin official call portal before the deadline."
            ),
            tags=["Italy", "University of Turin", "PhD"],
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_json_response(response)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["errors"], [])
        self.assertTrue(response.data["normalized_payload"]["all_study_fields"])
        self.assertEqual(response.data["normalized_payload"]["study_fields"], [])
        self.assertEqual(
            response.data["normalized_payload"]["opportunity"]["country"],
            "Italy",
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_rejects_past_fixed_deadline(self):
        payload = self.draft_payload(
            deadline=(timezone.localdate() - timedelta(days=1)).isoformat(),
            is_rolling_deadline=False,
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["valid"])
        self.assertIn("Deadline has already passed.", response.data["errors"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_accepts_future_deadline(self):
        payload = self.draft_payload(
            deadline=(timezone.localdate() + timedelta(days=45)).isoformat(),
            is_rolling_deadline=False,
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertNotIn("Deadline has already passed.", response.data["errors"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_validate_accepts_rolling_deadline_without_fixed_deadline(self):
        payload = self.draft_payload(deadline=None, is_rolling_deadline=True)

        response = self.client.post(
            "/api/admin/agent/scholarships/validate/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertNotIn("Deadline has already passed.", response.data["errors"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_rejects_missing_token(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": self.draft_payload()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_rejects_wrong_token(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": self.draft_payload()},
            format="json",
            **self.agent_headers("wrong-token"),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_returns_400_json_for_invalid_body(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"unexpected": "shape"},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["valid"])
        self.assertEqual(
            response.data["errors"],
            ["Request body must include a payload object."],
        )
        self.assertIsNone(response.data["normalized_payload"])
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_validation_errors_do_not_create_draft(self):
        payload = self.draft_payload(title="", country="")

        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(response.data["draft_id"])
        self.assertEqual(response.data["edit_url"], "")
        self.assertGreater(len(response.data["validation_errors"]), 0)
        self.assertEqual(OpportunityDraft.objects.count(), 0)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_rejects_past_fixed_deadline(self):
        payload = self.draft_payload(
            deadline=(timezone.localdate() - timedelta(days=1)).isoformat(),
            is_rolling_deadline=False,
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNone(response.data["draft_id"])
        self.assertIn("Deadline has already passed.", response.data["validation_errors"])
        self.assertEqual(OpportunityDraft.objects.count(), 0)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_with_valid_token_creates_draft_only(self):
        payload = self.draft_payload(slug="agent-created-draft-only")

        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {
                "payload": payload,
                "source_url": "https://official.example/scholarship",
                "source_text": "Official source excerpt.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        draft = OpportunityDraft.objects.get(pk=response.data["draft_id"])
        self.assertEqual(draft.title, payload["opportunity"]["title"])
        self.assertEqual(draft.raw_payload["opportunity"], payload["opportunity"])
        self.assertEqual(draft.raw_payload["source_url"], "https://official.example/scholarship")
        self.assertEqual(draft.raw_payload["source_text"], "Official source excerpt.")
        self.assertEqual(draft.status, OpportunityDraft.Status.VALIDATED)
        self.assertEqual(draft.source_url, "https://official.example/scholarship")
        self.assertIsNone(draft.created_opportunity)
        self.assertIn(
            f"/dashboard/admin/scholarships/drafts/{draft.pk}/edit",
            response.data["edit_url"],
        )
        self.assertEqual(Opportunity.objects.count(), 0)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_accepts_source_url_longer_than_200(self):
        source_url = "https://example.edu/" + ("a" * 240)
        payload = self.draft_payload(
            slug="agent-long-source-url",
            source_url=source_url,
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": payload},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        draft = OpportunityDraft.objects.get(pk=response.data["draft_id"])
        self.assertEqual(draft.source_url, source_url)
        self.assertEqual(draft.raw_payload["opportunity"]["source_url"], source_url)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_returns_structured_json_on_data_error(self):
        payload = self.draft_payload(slug="agent-data-error")
        max_length = OpportunityDraft._meta.get_field("source_url").max_length

        with patch(
            "apps.opportunities.views.OpportunityDraft.objects.create",
            side_effect=DataError("value too long for type character varying"),
        ):
            response = self.client.post(
                "/api/admin/agent/scholarships/create-draft/",
                {"payload": payload},
                format="json",
                **self.agent_headers(),
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {
                "ok": False,
                "error": "create_draft_failed",
                "stage": "draft_creation",
                "detail": "A URL or draft field exceeded the database length limit.",
                "field": "source_url",
                "max_length": max_length,
            },
        )
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_create_draft_does_not_publish_opportunity(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/create-draft/",
            {"payload": self.draft_payload(slug="agent-no-publish")},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(
            Opportunity.objects.filter(status=Opportunity.Status.PUBLISHED).exists()
        )
        self.assertEqual(Opportunity.objects.count(), 0)

    def create_agent_draft(self):
        return OpportunityDraft.objects.create(
            title="Agent Social Draft Scholarship",
            raw_payload=self.draft_payload(slug="agent-social-draft-scholarship"),
            status=OpportunityDraft.Status.VALIDATED,
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_rejects_missing_token(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Apply for this scholarship.",
                "facebook_image_prompt": "Scholarship announcement design.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_rejects_wrong_token(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Apply for this scholarship.",
                "facebook_image_prompt": "Scholarship announcement design.",
            },
            format="json",
            **self.agent_headers("wrong-token"),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_not_found_returns_json_404(self):
        response = self.client.post(
            "/api/admin/agent/scholarships/drafts/999999/social-draft/",
            {
                "facebook_post_text": "Apply for this scholarship.",
                "facebook_image_prompt": "Scholarship announcement design.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data, {"detail": "Scholarship draft not found."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_valid_token_creates_social_draft(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Apply for this scholarship before the deadline.",
                "facebook_image_prompt": "A clean scholarship announcement for Pakistani students.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        social_draft = OpportunitySocialDraft.objects.get(pk=response.data["social_draft_id"])
        self.assertEqual(social_draft.opportunity_draft, draft)
        self.assertEqual(social_draft.status, OpportunitySocialDraft.Status.DRAFT)
        self.assertEqual(
            social_draft.facebook_post_text,
            "Apply for this scholarship before the deadline.",
        )
        self.assertEqual(
            social_draft.facebook_image_prompt,
            "A clean scholarship announcement for Pakistani students.",
        )
        self.assertEqual(response.data["draft_id"], draft.pk)
        self.assertIn(
            f"/dashboard/admin/scholarships/drafts/{draft.pk}/edit",
            response.data["admin_edit_url"],
        )
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_second_call_updates_existing_record(self):
        draft = self.create_agent_draft()
        existing = OpportunitySocialDraft.objects.create(
            opportunity_draft=draft,
            facebook_post_text="Old text",
            facebook_image_prompt="Old prompt",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Updated Facebook draft text.",
                "facebook_image_prompt": "Updated image prompt.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(OpportunitySocialDraft.objects.filter(opportunity_draft=draft).count(), 1)
        existing.refresh_from_db()
        self.assertEqual(response.data["social_draft_id"], existing.pk)
        self.assertEqual(existing.facebook_post_text, "Updated Facebook draft text.")
        self.assertEqual(existing.facebook_image_prompt, "Updated image prompt.")
        self.assertEqual(existing.status, OpportunitySocialDraft.Status.DRAFT)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_does_not_publish_to_facebook_or_opportunity(self):
        draft = self.create_agent_draft()
        opportunity_count = Opportunity.objects.count()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Draft only.",
                "facebook_image_prompt": "Draft image prompt only.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], OpportunitySocialDraft.Status.DRAFT)
        self.assertEqual(Opportunity.objects.count(), opportunity_count)
        draft.refresh_from_db()
        self.assertIsNone(draft.created_opportunity)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_returns_json_for_errors_and_success(self):
        draft = self.create_agent_draft()

        missing_token_response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {},
            format="json",
        )
        success_response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "JSON response text.",
                "facebook_image_prompt": "JSON response prompt.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assert_json_response(missing_token_response)
        self.assert_json_response(success_response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_saves_base64_image(self):
        draft = self.create_agent_draft()
        png_base64 = base64.b64encode(VALID_PNG_BYTES).decode()

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
                {
                    "facebook_post_text": "Image draft.",
                    "facebook_image_prompt": "Image prompt.",
                    "facebook_image_base64": png_base64,
                    "facebook_image_filename": "turin-phd.png",
                    "facebook_image_url": "https://cdn.example/social.png",
                    "status": "ready",
                },
                format="json",
                **self.agent_headers(),
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data["has_image_file"])
            social_draft = OpportunitySocialDraft.objects.get(pk=response.data["social_draft_id"])
            self.assertTrue(social_draft.facebook_image.name.endswith(".png"))
            self.assertIn("/media/", response.data["facebook_image_url"])
            self.assertEqual(social_draft.social_image_source, social_draft.SocialImageSource.GPT_BASE64)
            self.assertEqual(social_draft.social_image_status, social_draft.SocialImageStatus.SAVED)
            self.assertEqual(social_draft.status, OpportunitySocialDraft.Status.READY)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_rejects_invalid_base64(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {"facebook_image_base64": "not-base64"},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "image_base64 must be valid base64.")
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_agent_social_draft_rejects_oversized_image(self):
        draft = self.create_agent_draft()
        oversized = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * (8 * 1024 * 1024 + 1)).decode()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {"facebook_image_base64": oversized},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Image exceeds the 8 MB limit.")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_draft_social_image_endpoint_requires_agent_token(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-image/",
            {"image_base64": base64.b64encode(VALID_PNG_BYTES).decode()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_draft_social_image_endpoint_saves_base64_file(self):
        draft = self.create_agent_draft()

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-image/",
                {
                    "image_base64": base64.b64encode(VALID_PNG_BYTES).decode(),
                    "filename": "gpt-scholarship.png",
                    "image_prompt": "Professional scholarship announcement.",
                },
                format="json",
                **self.agent_headers(),
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            social_draft = OpportunitySocialDraft.objects.get(opportunity_draft=draft)
            self.assertTrue(social_draft.facebook_image)
            self.assertEqual(
                social_draft.social_image_source,
                OpportunitySocialDraft.SocialImageSource.GPT_UPLOADED,
            )
            self.assertEqual(
                social_draft.social_image_status,
                OpportunitySocialDraft.SocialImageStatus.SAVED,
            )
            self.assertIn("/media/", response.data["image_url"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_draft_social_image_endpoint_downloads_and_saves_url(self):
        draft = self.create_agent_draft()

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            with patch(
                "apps.opportunities.services.social_image_uploads.urlopen",
                return_value=FakeImageResponse(),
            ):
                response = self.client.post(
                    f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-image/",
                    {
                        "image_url": "https://cdn.example/generated.png",
                        "image_prompt": "Professional scholarship announcement.",
                    },
                    format="json",
                    **self.agent_headers(),
                )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            social_draft = OpportunitySocialDraft.objects.get(opportunity_draft=draft)
            self.assertTrue(social_draft.facebook_image)
            self.assertEqual(
                social_draft.social_image_source,
                OpportunitySocialDraft.SocialImageSource.GPT_IMAGE_URL,
            )
            self.assertIn("/media/", response.data["image_url"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_draft_social_image_endpoint_rejects_invalid_image(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-image/",
            {"image_base64": base64.b64encode(b"not an image").decode()},
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("valid PNG, JPG, or WebP", response.data["detail"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_opportunity_social_image_endpoint_saves_to_plan(self):
        opportunity = self.opportunity(slug="opportunity-social-image")

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                f"/api/admin/agent/scholarships/{opportunity.pk}/social-image/",
                {
                    "image_base64": base64.b64encode(VALID_PNG_BYTES).decode(),
                    "filename": "published-scholarship.png",
                    "image_prompt": "Published social image.",
                },
                format="json",
                **self.agent_headers(),
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            plan = OpportunitySocialPostPlan.objects.get(opportunity=opportunity)
            self.assertTrue(plan.image)
            self.assertEqual(plan.social_image_source, plan.SocialImageSource.GPT_UPLOADED)
            self.assertIn("/media/", response.data["image_url"])

    def test_admin_draft_social_image_upload_requires_authentication(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/scholarships/drafts/{draft.pk}/social-image-upload/",
            {
                "image": SimpleUploadedFile(
                    "social.png",
                    VALID_PNG_BYTES,
                    content_type="image/png",
                )
            },
            format="multipart",
        )

        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_admin_draft_social_image_upload_saves_valid_png(self):
        draft = self.create_agent_draft()
        self.client.force_authenticate(self.admin)

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                f"/api/admin/scholarships/drafts/{draft.pk}/social-image-upload/",
                {
                    "image": SimpleUploadedFile(
                        "downloaded-gpt.png",
                        VALID_PNG_BYTES,
                        content_type="image/png",
                    ),
                    "image_prompt": "Prompt used in GPT.",
                },
                format="multipart",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data["ok"])
            self.assertIn("/media/", response.data["image_url"])
            social_draft = OpportunitySocialDraft.objects.get(opportunity_draft=draft)
            self.assertTrue(social_draft.facebook_image)
            self.assertEqual(
                social_draft.social_image_source,
                OpportunitySocialDraft.SocialImageSource.GPT_UPLOADED,
            )
            self.assertEqual(
                social_draft.social_image_status,
                OpportunitySocialDraft.SocialImageStatus.SAVED,
            )
            self.assertEqual(social_draft.facebook_image_prompt, "Prompt used in GPT.")

    def test_admin_draft_social_image_upload_rejects_invalid_file(self):
        draft = self.create_agent_draft()
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/drafts/{draft.pk}/social-image-upload/",
            {
                "image": SimpleUploadedFile(
                    "not-image.txt",
                    b"not an image",
                    content_type="text/plain",
                )
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("valid PNG, JPG, or WebP", response.data["detail"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_uploaded_social_image_appears_in_due_post_payload(self):
        opportunity = self.opportunity(
            slug="admin-uploaded-social-image-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=20),
        )
        self.client.force_authenticate(self.admin)

        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            upload_response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/social-image-upload/",
                {
                    "image": SimpleUploadedFile(
                        "downloaded-gpt.png",
                        VALID_PNG_BYTES,
                        content_type="image/png",
                    )
                },
                format="multipart",
            )
            self.assertEqual(upload_response.status_code, status.HTTP_200_OK)

            self.client.force_authenticate(user=None)
            due_response = self.client.post(
                "/api/admin/agent/social/facebook/due-posts/",
                {"limit": 5},
                format="json",
                HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
            )

        self.assertEqual(due_response.status_code, status.HTTP_200_OK)
        item = due_response.data["items"][0]
        self.assertEqual(item["opportunity_id"], opportunity.pk)
        self.assertIn("/media/", item["image_url"])
        self.assertEqual(
            item["image_source"],
            OpportunitySocialPostPlan.SocialImageSource.GPT_UPLOADED,
        )
        self.assertTrue(item["has_image"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_prompt_only_does_not_count_as_saved_image(self):
        draft = self.create_agent_draft()

        response = self.client.post(
            f"/api/admin/agent/scholarships/drafts/{draft.pk}/social-draft/",
            {
                "facebook_post_text": "Prompt only.",
                "facebook_image_prompt": "Make an announcement image.",
            },
            format="json",
            **self.agent_headers(),
        )

        social_draft = OpportunitySocialDraft.objects.get(pk=response.data["social_draft_id"])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(social_draft.facebook_image)
        self.assertEqual(
            social_draft.social_image_status,
            OpportunitySocialDraft.SocialImageStatus.MISSING,
        )

    def test_generated_facebook_caption_includes_available_details_and_link(self):
        opportunity = self.opportunity(
            title="Turin PhD Scholarships",
            slug="turin-phd-scholarships",
            country="Italy",
            provider_name="University of Turin",
            degree_levels=["PhD"],
            funding_type=Opportunity.FundingType.STIPEND_ONLY,
            deadline=date(2026, 6, 9),
        )

        caption = generate_facebook_post_text(
            opportunity,
            "https://scholarsrepublic.org/scholarships/turin-phd-scholarships/",
        )

        self.assertTrue(caption.startswith("Turin PhD Scholarships"))
        self.assertIn("University of Turin", caption)
        self.assertIn("• Country: Italy", caption)
        self.assertIn("• Provider: University of Turin", caption)
        self.assertIn("• Degree Level: PhD", caption)
        self.assertIn("• Funding: Stipend Only", caption)
        self.assertIn("• Deadline: June 9, 2026", caption)
        self.assertIn(
            "https://scholarsrepublic.org/scholarships/turin-phd-scholarships/",
            caption,
        )
        self.assertNotIn("Unknown", caption)

    def test_generated_facebook_caption_omits_missing_fields(self):
        opportunity = self.empty_opportunity(
            slug="caption-missing-fields",
            title="Minimal Scholarship",
        )
        opportunity.country = ""
        opportunity.provider_name = ""
        opportunity.university_name = ""
        opportunity.source_name = ""
        opportunity.degree_levels = []
        opportunity.funding_type = ""
        opportunity.deadline = None

        caption = generate_facebook_post_text(opportunity)

        self.assertTrue(caption.startswith("Minimal Scholarship"))
        self.assertNotIn("• Country:", caption)
        self.assertNotIn("• Provider:", caption)
        self.assertNotIn("• Degree Level:", caption)
        self.assertNotIn("• Funding:", caption)
        self.assertNotIn("• Deadline:", caption)
        self.assertNotIn("Unknown", caption)

    def test_generated_facebook_caption_does_not_start_with_emoji(self):
        caption = generate_facebook_post_text(self.opportunity())

        self.assertTrue(caption[0].isalnum())

    def test_regenerate_social_post_text_only_empty(self):
        empty_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=self.opportunity(slug="regenerate-empty-caption"),
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="",
        )
        existing_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=self.opportunity(slug="regenerate-existing-caption"),
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Keep this text.",
        )

        call_command("regenerate_social_post_text", "--only-empty", stdout=StringIO())

        empty_plan.refresh_from_db()
        existing_plan.refresh_from_db()
        self.assertIn("Published Scholarship", empty_plan.post_text)
        self.assertEqual(existing_plan.post_text, "Keep this text.")

    def test_social_draft_promotes_to_ready_plan_when_imported_opportunity_is_published(self):
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            draft = OpportunityDraft.objects.create(
                title="Social Promotion Draft",
                slug="social-promotion-draft",
                raw_payload=self.draft_payload(slug="social-promotion-opportunity"),
                status=OpportunityDraft.Status.VALIDATED,
            )
            social_draft = OpportunitySocialDraft.objects.create(
                opportunity_draft=draft,
                facebook_post_text="Saved social post text.",
                facebook_image_prompt="Saved image prompt.",
                status=OpportunitySocialDraft.Status.READY,
            )
            save_social_image_from_base64(
                social_draft,
                base64.b64encode(VALID_PNG_BYTES).decode(),
                filename="saved-social.png",
                source=social_draft.SocialImageSource.GPT_UPLOADED,
            )

            opportunity = import_opportunity_draft(draft, user=self.admin)
            self.assertIsNotNone(opportunity)
            plan = OpportunitySocialPostPlan.objects.get(
                opportunity=opportunity,
                platform="facebook",
            )
            self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.DRAFT)

            opportunity.status = Opportunity.Status.PUBLISHED
            opportunity.save()

            plan.refresh_from_db()
            self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.READY)
            self.assertEqual(plan.post_text, "Saved social post text.")
            self.assertEqual(plan.image_prompt, "Saved image prompt.")
            self.assertTrue(plan.image)
            self.assertIn("/media/", plan.image_url)
            self.assertEqual(plan.social_image_source, plan.SocialImageSource.GPT_UPLOADED)

    def test_publish_draft_generates_caption_and_schedules_ready_plan(self):
        draft = OpportunityDraft.objects.create(
            title="Generated Caption Draft",
            slug="generated-caption-draft",
            raw_payload=self.draft_payload(slug="generated-caption-opportunity"),
            status=OpportunityDraft.Status.VALIDATED,
        )
        OpportunitySocialDraft.objects.create(
            opportunity_draft=draft,
            facebook_post_text="",
            facebook_image_prompt="",
            status=OpportunitySocialDraft.Status.READY,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)
        self.assertIsNotNone(opportunity)
        opportunity.status = Opportunity.Status.PUBLISHED
        opportunity.save()

        plan = OpportunitySocialPostPlan.objects.get(opportunity=opportunity)
        self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.READY)
        self.assertTrue(plan.post_text)
        self.assertIn("Key Details:", plan.post_text)
        self.assertIsNotNone(plan.next_post_at)

    def test_publish_draft_preserves_future_next_post_at(self):
        future_time = timezone.now() + timedelta(days=3)
        draft = OpportunityDraft.objects.create(
            title="Future Schedule Draft",
            slug="future-schedule-draft",
            raw_payload=self.draft_payload(slug="future-schedule-opportunity"),
            status=OpportunityDraft.Status.VALIDATED,
        )
        OpportunitySocialDraft.objects.create(
            opportunity_draft=draft,
            status=OpportunitySocialDraft.Status.READY,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)
        plan = OpportunitySocialPostPlan.objects.get(opportunity=opportunity)
        plan.next_post_at = future_time
        plan.save(update_fields=["next_post_at", "updated_at"])

        opportunity.status = Opportunity.Status.PUBLISHED
        opportunity.save()

        plan.refresh_from_db()
        self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.READY)
        self.assertEqual(plan.next_post_at, future_time)

    def test_admin_facebook_post_now_returns_404_for_missing_scholarship(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/scholarships/999999/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(response.data["ok"])

    def test_admin_facebook_post_now_rejects_draft_scholarship(self):
        opportunity = self.opportunity(
            slug="post-now-draft",
            status=Opportunity.Status.DRAFT,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "not_published")

    def test_admin_facebook_post_now_rejects_expired_unless_forced(self):
        opportunity = self.opportunity(
            slug="post-now-expired",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "expired")

    def test_admin_facebook_post_now_rejects_verified_expired_unless_forced(self):
        opportunity = self.opportunity(
            slug="post-now-deadline-check-expired",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=10),
            deadline_check_status=Opportunity.DeadlineCheckStatus.EXPIRED,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "expired")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_duplicate_url_detected_from_existing_opportunity(self):
        self.opportunity(
            slug="research-existing-duplicate",
            title="Endotrain PhD Positions",
            provider_name="University of Bergen",
            country="Norway",
            official_link="https://example.edu/phd?utm_source=chatgpt.co",
        )

        response = self.client.post(
            "/api/admin/agent/scholarship-research/check-duplicate/",
            {
                "title": "Endotrain PhD Positions",
                "provider_name": "University of Bergen",
                "country": "Norway",
                "official_url": "https://example.edu/phd/",
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_duplicate"])
        self.assertEqual(response.data["recommendation"], "duplicate")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_duplicate_detected_from_existing_lead(self):
        ScholarshipResearchLead.objects.create(
            title="Existing Lead",
            official_url="https://example.edu/lead",
            review_status=ScholarshipResearchLead.ReviewStatus.READY_FOR_DRAFT,
        )

        response = self.client.post(
            "/api/admin/agent/scholarship-research/check-duplicate/",
            {
                "title": "Existing Lead",
                "official_url": "https://example.edu/lead?utm_campaign=test",
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_duplicate"])
        self.assertEqual(response.data["possible_matches"][0]["type"], "research_lead")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_lead_created_and_listed_ready_for_draft(self):
        create_response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/",
            {
                "title": "New Research Scholarship",
                "provider_name": "Example University",
                "country": "Italy",
                "degree_level": "PhD",
                "official_url": "https://example.edu/new-scholarship",
                "detected_deadline": "2026-06-09",
                "pakistan_relevance_score": 85,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        lead = ScholarshipResearchLead.objects.get(title="New Research Scholarship")
        self.assertEqual(lead.review_status, ScholarshipResearchLead.ReviewStatus.READY_FOR_DRAFT)

        list_response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/list/",
            {"limit": 10},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["items"][0]["id"], lead.pk)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_duplicate_lead_rejected_unless_allowed(self):
        ScholarshipResearchLead.objects.create(
            title="Duplicate Lead",
            official_url="https://example.edu/duplicate-lead",
        )

        duplicate_response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/",
            {
                "title": "Duplicate Lead",
                "official_url": "https://example.edu/duplicate-lead/",
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )
        allowed_response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/",
            {
                "title": "Duplicate Lead Allowed",
                "official_url": "https://example.edu/duplicate-lead/",
                "allow_duplicate": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(allowed_response.status_code, status.HTTP_201_CREATED)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_lead_mark_imported(self):
        lead = ScholarshipResearchLead.objects.create(
            title="Import Lead",
            official_url="https://example.edu/import-lead",
            review_status=ScholarshipResearchLead.ReviewStatus.READY_FOR_DRAFT,
        )

        response = self.client.post(
            f"/api/admin/agent/scholarship-research/leads/{lead.pk}/mark-imported/",
            {},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.review_status, ScholarshipResearchLead.ReviewStatus.IMPORTED)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_lead_invalid_url_returns_400(self):
        response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/",
            {
                "title": "Invalid URL Lead",
                "official_url": "ftp://example.edu/lead",
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_research_lead_missing_or_invalid_token_returns_403(self):
        response = self.client.post(
            "/api/admin/agent/scholarship-research/leads/list/",
            {},
            format="json",
            HTTP_X_AGENT_TOKEN="wrong-token",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_allows_expired_when_forced(self):
        opportunity = self.opportunity(
            slug="post-now-expired-force",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {"force": True},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_generates_caption_and_logs_success(self):
        opportunity = self.opportunity(slug="post-now-caption")
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="",
        )
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(),
        ) as post_mock:
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["facebook_post_url"], "https://www.facebook.com/123/posts/456")
        self.assertEqual(response.data["message"], "Posted to Facebook successfully.")
        plan = OpportunitySocialPostPlan.objects.get(opportunity=opportunity)
        self.assertTrue(plan.post_text)
        self.assertIn("Key Details:", plan.post_text)
        log = OpportunitySocialPostLog.objects.get(plan=plan)
        self.assertEqual(log.status, OpportunitySocialPostLog.Status.POSTED)
        self.assertEqual(log.facebook_post_id, "123_456")
        self.assertEqual(log.facebook_post_url, "https://www.facebook.com/123/posts/456")
        _, kwargs = post_mock.call_args
        self.assertEqual(kwargs["timeout"], 30)
        self.assertEqual(kwargs["headers"]["Content-Type"], "application/json")
        self.assertEqual(kwargs["headers"]["Accept"], "application/json")
        self.assertEqual(kwargs["headers"]["User-Agent"], "ScholarsRepublicBackend/1.0")
        self.assertEqual(kwargs["headers"]["X-Social-Worker-Token"], "worker-token")

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=1,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_admin_facebook_post_now_obeys_daily_cap(self):
        posted = self.opportunity(slug="manual-cap-posted")
        posted_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=posted,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=posted,
            plan=posted_plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at=timezone.now(),
        )
        due = self.opportunity(slug="manual-cap-due")
        OpportunitySocialPostPlan.objects.create(
            opportunity=due,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{due.pk}/facebook/post-now/",
            {"force": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertFalse(response.data["ok"])
        self.assertEqual(response.data["status"], "daily_cap_reached")
        self.assertEqual(response.data["daily_cap"], 1)
        self.assertEqual(response.data["daily_remaining"], 0)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_preserves_worker_http_error_body(self):
        opportunity = self.opportunity(slug="post-now-worker-1010")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Caption.",
        )
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(
                payload={},
                status_code=403,
                text="error code: 1010",
            ),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(response.data["ok"])
        self.assertEqual(response.data["error"], "Worker HTTP 403: error code: 1010")
        log = OpportunitySocialPostLog.objects.get(plan=plan)
        self.assertEqual(log.status, OpportunitySocialPostLog.Status.FAILED)
        self.assertEqual(log.error_message, "Worker HTTP 403: error code: 1010")

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_returns_json_if_log_save_fails(self):
        opportunity = self.opportunity(slug="post-now-log-save-failure")
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Caption.",
        )
        self.client.force_authenticate(self.admin)

        with (
            patch(
                "apps.opportunities.services.social_posting.requests.post",
                return_value=FakeWorkerResponse(),
            ),
            patch(
                "apps.opportunities.services.social_posting.record_facebook_post_result",
                side_effect=RuntimeError("database write failed"),
            ),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response["content-type"], "application/json")
        self.assertFalse(response.data["ok"])
        self.assertEqual(response.data["status"], "failed")
        self.assertEqual(response.data["facebook_post_id"], "123_456")
        self.assertEqual(response.data["facebook_post_url"], "https://www.facebook.com/123/posts/456")
        self.assertIn("backend could not save", response.data["error"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_uses_gpt_uploaded_image(self):
        opportunity = self.opportunity(slug="post-now-gpt-image")
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            plan = OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )
            save_social_image_from_base64(
                plan,
                base64.b64encode(VALID_PNG_BYTES).decode(),
                filename="facebook-now.png",
                source=plan.SocialImageSource.GPT_UPLOADED,
            )
            self.client.force_authenticate(self.admin)

            with patch(
                "apps.opportunities.services.social_posting.requests.post",
                return_value=FakeWorkerResponse(),
            ):
                response = self.client.post(
                    f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                    {},
                    format="json",
                )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("/media/", response.data["image_url"])
        self.assertEqual(response.data["image_source"], plan.SocialImageSource.GPT_UPLOADED)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_falls_back_to_og_image(self):
        opportunity = self.opportunity(slug="post-now-og-image")
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("/scholarships/post-now-og-image/opengraph-image", response.data["image_url"])
        self.assertEqual(
            response.data["image_source"],
            OpportunitySocialPostPlan.SocialImageSource.OG_FALLBACK,
        )

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_blocks_duplicate_by_default(self):
        opportunity = self.opportunity(slug="post-now-duplicate")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Already posted caption.",
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=opportunity,
            plan=plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            facebook_post_url="https://www.facebook.com/123/posts/old",
            posted_at=timezone.now(),
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ok"])
        self.assertEqual(response.data["status"], "already_posted")
        self.assertEqual(
            response.data["latest_facebook_post_url"],
            "https://www.facebook.com/123/posts/old",
        )

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_allows_near_deadline_previous_day_post(self):
        opportunity = self.opportunity(
            slug="post-now-near-deadline-yesterday",
            deadline=timezone.localdate() + timedelta(days=3),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Near deadline caption.",
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=opportunity,
            plan=plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            facebook_post_url="https://www.facebook.com/123/posts/yesterday",
            posted_at=timezone.now() - timedelta(days=1),
        )
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(
                {
                    "ok": True,
                    "status": "posted",
                    "facebook_post_id": "123_456",
                    "facebook_post_url": "https://www.facebook.com/123/posts/today",
                }
            ),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["status"], "posted")
        self.assertIn("Reminder: deadline is in 3 days.", response.data["caption"])
        self.assertEqual(OpportunitySocialPostLog.objects.filter(plan=plan).count(), 2)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_admin_facebook_post_now_blocks_near_deadline_posted_today(self):
        opportunity = self.opportunity(
            slug="post-now-near-deadline-today",
            deadline=timezone.localdate() + timedelta(days=3),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Near deadline caption.",
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=opportunity,
            plan=plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            facebook_post_url="https://www.facebook.com/123/posts/today",
            posted_at=timezone.now(),
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ok"])
        self.assertEqual(response.data["status"], "already_posted_today")
        self.assertEqual(
            response.data["latest_facebook_post_url"],
            "https://www.facebook.com/123/posts/today",
        )
        self.assertEqual(
            response.data["message"],
            "This scholarship has already been posted today.",
        )

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_admin_facebook_post_now_allows_duplicate_when_forced(self):
        opportunity = self.opportunity(slug="post-now-force-duplicate")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Already posted caption.",
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=opportunity,
            plan=plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            facebook_post_url="https://www.facebook.com/123/posts/old",
            posted_at=timezone.now(),
        )
        self.client.force_authenticate(self.admin)

        with patch(
            "apps.opportunities.services.social_posting.requests.post",
            return_value=FakeWorkerResponse(
                {
                    "ok": True,
                    "status": "posted",
                    "facebook_post_id": "123_789",
                    "facebook_post_url": "https://www.facebook.com/123/posts/789",
                }
            ),
        ):
            response = self.client.post(
                f"/api/admin/scholarships/{opportunity.pk}/facebook/post-now/",
                {"force": True},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertEqual(OpportunitySocialPostLog.objects.filter(plan=plan).count(), 2)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_due_posts_weekly_for_deadline_more_than_7_days(self):
        opportunity = self.opportunity(
            slug="weekly-social-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=20),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=8),
            post_text="Weekly due post.",
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["plan_id"], plan.pk)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_due_posts_use_saved_social_image_before_fallback(self):
        opportunity = self.opportunity(
            slug="saved-social-image-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=20),
        )
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            plan = OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
                last_posted_at=timezone.now() - timedelta(days=8),
            )
            save_social_image_from_base64(
                plan,
                base64.b64encode(VALID_PNG_BYTES).decode(),
                filename="saved-due.png",
                source=plan.SocialImageSource.GPT_UPLOADED,
            )

            response = self.client.post(
                "/api/admin/agent/social/facebook/due-posts/",
                {"limit": 5},
                format="json",
                HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
            )

        item = response.data["items"][0]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(item["plan_id"], plan.pk)
        self.assertIn("/media/", item["image_url"])
        self.assertEqual(item["image_source"], plan.SocialImageSource.GPT_UPLOADED)
        self.assertTrue(item["has_image"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_due_posts_fall_back_to_og_image(self):
        opportunity = self.opportunity(
            slug="og-fallback-social-image-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=20),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=8),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        item = response.data["items"][0]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(item["plan_id"], plan.pk)
        self.assertIn("/scholarships/og-fallback-social-image-due/opengraph-image", item["image_url"])
        self.assertEqual(item["image_source"], plan.SocialImageSource.OG_FALLBACK)
        self.assertTrue(item["has_image"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_due_posts_auto_generate_empty_post_text_before_returning(self):
        opportunity = self.opportunity(
            slug="empty-caption-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=20),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="",
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["items"][0]
        self.assertEqual(item["plan_id"], plan.pk)
        self.assertTrue(item["message"])
        self.assertIn("Key Details:", item["message"])
        plan.refresh_from_db()
        self.assertEqual(plan.post_text, item["message"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_due_posts_daily_within_7_days(self):
        opportunity = self.opportunity(
            slug="daily-social-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=3),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(hours=25),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["plan_id"], plan.pk)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_returns_never_posted_active_plans_immediately(self):
        opportunity = self.opportunity(
            slug="never-posted-social-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=None,
            next_post_at=timezone.now() - timedelta(minutes=1),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["plan_id"], plan.pk)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_weekly_rule_for_no_deadline_and_far_deadline(self):
        no_deadline_recent = self.opportunity(
            slug="no-deadline-recent-social-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=None,
        )
        no_deadline_due = self.opportunity(
            slug="no-deadline-weekly-social-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=None,
        )
        far_recent = self.opportunity(
            slug="far-deadline-recent-social-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        far_due = self.opportunity(
            slug="far-deadline-weekly-social-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=no_deadline_recent,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=6),
        )
        no_deadline_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=no_deadline_due,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=8),
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=far_recent,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=6),
        )
        far_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=far_due,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=8),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 10},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        plan_ids = [item["plan_id"] for item in response.data["items"]]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(no_deadline_plan.pk, plan_ids)
        self.assertIn(far_plan.pk, plan_ids)
        self.assertEqual(len(plan_ids), 2)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_daily_rule_for_deadline_within_7_days(self):
        recent = self.opportunity(
            slug="near-deadline-posted-today-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=2),
        )
        due = self.opportunity(
            slug="near-deadline-posted-yesterday-due",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=2),
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=recent,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now(),
        )
        due_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=due,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=datetime.combine(
                timezone.localdate() - timedelta(days=1),
                datetime.min.time(),
                tzinfo=dt_timezone.utc,
            ),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 10},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["plan_id"] for item in response.data["items"]], [due_plan.pk])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_due_posts_skips_near_deadline_posted_today_log(self):
        opportunity = self.opportunity(
            slug="near-deadline-today-log-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=2),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            last_posted_at=timezone.now() - timedelta(days=1),
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=opportunity,
            plan=plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at=timezone.now(),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 10},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_due_posts_respects_limit(self):
        for index in range(3):
            opportunity = self.opportunity(
                slug=f"limited-social-due-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=index + 1),
            )
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 2},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 2)

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=2,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_respects_per_run_cap(self):
        for index in range(4):
            opportunity = self.opportunity(
                slug=f"per-run-capped-social-due-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=index + 10),
            )
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 10},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["per_run_cap"], 2)
        self.assertEqual(response.data["returned_count"], 2)
        self.assertEqual(len(response.data["items"]), 2)

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=1,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_respects_daily_cap(self):
        posted = self.opportunity(slug="daily-cap-already-posted")
        posted_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=posted,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=posted,
            plan=posted_plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at=timezone.now(),
        )
        due = self.opportunity(slug="daily-cap-due")
        OpportunitySocialPostPlan.objects.create(
            opportunity=due,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["posted_today"], 1)
        self.assertEqual(response.data["daily_cap"], 1)
        self.assertEqual(response.data["daily_remaining"], 0)
        self.assertEqual(response.data["reason"], "daily_cap_reached")

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=30,
    )
    def test_social_worker_due_posts_respects_minimum_spacing(self):
        posted = self.opportunity(slug="spacing-already-posted")
        posted_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=posted,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        latest_posted_at = timezone.now()
        OpportunitySocialPostLog.objects.create(
            opportunity=posted,
            plan=posted_plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at=latest_posted_at,
        )
        due = self.opportunity(slug="spacing-due")
        OpportunitySocialPostPlan.objects.create(
            opportunity=due,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["reason"], "minimum_interval_not_reached")
        self.assertEqual(response.data["min_spacing_minutes"], 30)
        self.assertIsNotNone(response.data["latest_posted_at"])
        self.assertIsNotNone(response.data["next_allowed_post_at"])

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=2,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_skipped_expired_items_do_not_consume_returned_quota(self):
        expired = self.opportunity(
            slug="expired-before-valid-quota",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )
        expired_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=expired,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        valid_plans = []
        for index in range(2):
            opportunity = self.opportunity(
                slug=f"valid-after-expired-quota-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=index + 10),
            )
            valid_plans.append(
                OpportunitySocialPostPlan.objects.create(
                    opportunity=opportunity,
                    status=OpportunitySocialPostPlan.Status.READY,
                )
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 2},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["returned_count"], 2)
        self.assertEqual(
            [item["plan_id"] for item in response.data["items"]],
            [plan.pk for plan in valid_plans],
        )
        expired_plan.refresh_from_db()
        self.assertEqual(expired_plan.status, OpportunitySocialPostPlan.Status.PAUSED)
        self.assertTrue(
            OpportunitySocialPostLog.objects.filter(
                plan=expired_plan,
                status=OpportunitySocialPostLog.Status.SKIPPED,
            ).exists()
        )

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_response_includes_scheduler_metadata(self):
        opportunity = self.opportunity(slug="metadata-social-due")
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in [
            "ok",
            "due_count",
            "returned_count",
            "posted_today",
            "daily_cap",
            "daily_remaining",
            "per_run_cap",
            "min_spacing_minutes",
            "latest_posted_at",
            "next_allowed_post_at",
            "reason",
            "items",
        ]:
            self.assertIn(key, response.data)
        self.assertTrue(response.data["ok"])
        self.assertEqual(response.data["returned_count"], 1)
        self.assertEqual(response.data["reason"], "")
        item = response.data["items"][0]
        self.assertEqual(item["type"], "opportunity")
        self.assertEqual(
            item["auto_social_decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )
        self.assertIsInstance(item["priority_score"], int)
        self.assertGreater(item["priority_score"], 0)
        self.assertIsInstance(item["priority_reason"], dict)
        self.assertIn("fully_funded", item["priority_reason"])

    @override_settings(
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_get_due_facebook_post_plans_returns_metadata_dict(self):
        opportunity = self.opportunity(slug="service-metadata-social-due")
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        result = get_due_facebook_post_plans(limit=5)

        self.assertIsInstance(result, dict)
        self.assertIn("items", result)
        self.assertEqual(result["returned_count"], 1)
        self.assertEqual(len(result["items"]), 1)
        item = result["items"][0]
        self.assertEqual(
            item["auto_social_decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )
        self.assertIsInstance(item["priority_score"], int)
        self.assertIsInstance(item["priority_reason"], dict)

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_excludes_non_individual_decisions(self):
        individual = self.opportunity(slug="due-individual-decision")
        collection_candidate = self.opportunity(
            slug="due-collection-candidate-decision",
            funding_type=Opportunity.FundingType.PARTIALLY_FUNDED,
            deadline=timezone.localdate() + timedelta(days=20),
            verified_status=False,
            official_link="",
            source_url="",
            university_name="",
            degree_levels=["Bachelor"],
            published_at=timezone.now() - timedelta(days=20),
        )
        website_only = self.opportunity(
            slug="due-website-only-decision",
            funding_type=Opportunity.FundingType.PARTIALLY_FUNDED,
            deadline=None,
            official_link="",
            source_url="",
            university_name="",
            degree_levels=[],
            published_at=timezone.now() - timedelta(days=20),
        )
        for opportunity in [individual, collection_candidate, website_only]:
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["slug"] for item in response.data["items"]],
            ["due-individual-decision"],
        )
        decisions = dict(
            OpportunitySocialPostPlan.objects.filter(
                opportunity__slug__in=[
                    "due-individual-decision",
                    "due-collection-candidate-decision",
                    "due-website-only-decision",
                ]
            ).values_list("opportunity__slug", "auto_social_decision")
        )
        self.assertEqual(
            decisions["due-individual-decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )
        self.assertIn(
            decisions["due-collection-candidate-decision"],
            [
                OpportunitySocialPostPlan.AutoSocialDecision.COLLECTION_CANDIDATE,
                OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
            ],
        )
        self.assertEqual(
            decisions["due-website-only-decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
        )

    def test_social_scheduler_scores_high_priority_as_individual(self):
        opportunity = self.opportunity(
            slug="priority-individual",
            deadline=timezone.localdate() + timedelta(days=7),
            verified_status=True,
            official_link="https://example.edu/priority-individual",
            source_url="https://example.edu/priority-individual",
            university_name="Example University",
            pathway=self.pathway(),
            degree_levels=["Master", "PhD"],
            eligible_countries=["Pakistan", "International students"],
            published_at=timezone.now(),
        )

        result = score_opportunity_for_social(opportunity)

        self.assertGreaterEqual(result["score"], 80)
        self.assertEqual(
            result["decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )
        self.assertIn("fully_funded", result["reasons"])

    def test_social_scheduler_scores_mid_priority_as_collection_candidate(self):
        opportunity = self.opportunity(
            slug="priority-collection-candidate",
            funding_type=Opportunity.FundingType.PARTIALLY_FUNDED,
            deadline=timezone.localdate() + timedelta(days=20),
            verified_status=True,
            official_link="https://example.edu/priority-collection",
            source_url="https://example.edu/priority-collection",
            university_name="Example University",
            pathway=self.pathway(),
            degree_levels=["Bachelor"],
            eligible_countries=["Pakistan"],
            published_at=timezone.now() - timedelta(days=20),
        )

        result = score_opportunity_for_social(opportunity)

        self.assertGreaterEqual(result["score"], 35)
        self.assertLess(result["score"], 80)
        self.assertEqual(
            result["decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.COLLECTION_CANDIDATE,
        )

    def test_generate_social_collections_creates_stable_collection_from_candidates(self):
        for index in range(5):
            self.collection_candidate_plan(
                f"italy-phd-collection-{index}",
                priority_score=60 - index,
            )

        result = generate_social_collections()

        self.assertEqual(result["created_count"], 1)
        collection = OpportunityCollection.objects.get()
        self.assertEqual(collection.title, "5 PhD Scholarships in Italy")
        self.assertEqual(collection.status, OpportunityCollection.Status.READY)
        self.assertEqual(
            collection.collection_type,
            OpportunityCollection.CollectionType.COUNTRY_DEGREE,
        )
        self.assertEqual(collection.country, "Italy")
        self.assertEqual(collection.degree_level, "PhD")
        self.assertEqual(collection.items.count(), 5)
        self.assertIn("Scholarships included:", collection.social_post_text)

    def test_generate_social_collections_skips_expired_opportunities(self):
        expired_plan = self.collection_candidate_plan(
            "italy-expired-collection-candidate",
            deadline_days=-1,
            priority_score=90,
        )
        for index in range(3):
            self.collection_candidate_plan(
                f"italy-active-collection-candidate-{index}",
                priority_score=50 - index,
            )

        result = generate_social_collections()

        self.assertEqual(result["created_count"], 1)
        collection = OpportunityCollection.objects.get()
        self.assertEqual(collection.items.count(), 3)
        self.assertFalse(
            collection.items.filter(opportunity=expired_plan.opportunity).exists()
        )

    def test_generate_social_collections_skips_opportunities_in_active_collections(self):
        used_plan = self.collection_candidate_plan(
            "already-collected-candidate",
            priority_score=90,
        )
        existing = OpportunityCollection.objects.create(
            title="Existing Review Collection",
            collection_type=OpportunityCollection.CollectionType.COUNTRY_DEGREE,
            country="Italy",
            degree_level="PhD",
            status=OpportunityCollection.Status.READY,
        )
        OpportunityCollectionItem.objects.create(
            collection=existing,
            opportunity=used_plan.opportunity,
            social_post_plan=used_plan,
            position=1,
        )
        for index in range(3):
            self.collection_candidate_plan(
                f"new-uncollected-candidate-{index}",
                priority_score=60 - index,
            )

        result = generate_social_collections()

        self.assertEqual(result["created_count"], 1)
        generated = OpportunityCollection.objects.exclude(pk=existing.pk).get()
        self.assertEqual(generated.items.count(), 3)
        self.assertFalse(generated.items.filter(opportunity=used_plan.opportunity).exists())

    def test_generate_social_collections_dry_run_does_not_save(self):
        for index in range(3):
            self.collection_candidate_plan(f"dry-run-collection-{index}")

        result = generate_social_collections(dry_run=True)

        self.assertEqual(result["preview_count"], 1)
        self.assertEqual(result["created_count"], 0)
        self.assertEqual(result["previews"][0]["title"], "3 PhD Scholarships in Italy")
        self.assertEqual(OpportunityCollection.objects.count(), 0)
        self.assertEqual(OpportunityCollectionItem.objects.count(), 0)

    def test_generate_social_collections_command_dry_run_does_not_save(self):
        for index in range(3):
            self.collection_candidate_plan(f"command-dry-run-collection-{index}")
        output = StringIO()

        call_command("generate_social_collections", "--dry-run", stdout=output)

        self.assertIn("Dry run: yes", output.getvalue())
        self.assertIn("3 PhD Scholarships in Italy", output.getvalue())
        self.assertEqual(OpportunityCollection.objects.count(), 0)

    def test_public_approved_collection_is_accessible(self):
        plans = [
            self.collection_candidate_plan(f"public-approved-collection-{index}")
            for index in range(3)
        ]
        collection = self.collection_from_plans(
            "3 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
        )

        response = self.client.get(f"/api/scholarships/collections/{collection.slug}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], collection.title)
        self.assertEqual(response.data["slug"], collection.slug)
        self.assertEqual(len(response.data["items"]), 3)
        item = response.data["items"][0]["opportunity"]
        self.assertIn("title", item)
        self.assertIn("slug", item)
        self.assertIn("official_link", item)
        self.assertIn("source_url", item)
        self.assertIn("application_url", item)

    def test_public_ready_collection_is_not_accessible(self):
        plans = [self.collection_candidate_plan(f"public-ready-hidden-{index}") for index in range(3)]
        collection = self.collection_from_plans(
            "3 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.READY,
        )

        response = self.client.get(f"/api/scholarships/collections/{collection.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_collection_items_are_ordered_by_position(self):
        plans = [self.collection_candidate_plan(f"public-ordered-{index}") for index in range(3)]
        collection = self.collection_from_plans(
            "3 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
        )
        OpportunityCollectionItem.objects.filter(collection=collection).delete()
        OpportunityCollectionItem.objects.create(
            collection=collection,
            opportunity=plans[2].opportunity,
            social_post_plan=plans[2],
            position=1,
        )
        OpportunityCollectionItem.objects.create(
            collection=collection,
            opportunity=plans[0].opportunity,
            social_post_plan=plans[0],
            position=2,
        )
        OpportunityCollectionItem.objects.create(
            collection=collection,
            opportunity=plans[1].opportunity,
            social_post_plan=plans[1],
            position=3,
        )

        response = self.client.get(f"/api/scholarships/collections/{collection.slug}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["opportunity"]["slug"] for item in response.data["items"]],
            [
                plans[2].opportunity.slug,
                plans[0].opportunity.slug,
                plans[1].opportunity.slug,
            ],
        )

    def test_public_missing_collection_slug_returns_404(self):
        response = self.client.get("/api/scholarships/collections/not-a-real-collection/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_high_quality_country_degree_collection_auto_approves(self):
        plans = [
            self.collection_candidate_plan(
                f"auto-approve-country-degree-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            priority_score=250,
        )

        evaluation = evaluate_collection_auto_approval(collection)

        self.assertTrue(evaluation["can_auto_approve"])
        self.assertEqual(evaluation["score"], 250)
        result = approve_social_collections(include_ready=True)
        collection.refresh_from_db()
        self.assertEqual(result["approved_count"], 1)
        self.assertEqual(collection.status, OpportunityCollection.Status.APPROVED)
        self.assertEqual(collection.approval_source, OpportunityCollection.ApprovalSource.SYSTEM)
        self.assertIsNotNone(collection.auto_approved_at)

    def test_low_score_generic_deadline_window_does_not_auto_approve(self):
        plans = [
            self.collection_candidate_plan(
                f"generic-deadline-window-{index}",
                country="",
                degree_level="",
                funding_type="",
                field_label="All Fields",
                deadline_days=5,
                priority_score=49,
            )
            for index in range(3)
        ]
        collection = self.collection_from_plans(
            "3 Scholarships Closing Soon",
            plans,
            collection_type=OpportunityCollection.CollectionType.DEADLINE_WINDOW,
            country="",
            degree_level="",
            priority_score=147,
        )

        evaluation = evaluate_collection_auto_approval(collection)

        self.assertFalse(evaluation["can_auto_approve"])
        self.assertIn("deadline_window_needs_at_least_5_items", evaluation["blockers"])
        self.assertIn("priority_score_below_250", evaluation["blockers"])
        self.assertIn("title_too_generic", evaluation["blockers"])

    def test_expired_opportunity_blocks_collection_auto_approval(self):
        plans = [
            self.collection_candidate_plan(
                f"expired-auto-approval-{index}",
                deadline_days=-1 if index == 0 else 20,
                priority_score=80,
            )
            for index in range(3)
        ]
        collection = self.collection_from_plans(
            "3 PhD Scholarships in Italy",
            plans,
            priority_score=240,
        )

        evaluation = evaluate_collection_auto_approval(collection)

        self.assertFalse(evaluation["can_auto_approve"])
        self.assertIn("inactive_or_expired_opportunities", evaluation["blockers"])

    def test_missing_source_url_blocks_collection_auto_approval(self):
        plans = [
            self.collection_candidate_plan(
                f"missing-source-auto-approval-{index}",
                priority_score=80,
            )
            for index in range(3)
        ]
        Opportunity.objects.filter(pk=plans[0].opportunity_id).update(
            official_link="",
            source_url="",
        )
        collection = self.collection_from_plans(
            "3 PhD Scholarships in Italy",
            plans,
            priority_score=240,
        )

        evaluation = evaluate_collection_auto_approval(collection)

        self.assertFalse(evaluation["can_auto_approve"])
        self.assertIn("missing_official_or_source_url", evaluation["blockers"])

    def test_approve_social_collections_dry_run_does_not_save(self):
        plans = [
            self.collection_candidate_plan(
                f"dry-run-auto-approval-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            priority_score=250,
        )

        result = approve_social_collections(dry_run=True, include_ready=True)

        collection.refresh_from_db()
        self.assertEqual(result["approved_count"], 1)
        self.assertEqual(collection.status, OpportunityCollection.Status.READY)
        self.assertIsNone(collection.auto_approved_at)

    def test_generate_social_collections_auto_approve_only_high_confidence(self):
        for index in range(5):
            self.collection_candidate_plan(
                f"generate-auto-approve-high-{index}",
                priority_score=50,
            )
        for index in range(3):
            self.collection_candidate_plan(
                f"generate-auto-approve-low-{index}",
                country="",
                degree_level="",
                funding_type="",
                field_label="All Fields",
                deadline_days=5,
                priority_score=49,
            )

        result = generate_social_collections(auto_approve=True)

        self.assertEqual(result["created_count"], 2)
        self.assertEqual(result["auto_approved_count"], 1)
        approved_titles = list(
            OpportunityCollection.objects.filter(
                status=OpportunityCollection.Status.APPROVED
            ).values_list("title", flat=True)
        )
        ready_titles = list(
            OpportunityCollection.objects.filter(
                status=OpportunityCollection.Status.READY
            ).values_list("title", flat=True)
        )
        self.assertEqual(approved_titles, ["5 PhD Scholarships in Italy"])
        self.assertEqual(ready_titles, ["3 Scholarships Closing Soon"])

    def test_create_collection_social_post_plan_for_approved_collection(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-approved-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )

        result = create_collection_social_post_plan(collection)

        self.assertTrue(result["created"])
        plan = OpportunityCollectionSocialPostPlan.objects.get(collection=collection)
        self.assertEqual(plan.status, OpportunityCollectionSocialPostPlan.Status.READY)
        self.assertEqual(plan.platform, "facebook")
        self.assertEqual(plan.priority_score, 250)
        self.assertEqual(
            plan.link_url,
            f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
        )

    def test_collection_social_post_plan_requires_approved_collection(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-unapproved-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.READY,
            priority_score=250,
        )

        result = create_collection_social_post_plan(collection)

        self.assertFalse(result["created"])
        self.assertIn("collection_not_approved", result["eligibility"]["blockers"])
        self.assertEqual(OpportunityCollectionSocialPostPlan.objects.count(), 0)

    def test_collection_social_post_plan_does_not_duplicate_active_plan(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-duplicate-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            platform="facebook",
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            post_text="Existing plan.",
        )

        result = create_collection_social_post_plan(collection)

        self.assertFalse(result["created"])
        self.assertIn("active_plan_exists", result["eligibility"]["blockers"])
        self.assertEqual(OpportunityCollectionSocialPostPlan.objects.count(), 1)

    def test_collection_social_post_plan_dry_run_does_not_save(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-dry-run-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )

        result = create_collection_social_post_plan(collection, dry_run=True)

        self.assertTrue(result["created"])
        self.assertTrue(result["dry_run"])
        self.assertEqual(OpportunityCollectionSocialPostPlan.objects.count(), 0)

    def test_collection_social_post_text_includes_title_and_public_url(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-text-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )

        post_text = build_collection_social_post_text(collection)

        self.assertIn(collection.title, post_text)
        self.assertIn(
            f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
            post_text,
        )
        self.assertIn("verify eligibility, deadlines, and application details", post_text)

    def test_create_collection_social_post_plans_command_supports_collection_id(self):
        first_plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-command-first-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        second_plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-command-second-{index}",
                country="Germany",
                priority_score=50,
            )
            for index in range(5)
        ]
        first = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            first_plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        second = self.collection_from_plans(
            "5 PhD Scholarships in Germany",
            second_plans,
            country="Germany",
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        output = StringIO()

        call_command(
            "create_collection_social_post_plans",
            "--collection-id",
            str(second.pk),
            "--schedule-now",
            stdout=output,
        )

        self.assertIn("Collection ID", output.getvalue())
        self.assertFalse(
            OpportunityCollectionSocialPostPlan.objects.filter(collection=first).exists()
        )
        self.assertTrue(
            OpportunityCollectionSocialPostPlan.objects.filter(collection=second).exists()
        )

    def test_create_due_collection_social_post_plans_dry_run_does_not_save(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-social-plan-service-dry-run-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )

        result = create_due_collection_social_post_plans(dry_run=True)

        self.assertEqual(result["created_count"], 1)
        self.assertEqual(OpportunityCollectionSocialPostPlan.objects.count(), 0)

    def test_run_daily_social_scheduler_creates_collection_plans_and_is_idempotent(self):
        plans = [
            self.collection_candidate_plan(
                f"daily-scheduler-approved-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        first_output = StringIO()
        second_output = StringIO()

        call_command(
            "run_daily_social_scheduler",
            "--skip-recalculate",
            "--skip-collections",
            "--skip-approval",
            "--start-date",
            "2026-06-01",
            stdout=first_output,
        )
        call_command(
            "run_daily_social_scheduler",
            "--skip-recalculate",
            "--skip-collections",
            "--skip-approval",
            "--start-date",
            "2026-06-01",
            stdout=second_output,
        )

        self.assertEqual(
            OpportunityCollectionSocialPostPlan.objects.filter(collection=collection).count(),
            1,
        )
        self.assertIn("created=1", first_output.getvalue())
        self.assertIn("created=0", second_output.getvalue())
        self.assertIn("active_plan_exists=1", second_output.getvalue())

    def test_run_daily_social_scheduler_dry_run_does_not_create_plan(self):
        plans = [
            self.collection_candidate_plan(
                f"daily-scheduler-dry-run-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        output = StringIO()

        call_command(
            "run_daily_social_scheduler",
            "--dry-run",
            "--skip-recalculate",
            "--skip-collections",
            "--skip-approval",
            stdout=output,
        )

        self.assertEqual(OpportunityCollectionSocialPostPlan.objects.count(), 0)
        self.assertIn("Dry run: yes", output.getvalue())
        self.assertIn("created=1", output.getvalue())

    def test_facebook_worker_cron_runs_three_times_daily(self):
        with open("../workers/facebook-poster/wrangler.toml", encoding="utf-8") as handle:
            content = handle.read()

        self.assertIn('crons = ["0 9,12,15 * * *"]', content)

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_returns_collection_item_when_due(self):
        plans = [
            self.collection_candidate_plan(
                f"mixed-due-collection-item-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        collection_plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            post_text="Collection post text.",
            link_url=f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["items"][0]
        self.assertEqual(item["type"], "collection")
        self.assertEqual(item["plan_id"], collection_plan.pk)
        self.assertEqual(item["collection_id"], collection.pk)
        self.assertEqual(item["collection_title"], collection.title)
        self.assertEqual(item["message"], "Collection post text.")
        self.assertEqual(item["priority_score"], 250)
        self.assertEqual(item["link_url"], collection_plan.link_url)
        self.assertIsNotNone(item["next_post_at"])

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=1,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_collection_respects_daily_cap(self):
        posted = self.opportunity(slug="collection-cap-posted")
        posted_plan = OpportunitySocialPostPlan.objects.create(
            opportunity=posted,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        OpportunitySocialPostLog.objects.create(
            opportunity=posted,
            plan=posted_plan,
            status=OpportunitySocialPostLog.Status.POSTED,
            posted_at=timezone.now(),
        )
        plans = [
            self.collection_candidate_plan(
                f"collection-cap-due-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["reason"], "daily_cap_reached")

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=30,
    )
    def test_social_worker_due_posts_collection_respects_spacing(self):
        posted_plans = [
            self.collection_candidate_plan(
                f"collection-spacing-posted-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        posted_collection = self.collection_from_plans(
            "5 Posted PhD Scholarships in Italy",
            posted_plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        OpportunityCollectionSocialPostLog.objects.create(
            collection=posted_collection,
            platform="facebook",
            status=OpportunityCollectionSocialPostLog.Status.POSTED,
        )
        due_plans = [
            self.collection_candidate_plan(
                f"collection-spacing-due-{index}",
                country="Germany",
                priority_score=50,
            )
            for index in range(5)
        ]
        due_collection = self.collection_from_plans(
            "5 PhD Scholarships in Germany",
            due_plans,
            country="Germany",
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        OpportunityCollectionSocialPostPlan.objects.create(
            collection=due_collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["reason"], "minimum_interval_not_reached")

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_excludes_unapproved_collection(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-unapproved-due-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.READY,
            priority_score=250,
        )
        OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_excludes_collection_before_next_post_at(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-before-due-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at=timezone.now() + timedelta(hours=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_returns_collection_after_next_post_at(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-after-due-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        collection_plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["type"], "collection")
        self.assertEqual(response.data["items"][0]["plan_id"], collection_plan.pk)

    def test_admin_social_scheduler_status_requires_admin_access(self):
        response = self.client.get("/api/admin/social/scheduler-status/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.student)
        response = self.client.get("/api/admin/social/scheduler-status/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_admin_social_scheduler_status_returns_metadata_and_summaries(self):
        opportunity = self.opportunity(slug="scheduler-monitor-opportunity")
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
            priority_score=80,
            next_post_at=timezone.now() - timedelta(minutes=5),
            post_text="Opportunity post text.",
            link_url="https://scholarsrepublic.org/scholarships/scheduler-monitor-opportunity",
        )
        plans = [
            self.collection_candidate_plan(
                f"scheduler-monitor-summary-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 Scheduler Monitor Scholarships",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        collection_plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            post_text="Collection post text.",
            link_url=f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )
        OpportunityCollectionSocialPostLog.objects.create(
            collection=collection,
            plan=collection_plan,
            status=OpportunityCollectionSocialPostLog.Status.FAILED,
            error_message="Example failure.",
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/social/scheduler-status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("server_time", response.data)
        self.assertEqual(response.data["daily_cap"], 20)
        self.assertEqual(response.data["per_run_cap"], 5)
        self.assertEqual(response.data["min_spacing_minutes"], 0)
        self.assertIn("latest_posted_at", response.data)
        self.assertIn("next_allowed_post_at", response.data)
        self.assertGreaterEqual(response.data["due_count"], 1)
        self.assertGreaterEqual(response.data["returned_count"], 1)
        self.assertIn("individual_plans", response.data)
        self.assertIn("by_auto_social_decision", response.data["individual_plans"])
        self.assertIn("collections", response.data)
        self.assertIn("by_status", response.data["collections"])
        self.assertIn("social_post_plans_by_status", response.data["collections"])
        self.assertTrue(response.data["collections"]["next_plans"])
        self.assertTrue(response.data["recent_logs"]["collections"])

    @override_settings(
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_admin_social_scheduler_status_includes_due_queue_preview(self):
        plans = [
            self.collection_candidate_plan(
                f"scheduler-monitor-preview-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 Scheduler Preview Scholarships",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        collection_plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            post_text="Collection preview post.",
            link_url=f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
            next_post_at=timezone.now() - timedelta(minutes=1),
            priority_score=250,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/social/scheduler-status/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["due_items"][0]["type"], "collection")
        self.assertEqual(response.data["due_items"][0]["plan_id"], collection_plan.pk)
        self.assertEqual(response.data["due_items"][0]["collection_id"], collection.pk)
        self.assertEqual(
            response.data["due_items"][0]["link_url"],
            collection_plan.link_url,
        )

    def test_admin_social_gpt_caption_requires_admin_access(self):
        opportunity = self.opportunity(slug="gpt-social-auth")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.student)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(SOCIAL_GPT_ENABLED=False, SOCIAL_GPT_API_KEY="")
    def test_admin_social_gpt_caption_without_api_key_returns_configuration_error(self):
        opportunity = self.opportunity(slug="gpt-social-not-configured")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["detail"], "GPT social writer is not configured.")

    @override_settings(
        SOCIAL_GPT_ENABLED=True,
        SOCIAL_GPT_API_KEY="test-key",
        SOCIAL_GPT_MAX_CHARS=900,
    )
    @patch("apps.opportunities.services.gpt_social_writer.call_openai_caption")
    def test_admin_social_gpt_caption_preview_does_not_save(self, mock_caption):
        opportunity = self.opportunity(slug="gpt-social-preview")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Existing caption.",
            link_url="https://scholarsrepublic.org/scholarships/gpt-social-preview",
        )
        mock_caption.return_value = (
            "Scholars Republic spotlight: Published Scholarship is open for students. "
            "Review the provider details, deadline, and application steps carefully before "
            "applying. View the full scholarship page and verify all details from official "
            "sources: https://scholarsrepublic.org/scholarships/gpt-social-preview"
        )

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {"save": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["saved"])
        plan.refresh_from_db()
        self.assertEqual(plan.post_text, "Existing caption.")

    @override_settings(
        SOCIAL_GPT_ENABLED=True,
        SOCIAL_GPT_API_KEY="test-key",
        SOCIAL_GPT_MAX_CHARS=900,
    )
    @patch("apps.opportunities.services.gpt_social_writer.call_openai_caption")
    def test_admin_social_gpt_caption_save_updates_post_text(self, mock_caption):
        opportunity = self.opportunity(slug="gpt-social-save")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Existing caption.",
            link_url="https://scholarsrepublic.org/scholarships/gpt-social-save",
        )
        generated = (
            "Scholars Republic spotlight: Published Scholarship is available for students. "
            "Check the provider, deadline, requirements, and official instructions before "
            "applying. View the full scholarship page and verify details from official "
            "sources: https://scholarsrepublic.org/scholarships/gpt-social-save"
        )
        mock_caption.return_value = generated

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {"save": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["saved"])
        plan.refresh_from_db()
        self.assertEqual(plan.post_text, generated)

    @override_settings(
        SOCIAL_GPT_ENABLED=True,
        SOCIAL_GPT_API_KEY="test-key",
        SOCIAL_GPT_MAX_CHARS=900,
    )
    @patch("apps.opportunities.services.gpt_social_writer.call_openai_caption")
    def test_admin_social_gpt_collection_caption_uses_collection_link_and_title(self, mock_caption):
        plans = [
            self.collection_candidate_plan(
                f"gpt-social-collection-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 GPT Social Collection Scholarships",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        collection_plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            link_url=f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
        )
        mock_caption.return_value = (
            "Scholars Republic collection: 5 GPT Social Collection Scholarships brings "
            "together selected scholarship opportunities in one list. Review each deadline, "
            "provider, and official source before applying. View the full collection: "
            f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}"
        )

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/collection-plans/{collection_plan.pk}/generate-gpt-caption/",
            {"save": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["type"], "collection")
        self.assertIn(collection.title, response.data["generated_text"])
        self.assertIn(collection_plan.link_url, response.data["generated_text"])

    @override_settings(
        SOCIAL_GPT_ENABLED=True,
        SOCIAL_GPT_API_KEY="test-key",
        SOCIAL_GPT_MAX_CHARS=900,
    )
    @patch("apps.opportunities.services.gpt_social_writer.call_openai_caption")
    def test_admin_social_gpt_opportunity_caption_uses_opportunity_fields(self, mock_caption):
        opportunity = self.opportunity(
            slug="gpt-social-opportunity-fields",
            provider_name="Example Provider",
            funding_type=Opportunity.FundingType.FULLY_FUNDED,
            deadline=date(2026, 12, 31),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            link_url="https://scholarsrepublic.org/scholarships/gpt-social-opportunity-fields",
        )
        mock_caption.return_value = (
            "Scholars Republic spotlight: Published Scholarship from Example Provider is "
            "listed as Fully funded with a 2026-12-31 deadline. Review eligibility and "
            "application steps from official sources before applying. View details: "
            "https://scholarsrepublic.org/scholarships/gpt-social-opportunity-fields"
        )

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {"save": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(opportunity.provider_name, response.data["generated_text"])
        self.assertIn("2026-12-31", response.data["generated_text"])

    @override_settings(
        SOCIAL_GPT_ENABLED=True,
        SOCIAL_GPT_API_KEY="test-key",
        SOCIAL_GPT_MAX_CHARS=280,
    )
    @patch("apps.opportunities.services.gpt_social_writer.call_openai_caption")
    def test_admin_social_gpt_caption_over_max_chars_is_rejected(self, mock_caption):
        opportunity = self.opportunity(slug="gpt-social-too-long")
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
            post_text="Existing caption.",
            link_url="https://scholarsrepublic.org/scholarships/gpt-social-too-long",
        )
        mock_caption.return_value = (
            "Scholars Republic spotlight: "
            + ("This generated scholarship caption is intentionally too long. " * 10)
            + "https://scholarsrepublic.org/scholarships/gpt-social-too-long"
        )

        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f"/api/admin/social/opportunity-plans/{plan.pk}/generate-gpt-caption/",
            {"save": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("length", response.data["detail"])
        plan.refresh_from_db()
        self.assertEqual(plan.post_text, "Existing caption.")

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_post_result_updates_successful_collection_plan(self):
        plans = [
            self.collection_candidate_plan(
                f"collection-result-success-{index}",
                priority_score=50,
            )
            for index in range(5)
        ]
        collection = self.collection_from_plans(
            "5 PhD Scholarships in Italy",
            plans,
            status=OpportunityCollection.Status.APPROVED,
            priority_score=250,
        )
        plan = OpportunityCollectionSocialPostPlan.objects.create(
            collection=collection,
            status=OpportunityCollectionSocialPostPlan.Status.READY,
            post_text="Collection post.",
            link_url=f"https://scholarsrepublic.org/scholarships/collections/{collection.slug}",
            next_post_at=timezone.now() - timedelta(minutes=1),
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/post-result/",
            {
                "type": "collection",
                "plan_id": plan.pk,
                "collection_id": collection.pk,
                "status": "posted",
                "facebook_post_id": "fb_collection_123",
                "facebook_post_url": "https://facebook.com/fb_collection_123",
                "message": "Collection post.",
                "link_url": plan.link_url,
            },
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        collection.refresh_from_db()
        self.assertEqual(plan.status, OpportunityCollectionSocialPostPlan.Status.POSTED)
        self.assertIsNotNone(plan.posted_at)
        self.assertEqual(plan.facebook_post_id, "fb_collection_123")
        self.assertEqual(collection.status, OpportunityCollection.Status.POSTED)
        self.assertTrue(
            OpportunityCollectionSocialPostLog.objects.filter(
                plan=plan,
                status=OpportunityCollectionSocialPostLog.Status.POSTED,
            ).exists()
        )

    def test_social_scheduler_scores_low_priority_as_website_only(self):
        opportunity = self.opportunity(
            slug="priority-website-only",
            funding_type="",
            deadline=None,
            official_link="",
            source_url="",
            provider_name="",
            short_description="",
            description="",
            how_to_apply="",
            degree_levels=[],
            eligible_countries=[],
            published_at=timezone.now() - timedelta(days=20),
        )

        result = score_opportunity_for_social(opportunity)

        self.assertLess(result["score"], 35)
        self.assertEqual(
            result["decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
        )
        self.assertIn("missing_key_fields", result["reasons"])

    def test_social_scheduler_marks_near_deadline_without_recent_verification_manual_review(self):
        opportunity = self.opportunity(
            slug="priority-manual-review",
            deadline=timezone.localdate() + timedelta(days=2),
            deadline_last_checked_at=None,
            verified_status=True,
            official_link="https://example.edu/priority-manual",
            university_name="Example University",
            pathway=self.pathway(),
            degree_levels=["Master", "PhD"],
            eligible_countries=["Pakistan"],
        )

        result = score_opportunity_for_social(opportunity)

        self.assertEqual(
            result["decision"],
            OpportunitySocialPostPlan.AutoSocialDecision.MANUAL_REVIEW,
        )
        self.assertTrue(result["reasons"]["near_deadline_not_recently_verified"])

    def test_apply_social_priority_updates_plan_fields(self):
        opportunity = self.opportunity(
            slug="priority-plan-update",
            deadline=timezone.localdate() + timedelta(days=7),
            verified_status=True,
            official_link="https://example.edu/priority-plan-update",
            university_name="Example University",
            pathway=self.pathway(),
            degree_levels=["Master"],
            eligible_countries=["Pakistan"],
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        result = apply_social_priority(plan)
        plan.refresh_from_db()

        self.assertEqual(plan.priority_score, result["score"])
        self.assertEqual(plan.priority_reason, result["reasons"])
        self.assertEqual(plan.auto_social_decision, result["decision"])

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_due_posts_orders_by_deadline_urgency(self):
        far = self.opportunity(
            slug="ordering-far-deadline",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        no_deadline = self.opportunity(
            slug="ordering-no-deadline",
            status=Opportunity.Status.PUBLISHED,
            deadline=None,
        )
        soon = self.opportunity(
            slug="ordering-soon-deadline",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=2),
        )
        today = self.opportunity(
            slug="ordering-today-deadline",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate(),
        )
        for opportunity in [far, no_deadline, soon, today]:
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 10},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["slug"] for item in response.data["items"]],
            [
                "ordering-today-deadline",
                "ordering-soon-deadline",
                "ordering-no-deadline",
                "ordering-far-deadline",
            ],
        )

    @override_settings(
        SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token",
        SCHOLARS_FACEBOOK_DAILY_POST_CAP=20,
        SCHOLARS_FACEBOOK_PER_RUN_POST_CAP=5,
        SCHOLARS_FACEBOOK_MIN_POST_SPACING_MINUTES=0,
    )
    def test_social_worker_due_posts_prefers_higher_priority_individual_posts(self):
        pathway = self.pathway()
        lower = self.opportunity(
            slug="priority-order-lower",
            status=Opportunity.Status.PUBLISHED,
            funding_type=Opportunity.FundingType.PARTIALLY_FUNDED,
            deadline=timezone.localdate() + timedelta(days=20),
            verified_status=True,
            official_link="https://example.edu/lower",
            university_name="Example University",
            pathway=pathway,
            degree_levels=["Bachelor"],
            eligible_countries=["Pakistan"],
            published_at=timezone.now() - timedelta(days=20),
        )
        higher = self.opportunity(
            slug="priority-order-higher",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=7),
            verified_status=True,
            official_link="https://example.edu/higher",
            source_url="https://example.edu/higher",
            university_name="Example University",
            pathway=pathway,
            degree_levels=["Master", "PhD"],
            eligible_countries=["Pakistan", "International students"],
            published_at=timezone.now(),
        )
        for opportunity in [lower, higher]:
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 2},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["slug"], "priority-order-higher")
        high_plan = OpportunitySocialPostPlan.objects.get(opportunity=higher)
        low_plan = OpportunitySocialPostPlan.objects.get(opportunity=lower)
        self.assertGreater(high_plan.priority_score, low_plan.priority_score)
        self.assertEqual(
            high_plan.auto_social_decision,
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_skips_expired_and_non_ready_plans(self):
        expired = self.opportunity(
            slug="expired-social-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )
        draft_status = self.opportunity(
            slug="draft-status-social-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=10),
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=expired,
            status=OpportunitySocialPostPlan.Status.READY,
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=draft_status,
            status=OpportunitySocialPostPlan.Status.DRAFT,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        expired_plan = OpportunitySocialPostPlan.objects.get(opportunity=expired)
        expired_plan.refresh_from_db()
        self.assertEqual(expired_plan.status, OpportunitySocialPostPlan.Status.PAUSED)
        self.assertFalse(expired_plan.enabled)
        self.assertEqual(
            expired_plan.last_error,
            "Skipped automatic Facebook post because opportunity is expired.",
        )
        self.assertTrue(
            OpportunitySocialPostLog.objects.filter(
                plan=expired_plan,
                status=OpportunitySocialPostLog.Status.SKIPPED,
                error_message="Skipped automatic Facebook post because opportunity is expired.",
            ).exists()
        )

        second_response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.data["items"], [])
        self.assertEqual(
            OpportunitySocialPostLog.objects.filter(
                plan=expired_plan,
                status=OpportunitySocialPostLog.Status.SKIPPED,
                error_message="Skipped automatic Facebook post because opportunity is expired.",
            ).count(),
            1,
        )

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_skips_deadline_check_expired_status(self):
        opportunity = self.opportunity(
            slug="deadline-check-expired-social-skip",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=10),
            deadline_check_status=Opportunity.DeadlineCheckStatus.EXPIRED,
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        plan.refresh_from_db()
        self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.PAUSED)
        self.assertFalse(plan.enabled)
        self.assertEqual(
            plan.last_error,
            "Skipped automatic Facebook post because opportunity is expired.",
        )

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_selects_published_future_opportunity(self):
        opportunity = self.opportunity(
            slug="future-social-safe-select",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=10),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"][0]["plan_id"], plan.pk)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_post_result_updates_successful_plan(self):
        opportunity = self.opportunity(
            slug="social-result-success",
            status=Opportunity.Status.PUBLISHED,
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/post-result/",
            {
                "plan_id": plan.pk,
                "opportunity_id": opportunity.pk,
                "status": "posted",
                "facebook_post_id": "fb_123",
                "facebook_post_url": "https://facebook.com/fb_123",
                "message": "Posted message.",
                "image_url": "https://cdn.example/image.png",
                "link_url": "https://scholarsrepublic.org/scholarships/social-result-success",
            },
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertIsNotNone(plan.last_posted_at)
        self.assertEqual(plan.post_count, 1)
        self.assertEqual(plan.last_error, "")
        self.assertTrue(OpportunitySocialPostLog.objects.filter(plan=plan, status="posted").exists())

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_post_result_reschedules_near_deadline_for_tomorrow_morning(self):
        opportunity = self.opportunity(
            slug="social-result-near-deadline-reschedule",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=2),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/post-result/",
            {
                "plan_id": plan.pk,
                "opportunity_id": opportunity.pk,
                "status": "posted",
                "facebook_post_id": "fb_near",
                "facebook_post_url": "https://facebook.com/fb_near",
                "message": "Posted message.",
                "link_url": "https://scholarsrepublic.org/scholarships/social-result-near-deadline-reschedule",
            },
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        next_post_at = timezone.localtime(plan.next_post_at)
        self.assertEqual(next_post_at.date(), timezone.localdate() + timedelta(days=1))
        self.assertEqual(next_post_at.hour, 9)
        self.assertEqual(next_post_at.minute, 0)

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_post_result_logs_failure(self):
        opportunity = self.opportunity(
            slug="social-result-failed",
            status=Opportunity.Status.PUBLISHED,
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            status=OpportunitySocialPostPlan.Status.READY,
        )

        response = self.client.post(
            "/api/admin/agent/social/facebook/post-result/",
            {
                "plan_id": plan.pk,
                "opportunity_id": opportunity.pk,
                "status": "failed",
                "error_message": "Facebook API failed.",
            },
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="worker-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        plan.refresh_from_db()
        self.assertIsNone(plan.last_posted_at)
        self.assertEqual(plan.last_error, "Facebook API failed.")
        self.assertTrue(OpportunitySocialPostLog.objects.filter(plan=plan, status="failed").exists())

    @override_settings(SCHOLARS_SOCIAL_WORKER_TOKEN="worker-token")
    def test_social_worker_invalid_token_returns_json_403(self):
        response = self.client.post(
            "/api/admin/agent/social/facebook/due-posts/",
            {"limit": 5},
            format="json",
            HTTP_X_SOCIAL_WORKER_TOKEN="wrong-token",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid social worker token."})
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_requires_agent_token(self):
        response = self.client.get("/api/admin/agent/scholarships/deadline-check-queue/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data, {"detail": "Missing or invalid agent token."})

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_package_returns_structured_data(self):
        opportunity = self.opportunity(
            slug="deadline-package",
            official_link="https://example.edu/call",
        )
        with patch(
            "apps.opportunities.services.deadline_checker.fetch_page_text",
            return_value="Applications close on June 30, 2026. Late applications are not accepted.",
        ):
            response = self.client.post(
                f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-package/",
                {},
                format="json",
                HTTP_X_AGENT_TOKEN="test-token",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["opportunity_id"], opportunity.pk)
        self.assertEqual(response.data["candidate_dates"][0]["date"], "2026-06-30")
        self.assertIn("Verify if the deadline", response.data["instructions"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_orders_by_priority(self):
        near = self.opportunity(
            slug="queue-near",
            deadline=timezone.localdate() + timedelta(days=3),
            official_link="https://example.edu/near",
        )
        unchecked = self.opportunity(
            slug="queue-unchecked",
            deadline=timezone.localdate() + timedelta(days=40),
            official_link="https://example.edu/unchecked",
        )
        review = self.opportunity(
            slug="queue-review",
            deadline=timezone.localdate() + timedelta(days=20),
            official_link="https://example.edu/review",
            deadline_check_status=Opportunity.DeadlineCheckStatus.NEEDS_REVIEW,
        )
        old = self.opportunity(
            slug="queue-old-check",
            deadline=timezone.localdate() + timedelta(days=50),
            official_link="https://example.edu/old",
            deadline_check_status=Opportunity.DeadlineCheckStatus.CONFIRMED,
            deadline_last_checked_at=timezone.now() - timedelta(days=8),
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data["items"]],
            [near.pk, unchecked.pk, review.pk, old.pk],
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_excludes_expired_by_default_and_can_include(self):
        expired = self.opportunity(
            slug="queue-expired",
            deadline=timezone.localdate() - timedelta(days=1),
            official_link="https://example.edu/expired",
        )

        default_response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )
        include_response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all", "include_expired": True},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertNotIn(expired.pk, [item["id"] for item in default_response.data["items"]])
        self.assertIn(expired.pk, [item["id"] for item in include_response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_excludes_recently_confirmed_by_default(self):
        confirmed = self.opportunity(
            slug="queue-confirmed-recent",
            deadline=timezone.localdate() + timedelta(days=40),
            official_link="https://example.edu/confirmed-recent",
            deadline_check_status=Opportunity.DeadlineCheckStatus.CONFIRMED,
            deadline_check_confidence=Opportunity.DeadlineCheckConfidence.HIGH,
            deadline_last_checked_at=timezone.now(),
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(confirmed.pk, [item["id"] for item in response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_includes_stale_confirmed_after_freshness_window(self):
        confirmed = self.opportunity(
            slug="queue-confirmed-stale",
            deadline=timezone.localdate() + timedelta(days=40),
            official_link="https://example.edu/confirmed-stale",
            deadline_check_status=Opportunity.DeadlineCheckStatus.CONFIRMED,
            deadline_check_confidence=Opportunity.DeadlineCheckConfidence.HIGH,
            deadline_last_checked_at=timezone.now() - timedelta(days=8),
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "needs_verification", "freshness_days": 7},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(confirmed.pk, [item["id"] for item in response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_keeps_problem_statuses_visible(self):
        review = self.opportunity(
            slug="queue-needs-review-visible",
            deadline=timezone.localdate() + timedelta(days=40),
            official_link="https://example.edu/review-visible",
            deadline_check_status=Opportunity.DeadlineCheckStatus.NEEDS_REVIEW,
        )
        unclear = self.opportunity(
            slug="queue-unclear-visible",
            deadline=timezone.localdate() + timedelta(days=41),
            official_link="https://example.edu/unclear-visible",
            deadline_check_status=Opportunity.DeadlineCheckStatus.UNCLEAR,
        )
        failed = self.opportunity(
            slug="queue-failed-visible",
            deadline=timezone.localdate() + timedelta(days=42),
            official_link="https://example.edu/failed-visible",
            deadline_check_status=Opportunity.DeadlineCheckStatus.FAILED,
        )

        response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "needs_verification"},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["items"]]
        self.assertIn(review.pk, ids)
        self.assertIn(unclear.pk, ids)
        self.assertIn(failed.pk, ids)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_queue_all_and_confirmed_filters_include_recent_confirmed(self):
        confirmed = self.opportunity(
            slug="queue-confirmed-filter",
            deadline=timezone.localdate() + timedelta(days=60),
            official_link="https://example.edu/confirmed-filter",
            deadline_check_status=Opportunity.DeadlineCheckStatus.CONFIRMED,
            deadline_check_confidence=Opportunity.DeadlineCheckConfidence.HIGH,
            deadline_last_checked_at=timezone.now(),
        )

        all_response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )
        confirmed_response = self.client.post(
            "/api/admin/agent/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "confirmed"},
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(all_response.status_code, status.HTTP_200_OK)
        self.assertEqual(confirmed_response.status_code, status.HTTP_200_OK)
        self.assertIn(confirmed.pk, [item["id"] for item in all_response.data["items"]])
        confirmed_item = confirmed_response.data["items"][0]
        self.assertEqual(confirmed_item["id"], confirmed.pk)
        self.assertTrue(confirmed_item["recently_verified"])
        self.assertFalse(confirmed_item["needs_verification"])
        self.assertIsNotNone(confirmed_item["verification_fresh_until"])

    def test_admin_deadline_verification_queue_returns_dashboard_stats(self):
        self.client.force_authenticate(self.admin)
        today = timezone.localdate()
        self.opportunity(
            slug="stats-near",
            deadline=today + timedelta(days=3),
            official_link="https://example.edu/near",
        )
        self.opportunity(
            slug="stats-unclear",
            deadline=today + timedelta(days=20),
            official_link="https://example.edu/unclear",
            deadline_check_status=Opportunity.DeadlineCheckStatus.UNCLEAR,
        )
        self.opportunity(
            slug="stats-failed",
            deadline=today + timedelta(days=25),
            official_link="https://example.edu/failed",
            deadline_check_status=Opportunity.DeadlineCheckStatus.FAILED,
        )
        extended = self.opportunity(
            slug="stats-extended",
            deadline=today + timedelta(days=30),
            official_link="https://example.edu/extended",
            deadline_check_status=Opportunity.DeadlineCheckStatus.EXTENDED,
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=extended,
            platform="facebook",
            social_image_is_stale=True,
        )

        response = self.client.post(
            "/api/admin/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["stats"]["total_pending"], 4)
        self.assertGreaterEqual(response.data["stats"]["near_deadline"], 1)
        self.assertEqual(response.data["stats"]["unclear"], 1)
        self.assertEqual(response.data["stats"]["failed"], 1)
        self.assertEqual(response.data["stats"]["extended"], 1)
        self.assertEqual(response.data["stats"]["stale_social_image"], 1)

    def test_admin_deadline_verification_queue_requires_jwt_auth(self):
        response = self.client.post(
            "/api/admin/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_deadline_verification_queue_accepts_admin_jwt_auth(self):
        self.opportunity(
            slug="jwt-deadline-dashboard",
            deadline=timezone.localdate() + timedelta(days=3),
            official_link="https://example.edu/jwt-dashboard",
        )
        access_token = str(RefreshToken.for_user(self.admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        response = self.client.post(
            "/api/admin/scholarships/deadline-verification-queue/",
            {"limit": 10, "status": "all"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["ok"])
        self.assertGreaterEqual(response.data["count"], 1)

    def test_deadline_candidate_classifier_deterministic_rules(self):
        confirmed = classify_deadline_candidates(
            "2026-06-01",
            [{"date": "2026-06-01", "evidence": "Application deadline: June 1, 2026."}],
        )
        extended = classify_deadline_candidates(
            "2026-06-01",
            [{"date": "2026-06-30", "evidence": "Applications submit deadline: June 30, 2026."}],
        )
        non_deadline = classify_deadline_candidates(
            "2026-06-01",
            [{"date": "2026-09-01", "evidence": "Programme start date is September 1, 2026."}],
        )
        conflicting = classify_deadline_candidates(
            "2026-06-01",
            [
                {"date": "2026-06-15", "evidence": "Application deadline: June 15, 2026."},
                {"date": "2026-06-30", "evidence": "Closing deadline: June 30, 2026."},
            ],
        )
        unclear = classify_deadline_candidates("2026-06-01", [])

        self.assertEqual(confirmed["status"], "confirmed")
        self.assertEqual(extended["status"], "extended")
        self.assertEqual(non_deadline["status"], "needs_review")
        self.assertEqual(conflicting["status"], "needs_review")
        self.assertEqual(unclear["status"], "unclear")

    def test_run_deadline_verification_queue_dry_run_does_not_update_deadline(self):
        opportunity = self.opportunity(
            slug="dry-run-deadline-command",
            deadline=date(2026, 6, 1),
            official_link="https://example.edu/dry-run",
        )
        output = StringIO()

        with patch(
            "apps.opportunities.services.deadline_checker.fetch_page_text",
            return_value="Applications submit deadline: June 30, 2026.",
        ):
            call_command(
                "run_deadline_verification_queue",
                "--dry-run",
                "--limit",
                "1",
                stdout=output,
            )

        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 6, 1))
        self.assertIsNone(opportunity.deadline_last_checked_at)
        self.assertIn("likely=extended", output.getvalue())

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_batch_package_returns_multiple_packages(self):
        first = self.opportunity(slug="batch-first", official_link="https://example.edu/first")
        second = self.opportunity(slug="batch-second", official_link="https://example.edu/second")
        with patch(
            "apps.opportunities.services.deadline_checker.fetch_page_text",
            return_value="Deadline is July 15, 2026.",
        ):
            response = self.client.post(
                "/api/admin/agent/scholarships/deadline-verification-batch-package/",
                {"ids": [first.pk, second.pk], "max_excerpt_chars": 6000},
                format="json",
                HTTP_X_AGENT_TOKEN="test-token",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual([item["status"] for item in response.data["packages"]], ["ready", "ready"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_batch_package_handles_failed_item(self):
        opportunity = self.opportunity(slug="batch-failure", official_link="https://example.edu/fail")

        def fake_prepare(item):
            raise RuntimeError("fetch failed")

        with patch("apps.opportunities.views.prepare_deadline_verification_package", side_effect=fake_prepare):
            response = self.client.post(
                "/api/admin/agent/scholarships/deadline-verification-batch-package/",
                {"ids": [opportunity.pk, 999999]},
                format="json",
                HTTP_X_AGENT_TOKEN="test-token",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["packages"][0]["status"], "failed")
        self.assertEqual(response.data["packages"][1]["status"], "failed")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_stores_log_and_updates_high_confidence_extension(self):
        opportunity = self.opportunity(
            slug="deadline-extension",
            deadline=date(2026, 6, 1),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "extended",
                "detected_deadline": "2026-06-30",
                "confidence": "high",
                "evidence_text": "Official page says applications close on June 30, 2026.",
                "source_url": "https://example.edu/call",
                "notes": "Official source verified.",
                "apply_update": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 6, 30))
        self.assertEqual(opportunity.deadline_previous_value, date(2026, 6, 1))
        log = OpportunityDeadlineCheckLog.objects.get(opportunity=opportunity)
        self.assertEqual(log.status, "extended")
        self.assertEqual(log.confidence, "high")
        self.assertEqual(log.detected_deadline, date(2026, 6, 30))

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_confirmed_without_update_returns_200(self):
        opportunity = self.opportunity(
            slug="deadline-confirmed",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "confirmed",
                "detected_deadline": "2026-05-31",
                "confidence": "high",
                "evidence_text": "Apply by 2026-05-31.",
                "source_url": "https://example.com",
                "notes": "Official source confirms the stored deadline.",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.CONFIRMED)
        self.assertTrue(
            OpportunityDeadlineCheckLog.objects.filter(
                opportunity=opportunity,
                status=OpportunityDeadlineCheckLog.Status.CONFIRMED,
            ).exists()
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_confirmed_with_apply_update_does_not_crash(self):
        opportunity = self.opportunity(
            slug="deadline-confirmed-apply",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "confirmed",
                "detected_deadline": "2026-05-31",
                "confidence": "high",
                "evidence_text": "Apply by 2026-05-31.",
                "source_url": "https://example.com",
                "notes": "Official source confirms the stored deadline.",
                "apply_update": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.CONFIRMED)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_unclear_logs_without_deadline_update(self):
        opportunity = self.opportunity(
            slug="deadline-unclear",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "unclear",
                "detected_deadline": None,
                "confidence": "low",
                "evidence_text": "The official page mentions dates but no application deadline.",
                "source_url": "https://example.com",
                "notes": "Needs manual review.",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.UNCLEAR)
        self.assertTrue(
            OpportunityDeadlineCheckLog.objects.filter(
                opportunity=opportunity,
                status=OpportunityDeadlineCheckLog.Status.UNCLEAR,
            ).exists()
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_empty_detected_deadline_does_not_crash(self):
        opportunity = self.opportunity(
            slug="deadline-empty-detected",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "failed",
                "detected_deadline": "",
                "confidence": "low",
                "evidence_text": "No reliable deadline found.",
                "source_url": "https://example.com/" + ("a" * 260),
                "notes": "Source was not conclusive.",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.FAILED)
        log = OpportunityDeadlineCheckLog.objects.get(opportunity=opportunity)
        self.assertLessEqual(len(log.source_url), 200)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_needs_review_empty_detected_deadline_returns_200(self):
        opportunity = self.opportunity(
            slug="deadline-needs-review-empty",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "needs_review",
                "detected_deadline": "",
                "confidence": "medium",
                "evidence_text": "Multiple dates appear on the page.",
                "source_url": "https://example.com",
                "notes": "Manual review required.",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.NEEDS_REVIEW)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_invalid_detected_deadline_returns_400(self):
        opportunity = self.opportunity(
            slug="deadline-invalid-detected",
            deadline=date(2026, 5, 31),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "confirmed",
                "detected_deadline": "31-05-2026",
                "confidence": "high",
                "evidence_text": "Apply by 31-05-2026.",
                "source_url": "https://example.com",
                "notes": "Bad date format from agent.",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "Invalid date format. Use YYYY-MM-DD.")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_source_link_correction_suggestion_does_not_edit_urls(self):
        opportunity = self.opportunity(
            slug="source-link-suggestion",
            official_link="https://old.example.edu/call",
            source_url="https://old.example.edu/source",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/source-links-correction/",
            {
                "official_url": "https://new.example.edu/call",
                "source_url": "https://new.example.edu/source",
                "application_url": "https://new.example.edu/apply",
                "reason": "Stored links point to outdated pages.",
                "evidence_url": "https://new.example.edu/call",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.official_link, "https://old.example.edu/call")
        self.assertEqual(opportunity.source_url, "https://old.example.edu/source")
        log = OpportunitySourceLinkCorrectionLog.objects.get(opportunity=opportunity)
        self.assertFalse(log.applied)
        self.assertEqual(log.suggested_official_url, "https://new.example.edu/call")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_source_link_correction_apply_updates_url_fields_only(self):
        opportunity = self.opportunity(
            slug="source-link-apply",
            title="Original Title",
            deadline=date(2026, 5, 31),
            official_link="https://old.example.edu/call",
            source_url="https://old.example.edu/source",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/source-links-correction/",
            {
                "official_url": "https://new.example.edu/call",
                "source_url": "https://new.example.edu/source",
                "reason": "Official page moved.",
                "evidence_url": "https://new.example.edu/call",
                "apply_update": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.official_link, "https://new.example.edu/call")
        self.assertEqual(opportunity.source_url, "https://new.example.edu/source")
        self.assertEqual(opportunity.title, "Original Title")
        self.assertEqual(opportunity.deadline, date(2026, 5, 31))
        self.assertTrue(OpportunitySourceLinkCorrectionLog.objects.get(opportunity=opportunity).applied)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_source_link_correction_invalid_url_returns_400(self):
        opportunity = self.opportunity(slug="source-link-invalid")

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/source-links-correction/",
            {
                "official_url": "ftp://example.edu/call",
                "reason": "Invalid scheme.",
                "evidence_url": "https://example.edu",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("official_url", response.data["detail"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_source_link_correction_requires_agent_token(self):
        opportunity = self.opportunity(slug="source-link-token")

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/source-links-correction/",
            {"official_url": "https://example.edu/call", "apply_update": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_source_link_correction_overlong_url_returns_400(self):
        opportunity = self.opportunity(slug="source-link-overlong")

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/source-links-correction/",
            {
                "official_url": f"https://example.edu/{'a' * 220}",
                "reason": "URL too long.",
                "evidence_url": "https://example.edu",
                "apply_update": False,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("too long", response.data["detail"])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_verification_result_extended_without_social_image_does_not_crash(self):
        opportunity = self.opportunity(
            slug="deadline-extended-no-image",
            deadline=date(2026, 6, 1),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "extended",
                "detected_deadline": "2026-06-30",
                "confidence": "high",
                "evidence_text": "Official page says applications close on June 30, 2026.",
                "source_url": "https://example.com",
                "notes": "No uploaded social image exists.",
                "apply_update": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 6, 30))

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_low_confidence_deadline_extension_does_not_update_deadline(self):
        opportunity = self.opportunity(
            slug="deadline-low-confidence",
            deadline=date(2026, 6, 1),
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
            {
                "status": "extended",
                "detected_deadline": "2026-06-30",
                "confidence": "low",
                "evidence_text": "A forum mentions June 30.",
                "source_url": "https://example.edu/call",
                "notes": "Weak evidence.",
                "apply_update": True,
            },
            format="json",
            HTTP_X_AGENT_TOKEN="test-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, date(2026, 6, 1))
        self.assertEqual(opportunity.deadline_check_status, Opportunity.DeadlineCheckStatus.NEEDS_REVIEW)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_change_marks_uploaded_social_image_stale_and_forces_og_fallback(self):
        opportunity = self.opportunity(
            slug="deadline-stale-image",
            deadline=date(2026, 6, 1),
        )
        with tempfile.TemporaryDirectory() as media_root, self.settings(MEDIA_ROOT=media_root):
            plan = OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                status=OpportunitySocialPostPlan.Status.READY,
            )
            save_social_image_from_base64(
                plan,
                base64.b64encode(VALID_PNG_BYTES).decode(),
                filename="deadline-image.png",
                source=plan.SocialImageSource.GPT_UPLOADED,
            )

            response = self.client.post(
                f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-verification-result/",
                {
                    "status": "extended",
                    "detected_deadline": "2026-06-30",
                    "confidence": "high",
                    "evidence_text": "Official page says applications close on June 30, 2026.",
                    "source_url": "https://example.edu/call",
                    "notes": "",
                    "apply_update": True,
                },
                format="json",
                HTTP_X_AGENT_TOKEN="test-token",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)
            plan.refresh_from_db()
            self.assertTrue(plan.social_image_is_stale)
            self.assertIn("/opengraph-image", plan_image_url(plan))

            save_social_image_from_base64(
                plan,
                base64.b64encode(VALID_PNG_BYTES).decode(),
                filename="new-deadline-image.png",
                source=plan.SocialImageSource.GPT_UPLOADED,
            )
            plan.refresh_from_db()
            self.assertFalse(plan.social_image_is_stale)
        self.assert_json_response(response)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_includes_missing_near_and_past_deadlines(self):
        missing = self.opportunity(
            slug="deadline-check-missing",
            deadline=None,
            official_link="https://example.edu/missing",
        )
        past = self.opportunity(
            slug="deadline-check-past",
            deadline=timezone.localdate() - timedelta(days=2),
            official_link="https://example.edu/past",
        )
        near = self.opportunity(
            slug="deadline-check-near",
            deadline=timezone.localdate() + timedelta(days=4),
            source_url="https://example.edu/near",
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"limit": 10, "days_ahead": 14},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in response.data["items"]]
        self.assertIn(missing.slug, slugs)
        self.assertIn(past.slug, slugs)
        self.assertIn(near.slug, slugs)
        self.assertLess(slugs.index(past.slug), slugs.index(near.slug))
        self.assertLess(slugs.index(near.slug), slugs.index(missing.slug))

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_excludes_draft_and_archived(self):
        draft = self.opportunity(
            slug="deadline-check-draft",
            status=Opportunity.Status.DRAFT,
            deadline=timezone.localdate() + timedelta(days=1),
            official_link="https://example.edu/draft",
        )
        archived = self.opportunity(
            slug="deadline-check-archived",
            status=Opportunity.Status.ARCHIVED,
            deadline=timezone.localdate() + timedelta(days=1),
            official_link="https://example.edu/archived",
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            **self.agent_headers(),
        )

        slugs = [item["slug"] for item in response.data["items"]]
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(draft.slug, slugs)
        self.assertNotIn(archived.slug, slugs)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_respects_limit(self):
        for index in range(3):
            self.opportunity(
                slug=f"deadline-check-limit-{index}",
                deadline=timezone.localdate() + timedelta(days=index + 1),
                official_link=f"https://example.edu/limit-{index}",
            )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"limit": 2},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 2)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_includes_far_future_never_checked_deadline(self):
        opportunity = self.opportunity(
            slug="deadline-check-far-never-checked",
            deadline=timezone.localdate() + timedelta(days=120),
            official_link="https://example.edu/far-never-checked",
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"days_ahead": 7},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(opportunity.slug, [item["slug"] for item in response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_includes_old_checked_deadline(self):
        opportunity = self.opportunity(
            slug="deadline-check-old-checked",
            deadline=timezone.localdate() + timedelta(days=120),
            official_link="https://example.edu/old-checked",
            deadline_last_checked_at=timezone.now() - timedelta(days=31),
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"days_ahead": 7, "check_stale_days": 30},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(opportunity.slug, [item["slug"] for item in response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_excludes_recently_checked_far_future_deadline(self):
        opportunity = self.opportunity(
            slug="deadline-check-recent-far",
            deadline=timezone.localdate() + timedelta(days=120),
            official_link="https://example.edu/recent-far",
            deadline_last_checked_at=timezone.now() - timedelta(days=2),
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"days_ahead": 7, "check_stale_days": 30},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn(opportunity.slug, [item["slug"] for item in response.data["items"]])

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_queue_prioritizes_deadline_urgency(self):
        far_unchecked = self.opportunity(
            slug="deadline-priority-far-unchecked",
            deadline=timezone.localdate() + timedelta(days=120),
            official_link="https://example.edu/far-unchecked",
        )
        missing = self.opportunity(
            slug="deadline-priority-missing",
            deadline=None,
            official_link="https://example.edu/missing",
        )
        near = self.opportunity(
            slug="deadline-priority-near",
            deadline=timezone.localdate() + timedelta(days=3),
            official_link="https://example.edu/near",
        )
        today = self.opportunity(
            slug="deadline-priority-today",
            deadline=timezone.localdate(),
            official_link="https://example.edu/today",
        )
        past = self.opportunity(
            slug="deadline-priority-past",
            deadline=timezone.localdate() - timedelta(days=1),
            official_link="https://example.edu/past",
        )

        response = self.client.get(
            "/api/admin/agent/scholarships/deadline-check-queue/",
            {"limit": 10, "days_ahead": 7},
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in response.data["items"]]
        self.assertEqual(
            slugs[:5],
            [
                past.slug,
                today.slug,
                near.slug,
                missing.slug,
                far_unchecked.slug,
            ],
        )

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_check_result_updates_check_fields(self):
        original_deadline = timezone.localdate() + timedelta(days=30)
        opportunity = self.opportunity(
            slug="deadline-result-active",
            deadline=original_deadline,
            official_link="https://example.edu/active",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-check-result/",
            {
                "check_status": "verified_active",
                "verified_deadline": opportunity.deadline.isoformat(),
                "source_url": "https://example.edu/active",
                "evidence": "Official page lists the current deadline.",
                "note": "Looks active.",
                "should_unpublish_if_expired": False,
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, original_deadline)
        self.assertEqual(opportunity.status, Opportunity.Status.PUBLISHED)
        self.assertIsNotNone(opportunity.deadline_last_checked_at)
        self.assertEqual(
            opportunity.deadline_check_status,
            Opportunity.DeadlineCheckStatus.VERIFIED_ACTIVE,
        )
        self.assertEqual(opportunity.deadline_check_source_url, "https://example.edu/active")
        self.assertEqual(
            opportunity.deadline_check_evidence,
            "Official page lists the current deadline.",
        )
        self.assertEqual(opportunity.deadline_check_note, "Looks active.")

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_deadline_changed_updates_deadline_and_creates_log(self):
        opportunity = self.opportunity(
            slug="deadline-result-changed",
            deadline=timezone.localdate() + timedelta(days=5),
            official_link="https://example.edu/changed",
        )
        new_deadline = timezone.localdate() + timedelta(days=20)

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-check-result/",
            {
                "check_status": "deadline_changed",
                "verified_deadline": new_deadline.isoformat(),
                "source_url": "https://example.edu/changed",
                "evidence": "Official page now lists a later deadline.",
                "note": "Updated from official source.",
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, new_deadline)
        log = OpportunityDeadlineCheckLog.objects.get(opportunity=opportunity)
        self.assertEqual(log.old_deadline, timezone.localdate() + timedelta(days=5))
        self.assertEqual(log.new_deadline, new_deadline)
        self.assertEqual(log.check_status, Opportunity.DeadlineCheckStatus.DEADLINE_CHANGED)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_verified_expired_archives_opportunity_and_creates_log(self):
        opportunity = self.opportunity(
            slug="deadline-result-expired",
            deadline=timezone.localdate() - timedelta(days=1),
            official_link="https://example.edu/expired",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-check-result/",
            {
                "check_status": "verified_expired",
                "verified_deadline": opportunity.deadline.isoformat(),
                "source_url": "https://example.edu/expired",
                "evidence": "Official page says applications are closed.",
                "note": "Archive because no expired status exists.",
                "should_unpublish_if_expired": True,
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.status, Opportunity.Status.ARCHIVED)
        log = OpportunityDeadlineCheckLog.objects.get(opportunity=opportunity)
        self.assertEqual(log.old_status, Opportunity.Status.PUBLISHED)
        self.assertEqual(log.new_status, Opportunity.Status.ARCHIVED)
        self.assertEqual(log.check_status, Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED)

    @override_settings(SCHOLARS_AGENT_TOKEN="test-token")
    def test_unclear_logs_result_without_changing_deadline_or_status(self):
        original_deadline = timezone.localdate() + timedelta(days=10)
        opportunity = self.opportunity(
            slug="deadline-result-unclear",
            deadline=original_deadline,
            official_link="https://example.edu/unclear",
        )

        response = self.client.post(
            f"/api/admin/agent/scholarships/{opportunity.pk}/deadline-check-result/",
            {
                "check_status": "unclear",
                "verified_deadline": None,
                "source_url": "https://example.edu/unclear",
                "evidence": "Page has conflicting dates.",
                "note": "Needs human review.",
                "should_unpublish_if_expired": True,
            },
            format="json",
            **self.agent_headers(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertEqual(opportunity.deadline, original_deadline)
        self.assertEqual(opportunity.status, Opportunity.Status.PUBLISHED)
        log = OpportunityDeadlineCheckLog.objects.get(opportunity=opportunity)
        self.assertEqual(log.check_status, Opportunity.DeadlineCheckStatus.UNCLEAR)

    def test_backfill_facebook_social_plans_dry_run_creates_nothing(self):
        self.opportunity(
            slug="backfill-dry-run",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        output = StringIO()

        call_command(
            "backfill_facebook_social_plans",
            "--dry-run",
            stdout=output,
        )

        self.assertEqual(OpportunitySocialPostPlan.objects.count(), 0)
        self.assertIn("Dry run: yes", output.getvalue())
        self.assertIn("Plans created: 0", output.getvalue())

    def test_backfill_facebook_social_plans_creates_active_published_plans(self):
        opportunity = self.opportunity(
            slug="backfill-active-published",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        before = timezone.now()

        call_command(
            "backfill_facebook_social_plans",
            stdout=StringIO(),
        )
        after = timezone.now()

        plan = OpportunitySocialPostPlan.objects.get(opportunity=opportunity)
        self.assertEqual(plan.platform, "facebook")
        self.assertTrue(plan.enabled)
        self.assertEqual(plan.status, OpportunitySocialPostPlan.Status.READY)
        self.assertIn("Published Scholarship", plan.post_text)
        self.assertIn("Key Details:", plan.post_text)
        self.assertEqual(plan.image_url, "")
        self.assertEqual(
            plan.link_url,
            "https://scholarsrepublic.org/scholarships/backfill-active-published/",
        )
        self.assertGreaterEqual(plan.next_post_at, before)
        self.assertLessEqual(plan.next_post_at, after)

    def test_backfill_facebook_social_plans_skips_expired_opportunities(self):
        expired = self.opportunity(
            slug="backfill-expired",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() - timedelta(days=1),
        )
        active = self.opportunity(
            slug="backfill-active-not-expired",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=1),
        )

        call_command(
            "backfill_facebook_social_plans",
            stdout=StringIO(),
        )

        self.assertFalse(OpportunitySocialPostPlan.objects.filter(opportunity=expired).exists())
        self.assertTrue(OpportunitySocialPostPlan.objects.filter(opportunity=active).exists())

    def test_backfill_facebook_social_plans_does_not_duplicate_existing_plans(self):
        opportunity = self.opportunity(
            slug="backfill-existing-plan",
            status=Opportunity.Status.PUBLISHED,
            deadline=timezone.localdate() + timedelta(days=30),
        )
        OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
        )

        call_command(
            "backfill_facebook_social_plans",
            stdout=StringIO(),
        )

        self.assertEqual(
            OpportunitySocialPostPlan.objects.filter(
                opportunity=opportunity,
                platform="facebook",
            ).count(),
            1,
        )

    def test_backfill_facebook_social_plans_makes_active_opportunities_immediately_eligible(self):
        for index in range(3):
            self.opportunity(
                slug=f"backfill-immediate-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=30),
            )
        before = timezone.now()

        call_command(
            "backfill_facebook_social_plans",
            stdout=StringIO(),
        )
        after = timezone.now()

        next_post_times = list(
            OpportunitySocialPostPlan.objects.order_by("opportunity_id").values_list(
                "next_post_at",
                flat=True,
            )
        )
        self.assertEqual(len(next_post_times), 3)
        for next_post_at in next_post_times:
            self.assertGreaterEqual(next_post_at, before)
            self.assertLessEqual(next_post_at, after)

    def test_backfill_facebook_social_plans_limit_works(self):
        for index in range(3):
            self.opportunity(
                slug=f"backfill-limit-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=30),
            )

        call_command(
            "backfill_facebook_social_plans",
            "--limit",
            "2",
            stdout=StringIO(),
        )

        self.assertEqual(OpportunitySocialPostPlan.objects.count(), 2)

    def test_backfill_facebook_social_plans_per_day_works(self):
        for index in range(3):
            self.opportunity(
                slug=f"backfill-per-day-{index}",
                status=Opportunity.Status.PUBLISHED,
                deadline=timezone.localdate() + timedelta(days=30),
            )

        call_command(
            "backfill_facebook_social_plans",
            "--stagger",
            "--per-day",
            "2",
            "--start-date",
            "2026-06-01",
            stdout=StringIO(),
        )

        next_post_times = list(
            OpportunitySocialPostPlan.objects.order_by("opportunity_id").values_list(
                "next_post_at",
                flat=True,
            )
        )
        self.assertEqual(
            next_post_times,
            [
                datetime(2026, 6, 1, 9, 0, tzinfo=dt_timezone.utc),
                datetime(2026, 6, 1, 9, 0, tzinfo=dt_timezone.utc),
                datetime(2026, 6, 2, 9, 0, tzinfo=dt_timezone.utc),
            ],
        )

    def test_recalculate_facebook_social_scores_updates_existing_plan(self):
        opportunity = self.opportunity(
            slug="recalculate-social-score",
            deadline=timezone.localdate() + timedelta(days=10),
            official_link="https://example.edu/recalculate-social-score",
            description="A complete scholarship description for social scoring.",
            short_description="Complete short description.",
            how_to_apply="Apply through the official portal.",
            university_name="Example University",
            published_at=timezone.now(),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            priority_score=0,
            priority_reason={},
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
        )
        output = StringIO()

        call_command("recalculate_facebook_social_scores", stdout=output)

        plan.refresh_from_db()
        self.assertGreater(plan.priority_score, 0)
        self.assertEqual(
            plan.auto_social_decision,
            OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL,
        )
        self.assertIn("Plans changed: 1", output.getvalue())
        self.assertIn(f"id={plan.id}", output.getvalue())

    def test_recalculate_facebook_social_scores_dry_run_does_not_save(self):
        opportunity = self.opportunity(
            slug="recalculate-social-score-dry-run",
            deadline=timezone.localdate() + timedelta(days=10),
            official_link="https://example.edu/recalculate-social-score-dry-run",
            description="A complete scholarship description for social scoring.",
            short_description="Complete short description.",
            how_to_apply="Apply through the official portal.",
            university_name="Example University",
            published_at=timezone.now(),
        )
        plan = OpportunitySocialPostPlan.objects.create(
            opportunity=opportunity,
            platform="facebook",
            status=OpportunitySocialPostPlan.Status.READY,
            priority_score=0,
            priority_reason={},
            auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
        )
        output = StringIO()

        call_command("recalculate_facebook_social_scores", "--dry-run", stdout=output)

        plan.refresh_from_db()
        self.assertEqual(plan.priority_score, 0)
        self.assertEqual(
            plan.auto_social_decision,
            OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
        )
        self.assertIn("Dry run: yes", output.getvalue())
        self.assertIn("Plans changed: 1", output.getvalue())
        self.assertIn("After decisions: individual=1", output.getvalue())

    def test_recalculate_facebook_social_scores_default_scope_skips_inactive(self):
        active = self.opportunity(
            slug="recalculate-active",
            deadline=timezone.localdate() + timedelta(days=10),
            official_link="https://example.edu/recalculate-active",
            description="A complete scholarship description for social scoring.",
            short_description="Complete short description.",
            how_to_apply="Apply through the official portal.",
            university_name="Example University",
            published_at=timezone.now(),
        )
        archived = self.opportunity(
            slug="recalculate-archived",
            status=Opportunity.Status.ARCHIVED,
            deadline=timezone.localdate() + timedelta(days=10),
            official_link="https://example.edu/recalculate-archived",
        )
        expired = self.opportunity(
            slug="recalculate-expired",
            deadline=timezone.localdate() - timedelta(days=1),
            official_link="https://example.edu/recalculate-expired",
        )
        plans = [
            OpportunitySocialPostPlan.objects.create(
                opportunity=opportunity,
                platform="facebook",
                status=OpportunitySocialPostPlan.Status.READY,
                priority_score=0,
                auto_social_decision=OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY,
            )
            for opportunity in [active, archived, expired]
        ]

        call_command("recalculate_facebook_social_scores", stdout=StringIO())

        for plan in plans:
            plan.refresh_from_db()
        self.assertGreater(plans[0].priority_score, 0)
        self.assertEqual(plans[1].priority_score, 0)
        self.assertEqual(plans[2].priority_score, 0)

    def test_public_can_list_published_opportunities(self):
        opportunity = self.opportunity(
            funding_type=Opportunity.FundingType.STIPEND_ONLY,
            funding_amount=1200,
            funding_currency="EUR",
            stipend_summary="monthly stipend",
        )

        response = self.client.get("/api/scholarships/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        list_item = [item for item in self.results(response) if item["slug"] == opportunity.slug][0]
        self.assertIn("funding_amount", list_item)
        self.assertIn("funding_currency", list_item)
        self.assertEqual(str(list_item["funding_amount"]), "1200.00")
        self.assertEqual(list_item["funding_currency"], "EUR")
        self.assertEqual(list_item["stipend_summary"], "monthly stipend")

    def test_public_cannot_list_draft_opportunities(self):
        draft = self.opportunity(
            title="Draft Opportunity",
            slug="draft-opportunity",
            status=Opportunity.Status.DRAFT,
        )

        response = self.client.get("/api/opportunities/")

        self.assertNotIn(draft.slug, [item["slug"] for item in self.results(response)])

    def test_public_can_view_published_opportunity_detail(self):
        opportunity = self.opportunity(stipend_summary="Official monthly allowance listed")

        response = self.client.get(f"/api/opportunities/{opportunity.slug}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["slug"], opportunity.slug)
        self.assertEqual(response.data["stipend_summary"], "Official monthly allowance listed")

    def test_public_cannot_view_draft_detail(self):
        opportunity = self.opportunity(status=Opportunity.Status.DRAFT)

        response = self.client.get(f"/api/opportunities/{opportunity.slug}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_opportunity_pathway_model_tracks_parent_path(self):
        parent = OpportunityPathway.objects.create(
            title="China Scholarships",
            slug="china-scholarships",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            display_order=10,
        )
        child = OpportunityPathway.objects.create(
            title="Chinese Government Scholarship / CSC",
            slug="chinese-government-scholarship-csc",
            country_ref=self.china,
            parent=parent,
            pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
            display_order=20,
        )

        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())
        self.assertEqual(
            child.full_path,
            "China Scholarships > Chinese Government Scholarship / CSC",
        )

    def test_opportunity_pathway_rejects_self_parent(self):
        pathway = OpportunityPathway.objects.create(
            title="China Scholarships",
            slug="china-scholarships-self-parent",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        pathway.parent = pathway

        with self.assertRaises(ValidationError):
            pathway.full_clean()

    def test_opportunity_pathway_rejects_circular_parent_chain(self):
        parent = OpportunityPathway.objects.create(
            title="Circular Parent",
            slug="circular-parent",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        child = OpportunityPathway.objects.create(
            title="Circular Child",
            slug="circular-child",
            country_ref=self.china,
            parent=parent,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )

        parent.parent = child

        with self.assertRaises(ValidationError):
            parent.full_clean()

    def test_opportunity_can_link_to_pathway(self):
        pathway = OpportunityPathway.objects.create(
            title="CSC University Track",
            slug="csc-university-track-test",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )

        opportunity = self.opportunity(
            slug="zhejiang-csc-test",
            pathway=pathway,
            application_track=Opportunity.ApplicationTrack.UNIVERSITY,
            department_name="Computer Science",
            lab_name="AI Lab",
            professor_name="Professor Example",
            professor_email="professor@example.com",
        )

        self.assertEqual(opportunity.pathway, pathway)
        self.assertEqual(opportunity.application_track, "university")
        self.assertEqual(opportunity.department_name, "Computer Science")
        self.assertEqual(opportunity.lab_name, "AI Lab")
        self.assertEqual(opportunity.professor_name, "Professor Example")
        self.assertEqual(opportunity.professor_email, "professor@example.com")

    def test_public_api_includes_pathway_details(self):
        parent = OpportunityPathway.objects.create(
            title="China Scholarships",
            slug="china-scholarships-api",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            display_order=10,
        )
        pathway = OpportunityPathway.objects.create(
            title="CSC University Track",
            slug="csc-university-track-api",
            country_ref=self.china,
            parent=parent,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
            display_order=20,
        )
        opportunity = self.opportunity(
            slug="pathway-api-opportunity",
            pathway=pathway,
            application_track=Opportunity.ApplicationTrack.UNIVERSITY,
            department_name="Computer Science",
            lab_name="AI Lab",
            professor_name="Professor Example",
            professor_email="private-professor@example.com",
        )

        list_response = self.client.get("/api/opportunities/")
        detail_response = self.client.get(f"/api/opportunities/{opportunity.slug}/")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        list_item = [
            item for item in self.results(list_response) if item["slug"] == opportunity.slug
        ][0]
        self.assertEqual(list_item["pathway_detail"]["title"], "CSC University Track")
        self.assertEqual(list_item["pathway_detail"]["slug"], "csc-university-track-api")
        self.assertEqual(
            list_item["pathway_detail"]["full_path"],
            "China Scholarships > CSC University Track",
        )
        self.assertEqual(list_item["application_track"], "university")
        self.assertEqual(list_item["department_name"], "Computer Science")
        self.assertEqual(list_item["lab_name"], "AI Lab")
        self.assertEqual(list_item["professor_name"], "Professor Example")
        self.assertNotIn("professor_email", list_item)

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            detail_response.data["pathway_detail"]["title"],
            "CSC University Track",
        )
        self.assertEqual(detail_response.data["application_track"], "university")
        self.assertEqual(detail_response.data["department_name"], "Computer Science")
        self.assertEqual(detail_response.data["lab_name"], "AI Lab")
        self.assertEqual(detail_response.data["professor_name"], "Professor Example")
        self.assertNotIn("professor_email", detail_response.data)

    def test_public_pathway_list_returns_active_pathways_only(self):
        active = OpportunityPathway.objects.create(
            title="Active China Pathway",
            slug="active-china-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        inactive = OpportunityPathway.objects.create(
            title="Inactive China Pathway",
            slug="inactive-china-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            is_active=False,
        )

        response = self.client.get("/api/opportunity-pathways/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(active.slug, slugs)
        self.assertNotIn(inactive.slug, slugs)

        item = [item for item in self.results(response) if item["slug"] == active.slug][0]
        self.assertEqual(item["children_count"], 0)
        self.assertEqual(item["published_opportunity_count"], 0)
        self.assertTrue(item["is_active"])

    def test_public_pathway_count_includes_descendant_opportunities(self):
        root = OpportunityPathway.objects.create(
            title="Count Root Pathway",
            slug="count-root-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        child = OpportunityPathway.objects.create(
            title="Count Child Pathway",
            slug="count-child-pathway",
            country_ref=self.china,
            parent=root,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        self.opportunity(slug="count-child-scholarship", pathway=child)

        response = self.client.get("/api/opportunity-pathways/?root_only=true")

        item = [item for item in self.results(response) if item["slug"] == root.slug][0]
        self.assertEqual(item["published_opportunity_count"], 1)

    def test_public_pathway_list_filters(self):
        root = OpportunityPathway.objects.create(
            title="China Pathway Filter Root",
            slug="china-pathway-filter-root",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            display_order=10,
        )
        child = OpportunityPathway.objects.create(
            title="CSC Pathway Filter Child",
            slug="csc-pathway-filter-child",
            country_ref=self.china,
            parent=root,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
            display_order=20,
        )
        italy = OpportunityPathway.objects.create(
            title="Italy Pathway Filter Root",
            slug="italy-pathway-filter-root",
            country_ref=self.italy,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            display_order=30,
        )

        root_response = self.client.get("/api/opportunity-pathways/?root_only=true")
        parent_response = self.client.get(f"/api/opportunity-pathways/?parent={root.slug}")
        country_response = self.client.get("/api/opportunity-pathways/?country=china")
        type_response = self.client.get("/api/opportunity-pathways/?pathway_type=application_track")

        root_slugs = [item["slug"] for item in self.results(root_response)]
        self.assertIn(root.slug, root_slugs)
        self.assertIn(italy.slug, root_slugs)
        self.assertNotIn(child.slug, root_slugs)

        self.assertEqual(
            [item["slug"] for item in self.results(parent_response)],
            [child.slug],
        )

        country_slugs = [item["slug"] for item in self.results(country_response)]
        self.assertIn(root.slug, country_slugs)
        self.assertIn(child.slug, country_slugs)
        self.assertNotIn(italy.slug, country_slugs)

        type_slugs = [item["slug"] for item in self.results(type_response)]
        self.assertIn(child.slug, type_slugs)
        self.assertNotIn(root.slug, type_slugs)

    def test_public_pathway_detail_only_returns_active_pathways(self):
        active = OpportunityPathway.objects.create(
            title="Active Detail Pathway",
            slug="active-detail-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        inactive = OpportunityPathway.objects.create(
            title="Inactive Detail Pathway",
            slug="inactive-detail-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
            is_active=False,
        )
        self.opportunity(slug="active-detail-opportunity", pathway=active)
        self.opportunity(
            slug="active-detail-draft-opportunity",
            pathway=active,
            status=Opportunity.Status.DRAFT,
        )

        active_response = self.client.get(f"/api/opportunity-pathways/{active.slug}/")
        inactive_response = self.client.get(f"/api/opportunity-pathways/{inactive.slug}/")

        self.assertEqual(active_response.status_code, status.HTTP_200_OK)
        self.assertEqual(active_response.data["slug"], active.slug)
        self.assertEqual(active_response.data["published_opportunity_count"], 1)
        self.assertEqual(inactive_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_scholarship_pathway_filter_includes_descendants_and_hides_drafts(self):
        root = OpportunityPathway.objects.create(
            title="China Scholarships Filter",
            slug="china-scholarships-filter",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        csc = OpportunityPathway.objects.create(
            title="CSC Filter",
            slug="csc-filter",
            country_ref=self.china,
            parent=root,
            pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
        )
        university_track = OpportunityPathway.objects.create(
            title="CSC University Track Filter",
            slug="csc-university-track-filter",
            country_ref=self.china,
            parent=csc,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        italy = OpportunityPathway.objects.create(
            title="Italy Scholarships Filter",
            slug="italy-scholarships-filter",
            country_ref=self.italy,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        published = self.opportunity(
            slug="descendant-pathway-scholarship",
            pathway=university_track,
            application_track=Opportunity.ApplicationTrack.UNIVERSITY,
        )
        draft = self.opportunity(
            slug="draft-descendant-pathway-scholarship",
            pathway=university_track,
            status=Opportunity.Status.DRAFT,
        )
        outside = self.opportunity(slug="outside-pathway-scholarship", pathway=italy)

        response = self.client.get(f"/api/scholarships/?pathway={csc.slug}")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(published.slug, slugs)
        self.assertNotIn(draft.slug, slugs)
        self.assertNotIn(outside.slug, slugs)

    def test_scholarship_pathway_filter_can_match_exact_pathway(self):
        csc = OpportunityPathway.objects.create(
            title="CSC Exact Filter",
            slug="csc-exact-filter",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.GOVERNMENT_PROGRAM,
        )
        university_track = OpportunityPathway.objects.create(
            title="CSC Exact University Track",
            slug="csc-exact-university-track",
            country_ref=self.china,
            parent=csc,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        direct = self.opportunity(slug="exact-pathway-scholarship", pathway=csc)
        descendant = self.opportunity(
            slug="exact-descendant-pathway-scholarship",
            pathway=university_track,
        )

        response = self.client.get(f"/api/scholarships/?pathway={csc.slug}&exact_pathway=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(direct.slug, slugs)
        self.assertNotIn(descendant.slug, slugs)

    def test_scholarship_application_track_filter(self):
        university = self.opportunity(
            slug="university-track-scholarship",
            application_track=Opportunity.ApplicationTrack.UNIVERSITY,
        )
        embassy = self.opportunity(
            slug="embassy-track-scholarship",
            application_track=Opportunity.ApplicationTrack.EMBASSY,
        )

        response = self.client.get("/api/scholarships/?application_track=university")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(university.slug, slugs)
        self.assertNotIn(embassy.slug, slugs)

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

    def test_scholarships_default_excludes_expired(self):
        future = self.opportunity(
            title="Future Public Scholarship",
            slug="future-public-scholarship",
        )
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-public-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )
        rolling = self.opportunity(
            title="Rolling Public Scholarship",
            slug="rolling-public-scholarship",
            deadline=None,
            is_rolling_deadline=True,
        )
        self.opportunity(
            title="Draft Expired Scholarship",
            slug="draft-expired-scholarship",
            status=Opportunity.Status.DRAFT,
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(future.slug, slugs)
        self.assertIn(rolling.slug, slugs)
        self.assertNotIn(expired.slug, slugs)
        self.assertNotIn("draft-expired-scholarship", slugs)

    def test_scholarships_include_expired_param_includes_expired(self):
        future = self.opportunity(
            title="Future Public Scholarship",
            slug="future-include-public-scholarship",
        )
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-include-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )
        rolling = self.opportunity(
            title="Rolling Public Scholarship",
            slug="rolling-include-public-scholarship",
            deadline=None,
            is_rolling_deadline=True,
        )
        self.opportunity(
            title="Draft Expired Scholarship",
            slug="draft-include-expired-scholarship",
            status=Opportunity.Status.DRAFT,
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/?include_expired=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(future.slug, slugs)
        self.assertIn(rolling.slug, slugs)
        self.assertIn(expired.slug, slugs)
        self.assertNotIn("draft-include-expired-scholarship", slugs)

    def test_scholarships_expired_param_returns_only_expired(self):
        future = self.opportunity(
            title="Future Public Scholarship",
            slug="future-not-expired-scholarship",
        )
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-only-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )
        rolling = self.opportunity(
            title="Rolling Public Scholarship",
            slug="rolling-not-expired-scholarship",
            deadline=None,
            is_rolling_deadline=True,
        )
        self.opportunity(
            title="Draft Expired Scholarship",
            slug="draft-expired-only-scholarship",
            status=Opportunity.Status.DRAFT,
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/?expired=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(expired.slug, slugs)
        self.assertNotIn(future.slug, slugs)
        self.assertNotIn(rolling.slug, slugs)
        self.assertNotIn("draft-expired-only-scholarship", slugs)

    def test_scholarships_search_includes_expired(self):
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-search-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/?search=Expired Public")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(expired.slug, slugs)

    def test_scholarships_q_search_includes_expired(self):
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-q-search-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/?q=Expired Public")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(expired.slug, slugs)

    def test_scholarships_empty_search_excludes_expired(self):
        expired = self.opportunity(
            title="Expired Public Scholarship",
            slug="expired-empty-search-scholarship",
            deadline=timezone.localdate() - timedelta(days=1),
            is_rolling_deadline=False,
        )

        response = self.client.get("/api/scholarships/?search=")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertNotIn(expired.slug, slugs)

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

    def test_admin_can_assign_update_and_clear_pathway_id(self):
        pathway = OpportunityPathway.objects.create(
            title="Admin Assign Pathway",
            slug="admin-assign-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        self.client.force_authenticate(self.admin)

        create_response = self.client.post(
            "/api/admin/opportunities/",
            {
                **self.admin_payload(),
                "slug": "admin-pathway-assignment",
                "pathway_id": pathway.id,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        opportunity = Opportunity.objects.get(slug="admin-pathway-assignment")
        self.assertEqual(opportunity.pathway, pathway)

        detail_response = self.client.get(f"/api/admin/opportunities/{opportunity.id}/")
        self.assertEqual(detail_response.data["pathway_detail"]["slug"], pathway.slug)

        clear_response = self.client.patch(
            f"/api/admin/opportunities/{opportunity.id}/",
            {"pathway_id": None},
            format="json",
        )

        self.assertEqual(clear_response.status_code, status.HTTP_200_OK)
        opportunity.refresh_from_db()
        self.assertIsNone(opportunity.pathway)

    def test_admin_rejects_inactive_pathway_assignment(self):
        pathway = OpportunityPathway.objects.create(
            title="Inactive Admin Assign Pathway",
            slug="inactive-admin-assign-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
            is_active=False,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/",
            {
                **self.admin_payload(),
                "slug": "inactive-admin-pathway-assignment",
                "pathway_id": pathway.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pathway_id", response.data)

    def test_duplicate_detector_detects_duplicate_by_slug(self):
        existing = self.opportunity(slug="duplicate-slug-check")

        matches = find_duplicate_opportunities(
            {
                "title": "Different title",
                "slug": "duplicate-slug-check",
            }
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertEqual(matches[0]["confidence"], "exact")
        self.assertIn("Same slug", matches[0]["reasons"])

    def test_duplicate_detector_detects_duplicate_by_official_link(self):
        existing = self.opportunity(
            slug="official-link-duplicate",
            official_link="https://example.edu/scholarship",
        )

        matches = find_duplicate_opportunities(
            {"title": "New title", "official_link": "https://example.edu/scholarship/"}
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertEqual(matches[0]["confidence"], "exact")
        self.assertIn("Same official link", matches[0]["reasons"])

    def test_duplicate_detector_detects_duplicate_by_source_url(self):
        existing = self.opportunity(
            slug="source-url-duplicate",
            source_url="https://example.edu/source",
        )

        matches = find_duplicate_opportunities(
            {"title": "New title", "source_url": "https://example.edu/source/"}
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertEqual(matches[0]["confidence"], "exact")
        self.assertIn("Same source URL", matches[0]["reasons"])

    def test_duplicate_detector_cross_matches_official_link_to_source_url(self):
        existing = self.opportunity(
            slug="cross-url-duplicate",
            source_url="https://example.edu/cross-source",
        )

        matches = find_duplicate_opportunities(
            {"title": "New title", "official_link": "https://example.edu/cross-source/"}
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertEqual(matches[0]["confidence"], "exact")
        self.assertIn("Same official link", matches[0]["reasons"])

    def test_duplicate_detector_ignores_tracking_params_in_urls(self):
        existing = self.opportunity(
            slug="tracked-url-duplicate",
            official_link="https://example.edu/apply?utm_source=newsletter&ref=admin",
        )

        matches = find_duplicate_opportunities(
            {
                "title": "New title",
                "source_url": "https://example.edu/apply/?ref=admin&utm_medium=email",
            }
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertEqual(matches[0]["confidence"], "exact")

    def test_duplicate_detector_detects_similar_title_context(self):
        deadline = timezone.localdate() + timedelta(days=45)
        existing = self.opportunity(
            title="University of Turin PhD Programmes 42nd Cycle 2026",
            slug="turin-phd-programmes-42-cycle",
            provider_name="University of Turin",
            country_ref=self.italy,
            deadline=deadline,
        )

        matches = find_duplicate_opportunities(
            {
                "title": "University of Turin PhD Programme 42 Cycle 2026",
                "provider_name": "University of Turin",
                "country": "Italy",
                "deadline": deadline.isoformat(),
            }
        )

        self.assertEqual(matches[0]["id"], existing.id)
        self.assertIn(matches[0]["confidence"], {"high", "medium"})
        self.assertIn("Similar title with matching context", matches[0]["reasons"])

    def test_duplicate_detector_does_not_flag_unrelated_scholarships(self):
        self.opportunity(
            title="China CSC Scholarship",
            slug="china-csc-unrelated-duplicate-check",
            provider_name="CSC",
            country_ref=self.china,
            deadline=timezone.localdate() + timedelta(days=20),
        )

        matches = find_duplicate_opportunities(
            {
                "title": "DAAD Research Grant Germany",
                "provider_name": "DAAD",
                "country": "Germany",
                "deadline": (timezone.localdate() + timedelta(days=80)).isoformat(),
            }
        )

        self.assertEqual(matches, [])

    def test_duplicate_detector_respects_exclude_id(self):
        existing = self.opportunity(
            slug="exclude-duplicate-check",
            official_link="https://example.edu/exclude",
        )

        matches = find_duplicate_opportunities(
            {
                "title": existing.title,
                "slug": existing.slug,
                "official_link": existing.official_link,
                "exclude_id": existing.id,
            }
        )

        self.assertEqual(matches, [])

    def test_admin_duplicate_check_endpoint(self):
        existing = self.opportunity(
            slug="endpoint-duplicate-check",
            source_url="https://example.edu/endpoint",
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/opportunities/check-duplicates/",
            {"source_url": "https://example.edu/endpoint/"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["matches"][0]["id"], existing.id)
        self.assertEqual(response.data["matches"][0]["confidence"], "exact")

    def test_admin_pathway_crud_and_soft_delete(self):
        parent = OpportunityPathway.objects.create(
            title="Admin Pathway Parent",
            slug="admin-pathway-parent",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        self.client.force_authenticate(self.admin)

        create_response = self.client.post(
            "/api/admin/opportunity-pathways/",
            {
                "title": "Admin Pathway Child",
                "slug": "admin-pathway-child",
                "country_id": self.china.id,
                "parent_id": parent.id,
                "pathway_type": OpportunityPathway.PathwayType.APPLICATION_TRACK,
                "description": "Admin managed child pathway.",
                "display_order": 25,
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        pathway_id = create_response.data["id"]
        self.assertEqual(create_response.data["parent_id"], parent.id)
        self.assertEqual(create_response.data["parent_slug"], parent.slug)

        update_response = self.client.patch(
            f"/api/admin/opportunity-pathways/{pathway_id}/",
            {"title": "Admin Pathway Child Updated"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["title"], "Admin Pathway Child Updated")

        delete_response = self.client.delete(f"/api/admin/opportunity-pathways/{pathway_id}/")

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OpportunityPathway.objects.get(pk=pathway_id).is_active)

    def test_admin_pathway_api_rejects_circular_parent(self):
        parent = OpportunityPathway.objects.create(
            title="Admin Circular Parent",
            slug="admin-circular-parent",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.COUNTRY_HUB,
        )
        child = OpportunityPathway.objects.create(
            title="Admin Circular Child",
            slug="admin-circular-child",
            country_ref=self.china,
            parent=parent,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/opportunity-pathways/{parent.id}/",
            {"parent_id": child.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent_id", response.data)

    def test_admin_can_filter_missing_pathway(self):
        pathway = OpportunityPathway.objects.create(
            title="Manager Filter Pathway",
            slug="manager-filter-pathway",
            country_ref=self.china,
            pathway_type=OpportunityPathway.PathwayType.APPLICATION_TRACK,
        )
        missing = self.opportunity(slug="missing-pathway-admin-filter", pathway=None)
        assigned = self.opportunity(slug="assigned-pathway-admin-filter", pathway=pathway)
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/admin/opportunities/?missing_pathway=true")

        slugs = [item["slug"] for item in self.results(response)]
        self.assertIn(missing.slug, slugs)
        self.assertNotIn(assigned.slug, slugs)

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

    def test_opportunity_admin_content_quality_display_helper(self):
        opportunity_admin = OpportunityAdmin(Opportunity, AdminSite())
        sample = self.opportunity(
            slug="sample-content-quality",
            short_description="Development sample opportunity.",
            description="Current verified scholarship details.",
            eligibility="Open to eligible students.",
            benefits="Tuition support.",
            how_to_apply="Apply through the official portal.",
            official_link="https://example.com/apply",
            source_url="https://example.com/source",
            source_name="Official source",
        )
        verified = self.opportunity(
            slug="verified-content-quality",
            verified_status=True,
            description="Current verified scholarship details.",
            eligibility="Open to eligible students.",
            benefits="Tuition support.",
            how_to_apply="Apply through the official portal.",
            official_link="https://example.com/apply",
            source_url="https://example.com/source",
            source_name="Official source",
        )
        missing_link = self.opportunity(slug="missing-link-content-quality")

        self.assertEqual(opportunity_admin.display_content_quality(sample), "Sample text")
        self.assertEqual(opportunity_admin.display_content_quality(verified), "Verified")
        self.assertEqual(
            opportunity_admin.display_content_quality(missing_link),
            "Needs official link",
        )

    def test_audit_opportunity_content_handles_empty_database(self):
        output = StringIO()

        call_command("audit_opportunity_content", stdout=output)

        text = output.getvalue()
        self.assertIn("Total opportunities: 0", text)
        self.assertIn("Published opportunities: 0", text)
        self.assertIn("Dry audit only. No changes made.", text)

    def test_audit_opportunity_content_reports_weak_sample_content(self):
        self.opportunity(
            slug="weak-sample-content",
            short_description="Development sample opportunity.",
            description="Placeholder sample data for internal review.",
            stipend_summary="TBD sample stipend",
            eligibility="Open to eligible students.",
            benefits="Tuition support.",
            how_to_apply="Apply through the official portal.",
            official_link="https://example.com/apply",
            source_url="https://example.com/source",
            source_name="Official source",
        )
        output = StringIO()

        call_command("audit_opportunity_content", stdout=output)

        text = output.getvalue()
        self.assertIn("Weak/sample short_description: 1", text)
        self.assertIn("Weak/sample description: 1", text)
        self.assertIn("Weak/sample stipend_summary: 1", text)
        self.assertIn("weak/sample short_description", text)
        self.assertIn("weak/sample stipend_summary", text)
        self.assertIn("weak-sample-content", text)

    def test_audit_opportunity_content_reports_missing_trust_fields(self):
        self.opportunity(
            slug="missing-trust-fields",
            short_description="Current scholarship summary.",
            description="Current scholarship details.",
            eligibility="",
            benefits="",
            how_to_apply="",
            official_link="",
            source_url="",
            source_name="",
            deadline=None,
            is_rolling_deadline=False,
        )
        output = StringIO()

        call_command("audit_opportunity_content", stdout=output)

        text = output.getvalue()
        self.assertIn("Missing official_link: 1", text)
        self.assertIn("Missing source_url: 1", text)
        self.assertIn("Missing source_name: 1", text)
        self.assertIn("Missing eligibility: 1", text)
        self.assertIn("Missing benefits: 1", text)
        self.assertIn("Missing how_to_apply: 1", text)
        self.assertIn("Missing deadline while is_rolling_deadline is false: 1", text)
        self.assertIn("missing official_link", text)
        self.assertIn("missing-trust-fields", text)

    def test_seed_opportunity_pathways_is_idempotent(self):
        output = StringIO()

        call_command("seed_opportunity_pathways", stdout=output)
        first_count = OpportunityPathway.objects.count()
        call_command("seed_opportunity_pathways", stdout=StringIO())

        csc_track = OpportunityPathway.objects.get(slug="csc-university-track")
        gks = OpportunityPathway.objects.get(slug="global-korea-scholarship-gks")
        lab_group = OpportunityPathway.objects.get(slug="korean-professor-lab-scholarships")

        self.assertEqual(OpportunityPathway.objects.count(), first_count)
        self.assertEqual(csc_track.parent.slug, "chinese-government-scholarship-csc")
        self.assertEqual(gks.parent.slug, "south-korea-scholarships")
        self.assertEqual(lab_group.parent.slug, "south-korea-scholarships")
        self.assertEqual(Opportunity.objects.count(), 0)
        self.assertIn("Opportunity pathways seeded.", output.getvalue())

    def test_opportunity_draft_import_creates_draft_opportunity(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import",
            slug="draft-import",
            raw_payload=self.draft_payload(),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.status, Opportunity.Status.DRAFT)
        self.assertFalse(opportunity.verified_status)
        self.assertEqual(opportunity.country_ref.name, "China")
        self.assertEqual(opportunity.pathway.title, "CSC University Track")
        self.assertEqual(opportunity.application_track, Opportunity.ApplicationTrack.UNIVERSITY)
        self.assertEqual(opportunity.university_name, "Example University")
        self.assertTrue(opportunity.all_study_fields)
        self.assertEqual(list(opportunity.study_field_refs.all()), [])
        self.assertEqual(
            list(opportunity.eligible_country_refs.values_list("name", flat=True)),
            ["Pakistan"],
        )

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.IMPORTED)
        self.assertEqual(draft.created_opportunity, opportunity)
        self.assertEqual(draft.validation_errors, [])
        self.assertIsNotNone(draft.imported_at)

    def test_opportunity_draft_import_creates_unknown_host_country_when_enabled(self):
        payload = self.draft_payload(
            slug="draft-import-new-country-opportunity",
            country="Netherlands Testland",
            country_region="Europe",
        )
        payload["create_missing_references"] = True

        cleaned, warnings, errors = validate_opportunity_draft_payload(payload)

        self.assertEqual(errors, [])
        self.assertIn("New country will be created: Netherlands Testland.", warnings)
        self.assertIsNone(cleaned["country_ref"])

        draft = OpportunityDraft.objects.create(
            title="Draft Import New Country",
            slug="draft-import-new-country",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        country = Country.objects.get(name="Netherlands Testland")
        self.assertEqual(country.region.name, "Europe")
        self.assertEqual(opportunity.country_ref, country)
        draft.refresh_from_db()
        self.assertIn("New country created: Netherlands Testland.", draft.validation_warnings)

    def test_opportunity_draft_import_rejects_unknown_host_country_when_disabled(self):
        payload = self.draft_payload(
            slug="draft-import-disabled-new-country-opportunity",
            country="Netherlands Testland Disabled",
        )
        payload["create_missing_references"] = False

        cleaned, warnings, errors = validate_opportunity_draft_payload(payload)

        self.assertIsNone(cleaned["country_ref"])
        self.assertIn('Unknown country "Netherlands Testland Disabled".', errors)

    def test_opportunity_draft_import_creates_unknown_eligible_country_when_enabled(self):
        payload = self.draft_payload(
            slug="draft-import-new-eligible-country-opportunity",
            eligible_countries=["Pakistan", "Bangladesh Testland"],
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import New Eligible Country",
            slug="draft-import-new-eligible-country",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertTrue(Country.objects.filter(name="Bangladesh Testland").exists())
        self.assertIn(
            "Bangladesh Testland",
            list(opportunity.eligible_country_refs.values_list("name", flat=True)),
        )
        draft.refresh_from_db()
        self.assertIn(
            "New eligible country created: Bangladesh Testland.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_creates_unknown_study_field_when_enabled(self):
        payload = self.draft_payload(
            slug="draft-import-new-study-field-opportunity",
            fields_of_study=["Quantum Materials Test"],
            all_study_fields=False,
            study_field_categories={"Quantum Materials Test": "Natural Sciences Test"},
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import New Study Field",
            slug="draft-import-new-study-field",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        field = StudyField.objects.get(name="Quantum Materials Test")
        self.assertEqual(field.category.name, "Natural Sciences Test")
        self.assertIn(field, opportunity.study_field_refs.all())
        draft.refresh_from_db()
        self.assertIn("New study field created: Quantum Materials Test.", draft.validation_warnings)

    def test_opportunity_draft_import_all_study_fields_does_not_create_all_fields(self):
        payload = self.draft_payload(
            slug="draft-import-all-fields-no-create-opportunity",
            fields_of_study=["All Fields"],
            all_study_fields=True,
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import All Fields No Create",
            slug="draft-import-all-fields-no-create",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertTrue(opportunity.all_study_fields)
        self.assertFalse(StudyField.objects.filter(name__iexact="All Fields").exists())

    def test_opportunity_draft_import_creates_unknown_pathway_when_enabled(self):
        payload = self.draft_payload(
            slug="draft-import-new-pathway-opportunity",
            country="Netherlands Pathwayland",
            country_region="Europe",
            pathway="netherlands-test-university-scholarships",
            pathway_title="Netherlands Test University Scholarships",
            pathway_parent="Netherlands Test Scholarships",
            pathway_country="Netherlands Pathwayland",
            pathway_type="university_scholarship",
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import New Pathway",
            slug="draft-import-new-pathway",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.pathway.title, "Netherlands Test University Scholarships")
        self.assertEqual(opportunity.pathway.parent.title, "Netherlands Test Scholarships")
        self.assertEqual(
            opportunity.pathway.pathway_type,
            OpportunityPathway.PathwayType.UNIVERSITY_SCHOLARSHIP,
        )
        draft.refresh_from_db()
        self.assertIn(
            "New pathway created: Netherlands Test Scholarships > Netherlands Test University Scholarships.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_warns_when_pathway_metadata_is_insufficient(self):
        payload = self.draft_payload(
            slug="draft-import-insufficient-pathway-opportunity",
            pathway="This is a long sentence that should not become a pathway automatically.",
            pathway_title="",
            pathway_parent="",
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import Insufficient Pathway",
            slug="draft-import-insufficient-pathway",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertIsNone(opportunity.pathway)
        self.assertFalse(
            OpportunityPathway.objects.filter(
                title__icontains="long sentence that should not become"
            ).exists()
        )
        draft.refresh_from_db()
        self.assertIn(
            "Unknown pathway could not be created automatically. Please select or create manually.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_reuses_existing_reference_slugs(self):
        existing_country = Country.objects.create(
            name="Reuse Testland",
            slug="reuse-testland",
            region=self.europe,
        )
        category = StudyFieldCategory.objects.create(name="Reuse Category", slug="reuse-category")
        existing_field = StudyField.objects.create(
            name="Reuse Field",
            slug="reuse-field",
            category=category,
        )
        existing_pathway = OpportunityPathway.objects.create(
            title="Reuse Pathway",
            slug="reuse-pathway",
            country_ref=existing_country,
            pathway_type=OpportunityPathway.PathwayType.OTHER,
        )
        payload = self.draft_payload(
            slug="draft-import-reuse-references-opportunity",
            country="Reuse Testland",
            eligible_countries=["Reuse Testland"],
            fields_of_study=["Reuse Field"],
            all_study_fields=False,
            pathway="reuse-pathway",
        )
        payload["create_missing_references"] = True
        draft = OpportunityDraft.objects.create(
            title="Draft Import Reuse References",
            slug="draft-import-reuse-references",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(Country.objects.filter(slug="reuse-testland").count(), 1)
        self.assertEqual(StudyField.objects.filter(slug="reuse-field").count(), 1)
        self.assertEqual(OpportunityPathway.objects.filter(slug="reuse-pathway").count(), 1)
        self.assertEqual(opportunity.country_ref, existing_country)
        self.assertIn(existing_field, opportunity.study_field_refs.all())
        self.assertEqual(opportunity.pathway, existing_pathway)

    def test_opportunity_draft_import_preserves_stipend_summary(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Stipend Summary",
            slug="draft-import-stipend-summary",
            raw_payload=self.draft_payload(
                slug="draft-import-stipend-summary-opportunity",
                stipend_summary="Full tuition plus 3,500 RMB monthly stipend.",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(
            opportunity.stipend_summary,
            "Full tuition plus 3,500 RMB monthly stipend.",
        )

    def test_opportunity_draft_import_preserves_funding_amount_and_currency(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Funding Amount",
            slug="draft-import-funding-amount",
            raw_payload=self.draft_payload(
                slug="draft-import-funding-amount-opportunity",
                funding_amount="3500.5",
                funding_currency="rmb",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.funding_amount, Decimal("3500.50"))
        self.assertEqual(opportunity.funding_currency, "RMB")

    def test_opportunity_draft_import_missing_stipend_does_not_block_import(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Missing Stipend",
            slug="draft-import-missing-stipend",
            raw_payload=self.draft_payload(
                slug="draft-import-missing-stipend-opportunity",
                stipend_summary="",
                funding_amount=None,
                funding_currency="",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.stipend_summary, "")
        self.assertIsNone(opportunity.funding_amount)
        self.assertEqual(opportunity.funding_currency, "")

    def test_opportunity_draft_import_invalid_funding_amount_warns_and_skips(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Invalid Funding Amount",
            slug="draft-import-invalid-funding-amount",
            raw_payload=self.draft_payload(
                slug="draft-import-invalid-funding-amount-opportunity",
                funding_amount="-100",
                funding_currency="usd",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertIsNone(opportunity.funding_amount)
        self.assertEqual(opportunity.funding_currency, "USD")

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.IMPORTED)
        self.assertIn(
            "Invalid funding_amount cannot be negative; skipped.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_validation_warns_when_stipend_summary_contains_amount(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Stipend Summary Amount",
            slug="draft-import-stipend-summary-amount",
            raw_payload=self.draft_payload(
                slug="draft-import-stipend-summary-amount-opportunity",
                stipend_summary="Full tuition plus EUR 1200 monthly stipend.",
                funding_amount=None,
                funding_currency="",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        draft.refresh_from_db()
        self.assertIn(
            "Stipend amount appears to be in stipend_summary. Move the numeric amount to funding_amount and currency to funding_currency.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_validation_warns_when_amount_or_currency_missing(self):
        amount_only = OpportunityDraft.objects.create(
            title="Draft Import Amount Only",
            slug="draft-import-amount-only",
            raw_payload=self.draft_payload(
                slug="draft-import-amount-only-opportunity",
                funding_amount="1200",
                funding_currency="",
            ),
            created_by=self.admin,
        )
        currency_only = OpportunityDraft.objects.create(
            title="Draft Import Currency Only",
            slug="draft-import-currency-only",
            raw_payload=self.draft_payload(
                slug="draft-import-currency-only-opportunity",
                funding_amount=None,
                funding_currency="EUR",
            ),
            created_by=self.admin,
        )

        import_opportunity_draft(amount_only, user=self.admin)
        import_opportunity_draft(currency_only, user=self.admin)

        amount_only.refresh_from_db()
        currency_only.refresh_from_db()
        self.assertIn(
            "Funding amount is provided but funding_currency is missing.",
            amount_only.validation_warnings,
        )
        self.assertIn(
            "Funding currency is provided but funding_amount is missing.",
            currency_only.validation_warnings,
        )

    def test_opportunity_draft_validation_warns_when_stipend_summary_is_long(self):
        draft = OpportunityDraft.objects.create(
            title="Draft Import Long Stipend Summary",
            slug="draft-import-long-stipend-summary",
            raw_payload=self.draft_payload(
                slug="draft-import-long-stipend-summary-opportunity",
                stipend_summary=(
                    "This scholarship includes tuition support, living allowance, travel support, "
                    "insurance, research funds, settlement support, and other benefits."
                ),
            ),
            created_by=self.admin,
        )

        import_opportunity_draft(draft, user=self.admin)

        draft.refresh_from_db()
        self.assertIn(
            "stipend_summary should be a short note only. Put full funding explanation in benefits.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_resolves_pathway_id_first(self):
        pathway = self.pathway()
        draft = OpportunityDraft.objects.create(
            title="Draft Import Pathway Id",
            slug="draft-import-pathway-id",
            raw_payload=self.draft_payload(
                slug="draft-import-pathway-id-opportunity",
                pathway_id=pathway.id,
                pathway="unknown-pathway-slug",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.pathway, pathway)

    def test_opportunity_draft_import_warns_for_unknown_pathway_without_failing(self):
        payload = self.draft_payload(
            slug="draft-import-unknown-pathway-opportunity",
            pathway="unknown-pathway-slug",
        )
        payload["create_missing_references"] = False
        draft = OpportunityDraft.objects.create(
            title="Draft Import Unknown Pathway",
            slug="draft-import-unknown-pathway",
            raw_payload=payload,
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertIsNone(opportunity.pathway)

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.IMPORTED)
        self.assertIn(
            "Unknown pathway: unknown-pathway-slug. Please select manually before publishing.",
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_blocks_exact_duplicate_source(self):
        existing = self.opportunity(
            title="Existing Source Duplicate",
            slug="existing-source-duplicate",
            source_url="https://example.edu/existing-source",
        )
        draft = OpportunityDraft.objects.create(
            title="Draft Import Duplicate Source",
            slug="draft-import-duplicate-source",
            raw_payload=self.draft_payload(
                slug="draft-import-duplicate-source-opportunity",
                source_url="https://example.edu/existing-source/",
                official_link="https://example.edu/existing-source/",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNone(opportunity)
        self.assertTrue(Opportunity.objects.filter(pk=existing.pk).exists())

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.ERROR)
        self.assertTrue(
            any("Exact duplicate found" in error for error in draft.validation_errors)
        )

    def test_opportunity_draft_validation_surfaces_possible_duplicate_warning(self):
        self.opportunity(
            title="Existing Similar Draft Warning",
            slug="existing-similar-draft-warning",
            provider_name="Example University",
            country_ref=self.china,
            deadline=date(2026, 3, 15),
        )
        draft = OpportunityDraft.objects.create(
            title="Draft Similar Warning",
            slug="draft-similar-warning",
            raw_payload=self.draft_payload(
                slug="draft-similar-warning-opportunity",
                title="Existing Similar Draft Warning 2026",
                provider_name="Example University",
            ),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.IMPORTED)
        self.assertTrue(
            any("Possible duplicate" in warning for warning in draft.validation_warnings)
        )

    def test_opportunity_draft_import_missing_required_fields_sets_error(self):
        draft = OpportunityDraft.objects.create(
            title="Invalid Draft Import",
            slug="invalid-draft-import",
            raw_payload=self.draft_payload(
                title="",
                official_link="",
                source_url="",
                short_description="",
                description="",
            ),
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNone(opportunity)
        self.assertEqual(Opportunity.objects.count(), 0)

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.ERROR)
        self.assertIn(
            "Missing required opportunity field: title.",
            draft.validation_errors,
        )
        self.assertIn(
            "Missing required opportunity field: official_link or source_url.",
            draft.validation_errors,
        )

    def test_opportunity_draft_import_duplicate_slug_does_not_overwrite(self):
        existing = self.opportunity(
            title="Existing Scholarship",
            slug="csc-scholarship-example-university-2026",
            short_description="Original summary.",
        )
        draft = OpportunityDraft.objects.create(
            title="Duplicate Slug Import",
            slug="duplicate-slug-import",
            raw_payload=self.draft_payload(title="Replacement Scholarship"),
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNone(opportunity)
        self.assertEqual(Opportunity.objects.count(), 1)
        existing.refresh_from_db()
        self.assertEqual(existing.title, "Existing Scholarship")
        self.assertEqual(existing.short_description, "Original summary.")

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.ERROR)
        self.assertIn(
            'Opportunity with slug "csc-scholarship-example-university-2026" already exists.',
            draft.validation_errors,
        )

    def test_opportunity_draft_import_update_existing_still_works_with_duplicate_slug(self):
        existing = self.opportunity(
            title="Existing Update Scholarship",
            slug="csc-scholarship-example-university-2026",
            short_description="Original summary.",
        )
        draft = OpportunityDraft.objects.create(
            title="Update Existing Draft",
            slug="update-existing-draft",
            raw_payload=self.draft_payload(title="Updated Existing Scholarship"),
            created_by=self.admin,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin, update_existing=True)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.id, existing.id)
        existing.refresh_from_db()
        self.assertEqual(existing.title, "Updated Existing Scholarship")

    def test_opportunity_draft_import_unknown_application_track_becomes_other(self):
        draft = OpportunityDraft.objects.create(
            title="Unknown Track Import",
            slug="unknown-track-import",
            raw_payload=self.draft_payload(application_track="nomination"),
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNotNone(opportunity)
        self.assertEqual(opportunity.application_track, Opportunity.ApplicationTrack.OTHER)

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.IMPORTED)
        self.assertIn(
            'Unknown application_track "nomination" changed to "other".',
            draft.validation_warnings,
        )

    def test_opportunity_draft_import_unknown_fields_error_when_not_all_fields(self):
        payload = self.draft_payload(
            all_study_fields=False,
            fields_of_study=["Fake Field"],
        )
        payload["create_missing_references"] = False
        draft = OpportunityDraft.objects.create(
            title="Unknown Fields Import",
            slug="unknown-fields-import",
            raw_payload=payload,
        )

        opportunity = import_opportunity_draft(draft, user=self.admin)

        self.assertIsNone(opportunity)
        self.assertEqual(Opportunity.objects.count(), 0)

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.ERROR)
        self.assertIn('Unknown study field "Fake Field" skipped.', draft.validation_warnings)
        self.assertIn(
            "At least one known study field is required when all_study_fields is false.",
            draft.validation_errors,
        )

    def test_opportunity_draft_admin_validate_action_updates_status(self):
        draft = OpportunityDraft.objects.create(
            title="Admin Validate Draft",
            slug="admin-validate-draft",
            raw_payload=self.draft_payload(),
        )
        request = RequestFactory().post("/admin/opportunities/opportunitydraft/")
        request.user = self.admin
        draft_admin = OpportunityDraftAdmin(OpportunityDraft, AdminSite())
        draft_admin.message_user = lambda *args, **kwargs: None

        draft_admin.validate_selected_drafts(
            request,
            OpportunityDraft.objects.filter(pk=draft.pk),
        )

        draft.refresh_from_db()
        self.assertEqual(draft.status, OpportunityDraft.Status.VALIDATED)
        self.assertEqual(draft.validation_errors, [])
        self.assertEqual(draft.confidence, "medium")

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

    def test_unapproved_comments_are_not_publicly_listed(self):
        opportunity = self.opportunity(slug="comments-unapproved-hidden")
        OpportunityComment.objects.create(
            opportunity=opportunity,
            user=self.student,
            body="This pending comment should not be public.",
            is_deleted=True,
        )

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_approved_comments_are_publicly_listed(self):
        opportunity = self.opportunity(slug="comments-approved-visible")
        approved_comment = OpportunityComment.objects.create(
            opportunity=opportunity,
            user=self.student,
            body="This approved comment should be public.",
            is_deleted=False,
        )
        OpportunityComment.objects.create(
            opportunity=opportunity,
            user=self.admin,
            parent=approved_comment,
            body="Approved staff reply.",
            is_deleted=False,
        )
        OpportunityComment.objects.create(
            opportunity=opportunity,
            user=self.student,
            parent=approved_comment,
            body="Pending reply should not be public.",
            is_deleted=True,
        )

        response = self.client.get(f"/api/scholarships/{opportunity.slug}/comments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["body"],
            "This approved comment should be public.",
        )
        self.assertEqual(len(response.data["results"][0]["replies"]), 1)
        self.assertEqual(
            response.data["results"][0]["replies"][0]["body"],
            "Approved staff reply.",
        )

    def test_authenticated_user_can_submit_comment_for_review(self):
        opportunity = self.opportunity(slug="comments-waiting-for-review")
        self.client.force_authenticate(self.student)

        response = self.client.post(
            f"/api/scholarships/{opportunity.slug}/comments/",
            {"body": "Please review this comment before publication."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["is_deleted"])

        comment = OpportunityComment.objects.get(pk=response.data["id"])
        self.assertTrue(comment.is_deleted)
        self.assertEqual(comment.body, "Please review this comment before publication.")

        self.client.force_authenticate(None)
        list_response = self.client.get(f"/api/scholarships/{opportunity.slug}/comments/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 0)

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
