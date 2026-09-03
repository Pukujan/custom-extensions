#!/bin/bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <chrome-web-store-extension-id>" >&2
  exit 2
fi
EXTENSION_ID="$1"
STATE_DIR="$HOME/.youtube-focus-lock"
BURNIN_FILE="$STATE_DIR/burnin-started-at"
PREVIEW_MARKER="$STATE_DIR/preview-judge-validation.json"
UPDATE_URL="https://clients2.google.com/service/update2/crx"
PYTHON_BIN="$(command -v python3 || true)"

if [[ ! "$EXTENSION_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Invalid Chromium extension ID. Expected 32 letters in the range a-p." >&2
  exit 2
fi
if [[ ! -f "$BURNIN_FILE" ]]; then
  echo "Burn-in marker missing. Run macos/install-dev.sh first." >&2
  exit 1
fi
STARTED_AT="$(cat "$BURNIN_FILE")"
NOW="$(date +%s)"
if (( NOW - STARTED_AT < 3600 )); then
  REMAINING=$((3600 - (NOW - STARTED_AT)))
  echo "Burn-in is not complete. ${REMAINING}s remaining." >&2
  exit 1
fi
if [[ -z "$PYTHON_BIN" || ! -f "$PREVIEW_MARKER" ]]; then
  echo "Coding-judge preview has not been validated during this burn-in." >&2
  echo "Open the extension popup, choose Test coding challenge, edit code, and press Compile & Run at least once." >&2
  exit 1
fi
PREVIEW_AT="$($PYTHON_BIN -c 'import json,sys; print(int(json.load(open(sys.argv[1]))["lastRunAt"]))' "$PREVIEW_MARKER" 2>/dev/null || echo 0)"
if (( PREVIEW_AT < STARTED_AT )); then
  echo "The coding-judge validation marker predates this burn-in. Test it again before locking." >&2
  exit 1
fi

mkdir -p "$STATE_DIR"
printf '%s\n' "$EXTENSION_ID" > "$STATE_DIR/extension-id"
defaults write com.brave.Browser ExtensionInstallForcelist -array "$EXTENSION_ID;$UPDATE_URL"
defaults write com.brave.Browser IncognitoModeAvailability -integer 1

cat <<MSG
Soft lock policy written. Persistent enforcement is NOT armed yet.

Verify all of the following:
  1. Fully quit and reopen Brave.
  2. Open brave://policy and reload policies.
  3. Confirm ExtensionInstallForcelist contains $EXTENSION_ID.
  4. Extension popup reports Browser lock policy: VERIFIED.
  5. YouTube is still blocked outside the daily window.
  6. Coding judge preview was already exercised during burn-in.

If anything is wrong, run macos/rollback-policy.sh. Only after validation run:
  bash macos/arm.sh
MSG
open -a "Brave Browser" "brave://policy"
