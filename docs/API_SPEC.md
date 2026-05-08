# API Spec

Base URL in development: `http://localhost:8000/api`

## Phase 1

### Health Check

`GET /api/health/`

Response:

```json
{
  "status": "ok",
  "message": "Scholars Republic API is running"
}
```

## Phase 2

### Register Student

`POST /api/auth/register/`

Request:

```json
{
  "full_name": "Ali Khan",
  "email": "ali@example.com",
  "password": "StrongPassword123!",
  "password_confirm": "StrongPassword123!"
}
```

Response `201`:

```json
{
  "user": {
    "id": 1,
    "email": "ali@example.com",
    "full_name": "Ali Khan",
    "role": "student",
    "is_active": true,
    "date_joined": "2026-05-07T00:00:00Z"
  },
  "tokens": {
    "access": "...",
    "refresh": "..."
  }
}
```

### Login

`POST /api/auth/login/`

Request:

```json
{
  "email": "ali@example.com",
  "password": "StrongPassword123!"
}
```

Response `200`:

```json
{
  "user": {
    "id": 1,
    "email": "ali@example.com",
    "full_name": "Ali Khan",
    "role": "student",
    "is_active": true,
    "date_joined": "2026-05-07T00:00:00Z"
  },
  "tokens": {
    "access": "...",
    "refresh": "..."
  }
}
```

### Current User

`GET /api/auth/me/`

Requires JWT authentication.

Response `200`:

```json
{
  "id": 1,
  "email": "ali@example.com",
  "full_name": "Ali Khan",
  "role": "student",
  "is_active": true,
  "date_joined": "2026-05-07T00:00:00Z"
}
```

### Logout

`POST /api/auth/logout/`

Requires JWT authentication. JWT logout is client-side for the MVP.

Response `200`:

```json
{
  "detail": "Logged out successfully."
}
```

## Phase 3

All profile endpoints require JWT authentication. Admin users receive `403`
because admin accounts do not need student profiles.

### Student Profile

`GET /api/profile/`

Returns the current student's scholarship readiness profile. If the student has
not created a profile yet, the API returns `404`:

```json
{
  "detail": "Student profile has not been created yet."
}
```

`POST /api/profile/`

Creates the current student's profile. The `user` field is always taken from the
authenticated request and cannot be assigned by the client.

`PUT /api/profile/`

Creates or fully updates the current student's profile.

`PATCH /api/profile/`

Creates or partially updates the current student's profile.

Profile responses include the saved profile fields plus computed readiness
fields:

```json
{
  "id": 1,
  "user": 1,
  "nationality": "Pakistan",
  "city": "Lahore",
  "current_education_level": "Bachelor",
  "target_degree_level": "Master",
  "target_countries": ["China", "Taiwan"],
  "has_passport": true,
  "has_transcript": true,
  "has_cv": true,
  "github_url": "https://github.com/example",
  "profile_source": "manual",
  "ai_autofill_reviewed": false,
  "completion_percentage": 72,
  "scholarship_readiness_score": 65,
  "readiness_level": "Medium",
  "missing_profile_fields": ["Preferred intake"],
  "missing_core_documents": ["Recommendation Letters"],
  "created_at": "2026-05-07T00:00:00Z",
  "updated_at": "2026-05-07T00:00:00Z"
}
```

### Profile Completion

`GET /api/profile/completion/`

Returns completion and readiness summary. If no profile exists yet, scores are
zero and the response includes the core missing fields/documents.

```json
{
  "completion_percentage": 0,
  "scholarship_readiness_score": 0,
  "readiness_level": "Low",
  "missing_profile_fields": [
    "City",
    "Province",
    "Target degree level",
    "Target countries"
  ],
  "missing_core_documents": ["CNIC", "Domicile", "Passport", "Transcript", "CV"]
}
```

## Phase 4

Phase 4 introduces a flexible opportunity database. Scholarships are stored as
opportunities with `opportunity_type = "scholarship"`.

Public endpoints return only `status = "published"` records. Draft and archived
records are hidden publicly.

### Public Opportunities

`GET /api/opportunities/`

Query params:

- `opportunity_type`
- `country`
- `degree_level`
- `field`
- `funding_type`
- `verified=true`
- `featured=true`
- `no_ielts=true`
- `no_application_fee=true`
- `hec_required=true`
- `remote=true`
- `search`
- `ordering=deadline|-deadline|created_at|-created_at|published_at|-published_at`

Paginated response:

```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Chinese Government Scholarship",
      "slug": "chinese-government-scholarship",
      "opportunity_type": "scholarship",
      "status": "published",
      "featured": true,
      "verified_status": false,
      "provider_name": "Chinese Scholarship Council",
      "country": "China",
      "funding_type": "fully_funded",
      "degree_levels": ["Undergraduate", "Master", "PhD"],
      "deadline": "2026-09-04",
      "is_expired": false,
      "days_until_deadline": 120
    }
  ]
}
```

`GET /api/opportunities/{slug}/`

Returns full opportunity details for a published opportunity.

### Public Scholarship Alias

`GET /api/scholarships/`

Returns only published opportunities where `opportunity_type = "scholarship"`.
Supports the same filters as `/api/opportunities/`.

`GET /api/scholarships/{slug}/`

Returns full details for a published scholarship opportunity.

### Admin Opportunity API

Admin users only:

- `GET /api/admin/opportunities/`
- `POST /api/admin/opportunities/`
- `GET /api/admin/opportunities/{id}/`
- `PUT /api/admin/opportunities/{id}/`
- `PATCH /api/admin/opportunities/{id}/`
- `DELETE /api/admin/opportunities/{id}/`

Admin create/update supports all `Opportunity` model fields. Public users and
student users cannot create, update, or delete opportunities.

## Phase 5

Phase 5 adds deterministic, explainable match scoring. Match endpoints require a
logged-in student account with a completed student profile. Guest users can
browse public opportunities but cannot see personalized scores. Admin users do
not need student match scores.

### Opportunity Match

`GET /api/opportunities/{slug}/match/`

Returns a personalized match result for a published opportunity.

`GET /api/scholarships/{slug}/match/`

Scholarship alias that only matches published scholarship opportunities.

Response:

```json
{
  "score": 86,
  "readiness_level": "High",
  "breakdown": {
    "eligibility": 20,
    "degree_level": 15,
    "field_fit": 15,
    "country_preference": 10,
    "funding_fee": 10,
    "language_test": 10,
    "academic_requirement": 7,
    "document_readiness": 4,
    "deadline_safety": 5
  },
  "matched_reasons": ["Pakistani students are eligible."],
  "missing_requirements": ["Study Plan"],
  "warnings": ["Deadline is approaching."],
  "suggestions": ["Prepare Study Plan before applying."]
}
```

If the student has no profile:

```json
{
  "detail": "Complete your student profile to calculate a match score."
}
```

### Recommended Opportunities

`GET /api/opportunities/recommended/`

Returns published opportunities sorted by match score.

`GET /api/scholarships/recommended/`

Scholarship alias that returns published scholarship opportunities sorted by
match score.

Response:

```json
{
  "count": 10,
  "results": [
    {
      "opportunity": {
        "id": 1,
        "title": "Chinese Government Scholarship",
        "slug": "chinese-government-scholarship"
      },
      "match": {
        "score": 86,
        "readiness_level": "High",
        "matched_reasons": [],
        "missing_requirements": [],
        "warnings": [],
        "suggestions": []
      }
    }
  ]
}
```

## Planned MVP Endpoints

- `GET|POST /api/saved-scholarships/`
- `DELETE /api/saved-scholarships/{id}/`
- `GET|POST /api/applications/`
- `GET|PUT|PATCH|DELETE /api/applications/{id}/`
- `GET /api/scholarships/{id}/document-checklist/`
- `GET|POST /api/service-requests/`
- `GET /api/service-requests/{id}/`
- `GET /api/blog/`
- `GET /api/blog/{slug}/`
