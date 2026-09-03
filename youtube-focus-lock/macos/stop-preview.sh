#!/bin/bash
set -euo pipefail
LABEL="com.youtube-focus-lock.challenge-ui"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
UID_VALUE="$(id -u)"
launchctl bootout "gui/$UID_VALUE" "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "YouTube Focus Lock preview coding service stopped. The Brave extension was not changed."
