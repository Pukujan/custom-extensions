#!/usr/bin/env python3
"""Cross-platform source/provenance checks for the pre-arm candidate."""
from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parent


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("version") != "0.2.1":
        fail(f"unexpected manifest version: {manifest.get('version')}")
    hosts = set(manifest.get("host_permissions", []))
    required_hosts = {"http://127.0.0.1/*", "http://localhost/*"}
    if not required_hosts.issubset(hosts):
        fail(f"loopback host permissions missing: {sorted(required_hosts - hosts)}")
    if any(":43871/" in h for h in hosts):
        fail("loopback host_permissions must use Chrome match patterns without a port")

    required = [
        "docs/LOCAL-AGENT-VALIDATION.md",
        "docs/PDD.md",
        "docs/SDD.md",
        "docs/VALIDATION.md",
        "macos/problem_bank.py",
        "macos/challenge_gate.py",
        "macos/challenge_ui.py",
        "macos/install-dev.sh",
        "macos/stop-preview.sh",
        "tests/e2e/judge-ui.spec.mjs",
        "tests/e2e/brave-popup.spec.mjs",
        "tests/macos/prearm-acceptance.sh",
    ]
    missing = [x for x in required if not (ROOT / x).is_file()]
    if missing:
        fail(f"required validation files missing: {missing}")

    artifacts = ROOT / "artifacts"
    if artifacts.exists() and any(p.suffix.lower() == ".zip" for p in artifacts.iterdir() if p.is_file()):
        fail("binary ZIPs must not be canonical files in Git; CI must package the tested source commit")

    gate = (ROOT / "macos/challenge_gate.py").read_text(encoding="utf-8")
    if "os.fork(" in gate:
        fail("challenge gate still uses os.fork(); subprocess worker is required")
    if "subprocess.run(" not in gate:
        fail("challenge gate does not contain the subprocess worker path")

    status = (ROOT / "src/status.js").read_text(encoding="utf-8")
    if "127.0.0.1:43871/health" not in status:
        fail("popup health probe is missing")
    if "setInterval(judgeHealth, 1500)" not in status:
        fail("popup does not retry local judge health")
    if "Test coding challenge" not in (ROOT / "status.html").read_text(encoding="utf-8"):
        fail("popup test-challenge control is missing")

    workflow = (REPO / ".github/workflows/youtube-focus-lock.yml").read_text(encoding="utf-8")
    if "youtube-focus-lock-v2" not in workflow:
        fail("CI workflow does not run on youtube-focus-lock-v2")
    if "actions/upload-artifact@v4" not in workflow or "GITHUB_SHA" not in workflow:
        fail("CI does not package/upload the exact tested commit")

    print("pre-arm source/provenance checks PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
