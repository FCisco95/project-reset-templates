import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");

function renderResearchSpike(): string {
  const outDir = mkdtempSync(join(tmpdir(), "rs-test-"));
  const args = [
    'project_name="rs-test"',
    'project_why="Test the research-spike render."',
    'win_condition="By 2026-12-31: convert or archive"',
    'author_name="Cisco Vieira"', 'author_email="x"',
    'year="2026"', 'today="2026-05-28"',
    'archetype="research-spike"', 'stack="python-uv"',
  ].map(a => `--data ${a}`).join(" ");
  execSync(`copier copy "${REPO}/overlay" "${outDir}" --defaults --trust ${args}`, { stdio: "pipe" });
  execSync(`copier copy "${REPO}/research-spike" "${outDir}" --defaults --trust --overwrite ${args}`, { stdio: "pipe" });
  return outDir;
}

describe("research-spike render", () => {
  let outDir: string;
  afterEach(() => outDir && rmSync(outDir, { recursive: true, force: true }));

  it("produces the lite bundle", () => {
    outDir = renderResearchSpike();
    const required = [
      "AGENTS.md", "README.md", ".editorconfig", ".gitignore",
      "docs/NORTH-STAR.md", "docs/NOTES.md", "docs/HANDOFF.md", "docs/sources/.gitkeep",
      ".claude/skills-map.json", ".claude/settings.json",
    ];
    for (const p of required) expect(existsSync(join(outDir, p)), `missing: ${p}`).toBe(true);
    expect(existsSync(join(outDir, "TASKS"))).toBe(false);
    expect(existsSync(join(outDir, "docs/ROADMAP.md"))).toBe(false);
    expect(existsSync(join(outDir, "LICENSE"))).toBe(false);
  });

  it("NORTH-STAR has KILL CRITERIA section (not NOT DOING)", () => {
    outDir = renderResearchSpike();
    const ns = readFileSync(join(outDir, "docs/NORTH-STAR.md"), "utf-8");
    expect(ns).toContain("KILL CRITERIA");
    expect(ns).not.toContain("NOT DOING");
  });
});
