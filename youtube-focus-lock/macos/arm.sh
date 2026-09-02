#!/bin/bash
set -euo pipefail

STATE_DIR="$HOME/.youtube-focus-lock"
EXT_FILE="$STATE_DIR/extension-id"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.youtube-focus-lock.policy-watchdog"
UI_LABEL="com.youtube-focus-lock.challenge-ui"
INSTALL_DIR="/Library/Application Support/YouTubeFocusLock"
PLIST="/Library/LaunchDaemons/$LABEL.plist"
UI_PLIST="$HOME/Library/LaunchAgents/$UI_LABEL.plist"
TARGET_USER="$(id -un)"
TARGET_UID="$(id -u)"

if [[ ! -f "$EXT_FILE" ]]; then
  echo "No prepared extension ID. Run macos/prepare-lock.sh first." >&2
  exit 1
fi
EXTENSION_ID="$(cat "$EXT_FILE")"

cat <<'MSG'
ARMING CHECK
Before continuing, verify ALL of these manually:
  [1] The 60-minute burn-in completed with zero extension health failures.
  [2] brave://policy shows the ExtensionInstallForcelist entry.
  [3] The extension popup says "Browser lock policy: VERIFIED".
  [4] YouTube is blocked outside 11:00 AM–12:00 PM America/New_York.
  [5] macos/rollback-policy.sh still works at this moment.

Type exactly: ARM YOUTUBE FOCUS LOCK
MSG
read -r CONFIRM
if [[ "$CONFIRM" != "ARM YOUTUBE FOCUS LOCK" ]]; then
  echo "Not armed."
  exit 1
fi

TMP_WATCHDOG="$(mktemp)"
sed -e "s/__TARGET_USER__/$(printf '%s' "$TARGET_USER" | sed 's/[&/]/\\&/g')/" -e "s/__EXTENSION_ID__/$EXTENSION_ID/" "$ROOT_DIR/macos/policy-watchdog.sh" > "$TMP_WATCHDOG"

TMP_PLIST="$(mktemp)"
cat > "$TMP_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$INSTALL_DIR/policy-watchdog.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>/var/log/youtube-focus-lock.log</string>
  <key>StandardErrorPath</key><string>/var/log/youtube-focus-lock.err</string>
</dict>
</plist>
PLIST

mkdir -p "$HOME/Library/LaunchAgents" "$STATE_DIR"
cat > "$UI_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$UI_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>$INSTALL_DIR/challenge_ui.py</string>
    <string>serve</string>
    <string>--port</string><string>43871</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$STATE_DIR/challenge-ui.log</string>
  <key>StandardErrorPath</key><string>$STATE_DIR/challenge-ui.err</string>
</dict>
</plist>
PLIST

sudo mkdir -p "$INSTALL_DIR"
sudo install -o root -g wheel -m 0755 "$TMP_WATCHDOG" "$INSTALL_DIR/policy-watchdog.sh"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/macos/challenge_gate.py" "$INSTALL_DIR/challenge_gate.py"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/macos/challenge_ui.py" "$INSTALL_DIR/challenge_ui.py"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/macos/challenge_ui.html" "$INSTALL_DIR/challenge_ui.html"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/macos/challenge_ui.css" "$INSTALL_DIR/challenge_ui.css"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/macos/challenge_ui.js" "$INSTALL_DIR/challenge_ui.js"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/macos/uninstall-locked.sh" "$INSTALL_DIR/uninstall-locked.sh"
if [[ ! -f "$INSTALL_DIR/maintenance-secret" ]]; then
  openssl rand -hex 32 | sudo tee "$INSTALL_DIR/maintenance-secret" >/dev/null
  sudo chown root:wheel "$INSTALL_DIR/maintenance-secret"
  sudo chmod 0600 "$INSTALL_DIR/maintenance-secret"
fi
sudo install -o root -g wheel -m 0644 "$TMP_PLIST" "$PLIST"
rm -f "$TMP_WATCHDOG" "$TMP_PLIST"

sudo launchctl bootout system "$PLIST" 2>/dev/null || true
sudo launchctl bootstrap system "$PLIST"
sudo launchctl kickstart -k "system/$LABEL"
launchctl bootout "gui/$TARGET_UID" "$UI_PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$TARGET_UID" "$UI_PLIST"
launchctl kickstart -k "gui/$TARGET_UID/$UI_LABEL"

date +%s > "$STATE_DIR/armed-at"
cat <<MSG
Locked mode armed.

The policy watchdog reapplies the Brave lock every 30 seconds unless a valid
10-minute maintenance token exists.

To disable temporarily or uninstall, open the extension popup and click:
  Disable / uninstall…

The local challenge UI runs at:
  http://127.0.0.1:43871/

A challenge session lasts 60 minutes. Code and passed-problem progress are saved
on disk, so browser/tab/window changes do not lose progress. All five current
solutions are independently re-checked before maintenance or uninstall.

This is strong friction, not an absolute security boundary: because your macOS
account is still an administrator, a determined root-level bypass remains possible.
MSG
