import type { ChangeFact, NormalizedSpec } from "../types.js";
import { diffOperations } from "./operations.js";
import { diffParameters } from "./parameters.js";

export function diffContracts(
  oldSpec: NormalizedSpec,
  newSpec: NormalizedSpec
): ChangeFact[] {
  const facts = [...diffOperations(oldSpec, newSpec)];

  for (const [key, oldOperation] of oldSpec.operations) {
    const newOperation = newSpec.operations.get(key);
    if (!newOperation) {
      continue;
    }
    facts.push(...diffParameters(oldOperation, newOperation));
  }

  return facts.sort(compareFacts);
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
  const category = left.category.localeCompare(right.category);
  if (category !== 0) {
    return category;
  }
  const field = (left.field ?? "").localeCompare(right.field ?? "");
  if (field !== 0) {
    return field;
  }
  return left.action.localeCompare(right.action);
}
