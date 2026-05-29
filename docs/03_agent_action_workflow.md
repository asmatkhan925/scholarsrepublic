# Agent Action Workflow

## Standard draft workflow

1. Read the official scholarship page and source page.
2. Build a grounded scholarship JSON payload.
3. Call `validateScholarshipDraft` with `{ "payload": { ...draft fields... } }`.
4. If validation has errors, do not create a draft. Explain the errors and what needs review.
5. If validation has no errors, show a concise summary and ask the admin to confirm draft creation.
6. Call `createScholarshipDraft` with `{ "payload": { ...validated draft fields... } }` only after admin confirmation.
7. Optionally call `saveScholarshipSocialDraft` for caption/image prompt storage. This does not post to Facebook.

Draft validation request body:

```json
{
  "payload": {
    "title": "Scholarship title",
    "provider_name": "Provider name",
    "country": "Country",
    "degree_level": "Degree level",
    "funding_type": "Funding type",
    "deadline": "YYYY-MM-DD or deadline text",
    "official_url": "https://official.example/scholarship",
    "source_url": "https://source.example/page",
    "application_url": "https://official.example/apply",
    "summary": "Short summary",
    "description": "Full description",
    "eligibility": "Eligibility requirements",
    "benefits": "Benefits and funding details",
    "how_to_apply": "Application instructions",
    "required_documents": "Required documents",
    "fields": "Eligible fields of study",
    "notes": "Admin notes"
  }
}
```

Draft creation request body:

```json
{
  "payload": {
    "...": "validated draft fields"
  }
}
```

## Research lead workflow

When the admin asks to create drafts from research leads:

1. Call `listScholarshipResearchLeads` with:

```json
{
  "review_status": "ready_for_draft",
  "limit": 5
}
```

2. Show the returned leads briefly, including title, provider, country, deadline, duplicate status, and official/source URLs.
3. Open/read `official_url` first, then `source_url`.
4. Treat lead fields as hints only. The final payload must be grounded in official/source content.
5. Call `checkScholarshipResearchDuplicate` before draft creation if the lead or source appears similar to an existing record.
6. Validate with `validateScholarshipDraft` using `{ "payload": { ...draft fields... } }`.
7. Ask the admin before creating the private draft.
8. Call `createScholarshipDraft` using `{ "payload": { ...validated draft fields... } }` only after validation has no errors and the admin confirms.
9. Call `markScholarshipResearchLeadImported` only after draft creation succeeds and returns a draft ID.

Never mark a lead imported if draft creation fails.

## Safety rules

- Do not publish automatically.
- Do not post to Facebook.
- Do not create duplicate drafts.
- If `duplicate_status=duplicate`, stop unless the admin explicitly instructs otherwise.
- If `duplicate_status=possible_duplicate`, warn the admin and continue only when the scholarship is clearly distinct/current.
- If the official page is unclear, outdated, expired, or missing critical information, do not create the draft.
