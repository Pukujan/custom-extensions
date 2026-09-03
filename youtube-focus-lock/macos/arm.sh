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
PYTHON_BIN="$(command -v python3 || true)"

if [[ -z "$PYTHON_BIN" ]]; then
  echo "python3 is required for the maintenance challenge." >&2
  exit 1
fi
if [[ ! -f "$EXT_FILE" ]]; then
  echo "No prepared extension ID. Run macos/prepare-lock.sh first." >&2
  exit 1
fi
EXTENSION_ID="$(cat "$EXT_FILE")"

cat <<'MSG'
ARMING CHECK — cross-platform runtime
Before continuing, verify ALL of these:
  [1] The extension completed its 60-minute burn-in with no health failure.
  [2] During burn-in you tested the coding UI from the extension popup.
  [3] The preview UI reported a 120-problem pool and code survived a browser restart.
  [4] brave://policy shows the ExtensionInstallForcelist entry.
  [5] The extension popup says Browser lock policy: VERIFIED.
  [6] YouTube is blocked outside 11:00 AM–12:00 PM America/New_York.
  [7] macos/rollback-policy.sh still works at this moment.

Arming creates a NEW locked challenge namespace. Preview progress cannot unlock it.
Type exactly: ARM YOUTUBE FOCUS LOCK V2
MSG
read -r CONFIRM
if [[ "$CONFIRM" != "ARM YOUTUBE FOCUS LOCK V2" ]]; then
  echo "Not armed."
  exit 1
fi

ESC_USER="$(printf '%s' "$TARGET_USER" | sed 's/[&/]/\\&/g')"
ESC_PY="$(printf '%s' "$PYTHON_BIN" | sed 's/[&/]/\\&/g')"
TMP_WATCHDOG="$(mktemp)"
sed -e "s/__TARGET_USER__/$ESC_USER/" -e "s/__EXTENSION_ID__/$EXTENSION_ID/" -e "s#__PYTHON_BIN__#$ESC_PY#" "$ROOT_DIR/macos/policy-watchdog.sh" > "$TMP_WATCHDOG"

TMP_PLIST="$(mktemp)"
cat > "$TMP_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>$INSTALL_DIR/macos/policy-watchdog.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>/var/log/youtube-focus-lock.log</string>
  <key>StandardErrorPath</key><string>/var/log/youtube-focus-lock.err</string>
</dict>
</plist>
PLIST
plutil -lint "$TMP_PLIST" >/dev/null

mkdir -p "$HOME/Library/LaunchAgents" "$STATE_DIR"
cat > "$UI_PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$UI_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>$INSTALL_DIR/runtime/challenge_ui.py</string>
    <string>serve</string>
    <string>--mode</string><string>locked</string>
    <string>--port</string><string>43871</string>
    <string>--state-dir</string><string>$STATE_DIR</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$STATE_DIR/challenge-ui.log</string>
  <key>StandardErrorPath</key><string>$STATE_DIR/challenge-ui.err</string>
</dict>
</plist>
PLIST
plutil -lint "$UI_PLIST" >/dev/null

sudo mkdir -p "$INSTALL_DIR/runtime" "$INSTALL_DIR/macos"
sudo install -o root -g wheel -m 0755 "$TMP_WATCHDOG" "$INSTALL_DIR/macos/policy-watchdog.sh"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/runtime/challenge_gate.py" "$INSTALL_DIR/runtime/challenge_gate.py"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/runtime/challenge_ui.py" "$INSTALL_DIR/runtime/challenge_ui.py"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/runtime/problem_bank.py" "$INSTALL_DIR/runtime/problem_bank.py"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/runtime/challenge_ui.html" "$INSTALL_DIR/runtime/challenge_ui.html"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/runtime/challenge_ui.css" "$INSTALL_DIR/runtime/challenge_ui.css"
sudo install -o root -g wheel -m 0644 "$ROOT_DIR/runtime/challenge_ui.js" "$INSTALL_DIR/runtime/challenge_ui.js"
sudo install -o root -g wheel -m 0755 "$ROOT_DIR/macos/uninstall-locked.sh" "$INSTALL_DIR/macos/uninstall-locked.sh"
printf '%s\n' "$PYTHON_BIN" | sudo tee "$INSTALL_DIR/python-path" >/dev/null
sudo chown root:wheel "$INSTALL_DIR/python-path"
sudo chmod 0644 "$INSTALL_DIR/python-path"
if [[ ! -f "$INSTALL_DIR/maintenance-secret" ]]; then
  openssl rand -hex 32 | sudo tee "$INSTALL_DIR/maintenance-secret" >/dev/null
  sudo chown root:wheel "$INSTALL_DIR/maintenance-secret"
  sudo chmod 0600 "$INSTALL_DIR/maintenance-secret"
fi
sudo install -o root -g wheel -m 0644 "$TMP_PLIST" "$PLIST"
rm -f "$TMP_WATCHDOG" "$TMP_PLIST"

launchctl bootout "gui/$TARGET_UID" "$UI_PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$TARGET_UID" "$UI_PLIST"
launchctl kickstart -k "gui/$TARGET_UID/$UI_LABEL"
sudo launchctl bootout system "$PLIST" 2>/dev/null || true
sudo launchctl bootstrap system "$PLIST"
sudo launchctl kickstart -k "system/$LABEL"

date +%s > "$STATE_DIR/armed-at"
cat <<MSG
Locked mode armed on macOS using the shared Windows/macOS challenge runtime.

The extension popup opens the LOCKED coding challenge at:
  http://127.0.0.1:43871/

Each challenge draws 5 diverse problems from a 120-problem pool (3 Medium +
2 Hard), persists code/progress for exactly 60 minutes, and gives syntax,
runtime, timeout, wrong-answer, and conceptual hints.

Passing 5/5 allows a signed 10-minute maintenance window or permanent uninstall.
All five saved solutions are independently re-checked before either action.

This remains strong friction rather than an absolute boundary because your
macOS account retains administrator/root authority.
MSG
