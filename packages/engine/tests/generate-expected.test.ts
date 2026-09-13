import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compareSpecs } from "../src/compareSpecs.js";
import { toStableReport } from "./helpers/stableReport.js";

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), "../testdata/fixtures");
const shouldUpdate = process.env.UPDATE_GOLDEN === "1";

describe.skipIf(!shouldUpdate)("update golden expected.json", () => {
  it("writes expected.json for every fixture pair", () => {
    const folders = readdirSync(fixturesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(folders.length).toBeGreaterThan(0);

    for (const folder of folders) {
      const dir = join(fixturesRoot, folder);
      const oldText = readFileSync(join(dir, exists(dir, "old")), "utf8");
      const newText = readFileSync(join(dir, exists(dir, "new")), "utf8");
      const result = compareSpecs(oldText, newText);
      expect(result.ok, folder).toBe(true);
      if (!result.ok) {
        continue;
      }
      writeFileSync(
        join(dir, "expected.json"),
        `${JSON.stringify(toStableReport(result.report), null, 2)}\n`
      );
    }
  });
});

function exists(dir: string, side: "old" | "new"): string {
  try {
    readFileSync(join(dir, `${side}.yaml`));
    return `${side}.yaml`;
  } catch {
    return `${side}.json`;
  }
}
