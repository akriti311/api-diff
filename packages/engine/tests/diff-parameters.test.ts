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

describe("diffParameters", () => {
  it("detects a required query parameter added", () => {
    const changes = facts("required-param-added");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "added",
      category: "parameter",
      field: "parameter",
      extras: { required: true, newRequired: true }
    });
    expect(changes[0]?.newValue).toMatchObject({
      name: "status",
      in: "query",
      required: true
    });
  });

  it("detects an optional query parameter added", () => {
    const changes = facts("optional-param-added");
    expect(changes[0]).toMatchObject({
      action: "added",
      category: "parameter",
      extras: { required: false, newRequired: false }
    });
    expect(changes[0]?.newValue).toMatchObject({ name: "verbose", in: "query" });
  });

  it("detects optional becoming required", () => {
    const changes = facts("optional-to-required");
    expect(changes[0]).toMatchObject({
      action: "modified",
      category: "parameter",
      field: "required",
      extras: { oldRequired: false, newRequired: true }
    });
  });

  it("detects required becoming optional", () => {
    const changes = facts("required-to-optional");
    expect(changes[0]).toMatchObject({
      action: "modified",
      field: "required",
      extras: { oldRequired: true, newRequired: false }
    });
  });

  it("detects a removed parameter", () => {
    const changes = facts("param-removed");
    expect(changes[0]).toMatchObject({
      action: "removed",
      category: "parameter",
      extras: { required: false, oldRequired: false }
    });
    expect(changes[0]?.oldValue).toMatchObject({ name: "verbose", in: "query" });
  });

  it("matches path params by position instead of add+remove", () => {
    const changes = facts("renamed-path-param");
    expect(changes.some((change) => change.action === "added")).toBe(false);
    expect(changes.some((change) => change.action === "removed")).toBe(false);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "modified",
      category: "parameter",
      field: "name"
    });
    expect(changes[0]?.oldValue).toMatchObject({ name: "id", in: "path" });
    expect(changes[0]?.newValue).toMatchObject({ name: "userId", in: "path" });
  });
});
