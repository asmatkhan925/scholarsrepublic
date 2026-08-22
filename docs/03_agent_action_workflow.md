# Agent Action Workflow

## Standard draft workflow

1. Read the official scholarship page and source page.
2. Build a grounded scholarship JSON payload.
3. Call `validateScholarshipDraft` with `{ "payload": { ...draft fields... } }`.
4. If validation has errors, do not create a draft. Explain the errors and what needs review.
5. If validation has no errors, show a concise summary and ask the admin to confirm draft creation.
6. Call `createScholarshipDraft` with `{ "payload": { ...validated draft fields... } }` only after admin confirmation.
7. Optionally call `saveScholarshipSocialDraft` for caption/image prompt storage. This does not post to Facebook.
8. After generating one social image for a draft, immediately call `saveScholarshipSocialImage` for that same `draft_id`.
9. For batch drafts, save images one by one. Never send one image for multiple drafts, and never send multiple images unless there is a clear one-to-one action call per draft.

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

Social image save request body:

```json
{
  "image_filename": "scholars_republic_provider_short_title_country_2026.png",
  "image_prompt": "Exact prompt used to generate this one scholarship social image.",
  "notes": "Optional admin note.",
  "openaiFileIdRefs": [
    {
      "name": "generated_image.png",
      "id": "file-...",
      "mime_type": "image/png",
      "download_link": "temporary OpenAI file URL"
    }
  ]
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
5. Always call `checkScholarshipResearchDuplicate` with the official URL, source URL, title, provider, country, degree, current deadline/cycle, and `exclude_lead_id` set to the saved lead being processed.
6. Follow the returned `resolution` exactly:
   - `new`: validate and create one private draft.
   - `unchanged_duplicate`: skip it; never create another draft.
   - `update_existing`: call `refreshExistingScholarship` for `matched_opportunity.id` with official-source evidence; never create another draft.
   - `needs_review`: save/leave it for human review and do not mutate the matched scholarship.
7. For `new`, validate with `validateScholarshipDraft` using `{ "payload": { ...draft fields... } }`.
8. Ask the admin before creating the private draft unless the admin already authorized the complete batch.
9. Call `createScholarshipDraft` using `{ "payload": { ...validated draft fields... } }` only after validation has no errors and creation is authorized.
10. Call `markScholarshipResearchLeadImported` only after draft creation succeeds and returns a draft ID.

Never mark a lead imported if draft creation fails.

## Recurring scholarship refresh workflow

Treat a scholarship programme as one durable record across application cycles. A changed year,
deadline, or call page is not a reason to create a duplicate.

1. Read the current official source in the browser.
2. Call `checkScholarshipResearchDuplicate` with all known identity and cycle fields.
3. Continue only if it returns `resolution=update_existing`, a matching opportunity ID, and high/exact identity confidence.
4. Call `refreshExistingScholarship` with:

```json
{
  "candidate": {
    "title": "Current official title and cycle",
    "provider_name": "Provider",
    "country": "Country",
    "degree_level": "Degree",
    "detected_deadline": "YYYY-MM-DD",
    "official_url": "https://official.example/programme",
    "source_url": "https://official.example/current-call",
    "application_cycle": "2027/2028"
  },
  "evidence_text": "A concise official-source statement supporting the new cycle and changed facts.",
  "source_url": "https://official.example/current-call",
  "lead_id": 123
}
```

5. Report `applied_fields` and `skipped_fields`. Skipped fields require review; never force them.
6. Repeating the same request is safe: the endpoint returns `idempotent_replay=true` and does not apply it twice.

## Safety rules

- Do not publish automatically.
- Do not post to Facebook.
- Do not create duplicate drafts.
- Never use `allow_duplicate` to bypass an unchanged duplicate in routine scouting.
- Never auto-update when provider, host, country, degree level, or programme identity conflicts.
- Never move an active deadline earlier automatically; route it to review.
- If `duplicate_status=duplicate`, stop unless the admin explicitly instructs otherwise.
- If `duplicate_status=possible_duplicate`, warn the admin and continue only when the scholarship is clearly distinct/current.
- If the official page is unclear, outdated, expired, or missing critical information, do not create the draft.
