#!/bin/bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM" >&2
  echo "Reason: macOS is required." >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ARTIFACT="$REPO_ROOT/youtube-focus-lock/artifacts/YouTube-Focus-Lock-v2.1-PreArm.zip"
EXPECTED="4204a7b01cf838089b0bac9d8dcfc91f350e731c0d39b15c65a901cc6b5e2770"

[[ -f "$ARTIFACT" ]] || {
  echo "PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM" >&2
  echo "Reason: canonical v2.1 artifact is missing: $ARTIFACT" >&2
  exit 2
}

ACTUAL="$(shasum -a 256 "$ARTIFACT" | awk '{print $1}')"
[[ "$ACTUAL" == "$EXPECTED" ]] || {
  echo "PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM" >&2
  echo "Reason: artifact SHA mismatch. expected=$EXPECTED actual=$ACTUAL" >&2
  exit 1
}

WORK="${TMPDIR:-/tmp}/youtube-focus-lock-v2.1-prearm"
rm -rf "$WORK"
mkdir -p "$WORK"
unzip -q "$ARTIFACT" -d "$WORK"
CANDIDATE="$WORK/youtube-focus-lock"
[[ -f "$CANDIDATE/docs/LOCAL-AGENT-VALIDATION.md" ]] || {
  echo "PRE-ARM ACCEPTANCE: FAIL — DO NOT ARM" >&2
  echo "Reason: artifact is missing its local-agent validation contract." >&2
  exit 1
}

cd "$CANDIDATE"

echo "Validating canonical artifact: $ARTIFACT"
echo "SHA-256: $ACTUAL"
echo "Extracted candidate: $CANDIDATE"

npm install
bash tests/macos/prearm-acceptance.sh

echo
echo "Deterministic suite completed. Luna must now perform the vision/computer-use rubric in:"
echo "  $CANDIDATE/docs/LOCAL-AGENT-VALIDATION.md"
echo "Do NOT arm until that rubric also passes."
