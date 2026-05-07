# Roadmap

## Phase 1: Initial Project Setup

- Django backend
- Django REST Framework
- PostgreSQL environment configuration
- CORS
- JWT configuration
- Health check endpoint
- Next.js frontend
- Tailwind CSS
- Placeholder pages
- Setup documentation

## Phase 2: Users and Authentication

- Email login
- Register API
- Login API
- Current user API
- JWT token handling
- Protected frontend routes
- Public guest mode
- Protected student dashboard placeholder
- Protected admin dashboard placeholder

Status: complete.

## Phase 3: Student Profile

- Comprehensive scholarship readiness profile model
- Profile APIs
- Completion percentage
- Scholarship readiness score
- Missing profile fields
- Missing core documents
- Protected frontend profile form
- Dashboard readiness card

Status: complete.

## Phase 4: Opportunity Database Foundation

- Prefer an `opportunities` app/model instead of scholarship-only architecture
- Start with `opportunity_type = scholarship`
- Public opportunity listing/detail APIs
- Admin opportunity CRUD
- Seed sample scholarship opportunities

Status: complete.

## Phase 4.5: Repository Consistency Cleanup

- Verify opportunities app registration and URL inclusion
- Confirm migrations and seed command are committed
- Re-run backend tests and frontend lint/build
- Clean documentation wording before match-score work

Status: complete.

## Phase 4.6: UI Behavior QA and E2E Testing Foundation

- Add Playwright browser tests for guest browsing and navigation
- Cover register, login, logout, and protected route behavior
- Cover profile form sections, dropdowns, checkboxes, validation, save, and persistence
- Cover scholarship listing/detail pages backed by opportunity data
- Re-run backend tests, frontend lint/build, and E2E tests before match-score work

Status: complete.

Long-term note: Scholars Republic should become a flexible student opportunity
platform. Scholarships are the first opportunity type; later types can include
jobs, internships, fellowships, exchange programs, admissions, competitions,
training, research positions, and mentorship programs.

## Phase 5: Rule-Based Opportunity Match Score

- Connect `StudentProfile` and `Opportunity`
- Return match score, reasons, missing requirements, and warnings
- Keep scoring explainable before any future AI layer

Status: next.

## Later MVP Phases

- Search and filters
- Saved opportunities
- Application tracker
- Document checklist
- Service requests
- Blog and guides
- Polish and deployment prep
