import { diffContracts } from "./compare/compare.js";
import { parseAndNormalize } from "./normalize/parseAndNormalize.js";
import { buildReport } from "./report/buildReport.js";
import { classifyFacts } from "./rules/classify.js";
import type { CompareResult } from "./types.js";

/**
 * Public engine API: parse, validate, normalize, diff, then classify.
 */
export function compareSpecs(oldText: string, newText: string): CompareResult {
  const started = Date.now();
  const oldResult = parseAndNormalize(oldText, "old");
  if (!oldResult.ok) {
    return oldResult;
  }

  const newResult = parseAndNormalize(newText, "new");
  if (!newResult.ok) {
    return newResult;
  }

  const facts = diffContracts(oldResult.spec, newResult.spec);
  const changes = classifyFacts(facts);

  return {
    ok: true,
    report: buildReport(
      changes,
      oldResult.spec,
      newResult.spec,
      Date.now() - started,
      [...oldResult.spec.notes, ...newResult.spec.notes]
    )
  };
}
