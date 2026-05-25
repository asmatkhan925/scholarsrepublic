#!/usr/bin/env bash
set -euo pipefail

cd /home/scholarsrepublic/scholarsrepublic/backend

if [ -f venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
elif [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

python manage.py shell <<'PY'
from django.utils import timezone

from apps.opportunities.models import OpportunitySocialPostLog, OpportunitySocialPostPlan

now = timezone.now()

print("Facebook social posting status")
print(f"Now: {now.isoformat()}")
print(f"Total plans: {OpportunitySocialPostPlan.objects.filter(platform='facebook').count()}")
print(
    "Ready plans: "
    f"{OpportunitySocialPostPlan.objects.filter(platform='facebook', enabled=True, status='ready').count()}"
)
print(
    "Due-looking plans with next_post_at <= now: "
    f"{OpportunitySocialPostPlan.objects.filter(platform='facebook', enabled=True, status='ready', next_post_at__lte=now).count()}"
)

print("")
print("Latest 10 logs:")
for log in OpportunitySocialPostLog.objects.select_related("opportunity", "plan").order_by("-created_at")[:10]:
    print(
        f"- id={log.id} status={log.status} opportunity={log.opportunity.slug} "
        f"plan_id={log.plan_id or '-'} posted_at={log.posted_at or '-'} "
        f"error={(log.error_message or '')[:160]}"
    )
PY
