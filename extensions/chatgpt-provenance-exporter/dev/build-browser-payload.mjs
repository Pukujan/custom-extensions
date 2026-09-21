import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(here, "..");
const files = [
  path.join(extensionRoot, "core.js"),
  path.join(here, "standalone-browser-bootstrap.js"),
  path.join(extensionRoot, "content.js"),
];

process.stdout.write(
  files
    .map((file) => `/* ${path.relative(extensionRoot, file).replaceAll("\\", "/")} */\n${fs.readFileSync(file, "utf8")}`)
    .join("\n\n"),
);
