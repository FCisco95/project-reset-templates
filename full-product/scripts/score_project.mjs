#!/usr/bin/env node
// Health scorer (0-100). Implements §7.3 of project-reset spec.
// Usage: node scripts/score_project.mjs [--json]

import { existsSync, readFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const cwd = process.cwd();
const JSON_OUT = process.argv.includes("--json");

const RUBRIC = [
  { dim: "north-star", weight: 20, check: checkNorthStar },
  { dim: "agents-md", weight: 15, check: checkAgentsMd },
  { dim: "claude-md", weight: 5, check: checkClaudeMd },
  { dim: "handoff", weight: 10, check: checkHandoff },
  { dim: "hub-doc", weight: 10, check: checkHubDoc },
  { dim: "decisions-log", weight: 10, check: checkDecisionsLog },
  { dim: "scope-discipline", weight: 10, check: checkScopeDiscipline },
  { dim: "repo-basics", weight: 20, check: checkRepoBasics },
];

function read(rel) { return existsSync(resolve(cwd, rel)) ? readFileSync(resolve(cwd, rel), "utf-8") : null; }
function ageDays(date) { return Math.floor((Date.now() - date.getTime()) / 86400000); }
function parseUpdated(s) { if (!s) return null; const m = s.match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m); return m ? new Date(m[1]) : null; }

function checkNorthStar() {
  const c = read("docs/NORTH-STAR.md");
  if (!c) return { points: 0, max: 20, note: "missing" };
  const updated = parseUpdated(c);
  const words = c.split(/\s+/).length;
  if (words > 300) return { points: 10, max: 20, note: "over 300 words" };
  if (!updated) return { points: 5, max: 20, note: "no updated: frontmatter" };
  const days = ageDays(updated);
  if (days <= 14) return { points: 20, max: 20, note: `fresh (${days}d)` };
  return { points: 5, max: 20, note: `stale (${days}d old)` };
}

function checkAgentsMd() {
  const c = read("AGENTS.md");
  if (!c) return { points: 0, max: 15, note: "missing" };
  // Canonical AGENTS.md has 5 section headers: What this is, Where things live, Commands, Conventions, What NOT to do.
  const sections = ["what this is", "where things live", "commands", "conventions", "what not to do"];
  const matched = sections.filter(s => new RegExp(`^#+\\s*${s}`, "im").test(c)).length;
  if (matched >= 4) return { points: 15, max: 15, note: `present + structured (${matched}/5 sections)` };
  if (!/where things live/i.test(c)) return { points: 10, max: 15, note: "no 'Where things live' table" };
  if (c.split(/\s+/).length < 100) return { points: 5, max: 15, note: "too short" };
  return { points: 10, max: 15, note: `partial structure (${matched}/5 sections)` };
}

function checkClaudeMd() {
  const c = read("CLAUDE.md");
  const a = read("AGENTS.md");
  if (!c) return { points: 0, max: 5, note: "missing" };
  if (!a) return { points: 0, max: 5, note: "AGENTS.md missing — can't validate match" };
  if (c.trim() === a.trim()) return { points: 5, max: 5, note: "matches AGENTS.md" };
  return { points: 2, max: 5, note: "exists but differs from AGENTS.md" };
}

function checkHandoff() {
  const c = read("docs/HANDOFF.md");
  if (!c) return { points: 0, max: 10, note: "missing" };
  try {
    const lastCommit = new Date(execSync("git log -1 --format=%cI", { cwd, encoding: "utf-8" }).trim());
    const handoffMtime = statSync(resolve(cwd, "docs/HANDOFF.md")).mtime;
    const diffDays = Math.abs((lastCommit - handoffMtime) / 86400000);
    if (diffDays <= 7) return { points: 10, max: 10, note: "fresh" };
    return { points: 5, max: 10, note: `${Math.floor(diffDays)}d behind last commit` };
  } catch {
    return { points: 5, max: 10, note: "exists, no git history" };
  }
}

function checkHubDoc() {
  if (read("_hub/Home.md")) return { points: 10, max: 10, note: "_hub/Home.md present" };
  const r = read("README.md");
  if (!r) return { points: 0, max: 10, note: "no README, no hub" };
  if (/status/i.test(r)) return { points: 10, max: 10, note: "README has status" };
  return { points: 7, max: 10, note: "README present, no status section" };
}

function checkDecisionsLog() {
  if (read("DECISIONS.md")) return { points: 10, max: 10, note: "DECISIONS.md present" };
  const ns = read("docs/NORTH-STAR.md");
  if (ns && /OPEN DECISIONS/i.test(ns)) return { points: 10, max: 10, note: "in NORTH-STAR" };
  // Canonical NORTH-STAR with WHY + WIN CONDITION + NEXT STEP implies decisions are tracked inline.
  if (ns && /^#+\s*WHY\b/im.test(ns) && /^#+\s*WIN CONDITION\b/im.test(ns) && /^#+\s*NEXT STEP\b/im.test(ns)) {
    return { points: 10, max: 10, note: "decisions tracked in NORTH-STAR structure" };
  }
  return { points: 0, max: 10, note: "no decisions tracked" };
}

function checkScopeDiscipline() {
  const ns = read("docs/NORTH-STAR.md");
  if (ns && /NOT DOING/i.test(ns)) return { points: 10, max: 10, note: "NOT DOING in NORTH-STAR" };
  const prd = read("docs/PRD.md");
  if (prd && /out of scope/i.test(prd)) return { points: 10, max: 10, note: "Out of Scope in PRD" };
  return { points: 0, max: 10, note: "no scope discipline doc" };
}

function checkRepoBasics() {
  let pts = 0;
  const max = 20;
  const findings = [];
  if (read(".gitignore")) { pts += 5; findings.push(".gitignore ✓"); }
  else findings.push(".gitignore missing");
  try {
    const tracked = execSync("git ls-files", { cwd, encoding: "utf-8" });
    if (!/\.env(\s|$)/m.test(tracked)) { pts += 5; findings.push("no .env committed ✓"); }
    else findings.push(".env committed (LEAK)");
  } catch { pts += 5; }
  try {
    const last = new Date(execSync("git log -1 --format=%cI", { cwd, encoding: "utf-8" }).trim());
    if (ageDays(last) <= 30) { pts += 5; findings.push(`last commit ${ageDays(last)}d ago ✓`); }
    else findings.push(`last commit ${ageDays(last)}d ago (stale)`);
  } catch { findings.push("no git history"); }
  const pkg = read("package.json");
  if (read(".github/workflows/ci.yml") || /\"test\":/.test(pkg || "")) {
    pts += 5; findings.push("test script or CI ✓");
  } else if (!pkg) {
    // Non-JS project — can't penalize for a missing package.json; treat as N/A.
    pts += 5; findings.push("no package.json (N/A)");
  } else findings.push("no test script or CI");
  return { points: pts, max, note: findings.join("; ") };
}

const results = RUBRIC.map(r => ({ dim: r.dim, weight: r.weight, ...r.check() }));
const score = results.reduce((s, r) => s + r.points, 0);
const band = score >= 85 ? "Healthy ✅" : score >= 60 ? "Drifting ⚠️" : "Lost ❌";

if (JSON_OUT) {
  console.log(JSON.stringify({ score, band, findings: results }, null, 2));
} else {
  console.log(`Score: ${score}/100 — ${band}\n`);
  for (const r of results) {
    const bar = `${r.points}/${r.max}`.padStart(6);
    console.log(`  [${bar}] ${r.dim.padEnd(20)} ${r.note}`);
  }
}
