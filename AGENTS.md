# Scholars Republic Agent Instructions

You are working on Scholars Republic, a scholarship platform.

The human owner wants:
- Practical, production-safe changes.
- Exact commands.
- Minimal theory.
- No secret leaks.
- Clean commits.
- Tests/checks before deploy.

## Project stack

- Backend: Django / Django REST Framework
- Frontend: Next.js / TypeScript / Tailwind
- Database: PostgreSQL
- Deployment: Ubuntu server, Nginx, systemd, Cloudflare
- Email: Resend SMTP for auth emails
- AI: GPU server running Qwen through vLLM + FastAPI wrapper, connected to website server through SSH tunnel
- External AI fallback: Puter.js

## Important paths

Local WSL repo:

~/work/scholarsrepublic

Production server repo:

/home/scholarsrepublic/scholarsrepublic

Backend:

/home/scholarsrepublic/scholarsrepublic/backend

Frontend:

/home/scholarsrepublic/scholarsrepublic/frontend

Backend venv on server:

/home/scholarsrepublic/scholarsrepublic/backend/venv

Static/media:

/var/www/scholarsrepublic/staticfiles
/var/www/scholarsrepublic/media

Important systemd services:

scholars-backend
scholars-frontend
scholars-ai-worker
scholars-ai-tunnel
nginx

AI tunnel:

http://127.0.0.1:18002

AI health:

curl -sS http://127.0.0.1:18002/health

Public domain:

https://scholarsrepublic.org

## Absolute safety rules

Never commit or print secrets.

Never commit:

backend/.env
frontend/.env.local
backups/
*.patch
backend/venv/

Do not modify production .env files unless explicitly asked.

Do not expose:
- Resend API key
- Django SECRET_KEY
- DB password
- SMTP credentials
- SSH keys
- Cloudflare credentials
- AI server secrets

Before changing config files on the server, back them up.

Examples:

cp backend/.env /home/scholarsrepublic/backups/backend.env.$(date +%Y%m%d-%H%M%S)
cp frontend/.env.local /home/scholarsrepublic/backups/frontend.env.local.$(date +%Y%m%d-%H%M%S)

## Working style

Before coding:
1. Inspect the relevant files.
2. Understand the current implementation.
3. Make the smallest safe change.
4. Avoid random rewrites.
5. Avoid touching unrelated files.

After coding:
1. Run relevant checks.
2. Show git status --short.
3. Show git diff --stat.
4. Commit only relevant files.
5. Push only after checks pass.

Use clear commit messages.

Good examples:

git commit -m "Improve email verification login flow"
git commit -m "Add forgot password flow"
git commit -m "Fix scholarship detail CTA redirect"

Bad examples:

git commit -m "updates"
git commit -m "fix"

## Frontend rules

Frontend path:

frontend/

Use:
- TypeScript correctly
- Existing components where possible
- Existing auth provider and API helpers
- Existing style: rounded cards, soft borders, emerald/pine/slate/cream
- Mobile-friendly layout
- Professional student-friendly wording

Avoid:
- unused imports
- lint warnings
- useSearchParams unless Suspense handling is correct
- raw markdown-looking UI
- huge redesigns unless requested

After frontend changes always run:

cd ~/work/scholarsrepublic/frontend
npm run lint
npm run build

On production server:

cd /home/scholarsrepublic/scholarsrepublic/frontend
npm run lint
npm run build
sudo systemctl restart scholars-frontend

## Backend rules

Backend path:

backend/

Use:
- Django/DRF conventions
- authenticated endpoints when needed
- env-driven settings
- migrations for model changes
- safe public endpoint behavior

After backend changes always run:

cd ~/work/scholarsrepublic/backend
source venv/bin/activate
python manage.py check
python manage.py makemigrations --check

If model changes are expected:

python manage.py makemigrations
python manage.py migrate
python manage.py check

On production server:

cd /home/scholarsrepublic/scholarsrepublic/backend
source venv/bin/activate
python manage.py migrate
python manage.py check
sudo systemctl restart scholars-backend

## Auth system rules

Current auth direction:

- Email/password auth is primary.
- Users must verify email before login.
- Email verification must not issue JWT tokens.
- JWT tokens are issued only after password login succeeds.
- Registration does not log the user in.
- Registration redirects to login with email prefilled.
- Verification redirects to login with email prefilled.
- User enters password after verification.
- Login can preserve safe next paths.

Do not reintroduce Google login unless explicitly requested.

Reason:
- Google services are unreliable/blocked for the China-related setup.
- Current production email provider is Resend SMTP.

Important auth behavior:

Register
→ creates inactive/unverified account
→ sends verification email
→ redirects to login with email filled
→ no tokens saved

Verify email
→ activates account
→ sets email_verified=true
→ redirects to login
→ no tokens saved

Login
→ password check
→ only succeeds if email_verified=true and is_active=true
→ returns JWT tokens

## Email verification rules

Email provider:
- Resend SMTP in production
- Do not expose API key
- SMTP settings live in backend/.env

Verification link behavior:
- Latest verification link should work.
- Older verification links should be invalid after resend.
- Token rotation uses nonce-based invalidation.
- Resend verification should wait at least 60 seconds.
- Invalid/expired verification link should show a short red error message, then redirect to register.
- Valid verification link redirects to login with email filled.
- Do not allow resend spam.

Important fields:
- email_verified
- email_verification_sent_at
- email_verification_nonce

Important files:
- backend/apps/users/models.py
- backend/apps/users/tokens.py
- backend/apps/users/utils.py
- backend/apps/users/views.py
- backend/apps/users/urls.py
- backend/apps/users/tests.py
- frontend/src/app/register/page.tsx
- frontend/src/app/login/page.tsx
- frontend/src/app/verify-email/page.tsx
- frontend/src/lib/api.ts
- frontend/src/lib/redirects.ts
- frontend/src/types/auth.ts
- frontend/src/components/auth/AuthProvider.tsx
- frontend/src/components/auth/ProtectedRoute.tsx

## Safe redirect / next path rules

Only allow safe same-site relative paths.

Allowed:

/scholarships
/scholarships/some-slug
/dashboard
/dashboard/saved

Reject:

https://evil.com
//evil.com
/api/...
/login
/register
/verify-email

If unsafe, fall back to:

/dashboard

For scholarship context:
- If user starts from a scholarship detail page, preserve next=/scholarships/[slug].
- After login, redirect to that scholarship page.
- If no safe scholarship path exists, fall back to /dashboard for login success or /scholarships for cross-tab scholarship context.

## Cross-tab auth behavior

Keep this simple and safe.

Expected:
- If the user verifies email in a second tab, the original login tab may show “Email verified successfully. Please enter your password.”
- Do not randomly redirect on stale localStorage keys.
- Do not treat old localStorage state as fresh.
- Avoid aggressive cross-tab redirects.
- Only react to fresh events when clearly needed.

Stale localStorage keys can cause bugs. Be careful with keys like:

sr_email_verified:
sr_login_success:
sr_login_destination:
sr_verification_resend_until:

When debugging auth tab behavior, test in incognito or clear these keys.

## Google login rule

Google login was attempted earlier and removed.

Do not add:
- google-auth
- /auth/google/
- Google Identity Services frontend script
- Google OAuth UI

unless the human explicitly asks for it again.

If asked, first explain that Google may be unreliable for China users/server context.

## Resend email rules

Resend SMTP is configured in production .env.

Typical production values:

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=<Resend API key>
DEFAULT_FROM_EMAIL=Scholars Republic <noreply@scholarsrepublic.org>

Never commit these secrets.

For email tests on server:

cd /home/scholarsrepublic/scholarsrepublic/backend
source venv/bin/activate

python manage.py shell <<'PY'
from django.core.mail import send_mail

sent = send_mail(
    subject="Scholars Republic email test",
    message="If you received this, email is working.",
    from_email=None,
    recipient_list=["test@example.com"],
    fail_silently=False,
)
print("sent:", sent)
PY

## Deployment workflow

Production deployment is manual and must remain gated by tests.

Preferred flow:

development branch
→ relevant tests
→ pull request
→ green CI
→ merge to main
→ explicit human authorization
→ manual production deployment workflow

Production deployment script:

deploy/deploy_scholarsrepublic.sh

The deployment script is responsible for the production update sequence, including database backup, backend dependency/setup work, migrations, collectstatic, frontend build, Nginx validation, service restarts, and health checks.

GitHub Actions reaches production through Tailscale:

GitHub Actions
→ OIDC workload identity
→ tag:github-ci
→ Tailscale SSH
→ tag:scholars-prod
→ scholarsrepublic

Production machine:

scholarsrepublic

Production Tailscale tag:

tag:scholars-prod

GitHub Actions ephemeral tag:

tag:github-ci

A connectivity-only workflow exists at:

.github/workflows/test-production-connectivity.yml

Do not deploy merely because code changed.

Before production deployment:
1. Relevant tests must pass.
2. Required CI must be green.
3. Review migration implications.
4. Review production impact.
5. Obtain explicit human authorization.

Do not bypass the CI gate by weakening tests or changing expected values without evidence.

## Git workflow

For substantial work, prefer a dedicated branch and pull request.

Before starting local work:

cd ~/work/scholarsrepublic
git status --short
git fetch origin

Before commit:

git status --short
git diff --stat

Commit only relevant files:

git add <only relevant files>
git commit -m "Clear message"

Push the current working branch, not main, unless the human explicitly requested a direct main update for a safe administrative change.

Never use git add . unless the diff has been carefully reviewed.

Do not merge a pull request while required CI is failing.
Do not overwrite unrelated user work.

## Local WSL workflow

Use the WSL repo:

~/work/scholarsrepublic

Avoid coding in:

/mnt/d/scholarsrepublic-work/scholarsrepublic
D:\scholarsrepublic-work\scholarsrepublic

Reason:
- Windows/PowerShell and Linux command differences caused previous mistakes.
- WSL-native repo avoids CRLF/path/shell issues.

Open VS Code:

cd ~/work/scholarsrepublic
code .

VS Code should show:

WSL: Ubuntu

## Common mistakes to avoid

Do not use Linux paths in PowerShell:

cd /home/scholarsrepublic/scholarsrepublic

Do not use Bash heredocs in PowerShell:

cat > file <<'EOF'

If working in PowerShell, use PowerShell-compatible commands.

But preferred workflow is WSL Bash.

Do not run user-deleting local tests if local migrations are incomplete.
Deleting users can trigger related-table lookups and fail if local DB is behind.

Use unique test users instead of deleting existing users.

## Local validation commands

Frontend:

cd ~/work/scholarsrepublic/frontend
npm run lint
npm run build

Backend:

cd ~/work/scholarsrepublic/backend
source venv/bin/activate
python manage.py check
python manage.py makemigrations --check

If backend DB is not configured locally, mention it clearly and run what can be run.

## AI setup context

Current AI architecture:

Student
→ Next.js SOP page
→ Django API/queue
→ AI worker
→ SSH tunnel
→ GPU server FastAPI wrapper
→ vLLM/Qwen

Tunnel health:

curl -sS http://127.0.0.1:18002/health

Services:
- scholars-ai-tunnel
- scholars-ai-worker

If local AI server is down:
- Do not show a scary offline page.
- Show short message that AI server is temporarily offline.
- Disable local AI option.
- Keep external AI option available if Puter.js is ready.
- Keep form visible.

## Puter.js notes

Puter script:

https://js.puter.com/v2/

Use:

puter.ai.chat(...)

External AI output should be cleaned so students do not see ugly raw markdown headings like:

# Statement of Purpose
## Introduction

## AI prompt rules

Tell model:
- Do not show reasoning.
- Do not invent achievements, universities, grades, awards, research projects, publications, work experience, or fake personal stories.
- Use only provided student details.
- Return clean SOP paragraphs without markdown unless explicitly needed.
- For missing details, write honestly and generally.

## Scholarship/content rules

The blog/help center is general scholarship guidance, not only SOP.

Topics include:
- Fully funded scholarships for Pakistani students in 2026
- Scholarships without IELTS for Pakistani students
- China scholarships for Pakistani students
- Türkiye Burslari guide for Pakistani students
- DAAD scholarships for Pakistani students
- How to write a scholarship SOP
- How to write a study plan
- How to email a professor for research supervision
- Scholarship CV format for Pakistani students
- Scholarship application checklist

SEO rules:
- Use good metadata title and description.
- Use clean H1/H2 structure.
- Write for Pakistani students where relevant.
- Add natural internal links to scholarships, profile, saved opportunities, application tracker, SOP guide, SOP generator.
- Avoid false promises like “guaranteed scholarship.”
- For deadlines/rules/seats, verify official sources.

## Opportunity system rules

Use existing Opportunity model/workflow.

Do not create a random separate scholarship model.

Current direction:
- Verified real opportunities first.
- Draft/import workflow for opportunities.
- Admin verifies before public trust.
- Public opportunity pages and pathway browsing should stay clean.

When adding opportunities:
- Use official source links.
- Avoid fake/sample data.
- Mark published opportunities verified only after manual verification.
- Keep required fields complete.
- Run audits if available:

python manage.py audit_opportunity_references
python manage.py audit_opportunity_content

## Error handling style

When user pastes an error:
1. Identify exact cause.
2. Explain in one or two sentences.
3. Give exact commands to fix.
4. Give validation commands.
5. Give git/deploy commands if relevant.

Do not give vague advice like “edit this file.”
Give exact patches or exact commands.


## Repository source of truth

The connected GitHub repository `asmatkhan925/scholarsrepublic` is the source of truth.

Before substantial engineering work:
1. Read the current root `AGENTS.md`.
2. Read `docs/PROJECT_STATUS.md` if it exists.
3. Inspect the current implementation and related tests before editing.
4. Prefer current GitHub content over stale copied/uploaded documentation.

Keep `AGENTS.md` focused on stable engineering rules.
Keep `docs/PROJECT_STATUS.md` focused on changing project state, active failures, current priorities, and verified deployment status.

## Debugging and test-failure policy

Treat test failures as evidence to investigate, not something to silence.

For each failure, classify it as one of:
- real application bug
- stale test expectation
- incorrect fixture or test data
- environment/configuration issue
- flaky behavior
- missing dependency or migration

For a real bug:
1. Reproduce or identify the failing path.
2. Find the root cause.
3. Make the smallest correct fix.
4. Add or update a regression test when appropriate.
5. Run targeted tests first.
6. Run the broader relevant suite.
7. Inspect GitHub Actions before considering the work complete.

Never blindly change expected values just to make CI green.

## Current CI/CD baseline

CI/CD setup work is tracked on:

`ops/github-actions-ci-deploy`

Pull request:

PR #2 — Set up reliable CI and manual production deployment

CI now includes:
- PostgreSQL 16 service
- Django system check
- migration consistency check
- migrations
- full Django test suite
- frontend lint
- Next.js production build
- Playwright E2E tests

The first full baseline exposed legacy failures. See `docs/PROJECT_STATUS.md` for the current counts and triage state.

GitHub-to-production Tailscale connectivity has been tested successfully through the connectivity-only workflow.

## Production authorization boundary

Normal development work can proceed when the human says "go ahead", including:
- code inspection
- debugging
- code edits
- test edits supported by evidence
- commits to a working branch
- CI inspection
- log inspection
- pull-request updates

Stop for explicit user action when required for:
- secrets
- external authentication
- protected environment approval
- Tailscale admin-console changes
- irreversible/high-risk production operations
- production deployment authorization


## Final reminder

The human uses ChatGPT as the brain and Codex as the hands.

When making code changes:
- Read first.
- Patch carefully.
- Test.
- Show status.
- Commit cleanly.
- Do not touch secrets.