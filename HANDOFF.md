# HANDOFF.md — Custom Extensions

## Checkpoint

- Date: 2026-09-03
- Repository: `Pukujan/custom-extensions`
- Purpose: durable collection of small independently loadable Brave/Chromium extensions
- Bootstrap PR #1: merged to `main`
- Current branch: `release/package-current-extensions`
- Current PR: #3 — `https://github.com/Pukujan/custom-extensions/pull/3`
- Current work: packaged GitHub Release assets and Brave/Chromium download/install documentation for all registered extensions

## Current extension inventory

### ChatGPT 10-Day Cleaner v2.0.0

- directory: `extensions/chatgpt-10-day-cleaner/`
- release asset: `chatgpt-10-day-cleaner-v2.0.0.zip`
- risk class: destructive
- imported archive provenance remains recorded in `extensions/registry.json`
- deterministic/property status: `LOCAL_TESTED`

### LinkedIn Connection Exporter v1.1.0

- directory: `extensions/linkedin-connection-exporter/`
- release asset: `linkedin-connection-exporter-v1.1.0.zip`
- risk class: read-export
- imported archive provenance remains recorded in `extensions/registry.json`
- deterministic status: `LOCAL_TESTED`

### ChatGPT Transcript Exporter v0.1.0

- directory: `extensions/chatgpt-transcript-exporter/`
- release asset: `chatgpt-transcript-exporter-v0.1.0.zip`
- risk class: read-export
- deterministic/property status: `LOCAL_TESTED`
- live-site status remains `LIVE_SMOKE_REQUIRED`

## Packaged release design

`release/current.json` defines bundle tag `extensions-2026.09.03` / title `Custom Extensions — 2026-09-03`.

`scripts/package-extensions.sh` packages every registry entry, requires registry/manifest version agreement, excludes conventional repository-only tests/specs/reports, verifies `manifest.json` is at ZIP root, and writes `SHA256SUMS.txt`.

`.github/workflows/package-release.yml` runs the existing collection tests before packaging and publishing the GitHub Release. It creates the release on first run and refreshes assets idempotently on rerun.

## Evidence state

Bootstrap deterministic verification remains the last observed test run recorded in repository state:

- ChatGPT 10-Day Cleaner: 12/12 passed;
- LinkedIn Connection Exporter: 16/16 passed;
- ChatGPT Transcript Exporter: 18/18 passed;
- total: 46 tests passed.

The new packaging/release workflow has not yet been claimed as passed in this checkpoint. Its first authoritative run should occur from `main` after PR #3 merges.

## Exact next actions

1. Merge PR #3.
2. Confirm the `Package extension release` GitHub Actions run passes all registered tests and packaging checks.
3. Confirm GitHub Release `extensions-2026.09.03` exists with all three versioned ZIPs plus `SHA256SUMS.txt`.
4. Record the workflow/release evidence in `docs/STATUS.md` and this handoff.
5. Download `chatgpt-transcript-exporter-v0.1.0.zip`, extract it, and load it in Brave with **Load unpacked**.
6. Smoke-test a short ChatGPT thread and a genuinely long/virtualized thread, including Markdown and JSON downloads and partial-warning behavior.
7. Only after observed live browser evidence should the transcript exporter move from `LIVE_SMOKE_REQUIRED` to `LIVE_SMOKE_PASSED`.

## Do not repeat

- do not commit generated ZIP binaries to the Git tree; publish them as release assets;
- do not package all utilities into one browser manifest;
- do not create cross-extension runtime dependencies for release convenience;
- do not broaden extension permissions for packaging;
- do not treat successful packaging as a live-site smoke test;
- do not reuse a collection release tag for materially different source; bump `release/current.json` instead.
