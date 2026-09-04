# Status

## Release packaging — 2026-09-03

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

## Collection bootstrap — 2026-09-01

### Implemented

- repository collection architecture and policies;
- `AGENTS.md` and durable `HANDOFF.md` continuity protocol;
- machine-readable extension registry;
- imported ChatGPT 10-Day Cleaner v2 source;
- imported LinkedIn Connection Exporter v1.1 source;
- ChatGPT Transcript Exporter v0.1 implementation/spec/tests.

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
