import datetime
import logging
import math

from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.profiles.models import StudentProfile
from apps.profiles.serializers import StudentProfileSerializer
from apps.users.models import User

logger = logging.getLogger(__name__)


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


def _build_doc_rows(docs: list[str], cols: int = 3) -> list[list[str]]:
    """Split a flat list of document names into table rows of `cols` cells."""
    rows = []
    for i in range(0, len(docs), cols):
        row = docs[i : i + cols]
        while len(row) < cols:
            row.append("")
        rows.append(row)
    return rows


class CVDownloadView(StudentProfileAccessMixin, APIView):
    def get(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        profile = self.get_profile(request)
        if profile is None:
            return Response(
                {"detail": "No profile found. Complete your profile before downloading a CV."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        p = profile  # shorthand

        # ── Location ──────────────────────────────────────────────────────────
        location_parts = [p for p in [profile.city, profile.province] if p]
        if profile.current_country and profile.current_country != "Pakistan":
            location_parts.append(profile.current_country)
        elif not location_parts:
            location_parts.append(profile.current_country or "")
        location = ", ".join(filter(None, location_parts))

        # ── CGPA / grading scale display ──────────────────────────────────────
        cgpa_scale = ""
        if p.grading_system:
            raw = p.get_grading_system_display()
            cgpa_scale = raw.replace(" scale", "").replace("scale", "").strip()

        # ── Test scores ───────────────────────────────────────────────────────
        tests = []
        if p.has_ielts and p.ielts_score:
            tests.append({"name": "IELTS", "score": str(p.ielts_score)})
        if p.has_toefl and p.toefl_score:
            tests.append({"name": "TOEFL iBT", "score": str(p.toefl_score)})
        if p.has_pte and p.pte_score:
            tests.append({"name": "PTE", "score": str(p.pte_score)})
        if p.has_duolingo and p.duolingo_score:
            tests.append({"name": "Duolingo", "score": str(p.duolingo_score)})
        if p.has_hsk and p.hsk_level:
            tests.append({"name": "HSK", "score": p.hsk_level})
        if p.has_gre and p.gre_score:
            tests.append({"name": "GRE", "score": f"{p.gre_score}/340"})
        if p.has_gmat and p.gmat_score:
            tests.append({"name": "GMAT", "score": f"{p.gmat_score}/800"})

        # ── Research section visibility ────────────────────────────────────────
        show_research = any([
            p.has_research_experience,
            p.has_internship_experience,
            p.work_experience_years,
            p.has_publications and p.publications_count,
            p.has_supervisor_acceptance,
            p.research_interests,
        ])

        # ── Supervisor info ───────────────────────────────────────────────────
        supervisor_parts = [p.supervisor_university, p.supervisor_country]
        supervisor_info = ", ".join(filter(None, supervisor_parts))

        # ── Prepared documents ────────────────────────────────────────────────
        prepared_docs = []
        if p.has_cnic:
            prepared_docs.append("CNIC")
        if p.has_domicile:
            prepared_docs.append("Domicile Certificate")
        if p.has_passport:
            doc = "Passport"
            if p.passport_expiry_date:
                doc += f" (exp. {p.passport_expiry_date.strftime('%b %Y')})"
            prepared_docs.append(doc)
        if p.has_transcript:
            prepared_docs.append("Transcript")
        if p.has_degree:
            prepared_docs.append("Degree Certificate")
        if p.has_cv:
            prepared_docs.append("CV / Résumé")
        if p.has_sop:
            prepared_docs.append("Statement of Purpose")
        if p.has_study_plan:
            prepared_docs.append("Study Plan")
        if p.has_recommendation_letters:
            doc = "Recommendation Letters"
            if p.recommendation_letters_count:
                doc += f" ({p.recommendation_letters_count})"
            prepared_docs.append(doc)
        if p.has_research_proposal:
            prepared_docs.append("Research Proposal")
        if p.has_publications:
            prepared_docs.append("Publications")
        if p.has_english_proficiency_letter:
            prepared_docs.append("English Proficiency Letter")
        if p.has_income_certificate:
            prepared_docs.append("Income Certificate")
        if p.has_bank_statement:
            prepared_docs.append("Bank Statement")
        if p.has_police_clearance:
            prepared_docs.append("Police Clearance")
        if p.has_medical_certificate:
            prepared_docs.append("Medical Certificate")
        if getattr(p, "additional_documents", None):
            prepared_docs.extend(p.additional_documents)

        # ── Work experience ───────────────────────────────────────────────────
        work_exp = ""
        if p.work_experience_years:
            val = float(p.work_experience_years)
            work_exp = str(int(val)) if val == math.floor(val) else str(val)

        # ── Build template context ─────────────────────────────────────────────
        context = {
            "name": user.full_name or user.email,
            "location": location,
            "email": user.email,
            "phone": p.phone_number or "",
            "linkedin_url": p.linkedin_url or "",
            "github_url": p.github_url or "",
            "portfolio_url": p.portfolio_url or "",
            # Education
            "institution": p.current_institution or "",
            "field_of_study": p.current_field_of_study or "",
            "education_level": p.get_current_education_level_display() if p.current_education_level else "",
            "graduation_year": str(p.graduation_year) if p.graduation_year else "",
            "cgpa": str(p.cgpa) if p.cgpa else "",
            "cgpa_scale": cgpa_scale,
            "percentage": f"{p.percentage}%" if p.percentage else "",
            "division": p.division or "",
            "result_status": p.get_result_status_display() if p.result_status else "",
            # Targets
            "target_degree": p.get_target_degree_level_display() if p.target_degree_level else "",
            "preferred_intake": p.preferred_intake or "",
            "funding_preference": p.get_funding_preference_display() if p.funding_preference else "",
            "target_countries": list(p.target_countries),
            "target_fields": list(p.target_fields),
            # Tests
            "tests": tests,
            # Research
            "show_research": show_research,
            "has_research_experience": p.has_research_experience,
            "has_internship_experience": p.has_internship_experience,
            "work_experience_years": work_exp,
            "publications_count": p.publications_count if p.has_publications else 0,
            "has_supervisor": p.has_supervisor_acceptance,
            "supervisor_info": supervisor_info,
            "research_interests": list(p.research_interests or []),
            "skills": list(p.skills or []),
            # Documents
            "prepared_docs": prepared_docs,
            "doc_rows": _build_doc_rows(prepared_docs),
            # Special categories
            "special_categories": list(p.special_scholarship_categories or []),
            # Meta
            "generated_date": datetime.date.today().strftime("%B %d, %Y"),
        }

        html = render_to_string("profiles/cv.html", context, request=request)

        try:
            from weasyprint import HTML  # noqa: PLC0415
            pdf_bytes = HTML(string=html, base_url=request.build_absolute_uri("/")).write_pdf()
        except ImportError:
            logger.error("WeasyPrint is not installed. Run: pip install weasyprint")
            return Response(
                {"detail": "PDF generation is not available on this server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("WeasyPrint PDF generation failed for user %s", user.pk)
            return Response(
                {"detail": "PDF generation failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_name = (user.full_name or "profile").replace(" ", "_").replace("/", "_")
        filename = f"ScholarshipsCV_{safe_name}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        response["Content-Length"] = len(pdf_bytes)
        return response
