from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import StudentProfile
from apps.profiles.serializers import StudentProfileSerializer
from apps.users.models import User


class StudentProfileAccessMixin:
    permission_classes = [IsAuthenticated]

    def deny_admin(self, request):
        if request.user.role == User.Role.ADMIN:
            return Response(
                {"detail": "Admin users do not need a student profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get_profile(self, request):
        return StudentProfile.objects.filter(user=request.user).first()

    def empty_completion(self):
        return {
            "completion_percentage": 0,
            "scholarship_readiness_score": 0,
            "readiness_level": "Low",
            "missing_profile_fields": [
                "City",
                "Province",
                "Domicile",
                "Current education level",
                "Current institution",
                "Current field of study",
                "Target degree level",
                "Target countries",
                "Target fields",
                "Academic score",
                "Funding preference",
                "Preferred intake",
                "Language test information",
                "Available documents",
                "Profile data consent",
            ],
            "missing_core_documents": [
                "CNIC",
                "Domicile",
                "Passport",
                "Transcript",
                "Degree",
                "CV",
                "SOP or Study Plan",
                "Recommendation Letters",
                "English Proficiency / IELTS / TOEFL / Duolingo / PTE",
            ],
        }


class StudentProfileView(StudentProfileAccessMixin, APIView):
    def get(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        profile = self.get_profile(request)
        if profile is None:
            return Response(
                {"detail": "Student profile has not been created yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(StudentProfileSerializer(profile).data)

    def post(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        if self.get_profile(request):
            return Response(
                {"detail": "Profile already exists. Use PATCH or PUT to update it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = StudentProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        return Response(
            StudentProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED,
        )

    def put(self, request):
        return self.save_profile(request, partial=False)

    def patch(self, request):
        return self.save_profile(request, partial=True)

    def save_profile(self, request, partial):
        denied = self.deny_admin(request)
        if denied:
            return denied

        profile = self.get_profile(request)
        serializer = StudentProfileSerializer(
            profile,
            data=request.data,
            partial=partial or profile is None,
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save(user=request.user)
        return Response(StudentProfileSerializer(profile).data)


class ProfileCompletionView(StudentProfileAccessMixin, APIView):
    def get(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        profile = self.get_profile(request)
        if profile is None:
            return Response(self.empty_completion())

        return Response(
            {
                "completion_percentage": profile.completion_percentage,
                "scholarship_readiness_score": profile.scholarship_readiness_score,
                "readiness_level": profile.readiness_level,
                "missing_profile_fields": profile.missing_profile_fields,
                "missing_core_documents": profile.missing_core_documents,
            }
        )
