import type { ChangeFact, NormalizedOperation, NormalizedResponse } from "../types.js";
import { operationPointer } from "../pointer.js";

export function isSuccessStatus(status: string): boolean {
  return status.toUpperCase() === "2XX" || /^2\d\d$/.test(status);
}

export function diffResponses(
  oldOperation: NormalizedOperation,
  newOperation: NormalizedOperation
): ChangeFact[] {
  const facts: ChangeFact[] = [];
  const statuses = new Set([
    ...oldOperation.responses.keys(),
    ...newOperation.responses.keys()
  ]);

  for (const status of statuses) {
    const oldResponse = oldOperation.responses.get(status);
    const newResponse = newOperation.responses.get(status);

    if (!oldResponse && newResponse) {
      facts.push(responseFact(newOperation, "added", newResponse));
    } else if (oldResponse && !newResponse) {
      facts.push(responseFact(oldOperation, "removed", oldResponse));
    }
  }

  return facts;
}

function responseFact(
  operation: NormalizedOperation,
  action: "added" | "removed",
  response: NormalizedResponse
): ChangeFact {
  return {
    action,
    category: "response",
    context: "response",
    field: "status",
    location: {
      method: operation.method,
      path: operation.path,
      pointer: `${operationPointer(operation.path, operation.method)}/responses/${response.status}`
    },
    oldValue: action === "removed" ? response.status : undefined,
    newValue: action === "added" ? response.status : undefined,
    extras: {
      isSuccessResponse: isSuccessStatus(response.status)
    }
  };
}
