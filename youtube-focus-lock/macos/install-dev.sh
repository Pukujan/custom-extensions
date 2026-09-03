#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$HOME/.youtube-focus-lock"
LABEL="com.youtube-focus-lock.challenge-ui"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PYTHON_BIN="$(command -v python3 || true)"

if [[ -z "$PYTHON_BIN" ]]; then
  echo "python3 is required for the coding challenge preview." >&2
  exit 1
fi
if ! "$PYTHON_BIN" - <<'PY' >/dev/null
import sys
raise SystemExit(0 if sys.version_info >= (3, 9) else 1)
PY
then
  echo "Python 3.9+ is required. Found: $($PYTHON_BIN --version 2>&1)" >&2
  exit 1
fi
if [[ ! -d "/Applications/Brave Browser.app" ]]; then
  echo "Brave Browser was not found in /Applications." >&2
  exit 1
fi

mkdir -p "$STATE_DIR" "$HOME/Library/LaunchAgents"
# Do not silently reset an existing burn-in just because the preview helper is restarted.
if [[ ! -f "$STATE_DIR/burnin-started-at" ]]; then
  date +%s > "$STATE_DIR/burnin-started-at"
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>$ROOT_DIR/macos/challenge_ui.py</string>
    <string>serve</string>
    <string>--mode</string><string>preview</string>
    <string>--port</string><string>43871</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$STATE_DIR/challenge-ui.log</string>
  <key>StandardErrorPath</key><string>$STATE_DIR/challenge-ui.err</string>
</dict>
</plist>
PLIST
plutil -lint "$PLIST" >/dev/null
UID_VALUE="$(id -u)"
launchctl bootout "gui/$UID_VALUE" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$UID_VALUE" "$PLIST"
launchctl kickstart -k "gui/$UID_VALUE/$LABEL"

# Do not tell the user the preview is ready until the actual HTTP health check works.
HEALTH_OK=0
for _ in $(seq 1 30); do
  if /usr/bin/curl -fsS --max-time 1 "http://127.0.0.1:43871/health" >/dev/null 2>&1; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done
if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "Coding challenge preview failed to become healthy." >&2
  echo "LaunchAgent stderr:" >&2
  tail -n 30 "$STATE_DIR/challenge-ui.err" >&2 2>/dev/null || true
  exit 1
fi

cat <<MSG
Burn-in/dev mode is ready.

Coding challenge preview:
  http://127.0.0.1:43871/

It is available DURING burn-in and uses the same 120-problem editor/judge flow,
but preview sessions can never disable or uninstall the blocker.

Brave extension setup:
  1. Enable Developer mode at brave://extensions
  2. Load unpacked and select:
     $ROOT_DIR
  3. The popup should show "Test coding challenge" and judge status READY.

Nothing anti-removal is installed in this stage. The extension and preview
LaunchAgent remain easy to remove. To stop only the preview service:
  bash "$ROOT_DIR/macos/stop-preview.sh"
MSG
open -a "Brave Browser" "brave://extensions"
