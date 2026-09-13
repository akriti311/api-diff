import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compareSpecs } from "../src/compareSpecs.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readFixture(folder: string, file: string): string {
  return readFileSync(join(root, "testdata/fixtures", folder, file), "utf8");
}

describe("compareSpecs", () => {
  it("classifies the hero example as a breaking response property removal", () => {
    const result = compareSpecs(
      readFixture("removed-response-property", "old.yaml"),
      readFixture("removed-response-property", "new.yaml")
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.report.summary).toMatchObject({
      total: 1,
      removed: 1,
      breaking: 1,
      nonBreaking: 0,
      warnings: 0
    });
    expect(result.report.changes[0]).toMatchObject({
      ruleId: "schema.property.removed.response",
      severity: "breaking",
      oldValue: "name",
      location: { method: "GET", path: "/users/{id}" }
    });
    expect(result.report.changes[0]?.explanation).toMatch(/name/);
    expect(result.report.meta.oldVersion).toBe("1.0.0");
    expect(result.report.meta.newVersion).toBe("1.1.0");
  });

  it("returns no changes for identical specs", () => {
    const result = compareSpecs(
      readFixture("identical", "old.yaml"),
      readFixture("identical", "new.yaml")
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.report.summary.total).toBe(0);
  });

  it("keeps invalid specs as INVALID_SPEC without classifying", () => {
    const result = compareSpecs("{", readFixture("identical", "new.yaml"));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("old");
  });
});
