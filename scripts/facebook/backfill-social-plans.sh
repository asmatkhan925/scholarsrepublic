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

python manage.py backfill_facebook_social_plans --dry-run

echo ""
read -r -p "Type BACKFILL to create missing plans: " confirmation

if [ "$confirmation" != "BACKFILL" ]; then
  echo "Backfill cancelled."
  exit 0
fi

python manage.py backfill_facebook_social_plans

python manage.py shell <<'PY'
from apps.opportunities.models import OpportunitySocialPostPlan

print(
    "Facebook plans after backfill: "
    f"{OpportunitySocialPostPlan.objects.filter(platform='facebook').count()}"
)
print(
    "Ready enabled Facebook plans: "
    f"{OpportunitySocialPostPlan.objects.filter(platform='facebook', enabled=True, status='ready').count()}"
)
PY
