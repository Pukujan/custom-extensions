import { loadPyodide } from "./vendor/pyodide/pyodide.mjs";
import { runWithPyodide } from "./lib/python-harness.mjs";

const indexURL = new URL("./vendor/pyodide/", import.meta.url).href;
const pyodidePromise = loadPyodide({ indexURL });

pyodidePromise
  .then(() => self.postMessage({ type: "ready" }))
  .catch((error) => self.postMessage({ type: "startup-error", error: String(error?.stack ?? error) }));

self.onmessage = async (event) => {
  const { id, payload } = event.data ?? {};
  if (!id || !payload) return;
  try {
    const pyodide = await pyodidePromise;
    const result = await runWithPyodide(pyodide, payload);
    self.postMessage({ type: "result", id, result });
  } catch (error) {
    self.postMessage({ type: "result", id, result: {
      ok: false,
      passed: 0,
      total: payload.tests?.length ?? 0,
      failure: { error: String(error?.stack ?? error) },
      stdout: ""
    }});
  }
};
