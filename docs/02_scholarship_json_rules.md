# Scholarship JSON Rules

Use these rules when preparing payloads for `validateScholarshipDraft` and
`createScholarshipDraft`.

## Source grounding

- Ground every field in the official scholarship page, application page, or trusted source page.
- Research lead fields are hints only. Re-check `official_url` and `source_url` before building the payload.
- Do not copy stale, unclear, or marketing-only text into the final payload.
- Do not invent provider names, funding, eligibility, deadlines, fields of study, or application requirements.

## Research lead inputs

- Use `listScholarshipResearchLeads` with `review_status=ready_for_draft` and `limit=5` when asked to create drafts from research leads.
- Treat `title`, `provider_name`, `country`, `degree_level`, `funding_type`, `detected_deadline`, and URLs as starting hints.
- If `duplicate_status=duplicate`, do not create a draft unless the admin explicitly instructs you to continue.
- If `duplicate_status=possible_duplicate`, warn the admin and proceed only if the official source shows it is clearly different or current.

## Required payload quality

- Use `deadline` in `YYYY-MM-DD` format when a fixed deadline is confirmed.
- Use `is_rolling_deadline=true` only when the official/source page supports a rolling deadline.
- Keep missing fields blank or omitted. Do not use `Unknown`.
- If the page is expired, unclear, outdated, or missing critical details, do not create a draft. Explain what needs manual review.
- Use Scholars Republic draft workflow only. Never publish automatically.
