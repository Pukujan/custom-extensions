# Status

## Release packaging — 2026-09-20

### Published and verified

The registry has four extensions, and `release/current.json` identifies the published bundle `extensions-2026.09.20` / `Custom Extensions — 2026-09-20`. The release was published from merge commit `758614cab6f809832d5033fee2ab124b05f96142` by workflow run `35568497252`.

The canonical Node packager uses only built-in modules and runs on this Windows checkout as well as CI. The legacy Bash wrapper's stored Git blob also passes `bash -n`; on this checkout, `core.autocrlf=true` makes direct `bash -n scripts/package-extensions.sh` see CRLF, which is checkout-local.

Local verification on 2026-09-20: all four registered suites passed (103 tests total); registry/manifest version checks passed; JSON parsing passed; release coverage checks passed after metadata alignment; `bash -n scripts/package-extensions.sh` passed after the line-ending fix.

The new cross-platform packager was also verified locally with `node --check scripts/package-extensions.mjs`, `node scripts/package-extensions.mjs --help`, and two independent `--out` runs. Both runs produced the four expected ZIPs with identical SHA-256 values; checksum recomputation passed; every archive had `manifest.json` at its root and excluded `tests/` and `specs/`. The temporary output directories were removed after verification. After this change, `node scripts/test-all.mjs` returned exit `0` with all registered extension suites passed (`103` tests total, including `57` provenance tests). Release metadata is now validated/emitted by `scripts/read-release-metadata.mjs`, removing the workflow's `jq` dependency.

The GitHub Release contains four versioned ZIPs and `SHA256SUMS.txt`; release assets are not committed to the Git tree. The generated-response observer saw a real `text/event-stream` request whose body was unavailable to the page-level hook, so no SSE frames are claimed. The required unpacked-MV3 smoke and authorized observer smokes are recorded as passed.

Published asset checksums:

- `chatgpt-10-day-cleaner-v2.0.0.zip` — SHA-256 `75be9bfd162e7f3d11ab9c0f6a0094e560e113e50a088a720bb38191d0028962`;
- `chatgpt-provenance-exporter-v0.1.0.zip` — SHA-256 `6b63e6e33af8607b5cff56f1549e97dca3a6ffbc3ff894cca914435cd1aa7bd6`;
- `chatgpt-transcript-exporter-v0.1.0.zip` — SHA-256 `694f7bfb3d44582569aaed49aafd974b4979df9cd32e4dd6306da2ab31c5725b`;
- `linkedin-connection-exporter-v1.1.0.zip` — SHA-256 `c388964774ff08e8d13790c5027cb106237fefcb1e475adaaec3c88f2c92c90e`;
- `SHA256SUMS.txt` — published with the release.

### Implemented and merged

PR #3 (`Package all current extensions as GitHub Release assets`) is merged to `main` at commit `7ba4f8e54d6e7b1c383cade76916cb746b1271c6`.

Implemented:

- reproducible `scripts/package-extensions.sh` packager for every extension registered in `extensions/registry.json`;
- registry/manifest version consistency check before packaging;
- one Brave/Chromium Developer-mode ZIP per extension with `manifest.json` at archive root;
- SHA-256 checksum generation;
- `release/current.json` bundle descriptor and release notes;
- GitHub Actions workflow that runs all extension tests, builds ZIPs, and creates/refreshes the GitHub Release;
- root, per-extension, contributor, release, and architecture documentation for packaged downloads.

### Observed GitHub Actions verification

Workflow: `Package extension release`, run `33825192190`, executed from `main` after PR #3 merged.

Observed results:

- ChatGPT 10-Day Cleaner: **12/12 passed**, including 25,000 randomized eligibility cases;
- LinkedIn Connection Exporter: **16/16 passed**;
- ChatGPT Transcript Exporter: **18/18 passed**, including randomized dedupe/order coverage;
- collection runner: **all registered extension test suites passed**;
- all three versioned ZIPs packaged successfully;
- release metadata validation passed;
- GitHub Release publication passed;
- Actions artifact upload passed.

Total deterministic/property tests observed in this workflow: **46 passed**.

### Published release

GitHub Release `extensions-2026.09.03` / `Custom Extensions — 2026-09-03` was published from commit `7ba4f8e54d6e7b1c383cade76916cb746b1271c6` with:

- `chatgpt-10-day-cleaner-v2.0.0.zip` — SHA-256 `500d133bd5c855f2af4cd492b348cf4fe69e85faf0776fb93c9b119fe11a9dad`;
- `chatgpt-transcript-exporter-v0.1.0.zip` — SHA-256 `dd0abbb48bc00f42742b80ce4a09fd69171d8d3cabf649774ebc0dd4479471de`;
- `linkedin-connection-exporter-v1.1.0.zip` — SHA-256 `33d0779ef0742700d2c96a9c48fc30124548ef6360aa4fcb1ccc836684aacb47`;
- `SHA256SUMS.txt`.

Packaging/release success does not change live-site verification status.

## ChatGPT Provenance Exporter — current state

The PROV-0001 single-conversation pilot and PROV-0002 independent holdout both passed and are frozen. Aggregate-only evidence showed source conservation, lineage and pointer validity, raw-backed tool records, citations, integrity hashes, rendered-stability checks, pause/resume/reset behavior, and scroll restoration. Private transcript contents, raw IDs, bundles, and live event bodies are not stored in Git.

For a captured bundle, use the normalized indexes for evidence review:

- `normalized/tool-events.jsonl` contains the source-backed tool-call and tool-result records;
- `normalized/citations.jsonl` contains source-backed citation records where exposed;
- `rendered/transcript.md` is the readable rendered transcript and is not the complete raw-backed tool/source view.

Capture controls support pause, resume, and reset. Pause freezes the active run and its displayed progress; resume continues the same run; reset cancels the active run, clears persisted progress, and prevents stale progress from being written afterward.

The deterministic ontology, account-export design, official-import design, client-event observer, and portable trace adapter gates are green. The built-in-browser full-CDP pilot now passes the aggregate source/tool/citation/hash/rendered/pause-reset/scroll checks, the required unpacked-MV3 smoke is recorded as passed, and the authorized observer smokes captured persisted conversation activity plus one generated-response `text/event-stream` request with credential filtering and hook restoration. The page-level hook could not read the stream body, so no SSE frames are claimed; account-wide export and real official-export import remain deferred.

## Content-system contract

The repository contains the reviewed non-destructive story, responsive HTML review page, and two repository-specific raster assets from `content-generation-modules` v0.1.2 at `cb8c18fa7789e4b651e1f963892bf056b0d3276d`.

Narrative raster assets use a repeatable **short title + short subtitle** contract. SVGs, logos, and tiny helper graphics remain text-free. The canonical README uses the reviewed story and images; the preview has been checked at desktop, tablet, and mobile widths and rendered to a local PDF packet. This content review does not claim GitHub or Brave live-site evidence.

## Collection bootstrap — 2026-09-01

### Implemented

- repository collection architecture and policies;
- `AGENTS.md` and durable `HANDOFF.md` continuity protocol;
- machine-readable extension registry;
- imported ChatGPT 10-Day Cleaner v2 source;
- imported LinkedIn Connection Exporter v1.1 source;
- ChatGPT Transcript Exporter v0.1 implementation/spec/tests;
- ChatGPT Provenance Exporter v0.1 implementation/spec/tests and aggregate-only pilot/holdout evidence.

### Prior observed local verification

Executed from the collection root on 2026-09-01:

```bash
node scripts/test-all.mjs
```

Observed results matched the later release workflow: 12 + 16 + 18 = 46 tests passed.

### Still unverified

- live Brave smoke test of ChatGPT Transcript Exporter on the current ChatGPT UI;
- short-thread vs long/virtualized-thread export comparison;
- actual browser download behavior and formatting fidelity on live ChatGPT;
- current live-site smoke reruns of the two imported extensions.
