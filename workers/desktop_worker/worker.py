import os
import time
import traceback
from typing import Any

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright


load_dotenv()

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
    query = payload.get("query", "")

    if not query:
        raise ValueError("Missing input_payload.query")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            PLAYWRIGHT_PROFILE_DIR,
            headless=False,
        )
        page = browser.new_page()
        page.goto("about:blank")

        result = {
            "text": "Browser worker is connected. Automation target is not configured yet.",
            "query": query,
            "source": "desktop-worker-playwright-placeholder",
        }

        browser.close()
        return result


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
