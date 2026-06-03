import json
import shutil
import subprocess
import tempfile
import textwrap
from pathlib import Path

from django.core.files import File
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

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
MAX_AUTO_TITLE_CHARS = 45
MAX_AUTO_BLOCK_CHARS = 48
BG = "#fbf7ee"
PINE = "#0f4f3a"
GOLD = "#d7a642"
INK = "#17342a"
MUTED = "#5f746b"
WHITE = "#ffffff"


class ReelRenderError(Exception):
    pass


def render_reel_plan(plan, force=False):
    if plan.status == OpportunityReelPlan.Status.RENDERED and plan.video_file and not force:
        OpportunityReelLog.objects.create(
            reel_plan=plan,
            status=OpportunityReelLog.Status.SKIPPED,
            response_payload={"reason": "already_rendered"},
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
            frame_paths = []
            image_path = find_optional_social_image(plan)

            for index, scene in enumerate(scenes):
                frame_path = tmp_path / f"scene_{index:02d}.png"
                render_scene_frame(scene, index, len(scenes), frame_path, image_path=image_path)
                frame_paths.append(frame_path)

            concat_file = write_concat_file(tmp_path, frame_paths, scenes)
            output_path = tmp_path / f"scholars-republic-reel-{plan.pk}.mp4"
            encode_video(ffmpeg_path, concat_file, output_path)

            thumbnail_path = tmp_path / f"scholars-republic-reel-{plan.pk}.jpg"
            Image.open(frame_paths[0]).convert("RGB").save(thumbnail_path, quality=92)

            with output_path.open("rb") as video_handle:
                plan.video_file.save(output_path.name, File(video_handle), save=False)
            with thumbnail_path.open("rb") as thumbnail_handle:
                plan.thumbnail_file.save(thumbnail_path.name, File(thumbnail_handle), save=False)

        plan.video_url = ""
        plan.status = OpportunityReelPlan.Status.RENDERED
        plan.render_error = ""
        plan.save(
            update_fields=[
                "video_file",
                "video_url",
                "thumbnail_file",
                "status",
                "render_error",
                "updated_at",
            ]
        )

        payload = {
            "video_file": plan.video_file.name,
            "video_url": plan.resolved_video_url,
            "thumbnail_file": plan.thumbnail_file.name if plan.thumbnail_file else "",
            "duration_seconds": expected_duration,
            "scene_count": len(scenes),
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
    if len(raw_scenes) > MAX_SCENES:
        raise ReelRenderError(f"Reels support at most {MAX_SCENES} scenes.")

    for item in raw_scenes:
        if isinstance(item, str):
            title = item
            body = ""
            label = ""
            blocks = []
        elif isinstance(item, dict):
            title = str(item.get("title") or item.get("headline") or "").strip()
            body = str(item.get("body") or item.get("text") or item.get("description") or "").strip()
            label = str(item.get("label") or item.get("kicker") or "").strip()
            raw_blocks = item.get("blocks")
            blocks = raw_blocks if isinstance(raw_blocks, list) else []
        else:
            continue

        if not title and body:
            title, body = body, ""
        if not title:
            continue

        scenes.append(normalize_scene(title=title, body=body, label=label, blocks=blocks))

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
        {"label": "Scholars Republic", "title": title, "body": ""},
    ]

    for opportunity in opportunities:
        deadline = opportunity.deadline.isoformat() if opportunity.deadline else "Check official page"
        scenes.append(
            {
                "label": "Scholarship",
                "title": opportunity.title,
                "blocks": [opportunity.country or opportunity.provider_name, f"Deadline: {deadline}"],
            }
        )

    if caption:
        scenes.append(
            {
                "label": "Next step",
                "title": "Review details before applying",
                "body": caption[:80],
            }
        )

    scenes.append(
        {
            "label": "Scholars Republic",
            "title": "Check official links",
            "blocks": ["ScholarsRepublic.org"],
        }
    )
    return [normalize_scene(**scene) for scene in scenes[:MAX_SCENES]]


def normalize_scene(*, title, body="", label="", blocks=None):
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
        "title": textwrap.shorten(str(title).strip(), width=MAX_AUTO_TITLE_CHARS, placeholder="..."),
        "body": "\n".join(normalized_blocks[:2]),
        "blocks": normalized_blocks[:2],
        "label": textwrap.shorten(str(label or "").strip(), width=28, placeholder="..."),
    }


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


def render_scene_frame(scene, index, total, output_path, image_path=None):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    fonts = load_fonts()

    draw.rectangle((0, 0, WIDTH, 22), fill=PINE)
    draw.rectangle((0, HEIGHT - 28, WIDTH, HEIGHT), fill=GOLD)
    draw.rounded_rectangle((72, 72, 268, 88), radius=8, fill=GOLD)
    draw.text((72, 112), "Scholars Republic", fill=PINE, font=fonts["brand"])
    draw.text((72, 154), "Scholarship reels", fill=MUTED, font=fonts["small"])

    if image_path:
        paste_optional_image(image, image_path)

    label = scene.get("label") or f"Scene {index + 1}"
    draw.rounded_rectangle((72, 314, 420, 376), radius=31, fill=WHITE, outline=GOLD, width=3)
    draw.text((100, 331), label[:28].upper(), fill=PINE, font=fonts["label"])

    title_y = 470
    title_lines = wrap_text(scene["title"], fonts["title"], 880, max_lines=5)
    for line in title_lines:
        draw.text((72, title_y), line, fill=INK, font=fonts["title"])
        title_y += 100

    blocks = scene.get("blocks") or []
    if not blocks and scene.get("body"):
        blocks = str(scene.get("body", "")).splitlines()
    if blocks:
        body_y = title_y + 40
        for line in blocks[:2]:
            draw.text((78, body_y), line, fill=MUTED, font=fonts["body"])
            body_y += 64

    draw.rounded_rectangle((72, 1646, 1008, 1774), radius=24, fill=PINE)
    draw.text((112, 1682), "Verify details on Scholars Republic before applying", fill=WHITE, font=fonts["cta"])

    progress_width = int((WIDTH - 144) * ((index + 1) / total))
    draw.rounded_rectangle((72, 1818, WIDTH - 72, 1832), radius=7, fill="#e7ded1")
    draw.rounded_rectangle((72, 1818, 72 + progress_width, 1832), radius=7, fill=GOLD)
    draw.text((72, 1852), f"{index + 1}/{total}", fill=MUTED, font=fonts["small"])

    image.save(output_path)


def paste_optional_image(canvas, image_path):
    try:
        source = Image.open(image_path).convert("RGB")
    except Exception:
        return

    source.thumbnail((780, 420))
    x = WIDTH - source.width - 72
    y = 190
    backing = Image.new("RGB", (source.width + 20, source.height + 20), WHITE)
    backing.paste(source, (10, 10))
    canvas.paste(backing, (x - 10, y - 10))


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
        "title": font(78, bold=True),
        "body": font(42),
        "cta": font(34, bold=True),
    }


def write_concat_file(tmp_path, frame_paths, scenes):
    concat_file = tmp_path / "frames.txt"
    lines = []
    for frame_path, scene in zip(frame_paths, scenes):
        lines.append(f"file '{frame_path.as_posix()}'")
        lines.append(f"duration {scene['duration']}")
    lines.append(f"file '{frame_paths[-1].as_posix()}'")
    concat_file.write_text("\n".join(lines), encoding="utf-8")
    return concat_file


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
