#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT_DIR/extensions/registry.json"
OUT_DIR="${1:-$ROOT_DIR/dist}"

for tool in jq zip unzip sha256sum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required tool not found: $tool" >&2
    exit 1
  fi
done

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

mapfile -t registry_rows < <(jq -r '.extensions[] | [.id, .version, .directory] | @tsv' "$REGISTRY")

if [[ ${#registry_rows[@]} -eq 0 ]]; then
  echo "No extensions found in $REGISTRY" >&2
  exit 1
fi

for row in "${registry_rows[@]}"; do
  IFS=$'\t' read -r extension_id registry_version relative_dir <<<"$row"
  extension_dir="$ROOT_DIR/$relative_dir"
  manifest="$extension_dir/manifest.json"

  if [[ ! -f "$manifest" ]]; then
    echo "Missing manifest for $extension_id: $manifest" >&2
    exit 1
  fi

  manifest_version="$(jq -r '.version // empty' "$manifest")"
  if [[ -z "$manifest_version" || "$manifest_version" != "$registry_version" ]]; then
    echo "Version mismatch for $extension_id: registry=$registry_version manifest=$manifest_version" >&2
    exit 1
  fi

  archive="$OUT_DIR/${extension_id}-v${registry_version}.zip"

  mapfile -t package_files < <(
    cd "$extension_dir"
    find . -type f \
      ! -path './tests/*' \
      ! -path './specs/*' \
      ! -name 'README.md' \
      ! -name 'TEST_REPORT.txt' \
      ! -name 'tests.js' \
      ! -name '.DS_Store' \
      -print | sed 's#^\./##' | LC_ALL=C sort
  )

  if [[ ${#package_files[@]} -eq 0 ]]; then
    echo "No packageable files found for $extension_id" >&2
    exit 1
  fi

  (
    cd "$extension_dir"
    zip -q "$archive" "${package_files[@]}"
  )

  if ! unzip -Z1 "$archive" | grep -Fxq 'manifest.json'; then
    echo "Packaged archive does not contain manifest.json at its root: $archive" >&2
    exit 1
  fi

  echo "Packaged $(basename "$archive")"
done

(
  cd "$OUT_DIR"
  sha256sum ./*.zip > SHA256SUMS.txt
)

echo "Wrote release assets to $OUT_DIR"
