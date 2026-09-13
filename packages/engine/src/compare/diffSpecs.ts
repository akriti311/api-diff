import { parseAndNormalize } from "../normalize/parseAndNormalize.js";
import type { ChangeFact, ValidationError } from "../types.js";
import { diffContracts } from "./compare.js";

export type DiffSpecsResult =
  | { ok: true; facts: ChangeFact[]; notes: string[] }
  | { ok: false; error: ValidationError };

/**
 * Parse, validate, normalize, then compare operations and parameters.
 * Does not classify breaking vs non-breaking yet.
 */
export function diffSpecs(oldText: string, newText: string): DiffSpecsResult {
  const oldResult = parseAndNormalize(oldText, "old");
  if (!oldResult.ok) {
    return oldResult;
  }

  const newResult = parseAndNormalize(newText, "new");
  if (!newResult.ok) {
    return newResult;
  }

  return {
    ok: true,
    facts: diffContracts(oldResult.spec, newResult.spec),
    notes: [...oldResult.spec.notes, ...newResult.spec.notes]
  };
}
