import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("environment", () => {
  it("copier is installed", () => {
    const version = execSync("copier --version", { encoding: "utf-8" });
    expect(version).toMatch(/copier \d+\.\d+\.\d+/);
  });
});
