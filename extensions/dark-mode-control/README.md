# Dark Mode Control

Dark mode for websites in desktop Brave, with **contrast, brightness and warmth
saved separately for each hostname**. A master switch pauses dark mode everywhere;
a site switch keeps individual websites in their original appearance.

## Install in Brave

1. Extract `dark-mode-control-v1.0.0.zip`, or use this extension directory from the repository.
2. Open `brave://extensions/` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Pin **Dark Mode Control** from Brave's extensions menu.
5. Reload any tabs that were already open when you installed it.

Dark mode starts enabled on normal websites. Click its toolbar icon to adjust
contrast (50–150%), brightness (50–150%) or warmth (0–100%). Changes apply while
you move the slider and remain saved after navigation or restart. **Reset this
site** restores the default sliders and enables this site; it leaves the master
switch alone. HTTP and HTTPS, paths and ports on one hostname share settings;
subdomains have separate settings. Matching embedded frames follow the top website.

## What it can touch

- Page appearance on ordinary HTTP/HTTPS websites, including dynamic content.
- Settings in this Brave profile (`storage` permission).
- The active tab's URL and status when you open the panel (`activeTab` permission).

The cross-site content-script scope is necessary to darken websites automatically.
There is no browsing-history collection, account access, telemetry or page-content
upload. The bundled engine may fetch page-referenced CSS/images without credentials
or referrer, subject to the browser's CORS rules; all executable code is bundled locally.

## Limits and recovery

Brave internal pages, extension stores, local files and built-in PDF viewers cannot
be styled by this extension. Closed shadow roots and resources restricted by CORS
or CSP may keep their original appearance. Site-specific styling is best effort.
Disable other dark-mode extensions to avoid conflicts. If a site looks wrong,
turn off **Enable on this site**. Turn off the master switch to restore all websites.

## Engine and evidence

Uses the locally bundled [Dark Reader API 4.9.133](https://github.com/darkreader/darkreader#using-dark-reader-on-a-website)
under MIT; its license and source attribution are included in `vendor/`.
The API compatibility layer is scoped away from native extension messaging.

Run deterministic tests with `node tests/test.js`. Current verified browser evidence
and remaining gaps are recorded in `TEST_REPORT.txt`. An observed fixture smoke is
not a guarantee that every third-party website works.
