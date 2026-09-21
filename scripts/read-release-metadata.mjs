#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "release", "current.json");
const metadata = JSON.parse(await fs.readFile(file, "utf8"));

if (typeof metadata.tag !== "string" || metadata.tag.length === 0) {
  throw new Error("release/current.json must contain a non-empty tag field");
}
if (typeof metadata.title !== "string" || metadata.title.length === 0) {
  throw new Error("release/current.json must contain a non-empty title field");
}

console.log(`tag=${metadata.tag}`);
console.log(`title=${metadata.title}`);
