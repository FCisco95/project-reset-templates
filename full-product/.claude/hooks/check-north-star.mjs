#!/usr/bin/env node
// Per-project Stop hook installed by /project-reset (full-product archetype).
// Nudges when NORTH-STAR.md is stale (>14 days). Silent otherwise.
// To disable: remove the Stop hook block in .claude/settings.json.

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const NS = resolve(process.cwd(), "docs/NORTH-STAR.md");
const TODAY = resolve(process.cwd(), "TASKS/TODAY.md");

const STALE_DAYS = 14;
const TODAY_STALE_DAYS = 7;

function daysSince(date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function parseUpdated(content) {
  const m = content.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m);
  return m ? new Date(m[1]) : null;
}

if (!existsSync(NS)) {
  // Not a /project-reset-scaffolded project — silent.
  process.exit(0);
}

const nsContent = readFileSync(NS, "utf-8");
const updated = parseUpdated(nsContent);
if (!updated) process.exit(0);

const nsAgeDays = daysSince(updated);
if (nsAgeDays <= STALE_DAYS) process.exit(0);

let todayAgeDays = Infinity;
if (existsSync(TODAY)) {
  const todayContent = readFileSync(TODAY, "utf-8");
  const todayDate = parseUpdated(todayContent.replace(/^date:/m, "updated:"));
  if (todayDate) todayAgeDays = daysSince(todayDate);
  else todayAgeDays = daysSince(statSync(TODAY).mtime);
}

if (todayAgeDays > TODAY_STALE_DAYS) {
  console.log(`⚠️  NORTH-STAR is ${nsAgeDays} days old AND TASKS/TODAY hasn't been touched this week.`);
  console.log(`   Strong signal you've drifted. Run: /project-reset --mode=refocus`);
} else {
  console.log(`NORTH-STAR is ${nsAgeDays} days old — want to run /project-reset --mode=refocus?`);
}
process.exit(0);
