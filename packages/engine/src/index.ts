/**
 * @apidiff/engine public API.
 *
 * Phase 4: parse, validate, normalize, diff operations.
 * compareSpecs() (classified report) arrives after the rule engine.
 */
export { parseAndValidate, parseBothSpecs, detectFormat } from "./parse/parseAndValidate.js";
export { normalizeSpec } from "./normalize/normalize.js";
export { parseAndNormalize } from "./normalize/parseAndNormalize.js";
export { pathSignature, operationKey } from "./normalize/path.js";
export { diffOperations } from "./compare/operations.js";
export { diffSpecs } from "./compare/diffSpecs.js";
export type { ParseAndValidateResult, ParseSuccess, ParseFailure } from "./parse/parseAndValidate.js";
export type { SpecFormat } from "./parse/detect.js";

export type {
  Severity,
  ChangeAction,
  ChangeCategory,
  ChangeContext,
  ChangeFact,
  ClassifiedChange,
  Report,
  CompareResult,
  ValidationError,
  SpecIssue,
  SpecTarget,
  OpenAPIDocument,
  NormalizedSpec,
  NormalizedOperation
} from "./types.js";
