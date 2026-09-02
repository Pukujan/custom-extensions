# Product Design Document — YouTube Focus Lock

## Goal
Create deliberate, productive friction around YouTube use on a personal macOS computer using Brave. YouTube is available only from **11:00 AM through 11:59:59 AM America/New_York** and blocked at all other times.

## User contract
- No pause, snooze, or temporary bypass button.
- YouTube, YouTube Shorts, YouTube Music, `youtu.be`, and `youtube-nocookie.com` embeds are in scope.
- During the first **60 minutes**, the extension remains normally removable.
- Locked mode must not be armed until burn-in and validation pass.
- Normal locked-mode maintenance/uninstall requires completing **5 randomly selected original Python Medium/Hard algorithm problems**.
- Passing all 5 grants a **10-minute maintenance window**.
- An administrator who deliberately uses root-level macOS controls can still dismantle the system. This project provides strong friction, not an absolute security boundary.

## Non-goals
- Surveillance, browsing-history collection, telemetry, or cloud accounts.
- Hiding processes/files from the Mac owner.
- Disabling macOS recovery, Terminal, `sudo`, or other system administration facilities.
- Claiming that an administrator-owned personal Mac can be made impossible to bypass.

## Rollout states
1. **Development** — unpacked Brave extension, fully removable.
2. **Burn-in** — 60 minutes, extension health tracked locally; any recorded enforcement error blocks arming.
3. **Soft lock** — Brave force-install policy applied, but watchdog not installed; easy rollback remains available.
4. **Verified** — `brave://policy` contains the force-install entry and the extension reports `management.getSelf().mayDisable == false`.
5. **Armed** — root LaunchDaemon periodically restores the Brave policies.
6. **Maintenance** — 5 coding problems independently verified; signed 10-minute maintenance token issued.

## Acceptance criteria
- 10:59 AM: YouTube blocked.
- 11:00 AM: YouTube allowed.
- 11:59 AM: YouTube allowed.
- 12:00 PM: an already-open YouTube tab is redirected to the block page and new navigations are blocked.
- Browser restart and Mac sleep/wake do not permanently disable enforcement.
- Private browsing is disabled in locked mode.
- Extension popup clearly reports burn-in and browser-policy verification state.
- Locked uninstall rejects unsigned, modified, or expired maintenance tokens.
- Candidate Python is never executed as root; the privileged verifier drops to the normal user's UID/GID before importing a solution.
