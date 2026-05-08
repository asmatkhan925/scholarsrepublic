# Scholars Republic — Agent Instructions

You are working on Scholars Republic, a Pakistan-first scholarship matching and study-abroad guidance platform that is growing into a broader student opportunity platform.

## Stack
- Backend: Django + Django REST Framework + PostgreSQL
- Frontend: Next.js + TypeScript + Tailwind CSS
- Auth: JWT
- Admin: Django Admin first, custom admin later

## Product Focus
Build the MVP first:
1. Authentication
2. Student profile
3. Opportunity database foundation, starting with scholarships
4. Search and filters
5. Rule-based match score
6. Saved opportunities
7. Application tracker
8. Document checklist
9. Service requests
10. Blog/guides

Do not add jobs, internships UI, AI chatbot, mobile app, or payment gateway unless explicitly requested. Keep the opportunity architecture flexible enough for those modules later.

Prefer `apps.opportunities.Opportunity` for scholarship/opportunity data. Do not create a separate production scholarship model unless the user explicitly changes the architecture.

## Development Rules
- Keep changes small and phase-based.
- Do not implement unrelated features.
- Keep backend and frontend separated.
- Use environment variables for secrets.
- Write clear setup instructions.
- Prefer readable, maintainable code.
- Always keep code formatted.
- Use Black and isort for backend Python.
- Use Prettier for frontend TypeScript, TSX, CSS, JSON, and Markdown.
- Verify the remote repository after quality-gate changes when repo formatting is questioned.
- When remote formatting is questioned, verify GitHub raw URLs after pushing before starting the next phase.
- Add tests for backend business logic.
- Run tests/build/lint when possible.
- Before adding major new features, run backend tests, frontend lint/build, and E2E tests when UI behavior is affected.
- Do not proceed to Phase 5 unless the quality gate passes.
- Summarize all changed files after each task.

## Local Commands
Backend:
cd backend
black .
isort .
python manage.py check
python manage.py makemigrations --check
python manage.py migrate
python manage.py test
python manage.py runserver

Frontend:
cd frontend
npm run format:check
npm run lint
npm run build
npm run test:e2e
npm run dev
