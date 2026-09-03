#!/usr/bin/env python3
from __future__ import annotations

import json
import random
import re
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import challenge_gate as gate
import challenge_ui as ui
import problem_bank as bank


class ChallengeSystemTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old_state = gate.STATE_DIR
        self.old_root = gate.CHALLENGE_ROOT
        self.old_token = gate.TOKEN_PATH
        gate.STATE_DIR = Path(self.tmp.name) / "state"
        gate.CHALLENGE_ROOT = gate.STATE_DIR / "challenges"
        gate.TOKEN_PATH = gate.STATE_DIR / "maintenance-token.json"
        self.servers = []

    def tearDown(self):
        for server, thread in self.servers:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        gate.STATE_DIR = self.old_state
        gate.CHALLENGE_ROOT = self.old_root
        gate.TOKEN_PATH = self.old_token
        self.tmp.cleanup()

    def start_server(self, mode="preview"):
        class TestHandler(ui.Handler):
            pass
        TestHandler.mode = mode
        server = ThreadingHTTPServer(("127.0.0.1", 0), TestHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.servers.append((server, thread))
        return "http://127.0.0.1:%d" % server.server_port

    def get_page_token(self, base):
        page = urllib.request.urlopen(base + "/", timeout=3).read().decode("utf-8")
        match = re.search(r'<meta name="yfl-token" content=("[^"]+")>', page)
        self.assertIsNotNone(match)
        return json.loads(match.group(1))

    def api(self, base, token, path, body=None):
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(base + path, data=data, method="GET" if body is None else "POST")
        req.add_header("X-YFL-Token", token)
        if body is not None:
            req.add_header("Content-Type", "application/json")
            req.add_header("Origin", base)
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.loads(response.read().decode("utf-8"))

    def test_problem_bank_has_120_objective_problems(self):
        self.assertEqual(len(bank.PROBLEM_SPECS), 120)
        self.assertEqual(len({p["id"] for p in bank.PROBLEM_SPECS}), 120)
        self.assertEqual(len({p["family"] for p in bank.PROBLEM_SPECS}), 24)
        for spec in bank.PROBLEM_SPECS:
            cases = bank.generated_cases(spec["id"], 20260902)
            self.assertGreaterEqual(len(cases), 16)
            for args in cases:
                spec["reference"](*args)

    def test_selection_is_diverse_and_balanced(self):
        for seed in range(100):
            chosen = bank.select_challenge(random.Random(seed))
            self.assertEqual(len({p["family"] for p in chosen}), 5)
            self.assertEqual(sum(p["difficulty"] == "Medium" for p in chosen), 3)
            self.assertEqual(sum(p["difficulty"] == "Hard" for p in chosen), 2)

    def test_preview_http_persists_across_server_restart_and_gives_compile_hint(self):
        base1 = self.start_server("preview")
        token1 = self.get_page_token(base1)
        _, state1 = self.api(base1, token1, "/api/state")
        self.assertEqual(state1["mode"], "preview")
        self.assertEqual(state1["bankSize"], 120)
        ids1 = [p["id"] for p in state1["problems"]]
        fn = state1["problems"][0]["function"]
        code = "def %s(:\n    pass\n" % fn
        _, result = self.api(base1, token1, "/api/run", {"index": 0, "code": code})
        self.assertEqual(result["status"], "compile")
        self.assertTrue(result.get("hint"))

        # Save valid text, then restart the service and confirm disk-backed resume.
        saved = "def %s(*args):\n    return None\n" % fn
        self.api(base1, token1, "/api/save", {"index": 0, "code": saved})
        server, thread = self.servers.pop()
        server.shutdown(); server.server_close(); thread.join(timeout=2)

        base2 = self.start_server("preview")
        token2 = self.get_page_token(base2)
        _, state2 = self.api(base2, token2, "/api/state")
        self.assertEqual(ids1, [p["id"] for p in state2["problems"]])
        self.assertEqual(state2["problems"][0]["code"], saved)

        # Preview can exercise the judge but can never trigger privileged maintenance.
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.api(base2, token2, "/api/action", {"action": "uninstall"})
        self.assertEqual(ctx.exception.code, 409)

    def test_pass_state_is_bound_to_exact_saved_code(self):
        root = gate.write_challenge(mode="preview", rng=random.Random(4))
        progress = ui.init_progress(root)
        meta = ui.read_json(root / "challenge.json")
        item = meta["problems"][0]
        state = progress["problems"][item["dir"]]
        original = (root / item["dir"] / "solution.py").read_text(encoding="utf-8")
        state["passed"] = True
        state["passedHash"] = ui.digest(original)
        ui.write_json(ui.progress_path(root), progress)
        ui.save_solution(root, progress, 0, original + "\n# changed\n")
        fresh = ui.read_json(ui.progress_path(root))["problems"][item["dir"]]
        self.assertFalse(fresh["passed"])
        self.assertIsNone(fresh["passedHash"])

    def test_session_expiry_is_fixed_not_activity_extended(self):
        now = int(time.time())
        root = gate.write_challenge(mode="preview", now=now, rng=random.Random(9))
        progress = ui.init_progress(root)
        expiry = progress["expiresAt"]
        self.assertEqual(expiry, now + 3600)
        item = ui.read_json(root / "challenge.json")["problems"][0]
        ui.save_solution(root, progress, 0, (root / item["dir"] / "solution.py").read_text(encoding="utf-8"))
        fresh = ui.read_json(ui.progress_path(root))
        self.assertEqual(fresh["expiresAt"], expiry)
        self.assertTrue(ui.expired(fresh, expiry))

    def test_judge_uses_fresh_subprocess_not_thread_unsafe_fork(self):
        source = Path(gate.__file__).read_text(encoding="utf-8")
        self.assertNotIn("os.fork(", source)
        self.assertIn("subprocess.run(", source)


if __name__ == "__main__":
    unittest.main()
