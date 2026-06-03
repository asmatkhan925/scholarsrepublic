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

## Final Templates

Automatic reels use these final text-first templates by default:

- `closing_soon_elegant_light_v1`: cream/white base, deep green top ribbon, gold deadline pill
- `closing_soon_dark_premium_v1`: full deep green background, floating cream cards, gold highlights
- `closing_soon_minimal_kinetic_v1`: typography-first cream layout, huge rank numbers, kinetic accent line
- `prepare_early_elegant_v1`: calm academic planning layout with checklist/document styling
- `single_spotlight_elegant_v1`: one-scholarship spotlight with large title and deadline pill

The renderer uses large mobile-readable text cards, stronger hook copy, rank badges, deadline badges, action lines, Scholars Republic branding, cream/white backgrounds, deep green gradient areas, gold badges, subtle animated background shapes, card shadows, and a progress bar.

Template examples:

- `closing_soon_elegant_light_v1`: "Deadlines are close" / "3 scholarships to check today"
- `closing_soon_dark_premium_v1`: same concise scenes with dark background and floating cream card
- `closing_soon_minimal_kinetic_v1`: same concise scenes with large kinetic typography
- `prepare_early_elegant_v1`: "Start before the rush" / "Scholarships to prepare early"
- `single_spotlight_elegant_v1`: "Scholarship alert" / country and degree when available

Older keys still render for existing plans:

- `closing_soon_text_v1`
- `prepare_early_text_v1`
- `single_scholarship_text_v1`
- `closing_soon_text_v2`
- `prepare_early_text_v2`
- `single_scholarship_text_v2`
- `closing_soon_premium_v3`
- `prepare_early_premium_v3`
- `single_scholarship_premium_v3`
- `closing_soon_premium_v31`
- `closing_soon_dark_accent_v1`
- `closing_soon_card_stack_v1`
- `closing_soon_elegant_v1`
- `closing_soon_dark_v1`
- `prepare_early_premium_v31`
- `single_scholarship_spotlight_v1`

Source scholarship/social images are disabled by default:

```python
SOCIAL_REELS_USE_SOURCE_IMAGES = False
```

If source images are enabled later, they should only be used as dimmed/blurred background accents. They should not be embedded as tiny poster images, screenshots, official seals, or logos.

## Background Music

Rendered reels can optionally include low-volume background music:

```bash
SOCIAL_REELS_BACKGROUND_MUSIC_PATH=/absolute/path/to/royalty-free-track.mp3
SOCIAL_REELS_BACKGROUND_MUSIC_VOLUME=0.12
```

If `SOCIAL_REELS_BACKGROUND_MUSIC_PATH` is empty or the file is missing, the renderer keeps the MP4 silent and does not fail. The default lookup path is:

```text
backend/media/social_reels/audio/default_background.mp3
```

Do not commit copyrighted music. Use only royalty-free, CC0, or properly licensed audio. The renderer loops or trims the track to the exact video duration and muxes it with ffmpeg when available.

Install a licensed direct audio file:

```bash
cd backend
python manage.py install_social_reel_music --url "<DIRECT_MP3_URL>" --source-name "Pixabay/Mixkit/FMA/etc." --license-note "Royalty-free/CC0/Creative Commons/license details"
```

The installer rejects non-http URLs, YouTube/TikTok/Instagram hosts, unsupported content types, files over 15 MB, and missing license notes unless `--allow-missing-license` is explicitly passed. It saves audio to:

```text
backend/media/social_reels/audio/default_background.mp3
```

It also writes license/source metadata beside the file:

```text
backend/media/social_reels/audio/default_background.license.json
```

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
- Rotates among `closing_soon_elegant_light_v1`, `closing_soon_dark_premium_v1`, and `closing_soon_minimal_kinetic_v1`

`prepare_early`

- Picks three scholarships from `advance_notice` and `early_awareness`
- Falls back to a single-scholarship reel if fewer than three safe candidates exist
- Uses `prepare_early_elegant_v1`

`single_scholarship`

- Picks one strong safe scholarship
- Used when there are not enough safe candidates for a three-scholarship reel
- Uses `single_spotlight_elegant_v1`

Closing-soon rotation is deterministic. The planner adds the run date ordinal to
the numeric source opportunity IDs and chooses from the final closing-soon
template list by modulo. No random behavior is used.

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

Force a specific final template key from the CLI:

```bash
cd backend
python manage.py generate_social_reel_plans --reel-type closing_soon --template-key closing_soon_elegant_light_v1 --limit 1 --render --force
python manage.py generate_social_reel_plans --reel-type closing_soon --template-key closing_soon_dark_premium_v1 --limit 1 --render --force
python manage.py generate_social_reel_plans --reel-type closing_soon --template-key closing_soon_minimal_kinetic_v1 --limit 1 --render --force
python manage.py generate_social_reel_plans --reel-type prepare_early --template-key prepare_early_elegant_v1 --limit 1 --render --force
python manage.py generate_social_reel_plans --reel-type single_scholarship --template-key single_spotlight_elegant_v1 --limit 1 --render --force
```

Force a template from the admin API:

```http
POST /api/admin/social/reels/generate/
```

```json
{
  "reel_type": "closing_soon",
  "template_key": "closing_soon_dark_premium_v1",
  "limit": 1,
  "render": true
}
```

Unknown template keys return `400` with `Invalid template key.`. Valid keys for
the wrong reel type return `400` with `Template key does not match reel type.`.

Force generation/render in a test environment:

```bash
cd backend
python manage.py generate_social_reel_plans --limit 1 --render --force
```

Render a specific existing reel plan:

```bash
cd backend
python manage.py render_social_reels --plan-id <PLAN_ID> --force
```

After a successful render, the plan status becomes `ready` automatically when the video exists, duration is within the hard maximum, scenes are valid, a caption exists or is generated, and no render error is present. No separate admin approval step is required for the rendered file.

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

## Remotion Samples

Render final samples from the frontend directory:

```bash
cd frontend
npm run render:reel -- --input remotion/sample-closing-elegant-light.json --output /tmp/sample-closing-elegant-light.mp4
npm run render:reel -- --input remotion/sample-closing-dark-premium.json --output /tmp/sample-closing-dark-premium.mp4
npm run render:reel -- --input remotion/sample-closing-minimal-kinetic.json --output /tmp/sample-closing-minimal-kinetic.mp4
npm run render:reel -- --input remotion/sample-prepare-elegant.json --output /tmp/sample-prepare-elegant.mp4
npm run render:reel -- --input remotion/sample-single-spotlight.json --output /tmp/sample-single-spotlight.mp4
```

If Remotion cannot download its browser binary in the current environment, point
the renderer at an existing Chrome/Chromium executable:

```bash
REMOTION_BROWSER_EXECUTABLE=/path/to/chrome npm run render:reel -- --input remotion/sample-closing-elegant-light.json --output /tmp/sample-closing-elegant-light.mp4
```

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
