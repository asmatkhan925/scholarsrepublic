import os
import time
import traceback
from typing import Any

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright


load_dotenv(override=True)

API_BASE_URL = os.getenv("SCHOLARS_API_BASE_URL", "https://scholarsrepublic.org/api").rstrip("/")
WORKER_TOKEN = os.getenv("DESKTOP_WORKER_TOKEN", "")
WORKER_ID = os.getenv("DESKTOP_WORKER_ID", "desktop-wsl-1")
POLL_SECONDS = int(os.getenv("DESKTOP_WORKER_POLL_SECONDS", "5"))
PLAYWRIGHT_PROFILE_DIR = os.getenv(
    "PLAYWRIGHT_PROFILE_DIR",
    os.path.expanduser("~/.scholarsrepublic-playwright-profile"),
)


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

    target_url = payload.get("target_url", "")
    query = payload.get("query", "")
    input_selector = payload.get("input_selector", "")
    submit_selector = payload.get("submit_selector", "")
    response_selector = payload.get("response_selector", "")
    wait_after_submit_seconds = int(payload.get("wait_after_submit_seconds", 5))
    timeout_ms = int(payload.get("timeout_ms", 120000))

    if not target_url:
        raise ValueError("Missing input_payload.target_url")
    if not query:
        raise ValueError("Missing input_payload.query")
    if not input_selector:
        raise ValueError("Missing input_payload.input_selector")
    if not submit_selector:
        raise ValueError("Missing input_payload.submit_selector")
    if not response_selector:
        raise ValueError("Missing input_payload.response_selector")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            PLAYWRIGHT_PROFILE_DIR,
            headless=False,
        )
        page = browser.new_page()
        page.set_default_timeout(timeout_ms)

        page.goto(target_url, wait_until="domcontentloaded")
        page.wait_for_selector(input_selector, state="visible")
        page.fill(input_selector, query)
        page.click(submit_selector)

        page.wait_for_timeout(wait_after_submit_seconds * 1000)
        page.wait_for_selector(response_selector, state="visible")

        response_text = page.locator(response_selector).last.inner_text(timeout=timeout_ms)

        browser.close()

        return {
            "text": response_text.strip(),
            "query": query,
            "target_url": target_url,
            "source": "desktop-worker-playwright",
        }


def run_job(job: dict[str, Any]) -> dict[str, Any]:
    kind = job.get("kind")

    if kind == "echo":
        return run_echo_job(job)

    if kind == "browser_query":
        return run_browser_query_job(job)

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
                    fail_job(job["id"], error_message, retry=True)
            except Exception:
                print("Could not report job failure:")
                print(traceback.format_exc())

            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
