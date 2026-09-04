# Packaged Releases

The repository keeps each extension independently loadable under `extensions/<slug>/` and publishes convenience ZIPs through GitHub Releases. The ZIPs are for Brave/Chromium Developer mode; they are not Chrome Web Store signed packages.

## Download and install

1. Open the repository's **Releases** page.
2. Download the ZIP whose name matches the extension and version you want.
3. Optionally verify the ZIP against `SHA256SUMS.txt` from the same release.
4. Extract the ZIP into its own folder.
5. Open `brave://extensions/`.
6. Enable **Developer mode**.
7. Click **Load unpacked** and choose the extracted folder containing `manifest.json`.

For ChatGPT Transcript Exporter v0.1.0, the asset is `chatgpt-transcript-exporter-v0.1.0.zip`.

## Release contents

`scripts/package-extensions.sh` reads `extensions/registry.json`, checks that each registry version matches its `manifest.json`, and creates one ZIP per registered extension. Runtime files are packaged with `manifest.json` at archive root. Conventional repository-only material (`README.md`, `TEST_REPORT.txt`, `tests/`, `specs/`, and `tests.js`) is excluded from release ZIPs.

The script also writes `dist/SHA256SUMS.txt`.

Run locally on a system with Bash, `jq`, `zip`, `unzip`, and `sha256sum`:

```bash
bash scripts/package-extensions.sh
```

## Publishing

The release descriptor is `release/current.json`. It records the release tag/title and the expected extension asset names.

`.github/workflows/package-release.yml` runs when `release/current.json` changes on `main`, or when started manually. It:

1. runs `node scripts/test-all.mjs`;
2. builds all registered extension ZIPs;
3. verifies packaging invariants and generates checksums;
4. creates the named GitHub Release, or refreshes its assets on an idempotent rerun;
5. uploads the same files as a GitHub Actions artifact.

To publish a new bundle, update extension/registry versions as required, then change `release/current.json` to a new unique tag and title. Do not reuse an old tag for materially different extension source.

## Versioning

Individual asset versions come from each extension's manifest and must match the registry. The collection release tag is a bundle identifier; it does not replace per-extension versions.

## Evidence and safety

Packaging does not upgrade verification status. Deterministic tests, imported test reports, and live Brave/Chromium smoke tests remain separate evidence states under `docs/STATUS.md` and `extensions/registry.json`.
