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

git_commit_summary() {
  git -C "$REPO_DIR" log -1 --format='%h %s' 2>/dev/null || echo "unavailable"
}

git_origin_status() {
  local counts ahead behind fetch_note

  fetch_note=""
  if ! timeout 8 git -C "$REPO_DIR" fetch --quiet origin main >/dev/null 2>&1; then
    fetch_note=" (fetch failed; local ref)"
  fi

  if ! git -C "$REPO_DIR" rev-parse --verify origin/main >/dev/null 2>&1; then
    echo "origin/main unavailable"
    return
  fi

  counts="$(git -C "$REPO_DIR" rev-list --left-right --count HEAD...origin/main 2>/dev/null)" || {
    echo "unable to compare with origin/main"
    return
  }

  read -r ahead behind <<< "$counts"

  if [[ "${behind:-0}" -gt 0 && "${ahead:-0}" -gt 0 ]]; then
    echo "behind $behind, ahead $ahead$fetch_note"
  elif [[ "${behind:-0}" -gt 0 ]]; then
    echo "behind by $behind commit(s)$fetch_note"
  elif [[ "${ahead:-0}" -gt 0 ]]; then
    echo "ahead by $ahead commit(s)$fetch_note"
  else
    echo "up to date$fetch_note"
  fi
}

repo_dirty_status() {
  if [[ -n "$(git -C "$REPO_DIR" status --porcelain 2>/dev/null)" ]]; then
    echo "dirty"
  else
    echo "clean"
  fi
}

show_worker_process() {
  if is_running; then
    echo "Status    : RUNNING"
    echo "PID       : $(get_pid | tr '\n' ' ')"
    ps -o pid,ppid,etime,cmd -p "$(get_pid | paste -sd, -)" 2>/dev/null || true
  else
    echo "Status    : STOPPED"
  fi
}

show_header() {
  clear
  line
  echo " Scholars Republic Desktop WSL Worker"
  line
  echo " Directory : $WORKER_DIR"
  echo " Log file  : $LOG_FILE"
  echo " Env file  : $ENV_FILE"
  echo " Commit    : $(git_commit_summary)"
  echo " Origin    : $(git_origin_status)"
  echo " Worktree  : $(repo_dirty_status)"
  echo
  show_worker_process
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
  echo "Git:"
  echo "  Commit   : $(git_commit_summary)"
  echo "  Origin   : $(git_origin_status)"
  echo "  Worktree : $(repo_dirty_status)"

  echo
  echo "Worker process:"
  show_worker_process

  echo
  echo "Current .env worker settings:"
  grep -E '^(SCHOLARS_API_BASE_URL|DESKTOP_WORKER_ID|DESKTOP_WORKER_POLL_SECONDS|BROWSER_HEADLESS|DEEPSEEK_URL|DEEPSEEK_NEW_CHAT_EVERY_JOBS|DEEPSEEK_LOCAL_STATE_FILE)=' "$ENV_FILE" 2>/dev/null || true

  echo
  echo "Latest 30 log lines:"
  tail -n 30 "$LOG_FILE" 2>/dev/null || echo "No log file yet."
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

pull_rebase_code() {
  local origin_status

  cd "$REPO_DIR" || exit 1

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Repo has uncommitted changes. Commit or stash them before pulling."
    git status --short
    cd "$WORKER_DIR" || exit 1
    return 1
  fi

  echo "Fetching origin/main..."
  git fetch origin main || {
    cd "$WORKER_DIR" || exit 1
    return 1
  }

  echo "Current commit: $(git_commit_summary)"
  origin_status="$(git_origin_status)"
  echo "Origin status : $origin_status"

  if [[ "$origin_status" == up\ to\ date* ]]; then
    echo "Already up to date."
    cd "$WORKER_DIR" || exit 1
    return
  fi

  echo
  read -rp "Stop worker and run git pull --rebase origin main? [y/N]: " pull_answer
  case "$pull_answer" in
    y|Y|yes|YES) ;;
    *) echo "Canceled."; cd "$WORKER_DIR" || exit 1; return ;;
  esac

  echo "Stopping worker before git pull --rebase..."
  stop_worker

  git pull --rebase origin main || {
    echo "Pull/rebase failed. Resolve git state before restarting the worker."
    cd "$WORKER_DIR" || exit 1
    return 1
  }

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

 12) Git pull --rebase origin main safely
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
    12) pull_rebase_code; pause ;;
    13) show_quick_commands; pause ;;
    0) exit 0 ;;
    *) echo "Invalid choice."; pause ;;
  esac
done
