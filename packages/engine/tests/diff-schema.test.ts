import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { diffSpecs } from "../src/compare/diffSpecs.js";
import { getByPointer, resolveSchema } from "../src/refs/resolve.js";
import type { ChangeFact } from "../src/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function facts(folder: string, newFile = "new.yaml"): ChangeFact[] {
  const folderPath = join(root, "testdata/fixtures", folder);
  const result = diffSpecs(
    readFileSync(join(folderPath, "old.yaml"), "utf8"),
    readFileSync(join(folderPath, newFile), "utf8")
  );
  if (!result.ok) {
    throw new Error(`diff failed for ${folder}: ${JSON.stringify(result.error)}`);
  }
  return result.facts;
}

describe("resolveSchema", () => {
  it("follows #/components/schemas/User", () => {
    const document = {
      components: {
        schemas: {
          User: { type: "object" }
        }
      }
    };
    const resolved = resolveSchema(
      document,
      { $ref: "#/components/schemas/User" },
      "/schema"
    );
    expect(resolved.missing).toBe(false);
    expect(resolved.circular).toBe(false);
    expect(resolved.schema).toEqual({ type: "object" });
    expect(getByPointer(document, "#/components/schemas/User")).toEqual({
      type: "object"
    });
  });

  it("marks a cycle instead of recursing forever", () => {
    const document = {
      components: {
        schemas: {
          Node: { $ref: "#/components/schemas/Node" }
        }
      }
    };
    const resolved = resolveSchema(
      document,
      { $ref: "#/components/schemas/Node" },
      "/schema"
    );
    expect(resolved.circular).toBe(true);
  });
});

describe("compareSchemas", () => {
  it("reports the hero example: response property name removed", () => {
    const changes = facts("removed-response-property");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "removed",
      category: "schema",
      context: "response",
      field: "property",
      oldValue: "name",
      location: { method: "GET", path: "/users/{id}" }
    });
  });

  it("follows an internal $ref to detect a removed property", () => {
    const changes = facts("internal-ref");
    expect(changes.some((change) => change.oldValue === "email")).toBe(true);
    expect(changes[0]).toMatchObject({
      action: "removed",
      field: "property",
      context: "response"
    });
  });

  it("does not hang on circular $refs", () => {
    expect(facts("circular-ref")).toEqual([]);
  });

  it("detects a response property type change", () => {
    expect(facts("type-changed")[0]).toMatchObject({
      action: "modified",
      field: "type",
      oldValue: ["integer"],
      newValue: ["string"],
      context: "response"
    });
  });

  it("detects a request enum value removed", () => {
    const changes = facts("enum-request-removed");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "removed",
      field: "enum",
      oldValue: "cancelled",
      context: "request"
    });
  });

  it("detects a response enum value added", () => {
    expect(facts("enum-response-added")[0]).toMatchObject({
      action: "added",
      field: "enum",
      newValue: "refunded",
      context: "response"
    });
  });

  it("detects a nested object property removed", () => {
    expect(facts("nested-property-removed")[0]).toMatchObject({
      action: "removed",
      field: "property",
      oldValue: "city"
    });
    expect(facts("nested-property-removed")[0]?.location.pointer).toContain("address");
  });

  it("detects an optional response property added", () => {
    expect(facts("response-property-added")[0]).toMatchObject({
      action: "added",
      field: "property",
      newValue: "nickname",
      context: "response"
    });
  });

  it("does not invent a composition change when allOf is unchanged", () => {
    expect(facts("composed-schema")).toEqual([]);
  });
});
