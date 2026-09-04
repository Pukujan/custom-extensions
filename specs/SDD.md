# SDD — Custom Extensions Collection

## Architecture

```text
custom-extensions
│
├── repo control plane
│   ├── AGENTS.md
│   ├── HANDOFF.md
│   ├── docs/
│   ├── specs/
│   ├── release/
│   ├── scripts/test-all.mjs
│   ├── scripts/package-extensions.sh
│   └── .github/workflows/package-release.yml
│
└── extensions/
    ├── registry.json
    ├── extension-a/   ← independently loadable
    ├── extension-b/   ← independently loadable
    └── extension-c/   ← independently loadable
```

There is no root browser manifest and no cross-extension background service.

## Deployable boundary

`extensions/<slug>/manifest.json` defines the browser package. All runtime paths in that manifest resolve within the same extension directory.

A release ZIP is a convenience representation of that same deployable boundary. The archive contains `manifest.json` at its root so the extracted folder can be loaded directly with Brave/Chromium Developer mode. Packaging does not create runtime dependencies between extensions.

## Registry

`extensions/registry.json` is inventory/status metadata only. Browser runtime behavior must not depend on the registry.

The release packager uses registry id/version/directory metadata as a build-time inventory and fails if a registry version does not match the corresponding manifest version.

## Test orchestration

`scripts/test-all.mjs` executes each extension's own test command. It does not normalize extension architecture or force a package manager.

The release workflow runs the collection test orchestrator before producing or publishing ZIP assets.

## Packaging and release flow

`scripts/package-extensions.sh` creates one versioned ZIP per registered extension under `dist/`, excluding conventional repository-only tests/specs/reports, and writes `SHA256SUMS.txt`.

`release/current.json` identifies the collection release tag/title and expected assets. `.github/workflows/package-release.yml` is the publication adapter: on a release-descriptor change to `main` or a manual run, it tests, packages, and creates/refreshes the corresponding GitHub Release assets.

GitHub Releases are distribution convenience only. They do not change extension risk class, permissions, runtime architecture, or verification evidence.

## Shared modules

A future `shared/` directory is permitted but absent by default. Shared source must be packaged so each extension remains independently loadable. Direct runtime imports reaching into sibling extension directories are prohibited.

## Documentation state

- Root specs govern collection semantics.
- Per-extension specs govern extension behavior.
- `HANDOFF.md` is the mutable checkpoint.
- `AGENTS.md` is the stable operating contract.
- `docs/STATUS.md` records observed implementation/verification state.
- `docs/RELEASES.md` records packaging and distribution procedure.

## Change control

Changes that alter collection properties, admission boundaries, permission policy, sharing rules, or release/distribution semantics update root PDD/SDD as appropriate. Site-specific behavior changes update the target extension specs.
