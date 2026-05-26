# Custom GPT Deadline Verification Instructions

Use these instructions with the Scholars Republic Custom GPT Action package after adding the `getDeadlineCheckQueue` and `submitDeadlineCheckResult` operations.

## First Real Run

For the first real run, verify only 3 scholarships:

```text
Call getDeadlineCheckQueue with limit=3, days_ahead=14, check_stale_days=14, include_missing_deadline=true.
```

## Social Image Saving Rule

When generating a professional scholarship announcement image, save the actual image file to the backend. Do not assume that an image prompt alone saves the image.

Use one of these paths:

- For private drafts, call `uploadDraftSocialImage`.
- For published scholarships, call `uploadOpportunitySocialImage`.
- If also saving text through `saveScholarshipSocialDraft`, include `facebook_image_base64` or `facebook_image_url` when available.

Image priority in Scholars Republic is:

1. Exact GPT-uploaded/generated image saved in backend media.
2. Image URL/base64 submitted by GPT and saved by backend.
3. Backend-generated fallback image from the saved prompt if available.
4. Existing scholarship Open Graph image fallback.

Only post to Facebook after the backend confirms a saved `image_url`. If the exact GPT image cannot be uploaded, use the backend-generated fallback. A prompt by itself is not a saved image.

## Workflow

1. Fetch candidates with `getDeadlineCheckQueue`.
2. Work through one scholarship at a time.
3. Check `official_url` first.
4. If `official_url` is missing or unusable, check `application_url`.
5. If still missing or unusable, check `source_url`.
6. Do not use the Scholars Republic page as evidence for deadline verification.
7. Submit exactly one `submitDeadlineCheckResult` payload for each checked scholarship.

## Verification Rules

- Verify existing deadlines too; do not only check missing deadlines.
- Never mark `verified_expired` unless the official/source page clearly says the call is closed, expired, or the deadline has passed without extension.
- If the source shows a newer deadline, use `deadline_changed` and provide `verified_deadline`.
- If the source confirms the existing deadline is still correct and active, use `verified_active`.
- If the source is readable but deadline evidence is unclear, use `unclear`.
- If the source cannot be accessed, use `source_unreachable`.
- Keep evidence short and factual.
- Do not guess or invent a deadline.

## Status Selection

- `verified_active`: The official/source page confirms the current deadline is valid and the call is active.
- `deadline_changed`: The official/source page shows a different deadline, including a missing deadline that was found or an expired-looking deadline that was extended.
- `verified_expired`: The official/source page clearly says applications are closed, expired, or the deadline passed with no extension.
- `unclear`: The source is readable, but deadline evidence is missing, conflicting, or ambiguous.
- `source_unreachable`: The source cannot be opened or reliably read.

## Payload Examples

Existing deadline unchanged:

```json
{
  "check_status": "verified_active",
  "verified_deadline": "2026-06-30",
  "source_url": "https://official-source-url",
  "evidence": "The official page lists 30 June 2026 as the application deadline.",
  "note": "Existing deadline confirmed.",
  "should_unpublish_if_expired": false
}
```

Existing deadline changed:

```json
{
  "check_status": "deadline_changed",
  "verified_deadline": "2026-07-15",
  "source_url": "https://official-source-url",
  "evidence": "The official page now lists 15 July 2026 as the application deadline.",
  "note": "Deadline changed on official page.",
  "should_unpublish_if_expired": false
}
```

Expired with clear evidence:

```json
{
  "check_status": "verified_expired",
  "verified_deadline": "2026-05-01",
  "source_url": "https://official-source-url",
  "evidence": "The official page says applications are closed.",
  "note": "Official source shows the call is closed.",
  "should_unpublish_if_expired": true
}
```
