import { HTTP_METHOD_SET, JSON_MEDIA_TYPE } from "../http.js";
import type {
  JsonObject,
  NormalizedOperation,
  NormalizedParameter,
  NormalizedRequestBody,
  NormalizedResponse,
  NormalizedSpec,
  OpenAPIDocument
} from "../types.js";
import { operationKey, pathParameterNames, pathSignature } from "./path.js";

export function normalizeSpec(document: OpenAPIDocument): NormalizedSpec {
  const notes: string[] = [];
  const operations = new Map<string, NormalizedOperation>();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (!isObject(pathItem)) {
      continue;
    }

    const pathParameters = listParameters(pathItem.parameters);
    const signature = pathSignature(path);

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHOD_SET.has(method) || !isObject(operation)) {
        continue;
      }

      const normalized = normalizeOperation(
        method,
        path,
        signature,
        pathParameters,
        operation,
        notes
      );
      operations.set(operationKey(method, signature), normalized);
    }
  }

  return {
    openapi: document.openapi,
    info: {
      title: document.info.title,
      version: document.info.version
    },
    root: document,
    operations,
    notes
  };
}

function normalizeOperation(
  method: string,
  path: string,
  signature: string,
  pathItemParameters: JsonObject[],
  operation: JsonObject,
  notes: string[]
): NormalizedOperation {
  const parameters = mergeParameters(pathItemParameters, listParameters(operation.parameters));
  const location = `${method.toUpperCase()} ${path}`;

  return {
    method: method.toUpperCase(),
    path,
    pathSignature: signature,
    parameters,
    pathParametersByPosition: positionPathParameters(path, parameters),
    requestBody: normalizeRequestBody(operation.requestBody, location, notes),
    responses: normalizeResponses(operation.responses, location, notes)
  };
}

function mergeParameters(
  pathItemParameters: JsonObject[],
  operationParameters: JsonObject[]
): Map<string, NormalizedParameter> {
  const merged = new Map<string, NormalizedParameter>();

  for (const raw of [...pathItemParameters, ...operationParameters]) {
    const parameter = normalizeParameter(raw);
    if (!parameter) {
      continue;
    }
    merged.set(parameterKey(parameter), parameter);
  }

  return merged;
}

function normalizeParameter(raw: JsonObject): NormalizedParameter | undefined {
  if (typeof raw.$ref === "string") {
    return undefined;
  }

  const name = typeof raw.name === "string" ? raw.name : "";
  const location = typeof raw.in === "string" ? raw.in : "";
  if (!name || !location) {
    return undefined;
  }

  return {
    name,
    in: location,
    required: location === "path" ? true : raw.required === true,
    schema: raw.schema
  };
}

function parameterKey(parameter: NormalizedParameter): string {
  return `${parameter.in}:${parameter.name}`;
}

function positionPathParameters(
  path: string,
  parameters: Map<string, NormalizedParameter>
): NormalizedParameter[] {
  return pathParameterNames(path).map((name, position) => {
    const existing = parameters.get(`path:${name}`);
    if (existing) {
      return { ...existing, position };
    }
    return {
      name,
      in: "path",
      required: true,
      schema: undefined,
      position
    };
  });
}

function normalizeRequestBody(
  raw: unknown,
  location: string,
  notes: string[]
): NormalizedRequestBody | undefined {
  if (!isObject(raw)) {
    return undefined;
  }

  const media = extractMedia(raw.content, location, "request", notes);
  return {
    required: raw.required === true,
    schema: media.schema,
    mediaTypes: media.mediaTypes
  };
}

function normalizeResponses(
  raw: unknown,
  location: string,
  notes: string[]
): Map<string, NormalizedResponse> {
  const responses = new Map<string, NormalizedResponse>();
  if (!isObject(raw)) {
    return responses;
  }

  for (const [status, response] of Object.entries(raw)) {
    if (!isObject(response)) {
      continue;
    }
    const media = extractMedia(
      response.content,
      location,
      `response ${status}`,
      notes
    );
    responses.set(String(status), {
      status: String(status),
      schema: media.schema,
      mediaTypes: media.mediaTypes
    });
  }

  return responses;
}

function extractMedia(
  content: unknown,
  location: string,
  section: string,
  notes: string[]
): { schema: unknown; mediaTypes: string[] } {
  if (!isObject(content)) {
    return { schema: undefined, mediaTypes: [] };
  }

  const mediaTypes = Object.keys(content);
  const nonJson = mediaTypes.filter((type) => !isJsonMediaType(type));
  if (nonJson.length > 0) {
    notes.push(
      `${location} ${section} has non-JSON media types (${nonJson.join(", ")}); only application/json is compared.`
    );
  }

  const jsonEntry = mediaTypes.find((type) => isJsonMediaType(type));
  if (!jsonEntry) {
    return { schema: undefined, mediaTypes };
  }

  const mediaObject = content[jsonEntry];
  const schema = isObject(mediaObject) ? mediaObject.schema : undefined;
  return { schema, mediaTypes };
}

function isJsonMediaType(mediaType: string): boolean {
  return mediaType === JSON_MEDIA_TYPE || mediaType.startsWith(`${JSON_MEDIA_TYPE};`);
}

function listParameters(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isObject);
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
