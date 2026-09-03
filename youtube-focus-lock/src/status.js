import { CONFIG } from "../lib/config.mjs";
import { isAllowedAt, formatWindow } from "../lib/schedule.mjs";
import { burnInStatus } from "../lib/burnin.mjs";

const challengeButton = document.querySelector("#challenge");
const judgeElement = document.querySelector("#judge");
let lastHealth = null;

challengeButton.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:43871/" });
});

async function judgeHealth() {
  try {
    const response = await fetch("http://127.0.0.1:43871/health", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    lastHealth = health;
    judgeElement.textContent = `Coding judge: READY · ${health.mode} · ${health.bankSize}-problem pool`;
    challengeButton.disabled = false;
    return health;
  } catch {
    lastHealth = null;
    judgeElement.textContent = "Coding judge: STARTING / NOT RUNNING · preview helper will be retried automatically";
    challengeButton.disabled = true;
    return null;
  }
}

async function render() {
  const now = new Date();
  document.querySelector("#state").textContent = isAllowedAt(now, CONFIG)
    ? `Allowed now (${formatWindow(CONFIG)})`
    : `Blocked now (${formatWindow(CONFIG)})`;

  const [stored, self] = await Promise.all([
    chrome.storage.local.get("burnIn"),
    chrome.management.getSelf()
  ]);
  const state = stored.burnIn ?? {};
  const status = burnInStatus({
    startedAtMs: state.startedAtMs,
    nowMs: Date.now(),
    failureCount: state.failureCount ?? 0,
    requiredMinutes: CONFIG.burnInMinutes
  });

  const el = document.querySelector("#burnin");
  const lockVerified = !self.mayDisable;
  const lockState = lockVerified
    ? "Browser lock policy: VERIFIED."
    : "Browser lock policy: NOT VERIFIED (extension is removable).";

  challengeButton.textContent = lockVerified ? "Disable / uninstall…" : "Test coding challenge";
  if (lastHealth && lockVerified && lastHealth.mode !== "locked") {
    judgeElement.textContent = `Coding judge: READY · ${lastHealth.mode} · ${lastHealth.bankSize}-problem pool · WARNING: expected locked mode`;
  }

  if (status.reason === "health-failure") {
    el.textContent = `Burn-in failed: an enforcement error was recorded. Do not arm. ${lockState}`;
  } else if (status.eligible) {
    el.textContent = `60-minute burn-in complete. ${lockState}`;
  } else {
    el.textContent = `Burn-in remaining: ${Math.ceil(status.remainingMs / 60_000)} minute(s). ${lockState}`;
  }
}

await judgeHealth();
await render();
setInterval(judgeHealth, 1500);
setInterval(render, 15000);
