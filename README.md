# Custom Extensions

A collection of small, independently loadable Brave/Chromium extensions.

This repository is the durable home for browser utilities that would otherwise be scattered across chat sessions and downloaded ZIPs. Each extension remains its own deployable unit under `extensions/`; the repository shares engineering policy, specifications, testing conventions, and handoff state rather than forcing unrelated extensions into one runtime.

## Collection layout

```text
custom-extensions/
├── AGENTS.md
├── HANDOFF.md
├── README.md
├── docs/
│   ├── ADDING_AN_EXTENSION.md
│   ├── POLICIES.md
│   └── STATUS.md
├── specs/
│   ├── PDD.md
│   └── SDD.md
├── scripts/
│   └── test-all.mjs
└── extensions/
    ├── registry.json
    ├── chatgpt-10-day-cleaner/
    ├── linkedin-connection-exporter/
    └── chatgpt-transcript-exporter/
```

## Current extensions

| Extension | Purpose | Risk class | Status |
| --- | --- | --- | --- |
| `chatgpt-10-day-cleaner` | Dry-run and delete old ChatGPT conversations | destructive | imported + local tests passed |
| `linkedin-connection-exporter` | Export visible LinkedIn connection rows to CSV/TSV | read/export | imported + local tests passed |
| `chatgpt-transcript-exporter` | Export the active ChatGPT thread to Markdown or JSON, including long virtualized threads | read/export | local deterministic/property tests passed; live Brave smoke test required |

Machine-readable details live in `extensions/registry.json`.

## Install one extension in Brave

1. Clone or download this repository.
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the specific directory under `extensions/`.

Do not load the repository root as an extension.

## Engineering method

- specification-driven development (SDD) before behavior/contract changes;
- property-driven development (PDD) for correctness and safety invariants;
- deterministic tests for parsers, state transitions, dedupe, ordering, and destructive gates;
- property/randomized tests when input/state spaces are broad;
- least-privilege extension permissions and narrow host scopes;
- no silent telemetry, credential handling, CAPTCHA bypass, anti-detection, or hidden remote control;
- runtime sharing only after repeated, demonstrated reuse.

Run all available local tests with:

```bash
node scripts/test-all.mjs
```

## Continuity

New ChatGPT/Codex/Claude/OpenCode sessions should start with `AGENTS.md`, then `HANDOFF.md`, then the target extension's README/specs. Repository state wins over chat memory.
