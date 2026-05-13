# Backup and Restore

Use this before migrations, bulk opportunity imports, or production maintenance that can change data.

Store production backups outside the repository, preferably under:

```bash
/home/scholarsrepublic/backups/
```

Never commit backup files, `.env` files, database dumps, media archives, or patch files.

## Automated Backup

Run on the production server:

```bash
cd /home/scholarsrepublic/scholarsrepublic
./deploy/backup_production.sh
```

The script creates a timestamped directory and backs up:

- `backend/.env`
- `frontend/.env.local`
- PostgreSQL database using `pg_dump`
- `/var/www/scholarsrepublic/media`

It prints the backup file paths and verifies each file exists and has non-zero size.

## Manual Database Backup

Run on the production server. Fill these values from `backend/.env` without printing secrets.

```bash
BACKUP_DIR="/home/scholarsrepublic/backups/manual-$(date +%Y%m%d-%H%M%S)"
DB_NAME="scholars_republic"
DB_USER="<database-user>"
DB_HOST="localhost"
DB_PORT="5432"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
read -rsp "Database password, leave empty if using peer auth or .pgpass: " PGPASSWORD
echo
export PGPASSWORD

pg_dump \
  --format=custom \
  --no-owner \
  --no-acl \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --file="$BACKUP_DIR/database.dump" \
  "$DB_NAME"

unset PGPASSWORD
```

## Manual Media and Environment Backup

```bash
BACKUP_DIR="/home/scholarsrepublic/backups/manual-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cp /home/scholarsrepublic/scholarsrepublic/backend/.env "$BACKUP_DIR/backend.env"
cp /home/scholarsrepublic/scholarsrepublic/frontend/.env.local "$BACKUP_DIR/frontend.env.local"
tar -C /var/www/scholarsrepublic -czf "$BACKUP_DIR/media.tar.gz" media
```

For large media directories, `rsync` is also acceptable:

```bash
rsync -a --delete /var/www/scholarsrepublic/media/ "$BACKUP_DIR/media/"
```

## Verify Backups

Check files exist and have non-zero size:

```bash
BACKUP_DIR="/home/scholarsrepublic/backups/<backup-directory>"

ls -lh "$BACKUP_DIR"
test -s "$BACKUP_DIR/backend.env"
test -s "$BACKUP_DIR/frontend.env.local"
test -s "$BACKUP_DIR/database.dump"
test -s "$BACKUP_DIR/media.tar.gz"
```

For a PostgreSQL custom-format dump:

```bash
pg_restore --list "$BACKUP_DIR/database.dump" >/dev/null
```

## Restore Warning

Do not restore over production without taking a fresh backup and confirming target DB.

Before restoring, confirm:

- The dump file is the intended backup.
- The target database name, host, and user are correct.
- You have a fresh backup from immediately before the restore.
- The application can tolerate downtime during the restore.

## Database Restore

Example restore into a target database:

```bash
BACKUP_DUMP="/home/scholarsrepublic/backups/<backup-directory>/database.dump"
TARGET_DB="scholars_republic"
DB_USER="<database-user>"
DB_HOST="localhost"
DB_PORT="5432"

read -rsp "Database password, leave empty if using peer auth or .pgpass: " PGPASSWORD
echo
export PGPASSWORD

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$TARGET_DB" \
  "$BACKUP_DUMP"

unset PGPASSWORD
```

After restore:

```bash
python manage.py migrate
python manage.py check
sudo systemctl restart scholars-backend
```

## Media Restore

Take a fresh backup first, then restore media:

```bash
sudo systemctl stop scholars-backend

RESTORE_DIR="/home/scholarsrepublic/backups/<backup-directory>"
sudo tar -C /var/www/scholarsrepublic -xzf "$RESTORE_DIR/media.tar.gz"
sudo chown -R scholarsrepublic:scholarsrepublic /var/www/scholarsrepublic/media

sudo systemctl start scholars-backend
```

Run smoke checks from `docs/production-checklist.md` after any restore.
