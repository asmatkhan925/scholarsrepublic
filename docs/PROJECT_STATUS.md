# Scholars Republic Project Status

Last reviewed: 2026-09-19

This file tracks changing project state. Stable engineering rules belong in the root `AGENTS.md`.

## Current objective

Establish a reliable CI/CD baseline, triage the existing test failures, and then improve Scholars Republic systematically without weakening production safety.

## Active branch and pull request

Working branch:

`ops/github-actions-ci-deploy`

Pull request:

PR #2 — `Set up reliable CI and manual production deployment`

Do not merge PR #2 until its intended CI/deployment behavior is validated and required CI is green.

## CI baseline

### Backend

The full Django suite now runs in GitHub Actions against PostgreSQL 16.

Initial baseline:

- 893 tests executed
- 60 failures
- 14 errors

Known examples include stale or mismatched social-reel expectations and at least one PostgreSQL unique-constraint failure path. These must be classified before changing implementation or tests.

### Frontend

The GitHub Actions frontend job currently runs:

- `npm ci`
- lint
- production build
- Playwright Chromium E2E

Initial baseline:

- 12 E2E tests passed
- 4 E2E tests failed

Known failures include:

1. stale homepage heading expectation
2. footer test expecting `/blog` although the application now uses `/guides` and redirects `/blog`
3. scholarship match badge expectation needing diagnosis
4. admin reels-page expectation needing diagnosis

Do not blindly update the last two until the intended product behavior is confirmed from the implementation.

## Production connectivity

Production machine:

`scholarsrepublic`

Production Tailscale tag:

`tag:scholars-prod`

GitHub Actions ephemeral tag:

`tag:github-ci`

Tailscale SSH rules are configured so that:

- the human account can SSH to `tag:scholars-prod` as `scholarsrepublic` using check mode
- `tag:github-ci` can SSH to `tag:scholars-prod` as `scholarsrepublic` using accept mode

GitHub OIDC/Tailscale connectivity has been tested successfully.

Connectivity-only workflow:

`.github/workflows/test-production-connectivity.yml`

Verified path:

GitHub Actions
→ Tailscale OIDC
→ ephemeral `tag:github-ci` node
→ Tailscale network / DERP fallback if needed
→ `tag:scholars-prod`
→ Tailscale SSH
→ `scholarsrepublic` Linux user

A DERP-relayed path is acceptable for deployment connectivity even when a direct peer-to-peer path is not established.

## Production deployment

Production deployment should remain manual.

Intended flow:

development
→ targeted tests
→ pull request
→ green CI
→ merge to main
→ explicit human authorization
→ manual deployment workflow

Production deployment script:

`deploy/deploy_scholarsrepublic.sh`

The deployment workflow must not bypass CI.

## AI tunnel status

The production AI tunnel service currently uses:

- GPU host: `192.168.5.189`
- configured SSH port: `30417`
- remote AI host: `127.0.0.1`
- remote AI port: `8002`
- local forwarded port: `18002`

Observed on 2026-09-19:

- TCP `192.168.5.189:30417` refuses connections
- TCP `192.168.5.189:22` accepts SSH connections
- `scholars-ai-tunnel` repeatedly restarts because the configured SSH port is unavailable
- nothing is listening locally on `127.0.0.1:18002`

This issue predates the GitHub/Tailscale deployment work and should be repaired separately. Do not assume it was caused by the production Tailscale tag.

## Known audit concerns

These are investigation targets, not instructions to implement everything immediately.

### Trust and data semantics

- Public verification/publishing semantics need stronger trust guarantees.
- IELTS/TOEFL/Duolingo/HSK/HEC boolean fields may conflate "unknown" with "not required".
- "Verified" may be too binary for the underlying evidence quality.

### Privacy and security

- Analytics/advertising loading should be checked against cookie-consent state.
- Refresh-token storage should be reviewed.
- CSP, Referrer-Policy, and Permissions-Policy should be audited.
- Private/auth pages should use explicit noindex behavior where appropriate.

### Performance and architecture

- Review excessive `force-dynamic` / no-store usage on public pages.
- Review global AuthProvider use on public routes.
- Review sitemap `lastModified` behavior.

### UX and accessibility

- Review form autocomplete and accessibility details.
- Improve public trust signals without overstating verification.

## Immediate next engineering task

Triage all current CI failures.

For each failure:
1. identify the failing test
2. inspect the implementation
3. classify the failure
4. fix the implementation when it is a real bug
5. update a stale test only when the intended behavior is clearly supported
6. add regression coverage where useful
7. rerun targeted tests
8. rerun broader CI

Do not deploy production while this baseline cleanup is in progress.
