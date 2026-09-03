#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "FAIL: macOS is required for the real Brave/LaunchAgent acceptance pass." >&2
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
REPORT="test-results/prearm-acceptance.txt"
: > "$REPORT"
log(){ printf '%s\n' "$*" | tee -a "$REPORT"; }

log "YouTube Focus Lock v2 pre-arm acceptance"
log "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
log "Brave: $($BRAVE_PATH --version 2>/dev/null || true)"
log "Python: $(python3 --version)"
log "Node: $(node --version)"

before_force="$(defaults read com.brave.Browser ExtensionInstallForcelist 2>&1 || true)"
before_incog="$(defaults read com.brave.Browser IncognitoModeAvailability 2>&1 || true)"

log "[1/8] Static/unit validation"
npm test
python3 macos/problem_bank.py
python3 tests/prearm_source_check.py
python3 macos/challenge_gate.py self-test
python3 macos/challenge_ui.py self-test
(cd macos && python3 -m unittest -v test_challenge_system.py)

log "[2/8] Syntax validation"
python3 -m py_compile macos/problem_bank.py macos/challenge_gate.py macos/challenge_ui.py macos/test_challenge_system.py tests/prearm_source_check.py
node --check macos/challenge_ui.js
node --check src/status.js
bash -n macos/*.sh tests/macos/*.sh
python3 -m json.tool manifest.json >/dev/null

log "[3/8] Start real removable preview LaunchAgent"
bash macos/stop-preview.sh >/dev/null 2>&1 || true
bash macos/install-dev.sh

log "[4/8] Verify localhost judge health + launchd registration"
health="$(/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:43871/health)"
printf '%s\n' "$health" | grep -q '"mode": "preview"' || { echo "FAIL: preview mode health mismatch: $health" >&2; exit 1; }
printf '%s\n' "$health" | grep -q '"bankSize": 120' || { echo "FAIL: bank size health mismatch: $health" >&2; exit 1; }
launchctl print "gui/$(id -u)/com.youtube-focus-lock.challenge-ui" >/dev/null

log "[5/8] Verify burn-in installer did NOT alter Brave lock policies"
after_force="$(defaults read com.brave.Browser ExtensionInstallForcelist 2>&1 || true)"
after_incog="$(defaults read com.brave.Browser IncognitoModeAvailability 2>&1 || true)"
[[ "$before_force" == "$after_force" ]] || { echo "FAIL: install-dev changed ExtensionInstallForcelist" >&2; exit 1; }
[[ "$before_incog" == "$after_incog" ]] || { echo "FAIL: install-dev changed IncognitoModeAvailability" >&2; exit 1; }

log "[6/8] Playwright judge UI"
[[ -d node_modules/@playwright/test ]] || { echo "FAIL: run npm install first so @playwright/test is available" >&2; exit 2; }
npx playwright test tests/e2e/judge-ui.spec.mjs

log "[7/8] Playwright real Brave popup"
BRAVE_PATH="$BRAVE_PATH" npx playwright test tests/e2e/brave-popup.spec.mjs

log "[8/8] Restart persistence smoke test"
before_json="$(/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:43871/health)"
bash macos/stop-preview.sh
bash macos/install-dev.sh
after_json="$(/usr/bin/curl -fsS --max-time 2 http://127.0.0.1:43871/health)"
printf '%s\n' "$after_json" | grep -q '"mode": "preview"' || { echo "FAIL: judge did not recover after restart" >&2; exit 1; }

log "PASS: deterministic pre-arm acceptance completed."
log "NEXT: a local agent must visually inspect test-results/*.png and perform the computer-use rubric in docs/LOCAL-AGENT-VALIDATION.md. Do NOT arm until that rubric also passes."
