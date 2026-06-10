"""Public, cache-resistant API that serves a generated snapshot of the
AIR_review repository.

Design notes
------------
* Serves *only* from a pre-generated local snapshot directory
  (``settings.AIR_SNAPSHOT_DIR``). It never contacts GitHub at request time,
  so it keeps working even if raw.githubusercontent.com is stale or down.
* Plain Django views (not DRF) so we control every byte and header and can
  emit raw CSV / Markdown / BibTeX without content negotiation surprises.
* Aggressive no-store cache headers + permissive CORS on every response so an
  external assistant (e.g. ChatGPT) always reads the latest state.
* The allowlist in ``allowlist.py`` is the hard security boundary; path
  traversal is additionally blocked by resolved-path containment checks.
"""

from __future__ import annotations

import hmac
import json
import os
import subprocess
from hashlib import sha256
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .allowlist import ALLOWLIST, content_type_for


def _snapshot_dir() -> Path:
    return Path(settings.AIR_SNAPSHOT_DIR)


def _read_json(name: str):
    path = _snapshot_dir() / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _commit_and_time():
    """Best-effort read of commit + generated timestamp for X-AIR-* headers."""
    health = _read_json("health.json") or {}
    commit = health.get("commit")
    generated = health.get("generated_at_utc")
    if commit and generated:
        return commit, generated
    manifest = _read_json("manifest.json") or {}
    return (
        commit or manifest.get("commit", "unknown"),
        generated or manifest.get("generated_at_utc", "unknown"),
    )


def _apply_headers(response: HttpResponse) -> HttpResponse:
    commit, generated = _commit_and_time()
    # Aggressive no-cache so every client always sees the latest snapshot.
    response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    # Provenance / verification headers.
    response["X-AIR-Commit"] = str(commit)
    response["X-AIR-Generated-At"] = str(generated)
    response["X-AIR-Source"] = "scholarsrepublic-api"
    # Open CORS for read-only public data.
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def _json(payload, status: int = 200) -> HttpResponse:
    resp = JsonResponse(payload, status=status, json_dumps_params={"indent": 2})
    return _apply_headers(resp)


def _options() -> HttpResponse:
    resp = HttpResponse(status=204)
    return _apply_headers(resp)


def _missing_snapshot() -> HttpResponse:
    return _json(
        {
            "error": "snapshot_unavailable",
            "detail": "The snapshot bundle has not been uploaded to the server yet.",
        },
        status=503,
    )


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

PUBLIC_BASE = "https://scholarsrepublic.org"

# Files surfaced as clickable links on the landing page.
_INDEX_FILES = [
    "00_project_management/decision_log.md",
    "03_references/references.bib",
    "05_synthesis_matrices/seed_paper_map.csv",
    "05_synthesis_matrices/evidence_to_claim_matrix.csv",
    "05_synthesis_matrices/evaluation_robustness_matrix.csv",
    "05_synthesis_matrices/foundation_model_matrix.csv",
    "05_synthesis_matrices/dataset_benchmark_matrix.csv",
]


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def index(request):
    """Plain-HTML landing page with clickable links to every endpoint.

    Exists so external assistants (e.g. ChatGPT's browser) can reach the JSON/CSV
    endpoints by clicking links on a page, instead of being blocked from opening
    URLs that didn't appear in the chat. No JavaScript.
    """
    if request.method == "OPTIONS":
        return _options()

    commit, generated = _commit_and_time()

    def li(href, label):
        return f'  <li><a href="{href}">{label}</a></li>'

    endpoint_links = [
        li(f"{PUBLIC_BASE}/api/air/latest", "/api/air/latest — current state + verification targets"),
        li(f"{PUBLIC_BASE}/api/air/manifest", "/api/air/manifest — per-file hashes, counts, validations"),
        li(f"{PUBLIC_BASE}/api/air/health", "/api/air/health — status + commit"),
    ]
    file_links = [
        li(f"{PUBLIC_BASE}/api/air/file?path={p}", f"/api/air/file?path={p}")
        for p in _INDEX_FILES
    ]

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="index,follow">
<title>AIR_review Public API</title>
</head>
<body>
<h1>AIR_review Public Snapshot API</h1>
<p>Cache-resistant, read-only access to the latest state of the
<code>asmatkhan925/AIR_review</code> repository. Use these instead of GitHub raw URLs.</p>
<p><b>Current commit:</b> <code>{commit}</code><br>
<b>Generated (UTC):</b> <code>{generated}</code></p>
<h2>Endpoints</h2>
<ul>
{chr(10).join(endpoint_links)}
</ul>
<h2>Key files</h2>
<ul>
{chr(10).join(file_links)}
</ul>
<p>Full file list and integrity metadata are in
<a href="{PUBLIC_BASE}/api/air/manifest">/api/air/manifest</a>.</p>
</body>
</html>
"""
    resp = HttpResponse(html, content_type="text/html; charset=utf-8")
    return _apply_headers(resp)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def health(request):
    if request.method == "OPTIONS":
        return _options()
    data = _read_json("health.json")
    if data is None:
        commit, generated = _commit_and_time()
        data = {
            "status": "degraded",
            "service": "AIR_review public snapshot API",
            "commit": commit,
            "generated_at_utc": generated,
            "detail": "health.json not found in snapshot directory",
        }
    return _json(data)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def latest(request):
    if request.method == "OPTIONS":
        return _options()
    data = _read_json("latest.json")
    if data is None:
        return _missing_snapshot()
    return _json(data)


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def manifest(request):
    if request.method == "OPTIONS":
        return _options()
    data = _read_json("manifest.json")
    if data is None:
        return _missing_snapshot()
    return _json(data)


def _is_safe_relpath(raw: str) -> bool:
    """Reject anything that isn't a clean, forward-slash relative path."""
    if not raw:
        return False
    if "\x00" in raw:                     # null byte
        return False
    if "\\" in raw:                       # backslashes
        return False
    if raw.startswith("/"):               # absolute
        return False
    if ".." in raw.split("/"):            # traversal segment
        return False
    if any(part.startswith(".") for part in raw.split("/")):  # hidden files/dirs
        return False
    return True


@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def file(request):
    if request.method == "OPTIONS":
        return _options()

    raw = request.GET.get("path", "")
    # Decode is already handled by Django's query parsing; reject obvious tricks.
    if not _is_safe_relpath(raw):
        return _json({"error": "invalid_path"}, status=400)

    # Hard allowlist check (exact match only).
    if raw not in ALLOWLIST:
        return _json({"error": "file_not_allowlisted"}, status=403)

    files_root = (_snapshot_dir() / "files").resolve()
    target = (files_root / raw).resolve()

    # Defense in depth: resolved path must stay inside the snapshot files root.
    if not (target == files_root or files_root in target.parents):
        return _json({"error": "invalid_path"}, status=400)

    if not target.is_file():
        return _json({"error": "file_not_found"}, status=404)

    try:
        data = target.read_bytes()
    except OSError:
        return _json({"error": "file_not_found"}, status=404)

    resp = HttpResponse(data, content_type=content_type_for(raw))
    return _apply_headers(resp)


# --------------------------------------------------------------------------- #
# GitHub push webhook -> trigger a sync (near-instant "on push" refresh)
# --------------------------------------------------------------------------- #

def _verify_github_signature(secret: str, body: bytes, header: str) -> bool:
    """Constant-time check of GitHub's X-Hub-Signature-256 header."""
    if not header or not header.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(secret.encode(), body, sha256).hexdigest()
    return hmac.compare_digest(expected, header)


def _trigger_sync():
    """Launch air_sync.sh detached. Returns (ok, detail)."""
    script = getattr(settings, "AIR_SYNC_SCRIPT", "")
    if not script or not os.path.isfile(script):
        return False, f"sync script not found: {script}"
    try:
        subprocess.Popen(
            ["/bin/bash", script],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,  # outlives this request
        )
        return True, "sync triggered"
    except OSError as exc:
        return False, f"failed to launch sync: {exc}"


@csrf_exempt
@require_http_methods(["POST", "OPTIONS"])
def refresh(request):
    if request.method == "OPTIONS":
        resp = _options()
        resp["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        return resp

    secret = getattr(settings, "AIR_WEBHOOK_SECRET", "")
    if not secret:
        return _json({"error": "webhook_disabled"}, status=503)

    body = request.body
    sig = request.headers.get("X-Hub-Signature-256", "")
    if not _verify_github_signature(secret, body, sig):
        return _json({"error": "invalid_signature"}, status=401)

    event = request.headers.get("X-GitHub-Event", "")
    if event == "ping":
        return _json({"status": "pong"})
    if event and event != "push":
        return _json({"status": "ignored", "event": event})

    # Only sync on pushes to the tracked branch.
    branch = getattr(settings, "AIR_BRANCH", "main")
    try:
        ref = json.loads(body.decode("utf-8")).get("ref", "")
    except (ValueError, UnicodeDecodeError):
        ref = ""
    if ref and ref != f"refs/heads/{branch}":
        return _json({"status": "ignored", "ref": ref})

    ok, detail = _trigger_sync()
    return _json({"status": "triggered" if ok else "error", "detail": detail},
                 status=202 if ok else 500)
