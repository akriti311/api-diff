import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { USAGE } from "../src/format.js";
import { run } from "../src/run.js";

const fixtures = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/engine/testdata"
);

function fixture(folder: string, file: string): string {
  return join(fixtures, "fixtures", folder, file);
}

describe("apidiff CLI", () => {
  it("prints usage and exits 2 without two paths", () => {
    const result = run([]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toBe(USAGE);
  });

  it("prints help and exits 0", () => {
    const result = run(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(USAGE);
  });

  it("strips a leading -- so pnpm can forward paths", () => {
    const result = run([
      "--",
      fixture("identical", "old.yaml"),
      fixture("identical", "new.yaml")
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No contract changes.");
  });

  it("exits 1 on the hero breaking example", () => {
    const result = run([
      fixture("removed-response-property", "old.yaml"),
      fixture("removed-response-property", "new.yaml")
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("1 change: 1 breaking");
    expect(result.stdout).toContain("BREAKING  schema.property.removed.response");
    expect(result.stdout).toContain("GET /users/{id}");
  });

  it("exits 0 when the specs are identical", () => {
    const result = run([
      fixture("identical", "old.yaml"),
      fixture("identical", "new.yaml")
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No contract changes.");
  });

  it("exits 0 when the only change is non-breaking", () => {
    const result = run([
      fixture("added-endpoint", "old.yaml"),
      fixture("added-endpoint", "new.yaml")
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("NON-BREAKING  endpoint.added");
  });

  it("exits 2 when the old spec is invalid", () => {
    const result = run([
      join(fixtures, "invalid/broken.yaml"),
      fixture("identical", "new.yaml")
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid old spec:");
  });

  it("prints JSON and still exits 1 on a breaking change", () => {
    const result = run([
      "--json",
      fixture("removed-response-property", "old.yaml"),
      fixture("removed-response-property", "new.yaml")
    ]);

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout) as {
      summary: { total: number; breaking: number };
      changes: Array<{ ruleId: string }>;
    };
    expect(report.summary).toMatchObject({ total: 1, breaking: 1 });
    expect(report.changes[0]?.ruleId).toBe("schema.property.removed.response");
  });

  it("exits 2 when a file is missing", () => {
    const result = run([
      fixture("identical", "old.yaml"),
      join(fixtures, "does-not-exist.yaml")
    ]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Cannot read new spec");
  });
});
