import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(resolve(root, "extensions/registry.json"), "utf8"));

let failures = 0;
for (const extension of registry.extensions) {
  if (!extension.test_command) continue;
  const cwd = resolve(root, extension.directory);
  console.log(`\n=== ${extension.id} ===`);
  console.log(`$ ${extension.test_command}`);
  const result = spawnSync(extension.test_command, {
    cwd,
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    failures += 1;
    console.error(`FAILED: ${extension.id}`);
  } else {
    console.log(`PASS: ${extension.id}`);
  }
}

if (failures) {
  console.error(`\n${failures} extension test suite(s) failed.`);
  process.exit(1);
}
console.log("\nAll registered extension test suites passed.");
