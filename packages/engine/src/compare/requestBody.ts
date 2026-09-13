import type { ChangeFact, NormalizedOperation, NormalizedRequestBody } from "../types.js";
import { operationPointer } from "../pointer.js";

export function diffRequestBody(
  oldOperation: NormalizedOperation,
  newOperation: NormalizedOperation
): ChangeFact[] {
  const oldBody = oldOperation.requestBody;
  const newBody = newOperation.requestBody;

  if (!oldBody && !newBody) {
    return [];
  }

  if (!oldBody && newBody) {
    return [bodyFact(newOperation, "added", undefined, newBody)];
  }

  if (oldBody && !newBody) {
    return [bodyFact(oldOperation, "removed", oldBody, undefined)];
  }

  if (oldBody && newBody && oldBody.required !== newBody.required) {
    return [bodyFact(newOperation, "modified", oldBody, newBody)];
  }

  return [];
}

function bodyFact(
  operation: NormalizedOperation,
  action: ChangeFact["action"],
  oldBody: NormalizedRequestBody | undefined,
  newBody: NormalizedRequestBody | undefined
): ChangeFact {
  return {
    action,
    category: "requestBody",
    context: "request",
    field: action === "modified" ? "required" : "body",
    location: {
      method: operation.method,
      path: operation.path,
      pointer: `${operationPointer(operation.path, operation.method)}/requestBody`
    },
    oldValue: oldBody ? { required: oldBody.required } : undefined,
    newValue: newBody ? { required: newBody.required } : undefined,
    extras: {
      required: newBody?.required ?? oldBody?.required,
      oldRequired: oldBody?.required,
      newRequired: newBody?.required
    }
  };
}
