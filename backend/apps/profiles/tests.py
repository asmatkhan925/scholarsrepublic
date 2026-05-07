from rest_framework import status
from rest_framework.test import APITestCase

from apps.profiles.models import StudentProfile
from apps.users.models import User


class StudentProfileAPITests(APITestCase):
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
        profile.target_countries = ["China"]
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
