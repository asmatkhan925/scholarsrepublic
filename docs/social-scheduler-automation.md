# Social Scheduler Automation

The Facebook Worker posts from the backend due-post queue at `09:00`, `12:00`, and `15:00` UTC. This automation runs the backend preparation command once per day before the first Worker run.

The command only prepares scheduler data. It recalculates social scores, generates/approves collections, and creates social post plans. It does not post to Facebook.

## Files

- `deploy/systemd/scholars-social-scheduler.service`
- `deploy/systemd/scholars-social-scheduler.timer`

## Schedule

The timer runs daily at `07:30 UTC`.

## Install

Run these commands on the production server from the repository root:

```bash
sudo cp deploy/systemd/scholars-social-scheduler.service /etc/systemd/system/scholars-social-scheduler.service
sudo cp deploy/systemd/scholars-social-scheduler.timer /etc/systemd/system/scholars-social-scheduler.timer
sudo systemctl daemon-reload
sudo systemctl enable --now scholars-social-scheduler.timer
```

The service runs from:

```text
/home/scholarsrepublic/scholarsrepublic/backend
```

It activates:

```text
/home/scholarsrepublic/scholarsrepublic/backend/venv
```

It executes:

```bash
python manage.py run_daily_social_scheduler
```

## Manual Test

Run the service once without waiting for the timer:

```bash
sudo systemctl start scholars-social-scheduler.service
```

## Verification

Confirm the timer is installed and scheduled:

```bash
systemctl list-timers | grep scholars-social
```

View recent service logs:

```bash
sudo journalctl -u scholars-social-scheduler.service --since "24 hours ago" --no-pager
```

Check timer status:

```bash
systemctl status scholars-social-scheduler.timer
```

Check the most recent service run status:

```bash
systemctl status scholars-social-scheduler.service
```

## Notes

- Logs are written to the systemd journal and are available through `journalctl`.
- The service is `Type=oneshot`, so it exits after the preparation command completes.
- `Persistent=true` lets systemd run a missed schedule after boot if the server was down at `07:30 UTC`.
- This automation does not modify the Facebook Worker schedule and does not post directly.
