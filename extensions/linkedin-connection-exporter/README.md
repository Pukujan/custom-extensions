# Connection List Exporter — Brave / Chromium

A small Manifest V3 extension that collects profile rows visible in a LinkedIn
connection-list style page, stores them locally, optionally advances with the
visible "Next" control, and exports CSV/TSV.

## Install in Brave

1. Unzip this folder.
2. Open `brave://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `linkedin_connection_exporter` folder.

## Use

1. In your own logged-in LinkedIn tab, open the connection list you have access to.
2. Open the extension.
3. Click **Validate Current Page** first. It does not save or paginate; it reports how many connection rows were parsed and shows a few sample name/title/location values.
4. If the validation count/sample looks correct, set **Max pages** and **Delay**.
5. Click **Start / Resume**.
6. Keep the LinkedIn tab open. You may close the extension popup.
7. Open the popup again to check the row count/status.
8. Click **Export CSV** or **Export TSV**.

## Fields

- `name`
- `connectionDegree` — e.g. 1st / 2nd / 3rd when visible
- `headline` — the visible headline/position line
- `location` — the visible location line when present
- `mutualConnections`
- `details` — additional visible card text
- `url` — canonical LinkedIn profile URL
- `sourcePage`
- `rowOnPage`
- `capturedAt`
- `visibleText` — loss-minimizing copy of the visible row text

## Notes

LinkedIn changes its markup frequently, so DOM extraction is intentionally based
on semantic result containers, visible text, and `/in/` profile URLs rather than fragile
generated CSS class names. Collection does **not** filter by profession: recruiter,
engineering, operations, education, creative, and sparse-profile rows are all retained.

If your particular list uses infinite scroll rather than a Next button, the
extractor will collect the currently rendered profiles but will stop when it
cannot find an enabled Next control. The content script's `findNextControl()`
and `waitForListToSettle()` functions are the places to adjust for a different UI.

This code does not contain login automation, credential handling, CAPTCHA
handling, hidden/private API calls, or anti-detection logic.
