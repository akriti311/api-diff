import Ajv, { type ErrorObject } from "ajv";
import { HTTP_METHOD_SET } from "../http.js";
import { escapePointerToken } from "../pointer.js";
import { collectExternalRefIssues } from "../refs/assertInternal.js";
import type { JsonObject, SpecIssue } from "../types.js";

const PARAMETER_LOCATIONS = new Set(["path", "query", "header", "cookie"]);

/**
 * Top-level OpenAPI 3.0 shape only.
 * Nested path/operation rules are checked in code so error messages stay readable.
 */
const openapi30DocumentSchema = {
  type: "object",
  required: ["openapi", "info", "paths"],
  additionalProperties: true,
  properties: {
    openapi: { type: "string" },
    info: {
      type: "object",
      required: ["title", "version"],
      additionalProperties: true,
      properties: {
        title: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 }
      }
    },
    paths: { type: "object" }
  }
} as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateTopLevel = ajv.compile(openapi30DocumentSchema);

export function validateOpenAPI30(value: unknown): SpecIssue[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [{ message: "OpenAPI document must be a YAML or JSON object." }];
  }

  const document = value as JsonObject;
  const issues: SpecIssue[] = [];

  issues.push(...versionIssues(document));
  issues.push(...ajvIssues(document));
  issues.push(...pathAndOperationIssues(document));
  issues.push(...collectExternalRefIssues(document));

  return uniqueIssues(issues);
}

function versionIssues(document: JsonObject): SpecIssue[] {
  const openapi = document.openapi;
  if (typeof openapi !== "string") {
    if (document.swagger !== undefined) {
      return [
        {
          pointer: "/swagger",
          message:
            "Swagger / OpenAPI 2.0 is not supported. Export the API as OpenAPI 3.0.x."
        }
      ];
    }
    return [];
  }

  if (/^3\.0\.\d+$/.test(openapi)) {
    return [];
  }

  if (openapi.startsWith("3.1")) {
    return [
      {
        pointer: "/openapi",
        message: `OpenAPI 3.1 is not supported in the MVP. Found "${openapi}". Use 3.0.x.`
      }
    ];
  }

  if (openapi.startsWith("2.") || document.swagger !== undefined) {
    return [
      {
        pointer: "/openapi",
        message: `OpenAPI 2.0 is not supported. Found "${openapi}". Use 3.0.x.`
      }
    ];
  }

  return [
    {
      pointer: "/openapi",
      message: `Unsupported OpenAPI version "${openapi}". This tool accepts 3.0.x only.`
    }
  ];
}

function ajvIssues(document: JsonObject): SpecIssue[] {
  if (validateTopLevel(document)) {
    return [];
  }

  return (validateTopLevel.errors ?? []).map((error) => ({
    pointer: ajvPointer(error),
    message: ajvMessage(error)
  }));
}

function ajvPointer(error: ErrorObject): string {
  const instance = error.instancePath || "";
  if (error.keyword === "required" && error.params && "missingProperty" in error.params) {
    return `${instance}/${String(error.params.missingProperty)}`;
  }
  return instance || "/";
}

function ajvMessage(error: ErrorObject): string {
  if (error.keyword === "required" && error.params && "missingProperty" in error.params) {
    return `Missing required field "${String(error.params.missingProperty)}".`;
  }
  return error.message
    ? `Invalid OpenAPI document: ${error.message}.`
    : "Invalid OpenAPI document.";
}

function pathAndOperationIssues(document: JsonObject): SpecIssue[] {
  const issues: SpecIssue[] = [];
  const paths = document.paths;
  if (paths === undefined || paths === null || typeof paths !== "object" || Array.isArray(paths)) {
    return issues;
  }

  for (const [path, pathItem] of Object.entries(paths as JsonObject)) {
    const pathPointer = `/paths/${escapePointerToken(path)}`;

    if (!path.startsWith("/")) {
      issues.push({
        pointer: pathPointer,
        message: `Path "${path}" must start with "/".`
      });
    }

    if (pathItem === null || typeof pathItem !== "object" || Array.isArray(pathItem)) {
      issues.push({
        pointer: pathPointer,
        message: `Path item "${path}" must be an object.`
      });
      continue;
    }

    const item = pathItem as JsonObject;
    issues.push(...parameterListIssues(item.parameters, `${pathPointer}/parameters`));

    for (const [key, operation] of Object.entries(item)) {
      if (!HTTP_METHOD_SET.has(key)) {
        continue;
      }

      const opPointer = `${pathPointer}/${key}`;
      if (operation === null || typeof operation !== "object" || Array.isArray(operation)) {
        issues.push({
          pointer: opPointer,
          message: `Operation ${key.toUpperCase()} ${path} must be an object.`
        });
        continue;
      }

      const op = operation as JsonObject;
      if (op.responses === undefined) {
        issues.push({
          pointer: `${opPointer}/responses`,
          message: `Operation ${key.toUpperCase()} ${path} is missing responses.`
        });
      } else if (typeof op.responses !== "object" || op.responses === null || Array.isArray(op.responses)) {
        issues.push({
          pointer: `${opPointer}/responses`,
          message: `Operation ${key.toUpperCase()} ${path} responses must be an object.`
        });
      }

      issues.push(...parameterListIssues(op.parameters, `${opPointer}/parameters`));
    }
  }

  return issues;
}

function parameterListIssues(parameters: unknown, pointer: string): SpecIssue[] {
  if (parameters === undefined) {
    return [];
  }
  if (!Array.isArray(parameters)) {
    return [{ pointer, message: "parameters must be an array." }];
  }

  const issues: SpecIssue[] = [];
  parameters.forEach((parameter, index) => {
    const itemPointer = `${pointer}/${index}`;
    if (parameter === null || typeof parameter !== "object" || Array.isArray(parameter)) {
      issues.push({ pointer: itemPointer, message: "Parameter must be an object." });
      return;
    }

    const param = parameter as JsonObject;
    if (typeof param.$ref === "string") {
      return;
    }
    if (typeof param.name !== "string" || param.name.length === 0) {
      issues.push({
        pointer: `${itemPointer}/name`,
        message: "Parameter is missing name."
      });
    }
    if (typeof param.in !== "string" || !PARAMETER_LOCATIONS.has(param.in)) {
      issues.push({
        pointer: `${itemPointer}/in`,
        message: 'Parameter "in" must be one of: path, query, header, cookie.'
      });
    }
  });
  return issues;
}

function uniqueIssues(issues: SpecIssue[]): SpecIssue[] {
  const seen = new Set<string>();
  const unique: SpecIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.pointer ?? ""}|${issue.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(issue);
  }
  return unique;
}
