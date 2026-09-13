import type {
  OpenAPIDocument,
  SpecTarget,
  ValidationError
} from "../types.js";
import { detectFormat, type SpecFormat } from "./detect.js";
import { parseDocument } from "./parse.js";
import { validateOpenAPI30 } from "./validate.js";

export type ParseSuccess = {
  ok: true;
  target: SpecTarget;
  format: SpecFormat;
  document: OpenAPIDocument;
};

export type ParseFailure = {
  ok: false;
  error: ValidationError;
};

export type ParseAndValidateResult = ParseSuccess | ParseFailure;

/**
 * Phase 2 public API: turn a YAML/JSON string into a validated OpenAPI 3.0 object,
 * or a structured error that names the old vs new spec.
 */
export function parseAndValidate(
  text: string,
  target: SpecTarget
): ParseAndValidateResult {
  const parsed = parseDocument(text);
  if (!parsed.ok) {
    return fail(target, parsed.details);
  }

  const issues = validateOpenAPI30(parsed.value);
  if (issues.length > 0) {
    return fail(target, issues);
  }

  return {
    ok: true,
    target,
    format: parsed.format,
    document: parsed.value as OpenAPIDocument
  };
}

export function parseBothSpecs(
  oldText: string,
  newText: string
):
  | { ok: true; old: ParseSuccess; new: ParseSuccess }
  | { ok: false; error: ValidationError } {
  const oldResult = parseAndValidate(oldText, "old");
  if (!oldResult.ok) {
    return oldResult;
  }

  const newResult = parseAndValidate(newText, "new");
  if (!newResult.ok) {
    return newResult;
  }

  return { ok: true, old: oldResult, new: newResult };
}

function fail(
  target: SpecTarget,
  details: ValidationError["details"]
): ParseFailure {
  return {
    ok: false,
    error: {
      error: "INVALID_SPEC",
      target,
      details
    }
  };
}

export { detectFormat };
