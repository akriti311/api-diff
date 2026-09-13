import { describe, expect, it } from "vitest";
import { classifyFacts } from "../src/rules/classify.js";
import type { ChangeFact } from "../src/types.js";

function fact(partial: Partial<ChangeFact> & Pick<ChangeFact, "action" | "category" | "context">): ChangeFact {
  return {
    location: { method: "GET", path: "/users/{id}", pointer: "/paths/~1users~1{id}/get" },
    ...partial
  };
}

describe("classifyFacts", () => {
  const cases: Array<{ name: string; input: ChangeFact; ruleId: string; severity: string }> = [
    {
      name: "removed endpoint",
      input: fact({ action: "removed", category: "endpoint", context: "operation" }),
      ruleId: "endpoint.removed",
      severity: "breaking"
    },
    {
      name: "added endpoint",
      input: fact({ action: "added", category: "endpoint", context: "operation" }),
      ruleId: "endpoint.added",
      severity: "non-breaking"
    },
    {
      name: "removed method",
      input: fact({ action: "removed", category: "method", context: "operation" }),
      ruleId: "method.removed",
      severity: "breaking"
    },
    {
      name: "required parameter added",
      input: fact({
        action: "added",
        category: "parameter",
        context: "request",
        field: "parameter",
        newValue: { name: "status", in: "query", required: true },
        extras: { required: true, newRequired: true }
      }),
      ruleId: "parameter.added.required",
      severity: "breaking"
    },
    {
      name: "optional parameter added",
      input: fact({
        action: "added",
        category: "parameter",
        context: "request",
        field: "parameter",
        newValue: { name: "verbose", in: "query", required: false },
        extras: { required: false, newRequired: false }
      }),
      ruleId: "parameter.added.optional",
      severity: "non-breaking"
    },
    {
      name: "parameter removed",
      input: fact({
        action: "removed",
        category: "parameter",
        context: "request",
        field: "parameter",
        oldValue: { name: "verbose", in: "query", required: false },
        extras: { required: false, oldRequired: false }
      }),
      ruleId: "parameter.removed",
      severity: "warning"
    },
    {
      name: "optional to required",
      input: fact({
        action: "modified",
        category: "parameter",
        context: "request",
        field: "required",
        extras: { oldRequired: false, newRequired: true }
      }),
      ruleId: "parameter.required.increased",
      severity: "breaking"
    },
    {
      name: "success response removed",
      input: fact({
        action: "removed",
        category: "response",
        context: "response",
        field: "status",
        oldValue: "200",
        extras: { isSuccessResponse: true }
      }),
      ruleId: "response.status.removed.success",
      severity: "breaking"
    },
    {
      name: "success response added",
      input: fact({
        action: "added",
        category: "response",
        context: "response",
        field: "status",
        newValue: "201",
        extras: { isSuccessResponse: true }
      }),
      ruleId: "response.status.added.success",
      severity: "warning"
    },
    {
      name: "response property removed",
      input: fact({
        action: "removed",
        category: "schema",
        context: "response",
        field: "property",
        oldValue: "name"
      }),
      ruleId: "schema.property.removed.response",
      severity: "breaking"
    },
    {
      name: "optional response property added",
      input: fact({
        action: "added",
        category: "schema",
        context: "response",
        field: "property",
        newValue: "nickname",
        extras: { required: false }
      }),
      ruleId: "schema.property.added.response",
      severity: "non-breaking"
    },
    {
      name: "required request property added",
      input: fact({
        action: "added",
        category: "schema",
        context: "request",
        field: "property",
        newValue: "userId",
        extras: { required: true, newRequired: true }
      }),
      ruleId: "schema.property.added.request.required",
      severity: "breaking"
    },
    {
      name: "type changed",
      input: fact({
        action: "modified",
        category: "schema",
        context: "response",
        field: "type",
        oldValue: ["integer"],
        newValue: ["string"]
      }),
      ruleId: "schema.type.changed",
      severity: "breaking"
    },
    {
      name: "request enum removed",
      input: fact({
        action: "removed",
        category: "schema",
        context: "request",
        field: "enum",
        oldValue: "cancelled"
      }),
      ruleId: "schema.enum.removed.request",
      severity: "breaking"
    },
    {
      name: "response enum added",
      input: fact({
        action: "added",
        category: "schema",
        context: "response",
        field: "enum",
        newValue: "refunded"
      }),
      ruleId: "schema.enum.added.response",
      severity: "warning"
    }
  ];

  it.each(cases)("$name → $ruleId ($severity)", ({ input, ruleId, severity }) => {
    const [classified] = classifyFacts([input]);
    expect(classified?.ruleId).toBe(ruleId);
    expect(classified?.severity).toBe(severity);
    expect(classified?.explanation.length).toBeGreaterThan(10);
  });

  it("falls back to warning when no rule matches", () => {
    const [classified] = classifyFacts([
      fact({
        action: "modified",
        category: "schema",
        context: "response",
        field: "unknown-field"
      })
    ]);
    expect(classified?.ruleId).toBe("unclassified");
    expect(classified?.severity).toBe("warning");
  });
});
