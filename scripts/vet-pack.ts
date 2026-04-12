#!/usr/bin/env node
/**
 * ClawHQ Pack Vetter — CLI
 *
 * Usage:
 *   npx tsx scripts/vet-pack.ts [pack-file-or-dir] [--third-party]
 *
 * Examples:
 *   npx tsx scripts/vet-pack.ts packs/code-review.yaml          # vet one pack
 *   npx tsx scripts/vet-pack.ts packs/                          # vet all packs
 *   npx tsx scripts/vet-pack.ts external-pack.yaml --third-party # stricter checks
 *
 * Exit codes:
 *   0 — all pass (or warn only)
 *   1 — at least one FAIL
 */

import fs from "fs";
import path from "path";
import { vetPack, formatVetResult, type VetResult } from "../services/pack-registry/src/vet.js";

const PACKS_DEFAULT = path.resolve(process.cwd(), "packs");
const thirdParty = process.argv.includes("--third-party");

function collectYamlFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs
    .readdirSync(target)
    .filter(f => f.endsWith(".yaml") || f.endsWith(".yml"))
    .map(f => path.join(target, f));
}

function run(): void {
  const arg = process.argv.find(a => !a.startsWith("--") && a !== process.argv[0] && a !== process.argv[1]);
  const target = arg ? path.resolve(arg) : PACKS_DEFAULT;

  let files: string[];
  try {
    files = collectYamlFiles(target);
  } catch {
    console.error(`Error: cannot read target: ${target}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No YAML files found.");
    process.exit(0);
  }

  const results: VetResult[] = [];

  for (const file of files) {
    const yaml = fs.readFileSync(file, "utf8");
    const packId = path.basename(file, path.extname(file));
    const result = vetPack(packId, yaml, { thirdParty });
    results.push(result);
    console.log(formatVetResult(result));
    console.log();
  }

  const failed = results.filter(r => r.status === "fail");
  const warned = results.filter(r => r.status === "warn");
  const passed = results.filter(r => r.status === "pass");

  console.log(
    `── Summary: ${passed.length} passed, ${warned.length} warned, ${failed.length} failed (${results.length} total)`
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

run();
