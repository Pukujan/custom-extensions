# HANDOFF.md — Custom Extensions

<!-- continuity:current {"active_task":null,"active_task_file":null,"protocol_version":"0.1.0-draft","schema":"project-continuity.current.v1"} -->

> Continuity v1: this file remains the canonical mutable repository checkpoint. On `main`, no root continuity task is active; the ChatGPT Provenance Exporter work described below remains intentionally branch-local on `feature/chatgpt-provenance-exporter` with its own canonical task/checkpoint.

## Checkpoint

- Date: 2026-09-03
- Repository: `Pukujan/custom-extensions`
- Purpose: durable collection of small independently loadable Brave/Chromium extensions
- Bootstrap PR #1: merged to `main`
- Packaged-release PR #3: merged to `main`
- Release commit: `7ba4f8e54d6e7b1c383cade76916cb746b1271c6`
- Published release: `extensions-2026.09.03` — `Custom Extensions — 2026-09-03`
- Release workflow run: `33825192190` — success

## Active project — ChatGPT Provenance Exporter

A new high-value project is active but intentionally **not merged to main yet** because its deterministic/local and live-browser validation gates have not been observed.

- project: ChatGPT Provenance Exporter
- branch: `feature/chatgpt-provenance-exporter`
- GitHub issue: #6 — `PROV-0001: Validate single-conversation ChatGPT provenance capture`
- draft PR: #7 — `PROV-0001: add single-conversation ChatGPT provenance exporter`
- registry state on feature branch: `IMPLEMENTED_UNVERIFIED / LIVE_SMOKE_REQUIRED / HOLDOUT_REQUIRED`

### Fresh-session read order

A new agent continuing this project should switch/read the feature branch and then read:

1. `extensions/chatgpt-provenance-exporter/PROJECT.md`
2. `extensions/chatgpt-provenance-exporter/AGENTS.md`
3. `extensions/chatgpt-provenance-exporter/checkpoints/CURRENT.md`
4. `extensions/chatgpt-provenance-exporter/tasks/TASK-PROV-0001-pilot-capture.md`
5. `extensions/chatgpt-provenance-exporter/docs/LOCAL_VALIDATION_LUNA.md`
6. only the relevant PDD/SDD/TDD section needed for the next action.

The exact next action is local deterministic test execution followed by one large, tool-heavy Brave/ChatGPT pilot capture. Do **not** begin bulk account export or ontology tuning until PROV-0001 and the independent PROV-0002 holdout gate are satisfied.

The task file and checkpoint are canonical execution state. Issue #6 and PR #7 are coordination mirrors.

---

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

## Content-system preview — branch-local

- branch: `task/TASK-0016-content-system-preview`
- helper: `content-generation-modules` v0.1.2 at commit `cb8c18fa7789e4b651e1f963892bf056b0d3276d`
- review files: `docs/content-system-preview.md`, `docs/content-system-preview.html`
- generated assets: `docs/content-system-assets/hero.png`, `docs/content-system-assets/supporting-square.png`
- visual rule: narrative raster assets carry one short title and subtitle; SVGs and tiny helper graphics remain text-free
- validation: existing collection tests plus responsive desktop/tablet/mobile screenshots and PDF packet rendered locally; README promotion is staged on the same branch
- next action: inspect the updated README in PR #9, then merge only after human review
