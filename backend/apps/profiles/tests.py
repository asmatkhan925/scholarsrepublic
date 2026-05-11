from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import StudentProfile
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
    testcase.turkey, _ = Country.objects.get_or_create(
        name="Turkey",
        defaults={"region": testcase.asia, "iso2": "TR"},
    )
    testcase.germany, _ = Country.objects.get_or_create(
        name="Germany",
        defaults={"region": testcase.europe, "iso2": "DE"},
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


from apps.users.models import User


class StudentProfileAPITests(APITestCase):
    def setUp(self):
        self.asia = Region.objects.create(name="Asia", code="ASIA", display_order=1)
        self.europe = Region.objects.create(name="Europe", code="EUROPE", display_order=2)

        self.pakistan = Country.objects.create(name="Pakistan", region=self.asia, iso2="PK")
        self.china = Country.objects.create(name="China", region=self.asia, iso2="CN")
        self.taiwan = Country.objects.create(name="Taiwan", region=self.asia, iso2="TW")
        self.turkey = Country.objects.create(name="Turkey", region=self.asia, iso2="TR")
        self.germany = Country.objects.create(name="Germany", region=self.europe, iso2="DE")

        self.cs_category = StudyFieldCategory.objects.create(
            name="Computer Science & IT",
            display_order=1,
        )
        self.computer_science = StudyField.objects.create(
            name="Computer Science",
            category=self.cs_category,
        )
        self.data_science = StudyField.objects.create(
            name="Data Science",
            category=self.cs_category,
        )

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

    def payload(self):
        return {
            "phone_number": "03001234567",
            "city": "Lahore",
            "province": StudentProfile.Province.PUNJAB,
            "domicile": "Lahore",
            "current_education_level": StudentProfile.EducationLevel.BACHELOR,
            "current_institution": "Punjab University",
            "current_field_of_study": "Computer Science",
            "graduation_year": 2026,
            "result_status": StudentProfile.ResultStatus.FINAL_YEAR,
            "grading_system": StudentProfile.GradingSystem.CGPA_4,
            "cgpa": "3.60",
            "target_degree_level": StudentProfile.TargetDegree.MASTER,
            "target_fields": ["Computer Science", "Data Science"],
            "target_countries": ["China", "Germany"],
            "preferred_intake": "Fall 2026",
            "study_mode_preference": StudentProfile.StudyMode.ON_CAMPUS,
            "funding_preference": StudentProfile.FundingPreference.FULLY_FUNDED,
            "application_fee_preference": StudentProfile.ApplicationFeePreference.NO_FEE,
            "language_instruction_preference": StudentProfile.LanguageInstruction.ENGLISH,
            "has_cnic": True,
            "has_domicile": True,
            "has_passport": True,
            "has_transcript": True,
            "has_cv": True,
            "has_sop": True,
            "recommendation_letters_count": 2,
            "english_proficiency_certificate": True,
            "profile_data_consent": True,
        }

    def test_guest_cannot_access_profile(self):
        response = self.client.get("/api/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_student_can_create_comprehensive_profile(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/profile/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["city"], "Lahore")
        self.assertGreater(response.data["completion_percentage"], 0)
        self.assertGreater(response.data["scholarship_readiness_score"], 0)

    def test_student_cannot_create_duplicate_profile(self):
        StudentProfile.objects.create(user=self.student)
        self.client.force_authenticate(self.student)

        response = self.client.post("/api/profile/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_can_get_own_profile(self):
        StudentProfile.objects.create(user=self.student, city="Lahore")
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/profile/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Lahore")

    def test_student_can_patch_profile(self):
        StudentProfile.objects.create(user=self.student, city="Lahore")
        self.client.force_authenticate(self.student)

        response = self.client.patch(
            "/api/profile/",
            {"city": "Islamabad", "target_countries": ["China"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Islamabad")
        self.assertEqual(response.data["target_countries"], ["China"])

    def test_patch_updates_checkbox_fields(self):
        StudentProfile.objects.create(user=self.student)
        self.client.force_authenticate(self.student)

        response = self.client.patch(
            "/api/profile/",
            {
                "has_passport": True,
                "has_cv": True,
                "has_transcript": True,
                "has_ielts": True,
                "profile_data_consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_passport"])
        self.assertTrue(response.data["has_cv"])
        self.assertTrue(response.data["has_transcript"])
        self.assertTrue(response.data["has_ielts"])
        self.assertTrue(response.data["profile_data_consent"])

    def test_json_list_fields_save_correctly(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {
                "target_countries": ["China", "Taiwan"],
                "target_fields": ["Computer Science", "Data Science"],
                "skills": ["Python", "Research"],
                "additional_documents": ["IELTS", "Bank Statement"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["target_countries"], ["China", "Taiwan"])
        self.assertEqual(
            response.data["target_fields"],
            ["Computer Science", "Data Science"],
        )
        self.assertEqual(response.data["skills"], ["Python", "Research"])
        self.assertEqual(
            response.data["additional_documents"],
            ["IELTS", "Bank Statement"],
        )

    def test_put_creates_or_replaces_profile(self):
        self.client.force_authenticate(self.student)

        create_response = self.client.put(
            "/api/profile/",
            {"city": "Karachi", "target_countries": ["Turkey"]},
            format="json",
        )
        update_response = self.client.put(
            "/api/profile/",
            {"city": "Lahore", "target_countries": ["China"]},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["city"], "Lahore")

    def test_admin_cannot_create_student_profile(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post("/api/profile/", self.payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_completion_is_zero_when_no_profile(self):
        self.client.force_authenticate(self.student)

        response = self.client.get("/api/profile/completion/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["completion_percentage"], 0)
        self.assertEqual(response.data["readiness_level"], "Low")

    def test_completion_increases_when_fields_are_added(self):
        profile = StudentProfile.objects.create(user=self.student)
        initial_score = profile.completion_percentage
        profile.city = "Lahore"
        profile.province = StudentProfile.Province.PUNJAB
        profile.current_education_level = StudentProfile.EducationLevel.BACHELOR
        profile.target_country_refs.add(self.china)
        profile.save()

        self.assertGreater(profile.completion_percentage, initial_score)

    def test_readiness_score_detects_missing_documents(self):
        profile = StudentProfile.objects.create(user=self.student)

        self.assertIn("Passport", profile.missing_core_documents)
        self.assertIn("CV", profile.missing_core_documents)
        self.assertEqual(profile.readiness_level, "Low")

    def test_invalid_percentage_rejected(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/profile/",
            {"percentage": "101"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_cgpa_rejected(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/profile/",
            {"grading_system": StudentProfile.GradingSystem.CGPA_4, "cgpa": "4.50"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_ielts_rejected(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/profile/",
            {"ielts_score": "9.5"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_duolingo_rejected(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/profile/",
            {"duolingo_score": 200},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_student_cannot_set_another_user_as_profile_owner(self):
        self.client.force_authenticate(self.student)
        response = self.client.post(
            "/api/profile/",
            {"user": self.other_student.id, "city": "Lahore"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = StudentProfile.objects.get(user=self.student)
        self.assertEqual(profile.user, self.student)

    def test_phone_and_whatsapp_reject_too_few_digits_after_cleanup(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"phone_number": "abc123", "whatsapp_number": "hello456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone_number", response.data)

    def test_phone_and_whatsapp_are_sanitized(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {
                "phone_number": "+92 abc 300-1234567",
                "whatsapp_number": "+92 hello 301-1234567",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["phone_number"], "+92  300-1234567")
        self.assertEqual(response.data["whatsapp_number"], "+92  301-1234567")

    def test_url_fields_are_normalized(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {
                "linkedin_url": "linkedin.com/in/test-user",
                "github_url": "github.com/test-user",
                "portfolio_url": "example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["linkedin_url"], "https://linkedin.com/in/test-user")
        self.assertEqual(response.data["github_url"], "https://github.com/test-user")
        self.assertEqual(response.data["portfolio_url"], "https://example.com")

    def test_student_cannot_set_profile_source(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"profile_source": StudentProfile.ProfileSource.ADMIN_CREATED, "city": "Lahore"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["profile_source"], StudentProfile.ProfileSource.MANUAL)

    def test_hsk_level_accepts_spaced_format(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"has_hsk": True, "hsk_level": "HSK 3"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hsk_level"], "HSK 3")

    def test_hsk_level_normalizes_compact_format(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"has_hsk": True, "hsk_level": "HSK3"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["hsk_level"], "HSK 3")

    def test_future_date_of_birth_rejected(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"date_of_birth": (date.today() + timedelta(days=1)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_of_birth", response.data)

    def test_past_passport_expiry_rejected_when_passport_selected(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {
                "has_passport": True,
                "passport_expiry_date": (date.today() - timedelta(days=1)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("passport_expiry_date", response.data)

    def test_negative_profile_numbers_rejected(self):
        self.client.force_authenticate(self.student)

        fields = [
            ("publications_count", -1),
            ("recommendation_letters_count", -1),
            ("work_experience_years", "-1.0"),
            ("max_application_fee_usd", -1),
        ]

        for field_name, value in fields:
            with self.subTest(field_name=field_name):
                response = self.client.post(
                    "/api/profile/",
                    {field_name: value},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_fields_reject_non_text_items(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"target_countries": ["China", {"bad": "value"}]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_countries", response.data)

    def test_list_fields_are_trimmed_and_deduplicated(self):
        self.client.force_authenticate(self.student)

        response = self.client.post(
            "/api/profile/",
            {"target_countries": [" China ", "china", "Germany", ""]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["target_countries"], ["China", "Germany"])

