# Scholars Republic — Agent Instructions

You are working on Scholars Republic, a Pakistan-first scholarship matching and study-abroad guidance platform.

## Stack
- Backend: Django + Django REST Framework + PostgreSQL
- Frontend: Next.js + TypeScript + Tailwind CSS
- Auth: JWT
- Admin: Django Admin first, custom admin later

## Product Focus
Build the MVP first:
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

Do not add jobs, internships, AI chatbot, mobile app, or payment gateway unless explicitly requested.

## Development Rules
- Keep changes small and phase-based.
- Do not implement unrelated features.
- Keep backend and frontend separated.
- Use environment variables for secrets.
- Write clear setup instructions.
- Prefer readable, maintainable code.
- Add tests for backend business logic.
- Run tests/build/lint when possible.
- Summarize all changed files after each task.

## Local Commands
Backend:
cd backend
python manage.py test
python manage.py runserver

Frontend:
cd frontend
npm run lint
npm run build
npm run dev
