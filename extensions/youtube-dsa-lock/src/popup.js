import { REQUIRED_SOLVES, EXECUTION_TIMEOUT_MS, STORAGE_KEYS } from "./lib/config.mjs";
import { PROBLEMS, PROBLEM_BY_ID } from "./lib/problems.mjs";
import { createChallengeState, progress, withActiveProblem, withCode, withPassed } from "./lib/challenge-state.mjs";

const $ = (selector) => document.querySelector(selector);
const els = {
  statusText: $("#statusText"), statusBadge: $("#statusBadge"), toggle: $("#toggleChallenge"), openTab: $("#openTab"),
  challenge: $("#challenge"), progress: $("#progressText"), select: $("#problemSelect"), difficulty: $("#difficulty"),
  title: $("#problemTitle"), prompt: $("#problemPrompt"), code: $("#code"), run: $("#runSamples"), submit: $("#submit"), result: $("#result")
};

const standalone = new URLSearchParams(location.search).has("standalone");
if (standalone) {
  document.body.classList.add("standalone");
  els.openTab.hidden = true;
  els.challenge.hidden = false;
}

class PythonRunner {
  constructor() {
    this.seq = 0;
    this.pending = new Map();
    this.spawn();
  }

  spawn() {
    this.worker?.terminate();
    this.ready = false;
    this.readyError = null;
    this.worker = new Worker(chrome.runtime.getURL("python-worker.js"), { type: "module" });
    this.readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Python runtime failed to load within 30 seconds")), 30_000);
      this.worker.onmessage = (event) => {
        const message = event.data ?? {};
        if (message.type === "ready") {
          clearTimeout(timer);
          this.ready = true;
          resolve();
          return;
        }
        if (message.type === "startup-error") {
          clearTimeout(timer);
          this.readyError = message.error;
          reject(new Error(message.error));
          return;
        }
        if (message.type === "result") {
          const entry = this.pending.get(message.id);
          if (!entry) return;
          clearTimeout(entry.timer);
          this.pending.delete(message.id);
          entry.resolve(message.result);
        }
      };
    });
  }

  async run(payload) {
    await this.readyPromise;
    const id = `${Date.now()}-${++this.seq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Execution exceeded ${EXECUTION_TIMEOUT_MS / 1000}s and was stopped.`));
        this.spawn();
      }, EXECUTION_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, payload });
    });
  }
}

let challengeState;
let runner;
let saveTimer;

async function getStatus() {
  return chrome.runtime.sendMessage({ type: "get-status" });
}

async function renderStatus() {
  const state = await getStatus();
  if (state?.unlocked) {
    const minutes = Math.max(1, Math.ceil((state.unlockUntil - Date.now()) / 60_000));
    els.statusText.textContent = `YouTube unlocked for about ${minutes} more minute(s).`;
    els.statusBadge.textContent = "UNLOCKED";
  } else {
    els.statusText.textContent = "YouTube is blocked. Pass all 10 problems to unlock it for one hour.";
    els.statusBadge.textContent = "LOCKED";
  }
}

async function loadChallenge() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.challenge);
  challengeState = stored[STORAGE_KEYS.challenge];
  const valid = challengeState?.selectedIds?.length === REQUIRED_SOLVES && challengeState.selectedIds.every((id) => PROBLEM_BY_ID.has(id));
  if (!valid) {
    challengeState = createChallengeState(PROBLEMS.map((problem) => problem.id), REQUIRED_SOLVES);
    challengeState.activeProblemId = challengeState.selectedIds[0];
    await persistChallenge();
  } else if (!challengeState.activeProblemId || !challengeState.selectedIds.includes(challengeState.activeProblemId)) {
    challengeState.activeProblemId = challengeState.selectedIds[0];
    await persistChallenge();
  }
  renderChallenge();
}

async function persistChallenge() {
  await chrome.storage.local.set({ [STORAGE_KEYS.challenge]: challengeState });
}

function renderProblemSelect() {
  els.select.replaceChildren();
  for (const id of challengeState.selectedIds) {
    const problem = PROBLEM_BY_ID.get(id);
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${challengeState.passedIds.includes(id) ? "✓ " : ""}${problem.title}`;
    option.selected = id === challengeState.activeProblemId;
    els.select.append(option);
  }
}

function renderChallenge() {
  const { passed, total } = progress(challengeState);
  els.progress.textContent = `${passed} / ${total} passed`;
  renderProblemSelect();
  const problem = PROBLEM_BY_ID.get(challengeState.activeProblemId);
  els.difficulty.textContent = problem.difficulty;
  els.title.textContent = problem.title;
  els.prompt.textContent = problem.prompt;
  els.code.value = challengeState.codeById[problem.id] ?? problem.starter;
  els.submit.textContent = challengeState.passedIds.includes(problem.id) ? "Passed ✓" : "Submit";
  els.submit.disabled = challengeState.passedIds.includes(problem.id);
}

function currentProblem() {
  return PROBLEM_BY_ID.get(challengeState.activeProblemId);
}

async function saveCurrentCode() {
  challengeState = withCode(challengeState, challengeState.activeProblemId, els.code.value);
  await persistChallenge();
}

function formatResult(result) {
  const lines = [`${result.passed}/${result.total} tests passed.`];
  if (result.failure?.error) lines.push(result.failure.error);
  else if (result.failure) lines.push(`Failed test ${result.failure.test}.\nExpected: ${JSON.stringify(result.failure.expected)}\nActual: ${JSON.stringify(result.failure.actual)}`);
  if (result.stdout) lines.push(`stdout:\n${result.stdout}`);
  return lines.join("\n\n");
}

async function execute(submit) {
  await saveCurrentCode();
  runner ??= new PythonRunner();
  const problem = currentProblem();
  const tests = submit ? [...problem.examples, ...problem.tests] : problem.examples;
  els.run.disabled = true;
  els.submit.disabled = true;
  els.result.textContent = "Running Python…";
  try {
    const result = await runner.run({ code: els.code.value, functionName: problem.functionName, tests });
    els.result.textContent = formatResult(result);
    if (submit && result.ok) {
      challengeState = withPassed(challengeState, problem.id);
      await persistChallenge();
      renderChallenge();
      if (challengeState.passedIds.length === REQUIRED_SOLVES) {
        const unlocked = await chrome.runtime.sendMessage({ type: "unlock" });
        if (unlocked?.unlocked) {
          els.result.textContent = "10/10 passed. YouTube is unlocked for 60 minutes.";
          await renderStatus();
        }
      }
    }
  } catch (error) {
    els.result.textContent = String(error?.message ?? error);
  } finally {
    els.run.disabled = false;
    els.submit.disabled = challengeState.passedIds.includes(problem.id);
  }
}

els.toggle.addEventListener("click", async () => {
  els.challenge.hidden = !els.challenge.hidden;
  if (!els.challenge.hidden && !challengeState) await loadChallenge();
});

els.openTab.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?standalone=1") });
});

els.select.addEventListener("change", async () => {
  await saveCurrentCode();
  challengeState = withActiveProblem(challengeState, els.select.value);
  await persistChallenge();
  renderChallenge();
});

els.code.addEventListener("input", () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void saveCurrentCode(), 250);
});
els.run.addEventListener("click", () => void execute(false));
els.submit.addEventListener("click", () => void execute(true));

await renderStatus();
if (standalone) await loadChallenge();
setInterval(() => void renderStatus(), 15_000);
