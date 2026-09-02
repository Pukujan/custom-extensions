#!/usr/bin/env python3
"""Productive friction gate for YouTube Focus Lock maintenance.

This is intentionally a friction mechanism, not a security boundary. Candidate
solutions run as the invoking user, never as root. The judge applies CPU and
memory limits but does not claim to sandbox hostile code.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import random
import resource
import hashlib
import hmac
import pwd
import secrets
import signal
import sys
import time
from collections import Counter, deque
from pathlib import Path
from typing import Any, Callable

STATE_DIR = Path.home() / ".youtube-focus-lock"
CHALLENGE_ROOT = STATE_DIR / "challenges"
TOKEN_PATH = STATE_DIR / "maintenance-token.json"
TOKEN_MINUTES = 10
INSTALL_DIR = Path("/Library/Application Support/YouTubeFocusLock")
SECRET_PATH = INSTALL_DIR / "maintenance-secret"


def _count_subarrays_sum(nums: list[int], target: int) -> int:
    total = 0
    prefix = 0
    counts = {0: 1}
    for x in nums:
        prefix += x
        total += counts.get(prefix - target, 0)
        counts[prefix] = counts.get(prefix, 0) + 1
    return total


def _longest_bounded_window(nums: list[int], limit: int) -> int:
    maxq: deque[int] = deque()
    minq: deque[int] = deque()
    left = ans = 0
    for right, x in enumerate(nums):
        while maxq and nums[maxq[-1]] < x:
            maxq.pop()
        while minq and nums[minq[-1]] > x:
            minq.pop()
        maxq.append(right)
        minq.append(right)
        while nums[maxq[0]] - nums[minq[0]] > limit:
            left += 1
            if maxq[0] < left:
                maxq.popleft()
            if minq[0] < left:
                minq.popleft()
        ans = max(ans, right - left + 1)
    return ans


def _min_meeting_rooms(intervals: list[list[int]]) -> int:
    events = []
    for start, end in intervals:
        events.append((start, 1))
        events.append((end, -1))
    active = best = 0
    for _, delta in sorted(events, key=lambda e: (e[0], e[1])):
        active += delta
        best = max(best, active)
    return best


def _shortest_path_one_break(grid: list[list[int]]) -> int:
    if not grid or not grid[0]:
        return -1
    rows, cols = len(grid), len(grid[0])
    start_used = grid[0][0]
    if start_used > 1:
        return -1
    q = deque([(0, 0, start_used, 0)])
    seen = {(0, 0, start_used)}
    while q:
        r, c, used, dist = q.popleft()
        if (r, c) == (rows - 1, cols - 1):
            return dist
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                nxt_used = used + grid[nr][nc]
                state = (nr, nc, nxt_used)
                if nxt_used <= 1 and state not in seen:
                    seen.add(state)
                    q.append((nr, nc, nxt_used, dist + 1))
    return -1


def _kth_pair_distance(nums: list[int], k: int) -> int:
    nums = sorted(nums)
    lo, hi = 0, nums[-1] - nums[0]
    while lo < hi:
        mid = (lo + hi) // 2
        count = left = 0
        for right, x in enumerate(nums):
            while x - nums[left] > mid:
                left += 1
            count += right - left
        if count >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


def _weighted_interval_max(intervals: list[list[int]]) -> int:
    jobs = sorted(intervals, key=lambda x: x[1])
    ends = [job[1] for job in jobs]
    dp = [0] * (len(jobs) + 1)
    import bisect
    for i, (start, _end, value) in enumerate(jobs, 1):
        j = bisect.bisect_right(ends, start, 0, i - 1)
        dp[i] = max(dp[i - 1], dp[j] + value)
    return dp[-1]


def _min_removals_mountain(nums: list[int]) -> int:
    n = len(nums)
    lis = [1] * n
    lds = [1] * n
    for i in range(n):
        for j in range(i):
            if nums[j] < nums[i]:
                lis[i] = max(lis[i], lis[j] + 1)
    for i in range(n - 1, -1, -1):
        for j in range(i + 1, n):
            if nums[j] < nums[i]:
                lds[i] = max(lds[i], lds[j] + 1)
    best = max((lis[i] + lds[i] - 1 for i in range(n) if lis[i] > 1 and lds[i] > 1), default=0)
    return n - best if best else n


def _top_k_frequent_words(words: list[str], k: int) -> list[str]:
    counts = Counter(words)
    return sorted(counts, key=lambda w: (-counts[w], w))[:k]


PROBLEMS: dict[str, dict[str, Any]] = {
    "prefix-sum-target": {"difficulty": "Medium", "function": "count_target_subarrays", "prompt": "Return the number of contiguous subarrays whose sum equals target. nums may contain negative values.", "reference": _count_subarrays_sum},
    "bounded-window": {"difficulty": "Medium", "function": "longest_bounded_window", "prompt": "Return the maximum length of a contiguous subarray where max(value)-min(value) <= limit.", "reference": _longest_bounded_window},
    "meeting-capacity": {"difficulty": "Medium", "function": "minimum_rooms", "prompt": "Given half-open meeting intervals [start,end), return the minimum number of rooms required.", "reference": _min_meeting_rooms},
    "one-wall-path": {"difficulty": "Hard", "function": "shortest_path_one_break", "prompt": "In a 0/1 grid, return the shortest 4-direction path length from top-left to bottom-right when at most one wall cell (1) may be entered/broken. Return -1 if impossible.", "reference": _shortest_path_one_break},
    "pair-distance": {"difficulty": "Hard", "function": "kth_smallest_pair_distance", "prompt": "Given nums and 1-indexed k, return the kth smallest absolute difference among all unordered index pairs.", "reference": _kth_pair_distance},
    "weighted-schedule": {"difficulty": "Hard", "function": "max_non_overlapping_value", "prompt": "Each interval is [start,end,value]. Return the maximum total value from non-overlapping half-open intervals.", "reference": _weighted_interval_max},
    "mountain-removals": {"difficulty": "Hard", "function": "minimum_mountain_removals", "prompt": "Return the minimum removals needed so the remaining sequence is strictly increasing then strictly decreasing, with both sides non-empty.", "reference": _min_removals_mountain},
    "frequent-words": {"difficulty": "Medium", "function": "top_k_frequent_words", "prompt": "Return the k most frequent words, ordered by descending frequency and lexicographically ascending on ties.", "reference": _top_k_frequent_words},
}


def generated_cases(slug: str, seed: int) -> list[list[Any]]:
    rng = random.Random(seed)
    cases: list[list[Any]] = []
    if slug == "prefix-sum-target":
        cases = [([1, 1, 1], 2), ([1, -1, 0], 0)]
        for _ in range(18):
            n = rng.randint(5, 35)
            cases.append(([rng.randint(-6, 6) for _ in range(n)], rng.randint(-10, 10)))
    elif slug == "bounded-window":
        cases = [([8, 2, 4, 7], 4), ([10, 1, 2, 4, 7, 2], 5)]
        for _ in range(18):
            n = rng.randint(5, 50)
            cases.append(([rng.randint(0, 40) for _ in range(n)], rng.randint(0, 15)))
    elif slug == "meeting-capacity":
        cases = [([[0, 30], [5, 10], [15, 20]],), ([[1, 2], [2, 3]],)]
        for _ in range(18):
            intervals = []
            for _ in range(rng.randint(5, 30)):
                start = rng.randint(0, 80)
                intervals.append([start, start + rng.randint(1, 20)])
            cases.append((intervals,))
    elif slug == "one-wall-path":
        cases = [([[0, 1, 0], [0, 1, 0], [0, 0, 0]],), ([[0, 1], [1, 1]],)]
        for _ in range(14):
            rows, cols = rng.randint(3, 8), rng.randint(3, 8)
            grid = [[1 if rng.random() < 0.3 else 0 for _ in range(cols)] for _ in range(rows)]
            grid[0][0] = 0
            grid[-1][-1] = 0
            cases.append((grid,))
    elif slug == "pair-distance":
        cases = [([1, 3, 1], 1), ([1, 6, 1], 3)]
        for _ in range(18):
            n = rng.randint(4, 20)
            nums = [rng.randint(0, 100) for _ in range(n)]
            pairs = n * (n - 1) // 2
            cases.append((nums, rng.randint(1, pairs)))
    elif slug == "weighted-schedule":
        cases = [([[1, 3, 5], [2, 5, 6], [4, 6, 5], [6, 7, 4]],),]
        for _ in range(18):
            jobs = []
            for _ in range(rng.randint(5, 25)):
                start = rng.randint(0, 60)
                jobs.append([start, start + rng.randint(1, 15), rng.randint(1, 40)])
            cases.append((jobs,))
    elif slug == "mountain-removals":
        cases = [([2, 1, 1, 5, 6, 2, 3, 1],), ([1, 3, 1],)]
        for _ in range(15):
            n = rng.randint(5, 18)
            cases.append(([rng.randint(0, 30) for _ in range(n)],))
    elif slug == "frequent-words":
        cases = [(["i", "love", "leetcode", "i", "love", "coding"], 2),]
        vocab = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]
        for _ in range(18):
            words = [rng.choice(vocab) for _ in range(rng.randint(10, 60))]
            cases.append((words, rng.randint(1, min(4, len(set(words))))))
    else:
        raise KeyError(slug)
    return [list(case) for case in cases]


def write_challenge() -> Path:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    CHALLENGE_ROOT.mkdir(parents=True, exist_ok=True)
    challenge_id = f"{int(time.time())}-{secrets.token_hex(3)}"
    root = CHALLENGE_ROOT / challenge_id
    root.mkdir(mode=0o700)
    chosen = random.SystemRandom().sample(list(PROBLEMS), 5)
    metadata = {"id": challenge_id, "createdAt": int(time.time()), "problems": []}
    for index, slug in enumerate(chosen, 1):
        problem = PROBLEMS[slug]
        seed = secrets.randbits(63)
        pdir = root / f"{index:02d}-{slug}"
        pdir.mkdir()
        metadata["problems"].append({"slug": slug, "seed": seed, "dir": pdir.name})
        (pdir / "README.md").write_text(f"# Problem {index}/5 — {problem['difficulty']}\n\n{problem['prompt']}\n\nImplement `{problem['function']}(*args)` in `solution.py`.\nThe checker uses randomized hidden tests. Standard-library imports are allowed.\n", encoding="utf-8")
        (pdir / "solution.py").write_text(f"def {problem['function']}(*args):\n    raise NotImplementedError('solve me')\n", encoding="utf-8")
    (root / "challenge.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return root


def load_candidate(path: Path, function_name: str) -> Callable[..., Any]:
    resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
    try:
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    except (ValueError, OSError):
        pass
    signal.alarm(5)
    spec = importlib.util.spec_from_file_location("candidate_solution", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load solution.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fn = getattr(module, function_name, None)
    if not callable(fn):
        raise RuntimeError(f"Missing callable {function_name}")
    return fn


def check_one(slug: str, seed: int, solution_path: Path) -> tuple[bool, str]:
    problem = PROBLEMS[slug]
    reference = problem["reference"]
    pid = os.fork()
    if pid == 0:
        try:
            fn = load_candidate(solution_path, problem["function"])
            for idx, args in enumerate(generated_cases(slug, seed), 1):
                expected = reference(*args)
                actual = fn(*args)
                if actual != expected:
                    print(json.dumps({"ok": False, "case": idx, "expected": expected, "actual": actual}, default=str))
                    os._exit(20)
            print(json.dumps({"ok": True}))
            os._exit(0)
        except BaseException as exc:
            print(json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"}))
            os._exit(21)
    _, status = os.waitpid(pid, 0)
    code = os.waitstatus_to_exitcode(status)
    return (code == 0, "passed" if code == 0 else f"failed (judge exit {code})")


def check_challenge(root: Path) -> int:
    if os.geteuid() == 0:
        print("Refusing to execute candidate solutions as root. Run the challenge as your normal user.", file=sys.stderr)
        return 2
    metadata = json.loads((root / "challenge.json").read_text(encoding="utf-8"))
    for index, item in enumerate(metadata["problems"], 1):
        slug = item["slug"]
        solution = root / item["dir"] / "solution.py"
        print(f"Checking {index}/5: {slug} …", flush=True)
        ok, detail = check_one(slug, int(item["seed"]), solution)
        if not ok:
            print(f"Problem {index} {detail}. Fix it and rerun the same check command.")
            return 1
        print(f"Problem {index}: PASS")
    print("\nAll 5 pass locally. This does NOT unlock maintenance yet.")
    print("Run the privileged verifier so it can independently re-check the five solutions and sign the 10-minute token:")
    print(f"  sudo /usr/bin/python3 {Path(__file__).resolve()} unlock {root} --user {os.environ.get('USER', os.getlogin())}")
    return 0


def _token_payload(token: dict[str, Any]) -> bytes:
    payload = {k: token[k] for k in ("challengeId", "issuedAt", "expiresAt", "nonce", "user")}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _sign_token(token: dict[str, Any], secret: bytes) -> str:
    return hmac.new(secret, _token_payload(token), hashlib.sha256).hexdigest()


def unlock_challenge(root: Path, username: str) -> int:
    if os.geteuid() != 0:
        print("The privileged verifier must run with sudo/root.", file=sys.stderr)
        return 2
    try:
        user = pwd.getpwnam(username)
    except KeyError:
        print(f"Unknown user: {username}", file=sys.stderr)
        return 2
    if user.pw_uid == 0:
        print("Refusing to judge candidate solutions as root.", file=sys.stderr)
        return 2
    if not SECRET_PATH.exists():
        print(f"Maintenance secret missing: {SECRET_PATH}", file=sys.stderr)
        return 2
    metadata = json.loads((root / "challenge.json").read_text(encoding="utf-8"))
    for index, item in enumerate(metadata["problems"], 1):
        slug = item["slug"]
        solution = root / item["dir"] / "solution.py"
        print(f"Privileged re-check {index}/5: {slug} …", flush=True)
        pid = os.fork()
        if pid == 0:
            try:
                os.setgroups([])
                os.setgid(user.pw_gid)
                os.setuid(user.pw_uid)
                fn = load_candidate(solution, PROBLEMS[slug]["function"])
                ref = PROBLEMS[slug]["reference"]
                for args in generated_cases(slug, int(item["seed"])):
                    if fn(*args) != ref(*args):
                        os._exit(20)
                os._exit(0)
            except BaseException:
                os._exit(21)
        _, status = os.waitpid(pid, 0)
        if os.waitstatus_to_exitcode(status) != 0:
            print(f"Problem {index}: FAIL", file=sys.stderr)
            return 1
        print(f"Problem {index}: PASS")
    now = int(time.time())
    token = {"challengeId": metadata["id"], "issuedAt": now, "expiresAt": now + TOKEN_MINUTES * 60, "nonce": secrets.token_hex(16), "user": username}
    secret = bytes.fromhex(SECRET_PATH.read_text(encoding="utf-8").strip())
    token["signature"] = _sign_token(token, secret)
    target_dir = Path(user.pw_dir) / ".youtube-focus-lock"
    target_dir.mkdir(parents=True, exist_ok=True)
    token_path = target_dir / "maintenance-token.json"
    token_path.write_text(json.dumps(token, indent=2), encoding="utf-8")
    os.chown(token_path, user.pw_uid, user.pw_gid)
    os.chmod(token_path, 0o600)
    print(f"\nAll 5 independently verified. Maintenance unlocked for {TOKEN_MINUTES} minutes.")
    return 0


def token_valid(path: Path) -> bool:
    try:
        token = json.loads(path.read_text(encoding="utf-8"))
        secret = bytes.fromhex(SECRET_PATH.read_text(encoding="utf-8").strip())
        signature = str(token.pop("signature"))
        if not hmac.compare_digest(signature, _sign_token(token, secret)):
            return False
        return int(token["issuedAt"]) <= int(time.time()) <= int(token["expiresAt"])
    except (OSError, KeyError, ValueError, json.JSONDecodeError):
        return False


def self_test() -> int:
    for slug, problem in PROBLEMS.items():
        cases = generated_cases(slug, 12345)
        assert len(cases) >= 10
        for args in cases:
            json.dumps(problem["reference"](*args))
    print(f"challenge gate self-test PASS ({len(PROBLEMS)} problem types)")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("start")
    check = sub.add_parser("check")
    check.add_argument("challenge_dir", type=Path)
    unlock = sub.add_parser("unlock")
    unlock.add_argument("challenge_dir", type=Path)
    unlock.add_argument("--user", required=True)
    valid = sub.add_parser("token-valid")
    valid.add_argument("--token", type=Path, default=TOKEN_PATH)
    sub.add_parser("self-test")
    args = parser.parse_args()
    if args.cmd == "start":
        root = write_challenge()
        print(f"Created five-problem challenge at:\n  {root}\n")
        print("Solve each solution.py, then run:")
        print(f"  python3 {Path(__file__).resolve()} check {root}")
        return 0
    if args.cmd == "check":
        return check_challenge(args.challenge_dir.resolve())
    if args.cmd == "unlock":
        return unlock_challenge(args.challenge_dir.resolve(), args.user)
    if args.cmd == "token-valid":
        ok = token_valid(args.token)
        print("VALID" if ok else "INVALID")
        return 0 if ok else 1
    if args.cmd == "self-test":
        return self_test()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
