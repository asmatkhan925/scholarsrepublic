# Production Deployment

This document captures the live production layout for Scholars Republic and the
safe deployment flow for `https://scholarsrepublic.org`.

## Server Layout

- App repository: `/home/scholarsrepublic/scholarsrepublic`
- Backend: `/home/scholarsrepublic/scholarsrepublic/backend`
- Frontend: `/home/scholarsrepublic/scholarsrepublic/frontend`
- Collected static files: `/var/www/scholarsrepublic/staticfiles`
- Media files: `/var/www/scholarsrepublic/media`

## Required Services

- `postgresql`
- `scholars-backend`
- `scholars-frontend`
- `nginx`
- `cloudflared`

## Cloudflare Tunnel

The Cloudflare Tunnel should route:

- `scholarsrepublic.org` -> `http://localhost:80`

Nginx then routes public traffic to the frontend, backend, admin, static, and
media handlers.

## Nginx Routes

- `/` -> `http://127.0.0.1:3000`
- `/api/` -> `http://127.0.0.1:8000/api/`
- `/admin/` -> `http://127.0.0.1:8000/admin/`
- `/static/` -> `/var/www/scholarsrepublic/staticfiles/`
- `/media/` -> `/var/www/scholarsrepublic/media/`

The production Nginx template is available at:

```bash
deploy/nginx/scholarsrepublic.conf.example
```

Make sure `/`, `/api/`, and `/admin/` pass:

```nginx
proxy_set_header X-Forwarded-Proto https;
```

## Systemd Templates

Example service files are available at:

```bash
deploy/systemd/scholars-backend.service.example
deploy/systemd/scholars-frontend.service.example
```

## Required Backend Environment

Create `/home/scholarsrepublic/scholarsrepublic/backend/.env` from
`backend/.env.example` and set real secrets:

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=change-me
DJANGO_ALLOWED_HOSTS=scholarsrepublic.org,www.scholarsrepublic.org
DJANGO_INTERNAL_ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_NAME=scholars_republic
DATABASE_USER=scholars_user
DATABASE_PASSWORD=change-me
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_CONNECT_TIMEOUT_SECONDS=5
DATABASE_CONN_MAX_AGE=60

CORS_ALLOWED_ORIGINS=https://scholarsrepublic.org,https://www.scholarsrepublic.org
CSRF_TRUSTED_ORIGINS=https://scholarsrepublic.org,https://www.scholarsrepublic.org

STATIC_URL=/static/
STATIC_ROOT=/var/www/scholarsrepublic/staticfiles
MEDIA_URL=/media/
MEDIA_ROOT=/var/www/scholarsrepublic/media

SECURE_PROXY_SSL_HEADER_ENABLED=True
USE_X_FORWARDED_HOST=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SAMESITE=Lax
SESSION_COOKIE_SAMESITE=Lax
```

Create `/home/scholarsrepublic/scholarsrepublic/frontend/.env.local`:

```env
SERVER_API_BASE_URL=http://127.0.0.1:8000/api
NEXT_PUBLIC_API_BASE_URL=https://scholarsrepublic.org/api
```

## One-Command Deployment

From the app directory on the production server:

```bash
cd /home/scholarsrepublic/scholarsrepublic
bash deploy/deploy_scholarsrepublic.sh
```

The script:

- prevents simultaneous deployments with a lock file
- refuses local tracked changes unless `DEPLOY_ALLOW_DIRTY=1`
- pulls the latest `main`
- backs up the PostgreSQL database before migrations
- runs Django checks, migrations, and `collectstatic`
- installs and builds the frontend
- tests Nginx
- restarts backend, frontend, and Nginx
- checks service health, public site, API, and admin CSS
- keeps the latest 10 database backups

## Health Checks

```bash
curl https://scholarsrepublic.org/api/health/
curl -I https://scholarsrepublic.org/
curl -I https://scholarsrepublic.org/static/admin/css/base.css
```

Local service checks:

```bash
curl http://127.0.0.1:8000/api/health/
curl -I http://127.0.0.1:3000
```

## Troubleshooting

Admin CSRF 403:

- Check `CSRF_TRUSTED_ORIGINS=https://scholarsrepublic.org`
- Check `SECURE_PROXY_SSL_HEADER_ENABLED=True`
- Check Nginx passes `X-Forwarded-Proto https`

Admin CSS broken:

- Check `STATIC_ROOT=/var/www/scholarsrepublic/staticfiles`
- Run `python manage.py collectstatic --noinput`
- Check the Nginx `/static/` alias
- Check `/var/www/scholarsrepublic/staticfiles` permissions

Frontend port busy:

```bash
sudo ss -tulpn | grep ':3000'
```

Backend database authentication:

- Check the `DATABASE_*` env variable names
- Confirm the PostgreSQL user/password and database exist

Cloudflare Tunnel:

```bash
sudo systemctl status cloudflared --no-pager
```

Service logs:

```bash
sudo journalctl -u scholars-backend --no-pager -n 80
sudo journalctl -u scholars-frontend --no-pager -n 80
sudo journalctl -u nginx --no-pager -n 80
```
