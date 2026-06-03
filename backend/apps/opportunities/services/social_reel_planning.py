from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from apps.opportunities.models import Opportunity, OpportunityReelLog, OpportunityReelPlan
from apps.opportunities.services.social_posting import (
    deadline_window_label,
    get_deadline_window,
    is_opportunity_expired_for_social,
)
from apps.opportunities.services.social_reel_rendering import (
    TEXT_TEMPLATE_BY_REEL_TYPE,
    TEMPLATE_KEYS_BY_REEL_TYPE,
    calculate_scene_durations,
    expected_reel_duration,
    render_reel_plan,
    shorten_reel_title,
    template_key_is_valid_for_reel_type,
)
from apps.opportunities.services.social_scheduler import score_opportunity_for_social


SOCIAL_REELS_DAILY_PLAN_LIMIT = 1
SOCIAL_REELS_MAX_PER_RUN = 1
SOCIAL_REELS_RECENT_DAYS_DEDUP = 7
SOCIAL_REELS_MAX_USE_PER_OPPORTUNITY_PER_WEEK = 2
AUTO_REEL_TYPES = {
    "auto",
    OpportunityReelPlan.ReelType.CLOSING_SOON,
    OpportunityReelPlan.ReelType.PREPARE_EARLY,
    OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP,
}
NON_ARCHIVED_STATUSES = [
    OpportunityReelPlan.Status.DRAFT,
    OpportunityReelPlan.Status.READY_FOR_RENDER,
    OpportunityReelPlan.Status.RENDERING,
    OpportunityReelPlan.Status.RENDERED,
    OpportunityReelPlan.Status.READY,
    OpportunityReelPlan.Status.POSTED,
    OpportunityReelPlan.Status.FAILED,
    OpportunityReelPlan.Status.PAUSED,
]


def configured_daily_limit():
    return int(getattr(settings, "SOCIAL_REELS_DAILY_PLAN_LIMIT", SOCIAL_REELS_DAILY_PLAN_LIMIT))


def configured_max_per_run():
    return int(getattr(settings, "SOCIAL_REELS_MAX_PER_RUN", SOCIAL_REELS_MAX_PER_RUN))


def configured_recent_days():
    return int(
        getattr(settings, "SOCIAL_REELS_RECENT_DAYS_DEDUP", SOCIAL_REELS_RECENT_DAYS_DEDUP)
    )


def configured_max_use_per_opportunity():
    return int(
        getattr(
            settings,
            "SOCIAL_REELS_MAX_USE_PER_OPPORTUNITY_PER_WEEK",
            SOCIAL_REELS_MAX_USE_PER_OPPORTUNITY_PER_WEEK,
        )
    )


def generate_social_reel_plans(
    *,
    reel_type="auto",
    limit=None,
    dry_run=False,
    render=False,
    force=False,
    run_date=None,
    renderer=render_reel_plan,
    template_key="",
):
    if reel_type not in AUTO_REEL_TYPES:
        reel_type = "auto"
    template_key = str(template_key or "").strip()
    if template_key:
        override_error = template_override_error(reel_type, template_key)
        if override_error:
            return result_payload(
                plans=[],
                created_count=0,
                rendered_count=0,
                skipped_reasons=[override_error],
            )
        if reel_type == "auto":
            reel_type = reel_type_for_template_key(template_key) or "auto"

    run_date = parse_run_date(run_date) or timezone.localdate()
    limit = min(max(1, int(limit or configured_max_per_run())), configured_max_per_run())
    skipped_reasons = []
    plans = []
    rendered_count = 0

    if not dry_run and not force:
        remaining_daily = configured_daily_limit() - reel_plan_count_for_date(run_date)
        if remaining_daily <= 0:
            return result_payload(
                plans=[],
                created_count=0,
                rendered_count=0,
                skipped_reasons=["daily_plan_limit_reached"],
            )
        limit = min(limit, remaining_daily)

    for _index in range(limit):
        selection = select_reel_candidates(
            reel_type=reel_type,
            run_date=run_date,
            template_key=template_key,
        )
        if not selection["ok"]:
            skipped_reasons.append(selection["reason"])
            break

        duplicate_reason = duplicate_skip_reason(selection["source_opportunity_ids"], run_date)
        if duplicate_reason and not force:
            selection["skip_reason"] = duplicate_reason
            skipped_reasons.append(duplicate_reason)
            plans.append(selection)
            break

        if dry_run:
            selection["dry_run"] = True
            plans.append(selection)
            continue

        plan = create_reel_plan_from_selection(selection)
        selection["plan"] = plan
        selection["id"] = plan.pk
        selection["status"] = plan.status
        selection["video_url"] = plan.resolved_video_url
        plans.append(selection)

        if render:
            renderer(plan, force=force)
            plan.refresh_from_db()
            rendered_count += 1
            selection["status"] = plan.status
            selection["video_url"] = plan.resolved_video_url

    created_count = len([item for item in plans if item.get("plan")])
    return result_payload(
        plans=plans,
        created_count=created_count,
        rendered_count=rendered_count,
        skipped_reasons=skipped_reasons,
    )


def result_payload(*, plans, created_count, rendered_count, skipped_reasons):
    return {
        "ok": True,
        "created_count": created_count,
        "rendered_count": rendered_count,
        "skipped_reasons": skipped_reasons,
        "plans": [serialize_selection(item) for item in plans],
    }


def template_override_error(reel_type, template_key):
    known_template_keys = {key for keys in TEMPLATE_KEYS_BY_REEL_TYPE.values() for key in keys}
    if reel_type == "auto":
        if template_key not in known_template_keys:
            return "invalid_template_key"
        return ""
    if template_key not in known_template_keys:
        return "invalid_template_key"
    if not template_key_is_valid_for_reel_type(template_key, reel_type):
        return "template_key_does_not_match_reel_type"
    return ""


def reel_type_for_template_key(template_key):
    for reel_type, keys in TEMPLATE_KEYS_BY_REEL_TYPE.items():
        if template_key in keys:
            return reel_type
    return ""


def choose_reel_template_key(reel_type, source_opportunity_ids, date=None):
    if reel_type == OpportunityReelPlan.ReelType.CLOSING_SOON:
        options = [
            "closing_soon_elegant_light_v1",
            "closing_soon_dark_premium_v1",
            "closing_soon_minimal_kinetic_v1",
        ]
    elif reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        options = ["prepare_early_elegant_v1"]
    elif reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        options = ["single_spotlight_elegant_v1"]
    else:
        return TEXT_TEMPLATE_BY_REEL_TYPE.get(reel_type, "single_spotlight_elegant_v1")

    run_date = parse_run_date(date) or timezone.localdate()
    seed = sum(int(item) for item in source_opportunity_ids if str(item).isdigit())
    seed += run_date.toordinal()
    return options[seed % len(options)]


def parse_run_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return timezone.localtime(value).date() if timezone.is_aware(value) else value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None


def reel_plan_count_for_date(run_date):
    start = timezone.make_aware(datetime.combine(run_date, time.min))
    end = timezone.make_aware(datetime.combine(run_date + timedelta(days=1), time.min))
    return OpportunityReelPlan.objects.filter(created_at__gte=start, created_at__lt=end).exclude(
        status=OpportunityReelPlan.Status.ARCHIVED
    ).count()


def select_reel_candidates(*, reel_type="auto", run_date=None, template_key=""):
    run_date = run_date or timezone.localdate()
    candidates = safe_reel_candidates(run_date=run_date)
    if not candidates:
        return {"ok": False, "reason": "no_safe_candidates", "candidates": []}

    if reel_type == "auto":
        selection = select_balanced_candidates(
            candidates,
            OpportunityReelPlan.ReelType.CLOSING_SOON,
            run_date=run_date,
            template_key=template_key,
        )
        if not selection["ok"]:
            selection = select_balanced_candidates(
                candidates,
                OpportunityReelPlan.ReelType.PREPARE_EARLY,
                run_date=run_date,
                template_key=template_key,
            )
        if not selection["ok"]:
            selection = select_single_candidate(candidates, run_date=run_date, template_key=template_key)
        return selection

    if reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        return select_single_candidate(candidates, run_date=run_date, template_key=template_key)

    return select_balanced_candidates(candidates, reel_type, run_date=run_date, template_key=template_key)


def safe_reel_candidates(*, run_date):
    queryset = (
        Opportunity.objects.select_related("country_ref")
        .filter(
            status=Opportunity.Status.PUBLISHED,
            opportunity_type=Opportunity.OpportunityType.SCHOLARSHIP,
        )
        .exclude(Q(title="") | Q(slug=""))
        .order_by("deadline", "-published_at", "title")
    )

    candidates = []
    for opportunity in queryset:
        if is_opportunity_expired_for_social(opportunity, today=run_date):
            continue
        if not opportunity.slug:
            continue

        deadline_window = get_deadline_window(opportunity.deadline, run_date)
        days_until_deadline = (
            (opportunity.deadline - run_date).days
            if opportunity.deadline and not opportunity.is_rolling_deadline
            else None
        )
        score = score_opportunity_for_social(opportunity)["score"]
        candidates.append(
            {
                "opportunity": opportunity,
                "id": opportunity.pk,
                "title": opportunity.title,
                "deadline_window": deadline_window,
                "deadline_window_label": deadline_window_label(deadline_window),
                "days_until_deadline": days_until_deadline,
                "priority_score": score,
                "selection_reason": "published_non_expired_scholarship",
            }
        )

    candidates.sort(
        key=lambda item: (
            deadline_rank(item["deadline_window"]),
            -(item["priority_score"] or 0),
            item["days_until_deadline"] if item["days_until_deadline"] is not None else 9999,
            item["title"],
        )
    )
    return candidates


def deadline_rank(window):
    ranks = {
        "urgent": 0,
        "soon": 1,
        "advance_notice": 2,
        "early_awareness": 3,
        "far": 4,
        "missing": 5,
        "expired": 6,
    }
    return ranks.get(window, 99)


def select_balanced_candidates(candidates, reel_type, *, run_date, template_key=""):
    if reel_type == OpportunityReelPlan.ReelType.CLOSING_SOON:
        allowed = {"urgent", "soon", "advance_notice"}
        selected = pick_by_windows(
            [item for item in candidates if item["deadline_window"] in allowed],
            ["urgent", "soon", "advance_notice", "advance_notice", "soon"],
        )
        title = "3 Scholarships Closing Soon"
    elif reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        allowed = {"advance_notice", "early_awareness"}
        selected = pick_by_windows(
            [item for item in candidates if item["deadline_window"] in allowed],
            ["advance_notice", "early_awareness", "advance_notice", "early_awareness"],
        )
        title = "Prepare Early"
    else:
        return {"ok": False, "reason": "unsupported_reel_type", "candidates": []}

    if len(selected) < 3:
        return select_single_candidate(candidates, run_date=run_date, template_key=template_key)

    selected = selected[:3]
    return build_selection(reel_type=reel_type, title=title, candidates=selected, run_date=run_date, template_key=template_key)


def pick_by_windows(candidates, window_order):
    selected = []
    selected_ids = set()
    by_window = {}
    for candidate in candidates:
        by_window.setdefault(candidate["deadline_window"], []).append(candidate)

    for window in window_order:
        for candidate in by_window.get(window, []):
            if candidate["id"] in selected_ids:
                continue
            selected.append(candidate)
            selected_ids.add(candidate["id"])
            break
        if len(selected) == 3:
            return selected

    for candidate in candidates:
        if candidate["id"] not in selected_ids:
            selected.append(candidate)
            selected_ids.add(candidate["id"])
        if len(selected) == 3:
            break
    return selected


def select_single_candidate(candidates, *, run_date, template_key=""):
    usable = [
        item
        for item in candidates
        if item["deadline_window"] not in {"missing", "expired"} and item["days_until_deadline"] is not None
    ]
    usable = usable or candidates
    if not usable:
        return {"ok": False, "reason": "no_safe_candidates", "candidates": []}
    return build_selection(
        reel_type=OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP,
        title="Scholarship Alert",
        candidates=[usable[0]],
        run_date=run_date,
        template_key=template_key,
    )


def build_selection(*, reel_type, title, candidates, run_date=None, template_key=""):
    scenes = build_auto_scenes(reel_type, candidates)
    durations = calculate_scene_durations(reel_type, len(scenes))
    expected_duration = round(sum(durations), 2)
    for scene, duration in zip(scenes, durations):
        scene["duration"] = duration
    source_ids = [item["id"] for item in candidates]
    priority_score = sum(item["priority_score"] for item in candidates)
    deadline_window = candidates[0]["deadline_window"] if candidates else ""
    chosen_template_key = template_key or choose_reel_template_key(
        reel_type,
        source_ids,
        date=run_date,
    )
    return {
        "ok": True,
        "title": title,
        "reel_type": reel_type,
        "template_key": chosen_template_key,
        "source_opportunity_ids": source_ids,
        "source_opportunities": [serialize_candidate(item) for item in candidates],
        "scenes_json": scenes,
        "caption_text": build_caption_text(reel_type),
        "hashtags": "#ScholarsRepublic #Scholarships #StudyAbroad #InternationalStudents #ScholarshipAlert",
        "priority_score": priority_score,
        "deadline_window": deadline_window,
        "expected_duration_seconds": expected_duration,
        "selection_reason": "balanced_deadline_window_selection",
    }


def build_auto_scenes(reel_type, candidates):
    if reel_type == OpportunityReelPlan.ReelType.SINGLE_SCHOLARSHIP:
        candidate = candidates[0]
        opportunity = candidate["opportunity"]
        info_line = opportunity_info_line(opportunity)
        return [
            {
                "scene_type": "hook",
                "label": "Alert",
                "title": "Scholarship alert",
                "subheadline": info_line,
                "blocks": [],
            },
            {
                "scene_type": "scholarship",
                "rank": "01",
                "label": "Deadline",
                "title": short_title(opportunity.title),
                "blocks": [info_line, f"Deadline: {readable_deadline(opportunity.deadline)}"],
                "action_line": "Check eligibility",
            },
            {
                "scene_type": "cta",
                "label": "Next step",
                "title": "Read official details",
                "subheadline": "Scholars Republic",
                "blocks": ["ScholarsRepublic.org"],
            },
        ]

    if reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        hook = "Start before the rush"
        subheadline = "Scholarships to prepare early"
        action_line = "Prepare documents early"
        cta = "Plan your application"
        cta_subheadline = "Requirements + official links"
    else:
        hook = "Deadlines are close"
        subheadline = "3 scholarships to check today"
        action_line = "Check eligibility today"
        cta = "Apply before deadlines"
        cta_subheadline = "Official links on Scholars Republic"

    scenes = [
        {
            "scene_type": "hook",
            "label": "Scholars Republic",
            "title": hook,
            "subheadline": subheadline,
            "blocks": [],
        }
    ]
    scenes.extend(
        scholarship_scene(candidate, rank=f"{index:02d}", action_line=action_line)
        for index, candidate in enumerate(candidates[:3], start=1)
    )
    scenes.append(
        {
            "scene_type": "cta",
            "label": "Next step",
            "title": cta,
            "subheadline": cta_subheadline,
            "blocks": ["ScholarsRepublic.org"],
        }
    )
    return scenes


def scholarship_scene(candidate, rank, action_line="Check eligibility today"):
    opportunity = candidate["opportunity"]
    deadline = readable_deadline(opportunity.deadline)
    return {
        "scene_type": "scholarship",
        "rank": rank,
        "label": candidate["deadline_window_label"],
        "title": short_title(opportunity.title),
        "blocks": [opportunity_info_line(opportunity), f"Deadline: {deadline}"],
        "action_line": action_line,
    }


def short_title(value):
    return shorten_reel_title(value, 42)


def opportunity_info_line(opportunity):
    parts = []
    if opportunity.country:
        parts.append(opportunity.country)
    degree = degree_label(opportunity)
    if degree:
        parts.append(degree)
    return " · ".join(parts)


def degree_label(opportunity):
    levels = opportunity.degree_levels if isinstance(opportunity.degree_levels, list) else []
    levels = [str(item).strip() for item in levels if str(item).strip()]
    if not levels:
        return ""
    return text_shorten(", ".join(levels[:2]), 24)


def readable_deadline(value):
    if not value:
        return "Check official page"
    return value.strftime("%b %d, %Y")


def text_shorten(value, width):
    value = str(value or "").strip()
    return value if len(value) <= width else f"{value[: max(0, width - 3)].rstrip()}..."


def build_caption_text(reel_type):
    if reel_type == OpportunityReelPlan.ReelType.CLOSING_SOON:
        return (
            "Scholarships closing soon for international students. Check eligibility, "
            "deadlines, and official links before applying."
        )
    if reel_type == OpportunityReelPlan.ReelType.PREPARE_EARLY:
        return (
            "Start preparing early for these scholarship opportunities. Review requirements "
            "and official links on Scholars Republic."
        )
    return (
        "Scholarship opportunity for international students. Check eligibility, deadline, "
        "and official application details on Scholars Republic."
    )


def duplicate_skip_reason(source_ids, run_date):
    recent_start = timezone.now() - timedelta(days=configured_recent_days())
    source_set = {int(item) for item in source_ids}
    recent_plans = OpportunityReelPlan.objects.filter(
        created_at__gte=recent_start,
        status__in=NON_ARCHIVED_STATUSES,
    )
    for plan in recent_plans:
        existing = {int(item) for item in (plan.source_opportunity_ids or [])}
        if existing == source_set:
            return "duplicate_recent_source_set"

    max_use = configured_max_use_per_opportunity()
    for opportunity_id in source_set:
        use_count = 0
        for plan in recent_plans:
            if opportunity_id in {int(item) for item in (plan.source_opportunity_ids or [])}:
                use_count += 1
        if use_count >= max_use:
            return "opportunity_recent_use_limit"
    return ""


def create_reel_plan_from_selection(selection):
    plan = OpportunityReelPlan.objects.create(
        title=selection["title"],
        reel_type=selection["reel_type"],
        status=OpportunityReelPlan.Status.READY_FOR_RENDER,
        template_key=selection.get("template_key", ""),
        scenes_json=selection["scenes_json"],
        caption_text=selection["caption_text"],
        hashtags=selection["hashtags"],
        source_opportunity_ids=selection["source_opportunity_ids"],
        priority_score=selection["priority_score"],
        deadline_window=selection["deadline_window"],
    )
    OpportunityReelLog.objects.create(
        reel_plan=plan,
        status=OpportunityReelLog.Status.CREATED,
        response_payload={
            "source": "automatic_reel_planning",
            "expected_duration_seconds": expected_reel_duration(plan),
        },
    )
    return plan


def serialize_candidate(candidate):
    opportunity = candidate["opportunity"]
    return {
        "id": opportunity.pk,
        "title": opportunity.title,
        "short_title": short_title(opportunity.title),
        "slug": opportunity.slug,
        "provider_name": opportunity.provider_name,
        "country": opportunity.country,
        "degree": degree_label(opportunity),
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "deadline_label": readable_deadline(opportunity.deadline),
        "deadline_window": candidate["deadline_window"],
        "deadline_window_label": candidate["deadline_window_label"],
        "days_until_deadline": candidate["days_until_deadline"],
        "priority_score": candidate["priority_score"],
        "selection_reason": candidate["selection_reason"],
    }


def serialize_selection(selection):
    data = {
        "ok": selection.get("ok", True),
        "id": selection.get("id"),
        "title": selection.get("title", ""),
        "reel_type": selection.get("reel_type", ""),
        "template_key": selection.get("template_key", ""),
        "status": selection.get("status", "preview"),
        "source_opportunity_ids": selection.get("source_opportunity_ids", []),
        "source_opportunities": selection.get("source_opportunities", []),
        "scenes_json": selection.get("scenes_json", []),
        "caption_text": selection.get("caption_text", ""),
        "hashtags": selection.get("hashtags", ""),
        "priority_score": selection.get("priority_score", 0),
        "deadline_window": selection.get("deadline_window", ""),
        "expected_duration_seconds": selection.get("expected_duration_seconds"),
        "selection_reason": selection.get("selection_reason", ""),
        "skip_reason": selection.get("skip_reason", ""),
        "dry_run": bool(selection.get("dry_run")),
        "video_url": selection.get("video_url", ""),
    }
    plan = selection.get("plan")
    if plan:
        data["id"] = plan.pk
        data["status"] = plan.status
        data["video_url"] = plan.resolved_video_url
    return data
