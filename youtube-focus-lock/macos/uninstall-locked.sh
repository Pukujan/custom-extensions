#!/bin/bash
set -euo pipefail

LABEL="com.youtube-focus-lock.policy-watchdog"
UI_LABEL="com.youtube-focus-lock.challenge-ui"
INSTALL_DIR="/Library/Application Support/YouTubeFocusLock"
PLIST="/Library/LaunchDaemons/$LABEL.plist"

if [[ $EUID -ne 0 ]]; then
  echo "Run with administrator authorization after completing the coding challenge." >&2
  exit 1
fi

TARGET_USER="${1:-${SUDO_USER:-}}"
if [[ -z "$TARGET_USER" || "$TARGET_USER" == "root" ]]; then
  echo "Target macOS username is required: uninstall-locked.sh <username>" >&2
  exit 2
fi
TARGET_UID="$(/usr/bin/id -u "$TARGET_USER")"
TARGET_HOME="$(/usr/bin/dscl . -read "/Users/$TARGET_USER" NFSHomeDirectory | /usr/bin/awk '{print $2}')"
TOKEN="$TARGET_HOME/.youtube-focus-lock/maintenance-token.json"
UI_PLIST="$TARGET_HOME/Library/LaunchAgents/$UI_LABEL.plist"

if ! /usr/bin/python3 "$INSTALL_DIR/challenge_gate.py" token-valid --token "$TOKEN"; then
  cat >&2 <<MSG
No valid maintenance token.
Open the extension popup and choose "Disable / uninstall…", then complete all five Python problems.
MSG
  exit 1
fi

/bin/launchctl bootout system "$PLIST" 2>/dev/null || true
/bin/launchctl bootout "gui/$TARGET_UID" "$UI_PLIST" 2>/dev/null || true
/bin/rm -f "$PLIST" "$UI_PLIST"
/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults delete com.brave.Browser ExtensionInstallForcelist 2>/dev/null || true
/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults delete com.brave.Browser IncognitoModeAvailability 2>/dev/null || true
/bin/rm -f "$TOKEN"
/bin/rm -rf "$INSTALL_DIR"
echo "YouTube Focus Lock enforcement removed. Restart Brave to finish cleanup."
