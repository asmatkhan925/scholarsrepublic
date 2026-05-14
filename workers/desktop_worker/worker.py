import os
import time
import traceback
from typing import Any

import requests
from dotenv import load_dotenv
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError, sync_playwright


load_dotenv(override=True)

API_BASE_URL = os.getenv("SCHOLARS_API_BASE_URL", "https://scholarsrepublic.org/api").rstrip("/")
WORKER_TOKEN = os.getenv("DESKTOP_WORKER_TOKEN", "")
WORKER_ID = os.getenv("DESKTOP_WORKER_ID", "desktop-wsl-1")
POLL_SECONDS = int(os.getenv("DESKTOP_WORKER_POLL_SECONDS", "5"))
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
DEEPSEEK_LOGIN_WAIT_SECONDS = int(os.getenv("DEEPSEEK_LOGIN_WAIT_SECONDS", "600"))
DEEPSEEK_RESPONSE_TIMEOUT_MS = int(os.getenv("DEEPSEEK_RESPONSE_TIMEOUT_MS", "180000"))
DEEPSEEK_STABLE_SECONDS = int(os.getenv("DEEPSEEK_STABLE_SECONDS", "6"))


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


def fail_job(job_id: int, error_message: str, retry: bool = True) -> None:
    response = requests.post(
        f"{API_BASE_URL}/internal/desktop-worker/fail/",
        headers=headers(),
        json={"job_id": job_id, "error_message": error_message, "retry": retry},
        timeout=30,
    )
    response.raise_for_status()


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

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            PLAYWRIGHT_PROFILE_DIR,
            headless=False,
        )
        page = browser.new_page()
        page.set_default_timeout(BROWSER_TIMEOUT_MS)

        page.goto(BROWSER_TARGET_URL, wait_until="domcontentloaded")
        page.wait_for_selector(BROWSER_INPUT_SELECTOR, state="visible")
        page.fill(BROWSER_INPUT_SELECTOR, query)
        page.click(BROWSER_SUBMIT_SELECTOR)

        page.wait_for_timeout(BROWSER_WAIT_AFTER_SUBMIT_SECONDS * 1000)
        page.wait_for_selector(BROWSER_RESPONSE_SELECTOR, state="visible")

        response_text = page.locator(BROWSER_RESPONSE_SELECTOR).last.inner_text(
            timeout=BROWSER_TIMEOUT_MS
        )

        browser.close()

        return {
            "text": response_text.strip(),
            "query": query,
            "target_url": BROWSER_TARGET_URL,
            "source": "desktop-worker-playwright",
        }



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

    deadline_ms = DEEPSEEK_LOGIN_WAIT_SECONDS * 1000

    page.wait_for_function(
        """() => {
            const href = window.location.href.toLowerCase();
            const hasPassword = Boolean(document.querySelector('input[type="password"]'));
            return !href.includes('sign_in') && !href.includes('login') && !hasPassword;
        }""",
        timeout=deadline_ms,
    )

    page.wait_for_timeout(3000)
    print("DeepSeek login detected. Continuing...")


def click_deepseek_new_chat_if_available(page) -> None:
    candidates = [
        'a[href="/"]',
        'button:has-text("New chat")',
        'button:has-text("New Chat")',
        'button:has-text("New conversation")',
        'button:has-text("新对话")',
        'button:has-text("开启新对话")',
        '[aria-label*="New"]',
        '[aria-label*="new"]',
    ]

    for selector in candidates:
        try:
            locator = page.locator(selector).first
            locator.click(timeout=2500)
            page.wait_for_timeout(1500)
            return
        except Exception:
            continue

    # DeepSeek usually opens a usable chat on the main URL, so failing to find
    # a new-chat button is not fatal.
    print("New chat button was not found. Continuing with current chat page.")


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
            locator.wait_for(state="visible", timeout=5000)
            return locator
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Could not find DeepSeek chat input. Last error: {last_error}")


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
    response_selectors = [
        '[class*="ds-markdown"]',
        '[class*="markdown"]',
        '[class*="answer"]',
        '[class*="message"]',
    ]

    candidates = []

    for selector in response_selectors:
        try:
            texts = page.locator(selector).all_inner_texts()
            for text in texts:
                cleaned = clean_deepseek_candidate(text, query)
                if cleaned and len(cleaned) >= 20:
                    candidates.append(cleaned)
        except Exception:
            continue

    if candidates:
        return max(candidates, key=len)

    try:
        body_text = page.locator("body").inner_text(timeout=10000)
    except Exception:
        return ""

    if query in body_text:
        possible = body_text.split(query, 1)[-1]
    elif before_text and body_text.startswith(before_text):
        possible = body_text[len(before_text):]
    else:
        possible = body_text

    return clean_deepseek_candidate(possible, query)


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

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            PLAYWRIGHT_PROFILE_DIR,
            headless=False,
        )

        page = browser.new_page()
        page.set_default_timeout(DEEPSEEK_RESPONSE_TIMEOUT_MS)

        try:
            page.goto(DEEPSEEK_URL, wait_until="domcontentloaded")
            wait_for_deepseek_login_if_needed(page)
            click_deepseek_new_chat_if_available(page)

            before_text = ""
            try:
                before_text = page.locator("body").inner_text(timeout=10000)
            except Exception:
                pass

            input_box = get_deepseek_input(page)
            fill_deepseek_input(page, input_box, query)
            submit_deepseek_query(page)

            response_text = wait_for_deepseek_response(page, query, before_text)

            return {
                "text": response_text,
                "query": query,
                "target_url": DEEPSEEK_URL,
                "source": "desktop-worker-deepseek",
            }
        finally:
            browser.close()


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

    job = None

    while True:
        try:
            job = claim_job()
            if job is None:
                time.sleep(POLL_SECONDS)
                continue

            job_id = job["id"]
            print(f"Claimed job #{job_id}: {job.get('kind')}")

            result = run_job(job)
            complete_job(job_id, result)
            print(f"Completed job #{job_id}")

        except KeyboardInterrupt:
            print("Worker stopped.")
            break
        except Exception:
            error_message = traceback.format_exc()
            print(error_message)

            try:
                if job:
                    fail_job(job["id"], error_message, retry=False)
            except Exception:
                print("Could not report job failure:")
                print(traceback.format_exc())

            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
