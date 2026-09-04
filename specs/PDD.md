# PDD — Custom Extensions Collection

## Problem

Small personal browser extensions are easy to create in one-off AI sessions and easy to lose across chat history, downloaded ZIPs, and separate repositories. The result is weak provenance, duplicated setup, forgotten safety constraints, and no durable handoff for the next coding session.

## Product intent

`custom-extensions` is a lightweight collection repository for independently installable Brave/Chromium utilities. It should make “build one more tiny extension” cheap without turning the collection into a monolithic browser product.

## Core properties

### P-COL-001 — Independent installability
Every extension can be loaded from its own directory without sibling runtime dependencies.

### P-COL-002 — Failure isolation
A site/API break in one extension cannot prevent another extension from loading.

### P-COL-003 — Least privilege
Each extension declares only permissions and host scopes required by its current behavior.

### P-COL-004 — Local-first privacy
No extension sends collected page content to an external service unless that behavior is explicitly specified and user-visible.

### P-COL-005 — Durable continuity
A fresh agent can determine current architecture, status, verification gaps, and next actions from repository files without prior conversation history.

### P-COL-006 — Shared-code restraint
Runtime code remains extension-local until repeated actual reuse justifies a shared abstraction.

### P-COL-007 — Evidence-aware status
Historical reports, current deterministic tests, and live browser smoke tests are recorded as distinct evidence states.

## Non-goals

- one manifest that bundles every utility;
- publishing all extensions as one Chrome Web Store product;
- a universal scraping framework;
- a mandatory build system/package manager for tiny dependency-free extensions;
- automatic remote telemetry;
- centralizing unrelated site semantics in a common runtime.

## Admission rule

A small extension belongs here when it is a focused browser utility with a narrow host/feature scope and independent load-unpacked lifecycle. Move it to a dedicated repository only when it develops an independent release cadence, substantial dependencies/build chain, multiple maintainers, external consumers, or product-level lifecycle that makes collection coupling harmful.
