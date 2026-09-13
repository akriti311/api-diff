import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compareSpecs } from "../src/compareSpecs.js";
import { parseAndValidate } from "../src/index.js";
import { toStableReport, type StableReport } from "./helpers/stableReport.js";

const testdataRoot = join(dirname(fileURLToPath(import.meta.url)), "../testdata");
const fixturesRoot = join(testdataRoot, "fixtures");
const invalidRoot = join(testdataRoot, "invalid");

function fixtureFolders(): string[] {
  return readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readSide(folder: string, side: "old" | "new"): string {
  const yaml = join(fixturesRoot, folder, `${side}.yaml`);
  const json = join(fixturesRoot, folder, `${side}.json`);
  if (existsSync(yaml)) {
    return readFileSync(yaml, "utf8");
  }
  return readFileSync(json, "utf8");
}

describe("golden fixture reports", () => {
  it("has an expected.json for every fixture pair", () => {
    for (const folder of fixtureFolders()) {
      expect(
        existsSync(join(fixturesRoot, folder, "expected.json")),
        `${folder} is missing expected.json`
      ).toBe(true);
    }
  });

  it.each(fixtureFolders().map((folder) => [folder]))(
    "%s matches expected.json",
    (folder) => {
      const expectedPath = join(fixturesRoot, folder, "expected.json");
      const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as StableReport;
      const result = compareSpecs(readSide(folder, "old"), readSide(folder, "new"));

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(toStableReport(result.report)).toEqual(expected);
      for (const change of result.report.changes) {
        expect(change.explanation.length).toBeGreaterThan(10);
        expect(change.ruleId.length).toBeGreaterThan(0);
      }
    }
  );
});

describe("invalid specifications", () => {
  const invalidFiles = readdirSync(invalidRoot)
    .filter((name) => /\.(yaml|yml|json)$/.test(name))
    .sort();

  it.each(invalidFiles.map((name) => [name]))("rejects %s as the old spec", (name) => {
    const result = compareSpecs(
      readFileSync(join(invalidRoot, name), "utf8"),
      readSide("identical", "new")
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.error).toBe("INVALID_SPEC");
    expect(result.error.target).toBe("old");
    expect(result.error.details.length).toBeGreaterThan(0);
  });

  it("rejects invalid JSON as the new spec", () => {
    const result = compareSpecs(
      readSide("identical", "old"),
      readFileSync(join(invalidRoot, "broken.json"), "utf8")
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("new");
  });

  it("rejects documents that parse but are not OpenAPI", () => {
    const parsed = parseAndValidate(
      readFileSync(join(invalidRoot, "not-openapi.yaml"), "utf8"),
      "old"
    );
    expect(parsed.ok).toBe(false);
  });
});
