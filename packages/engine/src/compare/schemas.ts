import type { ChangeFact, NormalizedOperation, NormalizedSpec } from "../types.js";
import { operationPointer } from "../pointer.js";
import { compareSchemas } from "./schema.js";
import { matchedParameters } from "./parameters.js";
import { isSuccessStatus } from "./responses.js";

export function diffOperationSchemas(
  oldSpec: NormalizedSpec,
  newSpec: NormalizedSpec,
  oldOperation: NormalizedOperation,
  newOperation: NormalizedOperation
): ChangeFact[] {
  const facts: ChangeFact[] = [];
  const visited = new Set<string>();

  for (const pair of matchedParameters(oldOperation, newOperation)) {
    facts.push(
      ...compareSchemas(pair.oldParam.schema, pair.newParam.schema, {
        context: "request",
        method: newOperation.method,
        path: newOperation.path,
        pointer: `${operationPointer(newOperation.path, newOperation.method)}/parameters/${pair.newParam.in}:${pair.newParam.name}/schema`,
        oldRoot: oldSpec.root,
        newRoot: newSpec.root,
        visited
      })
    );
  }

  if (oldOperation.requestBody && newOperation.requestBody) {
    facts.push(
      ...compareSchemas(oldOperation.requestBody.schema, newOperation.requestBody.schema, {
        context: "request",
        method: newOperation.method,
        path: newOperation.path,
        pointer: `${operationPointer(newOperation.path, newOperation.method)}/requestBody/content/application~1json/schema`,
        oldRoot: oldSpec.root,
        newRoot: newSpec.root,
        visited
      })
    );
  }

  for (const [status, oldResponse] of oldOperation.responses) {
    const newResponse = newOperation.responses.get(status);
    if (!newResponse) {
      continue;
    }
    facts.push(
      ...compareSchemas(oldResponse.schema, newResponse.schema, {
        context: "response",
        method: newOperation.method,
        path: newOperation.path,
        pointer: `${operationPointer(newOperation.path, newOperation.method)}/responses/${status}/content/application~1json/schema`,
        oldRoot: oldSpec.root,
        newRoot: newSpec.root,
        visited,
        isSuccessResponse: isSuccessStatus(status)
      })
    );
  }

  return facts;
}
