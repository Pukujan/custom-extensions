# YouTube DSA Lock

A deliberately small Manifest V3 extension for Brave/Chrome on macOS and Windows.

YouTube is blocked by default. The extension popup contains a Python editor. Pass 10 randomly selected DSA problems and YouTube unlocks for 60 minutes. Python runs locally in the browser through bundled Pyodide/WebAssembly; there is no localhost server, native helper, LaunchAgent, Windows service, or Python installation.

## Local development

```bash
cd extensions/youtube-dsa-lock
npm install --ignore-scripts
npm run check
```

Load `extensions/youtube-dsa-lock/dist/` with **Load unpacked** in `brave://extensions` or `chrome://extensions`.

## User flow

1. YouTube is blocked.
2. Click the extension icon.
3. Click **Solve 10 problems**.
4. Write Python directly in the popup, or use **Open in tab** for more room.
5. **Run samples** checks visible examples. **Submit** runs all bundled tests.
6. Each successful submission counts once.
7. At 10/10 the background worker disables the YouTube DNR rules for 60 minutes.
8. When the timer expires, YouTube is blocked again and a new challenge session starts.

Progress and code drafts are stored in `chrome.storage.local`, so closing/reopening the popup does not lose work.

## Scope

This v1 is a focus tool, not an anti-tamper system. A user can still disable or uninstall an unpacked extension. OS/browser policy enforcement can be added later as a thin, separate layer after the core experience is proven.

See `specs/` for the small product/design/test documents.
