import re
from dataclasses import dataclass

import requests
from django.conf import settings

from apps.opportunities.models import (
    Opportunity,
    OpportunityCollectionSocialPostPlan,
    OpportunitySocialPostPlan,
)
from apps.opportunities.services.social_collection_posting import collection_public_url
from apps.opportunities.services.social_posting import scholarship_detail_url


class GPTSocialWriterConfigurationError(Exception):
    pass


class GPTSocialWriterValidationError(Exception):
    pass


@dataclass
class GPTSocialCaptionResult:
    text: str
    prompt: str
    saved: bool
    plan_id: int
    target_type: str


OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
MIN_CAPTION_LENGTH = 80


def social_gpt_enabled():
    return bool(getattr(settings, "SOCIAL_GPT_ENABLED", False))


def social_gpt_provider():
    return str(getattr(settings, "SOCIAL_GPT_PROVIDER", "openai") or "openai").strip().lower()


def social_gpt_model():
    return str(getattr(settings, "SOCIAL_GPT_MODEL", "gpt-4o-mini") or "gpt-4o-mini").strip()


def social_gpt_api_key():
    return str(getattr(settings, "SOCIAL_GPT_API_KEY", "") or "").strip()


def social_gpt_max_chars():
    try:
        max_chars = int(getattr(settings, "SOCIAL_GPT_MAX_CHARS", 900))
    except (TypeError, ValueError):
        max_chars = 900
    return max(280, min(max_chars, 2000))


def ensure_social_gpt_configured():
    if not social_gpt_enabled() or not social_gpt_api_key():
        raise GPTSocialWriterConfigurationError("GPT social writer is not configured.")
    if social_gpt_provider() != "openai":
        raise GPTSocialWriterConfigurationError("Configured GPT social provider is not supported.")


def clean_caption_text(text):
    text = str(text or "").strip()
    text = re.sub(r"^```(?:text)?", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text).strip()
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"^[^\w#@]+", "", text).strip()
    return text


def compact_text(value, max_length=240):
    value = re.sub(r"\s+", " ", str(value or "")).strip()
    return value[:max_length]


def label_for_choice(choices, value):
    if not value:
        return ""
    return dict(choices).get(value, str(value).replace("_", " ").title())


def opportunity_context(plan):
    opportunity = plan.opportunity
    link_url = plan.link_url or scholarship_detail_url(opportunity)
    return {
        "title": opportunity.title,
        "provider": opportunity.provider_name or opportunity.university_name,
        "country": opportunity.country,
        "degree_levels": ", ".join(opportunity.degree_levels or []),
        "fields": ", ".join(opportunity.fields_of_study or []),
        "funding_type": label_for_choice(Opportunity.FundingType.choices, opportunity.funding_type),
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else "",
        "is_rolling_deadline": bool(opportunity.is_rolling_deadline),
        "official_link": opportunity.official_link or opportunity.source_url,
        "page_link": link_url,
        "short_description": compact_text(opportunity.short_description or opportunity.description),
        "existing_post_text": compact_text(plan.post_text, 500),
    }


def collection_context(plan):
    collection = plan.collection
    link_url = plan.link_url or collection_public_url(collection)
    items = []
    for item in collection.items.select_related("opportunity").order_by("position", "id")[:5]:
        opportunity = item.opportunity
        items.append(
            {
                "title": opportunity.title,
                "provider": opportunity.provider_name or opportunity.university_name,
                "country": opportunity.country,
                "deadline": opportunity.deadline.isoformat() if opportunity.deadline else "",
                "funding_type": label_for_choice(
                    Opportunity.FundingType.choices,
                    opportunity.funding_type,
                ),
            }
        )
    return {
        "title": collection.title,
        "collection_type": collection.collection_type,
        "country": collection.country,
        "degree_level": collection.degree_level,
        "funding_type": collection.funding_type,
        "field_label": collection.field_label,
        "page_link": link_url,
        "description": compact_text(collection.description or collection.intro_text),
        "items": items,
        "existing_post_text": compact_text(plan.post_text, 500),
    }


def build_opportunity_prompt(plan):
    context = opportunity_context(plan)
    max_chars = social_gpt_max_chars()
    return (
        "Write one Facebook caption for Scholars Republic.\n"
        "Target: one individual scholarship/opportunity.\n"
        f"Maximum length: {max_chars} characters.\n\n"
        "Rules:\n"
        "- Professional scholarship announcement.\n"
        "- Clear and concise.\n"
        "- No fake facts, no fake deadline, no fake funding details, no invented eligibility.\n"
        "- Do not add emojis at the beginning.\n"
        "- Include a call to action.\n"
        "- Mention Scholars Republic.\n"
        "- Include the page link or official link.\n"
        "- Tell students to verify details from official sources.\n\n"
        "Use only these source facts:\n"
        f"Title: {context['title']}\n"
        f"Provider: {context['provider'] or 'Not specified'}\n"
        f"Country: {context['country'] or 'Not specified'}\n"
        f"Degree levels: {context['degree_levels'] or 'Not specified'}\n"
        f"Fields: {context['fields'] or 'Not specified'}\n"
        f"Funding: {context['funding_type'] or 'Not specified'}\n"
        f"Deadline: {context['deadline'] or 'Not specified'}\n"
        f"Rolling deadline: {'yes' if context['is_rolling_deadline'] else 'no'}\n"
        f"Short description: {context['short_description'] or 'Not specified'}\n"
        f"Official/source link: {context['official_link'] or 'Not specified'}\n"
        f"Scholars Republic page link: {context['page_link']}\n"
        f"Existing post text: {context['existing_post_text'] or 'None'}\n"
    )


def build_collection_prompt(plan):
    context = collection_context(plan)
    max_chars = social_gpt_max_chars()
    item_lines = []
    for index, item in enumerate(context["items"], start=1):
        item_lines.append(
            f"{index}. {item['title']} | provider: {item['provider'] or 'not specified'} | "
            f"country: {item['country'] or 'not specified'} | "
            f"funding: {item['funding_type'] or 'not specified'} | "
            f"deadline: {item['deadline'] or 'not specified'}"
        )
    return (
        "Write one Facebook caption for Scholars Republic.\n"
        "Target: a scholarship collection/list, not one single scholarship.\n"
        f"Maximum length: {max_chars} characters.\n\n"
        "Rules:\n"
        "- Professional scholarship collection announcement.\n"
        "- Clear and concise.\n"
        "- No fake facts, no fake deadline, no fake funding details, no invented eligibility.\n"
        "- Do not add emojis at the beginning.\n"
        "- Include a call to action.\n"
        "- Mention Scholars Republic.\n"
        "- Include the collection page link.\n"
        "- Tell students to verify details from official sources.\n\n"
        "Use only these source facts:\n"
        f"Collection title: {context['title']}\n"
        f"Collection type: {context['collection_type']}\n"
        f"Country: {context['country'] or 'Not specified'}\n"
        f"Degree level: {context['degree_level'] or 'Not specified'}\n"
        f"Funding: {context['funding_type'] or 'Not specified'}\n"
        f"Field: {context['field_label'] or 'Not specified'}\n"
        f"Description: {context['description'] or 'Not specified'}\n"
        f"Collection page link: {context['page_link']}\n"
        "Items:\n"
        f"{chr(10).join(item_lines) if item_lines else 'No item details provided.'}\n"
        f"Existing post text: {context['existing_post_text'] or 'None'}\n"
    )


def call_openai_caption(prompt):
    ensure_social_gpt_configured()
    response = requests.post(
        OPENAI_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {social_gpt_api_key()}",
            "Content-Type": "application/json",
        },
        json={
            "model": social_gpt_model(),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You write cautious scholarship social media captions. "
                        "Use only supplied facts and return only the caption."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.4,
            "max_tokens": 420,
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise GPTSocialWriterValidationError("GPT social writer returned an invalid response.") from exc


def text_has_allowed_link(text, allowed_links):
    links = re.findall(r"https?://\S+", text)
    if not links:
        return False
    normalized_allowed = {link.rstrip("/.,)") for link in allowed_links if link}
    return all(link.rstrip("/.,)") in normalized_allowed for link in links)


def validate_common_caption(text, allowed_links):
    text = clean_caption_text(text)
    if len(text) < MIN_CAPTION_LENGTH:
        raise GPTSocialWriterValidationError("Generated caption is too short.")
    if len(text) > social_gpt_max_chars():
        raise GPTSocialWriterValidationError("Generated caption exceeds the configured length limit.")
    if "Scholars Republic" not in text:
        raise GPTSocialWriterValidationError("Generated caption must mention Scholars Republic.")
    if not text_has_allowed_link(text, allowed_links):
        raise GPTSocialWriterValidationError("Generated caption must include only an approved link.")
    return text


def reject_unknown_dates(text, allowed_dates):
    found_dates = set(re.findall(r"\b20\d{2}-\d{2}-\d{2}\b", text))
    found_dates.update(re.findall(r"\b\d{1,2}\s+[A-Z][a-z]+\s+20\d{2}\b", text))
    found_dates.update(re.findall(r"\b[A-Z][a-z]+\s+\d{1,2},?\s+20\d{2}\b", text))
    if found_dates and not any(date_value and date_value in text for date_value in allowed_dates):
        raise GPTSocialWriterValidationError("Generated caption appears to contain an unsupported deadline.")


def reject_unknown_funding(text, allowed_funding):
    funding_keywords = {
        "fully funded",
        "partially funded",
        "tuition waiver",
        "stipend",
        "need based",
        "merit based",
        "self funded",
    }
    lower_text = text.lower()
    mentioned = {keyword for keyword in funding_keywords if keyword in lower_text}
    allowed = {str(item or "").lower() for item in allowed_funding if item}
    unsupported = {keyword for keyword in mentioned if keyword not in allowed}
    if unsupported:
        raise GPTSocialWriterValidationError("Generated caption appears to contain unsupported funding claims.")


def validate_opportunity_caption(plan, text):
    opportunity = plan.opportunity
    page_link = plan.link_url or scholarship_detail_url(opportunity)
    official_link = opportunity.official_link or opportunity.source_url
    text = validate_common_caption(text, [page_link, official_link])
    reject_unknown_dates(text, [opportunity.deadline.isoformat() if opportunity.deadline else ""])
    reject_unknown_funding(
        text,
        [label_for_choice(Opportunity.FundingType.choices, opportunity.funding_type)],
    )
    return text


def validate_collection_caption(plan, text):
    context = collection_context(plan)
    text = validate_common_caption(text, [context["page_link"]])
    if "collection" not in text.lower() and "list" not in text.lower():
        raise GPTSocialWriterValidationError("Collection caption must describe a collection or list.")
    reject_unknown_dates(text, [item["deadline"] for item in context["items"]])
    reject_unknown_funding(
        text,
        [
            item["funding_type"]
            for item in context["items"]
            if item.get("funding_type")
        ],
    )
    return text


def generate_opportunity_plan_caption(plan, *, save=False, raw_text=None):
    if not isinstance(plan, OpportunitySocialPostPlan):
        raise TypeError("plan must be an OpportunitySocialPostPlan instance.")
    prompt = build_opportunity_prompt(plan)
    generated_text = raw_text if raw_text is not None else call_openai_caption(prompt)
    text = validate_opportunity_caption(plan, generated_text)
    if save:
        plan.post_text = text
        if not plan.link_url:
            plan.link_url = scholarship_detail_url(plan.opportunity)
        plan.save(update_fields=["post_text", "link_url", "updated_at"])
    return GPTSocialCaptionResult(
        text=text,
        prompt=prompt,
        saved=bool(save),
        plan_id=plan.pk,
        target_type="opportunity",
    )


def generate_collection_plan_caption(plan, *, save=False, raw_text=None):
    if not isinstance(plan, OpportunityCollectionSocialPostPlan):
        raise TypeError("plan must be an OpportunityCollectionSocialPostPlan instance.")
    prompt = build_collection_prompt(plan)
    generated_text = raw_text if raw_text is not None else call_openai_caption(prompt)
    text = validate_collection_caption(plan, generated_text)
    if save:
        plan.post_text = text
        if not plan.link_url:
            plan.link_url = collection_public_url(plan.collection)
        plan.save(update_fields=["post_text", "link_url", "updated_at"])
    return GPTSocialCaptionResult(
        text=text,
        prompt=prompt,
        saved=bool(save),
        plan_id=plan.pk,
        target_type="collection",
    )
