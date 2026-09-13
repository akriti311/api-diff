import { unescapePointerToken } from "../pointer.js";
import { isInternalRef } from "./assertInternal.js";

export type ResolvedSchema = {
  schema: Record<string, unknown> | undefined;
  pointer: string;
  circular: boolean;
  missing: boolean;
};

export function getByPointer(root: unknown, pointer: string): unknown {
  if (pointer === "" || pointer === "#") {
    return root;
  }

  const encoded = pointer.startsWith("#/")
    ? pointer.slice(2)
    : pointer.startsWith("/")
      ? pointer.slice(1)
      : pointer;

  if (encoded === "") {
    return root;
  }

  let current: unknown = root;
  for (const token of encoded.split("/")) {
    const key = unescapePointerToken(token);
    if (Array.isArray(current)) {
      const index = Number(key);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Follow internal $ref until a concrete schema object, or until a cycle / missing pointer.
 */
export function resolveSchema(
  root: unknown,
  schema: unknown,
  currentPointer: string
): ResolvedSchema {
  return resolve(root, schema, currentPointer, new Set());
}

function resolve(
  root: unknown,
  schema: unknown,
  currentPointer: string,
  visiting: Set<string>
): ResolvedSchema {
  if (schema === undefined || schema === null) {
    return { schema: undefined, pointer: currentPointer, circular: false, missing: false };
  }

  if (typeof schema !== "object" || Array.isArray(schema)) {
    return { schema: undefined, pointer: currentPointer, circular: false, missing: false };
  }

  const object = schema as Record<string, unknown>;
  if (typeof object.$ref !== "string") {
    return { schema: object, pointer: currentPointer, circular: false, missing: false };
  }

  const ref = object.$ref;
  if (!isInternalRef(ref)) {
    return { schema: undefined, pointer: ref, circular: false, missing: true };
  }

  if (visiting.has(ref)) {
    return { schema: object, pointer: ref, circular: true, missing: false };
  }

  visiting.add(ref);
  const target = getByPointer(root, ref);
  if (target === undefined) {
    visiting.delete(ref);
    return { schema: undefined, pointer: ref, circular: false, missing: true };
  }

  const resolved = resolve(root, target, ref, visiting);
  visiting.delete(ref);
  return resolved;
}
