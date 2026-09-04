# Custom Extensions

A collection of small, independently loadable Brave/Chromium extensions.

This repository is the durable home for browser utilities that would otherwise be scattered across chat sessions and downloaded ZIPs. Each extension remains its own deployable unit under `extensions/`; the repository shares engineering policy, specifications, testing conventions, release automation, and handoff state rather than forcing unrelated extensions into one runtime.

## Download packaged extensions

GitHub Releases contains a separate versioned ZIP for every extension currently registered on `main`.

Current bundle: **Custom Extensions — 2026-09-03** (`extensions-2026.09.03`).

| Extension | Release asset |
| --- | --- |
| ChatGPT 10-Day Cleaner v2.0.0 | `chatgpt-10-day-cleaner-v2.0.0.zip` |
| ChatGPT Transcript Exporter v0.1.0 | `chatgpt-transcript-exporter-v0.1.0.zip` |
| Connection List Exporter v1.1.0 | `linkedin-connection-exporter-v1.1.0.zip` |

Open the repository **Releases** page, download the ZIP you want, extract it, then load the extracted folder in Brave. See `docs/RELEASES.md` for checksums, exact install steps, packaging rules, and the release workflow.

## Install a downloaded ZIP in Brave

1. Extract the extension ZIP into its own folder.
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extracted folder containing `manifest.json`.

These packages are unpacked Developer-mode extensions, not Chrome Web Store signed packages.

## Install directly from the repository

1. Clone or download this repository.
2. Open `brave://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the specific directory under `extensions/`.

Do not load the repository root as an extension.

## Collection layout

```text
custom-extensions/
├── .github/workflows/
│   └── package-release.yml
├── AGENTS.md
├── HANDOFF.md
├── README.md
├── docs/
│   ├── ADDING_AN_EXTENSION.md
│   ├── POLICIES.md
│   ├── RELEASES.md
│   └── STATUS.md
├── release/
│   ├── current.json
│   └── RELEASE_NOTES.md
├── specs/
│   ├── PDD.md
│   └── SDD.md
├── scripts/
│   ├── package-extensions.sh
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

Build release ZIPs locally with:

```bash
bash scripts/package-extensions.sh
```

## Continuity

New ChatGPT/Codex/Claude/OpenCode sessions should start with `AGENTS.md`, then `HANDOFF.md`, then the target extension's README/specs. Repository state wins over chat memory.
