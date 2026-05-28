import { describe, it, expect, afterEach } from "vitest";
import { renderTemplate, fileExists, readFile } from "./helpers/copier";
import { resolve } from "node:path";

const TEMPLATES_ROOT = resolve(__dirname, "..");

describe("overlay render (full-product)", () => {
  let cleanup: () => void;
  afterEach(() => cleanup?.());

  it("renders AGENTS.md with project name + why", () => {
    const r = renderTemplate({
      templateDir: resolve(TEMPLATES_ROOT, "overlay"),
      data: {
        project_name: "test-proj",
        project_why: "A test project for snapshotting.",
        author_name: "Cisco Vieira",
        author_email: "cisco@example.com",
        year: "2026",
        archetype: "full-product",
        stack: "nextjs-t3",
      },
    });
    cleanup = r.cleanup;

    expect(fileExists(r.outDir, "AGENTS.md")).toBe(true);
    const agents = readFile(r.outDir, "AGENTS.md");
    expect(agents).toContain("# AGENTS.md — test-proj");
    expect(agents).toContain("A test project for snapshotting.");
    expect(agents).toContain("docs/NORTH-STAR.md");
  });

  it("renders README.md with project name + author", () => {
    const r = renderTemplate({
      templateDir: resolve(TEMPLATES_ROOT, "overlay"),
      data: {
        project_name: "test-proj",
        project_why: "A test project.",
        author_name: "Cisco Vieira",
        author_email: "cisco@example.com",
        year: "2026",
        archetype: "full-product",
        stack: "nextjs-t3",
      },
    });
    cleanup = r.cleanup;

    const readme = readFile(r.outDir, "README.md");
    expect(readme).toContain("# test-proj");
    expect(readme).toContain("MIT © 2026 Cisco Vieira");
  });

  it("renders .gitignore with stack-specific entries", () => {
    const r = renderTemplate({
      templateDir: resolve(TEMPLATES_ROOT, "overlay"),
      data: {
        project_name: "test-proj",
        project_why: "x",
        author_name: "x",
        author_email: "x",
        year: "2026",
        archetype: "full-product",
        stack: "nextjs-t3",
      },
    });
    cleanup = r.cleanup;

    const gi = readFile(r.outDir, ".gitignore");
    expect(gi).toContain(".next/");
    expect(gi).toContain(".vercel/");
    expect(gi).not.toContain(".venv/");
  });

  it("renders .editorconfig verbatim (no jinja in file)", () => {
    const r = renderTemplate({
      templateDir: resolve(TEMPLATES_ROOT, "overlay"),
      data: {
        project_name: "x", project_why: "x", author_name: "x",
        author_email: "x", year: "2026", archetype: "full-product", stack: "nextjs-t3",
      },
    });
    cleanup = r.cleanup;

    expect(fileExists(r.outDir, ".editorconfig")).toBe(true);
  });
});
