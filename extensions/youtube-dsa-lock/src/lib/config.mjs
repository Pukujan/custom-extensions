export const REQUIRED_SOLVES = 10;
export const UNLOCK_MINUTES = 60;
export const UNLOCK_MS = UNLOCK_MINUTES * 60 * 1000;
export const EXECUTION_TIMEOUT_MS = 5_000;
export const STORAGE_KEYS = Object.freeze({
  unlockUntil: "unlockUntil",
  challenge: "challenge"
});
