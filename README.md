# Scholars Republic

Pakistan-first scholarship matching and study-abroad guidance platform.

Long-term direction: Scholars Republic should grow into an AI-powered student
opportunity platform for scholarships, jobs, internships, admissions,
fellowships, exchange programs, competitions, training, mentorship, and career
support. Scholarships are the first MVP module, but new architecture should keep
future opportunity types in mind.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Django, Django REST Framework
- Database: PostgreSQL
- Auth: JWT

## Project Structure

- `backend/` - Django API, admin, media storage, and backend apps
- `frontend/` - Next.js App Router application
- `docs/` - product brief, API notes, schema notes, and roadmap

## Backend Setup

```bash
cd backend
python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

Linux/Mac:

```bash
source venv/bin/activate
```

Install dependencies and create your local environment file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

Before running migrations, create a PostgreSQL database named `scholars_republic` or update `backend/.env` with your own database credentials.

Then run:

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_opportunities
python manage.py createsuperuser
python manage.py runserver
```

Backend URLs:

- API health: `http://localhost:8000/api/health/`
- Django Admin: `http://localhost:8000/admin/`
- API docs: `http://localhost:8000/api/docs/`

Create an admin user when you need Django Admin or the protected frontend admin placeholder:

```bash
python manage.py createsuperuser
```

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

- `http://localhost:3000`

## Environment Variables

Use the example files as starting points:

- `backend/.env.example`
- `frontend/.env.example`

## Test Commands

Backend:

```bash
cd backend
python manage.py check
python manage.py migrate
python manage.py test
python manage.py test apps.users
python manage.py test apps.profiles
python manage.py test apps.opportunities
```

Frontend:

```bash
cd frontend
npm run format:check
npm run lint
npm run build
```

End-to-end browser tests:

```bash
cd frontend
npm run test:e2e
```

## MVP Modules

1. Authentication
2. Student profile
3. Opportunity database foundation
4. Search and filters
5. Rule-based match score
6. Saved opportunities
7. Application tracker
8. Document checklist
9. Service requests
10. Blog/guides

## Access Modes

Guest users can browse public pages such as the homepage, scholarship opportunity listing, services, blog, login, and register pages. Protected actions such as dashboard access, saving opportunities, applying, tracking applications, match scores, and service requests require login.

Student users can access `/dashboard` and `/dashboard/profile`. Recommendations, saved opportunities, and application tracking are planned for later phases.

Admin users can access `/admin`. Opportunity management is available in Django Admin, while custom service request and blog management are planned for later phases.

## Auth API

Platform auth endpoints:

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `GET /api/auth/me/`
- `POST /api/auth/logout/`

SimpleJWT utility endpoints are also available:

- `POST /api/auth/token/`
- `POST /api/auth/token/refresh/`

Frontend auth stores JWT tokens in `localStorage` for MVP development. This can move to httpOnly cookies later.

## Student Profile System

Phase 3 adds a comprehensive Scholarship Readiness Profile for logged-in students.
Students can complete profile sections for:

- Basic information and Pakistan-first location fields
- Current education
- Target degree, countries, fields, funding, and fee preferences
- Language tests and English proficiency
- Document readiness
- Research, skills, and career details
- Financial preferences and scholarship categories
- Alerts and profile data consent
- AI-ready metadata for future CV import and reviewed autofill workflows

The backend computes:

- Profile completion percentage
- Scholarship readiness score
- Readiness level: Low, Medium, or High
- Missing profile fields
- Missing core documents

Profile endpoints:

- `GET /api/profile/`
- `POST /api/profile/`
- `PUT /api/profile/`
- `PATCH /api/profile/`
- `GET /api/profile/completion/`

Admin users do not need student profiles and receive `403` on profile endpoints.

## Opportunity Database

Phase 4 adds the `opportunities` backend app. Scholarships are stored as
opportunities with `opportunity_type = scholarship`, which keeps the platform
ready for future jobs, internships, fellowships, exchange programs, admissions,
competitions, training, research positions, and mentorship programs.

Public browsing endpoints:

- `GET /api/opportunities/`
- `GET /api/opportunities/{slug}/`
- `GET /api/scholarships/`
- `GET /api/scholarships/{slug}/`

The `/api/scholarships/` endpoints are a convenience alias that returns only
published scholarship opportunities. Draft opportunities are never shown on
public endpoints.

Admin management endpoints:

- `GET|POST /api/admin/opportunities/`
- `GET|PUT|PATCH|DELETE /api/admin/opportunities/{id}/`

Django Admin can be used for opportunity management first. Seed local sample
scholarship opportunities with:

```bash
cd backend
python manage.py seed_opportunities
```

## Rule-Based Match Score

Phase 5 connects `StudentProfile` and `Opportunity` with a deterministic,
explainable match score. Guests can still browse scholarship opportunities, but
personalized scores require a logged-in student account and a student profile.

Match results include:

- score out of 100
- category breakdown
- matched reasons
- missing requirements
- warnings
- readiness suggestions

Frontend pages show match scores for logged-in students on scholarship
list/detail pages and in `/dashboard/recommendations`. Admin users are not
forced into the student matching flow.

## End-to-End Testing

Playwright covers the main browser behaviors before major feature phases:
guest browsing, register/login/logout, protected dashboard/profile/admin routes,
scholarship listing/detail pages, profile form controls, validation messages,
match score visibility, recommendations, and frontend/backend integration.

Prerequisites:

- PostgreSQL running
- Backend migrations applied
- Sample opportunities seeded
- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:3000` or Playwright starts it

Backend:

```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py seed_opportunities
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

E2E:

```bash
cd frontend
npm run test:e2e
```

UI mode:

```bash
npm run test:e2e:ui
```

Headed:

```bash
npm run test:e2e:headed
```

If Playwright browsers are missing, install them with:

```bash
npx playwright install --with-deps
```

If your WSL environment cannot install system dependencies, install Chromium only:

```bash
npx playwright install chromium
```

## Code Formatting

Backend formatting uses Black and isort. Runtime dependencies stay in
`backend/requirements.txt`; development tools live in `backend/requirements-dev.txt`.

```bash
cd backend
source venv/bin/activate
pip install -r requirements-dev.txt
black .
isort .
```

Frontend formatting uses Prettier:

```bash
cd frontend
npm run format
npm run format:check
```

## Quality Gate Before New Features

Before starting major feature phases, run the full quality gate.

Backend:

```bash
cd backend
source venv/bin/activate
python manage.py check
python manage.py makemigrations --check
python manage.py migrate
python manage.py test
```

Frontend:

```bash
cd frontend
npm run format:check
npm run lint
npm run build
npm run test:e2e
```

For E2E tests, the backend must already be running at
`http://localhost:8000`. Playwright starts the frontend at
`http://localhost:3000` when needed, or it can reuse an existing frontend dev
server.

## Development Roadmap

1. Initial project setup
2. Setup stabilization
3. Users and authentication
4. Student profile
5. Opportunity database foundation
6. Search and filters
7. Match score
8. Saved opportunities and application tracker
9. Document checklist
10. Service requests
11. Blog and guides
12. Polish and deployment prep

## Current Project Status

Completed:

- Phase 1 initial structure
- Phase 1.5 setup stabilization
- Phase 2 authentication and access modes
- Phase 3 student profile and scholarship readiness
- Phase 4 opportunity database foundation
- Phase 4.5 repository consistency cleanup
- Phase 4.6 UI behavior QA and E2E testing foundation
- Phase 4.8 quality gate before match score
- Phase 4.9 remote repository reality check and formatting repair
- Phase 4.9B GitHub raw formatting verification
- Phase 5 rule-based opportunity match score

Next phase:

- Phase 6: Saved Opportunities

## License

Private project initially.
