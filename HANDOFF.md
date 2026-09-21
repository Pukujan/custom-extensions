# HANDOFF.md — Custom Extensions

## Checkpoint

- Date: 2026-09-20
- Repository: `Pukujan/custom-extensions`
- Purpose: durable collection of small independently loadable Brave/Chromium extensions
- Bootstrap PR #1: merged to `main`
- Packaged-release PR #3: merged to `main`
- Release commit: `7ba4f8e54d6e7b1c383cade76916cb746b1271c6`
- Published release: `extensions-2026.09.03` — `Custom Extensions — 2026-09-03`
- Prepared next release descriptor: `extensions-2026.09.20` — `Custom Extensions — 2026-09-20` (not published from this branch)
- Release workflow run: `33825192190` — success

## Current extension inventory

### ChatGPT Provenance Exporter — current validation state

- directory: `extensions/chatgpt-provenance-exporter/`
- risk class: read-export
- PROV-0001 pilot: **passed**
- PROV-0002 independent holdout: **passed**
- aggregate-only evidence remains outside Git; no private transcript contents are included here
- the source-backed tool index is `normalized/tool-events.jsonl`
- the source-backed citation/source index is `normalized/citations.jsonl`
- `rendered/transcript.md` is a readable rendered transcript, not the complete raw-backed tool/source view
- pause, resume, and reset are supported for active capture; reset cancels the active run and clears its persisted progress
- built-in-browser full-CDP pilot validation: **passed** through the approved `cdp` capability; one authorized persisted-fetch observer smoke also passed, with streaming/SSE observation separately gated
- packaging readiness: registry and manifest are aligned; the prepared release descriptor includes this extension

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

`release/current.json` defines the prepared collection bundle tag/title.

`scripts/package-extensions.mjs` is the canonical cross-platform packager for every registry entry. It requires registry/manifest version agreement, excludes conventional repository-only tests/specs/reports, verifies `manifest.json` is at ZIP root, and writes `SHA256SUMS.txt`. `scripts/package-extensions.sh` remains a legacy Unix wrapper.

`.github/workflows/package-release.yml` runs the collection tests, Node packager, and Node release-metadata validator before publishing the GitHub Release. A change to `release/current.json` on `main` publishes a new bundle; manual reruns refresh the named release idempotently. This branch has not published the prepared bundle.

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

## Active provenance next action

The active project is the ChatGPT Provenance Exporter. The v0.1 pilot/holdout baseline is frozen and accepted. The user has explicitly authorized the controlled account run, which is currently paused after six valid per-conversation bundles were written under the controlled account folder. The canonical next action is to resume that same run, wait for account-level `manifest.json`, catalog, and SHA-256 index finalization, and then validate them. Do not reset the run or start a second bulk run unless the existing checkpoint is intentionally discarded. Official-import work still waits for a user-supplied ZIP.

## Other collection maintenance (not the active provenance task)

1. Download `chatgpt-transcript-exporter-v0.1.0.zip` from release `extensions-2026.09.03`.
2. Optionally verify SHA-256 against `SHA256SUMS.txt`.
3. Extract it and load the folder in Brave via `brave://extensions/` → **Developer mode** → **Load unpacked**.
4. Smoke-test a short ChatGPT thread and a genuinely long/virtualized thread.
5. Verify Markdown and JSON downloads, beginning/middle/end ordering, code blocks, links, roles, filename, scroll restoration, and partial-warning behavior.
6. Only after observed live browser evidence should the transcript exporter move from `LIVE_SMOKE_REQUIRED` to `LIVE_SMOKE_PASSED`.
7. Before publishing, review the prepared `release/current.json` and `release/RELEASE_NOTES.md`; then merge to `main` or run the workflow manually.

## Do not repeat

- do not commit generated ZIP binaries to the Git tree; publish them as release assets;
- do not package all utilities into one browser manifest;
- do not create cross-extension runtime dependencies for release convenience;
- do not broaden extension permissions for packaging;
- do not treat successful packaging as a live-site smoke test;
- do not reuse a collection release tag for materially different source; bump `release/current.json` instead.
