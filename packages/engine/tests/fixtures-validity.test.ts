import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAndValidate } from "../src/index.js";

const testdataRoot = join(dirname(fileURLToPath(import.meta.url)), "../testdata");

function listSpecFiles(dir: string, specNamesOnly = false): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSpecFiles(fullPath, specNamesOnly));
      continue;
    }
    if (specNamesOnly) {
      if (/^(old|new)\.(yaml|yml|json)$/.test(entry.name)) {
        files.push(fullPath);
      }
    } else if (/\.(yaml|yml|json)$/.test(entry.name) && entry.name !== "expected.json") {
      files.push(fullPath);
    }
  }

  return files.sort();
}

describe("fixture validity", () => {
  const validSpecs = listSpecFiles(join(testdataRoot, "fixtures"), true);
  const invalidSpecs = listSpecFiles(join(testdataRoot, "invalid"));

  it("has sample specs to check", () => {
    expect(validSpecs.length).toBeGreaterThan(0);
    expect(invalidSpecs.length).toBeGreaterThan(0);
  });

  it.each(validSpecs.map((file) => [file.slice(testdataRoot.length + 1), file]))(
    "accepts %s",
    (_label, file) => {
      const result = parseAndValidate(readFileSync(file, "utf8"), "old");
      expect(result.ok, result.ok ? "" : JSON.stringify(result.error.details, null, 2)).toBe(
        true
      );
    }
  );

  it.each(invalidSpecs.map((file) => [file.slice(testdataRoot.length + 1), file]))(
    "rejects %s",
    (_label, file) => {
      const result = parseAndValidate(readFileSync(file, "utf8"), "old");
      expect(result.ok).toBe(false);
    }
  );
});
