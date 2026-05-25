#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: ./scripts/facebook/clear-plan-error.sh <plan_id>"
  echo "Example: ./scripts/facebook/clear-plan-error.sh 2"
  exit 1
fi

PLAN_ID="$1"

cd /home/scholarsrepublic/scholarsrepublic/backend

if [ -f venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source venv/bin/activate
elif [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

python manage.py shell <<PY
from apps.opportunities.models import OpportunitySocialPostPlan

plan = OpportunitySocialPostPlan.objects.select_related("opportunity").get(pk=${PLAN_ID})
plan.last_error = ""
plan.save(update_fields=["last_error", "updated_at"])
print(f"Plan {plan.id}: {plan.opportunity.title}")
print(f"last_error={plan.last_error!r}")
PY
