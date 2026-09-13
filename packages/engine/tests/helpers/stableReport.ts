import type { ClassifiedChange, Report, ReportSummary } from "../../src/types.js";

export type StableChange = {
  ruleId: string;
  severity: string;
  action: string;
  category: string;
  field: string | null;
  context: string;
  method: string | null;
  path: string | null;
  oldValue: unknown;
  newValue: unknown;
};

export type StableReport = {
  summary: ReportSummary;
  changes: StableChange[];
};

export function toStableReport(report: Report): StableReport {
  return {
    summary: report.summary,
    changes: report.changes.map(toStableChange)
  };
}

export function toStableChange(change: ClassifiedChange): StableChange {
  return {
    ruleId: change.ruleId,
    severity: change.severity,
    action: change.action,
    category: change.category,
    field: change.field ?? null,
    context: change.context,
    method: change.location.method ?? null,
    path: change.location.path ?? null,
    oldValue: change.oldValue ?? null,
    newValue: change.newValue ?? null
  };
}
