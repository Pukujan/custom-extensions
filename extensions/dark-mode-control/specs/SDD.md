# SDD — Dark Mode Control

## Contexts and state

`core.js` is a dependency-free normalization layer used by popup, worker and content
script. The worker responds to `dark-control:get-settings` using `sender.tab.url`
so subframes inherit the top-level hostname. Content scripts load at document_start
on HTTP/HTTPS in all matching frames. They request settings, enable/disable the
bundled Dark Reader API, observe local storage updates and ignore stale responses.
The engine watches style/DOM changes and accessible shadow roots.

`chrome.storage.local` holds a boolean `masterEnabled` and separate `site:<hostname>`
objects containing enabled, contrast, brightness, sepia. Separate keys avoid losing
other hosts' changes. Popup writes are serialized. Reset deletes only the current
hostname override. The master switch is independent and is never reset by site reset.
Unknown message types are ignored. Worker errors return an explicit error response;
content failures disable the engine and return a visible error on popup status checks.

Popup uses activeTab to read the active tab URL and send a status probe. No tabs or
scripting permission is required. Storage permission is used for settings. The
HTTP/HTTPS content-script match scope is required by the user's cross-site dark-mode
request; no file, FTP or browser-internal scope is requested. No background fetch,
cookie/debugger/webRequest API, telemetry, remote JavaScript or page-data export.

## Engine and distribution

Dark Reader npm API 4.9.133 is bundled under MIT with LICENSE and upstream SHA-256.
A lexical `chrome` shim surrounds the upstream bytes, preventing the API's browser
compatibility stubs from modifying this extension's native messaging. This wrapper
does not modify the upstream implementation. Browser fetch may read existing page
CSS/image resources with credentials omitted and no referrer, subject to normal
CORS/CSP. No special cross-origin-fetch bridge is provided.

All runtime files are local to this directory. Repository specs/tests remain outside
release archives. Syntax, dependency boundaries, permissions, adapter integrity and
worker/content behavior have dependency-free tests. Browser smoke uses a fresh
temporary Brave profile and HTTP fixture, never the user's live browser profile.
