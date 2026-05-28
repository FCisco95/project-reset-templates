import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function renderTemplate(opts: {
  templateDir: string;
  data: Record<string, string>;
  archetype?: string;
}): { outDir: string; cleanup: () => void } {
  const outDir = mkdtempSync(join(tmpdir(), "copier-test-"));
  const dataArgs = Object.entries(opts.data)
    .map(([k, v]) => `--data ${k}="${v}"`)
    .join(" ");
  const archetypeArg = opts.archetype ? `--data archetype="${opts.archetype}"` : "";
  execSync(
    `copier copy "${opts.templateDir}" "${outDir}" --defaults --trust ${archetypeArg} ${dataArgs}`,
    { stdio: "pipe" }
  );
  return {
    outDir,
    cleanup: () => rmSync(outDir, { recursive: true, force: true }),
  };
}

export function fileExists(outDir: string, relPath: string): boolean {
  return existsSync(join(outDir, relPath));
}

export function readFile(outDir: string, relPath: string): string {
  return readFileSync(join(outDir, relPath), "utf-8");
}
