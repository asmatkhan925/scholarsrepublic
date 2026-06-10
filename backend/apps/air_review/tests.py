"""Tests for the AIR_review public snapshot API.

These build a throwaway snapshot directory in a tempdir, point
``settings.AIR_SNAPSHOT_DIR`` at it, and exercise every endpoint plus the
path-traversal / allowlist guards. No network and no AIR_review checkout
required.
"""

import hashlib
import hmac
import json
import os
import stat
import tempfile
from pathlib import Path

from django.test import Client, TestCase, override_settings


def _build_snapshot(root: Path):
    commit = "abc123def456"
    generated = "2026-06-10T00:00:00Z"
    (root / "files" / "05_synthesis_matrices").mkdir(parents=True, exist_ok=True)
    (root / "files" / "03_references").mkdir(parents=True, exist_ok=True)

    (root / "files" / "05_synthesis_matrices" / "seed_paper_map.csv").write_text(
        "PaperID,Status\nBF24,Watchlist-ArXiv\nBF25,efficiency\n", encoding="utf-8"
    )
    evidence = "ClaimID,Claim\n" + "".join(f"C-F{i},c{i}\n" for i in range(1, 9))
    (root / "files" / "05_synthesis_matrices" / "evidence_to_claim_matrix.csv").write_text(
        evidence, encoding="utf-8"
    )
    (root / "files" / "03_references" / "references.bib").write_text(
        "@article{foo2024,\n title={A}\n}\n", encoding="utf-8"
    )

    (root / "health.json").write_text(
        json.dumps(
            {
                "status": "ok",
                "service": "AIR_review public snapshot API",
                "commit": commit,
                "generated_at_utc": generated,
            }
        ),
        encoding="utf-8",
    )
    (root / "latest.json").write_text(
        json.dumps(
            {
                "project": "AIR_review",
                "commit": commit,
                "branch": "main",
                "generated_at_utc": generated,
                "frozen_blocks": ["A", "B", "C", "D", "E", "F"],
                "chatgpt_verification_targets": {
                    "must_find_in_seed_map": ["BF24", "BF25"],
                    "must_find_in_evidence_to_claim_matrix": ["C-F1", "C-F8"],
                    "must_find_in_evaluation_robustness_matrix": ["BF24", "BF25"],
                    "current_commit": commit,
                },
            }
        ),
        encoding="utf-8",
    )
    (root / "manifest.json").write_text(
        json.dumps({"commit": commit, "validations": {"cf_claims_present": True}}),
        encoding="utf-8",
    )
    return commit


class AirReviewApiTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._tmp = tempfile.TemporaryDirectory()
        cls.snap = Path(cls._tmp.name)
        cls.commit = _build_snapshot(cls.snap)
        cls._override = override_settings(AIR_SNAPSHOT_DIR=str(cls.snap))
        cls._override.enable()
        cls.client = Client()

    @classmethod
    def tearDownClass(cls):
        cls._override.disable()
        cls._tmp.cleanup()
        super().tearDownClass()

    def _assert_common_headers(self, resp):
        self.assertIn("no-store", resp.headers["Cache-Control"])
        self.assertEqual(resp.headers["X-AIR-Commit"], self.commit)
        self.assertEqual(resp.headers["X-AIR-Source"], "scholarsrepublic-api")
        self.assertEqual(resp.headers["Access-Control-Allow-Origin"], "*")

    def test_health(self):
        r = self.client.get("/api/air/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "ok")
        self._assert_common_headers(r)

    def test_latest(self):
        r = self.client.get("/api/air/latest")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["commit"], self.commit)
        self._assert_common_headers(r)

    def test_manifest(self):
        r = self.client.get("/api/air/manifest")
        self.assertEqual(r.status_code, 200)

    def test_allowlisted_csv(self):
        r = self.client.get("/api/air/file", {"path": "05_synthesis_matrices/evidence_to_claim_matrix.csv"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["Content-Type"], "text/csv; charset=utf-8")
        body = r.content.decode()
        self.assertIn("C-F1", body)
        self.assertIn("C-F8", body)

    def test_seed_map_has_targets(self):
        r = self.client.get("/api/air/file", {"path": "05_synthesis_matrices/seed_paper_map.csv"})
        self.assertEqual(r.status_code, 200)
        self.assertIn("BF24", r.content.decode())
        self.assertIn("BF25", r.content.decode())

    def test_traversal_blocked(self):
        r = self.client.get("/api/air/file", {"path": "../../wp-config.php"})
        self.assertIn(r.status_code, (400, 403))

    def test_not_allowlisted(self):
        r = self.client.get("/api/air/file", {"path": "backend/config/settings.py"})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.json()["error"], "file_not_allowlisted")

    def test_hidden_file_blocked(self):
        r = self.client.get("/api/air/file", {"path": ".env"})
        self.assertIn(r.status_code, (400, 403))

    def test_missing_allowlisted(self):
        r = self.client.get("/api/air/file", {"path": "README.md"})
        self.assertEqual(r.status_code, 404)

    def test_options(self):
        r = self.client.options("/api/air/file")
        self.assertIn(r.status_code, (200, 204))
        self.assertEqual(r.headers["Access-Control-Allow-Methods"], "GET, OPTIONS")


class AirReviewWebhookTests(TestCase):
    SECRET = "test-webhook-secret"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._tmp = tempfile.TemporaryDirectory()
        # A harmless stand-in for air_sync.sh so a real sync never runs in tests.
        cls.script = Path(cls._tmp.name) / "fake_sync.sh"
        cls.script.write_text("#!/bin/bash\nexit 0\n", encoding="utf-8")
        cls.script.chmod(cls.script.stat().st_mode | stat.S_IEXEC)
        cls.client = Client()

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()
        super().tearDownClass()

    def _sig(self, body: bytes, secret=None):
        secret = (secret or self.SECRET).encode()
        return "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()

    def _post(self, payload, secret=None, event="push", sign=True):
        body = json.dumps(payload).encode()
        headers = {"X-GitHub-Event": event}
        if sign:
            headers["X-Hub-Signature-256"] = self._sig(body, secret)
        return self.client.post(
            "/api/air/refresh", data=body, content_type="application/json",
            headers=headers,
        )

    def test_disabled_when_no_secret(self):
        with override_settings(AIR_WEBHOOK_SECRET="", AIR_SYNC_SCRIPT=str(self.script)):
            r = self._post({"ref": "refs/heads/main"})
            self.assertEqual(r.status_code, 503)

    def test_invalid_signature_rejected(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script)):
            r = self._post({"ref": "refs/heads/main"}, secret="wrong-secret")
            self.assertEqual(r.status_code, 401)

    def test_missing_signature_rejected(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script)):
            r = self._post({"ref": "refs/heads/main"}, sign=False)
            self.assertEqual(r.status_code, 401)

    def test_ping_event(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script)):
            r = self._post({"zen": "hi"}, event="ping")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()["status"], "pong")

    def test_push_to_main_triggers(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script),
                               AIR_BRANCH="main"):
            r = self._post({"ref": "refs/heads/main"})
            self.assertEqual(r.status_code, 202)
            self.assertEqual(r.json()["status"], "triggered")

    def test_push_to_other_branch_ignored(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script),
                               AIR_BRANCH="main"):
            r = self._post({"ref": "refs/heads/dev"})
            self.assertEqual(r.status_code, 200)
            self.assertEqual(r.json()["status"], "ignored")

    def test_get_not_allowed(self):
        with override_settings(AIR_WEBHOOK_SECRET=self.SECRET, AIR_SYNC_SCRIPT=str(self.script)):
            r = self.client.get("/api/air/refresh")
            self.assertEqual(r.status_code, 405)
