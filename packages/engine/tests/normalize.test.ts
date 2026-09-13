import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseAndValidate } from "../src/index.js";
import { parseAndNormalize } from "../src/normalize/parseAndNormalize.js";
import { normalizeSpec } from "../src/normalize/normalize.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}

function spec(relative: string) {
  const parsed = parseAndValidate(read(relative), "old");
  if (!parsed.ok) {
    throw new Error(`fixture failed validation: ${relative}`);
  }
  return normalizeSpec(parsed.document);
}

describe("normalizeSpec", () => {
  it("indexes the hero example as GET /users/{}", () => {
    const normalized = spec(
      "testdata/fixtures/removed-response-property/old.yaml"
    );
    const operation = normalized.operations.get("GET /users/{}");

    expect(operation).toBeDefined();
    expect(operation?.path).toBe("/users/{id}");
    expect(operation?.method).toBe("GET");
    expect(operation?.parameters.get("path:id")?.required).toBe(true);
    expect(operation?.pathParametersByPosition[0]?.name).toBe("id");
    expect(operation?.responses.get("200")?.schema).toMatchObject({
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        email: { type: "string" }
      }
    });
  });

  it("gives {id} and {userId} the same map key", () => {
    const oldSpec = spec("testdata/fixtures/renamed-path-param/old.yaml");
    const newSpec = spec("testdata/fixtures/renamed-path-param/new.yaml");

    expect([...oldSpec.operations.keys()]).toEqual(["GET /users/{}"]);
    expect([...newSpec.operations.keys()]).toEqual(["GET /users/{}"]);
    expect(oldSpec.operations.get("GET /users/{}")?.path).toBe("/users/{id}");
    expect(newSpec.operations.get("GET /users/{}")?.path).toBe("/users/{userId}");
  });

  it("inherits path-level parameters onto the operation", () => {
    const parsed = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Path params
  version: 1.0.0
paths:
  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
      - name: verbose
        in: query
        schema:
          type: boolean
    get:
      responses:
        "200":
          description: ok
`,
      "old"
    );
    if (!parsed.ok) {
      throw new Error("expected valid spec");
    }

    const operation = normalizeSpec(parsed.document).operations.get("GET /items/{}");
    expect(operation?.parameters.get("path:id")?.required).toBe(true);
    expect(operation?.parameters.get("query:verbose")?.required).toBe(false);
  });

  it("lets operation parameters override path-level parameters", () => {
    const parsed = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Override
  version: 1.0.0
paths:
  /items/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: ok
`,
      "old"
    );
    if (!parsed.ok) {
      throw new Error("expected valid spec");
    }

    const parameter = normalizeSpec(parsed.document)
      .operations.get("GET /items/{}")
      ?.parameters.get("path:id");
    expect(parameter?.schema).toEqual({ type: "integer" });
  });

  it("defaults requestBody.required to false and keeps JSON schema", () => {
    const parsed = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Body
  version: 1.0.0
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
      responses:
        "201":
          description: created
`,
      "old"
    );
    if (!parsed.ok) {
      throw new Error("expected valid spec");
    }

    const body = normalizeSpec(parsed.document).operations.get("POST /users")
      ?.requestBody;
    expect(body?.required).toBe(false);
    expect(body?.schema).toEqual({
      type: "object",
      properties: { email: { type: "string" } }
    });
  });

  it("notes non-JSON media types instead of comparing them", () => {
    const parsed = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Xml
  version: 1.0.0
paths:
  /export:
    get:
      responses:
        "200":
          description: file
          content:
            application/xml:
              schema:
                type: string
            application/json:
              schema:
                type: object
`,
      "old"
    );
    if (!parsed.ok) {
      throw new Error("expected valid spec");
    }

    const normalized = normalizeSpec(parsed.document);
    expect(normalized.notes.some((note) => note.includes("application/xml"))).toBe(
      true
    );
    expect(
      normalized.operations.get("GET /export")?.responses.get("200")?.schema
    ).toEqual({ type: "object" });
  });

  it("does not treat description-only fields as comparable data", () => {
    const parsed = parseAndValidate(
      `
openapi: 3.0.3
info:
  title: Docs
  version: 1.0.0
paths:
  /ping:
    get:
      summary: health
      description: ignored
      responses:
        "200":
          description: also ignored
          content:
            application/json:
              schema:
                type: object
              example:
                ok: true
`,
      "old"
    );
    if (!parsed.ok) {
      throw new Error("expected valid spec");
    }

    const operation = normalizeSpec(parsed.document).operations.get("GET /ping");
    expect(operation).not.toHaveProperty("summary");
    expect(operation).not.toHaveProperty("description");
    expect(operation?.responses.get("200")).not.toHaveProperty("example");
  });
});

describe("parseAndNormalize", () => {
  it("still returns INVALID_SPEC for broken input", () => {
    const result = parseAndNormalize("{", "new");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.target).toBe("new");
  });

  it("parses then normalizes a fixture", () => {
    const result = parseAndNormalize(
      read("testdata/fixtures/added-endpoint/new.yaml"),
      "new"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.spec.operations.has("GET /users")).toBe(true);
    expect(result.spec.operations.has("GET /users/{}")).toBe(true);
  });
});
