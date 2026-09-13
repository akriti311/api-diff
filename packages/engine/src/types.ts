export type Severity = "breaking" | "non-breaking" | "warning";
export type ChangeAction = "added" | "removed" | "modified";
export type ChangeCategory =
  | "endpoint"
  | "method"
  | "parameter"
  | "requestBody"
  | "response"
  | "schema";
export type ChangeContext = "request" | "response" | "operation";

export type ChangeLocation = {
  method?: string;
  path?: string;
  pointer: string;
};

export type ChangeFact = {
  action: ChangeAction;
  category: ChangeCategory;
  location: ChangeLocation;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  context: ChangeContext;
  extras?: {
    required?: boolean;
    oldRequired?: boolean;
    newRequired?: boolean;
    isSuccessResponse?: boolean;
    composed?: boolean;
    mediaTypes?: string[];
  };
};

export type ClassifiedChange = ChangeFact & {
  severity: Severity;
  ruleId: string;
  title: string;
  explanation: string;
};

export type ReportSummary = {
  total: number;
  added: number;
  removed: number;
  modified: number;
  breaking: number;
  nonBreaking: number;
  warnings: number;
};

export type Report = {
  summary: ReportSummary;
  changes: ClassifiedChange[];
  meta: {
    oldTitle: string;
    newTitle: string;
    oldVersion: string;
    newVersion: string;
    durationMs: number;
    notes: string[];
  };
};

export type SpecIssue = {
  message: string;
  pointer?: string;
};

export type ValidationError = {
  error: "INVALID_SPEC";
  target: "old" | "new";
  details: SpecIssue[];
};

export type CompareResult =
  | { ok: true; report: Report }
  | { ok: false; error: ValidationError };

export type SpecTarget = "old" | "new";

export type JsonObject = Record<string, unknown>;

export type OpenAPIDocument = JsonObject & {
  openapi: string;
  info: { title: string; version: string; [key: string]: unknown };
  paths: Record<string, unknown>;
};

export type NormalizedParameter = {
  name: string;
  in: string;
  required: boolean;
  schema: unknown;
  position?: number;
};

export type NormalizedRequestBody = {
  required: boolean;
  schema?: unknown;
  mediaTypes: string[];
};

export type NormalizedResponse = {
  status: string;
  schema?: unknown;
  mediaTypes: string[];
};

export type NormalizedOperation = {
  method: string;
  path: string;
  pathSignature: string;
  parameters: Map<string, NormalizedParameter>;
  pathParametersByPosition: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: Map<string, NormalizedResponse>;
};

export type NormalizedSpec = {
  info: { title: string; version: string };
  openapi: string;
  root: OpenAPIDocument;
  operations: Map<string, NormalizedOperation>;
  notes: string[];
};
