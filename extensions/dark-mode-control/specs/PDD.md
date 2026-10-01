# PDD — Dark Mode Control

Turn ordinary HTTP/HTTPS pages dark in desktop Brave, with instant contrast,
brightness and warmth controls. Risk class: stateful. Settings are local to this
browser profile; there is no telemetry, account access or page-content upload.

## Properties and acceptance

- P-DARK-001: each ordinary HTTP/HTTPS page receives dynamic dark styling when
  the master switch and its hostname switch are on; images/video are not globally inverted.
- P-DARK-002: disabling removes generated styles and restores original page styling.
- P-DARK-003: contrast (50–150), brightness (50–150), warmth (0–100) persist per
  exact hostname, across navigation/restart; hostnames never share overrides.
- P-DARK-004: disabling the master switch wins over every site override.
- P-DARK-005: dynamic content and accessible open shadow roots receive styling;
  matching HTTP/HTTPS frames follow the top-level site's settings.
- P-DARK-006: invalid stored input is bounded or replaced with defaults; prototype
  keys do not change behavior. Defaults are enabled, contrast 100, brightness 100, warmth 0.
- P-DARK-007: controls report restricted pages, absent content scripts and saving
  failures visibly. Unsupported pages never imply successful activation.
- P-DARK-008: independently packaged MV3 extension; only storage and activeTab permissions.

Browser pages, extension stores, local files, built-in PDF viewers and inaccessible
closed shadow roots are outside scope. CSS/image resources blocked by CORS or CSP
can limit styling; site-specific compatibility is best effort. Existing dark-mode
extensions should be disabled to avoid conflicts. A global/site switch provides recovery.

## Verification

Dependency-free Node tests cover malformed settings, hostname boundaries, master
precedence, inter-context responses, failures, manifests and vendor integrity.
An isolated Brave profile verifies actual MV3 loading, popup controls, reload
persistence, frames, dynamic content, styling and restoration. This does not prove
compatibility with every website.
