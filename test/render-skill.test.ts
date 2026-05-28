import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");

function renderSkill(): string {
  const outDir = mkdtempSync(join(tmpdir(), "skill-test-"));
  const args = [
    'project_name="my-test-skill"',
    'project_why="Test skill render."',
    'win_condition="By 2026-12-31: skill ships v1"',
    'author_name="Cisco Vieira"', 'author_email="x"',
    'year="2026"', 'today="2026-05-28"',
    'archetype="skill"', 'stack="cc-skill"',
  ].map(a => `--data ${a}`).join(" ");
  execSync(`copier copy "${REPO}/overlay" "${outDir}" --defaults --trust ${args}`, { stdio: "pipe" });
  execSync(`copier copy "${REPO}/skill" "${outDir}" --defaults --trust --overwrite ${args}`, { stdio: "pipe" });
  return outDir;
}

describe("skill render", () => {
  let outDir: string;
  afterEach(() => outDir && rmSync(outDir, { recursive: true, force: true }));

  it("produces expected skill scaffold", () => {
    outDir = renderSkill();
    const required = [
      "AGENTS.md", "README.md", ".editorconfig", ".gitignore", "LICENSE",
      "SKILL.md", "plugin.json", "references/.gitkeep",
      "docs/NORTH-STAR.md", "docs/ROADMAP.md", "docs/HANDOFF.md",
      "docs/superpowers/specs/.gitkeep", "docs/superpowers/plans/.gitkeep",
      ".claude/skills-map.json", ".claude/settings.json",
      "scripts/install-hooks.sh", "scripts/install-hooks.ps1",
    ];
    for (const p of required) {
      expect(existsSync(join(outDir, p)), `missing: ${p}`).toBe(true);
    }
  });

  it("SKILL.md has project name + frontmatter", () => {
    outDir = renderSkill();
    const skill = readFileSync(join(outDir, "SKILL.md"), "utf-8");
    expect(skill).toContain("name: my-test-skill");
    expect(skill).toContain("Test skill render.");
  });

  it("plugin.json is valid JSON with project name", () => {
    outDir = renderSkill();
    const plugin = JSON.parse(readFileSync(join(outDir, "plugin.json"), "utf-8"));
    expect(plugin.name).toBe("my-test-skill");
    expect(plugin.version).toBe("0.1.0");
  });

  it("does NOT have full-product extras", () => {
    outDir = renderSkill();
    expect(existsSync(join(outDir, "TASKS"))).toBe(false);
  });
});
