import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { diffSpecs } from "../src/compare/diffSpecs.js";
import { isSuccessStatus } from "../src/compare/responses.js";
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

describe("isSuccessStatus", () => {
  it("treats 2xx as success", () => {
    expect(isSuccessStatus("200")).toBe(true);
    expect(isSuccessStatus("201")).toBe(true);
    expect(isSuccessStatus("2XX")).toBe(true);
    expect(isSuccessStatus("404")).toBe(false);
    expect(isSuccessStatus("default")).toBe(false);
  });
});

describe("diffRequestBody", () => {
  it("detects a required request body added", () => {
    expect(facts("request-body-added")[0]).toMatchObject({
      action: "added",
      category: "requestBody",
      extras: { required: true, newRequired: true }
    });
  });

  it("detects a request body removed", () => {
    expect(facts("request-body-removed")[0]).toMatchObject({
      action: "removed",
      category: "requestBody"
    });
  });

  it("detects a body becoming required", () => {
    expect(facts("request-body-became-required")[0]).toMatchObject({
      action: "modified",
      category: "requestBody",
      field: "required",
      extras: { oldRequired: false, newRequired: true }
    });
  });
});

describe("diffResponses", () => {
  it("detects a success status removed", () => {
    const changes = facts("success-response-removed");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      action: "removed",
      category: "response",
      field: "status",
      oldValue: "200",
      extras: { isSuccessResponse: true }
    });
  });

  it("detects a success status added", () => {
    expect(facts("success-response-added")[0]).toMatchObject({
      action: "added",
      category: "response",
      newValue: "201",
      extras: { isSuccessResponse: true }
    });
  });

  it("does not treat a response property change as a status change", () => {
    const changes = facts("removed-response-property");
    expect(changes.every((change) => change.field !== "status")).toBe(true);
    expect(changes.some((change) => change.field === "property" && change.oldValue === "name")).toBe(
      true
    );
  });
});
