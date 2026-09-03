#!/usr/bin/env python3
"""Challenge engine and privileged maintenance-token verifier for YouTube Focus Lock v2."""
from __future__ import annotations

import argparse
import hashlib
import hmac
import importlib.util
import json
import os
import pwd
import resource
import secrets
import signal
import subprocess
import sys
import tempfile
import contextlib
import time
from pathlib import Path

import problem_bank as bank

STATE_DIR = Path.home() / ".youtube-focus-lock"
CHALLENGE_ROOT = STATE_DIR / "challenges"
TOKEN_PATH = STATE_DIR / "maintenance-token.json"
TOKEN_MINUTES = 10
SESSION_SECONDS = 60 * 60
INSTALL_DIR = Path("/Library/Application Support/YouTubeFocusLock")
SECRET_PATH = INSTALL_DIR / "maintenance-secret"


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(".%s.%s" % (path.name, secrets.token_hex(4)))
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, path)


def write_challenge(mode="preview", now=None, rng=None):
    now = int(time.time() if now is None else now)
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    CHALLENGE_ROOT.mkdir(parents=True, exist_ok=True)
    challenge_id = "%d-%s" % (now, secrets.token_hex(4))
    root = CHALLENGE_ROOT / challenge_id
    root.mkdir(mode=0o700)
    chosen = bank.select_challenge(rng)
    metadata = {
        "schema": 2,
        "id": challenge_id,
        "mode": mode,
        "createdAt": now,
        "expiresAt": now + SESSION_SECONDS,
        "problems": [],
    }
    for index, spec in enumerate(chosen, 1):
        seed = secrets.randbits(63)
        pdir = root / ("%02d-%s" % (index, spec["id"]))
        pdir.mkdir()
        metadata["problems"].append({"id": spec["id"], "seed": seed, "dir": pdir.name})
        (pdir / "solution.py").write_text(
            "def %s(*args):\n    raise NotImplementedError('solve me')\n" % spec["function"],
            encoding="utf-8",
        )
    write_json(root / "challenge.json", metadata)
    return root


def syntax_result(code, filename="solution.py"):
    try:
        compile(code, filename, "exec")
        return {"ok": True, "message": "Python compiled successfully."}
    except SyntaxError as exc:
        return {
            "ok": False,
            "message": exc.msg,
            "line": exc.lineno,
            "offset": exc.offset,
            "text": (exc.text or "").rstrip(),
            "hint": syntax_hint(exc),
        }


def syntax_hint(exc):
    msg = (exc.msg or "").lower()
    text = (exc.text or "").strip()
    if "expected ':'" in msg:
        return "Python expected a colon here. Check the end of your def/if/for/while/else line."
    if "was never closed" in msg or "unmatched" in msg:
        return "A bracket, parenthesis, or brace is unbalanced. Match the opening and closing delimiters near this line."
    if "unexpected indent" in msg:
        return "This line is indented farther than Python expects. Compare its indentation with the surrounding block."
    if "expected an indented block" in msg:
        return "The previous line opens a block. Add an indented body beneath it."
    if "return" in text and "outside function" in msg:
        return "The return statement is outside the function body. Check indentation."
    return "Read the highlighted line and the line immediately before it; Python syntax errors are often caused one token earlier."


def runtime_hint(error_type, message):
    mapping = {
        "NameError": "A variable or function name is being used before it exists. Check spelling and scope.",
        "UnboundLocalError": "A local variable is read before assignment on at least one path.",
        "TypeError": "An operation received a value of the wrong shape/type. Re-check your function signature and return type.",
        "IndexError": "An index escaped the valid range. Check empty inputs and loop boundaries.",
        "KeyError": "A dictionary key was assumed to exist. Consider get/defaultdict or test membership first.",
        "ZeroDivisionError": "A denominator can become zero on an edge case.",
        "RecursionError": "The recursion is too deep or lacks a terminating base case. Consider an iterative approach.",
        "NotImplementedError": "The starter stub is still being executed. Replace it with your solution.",
        "AttributeError": "A value does not have the attribute/method you used. Re-check its type.",
    }
    return mapping.get(error_type, "The program raised %s. Use the exception message to trace the failing operation." % error_type)


def _apply_limits():
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (4, 4))
    except (OSError, ValueError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    except (OSError, ValueError):
        pass
    try:
        resource.setrlimit(resource.RLIMIT_FSIZE, (4 * 1024 * 1024, 4 * 1024 * 1024))
    except (OSError, ValueError):
        pass
    signal.alarm(6)


def _load_candidate(path, function_name):
    spec = importlib.util.spec_from_file_location("candidate_solution", str(path))
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load solution.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fn = getattr(module, function_name, None)
    if not callable(fn):
        raise RuntimeError("Missing callable %s" % function_name)
    return fn


def _worker_evaluate(problem_id, seed, solution_path, uid=None, gid=None):
    """Run one candidate in a fresh Python process.

    This function is called only by the private `_worker` CLI. When privileged
    verification supplies uid/gid, privileges are dropped before candidate code
    is imported or executed.
    """
    try:
        if uid is not None:
            os.setgroups([])
            os.setgid(int(gid))
            os.setuid(int(uid))
        _apply_limits()
        spec = bank.PROBLEM_BY_ID[problem_id]
        with open(os.devnull, "w", encoding="utf-8") as devnull:
            with contextlib.redirect_stdout(devnull), contextlib.redirect_stderr(devnull):
                fn = _load_candidate(solution_path, spec["function"])
                cases = bank.generated_cases(problem_id, int(seed))
                for idx, args in enumerate(cases, 1):
                    expected = spec["reference"](*args)
                    actual = fn(*args)
                    if actual != expected:
                        return {"status": "wrong", "case": idx, "total": len(cases)}
        return {"status": "pass", "total": len(cases)}
    except BaseException as exc:
        return {
            "status": "runtime",
            "errorType": type(exc).__name__,
            "message": str(exc)[:400],
        }


def evaluate_problem(problem_id, seed, solution_path, uid=None, gid=None, timeout_seconds=7):
    code = solution_path.read_text(encoding="utf-8")
    comp = syntax_result(code, str(solution_path))
    if not comp["ok"]:
        return {"status": "compile", "compile": comp, "hint": comp.get("hint")}

    command = [
        sys.executable,
        str(Path(__file__).resolve()),
        "_worker",
        "--problem-id", str(problem_id),
        "--seed", str(int(seed)),
        "--solution", str(solution_path.resolve()),
    ]
    if uid is not None:
        command.extend(["--uid", str(int(uid)), "--gid", str(int(gid))])
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    try:
        completed = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_seconds,
            env=env,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "compile": comp,
            "hint": "Your solution exceeded the time limit. Look for nested work that can be replaced with hashing, a heap, binary search, a sliding window, or memoization.",
        }

    try:
        payload = json.loads(completed.stdout.strip()) if completed.stdout.strip() else {}
    except (ValueError, UnicodeDecodeError):
        payload = {}
    state = payload.get("status")
    if state == "pass":
        return {"status": "pass", "compile": comp, "tests": payload.get("total", 0), "hint": None}
    if state == "wrong":
        return {"status": "wrong", "compile": comp, "case": payload.get("case"), "tests": payload.get("total", 0)}
    if state == "runtime":
        et = payload.get("errorType", "RuntimeError")
        return {
            "status": "runtime",
            "compile": comp,
            "errorType": et,
            "message": payload.get("message", ""),
            "hint": runtime_hint(et, payload.get("message", "")),
        }
    if completed.returncode < 0:
        sig = -completed.returncode
        return {
            "status": "timeout" if sig in (signal.SIGALRM, signal.SIGKILL) else "runtime",
            "compile": comp,
            "message": "Candidate process ended by signal %d" % sig,
            "hint": "The solution was terminated. Check for infinite loops, runaway recursion, or excessive memory use.",
        }
    return {
        "status": "runtime",
        "compile": comp,
        "message": "Judge worker failed (exit %d)." % completed.returncode,
        "hint": "The isolated judge process terminated unexpectedly.",
    }

def hint_for_result(problem_id, result, attempt=1):
    if result.get("hint"):
        return result["hint"]
    spec = bank.PROBLEM_BY_ID[problem_id]
    if result.get("status") == "wrong":
        idx = 0 if attempt <= 1 else 1
        return spec["hints"][idx]
    return spec["hints"][min(max(attempt - 1, 0), len(spec["hints"]) - 1)]


def _token_payload(token):
    keys = ("challengeId", "issuedAt", "expiresAt", "nonce", "user")
    return json.dumps({k: token[k] for k in keys}, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sign_token(token, secret):
    return hmac.new(secret, _token_payload(token), hashlib.sha256).hexdigest()


def unlock_challenge(root, username):
    if os.geteuid() != 0:
        print("The privileged verifier must run as root.", file=sys.stderr)
        return 2
    try:
        user = pwd.getpwnam(username)
    except KeyError:
        print("Unknown user: %s" % username, file=sys.stderr)
        return 2
    if user.pw_uid == 0:
        print("Refusing to judge candidate solutions as root.", file=sys.stderr)
        return 2
    if not SECRET_PATH.exists():
        print("Maintenance secret missing: %s" % SECRET_PATH, file=sys.stderr)
        return 2
    try:
        metadata = json.loads((root / "challenge.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print("Invalid challenge: %s" % exc, file=sys.stderr)
        return 2
    if metadata.get("mode") != "locked":
        print("Preview challenges cannot unlock maintenance.", file=sys.stderr)
        return 2
    if int(time.time()) >= int(metadata.get("expiresAt", 0)):
        print("Challenge session expired.", file=sys.stderr)
        return 2
    for index, item in enumerate(metadata["problems"], 1):
        path = root / item["dir"] / "solution.py"
        print("Privileged re-check %d/5: %s" % (index, item["id"]), flush=True)
        result = evaluate_problem(item["id"], int(item["seed"]), path, user.pw_uid, user.pw_gid)
        if result.get("status") != "pass":
            print("Problem %d: FAIL (%s)" % (index, result.get("status")), file=sys.stderr)
            return 1
        print("Problem %d: PASS" % index)
    now = int(time.time())
    token = {
        "challengeId": metadata["id"],
        "issuedAt": now,
        "expiresAt": now + TOKEN_MINUTES * 60,
        "nonce": secrets.token_hex(16),
        "user": username,
    }
    secret = bytes.fromhex(SECRET_PATH.read_text(encoding="utf-8").strip())
    token["signature"] = _sign_token(token, secret)
    target_dir = Path(user.pw_dir) / ".youtube-focus-lock"
    target_dir.mkdir(parents=True, exist_ok=True)
    token_path = target_dir / "maintenance-token.json"
    write_json(token_path, token)
    os.chown(token_path, user.pw_uid, user.pw_gid)
    os.chmod(token_path, 0o600)
    print("All 5 independently verified. Maintenance unlocked for %d minutes." % TOKEN_MINUTES)
    return 0


def token_valid(path):
    try:
        token = json.loads(path.read_text(encoding="utf-8"))
        secret = bytes.fromhex(SECRET_PATH.read_text(encoding="utf-8").strip())
        signature = str(token.pop("signature"))
        if not hmac.compare_digest(signature, _sign_token(token, secret)):
            return False
        now = int(time.time())
        return int(token["issuedAt"]) <= now <= int(token["expiresAt"])
    except (OSError, KeyError, ValueError, json.JSONDecodeError):
        return False


def self_test():
    bank.self_test()
    assert syntax_result("def f():\n    return 1\n")["ok"]
    bad = syntax_result("def f(:\n    pass\n")
    assert not bad["ok"] and bad.get("hint")
    assert "variable" in runtime_hint("NameError", "x").lower()

    # Exercise the real subprocess evaluator with one known-correct and one bad solution.
    spec = bank.PROBLEM_BY_ID["prefix-sum-v1"]
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "solution.py"
        path.write_text(
            "def %s(nums, target):\n"
            "    total = prefix = 0\n"
            "    counts = {0: 1}\n"
            "    for x in nums:\n"
            "        prefix += x\n"
            "        total += counts.get(prefix-target, 0)\n"
            "        counts[prefix] = counts.get(prefix, 0) + 1\n"
            "    return total\n" % spec["function"], encoding="utf-8")
        assert evaluate_problem(spec["id"], 99, path)["status"] == "pass"
        path.write_text("def %s(nums, target):\n    return 0\n" % spec["function"], encoding="utf-8")
        wrong = evaluate_problem(spec["id"], 99, path)
        assert wrong["status"] == "wrong"
        assert hint_for_result(spec["id"], wrong, 1)
    print("challenge gate self-test PASS")
    return 0


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    start = sub.add_parser("start")
    start.add_argument("--mode", choices=("preview", "locked"), default="preview")
    check = sub.add_parser("check")
    check.add_argument("challenge_dir", type=Path)
    unlock = sub.add_parser("unlock")
    unlock.add_argument("challenge_dir", type=Path)
    unlock.add_argument("--user", required=True)
    valid = sub.add_parser("token-valid")
    valid.add_argument("--token", type=Path, default=TOKEN_PATH)
    worker = sub.add_parser("_worker", help=argparse.SUPPRESS)
    worker.add_argument("--problem-id", required=True)
    worker.add_argument("--seed", type=int, required=True)
    worker.add_argument("--solution", type=Path, required=True)
    worker.add_argument("--uid", type=int)
    worker.add_argument("--gid", type=int)
    sub.add_parser("self-test")
    args = parser.parse_args()

    if args.cmd == "start":
        root = write_challenge(args.mode)
        print(root)
        return 0
    if args.cmd == "check":
        meta = json.loads((args.challenge_dir / "challenge.json").read_text(encoding="utf-8"))
        for i, item in enumerate(meta["problems"], 1):
            result = evaluate_problem(item["id"], int(item["seed"]), args.challenge_dir / item["dir"] / "solution.py")
            print("%d/5 %s: %s" % (i, item["id"], result["status"]))
            if result["status"] != "pass":
                print("Hint: %s" % hint_for_result(item["id"], result, 1))
                return 1
        return 0
    if args.cmd == "unlock":
        return unlock_challenge(args.challenge_dir.resolve(), args.user)
    if args.cmd == "token-valid":
        ok = token_valid(args.token)
        print("VALID" if ok else "INVALID")
        return 0 if ok else 1
    if args.cmd == "_worker":
        if (args.uid is None) != (args.gid is None):
            print(json.dumps({"status": "runtime", "errorType": "JudgeConfigError", "message": "uid and gid must be supplied together"}))
            return 2
        payload = _worker_evaluate(args.problem_id, args.seed, args.solution.resolve(), args.uid, args.gid)
        print(json.dumps(payload, separators=(",", ":")))
        return 0 if payload.get("status") in {"pass", "wrong", "runtime"} else 2
    return self_test()


if __name__ == "__main__":
    raise SystemExit(main())
