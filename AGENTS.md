# AGENTS.md — Custom Extensions Collection

This repository is the canonical home for small Brave/Chromium extensions owned by this project.

## First read

Before changing code or adding an extension, read:

1. `README.md`
2. `HANDOFF.md`
3. `docs/POLICIES.md`
4. `specs/PDD.md`
5. `specs/SDD.md`
6. `extensions/registry.json`
7. the target extension's `README.md` and `specs/` when present

Do not rely on prior chat/session memory when repository state or observed execution disagrees.

## Repository model

`extensions/<slug>/` is the deployable boundary. Each extension must be loadable independently in Brave/Chromium and must not depend on sibling extension directories at runtime.

The repository shares process and conventions first. Do **not** create a shared runtime library merely because two extensions both have a popup, content script, storage helper, or test helper. Promote code into `shared/` only when at least two live extensions need the same semantics and duplication has become an actual maintenance problem.

## SDD / PDD change rule

Update specs before or with changes to user-visible behavior, permissions/host permissions, destructive-action semantics, persistence/resume behavior, extraction completeness claims, export schemas, cross-context messaging, retries/idempotency/dedupe, or security/privacy boundaries.

Implementation-only refactors inside frozen behavior do not require semantic spec changes.

## Risk classes

Every registry entry declares one:

- `read-export`: reads user-visible/session-authorized page data and exports locally;
- `stateful`: changes extension-local state or performs background workflows without changing remote account data;
- `destructive`: changes/deletes remote or local user data.

Destructive extensions require dry-run/preview where feasible, explicit confirmation, frozen target sets for bulk operations, fail-closed parsing, and tests for boundary conditions.

## Browser-extension policy

- Manifest V3 unless a documented blocker requires otherwise.
- Narrow `host_permissions`; never use `<all_urls>` by convenience.
- Request only permissions exercised by code.
- No credentials, cookie theft, login automation, CAPTCHA handling, anti-detection, or bypass of access controls.
- No external telemetry or remote execution unless explicitly specified, visible to the user, and reviewed.
- Treat site DOM and internal/private endpoints as unstable adapters, not durable contracts.
- Selector/API drift should fail visibly, not silently produce misleading output or destructive behavior.

## Evidence discipline

Use these states precisely:

- `IMPORTED_TEST_REPORT`: an imported archive contains a prior report.
- `LOCAL_TESTED`: tests were run in the current working tree and passed.
- `LIVE_SMOKE_REQUIRED`: deterministic tests pass but the current site/browser UI has not yet been exercised.
- `LIVE_SMOKE_PASSED`: a real Brave/Chromium run was observed and recorded.

Do not claim a live browser result from deterministic tests alone.

## Agent allocation

### Spec/assurance role

Owns PDD/SDD, properties, permissions, acceptance criteria, deterministic/property/adversarial test design, and review of observed failures.

### Execution role

A command-capable agent owns syntax/test runs, packaging checks, live browser smoke tests when available, and exact result recording. It may fix implementation defects but must not weaken properties or destructive gates simply to make tests pass.

## Adding an extension

Follow `docs/ADDING_AN_EXTENSION.md`. At minimum add a manifest, README, implementation, deterministic tests, per-extension PDD/SDD, and a registry entry.

Small imported historical utilities may initially lack per-extension specs, but any substantive modification should add them before semantic changes.

## Continuity protocol

Before ending substantive work:

1. run the checks you can actually execute;
2. update `docs/STATUS.md` and `HANDOFF.md` with verified vs unverified state;
3. update `extensions/registry.json` when versions/status/permissions change;
4. make the next action executable without conversation history;
5. reference the relevant branch/PR/issue when one exists.
