import base64
import binascii
import os
import re
import uuid
from io import BytesIO
from urllib.error import URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from PIL import Image, UnidentifiedImageError

from apps.opportunities.models import OpportunitySocialDraft, OpportunitySocialPostPlan


MAX_SOCIAL_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_FORMATS = {"PNG": "png", "JPEG": "jpg", "WEBP": "webp"}
ALLOWED_MIME_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
}
DOWNLOAD_TIMEOUT_SECONDS = 10


class SocialImageError(ValueError):
    pass


def site_url():
    return getattr(settings, "FRONTEND_URL", "https://scholarsrepublic.org").rstrip("/")


def absolute_url(value, request=None):
    value = str(value or "").strip()
    if not value:
        return ""

    if value.startswith(("http://", "https://")):
        return value

    if request is not None:
        return request.build_absolute_uri(value)

    if not value.startswith("/"):
        value = f"/{value}"

    return f"{site_url()}{value}"


def og_image_url_for_opportunity(opportunity, request=None):
    if not opportunity or not opportunity.slug:
        return ""

    return absolute_url(f"/scholarships/{opportunity.slug}/opengraph-image", request=request)


def _image_field_name(obj):
    if isinstance(obj, OpportunitySocialDraft):
        return "facebook_image"
    if isinstance(obj, OpportunitySocialPostPlan):
        return "image"
    raise TypeError("Unsupported social image object.")


def _url_field_name(obj):
    if isinstance(obj, OpportunitySocialDraft):
        return "facebook_image_url"
    if isinstance(obj, OpportunitySocialPostPlan):
        return "image_url"
    raise TypeError("Unsupported social image object.")


def _source_choices(obj):
    if isinstance(obj, OpportunitySocialDraft):
        return obj.SocialImageSource
    if isinstance(obj, OpportunitySocialPostPlan):
        return obj.SocialImageSource
    raise TypeError("Unsupported social image object.")


def _status_choices(obj):
    if isinstance(obj, OpportunitySocialDraft):
        return obj.SocialImageStatus
    if isinstance(obj, OpportunitySocialPostPlan):
        return obj.SocialImageStatus
    raise TypeError("Unsupported social image object.")


def _clean_filename(filename, extension):
    cleaned = str(filename or "").strip().replace("\\", "/").split("/")[-1]
    if not cleaned:
        return f"{uuid.uuid4().hex}.{extension}"

    base = os.path.splitext(cleaned)[0].lower()
    base = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
    base = re.sub(r"_+", "_", base)[:90] or uuid.uuid4().hex
    return f"{base}.{extension}"


def _decode_base64(value):
    raw_value = str(value or "").strip()
    if not raw_value:
        raise SocialImageError("image_base64 is required.")

    if "," in raw_value and raw_value.split(",", 1)[0].startswith("data:"):
        raw_value = raw_value.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw_value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise SocialImageError("image_base64 must be valid base64.") from exc

    return image_bytes


def _download_image(image_url):
    image_url = str(image_url or "").strip()
    if not image_url.startswith(("http://", "https://")):
        raise SocialImageError("image_url must be an absolute http or https URL.")

    request = Request(
        image_url,
        headers={"User-Agent": "ScholarsRepublicSocialImageFetcher/1.0"},
    )
    try:
        with urlopen(request, timeout=DOWNLOAD_TIMEOUT_SECONDS) as response:
            content_type = response.headers.get("content-type", "")
            image_bytes = response.read(MAX_SOCIAL_IMAGE_BYTES + 1)
    except URLError as exc:
        raise SocialImageError("Could not download image_url.") from exc

    if "image" not in content_type.lower():
        raise SocialImageError("image_url did not return an image response.")

    return image_bytes


def _validate_and_normalize_image(image_bytes):
    if len(image_bytes) > MAX_SOCIAL_IMAGE_BYTES:
        raise SocialImageError("Image exceeds the 10 MB limit.")

    try:
        image = Image.open(BytesIO(image_bytes))
        image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise SocialImageError("Image must be a valid PNG, JPG, or WebP file.") from exc

    image = Image.open(BytesIO(image_bytes))
    image_format = image.format
    if image_format not in ALLOWED_FORMATS:
        raise SocialImageError("Image must be a PNG, JPG, or WebP file.")

    extension = ALLOWED_FORMATS[image_format]
    output = BytesIO()
    save_format = "JPEG" if image_format == "JPEG" else image_format
    if image.mode not in {"RGB", "RGBA"}:
        image = image.convert("RGBA")
    if save_format == "JPEG" and image.mode != "RGB":
        image = image.convert("RGB")
    image.save(output, format=save_format)
    normalized = output.getvalue()

    if len(normalized) > MAX_SOCIAL_IMAGE_BYTES:
        raise SocialImageError("Image exceeds the 10 MB limit after validation.")

    return normalized, extension


def _mark_failed(obj, error):
    status_choices = _status_choices(obj)
    obj.social_image_status = status_choices.FAILED
    obj.social_image_error = str(error)
    obj.save(update_fields=["social_image_status", "social_image_error", "updated_at"])


def _save_image_bytes(obj, image_bytes, filename=None, source="gpt_base64"):
    try:
        normalized_bytes, extension = _validate_and_normalize_image(image_bytes)
        image_field_name = _image_field_name(obj)
        url_field_name = _url_field_name(obj)
        image_field = getattr(obj, image_field_name)
        image_field.save(
            _clean_filename(filename, extension),
            ContentFile(normalized_bytes),
            save=False,
        )
        setattr(obj, url_field_name, image_field.url)
        obj.social_image_source = source
        obj.social_image_status = _status_choices(obj).SAVED
        obj.social_image_error = ""
        obj.social_image_saved_at = timezone.now()
        update_fields = [
                image_field_name,
                url_field_name,
                "social_image_source",
                "social_image_status",
                "social_image_error",
                "social_image_saved_at",
                "updated_at",
            ]
        if hasattr(obj, "social_image_is_stale"):
            obj.social_image_is_stale = False
            update_fields.append("social_image_is_stale")
        obj.save(update_fields=update_fields)
    except SocialImageError as exc:
        _mark_failed(obj, exc)
        raise

    return absolute_url(getattr(obj, url_field_name))


def save_social_image_from_base64(
    obj,
    image_base64,
    filename=None,
    source="gpt_base64",
):
    return _save_image_bytes(obj, _decode_base64(image_base64), filename=filename, source=source)


def save_social_image_from_url(obj, image_url, source="gpt_image_url"):
    filename = str(image_url or "").split("?", 1)[0].rstrip("/").split("/")[-1]
    return _save_image_bytes(
        obj,
        _download_image(image_url),
        filename=filename or None,
        source=source,
    )


def save_social_image_from_openai_file_ref(obj, file_ref, filename=None):
    if not isinstance(file_ref, dict):
        raise SocialImageError("openaiFileIdRefs must contain a file object.")

    mime_type = str(file_ref.get("mime_type") or "").strip().lower()
    if mime_type not in ALLOWED_MIME_TYPES:
        raise SocialImageError("openaiFileIdRefs must contain a PNG, JPG, JPEG, or WebP image.")

    download_link = str(file_ref.get("download_link") or "").strip()
    if not download_link:
        raise SocialImageError("openaiFileIdRefs[0].download_link is required.")

    return _save_image_bytes(
        obj,
        _download_image(download_link),
        filename=filename or file_ref.get("name") or file_ref.get("id") or None,
        source=_source_choices(obj).GPT_UPLOADED,
    )


def save_social_image_from_file(obj, image_file, filename=None, source="gpt_uploaded"):
    if not image_file:
        raise SocialImageError("image file is required.")

    image_bytes = image_file.read(MAX_SOCIAL_IMAGE_BYTES + 1)
    filename = filename or getattr(image_file, "name", None)
    return _save_image_bytes(obj, image_bytes, filename=filename, source=source)


def get_preferred_social_image_url(obj_or_plan, request=None):
    image_field_name = _image_field_name(obj_or_plan)
    url_field_name = _url_field_name(obj_or_plan)
    image_field = getattr(obj_or_plan, image_field_name)
    if (
        isinstance(obj_or_plan, OpportunitySocialPostPlan)
        and obj_or_plan.social_image_is_stale
    ):
        return og_image_url_for_opportunity(obj_or_plan.opportunity, request=request)

    if image_field:
        return absolute_url(image_field.url, request=request)

    image_url = getattr(obj_or_plan, url_field_name, "")
    if image_url:
        return absolute_url(image_url, request=request)

    if isinstance(obj_or_plan, OpportunitySocialPostPlan):
        return og_image_url_for_opportunity(obj_or_plan.opportunity, request=request)

    return ""


def get_preferred_social_image_source(obj_or_plan):
    if getattr(obj_or_plan, _image_field_name(obj_or_plan)):
        if (
            isinstance(obj_or_plan, OpportunitySocialPostPlan)
            and obj_or_plan.social_image_is_stale
        ):
            return obj_or_plan.SocialImageSource.OG_FALLBACK
        return obj_or_plan.social_image_source or "gpt_uploaded"
    if getattr(obj_or_plan, _url_field_name(obj_or_plan), ""):
        return obj_or_plan.social_image_source or "gpt_image_url"
    if isinstance(obj_or_plan, OpportunitySocialPostPlan):
        return obj_or_plan.SocialImageSource.OG_FALLBACK
    return ""


def promote_social_image_from_draft_to_plan(draft, plan):
    social_draft = draft.social_drafts.order_by("-updated_at").first()
    if not social_draft:
        return plan

    plan.image = social_draft.facebook_image
    plan.image_url = social_draft.facebook_image_url
    plan.image_prompt = social_draft.facebook_image_prompt
    plan.social_image_source = social_draft.social_image_source
    plan.social_image_status = social_draft.social_image_status
    plan.social_image_error = social_draft.social_image_error
    plan.social_image_saved_at = social_draft.social_image_saved_at
    plan.save(
        update_fields=[
            "image",
            "image_url",
            "image_prompt",
            "social_image_source",
            "social_image_status",
            "social_image_error",
            "social_image_saved_at",
            "updated_at",
        ]
    )
    return plan
