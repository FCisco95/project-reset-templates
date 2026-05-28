import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");

function renderFullProduct(data: Record<string, string>): string {
  const outDir = mkdtempSync(join(tmpdir(), "fp-test-"));
  const dataArgs = Object.entries(data).map(([k, v]) => `--data ${k}="${v}"`).join(" ");

  // overlay pass
  execSync(`copier copy "${REPO}/overlay" "${outDir}" --defaults --trust ${dataArgs}`, { stdio: "pipe" });
  // full-product pass (overwrites overlap is intentional)
  execSync(`copier copy "${REPO}/full-product" "${outDir}" --defaults --trust --overwrite ${dataArgs}`, { stdio: "pipe" });

  return outDir;
}

describe("full-product render (overlay + archetype)", () => {
  let outDir: string;
  afterEach(() => outDir && rmSync(outDir, { recursive: true, force: true }));

  it("produces the expected file tree", () => {
    outDir = renderFullProduct({
      project_name: "fp-test",
      project_why: "Test project for fp render.",
      win_condition: "By 2026-12-31: integration test passes.",
      author_name: "Cisco Vieira",
      author_email: "cisco@example.com",
      year: "2026",
      today: "2026-05-28",
      archetype: "full-product",
      stack: "nextjs-t3",
    });

    const required = [
      "AGENTS.md",
      "README.md",
      ".editorconfig",
      ".gitignore",
      "LICENSE",
      "docs/NORTH-STAR.md",
      "docs/ROADMAP.md",
      "docs/HANDOFF.md",
      "docs/superpowers/specs/.gitkeep",
      "docs/superpowers/plans/.gitkeep",
      "TASKS/TODAY.md",
      "TASKS/BACKLOG.md",
      "TASKS/items/.gitkeep",
      ".claude/skills-map.json",
      ".claude/settings.json",
      ".claude/hooks/check-north-star.mjs",
      "scripts/install-hooks.sh",
      "scripts/install-hooks.ps1",
      "scripts/score_project.mjs",
    ];

    for (const path of required) {
      expect(existsSync(join(outDir, path)), `missing: ${path}`).toBe(true);
    }
  });

  it("populates NORTH-STAR with project name + why + win condition", () => {
    outDir = renderFullProduct({
      project_name: "fp-test",
      project_why: "Test the north star render.",
      win_condition: "By 2026-12-31: integration test passes.",
      author_name: "Cisco Vieira",
      author_email: "x", year: "2026", today: "2026-05-28",
      archetype: "full-product", stack: "nextjs-t3",
    });

    const ns = readFileSync(join(outDir, "docs/NORTH-STAR.md"), "utf-8");
    expect(ns).toContain("project: fp-test");
    expect(ns).toContain("Test the north star render.");
    expect(ns).toContain("By 2026-12-31: integration test passes.");
    expect(ns).toContain("score: 100/100");
  });

  it("settings.json includes the check-north-star Stop hook", () => {
    outDir = renderFullProduct({
      project_name: "fp-test", project_why: "x", win_condition: "x",
      author_name: "x", author_email: "x", year: "2026", today: "2026-05-28",
      archetype: "full-product", stack: "nextjs-t3",
    });

    const settings = JSON.parse(readFileSync(join(outDir, ".claude/settings.json"), "utf-8"));
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("node .claude/hooks/check-north-star.mjs");
  });
});
