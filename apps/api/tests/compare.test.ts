import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const fixtures = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/engine/testdata"
);

function readFixture(folder: string, file: string): string {
  return readFileSync(join(fixtures, "fixtures", folder, file), "utf8");
}

describe("POST /api/compare", () => {
  const app = createApp();

  it("returns a classified report for the hero example", async () => {
    const response = await request(app)
      .post("/api/compare")
      .send({
        oldSpec: readFixture("removed-response-property", "old.yaml"),
        newSpec: readFixture("removed-response-property", "new.yaml")
      });

    expect(response.status).toBe(200);
    expect(response.body.summary.breaking).toBe(1);
    expect(response.body.changes[0]).toMatchObject({
      ruleId: "schema.property.removed.response",
      severity: "breaking",
      oldValue: "name"
    });
  });

  it("returns 400 INVALID_SPEC when the old spec is broken", async () => {
    const response = await request(app)
      .post("/api/compare")
      .send({
        oldSpec: readFileSync(join(fixtures, "invalid/broken.yaml"), "utf8"),
        newSpec: readFixture("identical", "new.yaml")
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "INVALID_SPEC",
      target: "old"
    });
  });

  it("returns 400 INVALID_SPEC when the new spec is broken", async () => {
    const response = await request(app)
      .post("/api/compare")
      .send({
        oldSpec: readFixture("identical", "old.yaml"),
        newSpec: readFileSync(join(fixtures, "invalid/broken.json"), "utf8")
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: "INVALID_SPEC",
      target: "new"
    });
  });

  it("returns 400 INVALID_REQUEST when fields are missing", async () => {
    const response = await request(app).post("/api/compare").send({ oldSpec: "x" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("INVALID_REQUEST");
  });
});

describe("GET /health", () => {
  it("reports the service is up", async () => {
    const response = await request(createApp()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
