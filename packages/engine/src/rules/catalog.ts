import type { ChangeFact, Severity } from "../types.js";

export type CompatibilityRule = {
  id: string;
  severity: Severity;
  match: (fact: ChangeFact) => boolean;
  title: (fact: ChangeFact) => string;
  explanation: (fact: ChangeFact) => string;
};

export const COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: "endpoint.added",
    severity: "non-breaking",
    match: (fact) => fact.category === "endpoint" && fact.action === "added",
    title: (fact) => `Endpoint added: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} is new. Existing clients do not call it, so they keep working.`
  },
  {
    id: "endpoint.removed",
    severity: "breaking",
    match: (fact) => fact.category === "endpoint" && fact.action === "removed",
    title: (fact) => `Endpoint removed: ${op(fact)}`,
    explanation: (fact) =>
      `Clients still calling ${op(fact)} will typically receive 404.`
  },
  {
    id: "method.added",
    severity: "non-breaking",
    match: (fact) => fact.category === "method" && fact.action === "added",
    title: (fact) => `Method added: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} is a new method on an existing path. Old clients that use other methods are unaffected.`
  },
  {
    id: "method.removed",
    severity: "breaking",
    match: (fact) => fact.category === "method" && fact.action === "removed",
    title: (fact) => `Method removed: ${op(fact)}`,
    explanation: (fact) =>
      `Clients still using ${op(fact)} will typically receive 405 Method Not Allowed.`
  },
  {
    id: "parameter.added.required",
    severity: "breaking",
    match: (fact) =>
      fact.category === "parameter" &&
      fact.action === "added" &&
      isRequired(fact, "new"),
    title: (fact) => `Required parameter added: ${paramName(fact)}`,
    explanation: (fact) =>
      `${op(fact)} now requires ${paramName(fact)}. Old clients will not send it.`
  },
  {
    id: "parameter.added.optional",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "parameter" &&
      fact.action === "added" &&
      !isRequired(fact, "new"),
    title: (fact) => `Optional parameter added: ${paramName(fact)}`,
    explanation: (fact) =>
      `${paramName(fact)} was added on ${op(fact)} but is optional. Old clients may omit it.`
  },
  {
    id: "parameter.removed",
    severity: "warning",
    match: (fact) => fact.category === "parameter" && fact.action === "removed",
    title: (fact) => `Parameter removed: ${paramName(fact)}`,
    explanation: (fact) =>
      `${paramName(fact)} was removed from ${op(fact)}. Old clients may still send it; the server may ignore it. Needs review.`
  },
  {
    id: "parameter.required.increased",
    severity: "breaking",
    match: (fact) =>
      fact.category === "parameter" &&
      fact.field === "required" &&
      fact.extras?.oldRequired === false &&
      fact.extras?.newRequired === true,
    title: (fact) => `Parameter became required: ${paramName(fact)}`,
    explanation: (fact) =>
      `${paramName(fact)} on ${op(fact)} was optional and is now required. Old clients may omit it.`
  },
  {
    id: "parameter.required.decreased",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "parameter" &&
      fact.field === "required" &&
      fact.extras?.oldRequired === true &&
      fact.extras?.newRequired === false,
    title: (fact) => `Parameter became optional: ${paramName(fact)}`,
    explanation: (fact) =>
      `${paramName(fact)} on ${op(fact)} is now optional. Old clients that still send it keep working.`
  },
  {
    id: "parameter.name.changed",
    severity: "warning",
    match: (fact) =>
      fact.category === "parameter" &&
      fact.action === "modified" &&
      fact.field === "name",
    title: (fact) => `Path parameter renamed: ${value(fact.oldValue)} → ${value(fact.newValue)}`,
    explanation: (fact) =>
      `The path template still matches ${op(fact)}, but the parameter name changed from ${value(fact.oldValue)} to ${value(fact.newValue)}. Generated clients may break even if the URL shape is the same.`
  },
  {
    id: "requestBody.added.required",
    severity: "breaking",
    match: (fact) =>
      fact.category === "requestBody" &&
      fact.action === "added" &&
      isRequired(fact, "new"),
    title: (fact) => `Required request body added: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} now requires a request body. Old clients may send an empty body.`
  },
  {
    id: "requestBody.added.optional",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "requestBody" &&
      fact.action === "added" &&
      !isRequired(fact, "new"),
    title: (fact) => `Optional request body added: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} accepts a request body but does not require it. Old clients may omit it.`
  },
  {
    id: "requestBody.removed",
    severity: "warning",
    match: (fact) => fact.category === "requestBody" && fact.action === "removed",
    title: (fact) => `Request body removed: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} no longer documents a request body. Old clients may still send one. Needs review.`
  },
  {
    id: "requestBody.required.increased",
    severity: "breaking",
    match: (fact) =>
      fact.category === "requestBody" &&
      fact.field === "required" &&
      fact.extras?.oldRequired === false &&
      fact.extras?.newRequired === true,
    title: (fact) => `Request body became required: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} now requires a request body. Old clients may omit it.`
  },
  {
    id: "requestBody.required.decreased",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "requestBody" &&
      fact.field === "required" &&
      fact.extras?.oldRequired === true &&
      fact.extras?.newRequired === false,
    title: (fact) => `Request body became optional: ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} no longer requires a request body. Old clients that still send one keep working.`
  },
  {
    id: "response.status.removed.success",
    severity: "breaking",
    match: (fact) =>
      fact.category === "response" &&
      fact.action === "removed" &&
      fact.extras?.isSuccessResponse === true,
    title: (fact) => `Success response removed: ${fact.oldValue} on ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} no longer documents success status ${fact.oldValue}. Clients expecting that status will break.`
  },
  {
    id: "response.status.removed.other",
    severity: "warning",
    match: (fact) =>
      fact.category === "response" &&
      fact.action === "removed" &&
      fact.extras?.isSuccessResponse !== true,
    title: (fact) => `Response status removed: ${fact.oldValue} on ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} no longer documents status ${fact.oldValue}. Impact depends on whether clients handled that code.`
  },
  {
    id: "response.status.added.success",
    severity: "warning",
    match: (fact) =>
      fact.category === "response" &&
      fact.action === "added" &&
      fact.extras?.isSuccessResponse === true,
    title: (fact) => `Success response added: ${fact.newValue} on ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} may now return ${fact.newValue}. Clients that only handle the previous success codes may mis-handle it.`
  },
  {
    id: "response.status.added.other",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "response" &&
      fact.action === "added" &&
      fact.extras?.isSuccessResponse !== true,
    title: (fact) => `Response status added: ${fact.newValue} on ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} documents additional status ${fact.newValue}. Old clients can keep treating unknown errors as failures.`
  },
  {
    id: "schema.property.removed.response",
    severity: "breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "property" &&
      fact.action === "removed" &&
      fact.context === "response",
    title: (fact) => `Response property removed: "${fact.oldValue}"`,
    explanation: (fact) =>
      `${op(fact)} no longer returns "${fact.oldValue}". Clients depending on that property may no longer receive it.`
  },
  {
    id: "schema.property.removed.request",
    severity: "warning",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "property" &&
      fact.action === "removed" &&
      fact.context === "request",
    title: (fact) => `Request property removed: "${fact.oldValue}"`,
    explanation: (fact) =>
      `${op(fact)} no longer documents request property "${fact.oldValue}". Old clients may still send it. Needs review.`
  },
  {
    id: "schema.property.added.request.required",
    severity: "breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "property" &&
      fact.action === "added" &&
      fact.context === "request" &&
      isRequired(fact, "new"),
    title: (fact) => `Required request property added: "${fact.newValue}"`,
    explanation: (fact) =>
      `${op(fact)} now requires "${fact.newValue}" in the request. Old clients will not send it.`
  },
  {
    id: "schema.property.added.request.optional",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "property" &&
      fact.action === "added" &&
      fact.context === "request" &&
      !isRequired(fact, "new"),
    title: (fact) => `Optional request property added: "${fact.newValue}"`,
    explanation: (fact) =>
      `"${fact.newValue}" was added to the ${op(fact)} request but is optional. Old clients may omit it.`
  },
  {
    id: "schema.property.added.response",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "property" &&
      fact.action === "added" &&
      fact.context === "response",
    title: (fact) => `Response property added: "${fact.newValue}"`,
    explanation: (fact) =>
      `"${fact.newValue}" was added to the ${op(fact)} response. Clients that ignore unknown fields keep working.`
  },
  {
    id: "schema.type.changed",
    severity: "breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.action === "modified" &&
      fact.field === "type",
    title: (fact) => `Schema type changed on ${op(fact)}`,
    explanation: (fact) =>
      `A type changed from ${value(fact.oldValue)} to ${value(fact.newValue)} on ${op(fact)}. Clients may fail to parse the value.`
  },
  {
    id: "schema.required.added.request",
    severity: "breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "required" &&
      fact.action === "added" &&
      fact.context === "request",
    title: (fact) => `Request property became required: "${fact.newValue}"`,
    explanation: (fact) =>
      `"${fact.newValue}" is now required on the ${op(fact)} request. Old clients may omit it.`
  },
  {
    id: "schema.required.removed.request",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "required" &&
      fact.action === "removed" &&
      fact.context === "request",
    title: (fact) => `Request property became optional: "${fact.oldValue}"`,
    explanation: (fact) =>
      `"${fact.oldValue}" is no longer required on the ${op(fact)} request. Old clients that still send it keep working.`
  },
  {
    id: "schema.required.added.response",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "required" &&
      fact.action === "added" &&
      fact.context === "response",
    title: (fact) => `Response property marked required: "${fact.newValue}"`,
    explanation: (fact) =>
      `"${fact.newValue}" is now required in the ${op(fact)} response. Clients that already ignore unknown or extra guarantees keep working.`
  },
  {
    id: "schema.required.removed.response",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "required" &&
      fact.action === "removed" &&
      fact.context === "response",
    title: (fact) => `Response property no longer required: "${fact.oldValue}"`,
    explanation: (fact) =>
      `"${fact.oldValue}" remains documented on ${op(fact)} but is no longer required.`
  },
  {
    id: "schema.enum.removed.request",
    severity: "breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "enum" &&
      fact.action === "removed" &&
      fact.context === "request",
    title: (fact) => `Request enum value removed: ${value(fact.oldValue)}`,
    explanation: (fact) =>
      `${op(fact)} no longer accepts ${value(fact.oldValue)}. An old client may still send it.`
  },
  {
    id: "schema.enum.added.request",
    severity: "non-breaking",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "enum" &&
      fact.action === "added" &&
      fact.context === "request",
    title: (fact) => `Request enum value added: ${value(fact.newValue)}`,
    explanation: (fact) =>
      `${op(fact)} now accepts ${value(fact.newValue)}. Old clients that send previous values still work.`
  },
  {
    id: "schema.enum.added.response",
    severity: "warning",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "enum" &&
      fact.action === "added" &&
      fact.context === "response",
    title: (fact) => `Response enum value added: ${value(fact.newValue)}`,
    explanation: (fact) =>
      `${op(fact)} may now return ${value(fact.newValue)}. Clients with exhaustive switches may not handle it.`
  },
  {
    id: "schema.enum.removed.response",
    severity: "warning",
    match: (fact) =>
      fact.category === "schema" &&
      fact.field === "enum" &&
      fact.action === "removed" &&
      fact.context === "response",
    title: (fact) => `Response enum value removed: ${value(fact.oldValue)}`,
    explanation: (fact) =>
      `${op(fact)} no longer returns ${value(fact.oldValue)}. Usually safe, but confirm no client depends on seeing that value.`
  },
  {
    id: "schema.composition.changed",
    severity: "warning",
    match: (fact) =>
      fact.category === "schema" && fact.field === "composition",
    title: (fact) => `Composed schema changed on ${op(fact)}`,
    explanation: (fact) =>
      `${op(fact)} uses allOf/oneOf/anyOf. This MVP does not fully merge composed schemas; review the change manually.`
  },
  {
    id: "schema.ref.unresolved",
    severity: "warning",
    match: (fact) => fact.category === "schema" && fact.field === "$ref",
    title: (fact) => `Unresolved schema $ref on ${op(fact)}`,
    explanation: (fact) =>
      `A $ref on ${op(fact)} could not be resolved, so part of the schema was not compared.`
  }
];

export const FALLBACK_RULE: CompatibilityRule = {
  id: "unclassified",
  severity: "warning",
  match: () => true,
  title: (fact) => `Unclassified change on ${op(fact)}`,
  explanation: (fact) =>
    `No dedicated compatibility rule matched this ${fact.category} ${fact.action} change. Review it manually.`
};

function op(fact: ChangeFact): string {
  const method = fact.location.method ?? "";
  const path = fact.location.path ?? "";
  return `${method} ${path}`.trim();
}

function isRequired(fact: ChangeFact, side: "new" | "old"): boolean {
  if (side === "new") {
    return fact.extras?.newRequired === true || fact.extras?.required === true;
  }
  return fact.extras?.oldRequired === true || fact.extras?.required === true;
}

function paramName(fact: ChangeFact): string {
  const source = fact.newValue ?? fact.oldValue;
  if (source && typeof source === "object" && "name" in source && "in" in source) {
    const parameter = source as { name: unknown; in: unknown };
    return `${String(parameter.in)} parameter "${String(parameter.name)}"`;
  }
  return "parameter";
}

function value(input: unknown): string {
  if (typeof input === "string" || typeof input === "number") {
    return String(input);
  }
  if (input && typeof input === "object" && "name" in input) {
    return String((input as { name: unknown }).name);
  }
  return JSON.stringify(input);
}
