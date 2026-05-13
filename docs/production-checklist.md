# Production Checklist

Use this checklist before deploying Scholars Republic changes.

## Deploy

```bash
cd /home/scholarsrepublic/scholarsrepublic
git pull origin main

cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py check

cd ../frontend
npm run lint
npm run build

sudo systemctl restart scholars-backend
sudo systemctl restart scholars-frontend
```

## Required Production Environment

Set these in production environment files or service environment. Do not commit real values.

Backend:

```dotenv
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<secret>
DJANGO_ALLOWED_HOSTS=scholarsrepublic.org,www.scholarsrepublic.org
CORS_ALLOWED_ORIGINS=https://scholarsrepublic.org,https://www.scholarsrepublic.org
CSRF_TRUSTED_ORIGINS=https://scholarsrepublic.org,https://www.scholarsrepublic.org
FRONTEND_URL=https://scholarsrepublic.org

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=<secret>
DEFAULT_FROM_EMAIL=Scholars Republic <noreply@scholarsrepublic.org>
```

`settings.py` also reads `DEBUG`, `SECRET_KEY`, and `ALLOWED_HOSTS` as compatibility fallbacks,
but production should use the `DJANGO_*` names above.

Verify production settings without printing secrets:

```bash
cd /home/scholarsrepublic/scholarsrepublic/backend
source venv/bin/activate

python manage.py shell <<'PY'
from django.conf import settings
print("DEBUG:", settings.DEBUG)
print("ALLOWED_HOSTS:", settings.ALLOWED_HOSTS)
print("CSRF_TRUSTED_ORIGINS:", settings.CSRF_TRUSTED_ORIGINS)
print("CORS_ALLOWED_ORIGINS:", settings.CORS_ALLOWED_ORIGINS)
print("FRONTEND_URL:", settings.FRONTEND_URL)
print("DEFAULT_FROM_EMAIL:", settings.DEFAULT_FROM_EMAIL)
print("SECRET_KEY_SET:", bool(settings.SECRET_KEY))
PY
```

Expected:

- `DEBUG` is `False`.
- Hosts and origins contain only Scholars Republic production domains.
- `SECRET_KEY_SET` is `True`; never print the actual secret.

## Smoke Checks

```bash
curl -sS https://scholarsrepublic.org/api/health/
curl -I https://scholarsrepublic.org/
curl -I https://scholarsrepublic.org/scholarships
curl -I https://scholarsrepublic.org/login
curl -I https://scholarsrepublic.org/register
curl -I https://scholarsrepublic.org/forgot-password
curl -I https://scholarsrepublic.org/reset-password
curl -I https://scholarsrepublic.org/verify-email
curl -I https://scholarsrepublic.org/api/docs/
curl -I https://scholarsrepublic.org/api/schema/
```

Expected:

- Public pages return `200`.
- `/api/health/` returns `200` with a simple status response.
- `/api/docs/` and `/api/schema/` are not public `200` responses in production.

Auth smoke tests:

- Register redirects the frontend user to login with email filled.
- Verification redirects to login and does not issue JWT tokens.
- Login only succeeds for active, verified users.
- Forgot password returns a generic response for every email.
- Reset password redirects to login and does not log the user in automatically.

## Safety

- Never commit `backend/.env` or `frontend/.env.local`.
- Never commit backups, patch files, API keys, SMTP credentials, DB passwords, SSH keys, or Cloudflare credentials.
- Keep production `DJANGO_DEBUG=False`, explicit `DJANGO_ALLOWED_HOSTS`, explicit HTTPS `CORS_ALLOWED_ORIGINS`, and explicit HTTPS `CSRF_TRUSTED_ORIGINS`.
