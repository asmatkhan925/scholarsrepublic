#!/usr/bin/env bash
set -euo pipefail

SITE_URL="${SITE_URL:-https://scholarsrepublic.org}"
AI_HEALTH_URL="${AI_HEALTH_URL:-http://127.0.0.1:18002/health}"

echo "==> Scholars Republic production smoke test"
echo "Site: $SITE_URL"
echo

check_status() {
  local path="$1"
  local expected="${2:-200 301 302 307 308}"
  local status

  status=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE_URL$path")

  echo "$status $path"

  if [[ ! " $expected " =~ " $status " ]]; then
    echo "FAILED: $path returned $status"
    exit 1
  fi
}

echo "==> Checking public pages"
check_status "/"
check_status "/scholarships"
check_status "/blog"
check_status "/guides/how-to-write-sop-for-scholarship"
check_status "/login"
check_status "/register"

echo
echo "==> Checking dashboard routes"
check_status "/dashboard" "200 301 302 307 308"
check_status "/dashboard/applications" "200 301 302 307 308"
check_status "/dashboard/profile" "200 301 302 307 308"
check_status "/dashboard/saved" "200 301 302 307 308"
check_status "/dashboard/recommendations" "200 301 302 307 308"
check_status "/dashboard/ai/sop" "200 301 302 307 308"
check_status "/dashboard/ai/sop/history" "200 301 302 307 308"

echo
echo "==> Checking backend health"
API_STATUS=$(curl -sS -o /tmp/sr-api-health.txt -w "%{http_code}" "$SITE_URL/api/health/" || true)
echo "$API_STATUS /api/health/"

if [ "$API_STATUS" != "200" ]; then
  echo "FAILED: backend health endpoint returned $API_STATUS"
  cat /tmp/sr-api-health.txt || true
  exit 1
fi

echo
echo "==> Checking frontend CSS asset"
curl -sS "$SITE_URL/" -o /tmp/sr-smoke-home.html

CSS_PATH=$(grep -oE '/_next/static/css/[^"]+\.css' /tmp/sr-smoke-home.html | head -n 1 || true)

if [ -z "$CSS_PATH" ]; then
  echo "FAILED: no Next.js CSS file found in homepage HTML."
  exit 1
fi

CSS_STATUS=$(curl -sS -o /tmp/sr-smoke-css.css -w "%{http_code}" "$SITE_URL$CSS_PATH")
echo "$CSS_STATUS $CSS_PATH"

if [ "$CSS_STATUS" != "200" ]; then
  echo "FAILED: CSS asset returned $CSS_STATUS"
  exit 1
fi

if ! grep -q "text-ink\|bg-pine\|tailwind\|--color-ink" /tmp/sr-smoke-css.css; then
  echo "WARNING: CSS file returned 200 but did not contain expected app styles."
fi

echo
echo "==> Checking systemd services"
for service in scholars-backend scholars-frontend nginx; do
  if systemctl is-active --quiet "$service"; then
    echo "active $service"
  else
    echo "FAILED: $service is not active"
    sudo systemctl status "$service" --no-pager || true
    exit 1
  fi
done

echo
echo "==> Checking optional AI tunnel"
if curl -sS --max-time 5 "$AI_HEALTH_URL" >/tmp/sr-ai-health.txt 2>/tmp/sr-ai-health.err; then
  echo "AI tunnel reachable: $AI_HEALTH_URL"
  cat /tmp/sr-ai-health.txt
  echo
else
  echo "WARNING: AI tunnel not reachable at $AI_HEALTH_URL"
  echo "This is not failing the smoke test because external/backup AI can still be available."
fi

echo
echo "==> Smoke test passed."
