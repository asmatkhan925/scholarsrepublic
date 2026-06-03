import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone


ALLOWED_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
}
BLOCKED_HOST_PARTS = {
    "youtube.com",
    "youtu.be",
    "tiktok.com",
    "instagram.com",
}
MAX_AUDIO_BYTES = 15 * 1024 * 1024
DEFAULT_FILENAME = "default_background.mp3"


class Command(BaseCommand):
    help = "Safely download licensed background music for local Scholars Republic social reels."

    def add_arguments(self, parser):
        parser.add_argument("--url", default="", help="Direct royalty-free or licensed audio URL.")
        parser.add_argument("--filename", default=DEFAULT_FILENAME)
        parser.add_argument("--license-note", default="")
        parser.add_argument("--source-name", default="")
        parser.add_argument("--force", action="store_true")
        parser.add_argument("--allow-missing-license", action="store_true")

    def handle(self, *args, **options):
        source_url = str(options["url"] or "").strip()
        if not source_url:
            raise CommandError("--url is required.")

        parsed = urllib.parse.urlparse(source_url)
        if parsed.scheme not in {"http", "https"}:
            raise CommandError("--url must use http or https.")
        host = (parsed.netloc or "").lower()
        if any(blocked in host for blocked in BLOCKED_HOST_PARTS):
            raise CommandError("Do not download reel music from YouTube, TikTok, or Instagram.")

        license_note = str(options["license_note"] or "").strip()
        if not license_note and not options["allow_missing_license"]:
            raise CommandError("--license-note is required unless --allow-missing-license is provided.")

        filename = clean_filename(options["filename"] or DEFAULT_FILENAME)
        target_dir = Path(settings.MEDIA_ROOT) / "social_reels" / "audio"
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / filename
        if target_path.exists() and not options["force"]:
            raise CommandError(f"{target_path} already exists. Use --force to replace it.")

        request = urllib.request.Request(
            source_url,
            headers={"User-Agent": "ScholarsRepublicSocialReels/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
                if content_type not in ALLOWED_CONTENT_TYPES:
                    raise CommandError(f"Unsupported audio content type: {content_type or 'unknown'}.")

                temp_path = target_path.with_suffix(target_path.suffix + ".download")
                total = 0
                with temp_path.open("wb") as handle:
                    while True:
                        chunk = response.read(64 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > MAX_AUDIO_BYTES:
                            temp_path.unlink(missing_ok=True)
                            raise CommandError("Downloaded audio exceeds the 15 MB limit.")
                        handle.write(chunk)
        except urllib.error.URLError as exc:
            raise CommandError(f"Audio download failed: {exc}") from exc

        temp_path.replace(target_path)
        metadata = {
            "source_url": source_url,
            "source_name": str(options["source_name"] or "").strip(),
            "license_note": license_note,
            "downloaded_at": timezone.now().isoformat(),
            "filename": filename,
        }
        license_path = target_path.with_suffix(".license.json")
        license_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

        self.stdout.write(self.style.SUCCESS(f"Saved reel music: {target_path}"))
        self.stdout.write(f"Saved license metadata: {license_path}")
        self.stdout.write(f"SOCIAL_REELS_BACKGROUND_MUSIC_PATH={target_path}")


def clean_filename(value):
    filename = Path(str(value or DEFAULT_FILENAME)).name
    filename = re.sub(r"[^A-Za-z0-9._-]", "-", filename).strip(".-")
    if not filename:
        filename = DEFAULT_FILENAME
    suffix = Path(filename).suffix.lower()
    if suffix not in {".mp3", ".wav", ".ogg"}:
        raise CommandError("--filename must end in .mp3, .wav, or .ogg.")
    return filename
