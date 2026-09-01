# HANDOFF.md — Custom Extensions

## Checkpoint

- Date: 2026-09-01
- Repository: `Pukujan/custom-extensions`
- Purpose: durable collection of small independently loadable Brave/Chromium extensions
- Repo state before bootstrap: empty repository
- Current work: collection conventions, two imported extensions, ChatGPT transcript exporter

## Imported source archives

### ChatGPT 10-Day Cleaner v2

- original archive: `chatgpt-10-day-cleaner-v2(1).zip`
- SHA-256: `9bf72f8a8c2fd1843d02ebc77258ff51a7ed69139e3a417c655435d65d4f19cc`
- destination: `extensions/chatgpt-10-day-cleaner/`
- imported archive includes a 2026-08-30 report claiming 12 invariant/property tests passed
- current collection rerun observed: 12/12 tests passed; status `LOCAL_TESTED`

### LinkedIn Connection Exporter v1.1

- original archive: `linkedin_connection_exporter_v1.1_tested(2).zip`
- SHA-256: `9bd6b97a7325edd3880902bf3c6bd0f913330b7e0b3aed70d4844a40e10f70a2`
- destination: `extensions/linkedin-connection-exporter/`
- current collection rerun observed: 16/16 tests passed; status `LOCAL_TESTED`

## New extension

`extensions/chatgpt-transcript-exporter/` exports the active ChatGPT conversation as Markdown or structured JSON without manual select-all/copy.

Long ChatGPT threads can be virtualized, so “full transcript” uses scroll-and-harvest rather than a one-shot DOM scrape. It deduplicates stable turn identities, performs repeated sweeps, restores the user's scroll position, and warns when stability/completeness was not established.

## Observed bootstrap verification

`node scripts/test-all.mjs` passed all three registered suites: 12 + 16 + 18 = 46 tests. The new exporter remains `LIVE_SMOKE_REQUIRED`.

## Exact next actions

1. Load `extensions/chatgpt-transcript-exporter/` unpacked in Brave.
2. Smoke-test a short thread and a very long thread.
3. Verify Markdown and JSON ordering, code blocks, links, user/assistant roles, filename, and partial-warning behavior.
4. Only then change the exporter registry status to `LIVE_SMOKE_PASSED`.
5. Future small extensions go in this same repository unless they develop an independent product/release lifecycle.

## Do not repeat

- no one-repo-per-tiny-extension by default;
- no monolithic manifest or shared background process across unrelated extensions;
- no premature shared library;
- no broad host permissions for convenience;
- no “full export” claim from a single DOM snapshot on virtualized threads;
- no chat-only design decisions without updating repo docs/specs/handoff.
