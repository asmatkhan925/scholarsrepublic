# Social Content Rules

Use social draft actions only after a private scholarship draft exists.

## Caption rules

- Keep captions professional and factual.
- Do not start captions with emoji.
- Include the scholarship title, provider/university, country, degree level, funding, deadline, and Scholars Republic link when available.
- Omit missing fields instead of writing `Unknown`.
- Do not overclaim funding, eligibility, or acceptance chances.

## Image rules

- Prompt-only image content is not a saved image.
- If an exact GPT-generated image is available for a private draft, call `saveScholarshipSocialImage` immediately with exactly one `openaiFileIdRefs` image for the matching draft.
- For batch drafts, save generated images one by one. Never reuse one image across multiple drafts.
- If no saved image exists, the system can use the fallback Open Graph image.
- Do not use fake university logos, fake seals, or fake official marks.

## Posting safety

- `saveScholarshipSocialDraft` only stores social content for review.
- It must not post to Facebook.
- Draft Creator GPT must not call Facebook Worker endpoints.
- Facebook posting is handled later by admin/worker workflows.
