import type { ClassifiedChange, NormalizedSpec, Report, ReportSummary } from "../types.js";

export function buildReport(
  changes: ClassifiedChange[],
  oldSpec: NormalizedSpec,
  newSpec: NormalizedSpec,
  durationMs: number,
  notes: string[]
): Report {
  return {
    summary: summarize(changes),
    changes,
    meta: {
      oldTitle: oldSpec.info.title,
      newTitle: newSpec.info.title,
      oldVersion: oldSpec.info.version,
      newVersion: newSpec.info.version,
      durationMs,
      notes
    }
  };
}

function summarize(changes: ClassifiedChange[]): ReportSummary {
  return {
    total: changes.length,
    added: count(changes, (change) => change.action === "added"),
    removed: count(changes, (change) => change.action === "removed"),
    modified: count(changes, (change) => change.action === "modified"),
    breaking: count(changes, (change) => change.severity === "breaking"),
    nonBreaking: count(changes, (change) => change.severity === "non-breaking"),
    warnings: count(changes, (change) => change.severity === "warning")
  };
}

function count(
  changes: ClassifiedChange[],
  predicate: (change: ClassifiedChange) => boolean
): number {
  return changes.filter(predicate).length;
}
