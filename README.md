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

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend URLs:

- API health: `http://localhost:8000/api/health/`
- Django Admin: `http://localhost:8000/admin/`

### Frontend

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
2. Users and authentication
3. Student profile
4. Scholarship database
5. Search and filters
6. Match score
7. Saved scholarships and application tracker
8. Document checklist
9. Service requests
10. Blog and guides
11. Polish and deployment prep

## License

Private project initially.
