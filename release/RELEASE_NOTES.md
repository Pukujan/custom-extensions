# Packaged Brave / Chromium extensions

This release packages every extension currently registered on `main` as a separate ZIP that can be extracted and loaded directly with Brave/Chromium Developer mode.

## Assets

- `chatgpt-10-day-cleaner-v2.0.0.zip` — preview and bulk-delete ChatGPT conversations older than a chosen age. **Destructive:** review the dry-run snapshot carefully before confirming deletion.
- `chatgpt-transcript-exporter-v0.1.0.zip` — export the active ChatGPT conversation to Markdown or structured JSON. Deterministic/property tests pass; a current live Brave smoke test is still required.
- `linkedin-connection-exporter-v1.1.0.zip` — collect visible LinkedIn connection-list rows and export CSV/TSV.
- `SHA256SUMS.txt` — SHA-256 checksums for all ZIP assets.

## Install in Brave

1. Download the ZIP for the extension you want.
2. Extract the ZIP into its own folder.
3. Open `brave://extensions/`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder containing `manifest.json`.

These are unpacked Developer-mode extensions, not Chrome Web Store packages. Extension behavior, permissions, test evidence, and live-smoke status remain documented in the repository.
