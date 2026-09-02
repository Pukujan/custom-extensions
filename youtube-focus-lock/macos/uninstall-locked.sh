#!/bin/bash
set -euo pipefail

LABEL="com.youtube-focus-lock.policy-watchdog"
INSTALL_DIR="/Library/Application Support/YouTubeFocusLock"
PLIST="/Library/LaunchDaemons/$LABEL.plist"
TARGET_USER="${SUDO_USER:-$(id -un)}"
TARGET_HOME="$(dscl . -read "/Users/$TARGET_USER" NFSHomeDirectory | awk '{print $2}')"
TOKEN="$TARGET_HOME/.youtube-focus-lock/maintenance-token.json"

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo after completing the coding challenge." >&2
  exit 1
fi

if ! /usr/bin/python3 "$INSTALL_DIR/challenge_gate.py" token-valid --token "$TOKEN"; then
  cat >&2 <<MSG
No valid maintenance token.
As $TARGET_USER, first run:
  python3 "$INSTALL_DIR/challenge_gate.py" start
Then solve the five generated problems and run the printed check command.
MSG
  exit 1
fi

launchctl bootout system "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
rm -rf "$INSTALL_DIR"
sudo -u "$TARGET_USER" defaults delete com.brave.Browser ExtensionInstallForcelist 2>/dev/null || true
sudo -u "$TARGET_USER" defaults delete com.brave.Browser IncognitoModeAvailability 2>/dev/null || true
rm -f "$TOKEN"
echo "YouTube Focus Lock enforcement removed. Restart Brave to finish cleanup."
