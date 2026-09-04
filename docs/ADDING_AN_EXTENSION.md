# Adding an Extension

## 1. Choose a slug

Use lowercase kebab-case: `extensions/<slug>/`. The directory is the installable unit; never require Brave to load the repository root.

## 2. Write the spec first

Create `README.md`, `specs/PDD.md`, and `specs/SDD.md`. The PDD defines user problem, scope/non-goals, risk class, observable properties, and acceptance criteria. The SDD defines browser contexts, message/state flow, permissions, site adapters, failure semantics, and test strategy.

## 3. Keep permissions minimal

Start with no permissions. Add each permission only when its corresponding design path exists. Narrow host patterns to the target site.

## 4. Keep runtime isolated

Do not import code from sibling extensions. If reuse becomes real, propose a shared module separately and prove both consumers still package independently.

## 5. Add tests

Prefer dependency-free Node tests for small extensions. At minimum: syntax-check JS files, validate the manifest, test pure extraction/normalization/serialization functions, assert extension-specific safety/completeness properties, and assert architecture/permission invariants.

## 6. Register it

Add the extension to `extensions/registry.json` with id, display name, directory, version, risk class, hosts, purpose, test command, status, and provenance for imported archives when applicable.

## 7. Record live smoke separately

DOM-based extensions are not live-verified merely because fixtures pass. Record real target-site/browser smoke evidence separately from deterministic tests.

## 8. Handoff

Update `HANDOFF.md` before leaving the task so the next session can continue from repository state without reconstructing decisions from chat history.
