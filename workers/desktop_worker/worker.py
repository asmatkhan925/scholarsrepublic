import os
import time
import traceback
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright


load_dotenv(override=True)

API_BASE_URL = os.getenv("SCHOLARS_API_BASE_URL", "https://scholarsrepublic.org/api").rstrip("/")
WORKER_TOKEN = os.getenv("DESKTOP_WORKER_TOKEN", "")
WORKER_ID = os.getenv("DESKTOP_WORKER_ID", "desktop-wsl-1")
POLL_SECONDS = int(os.getenv("DESKTOP_WORKER_POLL_SECONDS", "5"))
HEARTBEAT_SECONDS = int(os.getenv("DESKTOP_WORKER_HEARTBEAT_SECONDS", "30"))
LAST_HEARTBEAT_AT = 0.0
BROWSER_HEADLESS = os.getenv("BROWSER_HEADLESS", "False").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

PLAYWRIGHT_PROFILE_DIR = os.getenv(
    "PLAYWRIGHT_PROFILE_DIR",
    os.path.expanduser("~/.scholarsrepublic-playwright-profile"),
)

BROWSER_TARGET_URL = os.getenv("BROWSER_TARGET_URL", "")
BROWSER_INPUT_SELECTOR = os.getenv("BROWSER_INPUT_SELECTOR", "")
BROWSER_SUBMIT_SELECTOR = os.getenv("BROWSER_SUBMIT_SELECTOR", "")
BROWSER_RESPONSE_SELECTOR = os.getenv("BROWSER_RESPONSE_SELECTOR", "")
BROWSER_WAIT_AFTER_SUBMIT_SECONDS = int(
    os.getenv("BROWSER_WAIT_AFTER_SUBMIT_SECONDS", "10")
)
BROWSER_TIMEOUT_MS = int(os.getenv("BROWSER_TIMEOUT_MS", "120000"))

DEEPSEEK_URL = os.getenv("DEEPSEEK_URL", "https://chat.deepseek.com")
DEEPSEEK_NEW_CHAT_URL = os.getenv("DEEPSEEK_NEW_CHAT_URL", DEEPSEEK_URL)
DEEPSEEK_LOGIN_WAIT_SECONDS = int(os.getenv("DEEPSEEK_LOGIN_WAIT_SECONDS", "600"))
DEEPSEEK_RESPONSE_TIMEOUT_MS = int(os.getenv("DEEPSEEK_RESPONSE_TIMEOUT_MS", "180000"))
DEEPSEEK_STABLE_SECONDS = int(os.getenv("DEEPSEEK_STABLE_SECONDS", "6"))
DEEPSEEK_NEW_CHAT_EVERY_JOBS = int(os.getenv("DEEPSEEK_NEW_CHAT_EVERY_JOBS", "5"))
DEEPSEEK_LOCAL_STATE_FILE = os.getenv(
    "DEEPSEEK_LOCAL_STATE_FILE",
    os.path.expanduser("~/.scholarsrepublic-deepseek-state.txt"),
)

PLAYWRIGHT_RUNTIME = None
BROWSER_CONTEXT = None
DEEPSEEK_PAGE = None


def headers() -> dict[str, str]:
    return {
        "X-Desktop-Worker-Token": WORKER_TOKEN,
        "Content-Type": "application/json",
    }


def claim_job() -> dict[str, Any] | None:
    response = requests.post(
        f"{API_BASE_URL}/internal/desktop-worker/claim/",
        headers=headers(),
        json={"worker_id": WORKER_ID},
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("job")


def complete_job(job_id: int, result_payload: dict[str, Any]) -> None:
    response = requests.post(
        f"{API_BASE_URL}/internal/desktop-worker/complete/",
        headers=headers(),
        json={"job_id": job_id, "result_payload": result_payload},
        timeout=30,
    )
    response.raise_for_status()


def public_message_for_error(error_message: str) -> str:
    lowered = error_message.lower()

    if "login" in lowered or "sign_in" in lowered or "password" in lowered:
        return (
            "Our AI system needs to be reconnected. Please try again later."
        )

    if "captcha" in lowered or "verification" in lowered:
        return (
            "Our AI system is temporarily paused for verification. Please try again later."
        )

    if "timeout" in lowered or "timed out" in lowered:
        return (
            "Our AI system is taking too long to respond. Please try again later."
        )

    if "could not find deepseek chat input" in lowered:
        return (
            "Our AI system interface changed or is temporarily unavailable. Please try again later."
        )

    return "Our AI system is temporarily unavailable. Please try again later."


def fail_job(
    job_id: int,
    error_message: str,
    retry: bool = False,
    public_message: str | None = None,
) -> None:
    response = requests.post(
        f"{API_BASE_URL}/internal/desktop-worker/fail/",
        headers=headers(),
        json={
            "job_id": job_id,
            "error_message": error_message,
            "public_message": public_message or public_message_for_error(error_message),
            "retry": retry,
        },
        timeout=30,
    )
    response.raise_for_status()

def send_heartbeat(
    status: str = "idle",
    current_job_id: int | None = None,
    error_message: str = "",
    force: bool = False,
) -> None:
    global LAST_HEARTBEAT_AT

    now = time.time()
    if not force and now - LAST_HEARTBEAT_AT < HEARTBEAT_SECONDS:
        return

    response = requests.post(
        f"{API_BASE_URL}/internal/desktop-worker/heartbeat/",
        headers=headers(),
        json={
            "worker_id": WORKER_ID,
            "status": status,
            "current_job_id": current_job_id,
            "error_message": error_message[:2000],
            "metadata": {
                "headless": BROWSER_HEADLESS,
                "poll_seconds": POLL_SECONDS,
                "heartbeat_seconds": HEARTBEAT_SECONDS,
                "deepseek_new_chat_every_jobs": DEEPSEEK_NEW_CHAT_EVERY_JOBS,
            },
        },
        timeout=30,
    )
    try:
        response.raise_for_status()
    except Exception as exc:
        print(f"Heartbeat failed but worker will continue: {exc}")
        LAST_HEARTBEAT_AT = now
        return

    LAST_HEARTBEAT_AT = now


def get_browser_context():
    global PLAYWRIGHT_RUNTIME
    global BROWSER_CONTEXT

    if BROWSER_CONTEXT is not None:
        return BROWSER_CONTEXT

    PLAYWRIGHT_RUNTIME = sync_playwright().start()
    BROWSER_CONTEXT = PLAYWRIGHT_RUNTIME.chromium.launch_persistent_context(
        PLAYWRIGHT_PROFILE_DIR,
        headless=BROWSER_HEADLESS,
    )
    return BROWSER_CONTEXT


def close_browser_context() -> None:
    global PLAYWRIGHT_RUNTIME
    global BROWSER_CONTEXT
    global DEEPSEEK_PAGE

    DEEPSEEK_PAGE = None

    if BROWSER_CONTEXT is not None:
        try:
            BROWSER_CONTEXT.close()
        except Exception:
            pass
        BROWSER_CONTEXT = None

    if PLAYWRIGHT_RUNTIME is not None:
        try:
            PLAYWRIGHT_RUNTIME.stop()
        except Exception:
            pass
        PLAYWRIGHT_RUNTIME = None


def get_deepseek_page():
    global DEEPSEEK_PAGE

    context = get_browser_context()

    if DEEPSEEK_PAGE is not None and not DEEPSEEK_PAGE.is_closed():
        return DEEPSEEK_PAGE

    for page in context.pages:
        try:
            if "chat.deepseek.com" in page.url:
                DEEPSEEK_PAGE = page
                return DEEPSEEK_PAGE
        except Exception:
            continue

    DEEPSEEK_PAGE = context.new_page()
    return DEEPSEEK_PAGE


def run_echo_job(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("input_payload", {})
    return {
        "text": payload.get("query", ""),
        "source": "desktop-worker-echo",
    }


def run_browser_query_job(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("input_payload", {})
    query = payload.get("query", "")

    if not query:
        raise ValueError("Missing input_payload.query")

    missing_config = [
        name
        for name, value in {
            "BROWSER_TARGET_URL": BROWSER_TARGET_URL,
            "BROWSER_INPUT_SELECTOR": BROWSER_INPUT_SELECTOR,
            "BROWSER_SUBMIT_SELECTOR": BROWSER_SUBMIT_SELECTOR,
            "BROWSER_RESPONSE_SELECTOR": BROWSER_RESPONSE_SELECTOR,
        }.items()
        if not value
    ]

    if missing_config:
        raise ValueError(
            "Desktop worker browser config is missing: "
            + ", ".join(missing_config)
        )

    context = get_browser_context()
    page = context.new_page()
    page.set_default_timeout(BROWSER_TIMEOUT_MS)

    try:
        page.goto(BROWSER_TARGET_URL, wait_until="domcontentloaded")
        page.wait_for_selector(BROWSER_INPUT_SELECTOR, state="visible")
        page.fill(BROWSER_INPUT_SELECTOR, query)
        page.click(BROWSER_SUBMIT_SELECTOR)

        page.wait_for_timeout(BROWSER_WAIT_AFTER_SUBMIT_SECONDS * 1000)
        page.wait_for_selector(BROWSER_RESPONSE_SELECTOR, state="visible")

        response_text = page.locator(BROWSER_RESPONSE_SELECTOR).last.inner_text(
            timeout=BROWSER_TIMEOUT_MS
        )

        return {
            "text": response_text.strip(),
            "query": query,
            "target_url": BROWSER_TARGET_URL,
            "source": "desktop-worker-playwright",
        }
    finally:
        try:
            page.close()
        except Exception:
            pass


def read_deepseek_local_job_count() -> int:
    state_path = Path(DEEPSEEK_LOCAL_STATE_FILE)
    if not state_path.exists():
        return 0

    try:
        return int(state_path.read_text().strip() or "0")
    except ValueError:
        return 0


def write_deepseek_local_job_count(count: int) -> None:
    state_path = Path(DEEPSEEK_LOCAL_STATE_FILE)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(str(count))


def should_force_deepseek_new_chat() -> bool:
    if DEEPSEEK_NEW_CHAT_EVERY_JOBS <= 0:
        return True

    return read_deepseek_local_job_count() >= DEEPSEEK_NEW_CHAT_EVERY_JOBS


def increment_deepseek_local_job_count() -> int:
    count = read_deepseek_local_job_count() + 1
    write_deepseek_local_job_count(count)
    return count


def reset_deepseek_local_job_count() -> None:
    write_deepseek_local_job_count(0)


def is_deepseek_login_page(page) -> bool:
    current_url = page.url.lower()
    if "sign_in" in current_url or "login" in current_url:
        return True

    try:
        if page.locator('input[type="password"]').count() > 0:
            return True
    except Exception:
        return False

    return False


def wait_for_deepseek_login_if_needed(page) -> None:
    if not is_deepseek_login_page(page):
        return

    print("DeepSeek login is required.")
    print("Please log in manually in the opened browser window.")
    print(f"Waiting up to {DEEPSEEK_LOGIN_WAIT_SECONDS} seconds...")

    page.wait_for_function(
        """() => {
            const href = window.location.href.toLowerCase();
            const hasPassword = Boolean(document.querySelector('input[type="password"]'));
            return !href.includes('sign_in') && !href.includes('login') && !hasPassword;
        }""",
        timeout=DEEPSEEK_LOGIN_WAIT_SECONDS * 1000,
    )

    page.wait_for_timeout(3000)
    print("DeepSeek login detected. Continuing...")


def get_deepseek_input(page):
    candidates = [
        "textarea",
        '[contenteditable="true"]',
        'div[role="textbox"]',
        'input[type="text"]',
        '[placeholder*="Message"]',
        '[placeholder*="Ask"]',
        '[placeholder*="Send"]',
        '[placeholder*="输入"]',
    ]

    last_error = None
    for selector in candidates:
        try:
            locator = page.locator(selector).last
            locator.wait_for(state="visible", timeout=8000)
            return locator
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Could not find DeepSeek chat input. Last error: {last_error}")


def start_deepseek_new_chat_by_navigation(page) -> bool:
    try:
        print(f"Starting fresh DeepSeek chat by navigating to {DEEPSEEK_NEW_CHAT_URL}")
        page.goto(DEEPSEEK_NEW_CHAT_URL, wait_until="domcontentloaded")
        wait_for_deepseek_login_if_needed(page)
        get_deepseek_input(page)
        reset_deepseek_local_job_count()
        print("Fresh DeepSeek chat page is ready.")
        return True
    except Exception as exc:
        print(f"Could not start fresh DeepSeek chat by navigation: {exc}")
        return False


def ensure_deepseek_ready(page) -> None:
    if "chat.deepseek.com" not in page.url:
        page.goto(DEEPSEEK_URL, wait_until="domcontentloaded")

    wait_for_deepseek_login_if_needed(page)
    get_deepseek_input(page)


def fill_deepseek_input(page, input_box, query: str) -> None:
    tag_name = input_box.evaluate("el => el.tagName.toLowerCase()")
    is_contenteditable = input_box.evaluate(
        "el => el.getAttribute('contenteditable') === 'true'"
    )

    if tag_name in {"textarea", "input"}:
        input_box.fill(query)
        return

    if is_contenteditable:
        input_box.click()
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")
        page.keyboard.insert_text(query)
        return

    input_box.click()
    page.keyboard.insert_text(query)


def submit_deepseek_query(page) -> None:
    send_selectors = [
        'button:has-text("Send")',
        'button[aria-label*="Send"]',
        'button[aria-label*="send"]',
        'button[type="submit"]',
    ]

    for selector in send_selectors:
        try:
            button = page.locator(selector).last
            if button.is_visible(timeout=1000):
                button.click(timeout=3000)
                return
        except Exception:
            continue

    page.keyboard.press("Enter")


def clean_deepseek_candidate(text: str, query: str) -> str:
    cleaned_lines = []
    blocked_exact = {
        "deepseek",
        "new chat",
        "send",
        "search",
        "deepthink",
        "copy",
        "regenerate",
        "stop",
    }

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if line == query.strip():
            continue

        if line.lower() in blocked_exact:
            continue

        if "chat.deepseek.com" in line.lower():
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip()


def extract_deepseek_response(page, query: str, before_text: str) -> str:
    candidates: list[str] = []

    try:
        body_text = page.locator("body").inner_text(timeout=10000)
    except Exception:
        body_text = ""

    # Most reliable path: extract only text added after this job started.
    if body_text:
        if before_text and before_text in body_text:
            candidates.append(body_text.rsplit(before_text, 1)[-1])

        # Use rsplit, not split, because the same prompt text may appear earlier
        # in old chat history.
        if query and query in body_text:
            candidates.append(body_text.rsplit(query, 1)[-1])

    # Fallback: inspect likely response blocks, but prefer the latest visible ones.
    response_selectors = [
        '[class*="ds-markdown"]',
        '[class*="markdown"]',
        '[class*="answer"]',
        '[class*="message"]',
    ]

    for selector in response_selectors:
        try:
            texts = page.locator(selector).all_inner_texts()
            for text in reversed(texts[-8:]):
                candidates.append(text)
        except Exception:
            continue

    cleaned_candidates = []
    for candidate in candidates:
        cleaned = clean_deepseek_candidate(candidate, query)
        if not cleaned:
            continue

        # Reject obvious echo/prompt-only outputs.
        if cleaned.strip() == query.strip():
            continue

        if len(cleaned) < 12:
            continue

        cleaned_candidates.append(cleaned)

    if not cleaned_candidates:
        return ""

    # Prefer the first good delta candidate. It is usually the newest response.
    return cleaned_candidates[0]


def wait_for_deepseek_response(page, query: str, before_text: str) -> str:
    timeout_seconds = max(30, DEEPSEEK_RESPONSE_TIMEOUT_MS // 1000)
    deadline = time.time() + timeout_seconds

    last_text = ""
    stable_since = None

    while time.time() < deadline:
        candidate = extract_deepseek_response(page, query, before_text)

        if candidate and len(candidate) >= 20:
            if candidate == last_text:
                if stable_since is None:
                    stable_since = time.time()

                if time.time() - stable_since >= DEEPSEEK_STABLE_SECONDS:
                    return candidate
            else:
                last_text = candidate
                stable_since = time.time()

        time.sleep(2)

    raise TimeoutError("Timed out waiting for stable DeepSeek response.")


def run_deepseek_query_job(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("input_payload", {})
    query = payload.get("query", "")

    if not query:
        raise ValueError("Missing input_payload.query")

    page = get_deepseek_page()
    page.set_default_timeout(DEEPSEEK_RESPONSE_TIMEOUT_MS)

    forced_new_chat = False
    new_chat_started = False

    if should_force_deepseek_new_chat():
        forced_new_chat = True
        new_chat_started = start_deepseek_new_chat_by_navigation(page)
    else:
        ensure_deepseek_ready(page)

    before_text = ""
    try:
        before_text = page.locator("body").inner_text(timeout=10000)
    except Exception:
        pass

    input_box = get_deepseek_input(page)
    fill_deepseek_input(page, input_box, query)
    submit_deepseek_query(page)

    response_text = wait_for_deepseek_response(page, query, before_text)
    local_chat_job_count = increment_deepseek_local_job_count()

    return {
        "text": response_text,
        "query": query,
        "target_url": DEEPSEEK_URL,
        "source": "desktop-worker-deepseek",
        "forced_new_chat": forced_new_chat,
        "new_chat_started": new_chat_started,
        "local_chat_job_count": local_chat_job_count,
        "warning": (
            "Could not start a fresh DeepSeek chat by navigation; continued in current chat."
            if forced_new_chat and not new_chat_started
            else ""
        ),
    }


def run_job(job: dict[str, Any]) -> dict[str, Any]:
    kind = job.get("kind")

    if kind == "echo":
        return run_echo_job(job)

    if kind == "browser_query":
        return run_browser_query_job(job)

    if kind == "deepseek_query":
        return run_deepseek_query_job(job)

    raise ValueError(f"Unsupported job kind: {kind}")


def main() -> None:
    if not WORKER_TOKEN:
        raise SystemExit("DESKTOP_WORKER_TOKEN is missing.")

    print(f"Desktop worker started as {WORKER_ID}")
    print(f"API: {API_BASE_URL}")
    print(f"Playwright profile: {PLAYWRIGHT_PROFILE_DIR}")
    print("Browser context will stay open while this worker is running.")
    send_heartbeat("starting", force=True)

    job = None

    try:
        while True:
            try:
                send_heartbeat("idle")

                job = claim_job()
                if job is None:
                    time.sleep(POLL_SECONDS)
                    continue

                job_id = job["id"]
                print(f"Claimed job #{job_id}: {job.get('kind')}")
                send_heartbeat("running", current_job_id=job_id, force=True)

                result = run_job(job)
                complete_job(job_id, result)
                print(f"Completed job #{job_id}")
                send_heartbeat("idle", force=True)

                job = None

            except KeyboardInterrupt:
                print("Worker stopped.")
                break
            except Exception:
                error_message = traceback.format_exc()
                print(error_message)

                try:
                    if job:
                        fail_job(job["id"], error_message, retry=False)
                        send_heartbeat(
                            "error",
                            current_job_id=job["id"],
                            error_message=error_message,
                            force=True,
                        )
                    else:
                        send_heartbeat("error", error_message=error_message, force=True)
                except Exception:
                    print("Could not report job failure:")
                    print(traceback.format_exc())

                job = None
                time.sleep(POLL_SECONDS)
    finally:
        close_browser_context()


if __name__ == "__main__":
    main()
