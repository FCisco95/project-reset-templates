import { describe, it, expect, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");

function renderScript(): string {
  const outDir = mkdtempSync(join(tmpdir(), "script-test-"));
  const args = [
    'project_name="script-test"', 'project_why="Test script render."',
    'author_name="Cisco Vieira"', 'author_email="x"',
    'year="2026"', 'archetype="script"', 'stack="python-uv"',
  ].map(a => `--data ${a}`).join(" ");
  execSync(`copier copy "${REPO}/overlay" "${outDir}" --defaults --trust ${args}`, { stdio: "pipe" });
  execSync(`copier copy "${REPO}/script" "${outDir}" --defaults --trust --overwrite ${args}`, { stdio: "pipe" });
  return outDir;
}

describe("script render", () => {
  let outDir: string;
  afterEach(() => outDir && rmSync(outDir, { recursive: true, force: true }));

  it("produces minimal bundle", () => {
    outDir = renderScript();
    const required = [
      "AGENTS.md", "README.md", ".editorconfig", ".gitignore",
      ".claude/skills-map.json", ".claude/settings.json",
    ];
    for (const p of required) expect(existsSync(join(outDir, p)), `missing: ${p}`).toBe(true);
    expect(existsSync(join(outDir, "docs"))).toBe(false);
    expect(existsSync(join(outDir, "TASKS"))).toBe(false);
    expect(existsSync(join(outDir, "LICENSE"))).toBe(false);
    expect(existsSync(join(outDir, "scripts"))).toBe(false);
  });
});
