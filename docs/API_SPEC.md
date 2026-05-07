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

## Planned MVP Endpoints

- `GET /api/scholarships/`
- `GET /api/scholarships/{slug}/`
- `GET /api/scholarships/recommended/`
- `GET /api/scholarships/{id}/match-score/`
- `GET|POST /api/saved-scholarships/`
- `DELETE /api/saved-scholarships/{id}/`
- `GET|POST /api/applications/`
- `GET|PUT|PATCH|DELETE /api/applications/{id}/`
- `GET /api/scholarships/{id}/document-checklist/`
- `GET|POST /api/service-requests/`
- `GET /api/service-requests/{id}/`
- `GET /api/blog/`
- `GET /api/blog/{slug}/`
