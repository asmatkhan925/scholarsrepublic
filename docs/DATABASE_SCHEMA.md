# Database Schema

Database: PostgreSQL

Phase 1 creates the Django project and app boundaries. MVP models are
implemented phase by phase.

Implemented main models:

- `users.User`
- `profiles.StudentProfile`

Planned main models:

- `scholarships.Scholarship`
- `scholarships.SavedScholarship`
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
