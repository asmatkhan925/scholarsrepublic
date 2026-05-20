from datetime import timedelta
from io import StringIO

from django.contrib.admin.sites import AdminSite
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import RequestFactory
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
    OpportunityComment,
    OpportunityDraft,
    OpportunityPathway,
)
from apps.opportunities.services.opportunity_draft_importer import import_opportunity_draft
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

    def draft_payload(self, **opportunity_overrides):
        pathway = opportunity_overrides.pop("pathway", self.pathway().full_path)
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
            "deadline": "2026-03-15",
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

    def test_public_can_list_published_opportunities(self):
        opportunity = self.opportunity(stipend_summary="Official monthly allowance listed")

        response = self.client.get("/api/opportunities/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        list_item = [item for item in self.results(response) if item["slug"] == opportunity.slug][0]
        self.assertEqual(list_item["stipend_summary"], "Official monthly allowance listed")

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
        draft = OpportunityDraft.objects.create(
            title="Unknown Fields Import",
            slug="unknown-fields-import",
            raw_payload=self.draft_payload(
                all_study_fields=False,
                fields_of_study=["Fake Field"],
            ),
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
