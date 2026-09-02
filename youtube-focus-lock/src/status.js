import { CONFIG } from "../lib/config.mjs";
import { isAllowedAt, formatWindow } from "../lib/schedule.mjs";
import { burnInStatus } from "../lib/burnin.mjs";

const maintenanceButton = document.querySelector("#maintenance");
maintenanceButton.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://127.0.0.1:43871/" });
});

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
  const lockState = self.mayDisable
    ? "Browser lock policy: NOT VERIFIED (extension is removable)."
    : "Browser lock policy: VERIFIED (Brave reports this extension cannot be disabled).";

  maintenanceButton.style.display = lockVerified ? "block" : "none";

  if (status.reason === "health-failure") {
    el.textContent = `Burn-in failed: extension recorded an enforcement error. Do not arm. ${lockState}`;
  } else if (status.eligible) {
    el.textContent = `60-minute burn-in complete. ${lockState}`;
  } else {
    el.textContent = `Burn-in remaining: ${Math.ceil(status.remainingMs / 60_000)} minute(s). ${lockState}`;
  }
}

render();
setInterval(render, 15_000);
