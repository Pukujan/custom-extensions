#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTRY_PATH = path.join(ROOT_DIR, "extensions", "registry.json");

function stableCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function usage() {
  console.log(`Usage: node scripts/package-extensions.mjs [--out <directory>]

Creates deterministic, independently loadable ZIPs for every extension in
extensions/registry.json and writes SHA256SUMS.txt beside them.`);
}

function parseArgs(argv) {
  let outputDir = path.join(ROOT_DIR, "dist");
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      usage();
      process.exit(0);
    }
    if (argument === "--out") {
      if (!argv[index + 1]) throw new Error("--out requires a directory");
      outputDir = path.resolve(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return outputDir;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function zipArchive(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll(path.sep, "/"), "utf8");
    const data = entry.data;
    const checksum = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ]);
    localParts.push(localHeader, data);

    centralParts.push(Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(checksum),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]));
    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function collectFiles(directory, relative = "") {
  const names = (await fs.readdir(path.join(directory, relative), { withFileTypes: true }))
    .sort((left, right) => stableCompare(left.name, right.name));
  const files = [];
  for (const item of names) {
    const itemRelative = path.join(relative, item.name);
    if (item.isDirectory()) {
      if (relative === "" && (item.name === "tests" || item.name === "specs")) continue;
      files.push(...await collectFiles(directory, itemRelative));
      continue;
    }
    if (!item.isFile()) continue;
    if (["README.md", "TEST_REPORT.txt", "tests.js", ".DS_Store"].includes(item.name)) continue;
    files.push(itemRelative);
  }
  return files.sort(stableCompare);
}

async function packageExtension(extension, outputDir) {
  const extensionDir = path.resolve(ROOT_DIR, extension.directory);
  const manifestPath = path.join(extensionDir, "manifest.json");
  const manifest = await readJson(manifestPath);
  if (manifest.version !== extension.version) {
    throw new Error(`Version mismatch for ${extension.id}: registry=${extension.version} manifest=${manifest.version}`);
  }

  const relativeFiles = await collectFiles(extensionDir);
  if (!relativeFiles.length) throw new Error(`No packageable files found for ${extension.id}`);
  if (!relativeFiles.includes("manifest.json")) throw new Error(`manifest.json missing for ${extension.id}`);

  const entries = [];
  for (const relativeFile of relativeFiles) {
    entries.push({
      name: relativeFile,
      data: await fs.readFile(path.join(extensionDir, relativeFile)),
    });
  }
  const archiveName = `${extension.id}-v${extension.version}.zip`;
  const archivePath = path.join(outputDir, archiveName);
  const archive = zipArchive(entries);
  await fs.writeFile(archivePath, archive);
  const digest = crypto.createHash("sha256").update(archive).digest("hex");
  console.log(`Packaged ${archiveName} (${entries.length} files, ${archive.length} bytes)`);
  return { archiveName, digest };
}

async function main() {
  const outputDir = parseArgs(process.argv.slice(2));
  const registry = await readJson(REGISTRY_PATH);
  if (!Array.isArray(registry.extensions) || registry.extensions.length === 0) {
    throw new Error(`No extensions found in ${REGISTRY_PATH}`);
  }

  await fs.mkdir(outputDir, { recursive: true });
  const existingEntries = await fs.readdir(outputDir, { withFileTypes: true });
  for (const entry of existingEntries) {
    if (!entry.isFile() || !(entry.name.endsWith(".zip") || entry.name === "SHA256SUMS.txt")) continue;
    await fs.unlink(path.join(outputDir, entry.name));
  }
  const results = [];
  for (const extension of registry.extensions) {
    results.push(await packageExtension(extension, outputDir));
  }
  results.sort((left, right) => stableCompare(left.archiveName, right.archiveName));
  const checksums = results.map(({ archiveName, digest }) => `${digest}  ${archiveName}`).join("\n") + "\n";
  await fs.writeFile(path.join(outputDir, "SHA256SUMS.txt"), checksums, "utf8");
  console.log(`Wrote release assets to ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
