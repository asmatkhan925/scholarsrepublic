# Scholars Republic Social Reels

Social reels are local, low-cost MP4 renders for admin review. They do not use Canva, Creatomate, paid external APIs, backend GPT/OpenAI APIs, Facebook posting, or Worker automation.

## Admin Page

Use:

```text
/dashboard/admin/social/reels
```

The page supports both workflows:

- Manual reel plan creation
- Automatic reel plan selection from safe scholarship records

Nothing is posted automatically.

## Short Duration Rules

Reels are intentionally short:

- `single_scholarship`: target about 5 seconds, hard maximum 6 seconds
- `closing_soon` and `prepare_early`: target about 7-9 seconds, hard maximum 9 seconds

Scene timing is calculated by the renderer at render time. The renderer rejects plans with more than five scenes and writes a clear render error instead of creating a long video.

## Text-First Templates

Automatic reels use text-first templates by default:

- `closing_soon_text_v1`
- `prepare_early_text_v1`
- `single_scholarship_text_v1`

The renderer uses large mobile-readable text cards, rank badges, deadline badges, Scholars Republic branding, cream/white backgrounds, deep green accents, and gold accents.

Source scholarship/social images are disabled by default:

```python
SOCIAL_REELS_USE_SOURCE_IMAGES = False
```

If source images are enabled later, they should only be used as dimmed/blurred background accents. They should not be embedded as tiny poster images, screenshots, official seals, or logos.

## Automatic Selection

Automatic reel planning selects published, non-expired scholarship opportunities only. It requires a title and public slug, avoids expired records, and avoids missing or unclear deadlines for urgent-style reels.

Selection reuses existing social safety concepts:

- Deadline windows from `get_deadline_window`
- Expiry checks from `is_opportunity_expired_for_social`
- Priority scores from `score_opportunity_for_social`

It does not mark normal Facebook social plans as posted, skipped, consumed, or due. It does not call the Facebook Worker.

## Reel Types

`closing_soon`

- Picks three scholarships from `urgent`, `soon`, and `advance_notice`
- Prefers max one urgent and max one soon, then fills with advance notice when available
- Falls back to a single-scholarship reel if fewer than three safe candidates exist
- Uses `closing_soon_text_v1`

`prepare_early`

- Picks three scholarships from `advance_notice` and `early_awareness`
- Falls back to a single-scholarship reel if fewer than three safe candidates exist
- Uses `prepare_early_text_v1`

`single_scholarship`

- Picks one strong safe scholarship
- Used when there are not enough safe candidates for a three-scholarship reel
- Uses `single_scholarship_text_v1`

## Deduplication

Automatic planning skips new plans when:

- The exact source scholarship set already exists in a non-archived reel plan from the last seven days
- Any one scholarship has already appeared in two reel plans in the last seven days
- The daily reel plan limit has already been reached

Initial defaults:

- `SOCIAL_REELS_DAILY_PLAN_LIMIT = 1`
- `SOCIAL_REELS_MAX_PER_RUN = 1`
- `SOCIAL_REELS_RECENT_DAYS_DEDUP = 7`
- `SOCIAL_REELS_MAX_USE_PER_OPPORTUNITY_PER_WEEK = 2`

## Commands

Preview automatic selection without saving:

```bash
cd backend
python manage.py generate_social_reel_plans --limit 1 --dry-run
```

Generate one automatic reel plan:

```bash
cd backend
python manage.py generate_social_reel_plans --limit 1
```

Generate and render one automatic reel plan:

```bash
cd backend
python manage.py generate_social_reel_plans --limit 1 --render
```

Render a specific existing reel plan:

```bash
cd backend
python manage.py render_social_reels --plan-id <PLAN_ID> --force
```

Run the normal daily social scheduler and also prepare one reel plan:

```bash
cd backend
python manage.py run_daily_social_scheduler --generate-reels
```

Render reels during that optional scheduler run:

```bash
cd backend
python manage.py run_daily_social_scheduler --generate-reels --render-reels
```

Do not add these flags to the production timer until reel posting/review operations are ready.

## MP4 Storage

Rendered videos are saved under Django media storage:

```text
MEDIA_ROOT/opportunity_reels/videos/YYYY/MM/
```

Thumbnails are saved under:

```text
MEDIA_ROOT/opportunity_reels/thumbnails/YYYY/MM/
```

In local development, this usually means:

```text
backend/media/opportunity_reels/videos/YYYY/MM/
```

## Not Automated Yet

This reel system does not:

- Post to Facebook
- Modify or call the Cloudflare Worker
- Generate GPT copy from the backend
- Pull from Canva or Creatomate
- Publish anything automatically
- Use fake university logos, fake official seals, or copyrighted logos
