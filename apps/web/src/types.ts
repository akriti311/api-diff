export type Severity = "breaking" | "non-breaking" | "warning";
export type ChangeAction = "added" | "removed" | "modified";

export type ClassifiedChange = {
  action: ChangeAction;
  category: string;
  context: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  location: {
    method?: string;
    path?: string;
    pointer: string;
  };
  severity: Severity;
  ruleId: string;
  title: string;
  explanation: string;
};

export type Report = {
  summary: {
    total: number;
    added: number;
    removed: number;
    modified: number;
    breaking: number;
    nonBreaking: number;
    warnings: number;
  };
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

export type CompareError = {
  error: "INVALID_SPEC" | "INVALID_REQUEST";
  target?: "old" | "new";
  message?: string;
  details?: Array<{ message: string; pointer?: string }>;
};
