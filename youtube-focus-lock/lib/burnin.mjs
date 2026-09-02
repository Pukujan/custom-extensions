export function burnInStatus({ startedAtMs, nowMs, failureCount, requiredMinutes }) {
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) {
    return { eligible: false, remainingMs: requiredMinutes * 60_000, reason: "not-started" };
  }
  if ((failureCount ?? 0) > 0) {
    return { eligible: false, remainingMs: null, reason: "health-failure" };
  }
  const requiredMs = requiredMinutes * 60_000;
  const elapsedMs = Math.max(0, nowMs - startedAtMs);
  return {
    eligible: elapsedMs >= requiredMs,
    remainingMs: Math.max(0, requiredMs - elapsedMs),
    reason: elapsedMs >= requiredMs ? "ready" : "burn-in"
  };
}
