/**
 * @apidiff/engine public API.
 *
 * compareSpecs() is the product: parse → validate → normalize → facts → rules → report.
 */
export { parseAndValidate, parseBothSpecs, detectFormat } from "./parse/parseAndValidate.js";
export { normalizeSpec } from "./normalize/normalize.js";
export { parseAndNormalize } from "./normalize/parseAndNormalize.js";
export { pathSignature, operationKey } from "./normalize/path.js";
export { diffOperations } from "./compare/operations.js";
export { diffParameters } from "./compare/parameters.js";
export { diffRequestBody } from "./compare/requestBody.js";
export { diffResponses, isSuccessStatus } from "./compare/responses.js";
export { diffContracts } from "./compare/compare.js";
export { compareSchemas } from "./compare/schema.js";
export { diffOperationSchemas } from "./compare/schemas.js";
export { resolveSchema, getByPointer } from "./refs/resolve.js";
export { classifyFacts } from "./rules/classify.js";
export { COMPATIBILITY_RULES } from "./rules/catalog.js";
export { compareSpecs } from "./compareSpecs.js";
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
