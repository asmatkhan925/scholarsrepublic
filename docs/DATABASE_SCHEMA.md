# Database Schema

Database: PostgreSQL

Phase 1 creates the Django project and app boundaries. MVP models are
implemented phase by phase.

Implemented main models:

- `users.User`
- `profiles.StudentProfile`
- `opportunities.Opportunity`

Planned main models:

- `applications.SavedOpportunity`
- `applications.Application`
- `services.ServiceRequest`
- `blog.BlogPost`

Main models should include `created_at` and `updated_at` timestamps where applicable.

## `users.User`

Custom user model for email login.

Important fields:

- `email`
- `full_name`
- `role`: `student` or `admin`
- `is_active`
- `is_staff`
- `is_superuser`
- `date_joined`
- `created_at`
- `updated_at`

## `profiles.StudentProfile`

One scholarship readiness profile per student.

Relationship:

- `user`: one-to-one relationship to `users.User`, related name `student_profile`

Basic identity and location:

- `phone_number`
- `whatsapp_number`
- `date_of_birth`
- `nationality`
- `current_country`
- `city`
- `province`
- `domicile`

Current education:

- `current_education_level`
- `current_institution`
- `current_field_of_study`
- `graduation_year`
- `result_status`
- `grading_system`
- `cgpa`
- `percentage`
- `division`

Target study plan:

- `target_degree_level`
- `target_fields`
- `target_countries`
- `preferred_intake`
- `study_mode_preference`
- `funding_preference`
- `application_fee_preference`
- `language_instruction_preference`

Language tests:

- `has_ielts`, `ielts_score`
- `has_toefl`, `toefl_score`
- `has_duolingo`, `duolingo_score`
- `has_pte`, `pte_score`
- `has_hsk`, `hsk_level`
- `has_gre`, `gre_score`
- `has_gmat`, `gmat_score`
- `english_proficiency_certificate`

Document readiness:

- `has_cnic`
- `has_domicile`
- `has_passport`
- `passport_expiry_date`
- `has_transcript`
- `has_degree`
- `has_cv`
- `has_sop`
- `has_study_plan`
- `has_recommendation_letters`
- `recommendation_letters_count`
- `has_research_proposal`
- `has_publications`
- `has_english_proficiency_letter`
- `has_income_certificate`
- `has_bank_statement`
- `has_police_clearance`
- `has_medical_certificate`
- `additional_documents`

Research, skills, and career:

- `research_interests`
- `has_research_experience`
- `publications_count`
- `has_supervisor_acceptance`
- `supervisor_country`
- `supervisor_university`
- `skills`
- `work_experience_years`
- `has_internship_experience`
- `linkedin_url`
- `portfolio_url`
- `github_url`

Financial preferences and eligibility categories:

- `need_based_support_required`
- `can_pay_application_fee`
- `max_application_fee_usd`
- `can_self_fund_partial`
- `special_scholarship_categories`

Communication and consent:

- `email_alerts_enabled`
- `whatsapp_alerts_enabled`
- `profile_data_consent`

AI-ready metadata:

- `profile_source`: `manual`, `cv_imported`, `admin_created`, or `mixed`
- `ai_autofill_reviewed`

Computed outputs:

- `completion_percentage`
- `scholarship_readiness_score`
- `readiness_level`
- `missing_profile_fields`
- `missing_core_documents`

## `opportunities.Opportunity`

Flexible opportunity model. Scholarships are the first MVP opportunity type.

Identity and status:

- `title`
- `slug`
- `opportunity_type`: scholarship, job, internship, fellowship, exchange program,
  research position, admission, competition, training, mentorship program
- `status`: draft, published, archived
- `featured`
- `verified_status`
- `verification_note`
- `last_verified_at`

Provider and organization:

- `provider_name`
- `organization_type`
- `university_name`
- `company_name`
- `country`
- `city`
- `location_type`

Content:

- `short_description`
- `description`
- `benefits`
- `eligibility`
- `how_to_apply`
- `official_link`
- `source_url`
- `source_name`

Eligibility and target audience:

- `eligible_countries`
- `degree_levels`
- `fields_of_study`
- `target_regions`
- `gender_eligibility`
- `min_cgpa`
- `min_percentage`
- `min_education_level`

Scholarship-specific fields:

- `funding_type`
- `funding_amount`
- `funding_currency`
- `application_fee_required`
- `application_fee_amount`
- `application_fee_currency`
- `hec_required`
- `ielts_required`
- `toefl_required`
- `duolingo_required`
- `hsk_required`
- `english_proficiency_certificate_accepted`

Job and internship future fields:

- `employment_type`
- `experience_level`
- `min_experience_years`
- `required_skills`
- `salary_min`
- `salary_max`
- `salary_currency`

Deadline and application:

- `deadline`
- `is_rolling_deadline`
- `application_open_date`
- `application_method`
- `required_documents`

Classification and search:

- `tags`
- `search_keywords`

Computed model properties:

- `is_published`
- `is_expired`
- `days_until_deadline`
- `is_scholarship`
- `is_job`
- `is_internship`

Indexes:

- `opportunity_type`
- `status`
- `country`
- `deadline`
- `featured`
- `verified_status`
- `funding_type`
- `created_at`
