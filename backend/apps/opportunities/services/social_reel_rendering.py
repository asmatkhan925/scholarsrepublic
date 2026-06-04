import hashlib
import json
import math
import re
import shutil
import subprocess
import tempfile
import textwrap
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from apps.opportunities.models import (
    Opportunity,
    OpportunityReelLog,
    OpportunityReelPlan,
    OpportunitySocialPostPlan,
)


WIDTH = 1080
HEIGHT = 1920
SINGLE_REEL_TARGET_SECONDS = 5.0
SINGLE_REEL_MAX_SECONDS = 6.0
MULTI_REEL_TARGET_SECONDS = 8.0
MULTI_REEL_MAX_SECONDS = 9.0
MAX_SCENES = 5
MAX_AUTO_TITLE_CHARS = 42
ELEGANT_LIGHT_TITLE_CHARS = 120
MAX_AUTO_BLOCK_CHARS = 48
MOTION_FPS = 8
SOCIAL_REELS_USE_SOURCE_IMAGES = False
REMOTION_RENDERER_RELATIVE_DIR = Path("frontend")
TEXT_TEMPLATE_BY_REEL_TYPE = {
    OpportunityReelPlan.ReelType.CLOSING_SOON: "closing_soon_elegant_light_v1",
    OpportunityReelPlan.ReelType.PREPARE_EARLY: "prepare_early_elegant_v1",
    OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP: "single_spotlight_elegant_v1",
}
LEGACY_TEXT_TEMPLATE_KEYS = {
    "closing_soon_text_v1",
    "prepare_early_text_v1",
    "single_scholarship_text_v1",
    "closing_soon_text_v2",
    "prepare_early_text_v2",
    "single_scholarship_text_v2",
    "closing_soon_premium_v3",
    "prepare_early_premium_v3",
    "single_scholarship_premium_v3",
}
TEMPLATE_KEYS_BY_REEL_TYPE = {
    OpportunityReelPlan.ReelType.CLOSING_SOON: {
        "closing_soon_elegant_light_v1",
        "closing_soon_dark_premium_v1",
        "closing_soon_minimal_kinetic_v1",
        "closing_soon_elegant_v1",
        "closing_soon_dark_v1",
        "closing_soon_premium_v31",
        "closing_soon_dark_accent_v1",
        "closing_soon_card_stack_v1",
        "closing_soon_premium_v3",
        "closing_soon_text_v1",
        "closing_soon_text_v2",
    },
    OpportunityReelPlan.ReelType.PREPARE_EARLY: {
        "prepare_early_elegant_v1",
        "prepare_early_premium_v31",
        "prepare_early_premium_v3",
        "prepare_early_text_v1",
        "prepare_early_text_v2",
    },
    OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP: {
        "single_spotlight_elegant_v1",
        "single_scholarship_spotlight_v1",
        "single_scholarship_premium_v3",
        "single_scholarship_text_v1",
        "single_scholarship_text_v2",
    },
}
TEXT_TEMPLATE_KEYS = set(TEXT_TEMPLATE_BY_REEL_TYPE.values()) | LEGACY_TEXT_TEMPLATE_KEYS | {
    template_key for keys in TEMPLATE_KEYS_BY_REEL_TYPE.values() for template_key in keys
}
BG = "#fbf7ee"
PINE = "#0f4f3a"
DEEP_PINE = "#0a3b2b"
GOLD = "#d7a642"
INK = "#17342a"
MUTED = "#5f746b"
WHITE = "#ffffff"
SOFT_GREEN = "#e8f2ec"
SOFT_GOLD = "#f5ead0"
PATTERN = "#eef4ef"
SHADOW = "#e5d9c4"


class ReelRenderError(Exception):
    pass


def render_reel_plan(plan, force=False):
    if plan.status in {OpportunityReelPlan.Status.PAUSED, OpportunityReelPlan.Status.ARCHIVED}:
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.SKIPPED,
            response_payload={"reason": f"{plan.status}_plan_not_rendered"},
        )
        return {
            "ok": True,
            "skipped": True,
            "status": plan.status,
            "reason": f"{plan.status}_plan_not_rendered",
        }

    if plan.status in {OpportunityReelPlan.Status.RENDERED, OpportunityReelPlan.Status.READY} and plan.video_file and not force:
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.SKIPPED,
            response_payload={"reason": "already_rendered_or_ready"},
        )
        return {
            "ok": True,
            "skipped": True,
            "video_file": plan.video_file.name,
            "video_url": plan.resolved_video_url,
        }

    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise ReelRenderError("ffmpeg was not found on PATH.")

    plan.status = OpportunityReelPlan.Status.RENDERING
    plan.render_error = ""
    plan.save(update_fields=["status", "render_error", "updated_at"])

    try:
        scenes = build_scenes(plan)
        expected_duration = expected_reel_duration(plan)
        with tempfile.TemporaryDirectory(prefix=f"sr-reel-{plan.pk}-") as tmp_dir:
            tmp_path = Path(tmp_dir)
            image_path = find_optional_social_image(plan) if source_images_enabled() else None
            silent_output_path = tmp_path / f"scholars-republic-reel-{plan.pk}-silent.mp4"
            output_path = tmp_path / f"scholars-republic-reel-{plan.pk}.mp4"
            renderer_payload = render_silent_reel_video(
                plan,
                scenes,
                expected_duration,
                tmp_path,
                silent_output_path,
                ffmpeg_path,
                image_path=image_path,
            )
            audio_payload = add_optional_background_music(
                ffmpeg_path,
                silent_output_path,
                output_path,
                expected_duration,
                plan=plan,
            )

            thumbnail_path = tmp_path / f"scholars-republic-reel-{plan.pk}.jpg"
            thumbnail_frame_path = tmp_path / f"scholars-republic-reel-{plan.pk}-thumbnail.png"
            render_scene_frame(
                scenes[0],
                0,
                len(scenes),
                thumbnail_frame_path,
                image_path=image_path,
                progress=1.0,
            )
            Image.open(thumbnail_frame_path).convert("RGB").save(thumbnail_path, quality=92)

            if not (plan.caption_text or "").strip():
                plan.caption_text = generated_caption_text(plan)

            with output_path.open("rb") as video_handle:
                plan.video_file.save(output_path.name, File(video_handle), save=False)
            with thumbnail_path.open("rb") as thumbnail_handle:
                plan.thumbnail_file.save(thumbnail_path.name, File(thumbnail_handle), save=False)

        plan.video_url = ""
        plan.render_error = ""
        plan.status = OpportunityReelPlan.Status.READY if render_ready_checks_pass(plan, scenes, expected_duration) else OpportunityReelPlan.Status.RENDERED
        plan.save(
            update_fields=[
                "video_file",
                "video_url",
                "thumbnail_file",
                "status",
                "render_error",
                "caption_text",
                "updated_at",
            ]
        )

        payload = {
            "video_file": plan.video_file.name,
            "video_url": plan.resolved_video_url,
            "thumbnail_file": plan.thumbnail_file.name if plan.thumbnail_file else "",
            "duration_seconds": expected_duration,
            "scene_count": len(scenes),
            "template_key": resolved_template_key(plan),
            "source_images_used": bool(image_path),
            "audio_added": audio_payload["audio_added"],
            "audio_path": audio_payload["audio_path"],
            "audio_track_name": audio_payload["audio_track_name"],
            "audio_error": audio_payload["audio_error"],
            "renderer_used": renderer_payload["renderer_used"],
            "renderer_error": renderer_payload["renderer_error"],
            "status": plan.status,
        }
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.RENDERED,
            response_payload=payload,
        )
        return {"ok": True, "skipped": False, **payload}
    except Exception as exc:
        plan.status = OpportunityReelPlan.Status.FAILED
        plan.render_error = str(exc)
        plan.save(update_fields=["status", "render_error", "updated_at"])
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.FAILED,
            error_message=str(exc),
        )
        raise


def build_scenes(plan):
    raw_scenes = plan.scenes_json if isinstance(plan.scenes_json, list) else []
    if not raw_scenes:
        raw_scenes = fallback_scenes(plan)

    scenes = []
    title_width = (
        ELEGANT_LIGHT_TITLE_CHARS
        if resolved_template_key(plan) == "closing_soon_elegant_light_v1"
        else MAX_AUTO_TITLE_CHARS
    )
    if len(raw_scenes) > MAX_SCENES:
        raise ReelRenderError(f"Reels support at most {MAX_SCENES} scenes.")

    for item in raw_scenes:
        if isinstance(item, str):
            title = item
            body = ""
            label = ""
            blocks = []
            scene_type = ""
            subheadline = ""
            action_line = ""
            rank = None
            funding_badge = ""
        elif isinstance(item, dict):
            title = str(item.get("title") or item.get("headline") or "").strip()
            body = str(item.get("body") or item.get("text") or item.get("description") or "").strip()
            label = str(item.get("label") or item.get("kicker") or "").strip()
            scene_type = str(item.get("scene_type") or item.get("type") or "").strip()
            subheadline = str(item.get("subheadline") or "").strip()
            action_line = str(item.get("action_line") or item.get("action") or "").strip()
            rank = item.get("rank")
            funding_badge = str(item.get("funding_badge") or "").strip()
            raw_blocks = item.get("blocks")
            blocks = raw_blocks if isinstance(raw_blocks, list) else []
        else:
            continue

        if not title and body:
            title, body = body, ""
        if not title:
            continue

        scenes.append(
            normalize_scene(
                title=title,
                body=body,
                label=label,
                blocks=blocks,
                scene_type=scene_type,
                subheadline=subheadline,
                action_line=action_line,
                rank=rank,
                funding_badge=funding_badge,
                title_width=title_width,
            )
        )

    if not scenes:
        scenes = fallback_scenes(plan)

    scenes = scenes[:MAX_SCENES]
    durations = calculate_scene_durations(plan.reel_type, len(scenes))
    for scene, duration in zip(scenes, durations):
        scene["duration"] = duration
    return scenes


def fallback_scenes(plan):
    opportunities = list(get_source_opportunities(plan)[:3])
    title = plan.title or "Scholarship update"
    caption = plan.caption_text or plan.script_text or plan.voiceover_text
    scenes = [
        {
            "scene_type": "hook",
            "label": "Scholars Republic",
            "title": title,
            "subheadline": "Scholarships to review",
        },
    ]

    for opportunity in opportunities:
        deadline = opportunity.deadline.isoformat() if opportunity.deadline else "Check official page"
        scenes.append(
            {
                "label": "Scholarship",
                "scene_type": "scholarship",
                "title": opportunity.title,
                "blocks": [opportunity.country or opportunity.provider_name, f"Deadline: {deadline}"],
                "action_line": "Check eligibility today",
            }
        )

    if caption:
        scenes.append(
            {
                "label": "Next step",
                "scene_type": "cta",
                "title": "Review details before applying",
                "body": caption[:80],
            }
        )

    scenes.append(
        {
            "label": "Scholars Republic",
            "scene_type": "cta",
            "title": "Check official links",
            "subheadline": "Official links on Scholars Republic",
            "blocks": ["ScholarsRepublic.org"],
        }
    )
    title_width = (
        ELEGANT_LIGHT_TITLE_CHARS
        if resolved_template_key(plan) == "closing_soon_elegant_light_v1"
        else MAX_AUTO_TITLE_CHARS
    )
    return [normalize_scene(**scene, title_width=title_width) for scene in scenes[:MAX_SCENES]]


def normalize_scene(
    *,
    title,
    body="",
    label="",
    blocks=None,
    scene_type="",
    subheadline="",
    action_line="",
    rank=None,
    funding_badge="",
    title_width=MAX_AUTO_TITLE_CHARS,
):
    blocks = blocks or []
    normalized_blocks = []
    for item in blocks:
        text = str(item or "").strip()
        if text:
            normalized_blocks.append(textwrap.shorten(text, width=MAX_AUTO_BLOCK_CHARS, placeholder="..."))

    if body and not normalized_blocks:
        for item in str(body).replace(" | ", "\n").splitlines():
            text = item.strip()
            if text:
                normalized_blocks.append(
                    textwrap.shorten(text, width=MAX_AUTO_BLOCK_CHARS, placeholder="...")
                )

    return {
        "scene_type": normalize_scene_type(scene_type),
        "title": shorten_reel_title(str(title).strip(), width=title_width),
        "subheadline": textwrap.shorten(
            str(subheadline or "").strip(),
            width=MAX_AUTO_BLOCK_CHARS,
            placeholder="...",
        ),
        "action_line": textwrap.shorten(
            str(action_line or "").strip(),
            width=MAX_AUTO_BLOCK_CHARS,
            placeholder="...",
        ),
        "body": "\n".join(normalized_blocks[:3]),
        "blocks": normalized_blocks[:3],
        "label": textwrap.shorten(str(label or "").strip(), width=28, placeholder="..."),
        "rank": rank,
        "funding_badge": textwrap.shorten(
            str(funding_badge or "").strip(),
            width=24,
            placeholder="...",
        ),
    }


def normalize_scene_type(value):
    value = str(value or "").strip()
    return value if value in {"hook", "scholarship", "cta"} else "scholarship"


def source_images_enabled():
    return bool(getattr(settings, "SOCIAL_REELS_USE_SOURCE_IMAGES", SOCIAL_REELS_USE_SOURCE_IMAGES))


def resolved_template_key(plan):
    template_key = str(getattr(plan, "template_key", "") or "").strip()
    if template_key in TEXT_TEMPLATE_KEYS:
        return template_key
    return TEXT_TEMPLATE_BY_REEL_TYPE.get(plan.reel_type, "single_spotlight_elegant_v1")


def template_key_is_valid_for_reel_type(template_key, reel_type):
    template_key = str(template_key or "").strip()
    if not template_key:
        return True
    return template_key in TEMPLATE_KEYS_BY_REEL_TYPE.get(reel_type, set())


def shorten_reel_title(value, width=MAX_AUTO_TITLE_CHARS):
    text = " ".join(str(value or "").split())
    if len(text) <= width:
        return text

    cleaned = text
    removals = [
        r"\bFully[- ]Funded\b",
        r"\bScholarships\b",
        r"\bScholarship\b",
        r"\b2026\b",
        r"\b2027\b",
    ]
    for pattern in removals:
        candidate = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        candidate = re.sub(r"\s+([:|,-])\s+", " ", candidate)
        candidate = " ".join(candidate.split(" - "))
        candidate = " ".join(candidate.split())
        if candidate and len(candidate) <= width:
            return candidate
        if candidate:
            cleaned = candidate

    provider_match = re.search(r"\b(at|by|from)\s+(.+)$", cleaned, flags=re.IGNORECASE)
    if provider_match:
        provider = provider_match.group(2).strip()
        prefix = cleaned[: provider_match.start()].strip(" -:|")
        provider_fragment = f"{provider_match.group(1)} {provider}"
        if len(provider_fragment) <= width:
            available = width - len(provider_fragment) - 4
            prefix_words = []
            for word in prefix.split():
                candidate = " ".join(prefix_words + [word])
                if len(candidate) <= available:
                    prefix_words.append(word)
            if prefix_words:
                candidate = f"{' '.join(prefix_words)}... {provider_fragment}"
                if len(candidate) <= width:
                    return candidate
            return textwrap.shorten(provider_fragment, width=width, placeholder="...")

    return textwrap.shorten(cleaned, width=width, placeholder="...")


def calculate_scene_durations(reel_type, scene_count):
    if scene_count <= 0:
        raise ReelRenderError("A reel needs at least one scene.")
    if scene_count > MAX_SCENES:
        raise ReelRenderError(f"Reels support at most {MAX_SCENES} scenes.")

    if reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        if scene_count == 1:
            durations = [SINGLE_REEL_TARGET_SECONDS]
        elif scene_count == 2:
            durations = [1.2, 3.8]
        else:
            middle_count = scene_count - 2
            middle_duration = min(2.0, (SINGLE_REEL_TARGET_SECONDS - 2.4) / middle_count)
            durations = [1.2] + [middle_duration] * middle_count + [1.2]
    else:
        if scene_count == 1:
            durations = [min(MULTI_REEL_TARGET_SECONDS, MULTI_REEL_MAX_SECONDS)]
        elif scene_count == 2:
            durations = [1.2, 2.0]
        else:
            middle_count = scene_count - 2
            middle_duration = min(2.0, (MULTI_REEL_TARGET_SECONDS - 2.2) / middle_count)
            durations = [1.1] + [middle_duration] * middle_count + [1.1]

    max_seconds = max_reel_duration(reel_type)
    total = round(sum(durations), 2)
    if total > max_seconds:
        scale = max_seconds / total
        durations = [round(duration * scale, 2) for duration in durations]

    return [round(duration, 2) for duration in durations]


def max_reel_duration(reel_type):
    if reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        return SINGLE_REEL_MAX_SECONDS
    return MULTI_REEL_MAX_SECONDS


def expected_reel_duration(plan):
    scenes = build_scenes(plan)
    total = round(sum(float(scene["duration"]) for scene in scenes), 2)
    maximum = max_reel_duration(plan.reel_type)
    if total > maximum:
        raise ReelRenderError(
            f"Expected reel duration {total}s exceeds the {maximum}s maximum for {plan.reel_type}."
        )
    return total


def get_source_opportunities(plan):
    ids = plan.source_opportunity_ids if isinstance(plan.source_opportunity_ids, list) else []
    cleaned_ids = []
    for value in ids:
        try:
            cleaned_ids.append(int(value))
        except (TypeError, ValueError):
            continue
    return Opportunity.objects.filter(id__in=cleaned_ids).select_related("country_ref").order_by("deadline", "title")


def find_optional_social_image(plan):
    opportunity = get_source_opportunities(plan).first()
    if not opportunity:
        return None
    social_plan = (
        OpportunitySocialPostPlan.objects.filter(opportunity=opportunity, image__isnull=False)
        .exclude(image="")
        .order_by("-updated_at")
        .first()
    )
    if not social_plan or not social_plan.image:
        return None
    try:
        return Path(social_plan.image.path)
    except ValueError:
        return None


def render_silent_reel_video(
    plan,
    scenes,
    expected_duration,
    tmp_path,
    silent_output_path,
    ffmpeg_path,
    *,
    image_path=None,
):
    try:
        render_remotion_reel(plan, scenes, expected_duration, tmp_path, silent_output_path)
        return {"renderer_used": "remotion", "renderer_error": ""}
    except Exception as exc:
        render_python_reel_frames(scenes, tmp_path, silent_output_path, ffmpeg_path, image_path=image_path)
        return {"renderer_used": "fallback", "renderer_error": str(exc)}


def render_remotion_reel(plan, scenes, expected_duration, tmp_path, silent_output_path):
    frontend_dir = remotion_frontend_dir()
    if not frontend_dir.exists():
        raise ReelRenderError(f"Remotion frontend directory was not found: {frontend_dir}")

    input_path = tmp_path / f"scholars-republic-reel-{plan.pk}-input.json"
    input_payload = {
        "title": plan.title,
        "reel_type": plan.reel_type,
        "template_key": resolved_template_key(plan),
        "duration_seconds": expected_duration,
        "scenes": scenes,
    }
    input_path.write_text(json.dumps(input_payload), encoding="utf-8")

    npm_command = "npm.cmd" if shutil.which("npm.cmd") else "npm"
    command = [
        npm_command,
        "run",
        "render:reel",
        "--",
        "--input",
        str(input_path),
        "--output",
        str(silent_output_path),
    ]
    completed = subprocess.run(
        command,
        cwd=frontend_dir,
        capture_output=True,
        text=True,
        check=False,
        timeout=int(getattr(settings, "SOCIAL_REELS_REMOTION_TIMEOUT_SECONDS", 600)),
    )
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "Remotion render failed."
        raise ReelRenderError(message)
    if not silent_output_path.exists():
        raise ReelRenderError("Remotion render completed without creating an MP4.")


def remotion_frontend_dir():
    configured = str(getattr(settings, "SOCIAL_REELS_REMOTION_FRONTEND_DIR", "") or "").strip()
    if configured:
        return Path(configured)
    return Path(settings.BASE_DIR).parent / REMOTION_RENDERER_RELATIVE_DIR


def render_python_reel_frames(scenes, tmp_path, silent_output_path, ffmpeg_path, *, image_path=None):
    frame_paths = []
    for index, scene in enumerate(scenes):
        frame_paths.extend(
            render_scene_motion_frames(
                scene,
                index,
                len(scenes),
                tmp_path,
                image_path=image_path,
            )
        )
    concat_file = write_concat_file(tmp_path, frame_paths, scenes)
    encode_video(ffmpeg_path, concat_file, silent_output_path)


def render_scene_motion_frames(scene, index, total, tmp_path, image_path=None):
    scene_duration = float(scene["duration"])
    frame_count = max(2, int(math.ceil(scene_duration * MOTION_FPS)))
    frame_paths = []
    for frame_index in range(frame_count):
        progress = frame_index / max(1, frame_count - 1)
        frame_path = tmp_path / f"scene_{index:02d}_{frame_index:02d}.png"
        frame_duration = scene_duration / frame_count
        render_scene_frame(
            scene,
            index,
            total,
            frame_path,
            image_path=image_path,
            progress=progress,
            frame_duration=frame_duration,
        )
        frame_paths.append(frame_path)
    return frame_paths


def render_scene_frame(scene, index, total, output_path, image_path=None, progress=1.0, frame_duration=None):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    fonts = load_fonts()
    scene_type = scene.get("scene_type") or "scholarship"
    ease = 1 - pow(1 - progress, 3)
    slide = int((1 - ease) * 70)

    if image_path:
        paste_optional_background_accent(image, image_path)

    render_background(draw, index=index, progress=progress)
    render_brand(draw, fonts)

    if scene_type == "hook":
        render_hook_scene(draw, scene, fonts, slide=slide)
    elif scene_type == "cta":
        render_cta_scene(draw, scene, fonts, slide=slide)
    else:
        render_scholarship_scene(draw, scene, index, fonts, slide=slide)

    render_progress(draw, fonts, index, total)
    image.save(output_path)


def render_background(draw, *, index, progress):
    drift = int(progress * 64)
    draw.rectangle((0, 0, WIDTH, 280), fill=DEEP_PINE)
    draw.polygon((0, 210, WIDTH, 118, WIDTH, 322, 0, 380), fill=PINE)
    draw.rectangle((0, HEIGHT - 34, WIDTH, HEIGHT), fill=GOLD)
    draw.ellipse((WIDTH - 440 + drift, 156, WIDTH + 190 + drift, 786), fill=SOFT_GREEN)
    draw.ellipse((-260 - drift, 1160, 340 - drift, 1760), fill=SOFT_GOLD)
    draw.ellipse((760 - drift // 2, 1260, 1180 - drift // 2, 1680), fill="#edf7f2")
    draw.ellipse((118 + drift // 3, 214, 340 + drift // 3, 436), fill="#155f45")
    for row in range(320, 1460, 170):
        for column in range(126, 960, 170):
            radius = 4 if (row + column + index * 17) % 3 else 6
            draw.ellipse((column, row, column + radius, row + radius), fill=PATTERN)
    card_y = 286 + (index % 2) * 20
    draw.rounded_rectangle((96, card_y + 18, 1012, 1550 + (index % 2) * 20), radius=60, fill=SHADOW)
    draw.rounded_rectangle((80, card_y, 1000, 1532 + (index % 2) * 20), radius=60, fill="#fffdf8")
    draw.rounded_rectangle((80, card_y, 1000, 1532 + (index % 2) * 20), radius=56, outline="#eadfc9", width=3)


def render_brand(draw, fonts):
    draw.rounded_rectangle((72, 78, 478, 154), radius=38, fill=WHITE, outline="#eadfc9", width=2)
    draw.text((104, 96), "Scholars Republic", fill=PINE, font=fonts["brand"])
    draw.rounded_rectangle((104, 168, 344, 184), radius=8, fill=GOLD)


def centered_text(draw, text, y, font, fill, max_width, line_gap=12):
    lines = wrap_text(text, font, max_width, max_lines=4)
    total_height = len(lines) * font.size + max(0, len(lines) - 1) * line_gap
    current_y = y - total_height // 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        x = (WIDTH - (bbox[2] - bbox[0])) // 2
        draw.text((x, current_y), line, fill=fill, font=font)
        current_y += font.size + line_gap


def render_hook_scene(draw, scene, fonts, *, slide):
    delayed_slide = max(0, slide - 22)
    draw.rounded_rectangle((218, 454 + slide, 862, 540 + slide), radius=43, fill=SOFT_GOLD)
    centered_text(draw, scene.get("label") or "Scholarship update", 497 + slide, fonts["label"], PINE, 580)
    centered_text(draw, scene["title"], 820 + slide, fonts["hook"], INK, 820, line_gap=18)
    subheadline = scene.get("subheadline") or first_block(scene) or "For International Students"
    centered_text(draw, subheadline, 1045 + delayed_slide, fonts["body"], MUTED, 780, line_gap=8)
    draw.rounded_rectangle((282, 1248 + delayed_slide, 798, 1338 + delayed_slide), radius=45, fill=PINE)
    centered_text(draw, "ScholarsRepublic.org", 1293 + delayed_slide, fonts["badge"], WHITE, 470)


def render_scholarship_scene(draw, scene, index, fonts, *, slide):
    rank = scene.get("rank") or index
    rank_pop = max(0, 22 - slide // 3)
    draw.rounded_rectangle(
        (128 - rank_pop, 374 + slide - rank_pop, 282 + rank_pop, 528 + slide + rank_pop),
        radius=46,
        fill=PINE,
    )
    centered_text(draw, str(rank), 447 + slide, fonts["rank"], WHITE, 140)
    label = scene.get("label") or "Scholarship"
    draw.rounded_rectangle((314, 400 + slide, 806, 476 + slide), radius=38, fill=SOFT_GOLD)
    centered_text(draw, label.upper(), 438 + slide, fonts["label"], PINE, 460)

    centered_text(draw, scene["title"], 820 + slide, fonts["title"], INK, 760, line_gap=16)
    blocks = scene.get("blocks") or []
    country_degree = blocks[0] if blocks else ""
    deadline = blocks[1] if len(blocks) > 1 else ""
    if country_degree:
        centered_text(draw, country_degree, 1116 + slide, fonts["body"], MUTED, 760)
    if deadline:
        pulse = max(0, 12 - slide // 5)
        draw.rounded_rectangle(
            (190 - pulse, 1236 + slide - pulse, 890 + pulse, 1336 + slide + pulse),
            radius=52,
            fill=DEEP_PINE,
        )
        centered_text(draw, deadline, 1286 + slide, fonts["badge"], WHITE, 640)

    action = scene.get("action_line") or scene.get("funding_badge", "")
    if action:
        draw.rounded_rectangle((238, 1380 + slide, 842, 1460 + slide), radius=40, fill=SOFT_GREEN)
        centered_text(draw, action, 1420 + slide, fonts["label"], PINE, 560)

    draw.text((348, 1642), "ScholarsRepublic.org", fill=MUTED, font=fonts["small"])


def render_cta_scene(draw, scene, fonts, *, slide):
    zoom_slide = max(0, slide - 26)
    centered_text(draw, scene["title"], 820 + zoom_slide, fonts["cta_large"], INK, 820, line_gap=18)
    blocks = scene.get("blocks") or []
    second = scene.get("subheadline") or (blocks[0] if blocks else "ScholarsRepublic.org")
    draw.rounded_rectangle((210, 1054 + zoom_slide, 870, 1162 + zoom_slide), radius=54, fill=PINE)
    centered_text(draw, second, 1108 + zoom_slide, fonts["badge"], WHITE, 600)
    footer = blocks[-1] if blocks else "ScholarsRepublic.org"
    centered_text(draw, footer, 1348 + zoom_slide, fonts["body"], MUTED, 760)


def first_block(scene):
    blocks = scene.get("blocks") or []
    return blocks[0] if blocks else ""


def render_progress(draw, fonts, index, total):
    progress_width = int((WIDTH - 144) * ((index + 1) / total))
    draw.rounded_rectangle((72, 1788, WIDTH - 72, 1806), radius=9, fill="#e7ded1")
    draw.rounded_rectangle((72, 1788, 72 + progress_width, 1806), radius=9, fill=GOLD)
    draw.text((72, 1830), f"{index + 1}/{total}", fill=MUTED, font=fonts["small"])


def paste_optional_background_accent(canvas, image_path):
    try:
        source = Image.open(image_path).convert("RGB").resize((WIDTH, HEIGHT))
    except Exception:
        return
    source = source.filter(ImageFilter.GaussianBlur(radius=28))
    overlay = Image.new("RGB", (WIDTH, HEIGHT), BG)
    blended = Image.blend(source, overlay, 0.88)
    canvas.paste(blended, (0, 0))


def wrap_text(text, font, max_width, max_lines):
    words = str(text or "").replace("\n", " ").split()
    if not words:
        return []

    lines = []
    current = ""
    scratch = Image.new("RGB", (10, 10))
    draw = ImageDraw.Draw(scratch)

    for word in words:
        candidate = f"{current} {word}".strip()
        width = draw.textbbox((0, 0), candidate, font=font)[2]
        if width <= max_width:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) >= max_lines:
            break

    if current and len(lines) < max_lines:
        lines.append(current)

    if len(lines) == max_lines and len(" ".join(words)) > len(" ".join(lines)):
        lines[-1] = textwrap.shorten(lines[-1], width=max(12, len(lines[-1]) - 3), placeholder="...")

    return lines


def load_fonts():
    candidates = [
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ]

    def font(size, bold=False):
        preferred = candidates[1] if bold and len(candidates) > 1 else candidates[0]
        for path in [preferred, *candidates]:
            if path.exists():
                return ImageFont.truetype(str(path), size=size)
        return ImageFont.load_default()

    return {
        "brand": font(42, bold=True),
        "small": font(30),
        "label": font(26, bold=True),
        "hook": font(92, bold=True),
        "title": font(74, bold=True),
        "body": font(44),
        "rank": font(74, bold=True),
        "badge": font(38, bold=True),
        "cta": font(34, bold=True),
        "cta_large": font(84, bold=True),
    }


def write_concat_file(tmp_path, frame_paths, scenes):
    concat_file = tmp_path / "frames.txt"
    lines = []
    durations = []
    for scene in scenes:
        frame_count = max(2, int(math.ceil(float(scene["duration"]) * MOTION_FPS)))
        durations.extend([float(scene["duration"]) / frame_count] * frame_count)
    for frame_path, duration in zip(frame_paths, durations):
        lines.append(f"file '{frame_path.as_posix()}'")
        lines.append(f"duration {duration:.4f}")
    lines.append(f"file '{frame_paths[-1].as_posix()}'")
    concat_file.write_text("\n".join(lines), encoding="utf-8")
    return concat_file


def configured_background_music_path():
    value = str(getattr(settings, "SOCIAL_REELS_BACKGROUND_MUSIC_PATH", "") or "").strip()
    if not value:
        return None
    return Path(value)


def configured_background_music_paths():
    value = str(getattr(settings, "SOCIAL_REELS_BACKGROUND_MUSIC_PATHS", "") or "").strip()
    paths = []
    seen = set()
    for item in value.split(","):
        item = item.strip()
        if not item:
            continue
        path = Path(item)
        key = str(path)
        if key in seen:
            continue
        paths.append(path)
        seen.add(key)
    return paths


def deterministic_background_music_path(plan=None):
    paths = [path for path in configured_background_music_paths() if path.exists()]
    if not paths:
        return configured_background_music_path()

    seed_parts = []
    if plan is not None:
        seed_parts = [
            str(getattr(plan, "pk", "") or ""),
            str(getattr(plan, "template_key", "") or ""),
            str(getattr(plan, "reel_type", "") or ""),
            ",".join(str(item) for item in getattr(plan, "source_opportunity_ids", []) or []),
        ]
    seed = "|".join(seed_parts) or "scholars-republic-reels"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(paths)
    return paths[index]


def configured_background_music_volume():
    try:
        volume = float(getattr(settings, "SOCIAL_REELS_BACKGROUND_MUSIC_VOLUME", 0.12))
    except (TypeError, ValueError):
        volume = 0.12
    return min(max(volume, 0.0), 1.0)


def background_music_summary():
    configured_paths = configured_background_music_paths()
    valid_paths = [path for path in configured_paths if path.exists()]
    fallback_path = configured_background_music_path()
    music_path = valid_paths[0] if valid_paths else fallback_path
    if not music_path:
        return {
            "music_configured": False,
            "music_path": "",
            "music_paths": [str(path) for path in configured_paths],
            "music_track_count": 0,
            "music_volume": configured_background_music_volume(),
            "audio_status": "silent",
            "license_metadata": {},
        }
    exists = music_path.exists()
    return {
        "music_configured": exists,
        "music_path": str(music_path),
        "music_paths": [str(path) for path in configured_paths],
        "music_track_count": len(valid_paths),
        "music_volume": configured_background_music_volume(),
        "audio_status": "enabled" if exists else "missing_file",
        "license_metadata": read_music_license_metadata(music_path),
    }


def read_music_license_metadata(music_path):
    license_path = music_path.with_suffix(".license.json")
    if not license_path.exists():
        return {}
    try:
        data = json.loads(license_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def encode_video(ffmpeg_path, concat_file, output_path):
    command = [
        ffmpeg_path,
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-vf",
        f"scale={WIDTH}:{HEIGHT},format=yuv420p",
        "-r",
        "30",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode != 0:
        raise ReelRenderError(completed.stderr.strip() or "ffmpeg failed to render the reel.")


def add_optional_background_music(ffmpeg_path, silent_video_path, output_path, duration_seconds, plan=None):
    music_path = deterministic_background_music_path(plan)
    payload = {
        "audio_added": False,
        "audio_path": str(music_path) if music_path else "",
        "audio_track_name": music_path.name if music_path else "",
        "audio_error": "",
    }
    if not music_path or not music_path.exists():
        shutil.copyfile(silent_video_path, output_path)
        return payload

    command = [
        ffmpeg_path,
        "-y",
        "-stream_loop",
        "-1",
        "-i",
        str(music_path),
        "-i",
        str(silent_video_path),
        "-t",
        f"{float(duration_seconds):.2f}",
        "-filter:a",
        f"volume={configured_background_music_volume():.2f}",
        "-map",
        "1:v:0",
        "-map",
        "0:a:0",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=False)
    if completed.returncode == 0 and output_path.exists():
        payload["audio_added"] = True
        return payload

    payload["audio_error"] = completed.stderr.strip() or "ffmpeg audio mux failed; silent video used."
    shutil.copyfile(silent_video_path, output_path)
    return payload


def generated_caption_text(plan):
    if plan.reel_type == OpportunityReelPlan.ReelType.CLOSING_SOON:
        return (
            "Scholarships closing soon for international students. Check eligibility, "
            "deadlines, and official links before applying."
        )
    if plan.reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        return (
            "Start preparing early for these scholarship opportunities. Review requirements "
            "and official links on Scholars Republic."
        )
    return (
        "Scholarship opportunity for international students. Check eligibility, deadline, "
        "and official application details on Scholars Republic."
    )


def render_ready_checks_pass(plan, scenes, duration_seconds):
    if not plan.video_file:
        return False
    try:
        if hasattr(plan.video_file, "path") and not Path(plan.video_file.path).exists():
            return False
    except (NotImplementedError, ValueError):
        return False
    if duration_seconds > max_reel_duration(plan.reel_type):
        return False
    if not scenes or len(scenes) > MAX_SCENES:
        return False
    if not (plan.caption_text or "").strip():
        return False
    if (plan.render_error or "").strip():
        return False
    return True


def create_default_reel_plan_from_payload(payload):
    plan = OpportunityReelPlan.objects.create(
        title=str(payload.get("title") or "Scholars Republic reel").strip()[:255],
        reel_type=payload.get("reel_type") or OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP,
        status=payload.get("status") or OpportunityReelPlan.Status.READY_FOR_RENDER,
        scenes_json=payload.get("scenes_json") if isinstance(payload.get("scenes_json"), list) else [],
        script_text=str(payload.get("script_text") or "").strip(),
        voiceover_text=str(payload.get("voiceover_text") or "").strip(),
        caption_text=str(payload.get("caption_text") or "").strip(),
        hashtags=str(payload.get("hashtags") or "").strip(),
        source_opportunity_ids=payload.get("source_opportunity_ids")
        if isinstance(payload.get("source_opportunity_ids"), list)
        else [],
        source_collection_id=payload.get("source_collection_id") or None,
        next_post_at=payload.get("next_post_at") or None,
        priority_score=int(payload.get("priority_score") or 0),
        deadline_window=str(payload.get("deadline_window") or "").strip()[:60],
    )
    OpportunityReelLog.objects.create(
        reel_plan=plan,
        status=OpportunityReelLog.Status.CREATED,
        response_payload={"created_at": timezone.now().isoformat()},
    )
    return plan


def scenes_to_json_text(plan):
    return json.dumps(build_scenes(plan), indent=2)
