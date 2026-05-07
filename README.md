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
python manage.py test
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

Next phase:

- Phase 2 users and authentication APIs

## License

Private project initially.
