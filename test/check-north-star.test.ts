import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const HOOK = resolve(__dirname, "../full-product/.claude/hooks/check-north-star.mjs");

function setupProject(northStarDate: Date | null, todayDate: Date | null): string {
  const dir = mkdtempSync(join(tmpdir(), "hook-test-"));
  if (northStarDate) {
    mkdirSync(join(dir, "docs"), { recursive: true });
    const date = northStarDate.toISOString().slice(0, 10);
    writeFileSync(
      join(dir, "docs/NORTH-STAR.md"),
      `---\nproject: x\nupdated: ${date}\nstatus: building\nscore: 90/100\n---\n\n# WHY\nx\n`
    );
  }
  if (todayDate) {
    mkdirSync(join(dir, "TASKS"), { recursive: true });
    writeFileSync(join(dir, "TASKS/TODAY.md"), `---\ntype: today\ndate: ${todayDate.toISOString().slice(0,10)}\n---\n# Today\n`);
  }
  return dir;
}

function runHook(cwd: string): string {
  try {
    return execSync(`node "${HOOK}"`, { cwd, encoding: "utf-8" });
  } catch (e: any) {
    return e.stdout?.toString() ?? "";
  }
}

describe("check-north-star.mjs", () => {
  let dir: string;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("silent when NORTH-STAR is fresh (≤14d)", () => {
    const fresh = new Date(); fresh.setDate(fresh.getDate() - 3);
    dir = setupProject(fresh, new Date());
    const out = runHook(dir);
    expect(out.trim()).toBe("");
  });

  it("nudges when NORTH-STAR is 15+ days old", () => {
    const stale = new Date(); stale.setDate(stale.getDate() - 18);
    dir = setupProject(stale, new Date());
    const out = runHook(dir);
    expect(out).toMatch(/NORTH-STAR is 1[78] days old/);
    expect(out).toContain("/project-reset --mode=refocus");
  });

  it("escalates when NORTH-STAR stale AND TODAY untouched this week", () => {
    const stale = new Date(); stale.setDate(stale.getDate() - 20);
    const todayOld = new Date(); todayOld.setDate(todayOld.getDate() - 10);
    dir = setupProject(stale, todayOld);
    const out = runHook(dir);
    expect(out).toContain("⚠️");
    expect(out).toContain("/project-reset");
  });

  it("silent when NORTH-STAR is missing (don't spam on non-scaffolded projects)", () => {
    dir = setupProject(null, null);
    const out = runHook(dir);
    expect(out.trim()).toBe("");
  });
});
