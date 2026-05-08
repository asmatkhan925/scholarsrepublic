#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/home/scholarsrepublic/scholarsrepublic}"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
BACKUP_DIR="${BACKUP_DIR:-/home/scholarsrepublic/backups}"
LOG_DIR="${LOG_DIR:-/home/scholarsrepublic/deploy_logs}"
DOMAIN="${DOMAIN:-https://scholarsrepublic.org}"
BRANCH="${BRANCH:-main}"

BACKEND_SERVICE="${BACKEND_SERVICE:-scholars-backend}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-scholars-frontend}"
NGINX_SERVICE="${NGINX_SERVICE:-nginx}"

LOCK_FILE="/tmp/scholarsrepublic_deploy.lock"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"
LOG_FILE="$LOG_DIR/deploy_$(date +%F_%H-%M-%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "============================================================"
echo "Scholars Republic deployment started: $(date)"
echo "Log: $LOG_FILE"
echo "============================================================"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "ERROR: Another deployment is already running."
  exit 1
fi

fail() {
  echo "ERROR: $*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

require_cmd git
require_cmd python3
require_cmd npm
require_cmd curl
require_cmd pg_dump

[ -d "$APP_DIR/.git" ] || fail "$APP_DIR is not a git repository"
[ -d "$BACKEND_DIR" ] || fail "Missing backend directory"
[ -d "$FRONTEND_DIR" ] || fail "Missing frontend directory"

cd "$APP_DIR"

echo ""
echo "Current commit:"
git rev-parse HEAD

echo ""
echo "Checking for local tracked changes..."
if [ "${DEPLOY_ALLOW_DIRTY:-0}" != "1" ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git status --short
    fail "Local tracked changes exist. Commit/stash them, or run with DEPLOY_ALLOW_DIRTY=1."
  fi
else
  echo "DEPLOY_ALLOW_DIRTY=1 set; continuing despite local changes."
fi

echo ""
echo "Pulling latest code..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo ""
echo "New commit:"
git rev-parse HEAD

echo ""
echo "Loading backend environment..."
[ -f "$BACKEND_DIR/.env" ] || fail "Missing $BACKEND_DIR/.env"

set -a
source "$BACKEND_DIR/.env"
set +a

: "${DATABASE_NAME:?DATABASE_NAME missing}"
: "${DATABASE_USER:?DATABASE_USER missing}"
: "${DATABASE_PASSWORD:?DATABASE_PASSWORD missing}"
: "${DATABASE_HOST:?DATABASE_HOST missing}"
: "${DATABASE_PORT:?DATABASE_PORT missing}"

echo "Database: $DATABASE_NAME"
echo "Database host: $DATABASE_HOST:$DATABASE_PORT"

echo ""
echo "Creating database backup..."
DB_BACKUP="$BACKUP_DIR/db_${DATABASE_NAME}_$(date +%F_%H-%M-%S).sql"

PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
  -h "$DATABASE_HOST" \
  -p "$DATABASE_PORT" \
  -U "$DATABASE_USER" \
  -d "$DATABASE_NAME" \
  > "$DB_BACKUP"

[ -s "$DB_BACKUP" ] || fail "Database backup failed or backup file is empty"
echo "Backup created: $DB_BACKUP"

echo ""
echo "Updating backend..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
python manage.py check
python manage.py migrate --noinput
python manage.py collectstatic --noinput
deactivate

echo ""
echo "Updating frontend..."
cd "$FRONTEND_DIR"

if [ ! -f ".env.local" ]; then
  echo "NEXT_PUBLIC_API_BASE_URL=$DOMAIN/api" > .env.local
fi

if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

npm run build

echo ""
echo "Testing nginx config..."
sudo nginx -t

echo ""
echo "Restarting services..."
sudo systemctl restart "$BACKEND_SERVICE"
sudo systemctl restart "$FRONTEND_SERVICE"
sudo systemctl restart "$NGINX_SERVICE"

sleep 5

echo ""
echo "Checking services..."
sudo systemctl is-active --quiet "$BACKEND_SERVICE" || {
  sudo journalctl -u "$BACKEND_SERVICE" --no-pager -n 80
  fail "Backend service is not active"
}

sudo systemctl is-active --quiet "$FRONTEND_SERVICE" || {
  sudo journalctl -u "$FRONTEND_SERVICE" --no-pager -n 80
  fail "Frontend service is not active"
}

sudo systemctl is-active --quiet "$NGINX_SERVICE" || {
  sudo journalctl -u "$NGINX_SERVICE" --no-pager -n 80
  fail "Nginx service is not active"
}

echo "Services are active."

echo ""
echo "Health checks..."
curl -fsS http://127.0.0.1:8000/api/health/ >/dev/null
curl -fsSI http://127.0.0.1:3000 >/dev/null
curl -fsS "$DOMAIN/api/health/" >/dev/null
curl -fsSI "$DOMAIN/" >/dev/null
curl -fsSI "$DOMAIN/static/admin/css/base.css" >/dev/null

echo ""
echo "Cleaning old database backups, keeping latest 10..."
find "$BACKUP_DIR" -name "db_*.sql" -type f | sort | head -n -10 | xargs -r rm -f

echo ""
echo "Deployment successful."
echo "Site: $DOMAIN"
echo "Finished: $(date)"
echo "============================================================"
