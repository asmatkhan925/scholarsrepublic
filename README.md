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
- `docs/social-reels-runbook.md` - local MP4 reel plan and render workflow

## Social Reels

Admins can create manual or automatic short scholarship reel plans at
`/dashboard/admin/social/reels`. Automatic reel planning selects safe published,
non-expired scholarship records, applies seven-day deduplication, and renders
local MP4 files only. Default reel templates are text-first for mobile
readability and do not embed scholarship posters or social images. This system
does not post to Facebook or change Worker behavior.

Useful commands:

```bash
cd backend
python manage.py generate_social_reel_plans --limit 1 --dry-run
python manage.py generate_social_reel_plans --limit 1 --render
python manage.py render_social_reels --plan-id <PLAN_ID> --force
python manage.py run_daily_social_scheduler --generate-reels
```

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
- API docs in local development: `http://localhost:8000/api/docs/`

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

Production environment requirements and secret-safe verification commands are in
`docs/production-checklist.md`.

Production backup and restore instructions are in `docs/backup-restore.md`.

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

JWT behavior:
- Initial JWT tokens are issued only by `POST /api/auth/login/`.

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

Quick scholarship inventory check:

```bash
cd backend
python manage.py shell -c "from django.test import Client; from apps.opportunities.models import Opportunity; qs=Opportunity.objects.filter(opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP); print('total opportunities', Opportunity.objects.count()); print('published scholarships', qs.filter(status=Opportunity.Status.PUBLISHED).count()); print('draft scholarships', qs.filter(status=Opportunity.Status.DRAFT).count()); print('archived scholarships', qs.filter(status=Opportunity.Status.ARCHIVED).count()); print('public API count', Client().get('/api/scholarships/?ordering=deadline').json().get('count'))"
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

## Saved Opportunities

Phase 6 adds opportunity-based saving. Logged-in students can save published
opportunities, remove saved records, and view them in `/dashboard/saved`.
Guests can browse opportunities but must register or log in to save.

Saved opportunities prepare the platform for the application tracker, where a
saved opportunity can later become an active application with status, notes,
deadlines, and document progress.

Saved opportunity endpoints:

- `GET /api/saved-opportunities/`
- `POST /api/saved-opportunities/`
- `DELETE /api/saved-opportunities/{id}/`
- `GET /api/saved-opportunities/slugs/`
- `POST /api/opportunities/{slug}/save/`
- `DELETE /api/opportunities/{slug}/save/`
- `POST /api/scholarships/{slug}/save/`
- `DELETE /api/scholarships/{slug}/save/`

## Application Tracker

Phase 7 adds an opportunity-based application tracker. Logged-in students can
start tracking saved or published opportunities, update status and priority,
add notes and next steps, and set optional personal deadlines. Starting a
tracker from an unsaved published opportunity automatically saves it first.

The tracker does not submit real applications to universities. It is a student
workspace for preparation and progress tracking.

Supported statuses:

- preparing
- documents pending
- documents ready
- applied
- interview
- result waiting
- selected
- rejected
- withdrawn
- deferred

Application tracker endpoints:

- `GET /api/applications/`
- `POST /api/applications/`
- `GET /api/applications/{id}/`
- `PATCH /api/applications/{id}/`
- `DELETE /api/applications/{id}/`
- `GET /api/applications/summary/`
- `POST /api/saved-opportunities/{id}/start-application/`
- `POST /api/opportunities/{slug}/start-application/`
- `POST /api/scholarships/{slug}/start-application/`

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
- Phase 6 saved opportunities
- Phase 7 application tracker

Next phase:

- Phase 8: Document Checklist

## License

Private project initially.
