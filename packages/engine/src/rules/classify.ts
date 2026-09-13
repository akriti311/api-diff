import type { ChangeFact, ClassifiedChange } from "../types.js";
import { COMPATIBILITY_RULES, FALLBACK_RULE } from "./catalog.js";

/**
 * Map structural facts to severity + explanation.
 * The walker does not decide breaking vs non-breaking; this table does.
 */
export function classifyFacts(facts: ChangeFact[]): ClassifiedChange[] {
  return facts.map((fact) => {
    const rule =
      COMPATIBILITY_RULES.find((candidate) => candidate.match(fact)) ?? FALLBACK_RULE;
    return {
      ...fact,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.title(fact),
      explanation: rule.explanation(fact)
    };
  });
}
