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

## Phase 4.8: Quality Gate Before Match Score

- Add backend formatting tools with Black and isort
- Add frontend formatting tools with Prettier
- Make Playwright frontend startup portable and avoid NVM-specific config
- Document formatting and quality-gate commands
- Re-run backend checks/tests, frontend format/lint/build, and E2E tests

Status: complete.

## Phase 4.9: Remote Repository Reality Check and Formatting Repair

- Verify local source files are multi-line and readable
- Verify GitHub raw files for backend, frontend, formatter config, and Playwright config
- Confirm quality-gate tooling is present on `main`
- Re-run backend formatting checks, frontend formatting checks, build, and E2E tests

Status: complete.

## Phase 4.9B: GitHub Raw Formatting Verification

- Re-check GitHub raw URLs for multi-line backend and frontend source files
- Confirm remote `package.json` includes Prettier scripts and dependency
- Confirm remote Playwright config uses `npm run dev` and contains no NVM command
- Re-run backend, frontend, and E2E quality gates after verification

Status: complete.

Long-term note: Scholars Republic should become a flexible student opportunity
platform. Scholarships are the first opportunity type; later types can include
jobs, internships, fellowships, exchange programs, admissions, competitions,
training, research positions, and mentorship programs.

## Phase 5: Rule-Based Opportunity Match Score

- Connect `StudentProfile` and `Opportunity`
- Return match score, reasons, missing requirements, and warnings
- Keep scoring explainable before any future AI layer
- Add student-facing match score displays on scholarship list/detail pages
- Add dashboard recommendations page

Status: complete.

## Phase 6: Saved Opportunities

- Let students save published opportunities
- Add saved opportunities dashboard page
- Keep guest/public browsing unchanged
- Prepare saved records for future application tracking

Status: complete.

## Phase 7: Application Tracker

- Build on saved opportunities
- Add application status tracking
- Add notes and deadline reminder fields
- Keep each student limited to their own application records

Status: next.

## Later MVP Phases

- Search and filters
- Document checklist
- Service requests
- Blog and guides
- Polish and deployment prep
