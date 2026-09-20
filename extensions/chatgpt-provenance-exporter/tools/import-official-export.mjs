#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const core = require("../core.js");
globalThis.ChatGPTProvenanceCore = core;
const officialCore = require("../official-core.js");
const zip = require("../official-zip.js");

const USAGE = `Usage:
  node tools/import-official-export.mjs <export.zip> <empty-output-directory> [--account-catalog <catalog.json|catalog.jsonl>]
  node tools/import-official-export.mjs --help

The input archive is preserved unchanged under raw/official-export.zip.
The output directory must be new or empty; it is never deleted by this tool.`;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function sha256(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes));
  return { algorithm: "sha256", digest: crypto.createHash("sha256").update(buffer).digest("hex"), bytes: buffer.length };
}

function json(content) {
  return `${core.stableStringify(content, 2)}\n`;
}

function jsonl(records) {
  return core.toJsonl(records);
}

async function ensureEmptyOutput(directory) {
  try {
    const entries = await fs.readdir(directory);
    if (entries.length) throw new Error(`Output directory is not empty: ${directory}`);
  } catch (error) {
    if (error?.code === "ENOENT") {
      await fs.mkdir(directory, { recursive: true });
      return;
    }
    throw error;
  }
}

function targetPath(outputDirectory, relativePath) {
  const root = path.resolve(outputDirectory);
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Output path escaped the chosen directory: ${relativePath}`);
  }
  return target;
}

async function writeFiles(outputDirectory, files) {
  for (const file of files) {
    const target = targetPath(outputDirectory, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.bytes);
  }
}

async function readCatalog(filePath) {
  if (!filePath) return undefined;
  const text = await fs.readFile(filePath, "utf8");
  if (path.extname(filePath).toLowerCase() === ".jsonl") {
    return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  }
  return JSON.parse(text);
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const positional = [];
  let accountCatalog;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--account-catalog") {
      accountCatalog = argv[++index];
      if (!accountCatalog) throw new Error("--account-catalog requires a path.");
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) throw new Error("Expected an input ZIP and an empty output directory.");
  return { input: positional[0], output: positional[1], accountCatalog };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const input = path.resolve(args.input);
  const output = path.resolve(args.output);
  if (input === output) throw new Error("Input ZIP and output directory must be different paths.");
  const zipBytes = await fs.readFile(input);
  const archiveHash = sha256(zipBytes);
  const entries = zip.readZipEntries(zipBytes);
  const parsedEntries = entries.map((entry) => ({ name: entry.name, bytes: entry.bytes, text: entry.bytes.toString("utf8") }));
  const discovered = officialCore.discoverConversations(parsedEntries);
  const derived = discovered.conversations.map(officialCore.deriveConversation);
  const valid = derived.filter((item) => item.ok);
  const invalid = derived.filter((item) => !item.ok);
  const accountCatalog = await readCatalog(args.accountCatalog);
  const reconciliation = officialCore.reconciliation(valid, accountCatalog);
  const runId = `official-${archiveHash.digest.slice(0, 16)}`;

  const conversationRecords = derived.map((item) => ({
    id: item.id,
    title: item.title,
    create_time: item.create_time ?? null,
    update_time: item.update_time ?? null,
    source_pointer: item.source_pointer,
    source_entry: item.source_entry,
    source_index: item.source_index,
    ok: item.ok,
    counts: item.counts || null,
    error: item.error || null,
  }));
  const nodes = valid.flatMap((item) => item.graph.nodes.map((node) => ({
    conversation_id: item.id,
    official_source_pointer: item.source_pointer,
    ...node,
  })));
  const edges = valid.flatMap((item) => item.graph.edges.map((edge) => ({
    conversation_id: item.id,
    official_source_pointer: item.source_pointer,
    ...edge,
  })));
  const messages = valid.flatMap((item) => item.messages.map((record) => ({ conversation_id: item.id, ...record })));
  const tools = valid.flatMap((item) => item.tools.map((record) => ({ conversation_id: item.id, ...record })));
  const citations = valid.flatMap((item) => item.citations.map((record) => ({ conversation_id: item.id, ...record })));
  const artifacts = valid.flatMap((item) => item.artifacts.map((record) => ({ conversation_id: item.id, ...record })));

  const files = [
    { path: "raw/official-export.zip", bytes: zipBytes },
    { path: "normalized/conversations.jsonl", bytes: Buffer.from(jsonl(conversationRecords), "utf8") },
    { path: "normalized/nodes.jsonl", bytes: Buffer.from(jsonl(nodes), "utf8") },
    { path: "normalized/edges.jsonl", bytes: Buffer.from(jsonl(edges), "utf8") },
    { path: "normalized/messages.jsonl", bytes: Buffer.from(jsonl(messages), "utf8") },
    { path: "normalized/tool-events.jsonl", bytes: Buffer.from(jsonl(tools), "utf8") },
    { path: "normalized/citations.jsonl", bytes: Buffer.from(jsonl(citations), "utf8") },
    { path: "normalized/artifacts.jsonl", bytes: Buffer.from(jsonl(artifacts), "utf8") },
    { path: "validation/reconciliation.json", bytes: Buffer.from(json(reconciliation), "utf8") },
  ];
  const manifest = {
    schema_version: officialCore.OFFICIAL_SCHEMA_VERSION,
    provenance_schema_version: core.SCHEMA_VERSION,
    run_id: runId,
    source_archive: {
      input_name: path.basename(input),
      bytes: archiveHash.bytes,
      sha256: archiveHash.digest,
      preserved_at: "raw/official-export.zip",
    },
    zip_entry_count: entries.length,
    conversation_documents: discovered.documents,
    unrecognized_json: discovered.unrecognizedJson,
    invalid_json: discovered.invalidDocuments,
    duplicate_conversation_ids: discovered.duplicateIds,
    counts: {
      conversations: derived.length,
      valid_conversations: valid.length,
      invalid_conversations: invalid.length,
      nodes: nodes.length,
      edges: edges.length,
      messages: messages.length,
      tool_events: tools.length,
      citations: citations.length,
      artifacts: artifacts.length,
    },
    reconciliation_status: reconciliation.status,
    files: [
      "raw/official-export.zip",
      "normalized/conversations.jsonl",
      "normalized/nodes.jsonl",
      "normalized/edges.jsonl",
      "normalized/messages.jsonl",
      "normalized/tool-events.jsonl",
      "normalized/citations.jsonl",
      "normalized/artifacts.jsonl",
      "validation/reconciliation.json",
      "integrity/SHA256SUMS.json",
    ],
    limitations: [
      "The official ZIP is an independent source and is not silently merged with browser/account evidence.",
      "Unrecognized, duplicate, malformed, missing, and metadata-disagreeing records remain explicit findings.",
    ],
  };
  files.push({ path: "manifest.json", bytes: Buffer.from(json(manifest), "utf8") });
  const hashes = {};
  for (const file of files) hashes[file.path] = sha256(file.bytes);
  const sums = {
    schema_version: officialCore.OFFICIAL_SCHEMA_VERSION,
    run_id: runId,
    hashes,
    note: "SHA256SUMS.json intentionally excludes itself.",
  };
  files.push({ path: "integrity/SHA256SUMS.json", bytes: Buffer.from(json(sums), "utf8") });

  await ensureEmptyOutput(output);
  await writeFiles(output, files);
  console.log(JSON.stringify({
    ok: true,
    run_id: runId,
    output,
    zip_entries: entries.length,
    conversations: derived.length,
    valid_conversations: valid.length,
    invalid_conversations: invalid.length,
    nodes: nodes.length,
    tool_events: tools.length,
    citations: citations.length,
    reconciliation_status: reconciliation.status,
  }));
}

main(process.argv.slice(2)).catch((error) => fail(error?.message || String(error)));

