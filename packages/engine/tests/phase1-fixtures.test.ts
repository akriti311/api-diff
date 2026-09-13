import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixturesRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../testdata/fixtures"
);

function readFixture(folder: string, file: string): string {
  return readFileSync(join(fixturesRoot, folder, file), "utf8");
}

describe("Phase 1 sample fixtures", () => {
  it("includes every planned fixture pair", () => {
    const required = [
      "removed-response-property/old.yaml",
      "removed-response-property/new.yaml",
      "identical/old.yaml",
      "identical/new.yaml",
      "added-endpoint/old.yaml",
      "added-endpoint/new.yaml",
      "removed-endpoint/old.yaml",
      "removed-endpoint/new.yaml",
      "json-format/old.json",
      "json-format/new.json"
    ];

    for (const relative of required) {
      expect(existsSync(join(fixturesRoot, relative)), relative).toBe(true);
    }
  });

  it("hero example: old contract has name, new contract does not", () => {
    const oldSpec = readFixture("removed-response-property", "old.yaml");
    const newSpec = readFixture("removed-response-property", "new.yaml");

    expect(oldSpec).toContain("openapi: 3.0.3");
    expect(newSpec).toContain("openapi: 3.0.3");
    expect(oldSpec).toContain("/users/{id}");
    expect(oldSpec).toMatch(/name:\s*\n\s*type: string/);
    expect(newSpec).not.toMatch(/name:\s*\n\s*type: string/);
  });

  it("exports compareSpecs after the rule engine", async () => {
    const engine = await import("../src/index.js");
    expect("compareSpecs" in engine).toBe(true);
  });
});
