import { parseAndValidate, type ParseFailure } from "../parse/parseAndValidate.js";
import type { NormalizedSpec, SpecTarget } from "../types.js";
import { normalizeSpec } from "./normalize.js";

export type NormalizeSuccess = {
  ok: true;
  target: SpecTarget;
  spec: NormalizedSpec;
};

export function parseAndNormalize(
  text: string,
  target: SpecTarget
): NormalizeSuccess | ParseFailure {
  const parsed = parseAndValidate(text, target);
  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    target,
    spec: normalizeSpec(parsed.document)
  };
}
