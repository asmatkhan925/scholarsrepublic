# Scholarship Deadline Verification Runbook

## Purpose

This system lets the Scholars Republic Custom GPT/admin agent find published scholarships that need deadline verification, inspect their official or source pages, and submit structured results back to Django.

The goal is to keep scholarship deadlines accurate without letting the agent directly edit broad scholarship content. The agent should only report deadline verification facts and evidence.

## Architecture

```text
Custom GPT/admin agent
  -> GET deadline-check queue from Django
  -> inspect official/source/application page
  -> POST structured verification result to Django
  -> Django updates deadline check fields
  -> Django writes OpportunityDeadlineCheckLog
```

Django stores the current deadline check status on `Opportunity` and records every submitted result in `OpportunityDeadlineCheckLog`.

## Endpoints

### Fetch Queue

```text
GET /api/admin/agent/scholarships/deadline-check-queue/
Header: X-Agent-Token: <SCHOLARS_AGENT_TOKEN>
```

Query parameters:

- `limit`: default `10`, max `50`
- `days_ahead`: default `14`
- `include_missing_deadline`: default `true`

Returns published scholarships with an official or source URL when one of these is true:

- deadline is missing
- deadline is within `days_ahead`
- deadline has never been checked
- deadline was last checked more than 14 days ago

Queue ordering:

1. Missing deadline first
2. Past deadline
3. Nearest upcoming deadline
4. Oldest checked first

### Submit Result

```text
POST /api/admin/agent/scholarships/<id>/deadline-check-result/
Header: X-Agent-Token: <SCHOLARS_AGENT_TOKEN>
Content-Type: application/json
```

Payload:

```json
{
  "check_status": "deadline_changed",
  "verified_deadline": "2026-06-30",
  "source_url": "https://example.edu/scholarship",
  "evidence": "The official page lists the application deadline as 30 June 2026.",
  "note": "Deadline updated from official page.",
  "should_unpublish_if_expired": false
}
```

## GPT Workflow

1. Call the queue endpoint.
2. Pick one scholarship from `items`.
3. Open the official URL first. If unavailable, use the source URL.
4. Look for explicit deadline, closing date, application period, or closed/expired wording.
5. Submit one result payload per scholarship.
6. Include concise evidence copied or summarized from the official/source page.
7. If the result is unclear, submit `unclear` and do not invent a deadline.

## Status Meanings

- `unchecked`: no agent verification result has been submitted yet.
- `verified_active`: the current deadline is still valid or the scholarship is active.
- `verified_expired`: the official/source page clearly shows the opportunity is closed or expired.
- `deadline_changed`: the official/source page shows a different deadline.
- `unclear`: the page does not provide enough reliable evidence.
- `source_unreachable`: the official/source page could not be reached.

When `verified_expired` is submitted with `should_unpublish_if_expired=true`, Django archives the opportunity. The project has no dedicated `expired` status, so `archived` is used.

## Payload Examples

### Verified Active

```json
{
  "check_status": "verified_active",
  "verified_deadline": "2026-06-09",
  "source_url": "https://example.edu/call",
  "evidence": "The call page still lists the application deadline as 9 June 2026.",
  "note": "Deadline confirmed.",
  "should_unpublish_if_expired": false
}
```

### Deadline Changed

```json
{
  "check_status": "deadline_changed",
  "verified_deadline": "2026-07-15",
  "source_url": "https://example.edu/call",
  "evidence": "The official page says applications close on 15 July 2026.",
  "note": "Updated deadline from official page.",
  "should_unpublish_if_expired": false
}
```

### Verified Expired

```json
{
  "check_status": "verified_expired",
  "verified_deadline": "2026-05-01",
  "source_url": "https://example.edu/call",
  "evidence": "The official page says applications are closed.",
  "note": "Archive because official source shows closed applications.",
  "should_unpublish_if_expired": true
}
```

### Source Unreachable

```json
{
  "check_status": "source_unreachable",
  "verified_deadline": null,
  "source_url": "https://example.edu/call",
  "evidence": "",
  "note": "Official page returned an error during verification.",
  "should_unpublish_if_expired": false
}
```

## Testing Curl Commands

Use `curl.exe` in PowerShell.

### Fetch Queue

```bash
curl.exe -sS "https://scholarsrepublic.org/api/admin/agent/scholarships/deadline-check-queue/?limit=5&days_ahead=14" ^
  -H "X-Agent-Token: <SCHOLARS_AGENT_TOKEN>"
```

Linux form:

```bash
curl -sS "https://scholarsrepublic.org/api/admin/agent/scholarships/deadline-check-queue/?limit=5&days_ahead=14" \
  -H "X-Agent-Token: $SCHOLARS_AGENT_TOKEN"
```

### Submit Result

```bash
curl.exe -sS -X POST "https://scholarsrepublic.org/api/admin/agent/scholarships/123/deadline-check-result/" ^
  -H "Content-Type: application/json" ^
  -H "X-Agent-Token: <SCHOLARS_AGENT_TOKEN>" ^
  --data "{\"check_status\":\"unclear\",\"verified_deadline\":null,\"source_url\":\"https://example.edu/call\",\"evidence\":\"Conflicting dates found.\",\"note\":\"Needs human review.\",\"should_unpublish_if_expired\":false}"
```

## Safety Rules

- Never expire or archive an opportunity without evidence from the official/source page.
- If the official page is unreachable, mark `source_unreachable`; do not expire.
- If evidence is unclear or conflicting, mark `unclear`; do not expire.
- Do not invent deadlines.
- Prefer the official scholarship/provider page over secondary sources.
- Keep evidence short and specific.
- Do not paste agent tokens into chat, logs, screenshots, or committed files.
