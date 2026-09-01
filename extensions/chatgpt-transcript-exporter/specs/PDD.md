# PDD — ChatGPT Transcript Exporter

## Problem

Large ChatGPT threads are difficult to preserve reliably by manual selection/copy. Share links are not always accessible to downstream tooling, and naïve DOM exporters can truncate virtualized conversations without making that failure obvious.

## User outcome

From an already open, authorized ChatGPT conversation, one extension action produces a local Markdown or JSON transcript suitable for archival, later review, or ingestion into another local knowledge workflow.

## Risk class

`read-export`. The extension reads rendered conversation content from the active `chatgpt.com` page and writes a local download. It does not modify account data.

## Properties

### P-EXP-001 — Source order preserved
Every harvested turn appears in chronological turn order when ChatGPT exposes turn indexes; otherwise the exporter preserves first-seen top-to-bottom order.

### P-EXP-002 — Stable deduplication
The same rendered turn encountered repeatedly during virtualized scrolling appears once in the final transcript.

### P-EXP-003 — No false completeness claim
The export is labeled complete only after two consecutive bounded full sweeps observe the same non-empty stable turn-key set. Otherwise it is explicitly marked partial/not established.

### P-EXP-004 — Long-runner independent of popup lifecycle
Closing the popup after starting export does not stop harvesting; the content script owns the sweep.

### P-EXP-005 — Scroll restoration
The extension restores the user's pre-export scroll position after harvesting, including failure paths after a sweep starts.

### P-EXP-006 — Streaming guard
If ChatGPT is actively streaming a response, export refuses to start rather than capture a transient half-turn.

### P-EXP-007 — Local-only transcript handling
Transcript content is not sent to third-party servers or telemetry endpoints.

### P-EXP-008 — Selector drift fails visibly
If no recognizable non-empty user/assistant turns are found, no misleading successful transcript is emitted.

### P-EXP-009 — Minimal authority
The extension requests only active-tab, local storage, download, and `chatgpt.com` host access needed by the design.

## Non-goals

- exporting every conversation in the account;
- accessing deleted or hidden chats;
- exporting regenerated branches not currently selected/renderable by ChatGPT;
- capturing private chain-of-thought not shown in the UI;
- calling undocumented ChatGPT backend APIs;
- uploading archives to a service;
- guaranteeing future DOM compatibility without maintenance.

## Acceptance

Deterministic/property tests must pass. Live release readiness additionally requires a Brave smoke test on at least one short and one long conversation, with manual comparison of beginning/middle/end turn order and completeness labeling.
