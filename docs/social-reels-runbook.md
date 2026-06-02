# Scholars Republic Social Reels

Phase 1 and Phase 2 reels are local, low-cost MP4 renders for admin review. They do not use Canva, Creatomate, paid external APIs, backend GPT/OpenAI APIs, Facebook posting, or Worker automation.

## Create a Reel Plan

Use the admin page:

```text
/dashboard/admin/social/reels
```

Create a manual plan with:

- Title
- Reel type: `closing_soon`, `prepare_early`, `single_scholarship`, or `collection`
- Up to five scenes in `scenes_json`
- Optional source scholarship IDs
- Caption text and hashtags for manual review

The page includes a GPT prompt copy button:

```text
Create a 20-35 second Facebook Reel script for Scholars Republic using only this JSON...
```

Use that prompt in your existing Custom GPT workflow only. The backend does not call GPT.

## Render a Test Reel

Render one plan from the backend:

```bash
cd backend
python manage.py render_social_reels --plan-id 1 --force
```

Preview matching plans without rendering:

```bash
cd backend
python manage.py render_social_reels --dry-run --limit 5
```

The admin page also has a Render button for each plan.

## MP4 Storage

Rendered videos are saved under Django media storage:

```text
MEDIA_ROOT/opportunity_reels/videos/YYYY/MM/
```

Thumbnails are saved under:

```text
MEDIA_ROOT/opportunity_reels/thumbnails/YYYY/MM/
```

The model fields are:

- `OpportunityReelPlan.video_file`
- `OpportunityReelPlan.thumbnail_file`

In local development, the API returns media URLs served from `/media/`.

## Not Automated Yet

This reel system does not:

- Post to Facebook
- Modify or call the Cloudflare Worker
- Generate GPT copy from the backend
- Pull from Canva or Creatomate
- Publish anything automatically
- Use fake university logos, fake official seals, or copyrighted logos
