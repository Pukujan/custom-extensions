import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const src = join(root, "src");
const dist = join(root, "dist");
const pyodide = join(root, "node_modules", "pyodide");
const pyodideOut = join(dist, "vendor", "pyodide");

if (!existsSync(pyodide)) {
  throw new Error("Pyodide is missing. Run npm install first.");
}

rmSync(dist, { recursive: true, force: true });
cpSync(src, dist, { recursive: true });
mkdirSync(pyodideOut, { recursive: true });

for (const file of [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "pyodide-lock.json",
  "python_stdlib.zip"
]) {
  const from = join(pyodide, file);
  if (!existsSync(from)) throw new Error(`Missing Pyodide runtime file: ${file}`);
  cpSync(from, join(pyodideOut, file));
}

console.log(`Built unpacked extension at ${dist}`);
