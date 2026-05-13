#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_ROOT="${PRODUCTION_ROOT:-/home/scholarsrepublic/scholarsrepublic}"
BACKUP_ROOT="${BACKUP_ROOT:-/home/scholarsrepublic/backups}"
MEDIA_DIR="${MEDIA_DIR:-/var/www/scholarsrepublic/media}"

BACKEND_ENV="${BACKEND_ENV:-$PRODUCTION_ROOT/backend/.env}"
FRONTEND_ENV="${FRONTEND_ENV:-$PRODUCTION_ROOT/frontend/.env.local}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="$BACKUP_ROOT/scholarsrepublic-$timestamp"

read_env_value() {
  local name="$1"
  local file="$2"
  local value

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  value="$(grep -E "^${name}=" "$file" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  if [[ -z "$value" ]]; then
    return 1
  fi

  printf '%s' "$value"
}

require_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "Required file missing: $file" >&2
    exit 1
  fi
}

verify_nonempty() {
  local file="$1"

  if [[ ! -s "$file" ]]; then
    echo "Backup file missing or empty: $file" >&2
    exit 1
  fi
}

require_file "$BACKEND_ENV"
require_file "$FRONTEND_ENV"

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

backend_env_backup="$backup_dir/backend.env"
frontend_env_backup="$backup_dir/frontend.env.local"
database_backup="$backup_dir/database.dump"
media_backup="$backup_dir/media.tar.gz"

cp "$BACKEND_ENV" "$backend_env_backup"
cp "$FRONTEND_ENV" "$frontend_env_backup"
chmod 600 "$backend_env_backup" "$frontend_env_backup"

db_name="${DATABASE_NAME:-$(read_env_value DATABASE_NAME "$BACKEND_ENV" || printf 'scholars_republic')}"
db_user="${DATABASE_USER:-$(read_env_value DATABASE_USER "$BACKEND_ENV" || printf 'postgres')}"
db_host="${DATABASE_HOST:-$(read_env_value DATABASE_HOST "$BACKEND_ENV" || printf 'localhost')}"
db_port="${DATABASE_PORT:-$(read_env_value DATABASE_PORT "$BACKEND_ENV" || printf '5432')}"
db_password="${DATABASE_PASSWORD:-$(read_env_value DATABASE_PASSWORD "$BACKEND_ENV" || true)}"

if [[ -n "$db_password" ]]; then
  PGPASSWORD="$db_password" pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --host="$db_host" \
    --port="$db_port" \
    --username="$db_user" \
    --file="$database_backup" \
    "$db_name"
else
  pg_dump \
    --format=custom \
    --no-owner \
    --no-acl \
    --host="$db_host" \
    --port="$db_port" \
    --username="$db_user" \
    --file="$database_backup" \
    "$db_name"
fi

if [[ -d "$MEDIA_DIR" ]]; then
  tar -C "$(dirname "$MEDIA_DIR")" -czf "$media_backup" "$(basename "$MEDIA_DIR")"
else
  echo "Media directory missing: $MEDIA_DIR" >&2
  exit 1
fi

verify_nonempty "$backend_env_backup"
verify_nonempty "$frontend_env_backup"
verify_nonempty "$database_backup"
verify_nonempty "$media_backup"

cat <<EOF
Backup complete:
  Directory: $backup_dir
  Backend env: $backend_env_backup
  Frontend env: $frontend_env_backup
  Database dump: $database_backup
  Media archive: $media_backup
EOF
