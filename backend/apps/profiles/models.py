from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    class Province(models.TextChoices):
        PUNJAB = "Punjab", "Punjab"
        SINDH = "Sindh", "Sindh"
        KPK = "Khyber Pakhtunkhwa", "Khyber Pakhtunkhwa"
        BALOCHISTAN = "Balochistan", "Balochistan"
        GILGIT = "Gilgit-Baltistan", "Gilgit-Baltistan"
        AJK = "Azad Jammu and Kashmir", "Azad Jammu and Kashmir"
        ISLAMABAD = "Islamabad Capital Territory", "Islamabad Capital Territory"
        OTHER = "Other", "Other"

    class EducationLevel(models.TextChoices):
        MATRIC = "Matric", "Matric"
        FSC = "FSc", "FSc"
        A_LEVEL = "A-Level", "A-Level"
        DIPLOMA = "DAE/Diploma", "DAE/Diploma"
        BACHELOR = "Bachelor", "Bachelor"
        MASTER = "Master", "Master"
        MS_MPHIL = "MS/MPhil", "MS/MPhil"
        PHD = "PhD", "PhD"
        OTHER = "Other", "Other"

    class ResultStatus(models.TextChoices):
        COMPLETED = "Completed", "Completed"
        FINAL_YEAR = "Final Year", "Final Year"
        IN_PROGRESS = "In Progress", "In Progress"
        WAITING = "Waiting for Result", "Waiting for Result"
        OTHER = "Other", "Other"

    class GradingSystem(models.TextChoices):
        CGPA_4 = "CGPA_4", "CGPA_4"
        CGPA_5 = "CGPA_5", "CGPA_5"
        PERCENTAGE = "Percentage", "Percentage"
        DIVISION = "Division", "Division"
        OTHER = "Other", "Other"

    class TargetDegree(models.TextChoices):
        UNDERGRADUATE = "Undergraduate", "Undergraduate"
        MASTER = "Master", "Master"
        PHD = "PhD", "PhD"
        POSTDOC = "Postdoc", "Postdoc"
        EXCHANGE = "Exchange", "Exchange"
        SHORT_COURSE = "Short Course", "Short Course"
        DIPLOMA = "Diploma/Certificate", "Diploma/Certificate"

    class StudyMode(models.TextChoices):
        ON_CAMPUS = "On-campus", "On-campus"
        ONLINE = "Online", "Online"
        HYBRID = "Hybrid", "Hybrid"
        ANY = "Any", "Any"

    class FundingPreference(models.TextChoices):
        FULLY_FUNDED = "Fully Funded Only", "Fully Funded Only"
        PARTIAL = "Partial Funding Acceptable", "Partial Funding Acceptable"
        LOW_TUITION = "Low Tuition", "Low Tuition"
        SELF_FUNDED = "Self-Funded Possible", "Self-Funded Possible"
        ANY = "Any", "Any"

    class ApplicationFeePreference(models.TextChoices):
        NO_FEE = "No Application Fee Only", "No Application Fee Only"
        LOW_FEE = "Low Application Fee", "Low Application Fee"
        CAN_PAY = "Can Pay Application Fee", "Can Pay Application Fee"
        ANY = "Any", "Any"

    class LanguageInstruction(models.TextChoices):
        ENGLISH = "English Only", "English Only"
        CHINESE = "Chinese Acceptable", "Chinese Acceptable"
        TURKISH = "Turkish Acceptable", "Turkish Acceptable"
        GERMAN = "German Acceptable", "German Acceptable"
        ANY = "Any", "Any"

    class ProfileSource(models.TextChoices):
        MANUAL = "manual", "Manual"
        CV_IMPORTED = "cv_imported", "CV imported"
        ADMIN_CREATED = "admin_created", "Admin created"
        MIXED = "mixed", "Mixed"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="student_profile",
    )
    phone_number = models.CharField(max_length=30, blank=True)
    whatsapp_number = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    nationality_country = models.ForeignKey(
        "reference_data.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="nationality_profiles",
    )
    current_country_ref = models.ForeignKey(
        "reference_data.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="current_country_profiles",
    )
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=80, choices=Province.choices, blank=True)
    domicile = models.CharField(max_length=100, blank=True)

    current_education_level = models.CharField(
        max_length=50, choices=EducationLevel.choices, blank=True
    )
    current_institution = models.CharField(max_length=200, blank=True)
    current_study_field_ref = models.ForeignKey(
        "reference_data.StudyField",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="current_field_profiles",
    )
    custom_current_study_field = models.CharField(max_length=150, blank=True)
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    result_status = models.CharField(max_length=50, choices=ResultStatus.choices, blank=True)
    grading_system = models.CharField(max_length=30, choices=GradingSystem.choices, blank=True)
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    division = models.CharField(max_length=50, blank=True)

    target_degree_level = models.CharField(max_length=50, choices=TargetDegree.choices, blank=True)
    target_study_field_refs = models.ManyToManyField(
        "reference_data.StudyField",
        blank=True,
        related_name="target_field_profiles",
    )
    custom_target_study_fields = models.JSONField(default=list, blank=True)
    target_country_refs = models.ManyToManyField(
        "reference_data.Country",
        blank=True,
        related_name="target_country_profiles",
    )
    preferred_intake = models.CharField(max_length=100, blank=True)
    study_mode_preference = models.CharField(max_length=50, choices=StudyMode.choices, blank=True)
    funding_preference = models.CharField(
        max_length=60, choices=FundingPreference.choices, blank=True
    )
    application_fee_preference = models.CharField(
        max_length=60, choices=ApplicationFeePreference.choices, blank=True
    )
    language_instruction_preference = models.CharField(
        max_length=80, choices=LanguageInstruction.choices, blank=True
    )

    has_ielts = models.BooleanField(default=False)
    ielts_score = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    has_toefl = models.BooleanField(default=False)
    toefl_score = models.PositiveIntegerField(null=True, blank=True)
    has_duolingo = models.BooleanField(default=False)
    duolingo_score = models.PositiveIntegerField(null=True, blank=True)
    has_pte = models.BooleanField(default=False)
    pte_score = models.PositiveIntegerField(null=True, blank=True)
    has_hsk = models.BooleanField(default=False)
    hsk_level = models.CharField(max_length=20, blank=True)
    has_gre = models.BooleanField(default=False)
    gre_score = models.PositiveIntegerField(null=True, blank=True)
    has_gmat = models.BooleanField(default=False)
    gmat_score = models.PositiveIntegerField(null=True, blank=True)
    english_proficiency_certificate = models.BooleanField(default=False)

    has_cnic = models.BooleanField(default=False)
    has_domicile = models.BooleanField(default=False)
    has_passport = models.BooleanField(default=False)
    passport_expiry_date = models.DateField(null=True, blank=True)
    has_transcript = models.BooleanField(default=False)
    has_degree = models.BooleanField(default=False)
    has_cv = models.BooleanField(default=False)
    has_sop = models.BooleanField(default=False)
    has_study_plan = models.BooleanField(default=False)
    has_recommendation_letters = models.BooleanField(default=False)
    recommendation_letters_count = models.PositiveIntegerField(default=0)
    has_research_proposal = models.BooleanField(default=False)
    has_publications = models.BooleanField(default=False)
    has_english_proficiency_letter = models.BooleanField(default=False)
    has_income_certificate = models.BooleanField(default=False)
    has_bank_statement = models.BooleanField(default=False)
    has_police_clearance = models.BooleanField(default=False)
    has_medical_certificate = models.BooleanField(default=False)
    additional_documents = models.JSONField(default=list, blank=True)

    research_interests = models.JSONField(default=list, blank=True)
    has_research_experience = models.BooleanField(default=False)
    publications_count = models.PositiveIntegerField(default=0)
    has_supervisor_acceptance = models.BooleanField(default=False)
    supervisor_country_ref = models.ForeignKey(
        "reference_data.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="supervisor_country_profiles",
    )
    custom_supervisor_country = models.CharField(max_length=100, blank=True)
    supervisor_university = models.CharField(max_length=200, blank=True)

    skills = models.JSONField(default=list, blank=True)
    work_experience_years = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    has_internship_experience = models.BooleanField(default=False)
    linkedin_url = models.URLField(blank=True)
    portfolio_url = models.URLField(blank=True)
    github_url = models.URLField(blank=True)

    need_based_support_required = models.BooleanField(default=False)
    can_pay_application_fee = models.BooleanField(default=False)
    max_application_fee_usd = models.PositiveIntegerField(null=True, blank=True)
    can_self_fund_partial = models.BooleanField(default=False)
    special_scholarship_categories = models.JSONField(default=list, blank=True)

    email_alerts_enabled = models.BooleanField(default=True)
    whatsapp_alerts_enabled = models.BooleanField(default=False)
    profile_data_consent = models.BooleanField(default=False)

    profile_source = models.CharField(
        max_length=50,
        choices=ProfileSource.choices,
        default=ProfileSource.MANUAL,
        blank=True,
    )
    ai_autofill_reviewed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def nationality(self):
        return self.nationality_country.name if self.nationality_country else "Pakistan"

    @nationality.setter
    def nationality(self, value):
        from apps.reference_data.models import Country

        value = str(value or "").strip() or "Pakistan"
        self.nationality_country = Country.objects.filter(is_active=True, name__iexact=value).first()

    @property
    def current_country(self):
        return self.current_country_ref.name if self.current_country_ref else "Pakistan"

    @current_country.setter
    def current_country(self, value):
        from apps.reference_data.models import Country

        value = str(value or "").strip() or "Pakistan"
        self.current_country_ref = Country.objects.filter(is_active=True, name__iexact=value).first()

    @property
    def current_field_of_study(self):
        if self.current_study_field_ref:
            return self.current_study_field_ref.name

        return self.custom_current_study_field

    @current_field_of_study.setter
    def current_field_of_study(self, value):
        from apps.reference_data.models import StudyField

        value = str(value or "").strip()

        if not value:
            self.current_study_field_ref = None
            self.custom_current_study_field = ""
            return

        study_field = StudyField.objects.filter(is_active=True, name__iexact=value).first()
        self.current_study_field_ref = study_field
        self.custom_current_study_field = "" if study_field else value

    @property
    def target_countries(self):
        if not self.pk:
            return list(getattr(self, "_pending_target_countries", []))

        return list(self.target_country_refs.values_list("name", flat=True))

    @target_countries.setter
    def target_countries(self, value):
        self._pending_target_countries = value if isinstance(value, list) else value

    @property
    def target_fields(self):
        if not self.pk:
            return list(getattr(self, "_pending_target_fields", [])) or list(self.custom_target_study_fields or [])

        known_fields = list(self.target_study_field_refs.values_list("name", flat=True))
        custom_fields = list(self.custom_target_study_fields or [])

        return known_fields + [field for field in custom_fields if field not in known_fields]

    @target_fields.setter
    def target_fields(self, value):
        self._pending_target_fields = value if isinstance(value, list) else value

    @property
    def supervisor_country(self):
        if self.supervisor_country_ref:
            return self.supervisor_country_ref.name

        return self.custom_supervisor_country

    @supervisor_country.setter
    def supervisor_country(self, value):
        from apps.reference_data.models import Country

        value = str(value or "").strip()

        if not value:
            self.supervisor_country_ref = None
            self.custom_supervisor_country = ""
            return

        country = Country.objects.filter(is_active=True, name__iexact=value).first()
        self.supervisor_country_ref = country
        self.custom_supervisor_country = "" if country else value

    def _clean_pending_list(self, value):
        if value in (None, ""):
            return []

        if not isinstance(value, list):
            return []

        cleaned = []
        seen = set()

        for item in value:
            if not isinstance(item, str):
                continue

            item = item.strip()

            if not item:
                continue

            key = item.casefold()

            if key not in seen:
                cleaned.append(item)
                seen.add(key)

        return cleaned

    def _apply_pending_reference_lists(self):
        if not self.pk:
            return

        from apps.reference_data.models import Country, StudyField

        if hasattr(self, "_pending_target_countries"):
            countries = Country.objects.filter(
                is_active=True,
                name__in=self._clean_pending_list(self._pending_target_countries),
            )
            self.target_country_refs.set(countries)
            delattr(self, "_pending_target_countries")

        if hasattr(self, "_pending_target_fields"):
            field_names = self._clean_pending_list(self._pending_target_fields)
            known_fields = list(StudyField.objects.filter(is_active=True, name__in=field_names))
            known_names = {field.name.casefold() for field in known_fields}
            custom_fields = [name for name in field_names if name.casefold() not in known_names]

            self.target_study_field_refs.set(known_fields)
            type(self).objects.filter(pk=self.pk).update(custom_target_study_fields=custom_fields)
            self.custom_target_study_fields = custom_fields
            delattr(self, "_pending_target_fields")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._apply_pending_reference_lists()

    def __str__(self) -> str:
        return f"{self.user.email} opportunity profile"

    def _has_academic_score(self):
        return bool(self.cgpa or self.percentage or self.division)

    def _has_language_status(self):
        return any(
            [
                self.has_ielts,
                self.has_toefl,
                self.has_duolingo,
                self.has_pte,
                self.has_hsk,
                self.has_gre,
                self.has_gmat,
                self.english_proficiency_certificate,
            ]
        )

    def _has_english_proof(self):
        return any(
            [
                self.has_ielts,
                self.has_toefl,
                self.has_duolingo,
                self.has_pte,
                self.english_proficiency_certificate,
                self.has_english_proficiency_letter,
            ]
        )

    @property
    def completion_percentage(self):
        score = 0

        score += 3 if self.nationality and self.current_country else 0
        score += 3 if self.city else 0
        score += 3 if self.province else 0
        score += 3 if self.domicile else 0
        score += 3 if self.phone_number or self.whatsapp_number else 0

        score += 4 if self.current_education_level else 0
        score += 3 if self.current_institution else 0
        score += 4 if self.current_field_of_study else 0
        score += 4 if self.target_degree_level else 0
        score += 5 if self.grading_system and self._has_academic_score() else 0

        score += 5 if self.target_countries else 0
        score += 5 if self.target_fields else 0
        score += 4 if self.funding_preference else 0
        score += 3 if self.preferred_intake else 0
        score += 3 if self.application_fee_preference else 0

        score += 5 if self._has_language_status() else 0
        score += 5 if self._has_english_proof() or (self.has_hsk and self.hsk_level) else 0

        score += 4 if self.has_cnic or self.has_domicile or self.has_passport else 0
        score += 4 if self.has_transcript or self.has_degree else 0
        score += 3 if self.has_cv else 0
        score += 4 if self.has_sop or self.has_study_plan else 0
        score += (
            5
            if self.has_recommendation_letters
            or self.has_research_proposal
            or self.has_publications
            else 0
        )

        score += 4 if self.research_interests or self.skills else 0
        score += (
            3
            if self.has_research_experience
            or self.work_experience_years
            or self.has_internship_experience
            else 0
        )
        score += (
            3
            if self.linkedin_url
            or self.portfolio_url
            or self.github_url
            or self.publications_count
            or self.has_supervisor_acceptance
            else 0
        )

        score += 3 if self.profile_data_consent else 0
        score += 2 if self.email_alerts_enabled or self.whatsapp_alerts_enabled else 0

        return min(score, 100)

    @property
    def scholarship_readiness_score(self):
        score = 0
        score += 15 if self.has_passport else 0
        score += 15 if self.has_transcript else 0
        score += (
            10
            if self.has_degree
            or self.result_status
            in [
                self.ResultStatus.IN_PROGRESS,
                self.ResultStatus.FINAL_YEAR,
                self.ResultStatus.WAITING,
            ]
            else 0
        )
        score += 15 if self.has_cv else 0
        score += 15 if self.has_sop or self.has_study_plan else 0
        score += 10 if self.recommendation_letters_count >= 2 else 0
        score += 10 if self._has_english_proof() else 0
        score += 5 if self.target_countries and self.target_degree_level else 0
        score += 5 if self.profile_data_consent else 0
        return min(score, 100)

    @property
    def readiness_level(self):
        score = self.scholarship_readiness_score
        if score >= 70:
            return "High"
        if score >= 40:
            return "Medium"
        return "Low"

    @property
    def missing_profile_fields(self):
        missing = []
        checks = [
            ("City", self.city),
            ("Province", self.province),
            ("Domicile", self.domicile),
            ("Current education level", self.current_education_level),
            ("Current institution", self.current_institution),
            ("Current field of study", self.current_field_of_study),
            ("Target degree level", self.target_degree_level),
            ("Target countries", self.target_countries),
            ("Target fields", self.target_fields),
            ("Academic score", self._has_academic_score()),
            ("Funding preference", self.funding_preference),
            ("Preferred intake", self.preferred_intake),
            ("Language test information", self._has_language_status()),
            ("Available documents", self.has_cnic or self.has_passport or self.has_cv),
            ("Profile data consent", self.profile_data_consent),
        ]
        for label, value in checks:
            if not value:
                missing.append(label)
        return missing

    @property
    def missing_core_documents(self):
        missing = []
        if not self.has_cnic:
            missing.append("CNIC")
        if not self.has_domicile:
            missing.append("Domicile")
        if not self.has_passport:
            missing.append("Passport")
        if not self.has_transcript:
            missing.append("Transcript")
        if not self.has_degree:
            missing.append("Degree")
        if not self.has_cv:
            missing.append("CV")
        if not (self.has_sop or self.has_study_plan):
            missing.append("SOP or Study Plan")
        if self.recommendation_letters_count < 2:
            missing.append("Recommendation Letters")
        if not self._has_english_proof():
            missing.append("English Proficiency / IELTS / TOEFL / Duolingo / PTE")
        if (
            self.target_degree_level
            in [self.TargetDegree.PHD, self.TargetDegree.MASTER, "MS/MPhil"]
            and not self.has_research_proposal
        ):
            missing.append("Research Proposal")
        return missing
