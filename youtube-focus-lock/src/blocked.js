import { CONFIG } from "../lib/config.mjs";
import { formatWindow, isAllowedAt, findNextTransition } from "../lib/schedule.mjs";

document.querySelector("#window").textContent = `${formatWindow(CONFIG)} (${CONFIG.timeZone})`;

function render() {
  const now = new Date();
  if (isAllowedAt(now, CONFIG)) {
    location.replace("https://www.youtube.com/");
    return;
  }
  const next = findNextTransition(now, CONFIG);
  const ms = Math.max(0, next.getTime() - now.getTime());
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  document.querySelector("#countdown").textContent =
    `Next access in ${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

render();
setInterval(render, 1000);
