#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "FAIL: macOS is required for the macOS acceptance pass." >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"
BRAVE_PATH="${BRAVE_PATH:-/Applications/Brave Browser.app/Contents/MacOS/Brave Browser}"
[[ -x "$BRAVE_PATH" ]] || { echo "FAIL: Brave not found at $BRAVE_PATH" >&2; exit 2; }
command -v python3 >/dev/null || { echo "FAIL: python3 missing" >&2; exit 2; }
command -v node >/dev/null || { echo "FAIL: node missing" >&2; exit 2; }
command -v npm >/dev/null || { echo "FAIL: npm missing" >&2; exit 2; }

mkdir -p test-results
REPORT="test-results/prearm-acceptance-macos.txt"
: > "$REPORT"
log(){ printf '%s\n' "$*" | tee -a "$REPORT"; }

log "YouTube Focus Lock cross-platform runtime — macOS pre-arm acceptance"
log "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Brave: $($BRAVE_PATH --version 2>/dev/null || true)"
log "Python: $(python3 --version)"
log "Node: $(node --version)"

before_force="$(defaults read com.brave.Browser ExtensionInstallForcelist 2>&1 || true)"
before_incog="$(defaults read com.brave.Browser IncognitoModeAvailability 2>&1 || true)"

log "[1/7] Static/unit/shared-runtime validation"
npm install
npm test
python3 runtime/problem_bank.py
python3 tests/prearm_source_check.py
python3 runtime/challenge_gate.py self-test
python3 runtime/challenge_ui.py self-test
(cd runtime && python3 -m unittest -v test_challenge_system.py)

log "[2/7] Syntax validation"
python3 -m py_compile runtime/problem_bank.py runtime/challenge_gate.py runtime/challenge_ui.py runtime/test_challenge_system.py tests/prearm_source_check.py
node --check runtime/challenge_ui.js
node --check src/status.js
node --check tests/e2e/judge-ui.spec.mjs
node --check tests/e2e/brave-popup.spec.mjs
bash -n macos/*.sh tests/macos/*.sh
python3 -m json.tool manifest.json >/dev/null

log "[3/7] Playwright isolated judge + actual Brave popup"
bash macos/stop-preview.sh >/dev/null 2>&1 || true
BRAVE_PATH="$BRAVE_PATH" npx playwright test tests/e2e/judge-ui.spec.mjs tests/e2e/brave-popup.spec.mjs

log "[4/7] Start real removable preview LaunchAgent"
bash macos/install-dev.sh

log "[5/7] Verify localhost judge health + launchd registration"
health="$(/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:43871/health)"
printf '%s\n' "$health" | grep -q '"mode": "preview"' || { echo "FAIL: preview mode health mismatch: $health" >&2; exit 1; }
printf '%s\n' "$health" | grep -q '"bankSize": 120' || { echo "FAIL: bank size health mismatch: $health" >&2; exit 1; }
printf '%s\n' "$health" | grep -q '"platform": "macos"' || { echo "FAIL: platform health mismatch: $health" >&2; exit 1; }
launchctl print "gui/$(id -u)/com.youtube-focus-lock.challenge-ui" >/dev/null

log "[6/7] Verify burn-in installer did NOT alter Brave lock policies"
after_force="$(defaults read com.brave.Browser ExtensionInstallForcelist 2>&1 || true)"
after_incog="$(defaults read com.brave.Browser IncognitoModeAvailability 2>&1 || true)"
[[ "$before_force" == "$after_force" ]] || { echo "FAIL: install-dev changed ExtensionInstallForcelist" >&2; exit 1; }
[[ "$before_incog" == "$after_incog" ]] || { echo "FAIL: install-dev changed IncognitoModeAvailability" >&2; exit 1; }

log "[7/7] Preview-service restart smoke test"
bash macos/stop-preview.sh
bash macos/install-dev.sh
after_json="$(/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:43871/health)"
printf '%s\n' "$after_json" | grep -q '"mode": "preview"' || { echo "FAIL: judge did not recover after restart" >&2; exit 1; }

log "MACOS DETERMINISTIC PRE-ARM: PASS"
log "NEXT: complete the real-UI/vision/computer-use rubric in docs/LOCAL-AGENT-VALIDATION.md. Do NOT arm until that rubric also passes."
