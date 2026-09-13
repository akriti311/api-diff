import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { detectFormat, parseAndValidate, parseBothSpecs } from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}

describe("detectFormat", () => {
  it("treats objects and arrays as JSON", () => {
    expect(detectFormat('{ "openapi": "3.0.3" }')).toBe("json");
    expect(detectFormat("\n  [1, 2]")).toBe("json");
  });

  it("treats everything else as YAML", () => {
    expect(detectFormat("openapi: 3.0.3\n")).toBe("yaml");
  });
});

describe("parseAndValidate — success", () => {
  it("parses a valid OpenAPI 3.0 YAML fixture", () => {
    const result = parseAndValidate(
      read("testdata/fixtures/removed-response-property/old.yaml"),
      "old"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.format).toBe("yaml");
    expect(result.document.openapi).toBe("3.0.3");
    expect(result.document.info.title).toBe("Users API");
    expect(result.document.paths["/users/{id}"]).toBeDefined();
  });

  it("parses a valid OpenAPI 3.0 JSON fixture", () => {
    const result = parseAndValidate(
      read("testdata/fixtures/json-format/old.json"),
      "new"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.format).toBe("json");
    expect(result.target).toBe("new");
    expect(result.document.openapi).toBe("3.0.3");
  });

  it("accepts an internal #/components $ref (does not resolve it yet)", () => {
    const result = parseAndValidate(
      read("testdata/fixtures/internal-ref/old.yaml"),
      "old"
    );

    expect(result.ok).toBe(true);
  });
});

describe("parseAndValidate — failures", () => {
  it("rejects invalid YAML and labels the target old", () => {
    const result = parseAndValidate(read("testdata/invalid/broken.yaml"), "old");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.error).toBe("INVALID_SPEC");
    expect(result.error.target).toBe("old");
    expect(result.error.details[0]?.message).toMatch(/Invalid YAML/);
  });

  it("rejects invalid JSON and labels the target new", () => {
    const result = parseAndValidate(read("testdata/invalid/broken.json"), "new");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("new");
    expect(result.error.details[0]?.message).toMatch(/Invalid JSON/);
  });

  it("rejects empty input", () => {
    const result = parseAndValidate("   \n", "old");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details[0]?.message).toMatch(/empty/i);
  });

  it("rejects a YAML file that is not OpenAPI", () => {
    const result = parseAndValidate(read("testdata/invalid/not-openapi.yaml"), "old");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details.some((issue) => issue.message.includes("openapi"))).toBe(
      true
    );
  });

  it("rejects OpenAPI 3.1", () => {
    const result = parseAndValidate(read("testdata/invalid/openapi-3.1.yaml"), "old");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details[0]?.message).toMatch(/3\.1/);
  });

  it("rejects Swagger 2.0", () => {
    const result = parseAndValidate(read("testdata/invalid/swagger-2.0.yaml"), "old");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details[0]?.message).toMatch(/2\.0|Swagger/i);
  });

  it("rejects external http(s) $ref", () => {
    const result = parseAndValidate(read("testdata/invalid/external-ref.yaml"), "new");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details[0]?.message).toMatch(/External \$ref/);
    expect(result.error.details[0]?.pointer).toContain("$ref");
  });

  it("rejects an operation that has no responses", () => {
    const result = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Missing responses
  version: 1.0.0
paths:
  /ping:
    get:
      summary: no responses
`,
      "old"
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.details[0]?.message).toMatch(/missing responses/i);
  });
});

describe("parseBothSpecs", () => {
  it("returns both documents when they are valid", () => {
    const result = parseBothSpecs(
      read("testdata/fixtures/removed-response-property/old.yaml"),
      read("testdata/fixtures/removed-response-property/new.yaml")
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.old.document.info.version).toBe("1.0.0");
    expect(result.new.document.info.version).toBe("1.1.0");
  });

  it("fails on the old spec first when both would be invalid", () => {
    const result = parseBothSpecs("not: openapi", "{");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("old");
  });

  it("fails on the new spec when the old spec is valid", () => {
    const result = parseBothSpecs(
      read("testdata/fixtures/identical/old.yaml"),
      "{ not json"
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("new");
  });
});
