import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { diffSpecs } from "../src/compare/diffSpecs.js";
import type { ChangeFact } from "../src/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function facts(folder: string): ChangeFact[] {
  const result = diffSpecs(
    readFileSync(join(root, "testdata/fixtures", folder, "old.yaml"), "utf8"),
    readFileSync(join(root, "testdata/fixtures", folder, "new.yaml"), "utf8")
  );
  if (!result.ok) {
    throw new Error(`diff failed for ${folder}: ${JSON.stringify(result.error)}`);
  }
  return result.facts;
}

describe("diffOperations", () => {
  it("reports no operation changes when specs are identical", () => {
    expect(facts("identical")).toEqual([]);
  });

  it("does not treat a renamed path param as add+remove", () => {
    const changes = facts("renamed-path-param");
    expect(changes.some((change) => change.category === "endpoint")).toBe(false);
    expect(changes.some((change) => change.category === "method")).toBe(false);
    expect(changes.some((change) => change.action === "added")).toBe(false);
    expect(changes.some((change) => change.action === "removed")).toBe(false);
  });

  it("does not report the hero property change as an endpoint change", () => {
    expect(facts("removed-response-property")).toEqual([]);
  });

  it("detects an added endpoint", () => {
    const changes = facts("added-endpoint");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "added",
      category: "endpoint",
      location: { method: "GET", path: "/users" }
    });
  });

  it("detects a removed endpoint", () => {
    const changes = facts("removed-endpoint");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "removed",
      category: "endpoint",
      location: { method: "GET", path: "/users/{id}/email" }
    });
  });

  it("detects an added method on an existing path", () => {
    const changes = facts("added-method");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "added",
      category: "method",
      location: { method: "POST", path: "/users/{id}" }
    });
  });

  it("detects a removed method on an existing path", () => {
    const changes = facts("removed-method");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "removed",
      category: "method",
      location: { method: "DELETE", path: "/users/{id}" }
    });
  });

  it("still names the invalid spec old vs new", () => {
    const result = diffSpecs("not openapi", "openapi: 3.0.3\ninfo:\n  title: x\n  version: 1\npaths: {}");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("old");
  });
});
