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
│   └── scripts/test-all.mjs
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

## Registry

`extensions/registry.json` is inventory/status metadata only. Browser runtime behavior must not depend on the registry.

## Test orchestration

`scripts/test-all.mjs` executes each extension's own test command. It does not normalize extension architecture or force a package manager.

## Shared modules

A future `shared/` directory is permitted but absent by default. Shared source must be packaged so each extension remains independently loadable. Direct runtime imports reaching into sibling extension directories are prohibited.

## Documentation state

- Root specs govern collection semantics.
- Per-extension specs govern extension behavior.
- `HANDOFF.md` is the mutable checkpoint.
- `AGENTS.md` is the stable operating contract.
- `docs/STATUS.md` records observed implementation/verification state.

## Change control

Changes that alter collection properties, admission boundaries, permission policy, or sharing rules update root PDD/SDD first. Site-specific behavior changes update the target extension specs.
