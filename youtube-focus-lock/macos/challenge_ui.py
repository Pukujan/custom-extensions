#!/usr/bin/env python3
"""Local 60-minute browser UI for the YouTube Focus Lock coding gate."""
from __future__ import annotations

import argparse, hashlib, json, os, pwd, secrets, shlex, subprocess, sys, time, traceback, urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
import challenge_gate as gate

HOST, PORT, SESSION_SECONDS = "127.0.0.1", 43871, 3600
ACTIVE = gate.STATE_DIR / "active-challenge.json"
PROGRESS = "progress.json"
INSTALL = Path("/Library/Application Support/YouTubeFocusLock")
SOURCE = Path(__file__).resolve().parent
ASSETS = INSTALL if (INSTALL / "challenge_ui.html").exists() else SOURCE
MAX_CODE = 128 * 1024


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{secrets.token_hex(4)}")
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, path)


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def digest(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def syntax_result(code: str, filename: str) -> dict[str, Any]:
    try:
        compile(code, filename, "exec")
        return {"ok": True, "message": "Python compiled successfully."}
    except SyntaxError as e:
        return {"ok": False, "message": e.msg, "line": e.lineno, "offset": e.offset, "text": (e.text or "").rstrip()}


def expired(progress: dict[str, Any], now: int | None = None) -> bool:
    return int(time.time() if now is None else now) >= int(progress.get("expiresAt", 0))


def ppath(root: Path) -> Path:
    return root / PROGRESS


def init_progress(root: Path) -> dict[str, Any]:
    meta = read_json(root / "challenge.json")
    now = int(time.time())
    p = {"createdAt": now, "expiresAt": now + SESSION_SECONDS, "token": secrets.token_urlsafe(32), "selected": 0, "problems": {}}
    for item in meta["problems"]:
        code = (root / item["dir"] / "solution.py").read_text(encoding="utf-8")
        p["problems"][item["dir"]] = {"passed": False, "passedHash": None, "lastResult": None, "savedHash": digest(code)}
    write_json(ppath(root), p)
    write_json(ACTIVE, {"root": str(root)})
    return p


def pointer_session() -> tuple[Path, dict[str, Any]] | None:
    try:
        root = Path(read_json(ACTIVE)["root"])
        if root.exists() and ppath(root).exists():
            return root, read_json(ppath(root))
    except (OSError, KeyError, ValueError, json.JSONDecodeError):
        pass
    return None


def page_session() -> tuple[Path, dict[str, Any]]:
    current = pointer_session()
    if current and not expired(current[1]):
        return current
    root = gate.write_challenge()
    return root, init_progress(root)


def payload(root: Path, p: dict[str, Any]) -> dict[str, Any]:
    meta = read_json(root / "challenge.json")
    rows, complete = [], 0
    for i, item in enumerate(meta["problems"]):
        problem = gate.PROBLEMS[item["slug"]]
        code = (root / item["dir"] / "solution.py").read_text(encoding="utf-8")
        ps = p["problems"][item["dir"]]
        passed = bool(ps.get("passed")) and ps.get("passedHash") == digest(code)
        complete += int(passed)
        examples = []
        for args in gate.generated_cases(item["slug"], int(item["seed"]))[:2]:
            examples.append({"args": args, "expected": problem["reference"](*args)})
        rows.append({"index": i, "slug": item["slug"], "difficulty": problem["difficulty"], "function": problem["function"], "prompt": problem["prompt"], "code": code, "passed": passed, "lastResult": ps.get("lastResult"), "examples": examples})
    return {"expiresAt": p["expiresAt"], "remaining": max(0, p["expiresAt"] - int(time.time())), "selected": p.get("selected", 0), "complete": complete, "problems": rows}


def save(root: Path, p: dict[str, Any], index: int, code: str) -> None:
    if expired(p):
        raise TimeoutError("Challenge expired. Reload for a new set.")
    if len(code.encode()) > MAX_CODE:
        raise ValueError("Solution too large.")
    meta = read_json(root / "challenge.json")
    if index not in range(5):
        raise ValueError("Bad problem index.")
    item = meta["problems"][index]
    path = root / item["dir"] / "solution.py"
    ps = p["problems"][item["dir"]]
    path.write_text(code, encoding="utf-8")
    h = digest(code)
    if ps.get("passedHash") != h:
        ps.update({"passed": False, "passedHash": None, "lastResult": {"kind": "saved", "message": "Saved. Run this version to earn PASS."}})
    ps["savedHash"] = h
    p["selected"] = index
    write_json(ppath(root), p)


def run(root: Path, p: dict[str, Any], index: int, code: str) -> dict[str, Any]:
    save(root, p, index, code)
    meta = read_json(root / "challenge.json")
    item = meta["problems"][index]
    path = root / item["dir"] / "solution.py"
    ps = p["problems"][item["dir"]]
    comp = syntax_result(code, str(path))
    if not comp["ok"]:
        result = {"ok": False, "compile": comp, "tests": None}
        ps.update({"passed": False, "passedHash": None, "lastResult": result})
        write_json(ppath(root), p)
        return result
    ok, _ = gate.check_one(item["slug"], int(item["seed"]), path)
    result = {"ok": ok, "compile": comp, "tests": {"ok": ok, "message": "All hidden tests passed." if ok else "At least one hidden test failed or raised an error."}}
    ps.update({"passed": ok, "passedHash": digest(code) if ok else None, "lastResult": result})
    write_json(ppath(root), p)
    return result


def all_pass(root: Path, p: dict[str, Any]) -> bool:
    x = payload(root, p)
    return not expired(p) and x["complete"] == 5


def privileged(root: Path, action: str) -> None:
    if not (INSTALL / "challenge_gate.py").exists():
        raise RuntimeError("Locked helper is not installed yet. Preview mode can test the editor/judge, but cannot change browser lock state.")
    user = pwd.getpwuid(os.getuid()).pw_name
    verify = f"/usr/bin/python3 {shlex.quote(str(INSTALL/'challenge_gate.py'))} unlock {shlex.quote(str(root))} --user {shlex.quote(user)}"
    command = verify if action == "maintenance" else f"{verify} && {shlex.quote(str(INSTALL/'uninstall-locked.sh'))} {shlex.quote(user)}"
    quoted = '"' + command.replace('\\', '\\\\').replace('"', '\\"') + '"'
    subprocess.Popen(["/usr/bin/osascript", "-e", f"do shell script {quoted} with administrator privileges"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[yfl-ui] " + fmt % args + "\n")

    def headers(self, status: int, kind="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", kind)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()

    def json(self, status: int, obj: Any):
        self.headers(status)
        self.wfile.write(json.dumps(obj, default=str).encode())

    def body(self):
        n = int(self.headers.get("Content-Length", "0"))
        if n > MAX_CODE + 16384:
            raise ValueError("Request too large.")
        return json.loads(self.rfile.read(n).decode()) if n else {}

    def session(self):
        s = pointer_session()
        return s if s else page_session()

    def authorized(self, p):
        return secrets.compare_digest(self.headers.get("X-YFL-Token", ""), p.get("token", ""))

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/":
            root, p = page_session()
            page = (ASSETS/"challenge_ui.html").read_text(encoding="utf-8").replace("__TOKEN__", json.dumps(p["token"]))
            self.headers(200, "text/html; charset=utf-8")
            self.wfile.write(page.encode())
            return
        if path in {"/ui.js", "/ui.css"}:
            name = "challenge_ui.js" if path.endswith("js") else "challenge_ui.css"
            kind = "text/javascript; charset=utf-8" if path.endswith("js") else "text/css; charset=utf-8"
            self.headers(200, kind)
            self.wfile.write((ASSETS/name).read_bytes())
            return
        if path == "/api/state":
            root, p = self.session()
            if not self.authorized(p):
                return self.json(403, {"error": "Invalid UI token."})
            if expired(p):
                return self.json(410, {"error": "Challenge expired."})
            return self.json(200, payload(root, p))
        self.json(404, {"error": "Not found"})

    def do_POST(self):
        try:
            origin = self.headers.get("Origin", "")
            if origin and urllib.parse.urlparse(origin).hostname not in {"127.0.0.1", "localhost"}:
                return self.json(403, {"error": "Cross-origin request blocked."})
            root, p = self.session()
            if not self.authorized(p):
                return self.json(403, {"error": "Invalid UI token."})
            if expired(p):
                return self.json(410, {"error": "Challenge expired. Reload for a new set."})
            path, body = urllib.parse.urlparse(self.path).path, self.body()
            if path == "/api/save":
                save(root, p, int(body["index"]), str(body["code"]))
                return self.json(200, {"ok": True})
            if path == "/api/run":
                return self.json(200, run(root, p, int(body["index"]), str(body["code"])))
            if path == "/api/select":
                p["selected"] = max(0, min(4, int(body["index"])))
                write_json(ppath(root), p)
                return self.json(200, {"ok": True})
            if path == "/api/action":
                action = body.get("action")
                if action not in {"maintenance", "uninstall"}:
                    raise ValueError("Bad action.")
                if not all_pass(root, p):
                    return self.json(409, {"error": "All five current solutions must pass first."})
                privileged(root, action)
                return self.json(200, {"ok": True})
            self.json(404, {"error": "Not found"})
        except TimeoutError as e:
            self.json(410, {"error": str(e)})
        except (KeyError, ValueError, json.JSONDecodeError) as e:
            self.json(400, {"error": str(e)})
        except BaseException as e:
            traceback.print_exc()
            self.json(500, {"error": f"Judge error: {type(e).__name__}: {e}"})


def self_test() -> int:
    assert syntax_result("def f():\n return 1\n", "x.py")["ok"]
    assert not syntax_result("def f(:\n pass\n", "x.py")["ok"]
    assert not expired({"expiresAt": 10}, 9) and expired({"expiresAt": 10}, 10)
    print("challenge UI self-test PASS")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve")
    s.add_argument("--port", type=int, default=PORT)
    sub.add_parser("self-test")
    a = ap.parse_args()
    if a.cmd == "self-test":
        return self_test()
    gate.STATE_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((HOST, a.port), Handler)
    print(f"Maintenance UI: http://{HOST}:{a.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
