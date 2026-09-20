#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const core = require("../core.js");
globalThis.ChatGPTProvenanceCore = core;
const evalCore = require("../eval-core.js");

const USAGE = `Usage:
  node tools/export-eval-trace.mjs <capture-bundle-directory> <output-trace.json> [--live-events <events.json>]
  node tools/export-eval-trace.mjs --help

The adapter is local-only and writes a namespaced portable trace; it does not claim native external Eval Lab integration.`;

function json(value) {
  return `${core.stableStringify(value, 2)}\n`;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readJsonl(file) {
  const text = await fs.readFile(file, "utf8");
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) return { help: true };
  const positional = [];
  let liveEvents;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--live-events") {
      liveEvents = argv[++index];
      if (!liveEvents) throw new Error("--live-events requires a path.");
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else positional.push(arg);
  }
  if (positional.length !== 2) throw new Error("Expected a capture bundle directory and output trace path.");
  return { bundle: positional[0], output: positional[1], liveEvents };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(USAGE);
    return;
  }
  const bundle = path.resolve(args.bundle);
  const output = path.resolve(args.output);
  if (output.startsWith(`${bundle}${path.sep}`)) throw new Error("Trace output must not be inside the input bundle.");
  const manifest = await readJson(path.join(bundle, "manifest.json"));
  const nodes = await readJsonl(path.join(bundle, "normalized", "nodes.jsonl"));
  const edges = await readJsonl(path.join(bundle, "normalized", "edges.jsonl"));
  const tools = await readJsonl(path.join(bundle, "normalized", "tool-events.jsonl"));
  const liveEvents = args.liveEvents ? await readJson(args.liveEvents) : [];
  if (!Array.isArray(liveEvents)) throw new Error("Live events input must be a JSON array.");
  const graph = { nodes, edges };
  const trace = evalCore.buildTrace({
    traceId: manifest.capture_id || manifest.run_id || "unknown-trace",
    graph,
    tools,
    liveEvents,
  });
  const validation = evalCore.validateTrace(trace, graph, tools);
  if (validation.status !== "no_differences_observed") throw new Error(`Trace validation failed: ${JSON.stringify(validation)}`);
  const outputObject = { ...trace, validation };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, json(outputObject), { flag: "wx" });
  console.log(JSON.stringify({ ok: true, output, spans: trace.spans.length, validation: validation.status }));
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`ERROR: ${error?.message || String(error)}`);
  process.exitCode = 1;
});

