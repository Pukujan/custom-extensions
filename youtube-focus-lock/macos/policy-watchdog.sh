#!/bin/bash
set -euo pipefail

TARGET_USER="__TARGET_USER__"
EXTENSION_ID="__EXTENSION_ID__"
UPDATE_URL="https://clients2.google.com/service/update2/crx"

/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults write com.brave.Browser ExtensionInstallForcelist -array "$EXTENSION_ID;$UPDATE_URL"
/usr/bin/sudo -u "$TARGET_USER" /usr/bin/defaults write com.brave.Browser IncognitoModeAvailability -integer 1
