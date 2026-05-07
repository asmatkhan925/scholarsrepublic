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

## Planned MVP Endpoints

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/logout/`
- `GET /api/auth/me/`
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
