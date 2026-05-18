#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/home/scholarsrepublic/scholarsrepublic"
FRONTEND_DIR="$APP_ROOT/frontend"
SITE_URL="${SITE_URL:-https://scholarsrepublic.org}"

cd "$FRONTEND_DIR"

echo "==> Cleaning old Next.js build cache"
rm -rf .next

echo "==> Running lint"
npm run lint

echo "==> Building frontend"
npm run build

echo "==> Restarting frontend service"
sudo systemctl restart scholars-frontend

echo "==> Waiting for frontend"
sleep 3

echo "==> Checking homepage"
HOME_STATUS=$(curl -sS -o /tmp/sr-home-check.html -w "%{http_code}" "$SITE_URL/")
if [ "$HOME_STATUS" != "200" ]; then
  echo "Homepage check failed. HTTP status: $HOME_STATUS"
  exit 1
fi

CSS_PATH=$(grep -oE '/_next/static/css/[^"]+\.css' /tmp/sr-home-check.html | head -n 1 || true)

if [ -z "$CSS_PATH" ]; then
  echo "No Next.js CSS asset found in homepage HTML."
  exit 1
fi

echo "==> Checking CSS asset: $CSS_PATH"
CSS_STATUS=$(curl -sS -o /tmp/sr-css-check.css -w "%{http_code}" "$SITE_URL$CSS_PATH")
if [ "$CSS_STATUS" != "200" ]; then
  echo "CSS asset check failed. HTTP status: $CSS_STATUS"
  echo "CSS path: $SITE_URL$CSS_PATH"
  exit 1
fi

echo "==> Checking important pages"
for path in \
  "/" \
  "/scholarships" \
  "/blog" \
  "/login" \
  "/dashboard" \
  "/dashboard/applications" \
  "/dashboard/ai/sop" \
  "/dashboard/ai/sop/history"
do
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE_URL$path")
  echo "$STATUS $path"

  if [ "$STATUS" != "200" ] && [ "$STATUS" != "302" ] && [ "$STATUS" != "307" ]; then
    echo "Page check failed for $path with status $STATUS"
    exit 1
  fi
done

echo "==> Frontend deployment completed successfully."
echo "CSS asset OK: $SITE_URL$CSS_PATH"
