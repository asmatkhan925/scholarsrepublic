#!/usr/bin/env bash
set -u

WORKER_DIR="/root/scholarsrepublic/workers/desktop_worker"
REPO_DIR="/root/scholarsrepublic"
VENV_PY="$WORKER_DIR/venv/bin/python"
WORKER_PY="$WORKER_DIR/worker.py"
ENV_FILE="$WORKER_DIR/.env"
LOG_FILE="/root/scholars-desktop-worker.log"
PID_PATTERN="$WORKER_PY"

cd "$WORKER_DIR" || exit 1

line() {
  printf '%*s\n' "${COLUMNS:-80}" '' | tr ' ' '-'
}

pause() {
  echo
  read -rp "Press Enter to continue..."
}

get_pid() {
  pgrep -f "$PID_PATTERN" || true
}

is_running() {
  [[ -n "$(get_pid)" ]]
}

show_header() {
  clear
  line
  echo " Scholars Republic Desktop WSL Worker"
  line
  echo " Directory : $WORKER_DIR"
  echo " Log file  : $LOG_FILE"
  echo " Env file  : $ENV_FILE"
  echo
  if is_running; then
    echo " Status    : RUNNING"
    echo " PID       : $(get_pid | tr '\n' ' ')"
  else
    echo " Status    : STOPPED"
  fi
  line
}

start_worker() {
  if is_running; then
    echo "Worker is already running."
    return
  fi

  if [[ ! -f "$VENV_PY" ]]; then
    echo "Python venv not found: $VENV_PY"
    return 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    echo ".env file not found: $ENV_FILE"
    return 1
  fi

  echo "Starting worker in background..."
  nohup "$VENV_PY" -u "$WORKER_PY" > "$LOG_FILE" 2>&1 &
  sleep 2

  if is_running; then
    echo "Worker started."
    tail -n 30 "$LOG_FILE"
  else
    echo "Worker did not start. Last log output:"
    tail -n 80 "$LOG_FILE" 2>/dev/null || true
  fi
}

stop_worker() {
  if ! is_running; then
    echo "Worker is already stopped."
    return
  fi

  echo "Stopping worker..."
  pkill -f "$PID_PATTERN" || true
  sleep 2

  if is_running; then
    echo "Worker still running. Force stopping..."
    pkill -9 -f "$PID_PATTERN" || true
    sleep 1
  fi

  echo "Worker stopped."
}

restart_worker() {
  stop_worker
  start_worker
}

status_worker() {
  echo "Process:"
  ps aux | grep "$WORKER_PY" | grep -v grep || echo "No worker process found."

  echo
  echo "Current .env worker settings:"
  grep -E '^(SCHOLARS_API_BASE_URL|DESKTOP_WORKER_ID|DESKTOP_WORKER_POLL_SECONDS|BROWSER_HEADLESS|DEEPSEEK_URL|DEEPSEEK_NEW_CHAT_EVERY_JOBS|DEEPSEEK_LOCAL_STATE_FILE)=' "$ENV_FILE" 2>/dev/null || true

  echo
  echo "Latest log:"
  tail -n 80 "$LOG_FILE" 2>/dev/null || echo "No log file yet."
}

follow_logs() {
  echo "Following logs. Press Ctrl+C to exit log view."
  touch "$LOG_FILE"
  tail -f "$LOG_FILE"
}

test_worker_token() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  if [[ -z "${DESKTOP_WORKER_TOKEN:-}" ]]; then
    echo "DESKTOP_WORKER_TOKEN is missing in .env"
    return 1
  fi

  API_BASE="${SCHOLARS_API_BASE_URL:-https://scholarsrepublic.org/api}"
  API_BASE="${API_BASE%/}"

  echo "Testing worker API health..."
  curl -sS "$API_BASE/internal/desktop-worker/health/" \
    -H "X-Desktop-Worker-Token: $DESKTOP_WORKER_TOKEN"
  echo
}

set_env_value() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

set_headless_true() {
  set_env_value "BROWSER_HEADLESS" "True"
  echo "Set BROWSER_HEADLESS=True"
}

set_headless_false() {
  set_env_value "BROWSER_HEADLESS" "False"
  echo "Set BROWSER_HEADLESS=False"
}

set_chat_size() {
  read -rp "Enter jobs per DeepSeek chat, e.g. 20: " size
  if [[ ! "$size" =~ ^[0-9]+$ ]]; then
    echo "Invalid number."
    return 1
  fi
  set_env_value "DEEPSEEK_NEW_CHAT_EVERY_JOBS" "$size"
  echo "Set DEEPSEEK_NEW_CHAT_EVERY_JOBS=$size"
}

reset_chat_counter() {
  state_file="$(grep '^DEEPSEEK_LOCAL_STATE_FILE=' "$ENV_FILE" | cut -d= -f2-)"
  state_file="${state_file:-/root/.scholarsrepublic-deepseek-state.txt}"

  rm -f "$state_file"
  echo "Removed DeepSeek local state counter: $state_file"
}

deepseek_login_repair() {
  echo "This will stop the background worker and open DeepSeek visibly."
  echo "Use this when DeepSeek logs out, needs CAPTCHA, or needs manual verification."
  echo
  read -rp "Continue? [y/N]: " answer
  case "$answer" in
    y|Y|yes|YES) ;;
    *) echo "Canceled."; return ;;
  esac

  stop_worker

  "$VENV_PY" <<'PY'
import os
from pathlib import Path
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

env_path = Path("/root/scholarsrepublic/workers/desktop_worker/.env")
load_dotenv(env_path, override=True)

profile_dir = os.getenv("PLAYWRIGHT_PROFILE_DIR", "/root/.scholarsrepublic-playwright-profile")
deepseek_url = os.getenv("DEEPSEEK_URL", "https://chat.deepseek.com")

print("Opening DeepSeek in visible Chromium...")
print("Profile:", profile_dir)
print("URL:", deepseek_url)
print()
print("Log in manually in the browser. Complete any normal verification/CAPTCHA yourself.")
print("After the chat page is ready, return here and press Enter.")

with sync_playwright() as playwright:
    context = playwright.chromium.launch_persistent_context(
        profile_dir,
        headless=False,
    )
    page = context.new_page()
    page.goto(deepseek_url, wait_until="domcontentloaded")
    input("Press Enter here after DeepSeek is logged in and the chat page is visible...")
    context.close()

print("DeepSeek login repair finished.")
PY

  echo
  read -rp "Restart worker in hidden/headless mode now? [Y/n]: " restart_answer
  case "$restart_answer" in
    n|N|no|NO) echo "Worker left stopped."; return ;;
    *)
      set_headless_true
      start_worker
      ;;
  esac
}

update_code() {
  echo "Stopping worker before git pull..."
  stop_worker

  cd "$REPO_DIR" || exit 1
  git pull origin main
  git log --oneline -5

  cd "$WORKER_DIR" || exit 1

  echo
  read -rp "Restart worker now? [Y/n]: " answer
  case "$answer" in
    n|N|no|NO) echo "Worker left stopped."; return ;;
    *) start_worker ;;
  esac
}

show_quick_commands() {
  cat <<'EOF'

Useful production-server commands:

Queue DeepSeek job:
  cd /home/scholarsrepublic/scholarsrepublic/backend
  source venv/bin/activate
  python manage.py enqueue_deepseek_query "Your prompt here."

Check latest job:
  cd /home/scholarsrepublic/scholarsrepublic/backend
  source venv/bin/activate
  python manage.py shell <<'PY'
from apps.desktop_automation.models import DesktopAutomationJob
import json
job = DesktopAutomationJob.objects.order_by("-id").first()
print("id:", job.id)
print("status:", job.status)
print("claimed_by:", job.claimed_by)
print("error:", job.error_message)
print(json.dumps(job.result_payload, indent=2, ensure_ascii=False))
PY

EOF
}

while true; do
  show_header
  cat <<'MENU'
Choose an option:

  1) Start worker in background
  2) Stop worker
  3) Restart worker
  4) Status
  5) Follow logs
  6) Test worker API token

  7) DeepSeek login repair / visible browser
  8) Set hidden/headless browser ON
  9) Set visible browser OFF-headless mode
 10) Set DeepSeek jobs per chat
 11) Reset DeepSeek chat counter

 12) Git pull latest code and restart
 13) Show production-server queue/check commands

  0) Exit

MENU

  read -rp "Enter choice: " choice

  echo
  case "$choice" in
    1) start_worker; pause ;;
    2) stop_worker; pause ;;
    3) restart_worker; pause ;;
    4) status_worker; pause ;;
    5) follow_logs ;;
    6) test_worker_token; pause ;;
    7) deepseek_login_repair; pause ;;
    8) set_headless_true; pause ;;
    9) set_headless_false; pause ;;
    10) set_chat_size; pause ;;
    11) reset_chat_counter; pause ;;
    12) update_code; pause ;;
    13) show_quick_commands; pause ;;
    0) exit 0 ;;
    *) echo "Invalid choice."; pause ;;
  esac
done
