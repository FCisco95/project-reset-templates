import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const SCORER = resolve(__dirname, "../full-product/scripts/score_project.mjs");

function runScorer(cwd: string): { score: number; findings: any[] } {
  const out = execSync(`node "${SCORER}" --json`, { cwd, encoding: "utf-8" });
  return JSON.parse(out);
}

function mkproject(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "score-test-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(resolve(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  // Make it a git repo so the "last commit ≤30d" check can pass/fail meaningfully.
  execSync("git init -q && git config user.email t@t && git config user.name t && git add -A && git commit -q --allow-empty -m init", { cwd: dir });
  return dir;
}

describe("score_project.mjs", () => {
  let dir: string;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("perfect scaffold scores 100/100", () => {
    const today = new Date().toISOString().slice(0, 10);
    dir = mkproject({
      "docs/NORTH-STAR.md": `---\nproject: x\nupdated: ${today}\nstatus: building\nscore: 100/100\n---\n\n# WHY\nReason.\n\n# WIN CONDITION\nBy 2026-12-31: win.\n\n# NOT DOING\n- a\n- b\n- c\n\n# WHERE WE ARE\n- a\n\n# NEXT STEP\nDo a.\n`,
      "AGENTS.md": "# AGENTS\n\n## What this is\nx\n\n## Where things live\n| Concern | Path |\n|---|---|\n| ai | lib/ai/ |\n\n## Commands\n- Dev: pnpm dev\n\n## Conventions\n- conv\n\n## What NOT to do\n- dont\n",
      "CLAUDE.md": "# AGENTS\n\n## What this is\nx\n\n## Where things live\n| Concern | Path |\n|---|---|\n| ai | lib/ai/ |\n\n## Commands\n- Dev: pnpm dev\n\n## Conventions\n- conv\n\n## What NOT to do\n- dont\n",
      "docs/HANDOFF.md": `# Handoff\n**Updated:** ${today}\n`,
      "README.md": `# x\n\nStatus: 🟡 Active\n`,
      ".gitignore": "node_modules/\n.env\n",
    });
    const result = runScorer(dir);
    expect(result.score).toBeGreaterThanOrEqual(95);
  });

  it("missing NORTH-STAR loses 20 points", () => {
    dir = mkproject({
      "AGENTS.md": "# A\n## What this is\nx\n## Where things live\n| a | b |\n|---|---|\n| c | d |\n## Commands\n- x\n## Conventions\n- x\n## What NOT to do\n- x\n",
      "CLAUDE.md": "# A\n## What this is\nx\n## Where things live\n| a | b |\n|---|---|\n| c | d |\n## Commands\n- x\n## Conventions\n- x\n## What NOT to do\n- x\n",
      "README.md": "# x\n",
    });
    const result = runScorer(dir);
    expect(result.score).toBeLessThanOrEqual(80);
    const ns = result.findings.find((f: any) => f.dim === "north-star");
    expect(ns.points).toBe(0);
  });

  it("stale NORTH-STAR (>14d) loses 15 of 20 points", () => {
    const stale = new Date(); stale.setDate(stale.getDate() - 30);
    const staleStr = stale.toISOString().slice(0, 10);
    dir = mkproject({
      "docs/NORTH-STAR.md": `---\nproject: x\nupdated: ${staleStr}\nstatus: building\nscore: 90/100\n---\n\n# WHY\nx\n# WIN CONDITION\nx\n# NEXT STEP\nx\n`,
      "AGENTS.md": "# A\n## What this is\nx\n## Where things live\n| a | b |\n|---|---|\n| c | d |\n## Commands\n- x\n## Conventions\n- x\n## What NOT to do\n- x\n",
      "CLAUDE.md": "# A\n## What this is\nx\n## Where things live\n| a | b |\n|---|---|\n| c | d |\n## Commands\n- x\n## Conventions\n- x\n## What NOT to do\n- x\n",
      "README.md": "# x\n",
    });
    const result = runScorer(dir);
    const ns = result.findings.find((f: any) => f.dim === "north-star");
    expect(ns.points).toBe(5);
  });

  it("missing AGENTS.md loses 15 points", () => {
    const today = new Date().toISOString().slice(0, 10);
    dir = mkproject({
      "docs/NORTH-STAR.md": `---\nproject: x\nupdated: ${today}\nstatus: building\nscore: 100/100\n---\n# WHY\nx\n# WIN CONDITION\nx\n# NEXT STEP\nx\n`,
      "README.md": "# x\n",
    });
    const result = runScorer(dir);
    const a = result.findings.find((f: any) => f.dim === "agents-md");
    expect(a.points).toBe(0);
  });

  it("recognizes @AGENTS.md import as equivalent to a copy (full 5 pts)", () => {
    const today = new Date().toISOString().slice(0, 10);
    dir = mkproject({
      "docs/NORTH-STAR.md": `---\nproject: x\nupdated: ${today}\nstatus: building\nscore: pending\n---\n\n# WHY\nReason.\n\n# WIN CONDITION\nBy 2026-12-31: win.\n\n# NOT DOING\n- a\n\n# NEXT STEP\nDo a.\n`,
      "AGENTS.md": "# AGENTS\n\n## What this is\nx\n\n## Where things live\n| Concern | Path |\n|---|---|\n| ai | lib/ai/ |\n\n## Commands\n- Dev: pnpm dev\n\n## Conventions\n- conv\n\n## What NOT to do\n- dont\n",
      "CLAUDE.md": "@AGENTS.md",
      "README.md": `# x\n\nStatus: 🟡 Active\n`,
      ".gitignore": "node_modules/\n.env\n",
    });
    const result = runScorer(dir);
    const claudeMd = result.findings.find((f: any) => f.dim === "claude-md");
    expect(claudeMd.points).toBe(5);
    expect(claudeMd.note).toMatch(/import/i);
  });

  it("emits human-readable output without --json", () => {
    dir = mkproject({ "README.md": "# x\n" });
    const out = execSync(`node "${SCORER}"`, { cwd: dir, encoding: "utf-8" });
    expect(out).toMatch(/Score: \d+\/100/);
    expect(out).toMatch(/Healthy|Drifting|Lost/);
  });
});
