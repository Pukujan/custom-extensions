# Collection Policies

## Extension boundary

Each directory under `extensions/` is an independently installable extension. A broken or changing site adapter in one extension must not break another extension.

## Shared code admission

Default: duplicate a small helper rather than couple unrelated extensions. Promote code into a root `shared/` area only when at least two current extensions need materially identical semantics, the API can remain site-neutral, independent packaging remains intact, and all consumers have compatibility tests.

## Permissions

- Every permission must have a current code path that uses it.
- Every host permission must be the narrowest site pattern practical.
- `<all_urls>` is prohibited unless a documented cross-site requirement genuinely needs it.
- Adding `cookies`, `webRequest`, debugger-style access, native messaging, or broad scripting requires explicit design review.

## Privacy and local-first behavior

Default behavior is local-only. Extensions must not transmit collected page data to third-party services unless the specification says so and the UI makes the transmission explicit. Do not add telemetry by default.

## Site adapters are unstable

DOM selectors and undocumented web endpoints are adapters. Keep them isolated and replaceable. Prefer semantic `data-*`, role, label, URL, and structural selectors over generated CSS classes. Selector/API drift must fail visibly; destructive extensions must fail closed.

## Destructive operations

Bulk delete/modify actions require, where feasible: dry run/preview, explicit confirmation, frozen target set between preview and action, deduplication, deterministic progress accounting, fail-closed invalid identifiers/timestamps, and defined resume semantics when work can outlive popup context.

## Read/export operations

Exporters should preserve source ordering and as much source fidelity as practical, include source metadata, and state limitations. If completeness cannot be established, mark the export partial/warning rather than imply full capture.

## No access-control circumvention

Extensions may operate on pages/data the user is already authorized to view in the active browser session. Do not add credential capture, CAPTCHA bypass, anti-detection, account takeover, or access-control circumvention.

## Test evidence

Match tests to risk: deterministic fixtures for parsers/serializers; property/randomized tests for ordering/dedupe/idempotency; state/boundary invariants for destructive flows; fixtures plus live smoke for site extraction; manifest assertions for permission changes. A historical test report is evidence about that archive, not automatic evidence about future edits.
