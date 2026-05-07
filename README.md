# Scholars Republic

Pakistan-first scholarship matching and study-abroad guidance platform.

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
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## MVP Modules

1. Authentication
2. Student profile
3. Scholarship database
4. Search and filters
5. Rule-based match score
6. Saved scholarships
7. Application tracker
8. Document checklist
9. Service requests
10. Blog/guides

## Access Modes

Guest users can browse public pages such as the homepage, scholarship placeholder page, services, blog, login, and register pages. Protected actions such as dashboard access, saving scholarships, applying, tracking applications, match scores, and service requests require login.

Student users can access `/dashboard` and `/dashboard/profile`. Recommendations, saved scholarships, and application tracking are planned for later phases.

Admin users can access `/admin`. Scholarship, service request, and blog management are planned for later phases.

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

## Development Roadmap

1. Initial project setup
2. Setup stabilization
3. Users and authentication
4. Student profile
5. Scholarship database
6. Search and filters
7. Match score
8. Saved scholarships and application tracker
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

Next phase:

- Phase 4 scholarship database

## License

Private project initially.
