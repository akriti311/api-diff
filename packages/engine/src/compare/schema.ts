import type { ChangeContext, ChangeFact, JsonObject } from "../types.js";
import { escapePointerToken } from "../pointer.js";
import { resolveSchema } from "../refs/resolve.js";

export type SchemaWalkContext = {
  context: ChangeContext;
  method: string;
  path: string;
  pointer: string;
  oldRoot: unknown;
  newRoot: unknown;
  visited: Set<string>;
  isSuccessResponse?: boolean;
};

const COMPOSITION_KEYS = ["allOf", "oneOf", "anyOf"] as const;

export function compareSchemas(
  oldSchema: unknown,
  newSchema: unknown,
  ctx: SchemaWalkContext
): ChangeFact[] {
  const oldResolved = resolveSchema(ctx.oldRoot, oldSchema, ctx.pointer);
  const newResolved = resolveSchema(ctx.newRoot, newSchema, ctx.pointer);
  const visitKey = `${oldResolved.pointer}|${newResolved.pointer}`;

  if (ctx.visited.has(visitKey)) {
    return [];
  }
  ctx.visited.add(visitKey);

  if (oldResolved.circular || newResolved.circular) {
    return [];
  }

  const facts: ChangeFact[] = [];

  if (oldResolved.missing || newResolved.missing) {
    facts.push(
      schemaFact(ctx, {
        action: "modified",
        field: "$ref",
        oldValue: oldResolved.missing ? oldResolved.pointer : undefined,
        newValue: newResolved.missing ? newResolved.pointer : undefined
      })
    );
    return facts;
  }

  const oldObject = oldResolved.schema;
  const newObject = newResolved.schema;

  if (!oldObject && !newObject) {
    return facts;
  }

  if (hasComposition(oldObject) || hasComposition(newObject)) {
    if (
      JSON.stringify(compositionSlice(oldObject)) !==
      JSON.stringify(compositionSlice(newObject))
    ) {
      facts.push(
        schemaFact(ctx, {
          action: "modified",
          field: "composition",
          extras: { composed: true }
        })
      );
    }
  }

  if (!oldObject || !newObject) {
    return facts;
  }

  facts.push(...diffTypes(oldObject, newObject, ctx));
  facts.push(...diffEnums(oldObject, newObject, ctx));
  facts.push(...diffRequired(oldObject, newObject, ctx));
  facts.push(...diffProperties(oldObject, newObject, ctx));
  facts.push(...diffItems(oldObject, newObject, ctx));
  return facts;
}

function diffTypes(
  oldSchema: JsonObject,
  newSchema: JsonObject,
  ctx: SchemaWalkContext
): ChangeFact[] {
  const oldTypes = typeSet(oldSchema);
  const newTypes = typeSet(newSchema);
  if (oldTypes.size === 0 || newTypes.size === 0) {
    return [];
  }
  if (sameSet(oldTypes, newTypes)) {
    return [];
  }
  return [
    schemaFact(ctx, {
      action: "modified",
      field: "type",
      oldValue: [...oldTypes].sort(),
      newValue: [...newTypes].sort()
    })
  ];
}

function diffEnums(
  oldSchema: JsonObject,
  newSchema: JsonObject,
  ctx: SchemaWalkContext
): ChangeFact[] {
  if (!Array.isArray(oldSchema.enum) && !Array.isArray(newSchema.enum)) {
    return [];
  }

  const oldValues = new Map<string, unknown>();
  const newValues = new Map<string, unknown>();
  if (Array.isArray(oldSchema.enum)) {
    for (const value of oldSchema.enum) {
      oldValues.set(JSON.stringify(value), value);
    }
  }
  if (Array.isArray(newSchema.enum)) {
    for (const value of newSchema.enum) {
      newValues.set(JSON.stringify(value), value);
    }
  }

  const facts: ChangeFact[] = [];
  for (const [key, value] of oldValues) {
    if (!newValues.has(key)) {
      facts.push(
        schemaFact(ctx, { action: "removed", field: "enum", oldValue: value })
      );
    }
  }
  for (const [key, value] of newValues) {
    if (!oldValues.has(key)) {
      facts.push(
        schemaFact(ctx, { action: "added", field: "enum", newValue: value })
      );
    }
  }
  return facts;
}

function diffRequired(
  oldSchema: JsonObject,
  newSchema: JsonObject,
  ctx: SchemaWalkContext
): ChangeFact[] {
  const oldRequired = stringSet(oldSchema.required);
  const newRequired = stringSet(newSchema.required);
  const facts: ChangeFact[] = [];

  for (const name of oldRequired) {
    if (!newRequired.has(name)) {
      facts.push(
        schemaFact(ctx, {
          action: "removed",
          field: "required",
          oldValue: name,
          extras: { required: false, oldRequired: true, newRequired: false }
        })
      );
    }
  }
  for (const name of newRequired) {
    if (!oldRequired.has(name)) {
      facts.push(
        schemaFact(ctx, {
          action: "added",
          field: "required",
          newValue: name,
          extras: { required: true, oldRequired: false, newRequired: true }
        })
      );
    }
  }
  return facts;
}

function diffProperties(
  oldSchema: JsonObject,
  newSchema: JsonObject,
  ctx: SchemaWalkContext
): ChangeFact[] {
  const oldProps = isObject(oldSchema.properties) ? oldSchema.properties : {};
  const newProps = isObject(newSchema.properties) ? newSchema.properties : {};
  const names = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);
  const oldRequired = stringSet(oldSchema.required);
  const newRequired = stringSet(newSchema.required);
  const facts: ChangeFact[] = [];

  for (const name of names) {
    const pointer = `${ctx.pointer}/properties/${escapePointerToken(name)}`;
    const oldProp = oldProps[name];
    const newProp = newProps[name];

    if (oldProp !== undefined && newProp === undefined) {
      facts.push(
        schemaFact(ctx, {
          action: "removed",
          field: "property",
          oldValue: name,
          extras: {
            required: oldRequired.has(name),
            oldRequired: oldRequired.has(name)
          }
        })
      );
      continue;
    }

    if (oldProp === undefined && newProp !== undefined) {
      facts.push(
        schemaFact(ctx, {
          action: "added",
          field: "property",
          newValue: name,
          extras: {
            required: newRequired.has(name),
            newRequired: newRequired.has(name)
          }
        })
      );
      continue;
    }

    facts.push(
      ...compareSchemas(oldProp, newProp, { ...ctx, pointer })
    );
  }

  return facts;
}

function diffItems(
  oldSchema: JsonObject,
  newSchema: JsonObject,
  ctx: SchemaWalkContext
): ChangeFact[] {
  if (oldSchema.items === undefined && newSchema.items === undefined) {
    return [];
  }
  return compareSchemas(oldSchema.items, newSchema.items, {
    ...ctx,
    pointer: `${ctx.pointer}/items`
  });
}

function schemaFact(
  ctx: SchemaWalkContext,
  input: {
    action: ChangeFact["action"];
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
    extras?: ChangeFact["extras"];
  }
): ChangeFact {
  return {
    action: input.action,
    category: "schema",
    context: ctx.context,
    field: input.field,
    location: {
      method: ctx.method,
      path: ctx.path,
      pointer: ctx.pointer
    },
    oldValue: input.oldValue,
    newValue: input.newValue,
    extras: {
      ...input.extras,
      isSuccessResponse: ctx.isSuccessResponse
    }
  };
}

function typeSet(schema: JsonObject): Set<string> {
  const types = new Set<string>();
  if (typeof schema.type === "string") {
    types.add(schema.type);
  } else if (Array.isArray(schema.type)) {
    for (const value of schema.type) {
      if (typeof value === "string") {
        types.add(value);
      }
    }
  }
  if (schema.nullable === true) {
    types.add("null");
  }
  return types;
}

function stringSet(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }
  return new Set(value.filter((item): item is string => typeof item === "string"));
}

function hasComposition(schema: JsonObject | undefined): boolean {
  if (!schema) {
    return false;
  }
  return COMPOSITION_KEYS.some((key) => schema[key] !== undefined);
}

function compositionSlice(schema: JsonObject | undefined): JsonObject {
  const slice: JsonObject = {};
  if (!schema) {
    return slice;
  }
  for (const key of COMPOSITION_KEYS) {
    if (schema[key] !== undefined) {
      slice[key] = schema[key];
    }
  }
  return slice;
}

function sameSet(left: Set<string>, right: Set<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
