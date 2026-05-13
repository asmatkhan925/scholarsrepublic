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

## Smoke Checks

```bash
curl -sS https://scholarsrepublic.org/api/health/
curl -I https://scholarsrepublic.org/login
curl -I https://scholarsrepublic.org/register
curl -I https://scholarsrepublic.org/verify-email
curl -I https://scholarsrepublic.org/scholarships
```

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
