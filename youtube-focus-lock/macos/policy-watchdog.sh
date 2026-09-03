#!/bin/bash
set -euo pipefail

TARGET_USER="__TARGET_USER__"
EXTENSION_ID="__EXTENSION_ID__"
PYTHON_BIN="__PYTHON_BIN__"
UPDATE_URL="https://clients2.google.com/service/update2/crx"
INSTALL_DIR="/Library/Application Support/YouTubeFocusLock"
TARGET_HOME="$(/usr/bin/dscl . -read "/Users/$TARGET_USER" NFSHomeDirectory | /usr/bin/awk '{print $2}')"
TOKEN="$TARGET_HOME/.youtube-focus-lock/maintenance-token.json"

if "$PYTHON_BIN" "$INSTALL_DIR/runtime/challenge_gate.py" token-valid --token "$TOKEN" >/dev/null 2>&1; then
  /usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults delete com.brave.Browser ExtensionInstallForcelist 2>/dev/null || true
  /usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults delete com.brave.Browser IncognitoModeAvailability 2>/dev/null || true
  exit 0
fi

/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults write com.brave.Browser ExtensionInstallForcelist -array "$EXTENSION_ID;$UPDATE_URL"
/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults write com.brave.Browser IncognitoModeAvailability -integer 1
