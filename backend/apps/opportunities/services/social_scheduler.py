from datetime import timedelta

from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunitySocialPostLog, OpportunitySocialPostPlan


RECENTLY_POSTED_DAYS = 14
RECENTLY_PUBLISHED_DAYS = 7
RECENT_DEADLINE_VERIFICATION_HOURS = 24


def _list_contains(values, needles):
    if not isinstance(values, list):
        return False

    haystack = " ".join(str(value or "").casefold() for value in values)
    return any(needle in haystack for needle in needles)


def _has_recent_successful_post(opportunity, now):
    recent_since = now - timedelta(days=RECENTLY_POSTED_DAYS)
    return OpportunitySocialPostLog.objects.filter(
        opportunity=opportunity,
        platform="facebook",
        status=OpportunitySocialPostLog.Status.POSTED,
        posted_at__gte=recent_since,
    ).exists()


def _missing_key_fields(opportunity):
    missing = []
    for field_name in ["title", "country", "short_description", "description", "how_to_apply"]:
        if not str(getattr(opportunity, field_name, "") or "").strip():
            missing.append(field_name)

    if not opportunity.official_link and not opportunity.source_url:
        missing.append("source")
    if not opportunity.degree_levels:
        missing.append("degree_levels")
    if not opportunity.funding_type and not opportunity.stipend_summary:
        missing.append("funding")

    return missing


def _is_expired(opportunity, today):
    if opportunity.status != Opportunity.Status.PUBLISHED:
        return True
    if opportunity.deadline_check_status in {
        Opportunity.DeadlineCheckStatus.EXPIRED,
        Opportunity.DeadlineCheckStatus.VERIFIED_EXPIRED,
    }:
        return True
    return bool(
        opportunity.deadline
        and not opportunity.is_rolling_deadline
        and opportunity.deadline < today
    )


def _has_recent_deadline_verification(opportunity, now):
    if not opportunity.deadline_last_checked_at:
        return False
    return opportunity.deadline_last_checked_at >= now - timedelta(
        hours=RECENT_DEADLINE_VERIFICATION_HOURS,
    )


def score_opportunity_for_social(opportunity, now=None):
    now = now or timezone.now()
    today = timezone.localtime(now).date()
    score = 0
    reasons = {}

    if _is_expired(opportunity, today):
        score -= 100
        reasons["expired"] = -100

    if opportunity.funding_type == Opportunity.FundingType.FULLY_FUNDED:
        score += 30
        reasons["fully_funded"] = 30

    days_left = None
    if opportunity.deadline and not opportunity.is_rolling_deadline:
        days_left = (opportunity.deadline - today).days
        if 3 <= days_left <= 14:
            score += 25
            reasons["deadline_3_to_14_days"] = 25
    else:
        score -= 40
        reasons["unclear_or_missing_deadline"] = -40

    if opportunity.verified_status or opportunity.official_link:
        score += 15
        reasons["official_or_verified_source"] = 15

    if _list_contains(opportunity.eligible_countries, ["pakistan", "international", "all countries"]):
        score += 10
        reasons["international_or_pakistan_eligibility"] = 10

    if (
        opportunity.provider_name
        and opportunity.country
        and (opportunity.pathway_id or opportunity.university_name or opportunity.company_name)
    ):
        score += 10
        reasons["strong_provider_country_pathway"] = 10

    if _list_contains(opportunity.degree_levels, ["master", "masters", "phd", "doctoral"]):
        score += 8
        reasons["master_or_phd"] = 8

    if opportunity.published_at and opportunity.published_at >= now - timedelta(
        days=RECENTLY_PUBLISHED_DAYS,
    ):
        score += 5
        reasons["recently_published"] = 5

    if _has_recent_successful_post(opportunity, now):
        score -= 30
        reasons["already_posted_recently"] = -30

    missing = _missing_key_fields(opportunity)
    if missing:
        score -= 20
        reasons["missing_key_fields"] = -20
        reasons["missing_key_field_names"] = missing

    near_deadline_unverified = (
        days_left is not None
        and 0 <= days_left <= 3
        and not _has_recent_deadline_verification(opportunity, now)
    )
    if near_deadline_unverified:
        decision = OpportunitySocialPostPlan.AutoSocialDecision.MANUAL_REVIEW
        reasons["near_deadline_not_recently_verified"] = True
    elif score >= 80:
        decision = OpportunitySocialPostPlan.AutoSocialDecision.INDIVIDUAL
    elif score >= 35:
        decision = OpportunitySocialPostPlan.AutoSocialDecision.COLLECTION_CANDIDATE
    else:
        decision = OpportunitySocialPostPlan.AutoSocialDecision.WEBSITE_ONLY

    return {
        "score": score,
        "decision": decision,
        "reasons": reasons,
    }


def apply_social_priority(plan, now=None, save=True):
    result = score_opportunity_for_social(plan.opportunity, now=now)
    plan.priority_score = result["score"]
    plan.priority_reason = result["reasons"]
    plan.auto_social_decision = result["decision"]
    if save:
        plan.save(
            update_fields=[
                "priority_score",
                "priority_reason",
                "auto_social_decision",
                "updated_at",
            ]
        )
    return result
