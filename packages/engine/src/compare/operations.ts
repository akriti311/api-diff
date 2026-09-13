import type { ChangeFact, NormalizedOperation, NormalizedSpec } from "../types.js";
import { operationPointer } from "../pointer.js";

/**
 * Phase 4: structural add/remove of operations only.
 * Severity is assigned later by the rule engine.
 */
export function diffOperations(
  oldSpec: NormalizedSpec,
  newSpec: NormalizedSpec
): ChangeFact[] {
  const oldByPath = groupBySignature(oldSpec);
  const newByPath = groupBySignature(newSpec);
  const signatures = new Set([...oldByPath.keys(), ...newByPath.keys()]);
  const facts: ChangeFact[] = [];

  for (const signature of signatures) {
    const oldOps = oldByPath.get(signature) ?? new Map<string, NormalizedOperation>();
    const newOps = newByPath.get(signature) ?? new Map<string, NormalizedOperation>();
    const pathRemoved = newOps.size === 0;
    const pathAdded = oldOps.size === 0;

    for (const method of newOps.keys()) {
      if (!oldOps.has(method)) {
        const operation = newOps.get(method);
        if (operation) {
          facts.push(operationFact("added", pathAdded ? "endpoint" : "method", operation));
        }
      }
    }

    for (const method of oldOps.keys()) {
      if (!newOps.has(method)) {
        const operation = oldOps.get(method);
        if (operation) {
          facts.push(operationFact("removed", pathRemoved ? "endpoint" : "method", operation));
        }
      }
    }
  }

  return facts.sort(compareFacts);
}

function groupBySignature(
  spec: NormalizedSpec
): Map<string, Map<string, NormalizedOperation>> {
  const grouped = new Map<string, Map<string, NormalizedOperation>>();

  for (const operation of spec.operations.values()) {
    const methods = grouped.get(operation.pathSignature) ?? new Map();
    methods.set(operation.method, operation);
    grouped.set(operation.pathSignature, methods);
  }

  return grouped;
}

function operationFact(
  action: "added" | "removed",
  category: "endpoint" | "method",
  operation: NormalizedOperation
): ChangeFact {
  const label = `${operation.method} ${operation.path}`;
  return {
    action,
    category,
    context: "operation",
    location: {
      method: operation.method,
      path: operation.path,
      pointer: operationPointer(operation.path, operation.method)
    },
    oldValue: action === "removed" ? label : undefined,
    newValue: action === "added" ? label : undefined
  };
}

function compareFacts(left: ChangeFact, right: ChangeFact): number {
  const path = (left.location.path ?? "").localeCompare(right.location.path ?? "");
  if (path !== 0) {
    return path;
  }
  const method = (left.location.method ?? "").localeCompare(right.location.method ?? "");
  if (method !== 0) {
    return method;
  }
  return left.action.localeCompare(right.action);
}
