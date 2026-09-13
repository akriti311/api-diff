import { describe, expect, it } from "vitest";
import { collectExternalRefIssues, isInternalRef } from "../src/refs/assertInternal.js";

describe("internal $ref rules", () => {
  it("accepts same-document JSON pointers", () => {
    expect(isInternalRef("#/components/schemas/User")).toBe(true);
    expect(isInternalRef("#/components/parameters/Id")).toBe(true);
  });

  it("rejects file, URL, and relative refs", () => {
    expect(isInternalRef("https://example.com/user.json")).toBe(false);
    expect(isInternalRef("./schemas/user.yaml")).toBe(false);
    expect(isInternalRef("file:///tmp/user.json")).toBe(false);
    expect(isInternalRef("#components/schemas/User")).toBe(false);
  });

  it("reports the JSON pointer of an external $ref", () => {
    const issues = collectExternalRefIssues({
      components: {
        schemas: {
          User: { $ref: "../other.yaml#/User" }
        }
      }
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.pointer).toBe("/components/schemas/User/$ref");
    expect(issues[0]?.message).toMatch(/External \$ref/);
  });
});
