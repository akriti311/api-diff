import type {
  ChangeFact,
  NormalizedOperation,
  NormalizedParameter
} from "../types.js";
import { operationPointer } from "../pointer.js";

const COMPARED_IN = new Set(["path", "query", "header"]);

export function diffParameters(
  oldOperation: NormalizedOperation,
  newOperation: NormalizedOperation
): ChangeFact[] {
  const facts: ChangeFact[] = [];
  const consumedOld = new Set<string>();
  const consumedNew = new Set<string>();

  const pathCount = Math.min(
    oldOperation.pathParametersByPosition.length,
    newOperation.pathParametersByPosition.length
  );

  for (let index = 0; index < pathCount; index += 1) {
    const oldParam = oldOperation.pathParametersByPosition[index];
    const newParam = newOperation.pathParametersByPosition[index];
    if (!oldParam || !newParam) {
      continue;
    }

    consumedOld.add(paramKey(oldParam));
    consumedNew.add(paramKey(newParam));

    if (oldParam.name !== newParam.name) {
      facts.push(
        parameterFact(oldOperation, newOperation, {
          action: "modified",
          field: "name",
          oldParam,
          newParam
        })
      );
    }
  }

  for (const [key, oldParam] of oldOperation.parameters) {
    if (!COMPARED_IN.has(oldParam.in) || consumedOld.has(key)) {
      continue;
    }

    const newParam = newOperation.parameters.get(key);
    if (!newParam) {
      facts.push(
        parameterFact(oldOperation, newOperation, {
          action: "removed",
          field: "parameter",
          oldParam
        })
      );
      continue;
    }

    consumedNew.add(key);
    if (oldParam.required !== newParam.required) {
      facts.push(
        parameterFact(oldOperation, newOperation, {
          action: "modified",
          field: "required",
          oldParam,
          newParam
        })
      );
    }
  }

  for (const [key, newParam] of newOperation.parameters) {
    if (!COMPARED_IN.has(newParam.in) || consumedNew.has(key)) {
      continue;
    }
    if (oldOperation.parameters.has(key)) {
      continue;
    }
    facts.push(
      parameterFact(oldOperation, newOperation, {
        action: "added",
        field: "parameter",
        newParam
      })
    );
  }

  return facts;
}

function paramKey(parameter: NormalizedParameter): string {
  return `${parameter.in}:${parameter.name}`;
}

function parameterFact(
  oldOperation: NormalizedOperation,
  newOperation: NormalizedOperation,
  input: {
    action: ChangeFact["action"];
    field: string;
    oldParam?: NormalizedParameter;
    newParam?: NormalizedParameter;
  }
): ChangeFact {
  const sample = input.newParam ?? input.oldParam;
  const path = input.action === "removed" ? oldOperation.path : newOperation.path;
  const method = input.action === "removed" ? oldOperation.method : newOperation.method;
  const inLocation = sample?.in ?? "query";
  const name = input.newParam?.name ?? input.oldParam?.name ?? "";

  return {
    action: input.action,
    category: "parameter",
    context: "request",
    field: input.field,
    location: {
      method,
      path,
      pointer: `${operationPointer(path, method)}/parameters/${inLocation}:${name}`
    },
    oldValue: describeParam(input.oldParam),
    newValue: describeParam(input.newParam),
    extras: {
      required: input.newParam?.required ?? input.oldParam?.required,
      oldRequired: input.oldParam?.required,
      newRequired: input.newParam?.required
    }
  };
}

function describeParam(parameter: NormalizedParameter | undefined): unknown {
  if (!parameter) {
    return undefined;
  }
  return {
    name: parameter.name,
    in: parameter.in,
    required: parameter.required
  };
}
