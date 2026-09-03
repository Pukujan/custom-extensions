# Product Design Document — YouTube Focus Lock v2

## Purpose
Create strong, deliberate friction around YouTube use on a personal macOS computer using Brave while keeping the software testable and recoverable before anti-removal is armed.

YouTube is available only from **11:00 AM through 11:59:59 AM America/New_York**.

## Product contract

### Blocking
- Block `youtube.com`, YouTube Shorts, YouTube Music, `youtu.be`, and `youtube-nocookie.com` embeds outside the access window.
- No pause/snooze button.
- Existing YouTube tabs are forced out when the access window closes.
- Blocking must not require internet access.

### Safe rollout
1. **Development / burn-in** — extension is unpacked and normally removable.
2. **Preview judge** — during burn-in the exact coding UI/judge is available locally and cannot alter the blocker.
3. **Burn-in complete** — at least 60 minutes, with no recorded extension-enforcement failure.
4. **Soft lock** — Brave force-install/private-window policies are applied, but the persistent watchdog is not installed.
5. **Verified** — Brave reports the extension cannot be disabled and all manual checks pass.
6. **Armed** — watchdog is installed and the coding UI switches from preview to locked mode.

`prepare-lock.sh` must refuse to proceed unless the preview coding judge has been exercised during the current burn-in.

## Maintenance challenge
- **120 original objective problems**: 24 algorithm families × 5 variants.
- No prompts copied from LeetCode or another problem site.
- A locked challenge selects **5 problems from 5 different algorithm families**.
- Selection is balanced: **3 Medium + 2 Hard**.
- Preview and locked challenge namespaces are separate. Preview progress can never unlock maintenance.
- A challenge is fixed for exactly **60 minutes from creation**. Activity does not extend it.
- Code, selected problem, attempts, hints, and pass state are disk-backed and survive tab/window changes, Brave quit/reopen, and judge-process restarts.
- Editing code after a PASS immediately invalidates the PASS until that exact saved version passes again.

## Coding UX
The challenge UI must provide:
- an in-browser Python editor;
- automatic disk save plus an explicit Save button;
- Compile & Run;
- two public examples per problem;
- objective randomized tests;
- a progress navigator for all five problems;
- a fixed 60-minute countdown;
- explicit status classification: **compile error, runtime error, timeout, wrong answer, pass**;
- automatic diagnostic hints for syntax/runtime/timeouts;
- progressive conceptual hints for wrong answers or on request.

Hints should help diagnose a direction without revealing hidden test inputs or directly providing the complete solution.

## Unlock behavior
After 5/5 current saved solutions pass:
- **Maintenance**: independently re-check all five, then grant a signed 10-minute maintenance token.
- **Permanent uninstall**: independently re-check all five, then allow removal through the supported uninstaller.
- Token tampering or expiry must invalidate maintenance.
- When the 10-minute token expires, the watchdog restores Brave policy enforcement.

## Acceptance criteria
- 10:59 AM New York: YouTube blocked.
- 11:00 AM: allowed.
- 11:59 AM: allowed.
- 12:00 PM: blocked; existing tabs leave YouTube promptly.
- During burn-in, popup exposes **Test coding challenge** and judge health.
- Preview reports a 120-problem pool and cannot invoke maintenance/uninstall.
- Random challenge contains five unique families, exactly three Medium and two Hard.
- Closing/reopening Brave does not lose an unexpired challenge.
- Restarting the judge process does not lose an unexpired challenge.
- Session activity never pushes the original 60-minute expiry later.
- Syntax errors show line/message plus a diagnostic hint.
- Runtime exceptions show exception category plus a diagnostic hint.
- Timeout and wrong-answer states produce useful non-answer hints.
- Soft lock and persistent lock are never enabled by the burn-in installer.

## Non-goals / limitations
- No telemetry, browsing-history collection, cloud account, or surveillance.
- No hiding processes/files or disabling Terminal, Recovery, `sudo`, or macOS administration paths.
- This does not claim to be an absolute security boundary against the Mac's administrator/root owner.
- Because all judging happens on the user's own machine, a determined administrator can inspect or alter local software. The design targets impulsive bypass resistance and productive friction, not adversarial DRM.
