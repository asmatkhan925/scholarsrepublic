import datetime
import io
import logging
import math
import re

from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import parsers, status
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


# ─────────────────────────────────────────────────────────────────────────────
# CV Auto-fill
# ─────────────────────────────────────────────────────────────────────────────

def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages).strip()
    except ImportError:
        raise RuntimeError("pypdf is not installed. Run: pip install pypdf")
    except Exception as exc:
        raise RuntimeError(f"Could not read PDF: {exc}") from exc


# ── Lookup tables ─────────────────────────────────────────────────────────────

_CITIES = [
    "Islamabad", "Lahore", "Karachi", "Rawalpindi", "Faisalabad", "Multan",
    "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Abbottabad",
    "Bahawalpur", "Sargodha", "Larkana", "Gilgit", "Muzaffarabad", "Mirpur",
    "Sukkur", "Mardan", "Swat", "Gwadar", "Skardu", "Hunza", "Jhelum",
    "Gujrat", "Chakwal", "Attock", "Wah Cantt", "Hafizabad", "Kharian",
    "Sheikhupura", "Okara", "Rahim Yar Khan", "Sahiwal", "Kasur", "Narowal",
    "Mandi Bahauddin", "Jhang", "Vehari", "Khanewal", "Chiniot", "Pakpattan",
    "Bahawalnagar", "Mianwali", "Bhakkar", "Layyah", "Muzaffargarh",
    "Khushab", "Dera Ghazi Khan", "Kohat", "Mansehra", "Nowshera",
    "Charsadda", "Bannu", "Dera Ismail Khan", "Turbat", "Khuzdar",
    "Hub", "Zhob", "Loralai",
]

_CITY_TO_PROVINCE = {
    "Islamabad": "Islamabad Capital Territory",
    "Lahore": "Punjab", "Rawalpindi": "Punjab", "Faisalabad": "Punjab",
    "Multan": "Punjab", "Sialkot": "Punjab", "Gujranwala": "Punjab",
    "Bahawalpur": "Punjab", "Sargodha": "Punjab", "Gujrat": "Punjab",
    "Jhelum": "Punjab", "Hafizabad": "Punjab", "Sheikhupura": "Punjab",
    "Okara": "Punjab", "Rahim Yar Khan": "Punjab", "Sahiwal": "Punjab",
    "Kasur": "Punjab", "Mandi Bahauddin": "Punjab", "Jhang": "Punjab",
    "Vehari": "Punjab", "Khanewal": "Punjab", "Dera Ghazi Khan": "Punjab",
    "Karachi": "Sindh", "Hyderabad": "Sindh", "Larkana": "Sindh",
    "Sukkur": "Sindh",
    "Peshawar": "Khyber Pakhtunkhwa", "Abbottabad": "Khyber Pakhtunkhwa",
    "Mardan": "Khyber Pakhtunkhwa", "Swat": "Khyber Pakhtunkhwa",
    "Kohat": "Khyber Pakhtunkhwa", "Mansehra": "Khyber Pakhtunkhwa",
    "Nowshera": "Khyber Pakhtunkhwa", "Charsadda": "Khyber Pakhtunkhwa",
    "Bannu": "Khyber Pakhtunkhwa", "Dera Ismail Khan": "Khyber Pakhtunkhwa",
    "Quetta": "Balochistan", "Gwadar": "Balochistan", "Turbat": "Balochistan",
    "Khuzdar": "Balochistan", "Zhob": "Balochistan", "Loralai": "Balochistan",
    "Gilgit": "Gilgit-Baltistan", "Skardu": "Gilgit-Baltistan",
    "Hunza": "Gilgit-Baltistan",
    "Muzaffarabad": "Azad Jammu and Kashmir",
    "Mirpur": "Azad Jammu and Kashmir",
}

_PROVINCE_PATTERNS = {
    "Punjab": [r"\bPunjab\b"],
    "Sindh": [r"\bSindh\b"],
    "Khyber Pakhtunkhwa": [r"Khyber\s+Pakhtunkhwa", r"\bKPK\b", r"\bKP\b(?!\s+[A-Z])"],
    "Balochistan": [r"\bBalochistan\b", r"\bBaluchistan\b"],
    "Gilgit-Baltistan": [r"Gilgit.Baltistan", r"\bBaltistan\b"],
    "Azad Jammu and Kashmir": [r"Azad\s+(?:Jammu|Kashmir)", r"\bAJK\b"],
    "Islamabad Capital Territory": [r"Islamabad\s+Capital\s+Territory", r"\bICT\b"],
}

_INSTITUTIONS = [
    (r"\bLUMS\b", "Lahore University of Management Sciences"),
    (r"\bNUST\b", "National University of Sciences and Technology"),
    (r"\bFAST\b(?!\s+food)", "FAST – National University"),
    (r"\bIBA\b", "Institute of Business Administration"),
    (r"\bNED\b", "NED University of Engineering and Technology"),
    (r"\bUET\b", "University of Engineering and Technology"),
    (r"\bCOMSATS\b", "COMSATS University"),
    (r"\bQAU\b|Quaid.i.Azam\s+University", "Quaid-i-Azam University"),
    (r"Aga\s+Khan\s+University|\bAKU\b", "Aga Khan University"),
    (r"Bahria\s+University", "Bahria University"),
    (r"Air\s+University", "Air University"),
    (r"\bSZABIST\b", "SZABIST"),
    (r"\bGCU\b|Government\s+College\s+University", "Government College University"),
    (r"University\s+of\s+Punjab|Punjab\s+University|\bPU\b(?!\s*[a-z])", "University of Punjab"),
    (r"University\s+of\s+Karachi|Karachi\s+University|\bUoK\b", "University of Karachi"),
    (r"University\s+of\s+Peshawar|\bUoP\b", "University of Peshawar"),
    (r"Virtual\s+University|\bVU\b(?!\s+of)", "Virtual University of Pakistan"),
    (r"Allama\s+Iqbal\s+Open\s+University|\bAIOU\b", "Allama Iqbal Open University"),
    (r"\bRiphah\b", "Riphah International University"),
    (r"Forman\s+Christian|FC\s+College|\bFCC\b", "Forman Christian College"),
    (r"\bBZU\b|Bahauddin\s+Zakariya", "Bahauddin Zakariya University"),
    (r"\bUAF\b|University\s+of\s+Agriculture\s+Faisalabad", "University of Agriculture, Faisalabad"),
    (r"International\s+Islamic\s+University|\bIIUI\b|\bIIU\b", "International Islamic University"),
    (r"Lahore\s+College\s+for\s+Women|\bLCWU\b", "Lahore College for Women University"),
    (r"\bPIDE\b", "Pakistan Institute of Development Economics"),
    (r"Army\s+Medical\s+College|\bAMC\b", "Army Medical College"),
    (r"King\s+Edward\s+Medical|\bKEMU\b", "King Edward Medical University"),
    (r"Khyber\s+Medical|\bKMU\b", "Khyber Medical University"),
    (r"Fatima\s+Jinnah", "Fatima Jinnah Medical University"),
    (r"\bPAF\b.IAST|PAF\s+Institute", "PAF Institute of Aerospace and Advanced Technologies"),
    (r"\bNIPM\b|National\s+Institute\s+of\s+Public\s+Management", "National Institute of Public Management"),
    (r"\bUCP\b|University\s+of\s+Central\s+Punjab", "University of Central Punjab"),
    (r"University\s+of\s+Lahore|\bUOL\b", "University of Lahore"),
    (r"University\s+of\s+Sargodha|\bUOS\b(?!\s+[A-Z])", "University of Sargodha"),
    (r"Islamia\s+University\s+of\s+Bahawalpur|\bIUB\b", "Islamia University of Bahawalpur"),
    (r"University\s+of\s+Sindh", "University of Sindh"),
    (r"Mehran\s+University", "Mehran University of Engineering and Technology"),
    (r"\bMUET\b", "Mehran University of Engineering and Technology"),
    (r"University\s+of\s+Balochistan", "University of Balochistan"),
    (r"University\s+of\s+Azad\s+Kashmir|\bUAJK\b", "University of Azad Jammu & Kashmir"),
]


def _extract_by_rules(cv_text: str) -> dict:  # noqa: C901
    result = {}

    # ── CGPA / GPA ──────────────────────────────────────────────────────────
    # Handles: "CGPA: 3.85", "CGPA 3.85/4.0", "GPA: 3.6 out of 4",
    #          "3.85 CGPA", "3.85/4.00", "Cumulative GPA 3.7"
    cgpa5 = re.search(
        r'(?:c?gpa|grade\s+point)[:\s]+([0-5](?:\.\d{1,2})?)\s*/\s*5(?:\.0{1,2})?'
        r'|([0-5](?:\.\d{1,2})?)\s*/\s*5(?:\.0{1,2})?\s*(?:c?gpa)',
        cv_text, re.I,
    )
    cgpa4 = re.search(
        r'(?:cumulative\s+)?(?:c?gpa|grade\s+point\s+average)[:\s=]+([0-4](?:\.\d{1,2})?)'
        r'\s*(?:/\s*4(?:\.0{1,2})?|out\s+of\s+4(?:\.0)?)?(?!\s*/\s*5)'
        r'|([0-4]\.\d{1,2})\s*(?:/\s*4(?:\.0)?|out\s+of\s+4(?:\.0)?)\s*c?gpa'
        r'|([0-4]\.\d{1,2})\s*c?gpa',
        cv_text, re.I,
    )
    if cgpa5:
        val_str = next(g for g in cgpa5.groups() if g)
        result['cgpa'] = round(float(val_str), 2)
        result['grading_system'] = 'CGPA_5'
    elif cgpa4:
        val_str = next((g for g in cgpa4.groups() if g), None)
        if val_str:
            val = round(float(val_str), 2)
            if 0 < val <= 4.0:
                result['cgpa'] = val
                result['grading_system'] = 'CGPA_4'

    # ── Division ─────────────────────────────────────────────────────────────
    if 'cgpa' not in result:
        div_m = re.search(r'\b(first|1st|second|2nd|third|3rd)\s+division\b', cv_text, re.I)
        if div_m:
            div_map = {
                'first': 'First Division', '1st': 'First Division',
                'second': 'Second Division', '2nd': 'Second Division',
                'third': 'Third Division', '3rd': 'Third Division',
            }
            result['division'] = div_map.get(div_m.group(1).lower(), div_m.group(1).title() + ' Division')
            result['grading_system'] = 'Division'

    # ── Percentage ───────────────────────────────────────────────────────────
    if 'cgpa' not in result and 'division' not in result:
        for pct_pat in [
            r'(?:percentage|marks\s+obtained|aggregate)[:\s=]+(\d{2,3}(?:\.\d{1,2})?)\s*%?',
            r'(\d{2,3}(?:\.\d{1,2})?)\s*(?:%|percent)\b',
            r'(\d{3,4})\s*/\s*(?:1100|1000|900)\b',
        ]:
            pct_m = re.search(pct_pat, cv_text, re.I)
            if pct_m:
                raw = float(pct_m.group(1))
                # Convert marks/1000 style to percentage
                if raw > 100:
                    total_match = re.search(r'(\d{3,4})\s*/\s*(1100|1000|900)', cv_text)
                    if total_match:
                        raw = round(float(total_match.group(1)) / float(total_match.group(2)) * 100, 2)
                if 40 <= raw <= 100:
                    result['percentage'] = round(raw, 2)
                    result['grading_system'] = 'Percentage'
                    break

    # ── Test scores ──────────────────────────────────────────────────────────
    # IELTS: "IELTS 7.5", "IELTS Overall: 7.0", "Band Score: 6.5", "IELTS (7.5)"
    for ielts_pat in [
        r'ielts[:\s\(]+([5-9](?:\.5)?)\b',
        r'ielts[^\n]{0,20}overall[:\s]+([5-9](?:\.5)?)\b',
        r'overall\s+band[:\s]+([5-9](?:\.5)?)\b',
        r'band\s+score[:\s]+([5-9](?:\.5)?)\b',
        r'ielts[^\n]{0,30}([5-9](?:\.5)?)\s*/\s*9',
    ]:
        m = re.search(ielts_pat, cv_text, re.I)
        if m:
            result['has_ielts'] = True
            result['ielts_score'] = float(m.group(1))
            break

    # TOEFL: "TOEFL 105", "TOEFL iBT: 100", "TOEFL (105/120)"
    for toefl_pat in [
        r'toefl\s+ibt[:\s\(]+(\d{2,3})\b',
        r'toefl[:\s\(]+(\d{2,3})\b',
        r'toefl[^\n]{0,15}(\d{2,3})\s*/\s*120',
    ]:
        m = re.search(toefl_pat, cv_text, re.I)
        if m:
            score = int(m.group(1))
            if 0 <= score <= 120:
                result['has_toefl'] = True
                result['toefl_score'] = score
                break

    # GRE: direct score or quant+verbal sum
    for gre_pat in [
        r'\bgre[:\s\(]+(\d{3})\b',
        r'\bgre[^\n]{0,20}total[:\s]+(\d{3})\b',
        r'\bgre[^\n]{0,20}(\d{3})\s*/\s*340',
    ]:
        m = re.search(gre_pat, cv_text, re.I)
        if m:
            score = int(m.group(1))
            if 260 <= score <= 340:
                result['has_gre'] = True
                result['gre_score'] = score
                break
    if 'has_gre' not in result:
        q = re.search(r'gre[^\n]{0,30}quant(?:itative)?[:\s]+1([5-7]\d)\b', cv_text, re.I)
        v = re.search(r'gre[^\n]{0,30}verbal[:\s]+1([3-7]\d)\b', cv_text, re.I)
        if q and v:
            total = 100 + int(q.group(1)) + 100 + int(v.group(1))
            if 260 <= total <= 340:
                result['has_gre'] = True
                result['gre_score'] = total

    # GMAT
    m = re.search(r'gmat[:\s\(]+(\d{3})\b', cv_text, re.I)
    if m:
        score = int(m.group(1))
        if 200 <= score <= 800:
            result['has_gmat'] = True
            result['gmat_score'] = score

    # Duolingo (DET)
    for duo_pat in [
        r'duolingo\s+english\s+test[:\s\(]+(\d{2,3})\b',
        r'duolingo[:\s\(]+(\d{2,3})\b',
        r'\bdet[:\s\(]+(\d{2,3})\b',
    ]:
        m = re.search(duo_pat, cv_text, re.I)
        if m:
            score = int(m.group(1))
            if 10 <= score <= 160:
                result['has_duolingo'] = True
                result['duolingo_score'] = score
                break

    # PTE Academic
    for pte_pat in [
        r'pte\s+academic[:\s\(]+(\d{2,3})\b',
        r'\bpte[:\s\(]+(\d{2,3})\b',
    ]:
        m = re.search(pte_pat, cv_text, re.I)
        if m:
            score = int(m.group(1))
            if 10 <= score <= 90:
                result['has_pte'] = True
                result['pte_score'] = score
                break

    # HSK (Chinese)
    m = re.search(r'\bhsk[:\s\-]+(?:level\s*)?([1-6])\b', cv_text, re.I)
    if m:
        result['has_hsk'] = True
        result['hsk_level'] = f'HSK {m.group(1)}'

    # English proficiency cert
    if any(k in result for k in ('has_ielts', 'has_toefl', 'has_pte', 'has_duolingo')):
        result['english_proficiency_certificate'] = True
    elif re.search(r'english\s+(?:proficiency|language)\s+(?:certificate|test|exam)', cv_text, re.I):
        result['english_proficiency_certificate'] = True

    # ── Education level (highest found) ──────────────────────────────────────
    edu_levels = [
        (7, [
            r'\bph\.?d\.?\b', r'\bdoctor(?:al|ate)?\b', r'\bDoctor\s+of\b',
            r'pursuing\s+ph\.?d', r'ph\.?d\s+(?:candidate|student|scholar)',
        ], 'PhD'),
        (6, [
            r'\bm\.?s\.?\b(?!\s+office)', r'\bm\.?phil\b', r'\bmphil\b',
            r'\bmaster\s+of\s+(?:science|engineering|philosophy)\b',
            r'\bmcs\b', r'\bm\.?sc\b(?!\s+office)',
        ], 'MS/MPhil'),
        (5, [
            r"\bmaster(?:'s|s)?\b", r'\bmba\b', r'\bm\.?ed\b',
            r'\bmaster\s+of\s+(?:business|arts|public|education|finance)\b',
            r'\bmpa\b', r'\bmph\b', r'\bllm\b',
        ], 'Master'),
        (4, [
            r'\bb\.?sc\.?\b', r'\bb\.?tech\b', r'\bb\.?eng\b', r'\bb\.?e\.?\b',
            r'\bbachelor\b', r'\bundergraduate\b', r'\bb\.?com\b', r'\bb\.?ed\b',
            r'\bb\.?a\.?\b', r'\bbba\b', r'\bbscs\b', r'\bbs\s+\w{3}', r'\bllb\b',
        ], 'Bachelor'),
        (3, [
            r'\bdiploma\b', r'\bdae\b', r'\bassociate\s+degree\b',
        ], 'DAE/Diploma'),
        (2, [
            r'\bfsc\b', r'\bf\.sc\b', r'\bintermediate\b',
            r'\bhssc\b', r'\ba.?level\b', r'\bhigher\s+secondary\b',
        ], 'FSc'),
        (1, [
            r'\bmatric\b', r'\bssc\b', r'\bsecondary\s+school\b',
            r'\bo.?level\b', r'\bgrade\s+10\b',
        ], 'Matric'),
    ]
    best_pri, best_level = -1, None
    for priority, patterns, level in edu_levels:
        if priority > best_pri and any(re.search(p, cv_text, re.I) for p in patterns):
            best_pri, best_level = priority, level
    if best_level:
        result['current_education_level'] = best_level

    # ── Result status ─────────────────────────────────────────────────────────
    if re.search(r'\bfinal\s+year\b|\blast\s+(?:year|semester)\b', cv_text, re.I):
        result['result_status'] = 'Final Year'
    elif re.search(r'\bcurrently\s+pursuing\b|\bin\s+progress\b|\bongoing\b|\benrolled\b', cv_text, re.I):
        result['result_status'] = 'In Progress'
    elif re.search(r'\bgraduated?\b|\bdegree\s+awarded\b|\bconvocation\b|\bcompleted?\b', cv_text, re.I):
        result['result_status'] = 'Completed'
    elif re.search(r'waiting\s+for\s+result|awaiting\s+result|result\s+awaited', cv_text, re.I):
        result['result_status'] = 'Waiting for Result'

    # ── Field of study ────────────────────────────────────────────────────────
    for fos_pat in [
        r'(?:bs|b\.?sc|b\.?tech|ms|m\.?sc|m\.?tech|b\.?e|phd)[^\n,]{0,5}(?:in|of)\s+([A-Za-z][A-Za-z\s&/]{3,50}?)(?:\s*[,\n\(]|$)',
        r'(?:bachelor|master|degree)\s+(?:of|in)\s+([A-Za-z][A-Za-z\s&/]{3,50}?)(?:\s*[,\n\(]|$)',
        r'(?:department|dept\.?)\s+of\s+([A-Za-z][A-Za-z\s&/]{3,50}?)(?:\s*[,\n\(]|$)',
        r'(?:program(?:me)?|major|specialization|specialisation|field\s+of\s+study)[:\s]+([A-Za-z][A-Za-z\s&/]{3,50}?)(?:\s*[,\n]|$)',
    ]:
        m = re.search(fos_pat, cv_text, re.I)
        if m:
            field = m.group(1).strip().rstrip('.')
            noise = {'the', 'this', 'that', 'which', 'with', 'and', 'for', 'from', 'your', 'their'}
            if len(field) > 3 and field.lower() not in noise:
                result['current_field_of_study'] = field
                break

    # ── Graduation year ───────────────────────────────────────────────────────
    for yr_pat in [
        r'(?:graduated?|graduation|completed?|degree\s+awarded|convocation)[^\n]{0,20}(20\d{2})',
        r'(?:expected|anticipated)\s+(?:graduation|completion)[:\s]+(20\d{2})',
        r'(20\d{2})\s*[-–]\s*(?:present|current|ongoing)\b',
    ]:
        m = re.search(yr_pat, cv_text, re.I)
        if m:
            yr = int(m.group(1))
            if 2010 <= yr <= 2030:
                result['graduation_year'] = yr
                break
    if 'graduation_year' not in result:
        years = [int(y) for y in re.findall(r'\b(20\d{2})\b', cv_text) if 2010 <= int(y) <= 2030]
        if years:
            result['graduation_year'] = max(years)

    # ── Phone number ──────────────────────────────────────────────────────────
    for ph_pat in [
        r'(?:\+92|0092)[-\s]?\d{3}[-\s]?\d{7}',
        r'0\d{3}[-\s]?\d{7}',
        r'\+\d{1,3}[-\s]?\(?\d{2,4}\)?[-\s]?\d{4,8}',
    ]:
        m = re.search(ph_pat, cv_text)
        if m:
            result['phone_number'] = m.group(0).strip()
            break

    # ── URLs ──────────────────────────────────────────────────────────────────
    m = re.search(r'(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+', cv_text, re.I)
    if m:
        url = m.group(0)
        result['linkedin_url'] = url if url.startswith('http') else 'https://' + url

    m = re.search(r'(?:https?://)?(?:www\.)?github\.com/[\w\-]+', cv_text, re.I)
    if m:
        url = m.group(0)
        result['github_url'] = url if url.startswith('http') else 'https://' + url

    m = re.search(
        r'(?:portfolio|personal\s+(?:website|site|blog))[:\s]+(?:https?://)?'
        r'([a-zA-Z0-9][\w\-\.]+\.[a-zA-Z]{2,}(?:/[\w\-\./?=&%]*)?)',
        cv_text, re.I,
    )
    if m:
        url = m.group(1)
        result['portfolio_url'] = url if url.startswith('http') else 'https://' + url

    # ── City ──────────────────────────────────────────────────────────────────
    for city in _CITIES:
        if re.search(r'\b' + re.escape(city) + r'\b', cv_text, re.I):
            result['city'] = city
            break

    # ── Province ─────────────────────────────────────────────────────────────
    for province, patterns in _PROVINCE_PATTERNS.items():
        if any(re.search(p, cv_text, re.I) for p in patterns):
            result['province'] = province
            break
    # Infer from city if province not found
    if 'province' not in result and 'city' in result:
        inferred = _CITY_TO_PROVINCE.get(result['city'])
        if inferred:
            result['province'] = inferred

    # ── Domicile ──────────────────────────────────────────────────────────────
    m = re.search(r'domicile[:\s]+([A-Za-z][A-Za-z\s]{2,60}?)(?:\s*[,\n\|]|$)', cv_text, re.I)
    if m:
        result['domicile'] = m.group(1).strip()

    # ── Institution ──────────────────────────────────────────────────────────
    for pattern, name in _INSTITUTIONS:
        if re.search(pattern, cv_text, re.I):
            result['current_institution'] = name
            break
    if 'current_institution' not in result:
        # Generic "X University" or "University of X" pattern
        m = re.search(
            r'\b([A-Z][a-z]+(?:\s+(?:of\s+)?[A-Z][a-z]+){0,4})\s+University\b'
            r'|\bUniversity\s+of\s+([A-Z][a-z]+(?:\s+(?:and\s+)?[A-Z][a-z]+){0,3})\b',
            cv_text,
        )
        if m:
            name = (m.group(1) + ' University') if m.group(1) else ('University of ' + m.group(2))
            result['current_institution'] = name.strip()

    # ── Research experience ───────────────────────────────────────────────────
    research_indicators = [
        r'research\s+(?:assistant|associate|intern(?:ship)?|fellow|officer|experience|work)',
        r'(?:conducted|performed|carried\s+out|led)\s+research',
        r'research\s+(?:and\s+development|lab(?:oratory)?|centre|center)',
        r'thesis\s+(?:research|work|title)',
        r'graduate\s+research\s+(?:assistant|associate)',
    ]
    if any(re.search(p, cv_text, re.I) for p in research_indicators):
        result['has_research_experience'] = True

    # ── Publications ─────────────────────────────────────────────────────────
    for pub_pat in [
        r'(\d+)\s+(?:peer.reviewed|journal|conference|research)\s+(?:article|paper|publication)',
        r'(\d+)\s+publication',
        r'published\s+(\d+)\s+(?:paper|article)',
    ]:
        m = re.search(pub_pat, cv_text, re.I)
        if m:
            result['has_publications'] = True
            result['publications_count'] = int(m.group(1))
            break
    if 'has_publications' not in result:
        if re.search(r'\bpublished\b|\bpublication[s]?\b|\bjournal\s+article\b|\bconference\s+paper\b', cv_text, re.I):
            result['has_publications'] = True

    # ── Internship / work experience ─────────────────────────────────────────
    if re.search(r'\bintern(?:ship)?\b', cv_text, re.I):
        result['has_internship_experience'] = True

    work_m = re.search(
        r'(\d+(?:\.\d)?)\s*\+?\s*years?\s+(?:of\s+)?(?:work|professional|industry|relevant|total)\s+experience',
        cv_text, re.I,
    )
    if work_m:
        result['work_experience_years'] = float(work_m.group(1))
    else:
        ranges = re.findall(r'\b(20\d{2})\s*[-–—]\s*(20\d{2}|present|current)\b', cv_text, re.I)
        total = sum(
            (2025 if e.lower() in ('present', 'current') else int(e)) - int(s)
            for s, e in ranges
            if int(s) >= 2000
        )
        if total > 0:
            result['work_experience_years'] = float(min(total, 30))

    # ── Document flags ────────────────────────────────────────────────────────
    if re.search(r'\bcnic\b|\bnational\s+(?:id(?:entity)?\s+)?card\b|\bnid\b', cv_text, re.I):
        result['has_cnic'] = True
    if re.search(r'\bpassport\b', cv_text, re.I):
        result['has_passport'] = True
    if re.search(r'\b(?:academic\s+)?transcript\b', cv_text, re.I):
        result['has_transcript'] = True
    if re.search(r'\bdegree\s+certificate\b|\bconvocation\s+certificate\b', cv_text, re.I):
        result['has_degree'] = True
    if re.search(r'\b(?:recommendation|reference)\s+letter[s]?\b|\blor\b|\bletters?\s+of\s+recommendation\b', cv_text, re.I):
        result['has_recommendation_letters'] = True
        lor_c = re.search(r'(\d+)\s+(?:recommendation|reference)\s+letter', cv_text, re.I)
        if lor_c:
            result['recommendation_letters_count'] = int(lor_c.group(1))
    if re.search(r'\bstatement\s+of\s+purpose\b|\bsop\b', cv_text, re.I):
        result['has_sop'] = True
    if re.search(r'\bstudy\s+plan\b', cv_text, re.I):
        result['has_study_plan'] = True
    if re.search(r'\bresearch\s+proposal\b', cv_text, re.I):
        result['has_research_proposal'] = True

    # ── Skills section ────────────────────────────────────────────────────────
    for skills_pat in [
        r'(?:technical\s+)?skills?[:\n\s]+((?:[^\n]{2,80}\n?){1,12})',
        r'core\s+competenc(?:ies|y)[:\n\s]+((?:[^\n]{2,80}\n?){1,6})',
        r'(?:areas?\s+of\s+)?expertise[:\n\s]+((?:[^\n]{2,80}\n?){1,6})',
        r'proficien(?:t\s+in|cies?)[:\n\s]+((?:[^\n]{2,80}\n?){1,6})',
        r'technologies?[:\n\s]+((?:[^\n]{2,80}\n?){1,8})',
    ]:
        m = re.search(skills_pat, cv_text, re.I)
        if m:
            raw = re.split(r'[,•·|\n/–]', m.group(1))
            skills = [s.strip() for s in raw if 2 <= len(s.strip()) <= 45 and not s.strip().isdigit()]
            if len(skills) >= 2:
                result['skills'] = skills[:20]
                break

    # ── Research interests ────────────────────────────────────────────────────
    for ri_pat in [
        r'research\s+interests?[:\n\s]+((?:[^\n]{3,80}\n?){1,8})',
        r'areas?\s+of\s+(?:research\s+)?interest[:\n\s]+((?:[^\n]{3,80}\n?){1,6})',
        r'research\s+focus(?:es?)?[:\n\s]+((?:[^\n]{3,80}\n?){1,5})',
        r'academic\s+interests?[:\n\s]+((?:[^\n]{3,80}\n?){1,5})',
    ]:
        m = re.search(ri_pat, cv_text, re.I)
        if m:
            raw = re.split(r'[,•·|\n/–]', m.group(1))
            interests = [s.strip() for s in raw if 3 <= len(s.strip()) <= 80]
            if interests:
                result['research_interests'] = interests[:10]
                break

    # ── Target degree from Objective / Summary ────────────────────────────────
    obj_m = re.search(
        r'(?:objective|summary|career\s+goal|personal\s+statement|profile\s+summary)[:\n\s]+'
        r'((?:[^\n]{10,150}\n?){1,4})',
        cv_text, re.I,
    )
    if obj_m:
        obj = obj_m.group(1)
        for tgt_pat, tgt_deg in [
            (r'\bph\.?d', 'PhD'),
            (r'\bpostdoc', 'Postdoc'),
            (r'\bm\.?s\b|\bm\.?phil\b|\bmaster', 'Master'),
            (r'\bbachelor|\bundergraduate', 'Undergraduate'),
        ]:
            if re.search(tgt_pat, obj, re.I):
                result['target_degree_level'] = tgt_deg
                break

    return {k: v for k, v in result.items() if v is not None and v != '' and v != []}


class CVAutofillExtractView(StudentProfileAccessMixin, APIView):
    """Step 1 — upload a PDF CV and get extracted fields back for preview."""

    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def post(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        file_obj = request.FILES.get("file")
        raw_text = request.data.get("text", "").strip()

        if not file_obj and not raw_text:
            return Response(
                {"detail": "Provide either a 'file' (PDF) or 'text' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file_obj:
            if not file_obj.name.lower().endswith(".pdf"):
                return Response(
                    {"detail": "Only PDF files are supported. Upload a .pdf or use the 'Paste text' option."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if file_obj.size > 5 * 1024 * 1024:
                return Response(
                    {"detail": "File too large. Maximum size is 5 MB."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                cv_text = _extract_pdf_text(file_obj.read())
            except RuntimeError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            if not cv_text:
                return Response(
                    {"detail": "No text could be extracted from this PDF — it may be a scanned image. Please use the 'Paste CV text' option instead."},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )
        else:
            cv_text = raw_text

        try:
            extracted = _extract_by_rules(cv_text)
        except Exception:
            logger.exception("CV autofill extraction failed for user %s", request.user.pk)
            return Response(
                {"detail": "Extraction failed. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"extracted": extracted})


# All profile fields settable directly (properties and M2M handled separately)
_SIMPLE_FIELDS = {
    "city", "province", "domicile", "phone_number",
    "current_education_level", "current_institution", "result_status",
    "graduation_year", "grading_system", "cgpa", "percentage", "division",
    "target_degree_level",
    "has_ielts", "ielts_score", "has_toefl", "toefl_score",
    "has_gre", "gre_score", "has_gmat", "gmat_score",
    "has_duolingo", "duolingo_score", "has_pte", "pte_score",
    "has_hsk", "hsk_level", "english_proficiency_certificate",
    "has_research_experience", "has_publications", "publications_count",
    "has_internship_experience", "work_experience_years",
    "research_interests", "skills",
    "linkedin_url", "github_url", "portfolio_url",
    "has_cnic", "has_passport", "has_transcript", "has_degree",
    "has_cv", "has_recommendation_letters", "recommendation_letters_count",
    "has_sop", "has_study_plan", "has_research_proposal",
}


def _field_is_empty(current) -> bool:
    if current is None or current == "":
        return True
    if isinstance(current, bool):
        return not current
    if isinstance(current, list):
        return len(current) == 0
    if isinstance(current, (int, float)):
        return current == 0
    return False


class CVAutofillApplyView(StudentProfileAccessMixin, APIView):
    """Step 2 — apply confirmed extracted fields to the student's profile."""

    def post(self, request):
        denied = self.deny_admin(request)
        if denied:
            return denied

        fields = request.data.get("fields", {})
        if not isinstance(fields, dict) or not fields:
            return Response(
                {"detail": "Provide a non-empty 'fields' object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile = self.get_profile(request)
        if profile is None:
            return Response(
                {"detail": "No profile found. Please create your profile first."},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = []
        skipped = []
        save_fields = []

        # current_field_of_study is a property — handle before the loop
        if "current_field_of_study" in fields:
            if _field_is_empty(profile.current_field_of_study):
                profile.current_field_of_study = fields["current_field_of_study"]
                save_fields += ["current_study_field_ref", "custom_current_study_field"]
                updated.append("current_field_of_study")
            else:
                skipped.append("current_field_of_study")

        for key, value in fields.items():
            if key not in _SIMPLE_FIELDS:
                continue
            current = getattr(profile, key, None)
            # Always allow overwriting list fields (skills, research_interests)
            if not _field_is_empty(current) and key not in ("research_interests", "skills"):
                skipped.append(key)
                continue
            setattr(profile, key, value)
            save_fields.append(key)
            updated.append(key)

        # Always mark has_cv when a CV is processed
        if not profile.has_cv:
            profile.has_cv = True
            save_fields.append("has_cv")
            if "has_cv" not in updated:
                updated.append("has_cv")

        if updated or not profile.has_cv:
            profile.ai_autofill_reviewed = True
            save_fields.append("ai_autofill_reviewed")
            if profile.profile_source == StudentProfile.ProfileSource.MANUAL:
                profile.profile_source = StudentProfile.ProfileSource.CV_IMPORTED
                save_fields.append("profile_source")
            profile.save(update_fields=list(set(save_fields)))

        return Response(
            {
                "updated": updated,
                "skipped": skipped,
                "profile": StudentProfileSerializer(profile).data,
            }
        )
