#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$HOME/.youtube-focus-lock"
mkdir -p "$STATE_DIR"
date +%s > "$STATE_DIR/burnin-started-at"

if [[ ! -d "/Applications/Brave Browser.app" ]]; then
  echo "Brave Browser was not found in /Applications. Install/open Brave first." >&2
  exit 1
fi

cat <<MSG
Development/burn-in mode is ready.

1. Brave will open brave://extensions.
2. Enable Developer mode.
3. Choose "Load unpacked" and select:
   $ROOT_DIR
4. Confirm the extension popup says YouTube is blocked/allowed as expected.
5. Leave it installed for at least 60 clean minutes before preparing lock mode.

Nothing anti-removal has been installed yet. You can remove the extension normally during burn-in.
MSG
open -a "Brave Browser" "brave://extensions"
