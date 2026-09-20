#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import core from "../core.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  console.log(`Usage:
  node tools/validate-capture-bundle.mjs <capture-bundle-directory>
  node tools/validate-capture-bundle.mjs --help

The validator reads a local bundle and prints aggregate-only JSON. It never prints transcript text, raw node IDs, or event bodies.`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function safeFile(bundle, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative)) {
    throw new Error("unsafe bundle path");
  }
  const root = path.resolve(bundle);
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error("unsafe bundle path");
  if (fs.existsSync(root)) {
    const realRoot = fs.realpathSync.native(root);
    let existing = file;
    while (!fs.existsSync(existing)) {
      const parent = path.dirname(existing);
      if (parent === existing) break;
      existing = parent;
    }
    const realExisting = fs.realpathSync.native(existing);
    if (realExisting !== realRoot && !realExisting.startsWith(`${realRoot}${path.sep}`)) {
      throw new Error("unsafe bundle path");
    }
  }
  return file;
}

function sameJson(left, right) {
  return core.stableStringify(left) === core.stableStringify(right);
}

function edgeKey(edge) {
  return `${edge.from}\u0000${edge.to}`;
}

function addExpectedEdges(mapping) {
  const expected = new Set();
  for (const [nodeId, node] of Object.entries(mapping)) {
    if (node?.parent) expected.add(`${node.parent}\u0000${nodeId}`);
    for (const child of Array.isArray(node?.children) ? node.children : []) {
      expected.add(`${nodeId}\u0000${child}`);
    }
  }
  return expected;
}

function sameRecordMultiset(actual, expected) {
  if (actual.length !== expected.length) return false;
  const counts = new Map();
  for (const record of expected) {
    const key = core.stableStringify(record);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const record of actual) {
    const key = core.stableStringify(record);
    const count = counts.get(key) || 0;
    if (!count) return false;
    if (count === 1) counts.delete(key);
    else counts.set(key, count - 1);
  }
  return counts.size === 0;
}

function validate(bundle) {
  const errors = [];
  const required = [
    "manifest.json",
    "raw/conversation.response.json",
    "normalized/nodes.jsonl",
    "normalized/edges.jsonl",
    "normalized/messages.jsonl",
    "normalized/tool-events.jsonl",
    "normalized/citations.jsonl",
    "normalized/artifacts.jsonl",
    "rendered/rendered-turns.jsonl",
    "validation/reconciliation.json",
    "validation/capture-report.json",
    "integrity/SHA256SUMS.json",
  ];

  let manifest;
  let rawText;
  let conversation;
  let graph;
  let nodes = [];
  let edges = [];
  let messages = [];
  let tools = [];
  let citations = [];
  let artifacts = [];
  let rendered = [];
  let reconciliation = null;
  let report = null;
  let sums;

  try {
    for (const relative of required) {
      if (!fs.existsSync(safeFile(bundle, relative))) errors.push(`missing:${relative}`);
    }
    manifest = readJson(safeFile(bundle, "manifest.json"));
    rawText = fs.readFileSync(safeFile(bundle, "raw/conversation.response.json"), "utf8");
    conversation = JSON.parse(rawText);
    graph = core.normalizeConversation(conversation);
    nodes = readJsonl(safeFile(bundle, "normalized/nodes.jsonl"));
    edges = readJsonl(safeFile(bundle, "normalized/edges.jsonl"));
    messages = readJsonl(safeFile(bundle, "normalized/messages.jsonl"));
    tools = readJsonl(safeFile(bundle, "normalized/tool-events.jsonl"));
    citations = readJsonl(safeFile(bundle, "normalized/citations.jsonl"));
    artifacts = readJsonl(safeFile(bundle, "normalized/artifacts.jsonl"));
    rendered = readJsonl(safeFile(bundle, "rendered/rendered-turns.jsonl"));
    reconciliation = readJson(safeFile(bundle, "validation/reconciliation.json"));
    report = readJson(safeFile(bundle, "validation/capture-report.json"));
    sums = readJson(safeFile(bundle, "integrity/SHA256SUMS.json"));
  } catch (error) {
    errors.push(`read_or_parse:${error?.message || String(error)}`);
  }

  const rawMapping = conversation?.mapping && typeof conversation.mapping === "object" ? conversation.mapping : {};
  const rawNodeIds = new Set(Object.keys(rawMapping));
  const nodeIds = new Set(nodes.map((node) => node?.node_id).filter(Boolean));
  const pointerFailures = [];

  if (nodes.length !== rawNodeIds.size) errors.push("node_count_mismatch");
  if (nodeIds.size !== nodes.length) errors.push("duplicate_or_missing_node_ids");
  for (const node of nodes) {
    const pointerNodeId = core.pointerNodeId(node?.source_pointer);
    if (!pointerNodeId || pointerNodeId !== node.node_id || !rawNodeIds.has(pointerNodeId)) {
      pointerFailures.push("node");
    }
    if (!rawNodeIds.has(node.node_id) || !sameJson(node.raw_node, rawMapping[node.node_id])) {
      errors.push("node_raw_mismatch");
      break;
    }
  }
  if (pointerFailures.length) errors.push("source_pointer_mismatch");

  const actualEdges = new Set(edges.map(edgeKey));
  const expectedEdges = addExpectedEdges(rawMapping);
  let missingEdges = 0;
  for (const expected of expectedEdges) if (!actualEdges.has(expected)) missingEdges += 1;
  if (missingEdges) errors.push("parent_child_edge_missing");
  const invalidEdges = edges.filter((edge) => !rawNodeIds.has(edge?.from) || !rawNodeIds.has(edge?.to));
  if (invalidEdges.length || actualEdges.size !== expectedEdges.size || [...expectedEdges].some((edge) => !actualEdges.has(edge))) {
    errors.push("edge_conservation_mismatch");
  }

  const expectedMessages = graph ? core.deriveMessages(graph.nodes) : [];
  const expectedTools = graph ? core.deriveToolEvents(graph.nodes) : [];
  const expectedCitations = graph ? core.deriveCitations(graph.nodes) : [];
  const expectedArtifacts = graph ? core.deriveArtifacts(graph.nodes) : [];
  if (!sameRecordMultiset(messages, expectedMessages)) errors.push("message_conservation_mismatch");
  if (!sameRecordMultiset(tools, expectedTools)) errors.push("tool_conservation_mismatch");
  if (!sameRecordMultiset(citations, expectedCitations)) errors.push("citation_conservation_mismatch");
  if (!sameRecordMultiset(artifacts, expectedArtifacts)) errors.push("artifact_conservation_mismatch");

  let toolRawMismatches = 0;
  for (const record of tools) {
    const nodeId = core.pointerNodeId(record?.source_pointer) || record?.node_id;
    if (!rawNodeIds.has(nodeId) || !sameJson(record?.raw_node, rawMapping[nodeId])) toolRawMismatches += 1;
  }
  if (toolRawMismatches) errors.push("tool_raw_mismatch");

  let derivedPointerFailures = 0;
  for (const record of [...messages, ...tools, ...citations, ...artifacts]) {
    const nodeId = core.pointerNodeId(record?.source_pointer) || record?.node_id;
    if (!rawNodeIds.has(nodeId)) derivedPointerFailures += 1;
  }
  if (derivedPointerFailures) errors.push("derived_source_pointer_mismatch");

  const reconciliationStatus = reconciliation?.status;
  if (!["no_differences_observed", "differences_observed", "not_established"].includes(reconciliationStatus)) {
    errors.push("invalid_reconciliation_status");
  }

  const expectedCounts = {
    nodes: nodes.length,
    edges: edges.length,
    messages: messages.length,
    tool_events: tools.length,
    citations: citations.length,
    artifacts: artifacts.length,
  };
  if (!report?.counts || Object.keys(expectedCounts).some((key) => report.counts[key] !== expectedCounts[key])) {
    errors.push("capture_report_count_mismatch");
  }

  let hashFailures = 0;
  const manifestFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  const hashEntries = sums?.hashes && typeof sums.hashes === "object" ? Object.keys(sums.hashes) : [];
  const expectedHashEntries = [
    "manifest.json",
    ...manifestFiles.filter((relative) => relative !== "integrity/SHA256SUMS.json" && relative !== "manifest.json"),
  ];
  if (sums?.hashes && typeof sums.hashes === "object") {
    if (new Set(hashEntries).size !== hashEntries.length ||
        new Set(expectedHashEntries).size !== expectedHashEntries.length ||
        hashEntries.length !== expectedHashEntries.length ||
        expectedHashEntries.some((relative) => !sums.hashes[relative]) ||
        hashEntries.some((relative) => !expectedHashEntries.includes(relative))) {
      errors.push("hash_manifest_mismatch");
    }
    for (const [relative, expected] of Object.entries(sums.hashes)) {
      try {
        const bytes = fs.readFileSync(safeFile(bundle, relative));
        const digest = crypto.createHash("sha256").update(bytes).digest("hex");
        if (digest !== expected?.digest || bytes.length !== expected?.bytes) hashFailures += 1;
      } catch (_error) {
        hashFailures += 1;
      }
    }
  } else {
    errors.push("missing_hashes");
  }
  if (hashFailures) errors.push("hash_mismatch");

  try {
    const missingManifestFiles = manifestFiles.filter((relative) => !fs.existsSync(safeFile(bundle, relative)));
    if (missingManifestFiles.length) errors.push("manifest_file_missing");
  } catch (error) {
    errors.push(`manifest_path:${error?.message || String(error)}`);
  }

  return {
    ok: errors.length === 0,
    status: errors.length === 0 ? "no_differences_observed" : "differences_observed",
    errors: [...new Set(errors)],
    raw_bytes: Buffer.byteLength(rawText || "", "utf8"),
    mapping_nodes: rawNodeIds.size,
    normalized_nodes: nodes.length,
    unique_node_ids: nodeIds.size,
    normalized_edges: edges.length,
    explicit_edges_expected: expectedEdges.size,
    missing_edges: missingEdges,
    messages: messages.length,
    tools: tools.length,
    tool_raw_mismatches: toolRawMismatches,
    citations: citations.length,
    artifacts: artifacts.length,
    rendered_turns: rendered.length,
    rendered_reconciliation: reconciliationStatus || null,
    source_pointer_failures: pointerFailures.length + derivedPointerFailures,
    hash_entries: sums?.hashes ? Object.keys(sums.hashes).length : 0,
    hash_failures: hashFailures,
    manifest_files: manifestFiles.length,
  };
}

if (process.argv[2] === "--help" || process.argv.length < 3) {
  usage();
  process.exit(process.argv.length < 3 ? 1 : 0);
}

const result = validate(path.resolve(process.argv[2]));
console.log(JSON.stringify(result));
process.exit(result.ok ? 0 : 1);
