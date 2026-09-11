import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");
const required = [
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.js",
  "python-worker.js",
  "lib/problems.mjs",
  "lib/python-harness.mjs",
  "vendor/pyodide/pyodide.mjs",
  "vendor/pyodide/pyodide.asm.wasm",
  "vendor/pyodide/python_stdlib.zip"
];

for (const file of required) {
  const path = join(dist, file);
  if (statSync(path).size === 0) throw new Error(`Empty build artifact: ${file}`);
}

const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Expected Manifest V3");
if (!manifest.content_security_policy?.extension_pages?.includes("wasm-unsafe-eval")) {
  throw new Error("Pyodide requires wasm-unsafe-eval in extension CSP");
}
if (statSync(join(dist, "vendor/pyodide/pyodide.asm.wasm")).size < 1_000_000) {
  throw new Error("Pyodide wasm looks incomplete");
}

for (const file of ["background.js", "popup.js", "python-worker.js"]) {
  const text = readFileSync(join(dist, file), "utf8");
  if (/https?:\/\/(cdn\.|unpkg\.|jsdelivr\.)/i.test(text)) {
    throw new Error(`Remote executable dependency found in ${file}`);
  }
  if (/127\.0\.0\.1|localhost|\/Library\/Application Support/i.test(text)) {
    throw new Error(`Native/local-service dependency leaked into ${file}`);
  }
}

console.log("Build validation passed");
