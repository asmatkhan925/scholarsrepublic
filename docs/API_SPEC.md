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

## Planned MVP Endpoints

- `GET|POST|PUT|PATCH /api/profile/`
- `GET /api/profile/completion/`
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
