from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class OpportunityPathway(models.Model):
    class PathwayType(models.TextChoices):
        COUNTRY_HUB = "country_hub", "Country hub"
        GOVERNMENT_PROGRAM = "government_program", "Government program"
        SCHOLARSHIP_PROGRAM = "scholarship_program", "Scholarship program"
        APPLICATION_TRACK = "application_track", "Application track"
        UNIVERSITY_GROUP = "university_group", "University group"
        PROFESSOR_LAB_GROUP = "professor_lab_group", "Professor/lab group"
        REGIONAL_SCHOLARSHIP = "regional_scholarship", "Regional scholarship"
        UNIVERSITY_SCHOLARSHIP = "university_scholarship", "University scholarship"
        GUIDE = "guide", "Guide"
        OTHER = "other", "Other"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    country_ref = models.ForeignKey(
        "reference_data.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="opportunity_pathways",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    pathway_type = models.CharField(
        max_length=80,
        choices=PathwayType.choices,
        default=PathwayType.OTHER,
        db_index=True,
    )
    description = models.TextField(blank=True)
    official_link = models.URLField(blank=True)
    display_order = models.PositiveIntegerField(default=100, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("display_order", "title")
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["country_ref"]),
            models.Index(fields=["pathway_type"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self) -> str:
        return self.title

    def clean(self):
        if self.pk and self.parent_id == self.pk:
            raise ValidationError({"parent": "A pathway cannot be its own parent."})

    @property
    def full_path(self):
        titles = []
        current = self
        seen = set()

        while current and current.pk not in seen:
            titles.append(current.title)
            seen.add(current.pk)
            current = current.parent

        return " > ".join(reversed(titles))


class Opportunity(models.Model):
    class OpportunityType(models.TextChoices):
        SCHOLARSHIP = "scholarship", "Scholarship"
        JOB = "job", "Job"
        INTERNSHIP = "internship", "Internship"
        FELLOWSHIP = "fellowship", "Fellowship"
        EXCHANGE_PROGRAM = "exchange_program", "Exchange program"
        RESEARCH_POSITION = "research_position", "Research position"
        ADMISSION = "admission", "Admission"
        COMPETITION = "competition", "Competition"
        TRAINING = "training", "Training"
        MENTORSHIP_PROGRAM = "mentorship_program", "Mentorship program"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class OrganizationType(models.TextChoices):
        UNIVERSITY = "university", "University"
        GOVERNMENT = "government", "Government"
        COMPANY = "company", "Company"
        NGO = "ngo", "NGO"
        FOUNDATION = "foundation", "Foundation"
        INTERNATIONAL = "international_organization", "International organization"
        PRIVATE_PROVIDER = "private_provider", "Private provider"
        OTHER = "other", "Other"

    class LocationType(models.TextChoices):
        ON_SITE = "on_site", "On-site"
        REMOTE = "remote", "Remote"
        HYBRID = "hybrid", "Hybrid"
        NOT_APPLICABLE = "not_applicable", "Not applicable"

    class GenderEligibility(models.TextChoices):
        ALL = "all", "All"
        WOMEN_ONLY = "women_only", "Women only"
        MEN_ONLY = "men_only", "Men only"
        NOT_SPECIFIED = "not_specified", "Not specified"

    class FundingType(models.TextChoices):
        FULLY_FUNDED = "fully_funded", "Fully funded"
        PARTIALLY_FUNDED = "partially_funded", "Partially funded"
        TUITION_WAIVER = "tuition_waiver", "Tuition waiver"
        STIPEND_ONLY = "stipend_only", "Stipend only"
        NEED_BASED = "need_based", "Need based"
        MERIT_BASED = "merit_based", "Merit based"
        SELF_FUNDED = "self_funded", "Self funded"
        OTHER = "other", "Other"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "full_time", "Full time"
        PART_TIME = "part_time", "Part time"
        CONTRACT = "contract", "Contract"
        INTERNSHIP = "internship", "Internship"
        VOLUNTEER = "volunteer", "Volunteer"
        FREELANCE = "freelance", "Freelance"
        TEMPORARY = "temporary", "Temporary"
        NOT_APPLICABLE = "not_applicable", "Not applicable"

    class ExperienceLevel(models.TextChoices):
        ENTRY_LEVEL = "entry_level", "Entry level"
        STUDENT = "student", "Student"
        FRESH_GRADUATE = "fresh_graduate", "Fresh graduate"
        MID_LEVEL = "mid_level", "Mid level"
        SENIOR = "senior", "Senior"
        NOT_APPLICABLE = "not_applicable", "Not applicable"

    class ApplicationMethod(models.TextChoices):
        OFFICIAL_WEBSITE = "official_website", "Official website"
        EMAIL = "email", "Email"
        HEC_PORTAL = "hec_portal", "HEC portal"
        UNIVERSITY_PORTAL = "university_portal", "University portal"
        COMPANY_PORTAL = "company_portal", "Company portal"
        EXTERNAL_FORM = "external_form", "External form"
        OTHER = "other", "Other"

    class ApplicationTrack(models.TextChoices):
        EMBASSY = "embassy", "Embassy"
        UNIVERSITY = "university", "University"
        DIRECT = "direct", "Direct"
        PROFESSOR = "professor", "Professor"
        REGIONAL = "regional", "Regional"
        PORTAL = "portal", "Portal"
        OTHER = "other", "Other"

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    opportunity_type = models.CharField(
        max_length=50,
        choices=OpportunityType.choices,
        default=OpportunityType.SCHOLARSHIP,
        db_index=True,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    featured = models.BooleanField(default=False, db_index=True)
    verified_status = models.BooleanField(default=False, db_index=True)
    verification_note = models.CharField(max_length=255, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    provider_name = models.CharField(max_length=255, blank=True)
    organization_type = models.CharField(
        max_length=80, choices=OrganizationType.choices, blank=True
    )
    university_name = models.CharField(max_length=255, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    country_ref = models.ForeignKey(
        "reference_data.Country",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="opportunities",
    )
    city = models.CharField(max_length=120, blank=True)
    location_type = models.CharField(max_length=50, choices=LocationType.choices, blank=True)

    short_description = models.TextField(blank=True)
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    eligibility = models.TextField(blank=True)
    how_to_apply = models.TextField(blank=True)
    official_link = models.URLField(blank=True)
    source_url = models.URLField(blank=True)
    source_name = models.CharField(max_length=255, blank=True)

    pathway = models.ForeignKey(
        "opportunities.OpportunityPathway",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opportunities",
    )
    application_track = models.CharField(
        max_length=80,
        choices=ApplicationTrack.choices,
        blank=True,
        db_index=True,
    )
    department_name = models.CharField(max_length=255, blank=True)
    lab_name = models.CharField(max_length=255, blank=True)
    professor_name = models.CharField(max_length=255, blank=True)
    professor_email = models.EmailField(blank=True)

    eligible_country_refs = models.ManyToManyField(
        "reference_data.Country",
        blank=True,
        related_name="eligible_opportunities",
    )
    eligible_region_refs = models.ManyToManyField(
        "reference_data.Region",
        blank=True,
        related_name="eligible_opportunities",
    )
    degree_levels = models.JSONField(default=list, blank=True)
    study_field_refs = models.ManyToManyField(
        "reference_data.StudyField",
        blank=True,
        related_name="opportunities",
    )
    all_study_fields = models.BooleanField(default=False, db_index=True)
    gender_eligibility = models.CharField(
        max_length=50,
        choices=GenderEligibility.choices,
        default=GenderEligibility.NOT_SPECIFIED,
        blank=True,
    )
    min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    min_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_education_level = models.CharField(max_length=80, blank=True)

    funding_type = models.CharField(
        max_length=80, choices=FundingType.choices, blank=True, db_index=True
    )
    funding_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    funding_currency = models.CharField(max_length=10, blank=True)
    application_fee_required = models.BooleanField(default=False)
    application_fee_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    application_fee_currency = models.CharField(max_length=10, blank=True)
    hec_required = models.BooleanField(default=False)
    ielts_required = models.BooleanField(default=False)
    toefl_required = models.BooleanField(default=False)
    duolingo_required = models.BooleanField(default=False)
    hsk_required = models.BooleanField(default=False)
    english_proficiency_certificate_accepted = models.BooleanField(default=False)

    employment_type = models.CharField(max_length=80, choices=EmploymentType.choices, blank=True)
    experience_level = models.CharField(max_length=80, choices=ExperienceLevel.choices, blank=True)
    min_experience_years = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True
    )
    required_skills = models.JSONField(default=list, blank=True)
    salary_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    salary_currency = models.CharField(max_length=10, blank=True)

    deadline = models.DateField(null=True, blank=True, db_index=True)
    is_rolling_deadline = models.BooleanField(default=False)
    application_open_date = models.DateField(null=True, blank=True)
    application_method = models.CharField(
        max_length=80, choices=ApplicationMethod.choices, blank=True
    )
    required_documents = models.JSONField(default=list, blank=True)

    tags = models.JSONField(default=list, blank=True)
    search_keywords = models.TextField(blank=True)

    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-featured", "deadline", "-published_at")
        indexes = [
            models.Index(fields=["opportunity_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["country_ref"]),
            models.Index(fields=["deadline"]),
            models.Index(fields=["featured"]),
            models.Index(fields=["verified_status"]),
            models.Index(fields=["funding_type"]),
            models.Index(fields=["created_at"]),
        ]

    @property
    def country(self):
        return self.country_ref.name if self.country_ref else ""

    @country.setter
    def country(self, value):
        from apps.reference_data.models import Country

        value = str(value or "").strip()

        if not value:
            self.country_ref = None
            return

        self.country_ref = Country.objects.filter(is_active=True, name__iexact=value).first()

    @property
    def eligible_countries(self):
        if not self.pk:
            return list(getattr(self, "_pending_eligible_countries", []))

        return list(self.eligible_country_refs.values_list("name", flat=True))

    @eligible_countries.setter
    def eligible_countries(self, value):
        self._pending_eligible_countries = value if isinstance(value, list) else value

    @property
    def fields_of_study(self):
        if self.all_study_fields:
            return ["All Fields"]

        if not self.pk:
            return list(getattr(self, "_pending_fields_of_study", []))

        return list(self.study_field_refs.values_list("name", flat=True))

    @fields_of_study.setter
    def fields_of_study(self, value):
        self._pending_fields_of_study = value if isinstance(value, list) else value

    @property
    def target_regions(self):
        if not self.pk:
            return list(getattr(self, "_pending_target_regions", []))

        return list(self.eligible_region_refs.values_list("name", flat=True))

    @target_regions.setter
    def target_regions(self, value):
        self._pending_target_regions = value if isinstance(value, list) else value

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

        from apps.reference_data.models import Country, Region, StudyField

        if hasattr(self, "_pending_eligible_countries"):
            countries = Country.objects.filter(
                is_active=True,
                name__in=self._clean_pending_list(self._pending_eligible_countries),
            )
            self.eligible_country_refs.set(countries)
            delattr(self, "_pending_eligible_countries")

        if hasattr(self, "_pending_target_regions"):
            regions = Region.objects.filter(
                is_active=True,
                name__in=self._clean_pending_list(self._pending_target_regions),
            )
            self.eligible_region_refs.set(regions)
            delattr(self, "_pending_target_regions")

        if hasattr(self, "_pending_fields_of_study"):
            field_names = self._clean_pending_list(self._pending_fields_of_study)
            normalized_names = {name.casefold() for name in field_names}

            if {"all fields", "all", "any"} & normalized_names:
                type(self).objects.filter(pk=self.pk).update(all_study_fields=True)
                self.all_study_fields = True
                self.study_field_refs.clear()
            else:
                fields = StudyField.objects.filter(is_active=True, name__in=field_names)
                self.study_field_refs.set(fields)
                if self.all_study_fields:
                    type(self).objects.filter(pk=self.pk).update(all_study_fields=False)
                    self.all_study_fields = False

            delattr(self, "_pending_fields_of_study")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self._apply_pending_reference_lists()

    def __str__(self) -> str:
        return self.title

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED

    @property
    def is_expired(self):
        if self.status == self.Status.ARCHIVED:
            return True
        if self.is_rolling_deadline or not self.deadline:
            return False
        return self.deadline < timezone.localdate()

    @property
    def days_until_deadline(self):
        if not self.deadline:
            return None
        return (self.deadline - timezone.localdate()).days

    @property
    def is_scholarship(self):
        return self.opportunity_type == self.OpportunityType.SCHOLARSHIP

    @property
    def is_job(self):
        return self.opportunity_type == self.OpportunityType.JOB

    @property
    def is_internship(self):
        return self.opportunity_type == self.OpportunityType.INTERNSHIP

    def clean(self):
        errors = {}

        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                errors["salary_min"] = "Minimum salary cannot exceed maximum salary."

        for field_name in [
            "min_cgpa",
            "application_fee_amount",
            "funding_amount",
            "salary_min",
            "salary_max",
            "min_experience_years",
        ]:
            value = getattr(self, field_name)
            if value is not None and value < 0:
                errors[field_name] = "Cannot be negative."

        if self.min_percentage is not None and not (0 <= self.min_percentage <= 100):
            errors["min_percentage"] = "Must be between 0 and 100."

        for field_name in [
            "eligible_countries",
            "degree_levels",
            "fields_of_study",
            "target_regions",
            "required_skills",
            "required_documents",
            "tags",
        ]:
            if not isinstance(getattr(self, field_name), list):
                errors[field_name] = "Must be a list."

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:250] or "opportunity"
            slug = base_slug
            counter = 2
            while Opportunity.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"[:280]
                counter += 1
            self.slug = slug

        now = timezone.now()
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = now
        if self.verified_status and self.last_verified_at is None:
            self.last_verified_at = now

        self.full_clean()
        super().save(*args, **kwargs)


class OpportunityComment(models.Model):
    opportunity = models.ForeignKey(
        "opportunities.Opportunity",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="opportunity_comments",
    )
    parent = models.ForeignKey(
        "opportunities.OpportunityComment",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    body = models.TextField(max_length=2000)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [
            models.Index(fields=["opportunity", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["parent", "created_at"]),
            models.Index(fields=["is_deleted"]),
        ]

    def __str__(self) -> str:
        return f"Comment by {self.user.email} on {self.opportunity.title}"

    def clean(self):
        errors = {}

        if self.opportunity_id and self.opportunity.status != Opportunity.Status.PUBLISHED:
            errors["opportunity"] = "Comments are only allowed on published opportunities."

        if self.parent_id:
            if self.parent.parent_id is not None:
                errors["parent"] = "Nested replies deeper than one level are not allowed."

            if self.parent.opportunity_id != self.opportunity_id:
                errors["parent"] = "Reply must belong to the same opportunity."

        if errors:
            raise ValidationError(errors)

    def soft_delete(self):
        self.is_deleted = True
        self.body = ""
        self.save(update_fields=["is_deleted", "body", "updated_at"])
