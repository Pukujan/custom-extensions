#!/usr/bin/env python3
"""Local browser UI for the YouTube Focus Lock v2 coding challenge."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pwd
import secrets
import shlex
import shutil
import subprocess
import sys
import time
import traceback
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import challenge_gate as gate
import problem_bank as bank

HOST = "127.0.0.1"
PORT = 43871
MAX_CODE = 128 * 1024
PROGRESS_FILE = "progress.json"
PREVIEW_VALIDATION = gate.STATE_DIR / "preview-judge-validation.json"
INSTALL = Path("/Library/Application Support/YouTubeFocusLock")
SOURCE = Path(__file__).resolve().parent
ASSETS = INSTALL if (INSTALL / "challenge_ui.html").exists() else SOURCE


def active_path(mode):
    return gate.STATE_DIR / ("active-challenge-%s.json" % mode)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(".%s.%s" % (path.name, secrets.token_hex(4)))
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, path)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(code):
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def progress_path(root):
    return root / PROGRESS_FILE


def expired(progress, now=None):
    now = int(time.time() if now is None else now)
    return now >= int(progress.get("expiresAt", 0))


def init_progress(root):
    meta = read_json(root / "challenge.json")
    progress = {
        "schema": 2,
        "createdAt": meta["createdAt"],
        "expiresAt": meta["expiresAt"],
        "token": secrets.token_urlsafe(32),
        "selected": 0,
        "problems": {},
    }
    for item in meta["problems"]:
        code = (root / item["dir"] / "solution.py").read_text(encoding="utf-8")
        progress["problems"][item["dir"]] = {
            "passed": False,
            "passedHash": None,
            "savedHash": digest(code),
            "lastResult": None,
            "attempts": 0,
            "hintLevel": 0,
        }
    write_json(progress_path(root), progress)
    write_json(active_path(meta["mode"]), {"root": str(root)})
    return progress


def pointer_session(mode):
    pointer = active_path(mode)
    try:
        root = Path(read_json(pointer)["root"])
        meta = read_json(root / "challenge.json")
        progress = read_json(progress_path(root))
        if meta.get("mode") != mode:
            return None
        return root, progress
    except (OSError, KeyError, ValueError, json.JSONDecodeError):
        return None


def new_session(mode):
    root = gate.write_challenge(mode=mode)
    return root, init_progress(root)


def page_session(mode):
    current = pointer_session(mode)
    if current and not expired(current[1]):
        return current
    if current:
        root = current[0]
        try:
            shutil.rmtree(root)
        except OSError:
            pass
    return new_session(mode)


def public_examples(problem_id, seed):
    spec = bank.PROBLEM_BY_ID[problem_id]
    examples = []
    for args in bank.generated_cases(problem_id, int(seed))[:2]:
        examples.append({"args": args, "expected": spec["reference"](*args)})
    return examples


def payload(root, progress):
    meta = read_json(root / "challenge.json")
    rows = []
    complete = 0
    for index, item in enumerate(meta["problems"]):
        spec = bank.PROBLEM_BY_ID[item["id"]]
        code = (root / item["dir"] / "solution.py").read_text(encoding="utf-8")
        state = progress["problems"][item["dir"]]
        passed = bool(state.get("passed")) and state.get("passedHash") == digest(code)
        complete += int(passed)
        rows.append({
            "index": index,
            "id": item["id"],
            "family": spec["family"],
            "title": spec["title"],
            "difficulty": spec["difficulty"],
            "function": spec["function"],
            "prompt": spec["prompt"],
            "concepts": spec["concepts"],
            "code": code,
            "passed": passed,
            "attempts": state.get("attempts", 0),
            "hintLevel": state.get("hintLevel", 0),
            "lastResult": state.get("lastResult"),
            "examples": public_examples(item["id"], item["seed"]),
        })
    return {
        "mode": meta["mode"],
        "bankSize": len(bank.PROBLEM_SPECS),
        "expiresAt": progress["expiresAt"],
        "remaining": max(0, int(progress["expiresAt"]) - int(time.time())),
        "selected": progress.get("selected", 0),
        "complete": complete,
        "problems": rows,
    }


def save_solution(root, progress, index, code):
    if expired(progress):
        raise TimeoutError("Challenge expired. Reload for a fresh randomized set.")
    if len(code.encode("utf-8")) > MAX_CODE:
        raise ValueError("Solution is too large.")
    meta = read_json(root / "challenge.json")
    if index not in range(len(meta["problems"])):
        raise ValueError("Invalid problem index.")
    item = meta["problems"][index]
    path = root / item["dir"] / "solution.py"
    state = progress["problems"][item["dir"]]
    path.write_text(code, encoding="utf-8")
    code_hash = digest(code)
    if state.get("passedHash") != code_hash:
        state["passed"] = False
        state["passedHash"] = None
        state["lastResult"] = {"status": "saved", "message": "Saved. Run this exact version to earn PASS."}
    state["savedHash"] = code_hash
    progress["selected"] = index
    write_json(progress_path(root), progress)


def run_solution(root, progress, index, code):
    save_solution(root, progress, index, code)
    meta = read_json(root / "challenge.json")
    item = meta["problems"][index]
    path = root / item["dir"] / "solution.py"
    state = progress["problems"][item["dir"]]
    state["attempts"] = int(state.get("attempts", 0)) + 1
    result = gate.evaluate_problem(item["id"], int(item["seed"]), path)
    if result.get("status") == "pass":
        state["passed"] = True
        state["passedHash"] = digest(code)
    else:
        state["passed"] = False
        state["passedHash"] = None
        result["hint"] = gate.hint_for_result(item["id"], result, state["attempts"])
    state["lastResult"] = result
    write_json(progress_path(root), progress)
    meta = read_json(root / "challenge.json")
    if meta.get("mode") == "preview":
        write_json(gate.STATE_DIR / "preview-judge-validation.json", {
            "lastRunAt": int(time.time()),
            "status": result.get("status"),
            "problemId": item["id"],
        })
    return result


def next_hint(root, progress, index):
    meta = read_json(root / "challenge.json")
    item = meta["problems"][index]
    spec = bank.PROBLEM_BY_ID[item["id"]]
    state = progress["problems"][item["dir"]]
    level = min(int(state.get("hintLevel", 0)), len(spec["hints"]) - 1)
    hint = spec["hints"][level]
    state["hintLevel"] = min(level + 1, len(spec["hints"]))
    write_json(progress_path(root), progress)
    return {"hint": hint, "level": level + 1, "max": len(spec["hints"])}


def all_pass(root, progress):
    return not expired(progress) and payload(root, progress)["complete"] == 5


def privileged(root, action):
    if not (INSTALL / "challenge_gate.py").exists():
        raise RuntimeError("Locked helper is not installed. Preview mode can test the full judge but cannot change the blocker.")
    user = pwd.getpwuid(os.getuid()).pw_name
    verify = "/usr/bin/env python3 %s unlock %s --user %s" % (
        shlex.quote(str(INSTALL / "challenge_gate.py")),
        shlex.quote(str(root)),
        shlex.quote(user),
    )
    if action == "maintenance":
        command = verify
    else:
        command = "%s && %s %s" % (verify, shlex.quote(str(INSTALL / "uninstall-locked.sh")), shlex.quote(user))
    quoted = '"' + command.replace("\\", "\\\\").replace('"', '\\"') + '"'
    subprocess.Popen(
        ["/usr/bin/osascript", "-e", "do shell script %s with administrator privileges" % quoted],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


class Handler(BaseHTTPRequestHandler):
    mode = "preview"

    def log_message(self, fmt, *args):
        sys.stderr.write("[yfl-ui:%s] " % self.mode + fmt % args + "\n")

    def send_headers(self, status, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
        )
        self.end_headers()

    def send_json(self, status, value):
        self.send_headers(status)
        self.wfile.write(json.dumps(value, default=str).encode("utf-8"))

    def read_body(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size > MAX_CODE + 16384:
            raise ValueError("Request too large.")
        return json.loads(self.rfile.read(size).decode("utf-8")) if size else {}

    def session(self):
        current = pointer_session(self.mode)
        return current if current else page_session(self.mode)

    def authorized(self, progress):
        return secrets.compare_digest(self.headers.get("X-YFL-Token", ""), progress.get("token", ""))

    def origin_allowed(self):
        origin = self.headers.get("Origin", "")
        if not origin:
            return True
        parsed = urllib.parse.urlparse(origin)
        return parsed.hostname in {"127.0.0.1", "localhost"} and parsed.port == self.server.server_port

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/health":
            return self.send_json(200, {"ok": True, "mode": self.mode, "bankSize": len(bank.PROBLEM_SPECS)})
        if path == "/":
            _root, progress = page_session(self.mode)
            page = (ASSETS / "challenge_ui.html").read_text(encoding="utf-8").replace("__TOKEN__", json.dumps(progress["token"]))
            self.send_headers(200, "text/html; charset=utf-8")
            self.wfile.write(page.encode("utf-8"))
            return
        if path in {"/ui.js", "/ui.css"}:
            filename = "challenge_ui.js" if path.endswith("js") else "challenge_ui.css"
            content_type = "text/javascript; charset=utf-8" if path.endswith("js") else "text/css; charset=utf-8"
            self.send_headers(200, content_type)
            self.wfile.write((ASSETS / filename).read_bytes())
            return
        if path == "/api/state":
            root, progress = self.session()
            if not self.authorized(progress):
                return self.send_json(403, {"error": "Invalid UI token."})
            if expired(progress):
                return self.send_json(410, {"error": "Challenge expired."})
            return self.send_json(200, payload(root, progress))
        return self.send_json(404, {"error": "Not found."})

    def do_POST(self):
        try:
            if not self.origin_allowed():
                return self.send_json(403, {"error": "Cross-origin request blocked."})
            root, progress = self.session()
            if not self.authorized(progress):
                return self.send_json(403, {"error": "Invalid UI token."})
            if expired(progress):
                return self.send_json(410, {"error": "Challenge expired. Reload for a new set."})
            path = urllib.parse.urlparse(self.path).path
            body = self.read_body()
            if path == "/api/save":
                save_solution(root, progress, int(body["index"]), str(body["code"]))
                return self.send_json(200, {"ok": True})
            if path == "/api/run":
                return self.send_json(200, run_solution(root, progress, int(body["index"]), str(body["code"])))
            if path == "/api/select":
                progress["selected"] = max(0, min(4, int(body["index"])))
                write_json(progress_path(root), progress)
                return self.send_json(200, {"ok": True})
            if path == "/api/hint":
                return self.send_json(200, next_hint(root, progress, int(body["index"])))
            if path == "/api/action":
                if self.mode != "locked":
                    return self.send_json(409, {"error": "Preview challenges cannot disable or uninstall the blocker."})
                action = body.get("action")
                if action not in {"maintenance", "uninstall"}:
                    raise ValueError("Invalid action.")
                if not all_pass(root, progress):
                    return self.send_json(409, {"error": "All five current solutions must pass first."})
                privileged(root, action)
                return self.send_json(200, {"ok": True})
            return self.send_json(404, {"error": "Not found."})
        except TimeoutError as exc:
            return self.send_json(410, {"error": str(exc)})
        except (KeyError, ValueError, json.JSONDecodeError) as exc:
            return self.send_json(400, {"error": str(exc)})
        except BaseException as exc:
            traceback.print_exc()
            return self.send_json(500, {"error": "Judge error: %s: %s" % (type(exc).__name__, exc)})


def self_test():
    assert expired({"expiresAt": 10}, 10)
    assert not expired({"expiresAt": 10}, 9)
    assert len(bank.PROBLEM_SPECS) == 120
    with __import__("tempfile").TemporaryDirectory() as td:
        old_state = gate.STATE_DIR
        old_root = gate.CHALLENGE_ROOT
        try:
            gate.STATE_DIR = Path(td) / "state"
            gate.CHALLENGE_ROOT = gate.STATE_DIR / "challenges"
            now = int(time.time())
            root = gate.write_challenge(mode="preview", now=now, rng=__import__("random").Random(7))
            progress = init_progress(root)
            assert progress["expiresAt"] == now + gate.SESSION_SECONDS
            state = payload(root, progress)
            assert state["bankSize"] == 120 and state["complete"] == 0 and state["mode"] == "preview"
            assert len({p["family"] for p in state["problems"]}) == 5
            first = state["problems"][0]
            save_solution(root, progress, 0, "def %s(*args):\n    return None\n" % first["function"])
            refreshed = read_json(progress_path(root))
            assert not refreshed["problems"][read_json(root / "challenge.json")["problems"][0]["dir"]]["passed"]
            hint = next_hint(root, refreshed, 0)
            assert hint["hint"]
        finally:
            gate.STATE_DIR = old_state
            gate.CHALLENGE_ROOT = old_root
    print("challenge UI self-test PASS")
    return 0


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    serve = sub.add_parser("serve")
    serve.add_argument("--port", type=int, default=PORT)
    serve.add_argument("--mode", choices=("preview", "locked"), default="preview")
    sub.add_parser("self-test")
    args = parser.parse_args()
    if args.cmd == "self-test":
        return self_test()
    gate.STATE_DIR.mkdir(parents=True, exist_ok=True)
    Handler.mode = args.mode
    server = ThreadingHTTPServer((HOST, args.port), Handler)
    print("Maintenance UI (%s): http://%s:%d/" % (args.mode, HOST, args.port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
