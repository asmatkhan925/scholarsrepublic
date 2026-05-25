# Scholars Republic Facebook Social Posting Runbook

## 1. Overview

The Facebook social posting system is backend-managed and Worker-executed.

GPT creates scholarship drafts and related social content. Django stores the social draft, promotes it into a published social post plan, and records posting logs. A Cloudflare Worker runs on a schedule, asks Django which scholarship posts are due, publishes those due posts to Facebook, and reports the result back to Django.

Django never posts directly to Facebook. Facebook Page credentials live only in Cloudflare Worker secrets.

Exact GPT-generated images are the primary image workflow. GPT must upload the actual generated image file or a downloadable generated-image URL to Django. A prompt alone is not enough. Backend-generated images are fallback only, and the existing dynamic Open Graph image is the final fallback.

## 2. Architecture

Flow:

```text
Custom GPT
  -> Scholars backend Action
  -> Django social draft/plan storage
  -> Cloudflare scheduled Worker
  -> Facebook Graph API
  -> backend post-result logging
```

Responsibilities:

- Custom GPT creates scholarship and social content.
- Django validates, stores, schedules, and logs social post data.
- Cloudflare Worker owns Facebook Graph API calls.
- Facebook Graph API publishes posts to the Scholars Republic Page.

## 3. Quick Commands

Run Windows PowerShell commands from the repository root:

```powershell
# Set or replace the Facebook Page token from clipboard
.\scripts\facebook\set-page-token.ps1

# Deploy Worker
.\scripts\facebook\deploy-worker.ps1

# Test one due post
.\scripts\facebook\test-one-post.ps1
```

Run server-side Bash commands from the repository root:

```bash
# Check backend status without posting to Facebook
./scripts/facebook/test-due-posts-no-post.sh

# Backfill plans safely
./scripts/facebook/backfill-social-plans.sh

# Clear a failed plan error
./scripts/facebook/clear-plan-error.sh 2
```

## 4. Tokens and Secrets

### `SCHOLARS_AGENT_TOKEN`

- Stored in the Django backend environment.
- Used by the GPT Scholars backend action.
- Sent as header: `X-Agent-Token`.
- Protects agent endpoints such as draft and social-draft creation.

### `GPT_FACEBOOK_POST_TOKEN`

- Stored as a Cloudflare Worker secret.
- Used by the GPT Facebook/manual Worker action.
- Sent as header: `X-GPT-Facebook-Token`.
- Protects manual Worker routes such as `/` and `/run-due-posts`.

### `SCHOLARS_SOCIAL_WORKER_TOKEN`

- Stored in both the Django backend environment and Cloudflare Worker secrets.
- Used by the Cloudflare Worker to call backend due-post endpoints.
- Sent as header: `X-Social-Worker-Token`.
- Must match exactly on both sides.

### `FACEBOOK_PAGE_ID`

- Stored only as a Cloudflare Worker secret.
- Identifies the Scholars Republic Facebook Page.

### `FACEBOOK_PAGE_ACCESS_TOKEN`

- Stored only as a Cloudflare Worker secret.
- Must be a Page token from `/me/accounts`, not a User token.
- Used by the Worker when calling the Facebook Graph API.

## 5. Required Cloudflare Worker Secrets

- `GPT_FACEBOOK_POST_TOKEN`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `SCHOLARS_SOCIAL_WORKER_TOKEN`

Set with:

```bash
npx wrangler secret put GPT_FACEBOOK_POST_TOKEN
npx wrangler secret put FACEBOOK_PAGE_ID
npx wrangler secret put FACEBOOK_PAGE_ACCESS_TOKEN
npx wrangler secret put SCHOLARS_SOCIAL_WORKER_TOKEN
```

## 6. Required Django Environment Variables

- `SCHOLARS_AGENT_TOKEN`
- `SCHOLARS_SOCIAL_WORKER_TOKEN`

These must be present in the backend runtime environment before restarting Django.

## 7. Cron Schedule

Worker cron:

```toml
0 9 * * *
```

This runs daily at `09:00 UTC`.

The scheduled Worker requests a batch of up to `10` due posts by default. The backend still decides whether any scholarship is actually due. The Worker can run safely when no posts are due.

## 8. Backend Posting Rules

Only Facebook social plans are eligible when:

- `platform="facebook"`
- `enabled=True`
- `status="ready"`
- the related scholarship is published or active

Scheduling rules:

- Expired scholarships are skipped.
- Never-posted ready plans for active scholarships are due immediately unless `next_post_at` is in the future.
- Future `next_post_at` values are respected.
- Missing or rolling deadline: post weekly.
- Deadline more than 7 days away: post weekly.
- Deadline within 7 days: post daily.
- If a scholarship was already posted today and the deadline is within 7 days, it is skipped.
- Due posts are ordered by deadline urgency: today and soonest deadlines first, then no-deadline or rolling opportunities, then later deadlines.

## 9. Important Models

### `OpportunitySocialDraft`

Stores GPT-generated social content while an opportunity is still in the draft workflow.

Important fields include:

- `facebook_post_text`
- `facebook_image_prompt`
- `facebook_image`
- `facebook_image_url`
- `social_image_source`
- `social_image_status`
- `social_image_error`
- `social_image_saved_at`
- `status`

### `OpportunitySocialPostPlan`

Stores the publishable social plan for a published `Opportunity`.

Important fields include:

- `opportunity`
- `platform`
- `enabled`
- `status`
- `post_text`
- `image_prompt`
- `image`
- `image_url`
- `social_image_source`
- `social_image_status`
- `social_image_error`
- `social_image_saved_at`
- `link_url`
- `last_posted_at`
- `next_post_at`
- `post_count`
- `last_error`

### `OpportunitySocialPostLog`

Records every Worker posting result.

Important fields include:

- `opportunity`
- `plan`
- `platform`
- `message`
- `image_url`
- `link_url`
- `facebook_post_id`
- `facebook_post_url`
- `status`
- `error_message`
- `posted_at`

## 10. Important Endpoints

### Save social draft content

```text
POST /api/admin/agent/scholarships/drafts/<draft_id>/social-draft/
Header: X-Agent-Token: <SCHOLARS_AGENT_TOKEN>
```

Used by GPT to save Facebook post text, image prompt, image URL, and optional base64 image data for a scholarship draft.

Important: when GPT has generated an image, it should send the actual image using `facebook_image_base64` or `facebook_image_url`. The backend downloads/validates/saves the image into media storage and returns the saved backend `image_url`.

### Save exact social image for a draft

```text
POST /api/admin/agent/scholarships/drafts/<draft_id>/social-image/
Header: X-Agent-Token: <SCHOLARS_AGENT_TOKEN>
```

Use this to save the exact GPT-generated image for a private scholarship draft.

### Save exact social image for a published scholarship

```text
POST /api/admin/agent/scholarships/<id>/social-image/
Header: X-Agent-Token: <SCHOLARS_AGENT_TOKEN>
```

Use this to attach the exact GPT-generated image to a published scholarship Facebook social post plan.

### Fetch due Facebook posts

```text
POST /api/admin/agent/social/facebook/due-posts/
Header: X-Social-Worker-Token: <SCHOLARS_SOCIAL_WORKER_TOKEN>
```

Used by the Worker to fetch currently due Facebook posts.

Image priority in due-post responses:

1. Saved backend social image file from GPT upload/base64/URL
2. Saved local image URL from the social plan
3. Backend-generated image from prompt, if available
4. Dynamic Open Graph image fallback

Facebook posts use the returned backend `image_url` when present.

### Report Facebook post result

```text
POST /api/admin/agent/social/facebook/post-result/
Header: X-Social-Worker-Token: <SCHOLARS_SOCIAL_WORKER_TOKEN>
```

Used by the Worker after each Facebook posting attempt.

## 11. Backfill Existing Scholarships

Use the backfill command to create Facebook social post plans for existing published scholarships that do not already have a Facebook plan.

The command is idempotent. Running it more than once will not duplicate plans.

Backfill does not mean one post per day. Backfilled active scholarships become eligible immediately by setting `next_post_at` to the current time. The backend frequency rules prevent repeated posting after the first post.

The Worker posts a limited batch each day. The default scheduled batch size is `10`. To post more per day, increase the Worker limit carefully and monitor Facebook errors and backend post logs.

### Dry run

```bash
cd /path/to/scholarsrepublic/backend
python manage.py backfill_facebook_social_plans --dry-run
```

### Real backfill

```bash
cd /path/to/scholarsrepublic/backend
python manage.py backfill_facebook_social_plans
```

By default, created plans are ready immediately.

### Limit example

```bash
python manage.py backfill_facebook_social_plans --limit 10
```

### Optional stagger example

```bash
python manage.py backfill_facebook_social_plans --stagger --per-day 3 --start-date 2026-06-01
```

This schedules up to three backfilled plans per day. Use this only when deliberately pacing a manual backfill.

### Manual one-post Worker test

```bash
printf '{"limit":1}\n' > test-run-due-posts.json
curl -sS -X POST "https://<facebook-poster-worker-url>/run-due-posts" \
  -H "Content-Type: application/json" \
  -H "X-GPT-Facebook-Token: $GPT_FACEBOOK_POST_TOKEN" \
  --data @test-run-due-posts.json
```

### Verification shell query

```bash
python manage.py shell -c "from apps.opportunities.models import OpportunitySocialPostPlan; print(OpportunitySocialPostPlan.objects.filter(platform='facebook').count()); print(list(OpportunitySocialPostPlan.objects.filter(platform='facebook').order_by('next_post_at').values_list('opportunity__slug','status','enabled','next_post_at')[:10]))"
```

## 12. Manual Testing Commands

Use `curl.exe` in PowerShell. PowerShell aliases `curl` to `Invoke-WebRequest`, which handles arguments differently.

### Test backend due-posts endpoint from the server

```bash
curl.exe -sS -X POST "https://scholarsrepublic.org/api/admin/agent/social/facebook/due-posts/" ^
  -H "Content-Type: application/json" ^
  -H "X-Social-Worker-Token: %SCHOLARS_SOCIAL_WORKER_TOKEN%" ^
  --data "{\"limit\":1}"
```

Linux server form:

```bash
curl -sS -X POST "https://scholarsrepublic.org/api/admin/agent/social/facebook/due-posts/" \
  -H "Content-Type: application/json" \
  -H "X-Social-Worker-Token: $SCHOLARS_SOCIAL_WORKER_TOKEN" \
  --data '{"limit":1}'
```

### Test Worker due-post run

```bash
curl.exe -sS -X POST "https://<facebook-poster-worker-url>/run-due-posts" ^
  -H "Content-Type: application/json" ^
  -H "X-GPT-Facebook-Token: <GPT_FACEBOOK_POST_TOKEN>" ^
  --data "{\"limit\":10}"
```

### Test manual Worker Facebook post

```bash
curl.exe -sS -X POST "https://<facebook-poster-worker-url>/" ^
  -H "Content-Type: application/json" ^
  -H "X-GPT-Facebook-Token: <GPT_FACEBOOK_POST_TOKEN>" ^
  --data "{\"message\":\"Manual Facebook Worker test from Scholars Republic.\",\"link_url\":\"https://scholarsrepublic.org\"}"
```

## 13. Facebook Token Refresh Procedure

1. Open Meta Graph API Explorer.
2. Generate a User token with these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
3. Call:

```text
GET /me/accounts
```

4. Find the Scholars Republic Page object.
5. Copy the `access_token` from that Page object.
6. Open Meta Access Token Debugger.
7. Verify:
   - token type is `PAGE`
   - `is_valid` is `true`
   - permissions include `pages_manage_posts`
   - permissions include `pages_read_engagement`
8. Put that Page token into Cloudflare as `FACEBOOK_PAGE_ACCESS_TOKEN`.

Do not use the User token as `FACEBOOK_PAGE_ACCESS_TOKEN`.

## 14. Troubleshooting

### `401 Unauthorized` from Worker

Likely cause: `GPT_FACEBOOK_POST_TOKEN` is missing or wrong.

Check:

- Worker secret exists.
- Request header is `X-GPT-Facebook-Token`.
- The header value exactly matches the Worker secret.

### `403` from backend due-posts

Likely cause: `SCHOLARS_SOCIAL_WORKER_TOKEN` mismatch.

Check:

- Django environment has `SCHOLARS_SOCIAL_WORKER_TOKEN`.
- Cloudflare Worker secret has `SCHOLARS_SOCIAL_WORKER_TOKEN`.
- Both values match exactly.
- Request header is `X-Social-Worker-Token`.

### `502 Facebook posting failed`

Likely cause: Facebook Page token is expired, wrong, or missing permissions.

Check:

- `FACEBOOK_PAGE_ACCESS_TOKEN` is a Page token, not a User token.
- Token is valid in Access Token Debugger.
- Token has `pages_manage_posts` and `pages_read_engagement`.
- `FACEBOOK_PAGE_ID` is correct.

### `due_count 0`

Likely cause: no eligible social post plan exists.

Check:

- `OpportunitySocialPostPlan.status` is `ready`.
- `OpportunitySocialPostPlan.enabled` is `True`.
- `OpportunitySocialPostPlan.platform` is `facebook`.
- The related scholarship is published or active.
- The scholarship is not expired.

### PowerShell `curl` issue

Use `curl.exe`, not `curl`, in PowerShell.

## 15. Deployment Commands

### Backend

```bash
cd /path/to/scholarsrepublic
git pull origin main
cd backend
python manage.py migrate
python manage.py check
sudo systemctl restart scholarsrepublic
```

Adjust the systemd service name if production uses a different service name.

### Worker

```bash
cd /path/to/scholarsrepublic/workers/facebook-poster
npm run check
npx wrangler deploy
```

If there is no local `package.json` for the Worker, use:

```bash
node --check src/index.js
npx wrangler deploy
```

## 16. Security Notes

- Never paste tokens in chat, GitHub issues, logs, screenshots, or support tickets.
- Rotate any token that may have been exposed.
- Keep the Facebook Page token only in Cloudflare Worker secrets.
- Do not commit secrets.
- Do not print access tokens in Worker logs.
- Do not return secrets from debug endpoints or health checks.
