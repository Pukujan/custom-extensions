#!/bin/bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <chrome-web-store-extension-id>" >&2
  exit 2
fi

EXTENSION_ID="$1"
STATE_DIR="$HOME/.youtube-focus-lock"
BURNIN_FILE="$STATE_DIR/burnin-started-at"
UPDATE_URL="https://clients2.google.com/service/update2/crx"

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

mkdir -p "$STATE_DIR"
printf '%s\n' "$EXTENSION_ID" > "$STATE_DIR/extension-id"
defaults write com.brave.Browser ExtensionInstallForcelist -array "$EXTENSION_ID;$UPDATE_URL"
defaults write com.brave.Browser IncognitoModeAvailability -integer 1

cat <<MSG
Soft lock policy written. The persistent watchdog is NOT installed yet.

1. Fully quit and reopen Brave.
2. Open brave://policy and click Reload policies.
3. Confirm ExtensionInstallForcelist contains $EXTENSION_ID.
4. Open the YouTube Focus Lock popup and confirm it says:
   "Browser lock policy: VERIFIED"
5. Test YouTube once more.
6. Only then run: macos/arm.sh

If anything is wrong, run macos/rollback-policy.sh now. This stage is deliberately easy to undo.
MSG
open -a "Brave Browser" "brave://policy"
