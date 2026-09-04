# HANDOFF.md — Custom Extensions

## Checkpoint

- Date: 2026-09-03
- Repository: `Pukujan/custom-extensions`
- Purpose: durable collection of small independently loadable Brave/Chromium extensions
- Bootstrap PR #1: merged to `main`
- Packaged-release PR #3: merged to `main`
- Release commit: `7ba4f8e54d6e7b1c383cade76916cb746b1271c6`
- Published release: `extensions-2026.09.03` — `Custom Extensions — 2026-09-03`
- Release workflow run: `33825192190` — success

## Current extension inventory

### ChatGPT 10-Day Cleaner v2.0.0

- directory: `extensions/chatgpt-10-day-cleaner/`
- release asset: `chatgpt-10-day-cleaner-v2.0.0.zip`
- SHA-256: `500d133bd5c855f2af4cd492b348cf4fe69e85faf0776fb93c9b119fe11a9dad`
- risk class: destructive
- deterministic/property status: `LOCAL_TESTED`

### LinkedIn Connection Exporter v1.1.0

- directory: `extensions/linkedin-connection-exporter/`
- release asset: `linkedin-connection-exporter-v1.1.0.zip`
- SHA-256: `33d0779ef0742700d2c96a9c48fc30124548ef6360aa4fcb1ccc836684aacb47`
- risk class: read-export
- deterministic status: `LOCAL_TESTED`

### ChatGPT Transcript Exporter v0.1.0

- directory: `extensions/chatgpt-transcript-exporter/`
- release asset: `chatgpt-transcript-exporter-v0.1.0.zip`
- SHA-256: `dd0abbb48bc00f42742b80ce4a09fd69171d8d3cabf649774ebc0dd4479471de`
- risk class: read-export
- deterministic/property status: `LOCAL_TESTED`
- live-site status remains `LIVE_SMOKE_REQUIRED`

## Packaged release design

`release/current.json` defines the active collection bundle tag/title.

`scripts/package-extensions.sh` packages every registry entry, requires registry/manifest version agreement, excludes conventional repository-only tests/specs/reports, verifies `manifest.json` is at ZIP root, and writes `SHA256SUMS.txt`.

`.github/workflows/package-release.yml` runs the collection tests before packaging and publishing the GitHub Release. A change to `release/current.json` on `main` publishes a new bundle; manual reruns refresh the named release idempotently.

## Observed release evidence

GitHub Actions run `33825192190` executed from `main` and completed successfully.

Observed test results:

- ChatGPT 10-Day Cleaner: 12/12 passed;
- LinkedIn Connection Exporter: 16/16 passed;
- ChatGPT Transcript Exporter: 18/18 passed;
- total: 46 tests passed;
- all three ZIPs packaged successfully;
- GitHub Release publication succeeded;
- workflow artifact upload succeeded.

The published GitHub Release contains the three versioned ZIPs plus `SHA256SUMS.txt`.

## Exact next actions

1. Download `chatgpt-transcript-exporter-v0.1.0.zip` from release `extensions-2026.09.03`.
2. Optionally verify SHA-256 against `SHA256SUMS.txt`.
3. Extract it and load the folder in Brave via `brave://extensions/` → **Developer mode** → **Load unpacked**.
4. Smoke-test a short ChatGPT thread and a genuinely long/virtualized thread.
5. Verify Markdown and JSON downloads, beginning/middle/end ordering, code blocks, links, roles, filename, scroll restoration, and partial-warning behavior.
6. Only after observed live browser evidence should the transcript exporter move from `LIVE_SMOKE_REQUIRED` to `LIVE_SMOKE_PASSED`.
7. For a future bundle, update extension/registry versions as needed and change `release/current.json` to a new unique collection tag/title.

## Do not repeat

- do not commit generated ZIP binaries to the Git tree; publish them as release assets;
- do not package all utilities into one browser manifest;
- do not create cross-extension runtime dependencies for release convenience;
- do not broaden extension permissions for packaging;
- do not treat successful packaging as a live-site smoke test;
- do not reuse a collection release tag for materially different source; bump `release/current.json` instead.
