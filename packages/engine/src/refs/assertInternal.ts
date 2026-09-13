import type { SpecIssue } from "../types.js";
import { escapePointerToken } from "../pointer.js";

/**
 * MVP: only same-document pointers like #/components/schemas/User.
 * file:, http(s):, and other.yaml#/... are rejected so we never
 * read the filesystem or the network from an uploaded spec.
 */
export function isInternalRef(ref: string): boolean {
  return ref.startsWith("#/");
}

export function collectExternalRefIssues(
  value: unknown,
  pointer = ""
): SpecIssue[] {
  const issues: SpecIssue[] = [];
  walk(value, pointer, issues);
  return issues;
}

function walk(value: unknown, pointer: string, issues: SpecIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walk(item, `${pointer}/${index}`, issues);
    });
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  const object = value as Record<string, unknown>;
  if (typeof object.$ref === "string" && !isInternalRef(object.$ref)) {
    issues.push({
      pointer: `${pointer}/$ref`,
      message: `External $ref is not supported: "${object.$ref}". Use an internal pointer such as #/components/schemas/User.`
    });
  }

  for (const [key, child] of Object.entries(object)) {
    walk(child, `${pointer}/${escapePointerToken(key)}`, issues);
  }
}
