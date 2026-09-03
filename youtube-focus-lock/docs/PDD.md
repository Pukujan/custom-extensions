# Product Design Document — YouTube Focus Lock 0.3

## Purpose

Create strong, deliberate friction around YouTube use in Brave on **Windows 10/11 and macOS** while keeping the system fully testable and removable before anti-removal is armed.

YouTube is available only from **11:00 AM through 11:59:59 AM America/New_York**.

## Supported-platform contract

Windows and macOS are first-class supported desktop platforms. The extension, 120-problem challenge bank, Python judge, browser editor, persistence model, hints, and maintenance semantics must be shared code. Only OS integration—startup/service management, elevation, and Brave policy storage—may differ.

A build is not cross-platform release-ready unless the shared runtime passes CI on both `windows-latest` and `macos-latest`.

## Blocking

- Block `youtube.com`, Shorts, Music, `youtu.be`, and `youtube-nocookie.com` outside the access window.
- No pause/snooze control.
- Existing YouTube tabs are forced out when the access window closes.
- Blocking and the local coding judge must work without internet access.

## Safe rollout

Each supported OS follows the same states:

1. **Development / burn-in** — extension is unpacked and normally removable.
2. **Preview judge** — immediately available during burn-in; cannot change lock state.
3. **Burn-in complete** — at least 60 minutes and no recorded extension enforcement failure.
4. **Soft lock** — OS-specific Brave policy is applied; persistent watchdog is not armed yet.
5. **Verified** — `brave://policy` and popup verification pass; rollback has been demonstrated.
6. **Armed** — persistent OS watchdog is installed and the coding server switches to locked mode.

The soft-lock script must refuse to proceed unless the preview judge was exercised during the current burn-in.

## Maintenance challenge

- **120 original objective problem IDs**: 24 algorithm families × 5 variants.
- No copied LeetCode prompts.
- Every challenge selects 5 distinct families: **3 Medium + 2 Hard**.
- Preview and locked namespaces are separate.
- Session expiry is exactly **60 minutes from creation** and activity never extends it.
- Code/progress/hints/pass state persist across tabs, windows, full Brave restart, and local judge restart.
- PASS is bound to the SHA-256 of the exact saved solution; edits invalidate it.

## Coding UX

The browser UI provides an editable `solution.py`, autosave, Save, Compile & Run, public examples, randomized objective hidden tests, five-problem navigation, visible countdown, and explicit classification of compile error/runtime error/timeout/wrong answer/pass.

Hints must attempt to diagnose syntax/runtime mistakes and give progressive algorithmic direction without revealing hidden inputs or a complete solution.

## Maintenance / uninstall

After 5/5 current solutions pass, the system performs a fresh second verification before any elevated policy change.

- **macOS:** the root verifier launches candidate workers after dropping UID/GID to the normal user, then signs a 10-minute token.
- **Windows:** the normal-user runtime freshly re-runs all five immediately before UAC and writes a short-lived HMAC/hash-bound proof. The elevated helper validates that proof/current hashes and signs the 10-minute machine token; it never executes candidate Python as Administrator.

A valid token temporarily relaxes policy for 10 minutes. The persistent watchdog restores policy after expiry. Permanent uninstall requires the same supported challenge/token path.

## OS integration

### Windows

- Burn-in preview starts in the user session and has a removable Startup entry.
- Brave policy uses Windows machine policy under `HKLM\SOFTWARE\Policies\BraveSoftware\Brave`.
- Armed policy watchdog runs as a SYSTEM Scheduled Task.
- UAC is used only for policy/installation changes, not candidate-code execution.

### macOS

- Burn-in/locked coding UI uses a user LaunchAgent.
- Brave policy uses the Brave macOS preference domain.
- Armed policy watchdog uses a root LaunchDaemon.

## Acceptance criteria

- 10:59 AM: blocked; 11:00 AM: allowed; 11:59 AM: allowed; 12:00 PM: blocked.
- During burn-in on either supported OS, popup reaches `Coding judge: READY · preview · 120-problem pool` and **Test coding challenge** is clickable.
- Real Brave Playwright click opens `http://127.0.0.1:43871/` on Windows and macOS.
- Preview can never invoke maintenance/uninstall.
- Closing/reopening Brave and restarting the local service preserve an unexpired challenge and original expiry.
- Burn-in installers do not alter lock policy.
- Windows and macOS each have deterministic pre-arm suites plus real-UI/vision/computer-use acceptance.
- A target machine may not be armed until its own OS acceptance ends in `PRE-ARM ACCEPTANCE: PASS`.

## Non-goals / limitations

No telemetry, browsing-history collection, surveillance, hidden persistence, disabling of system administration tools, or claim of an absolute security boundary. A determined local Administrator/root owner can deliberately dismantle local controls; the goal is strong impulse-resistant productive friction.
