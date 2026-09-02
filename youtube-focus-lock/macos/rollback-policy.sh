#!/bin/bash
set -euo pipefail

defaults delete com.brave.Browser ExtensionInstallForcelist 2>/dev/null || true
defaults delete com.brave.Browser IncognitoModeAvailability 2>/dev/null || true
rm -f "$HOME/.youtube-focus-lock/extension-id"
echo "Soft-lock Brave policies removed. No LaunchDaemon changes were made."
