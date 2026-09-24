import type { ClassifiedChange, Report, ValidationError } from "@apidiff/engine";

export const USAGE = `Usage: apidiff [--json] <old-spec> <new-spec>

Compare two OpenAPI 3.0 YAML or JSON files.
--json prints the classified report as JSON.
Exits 1 if any change is breaking, 2 on usage or invalid specs.
`;

export function formatReport(report: Report, oldPath: string, newPath: string): string {
  const lines = [
    `Compared ${oldPath} → ${newPath}`,
    `${report.meta.oldTitle} ${report.meta.oldVersion} → ${report.meta.newTitle} ${report.meta.newVersion}`,
    ""
  ];

  const { summary } = report;
  if (summary.total === 0) {
    lines.push("No contract changes.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    `${summary.total} ${plural(summary.total, "change")}: ${summary.breaking} breaking, ${summary.nonBreaking} non-breaking, ${summary.warnings} ${plural(summary.warnings, "warning")}`
  );
  lines.push("");

  for (const change of report.changes) {
    lines.push(...formatChange(change), "");
  }

  return `${lines.join("\n")}\n`;
}

export function formatValidationError(error: ValidationError): string {
  const details = error.details
    .map((issue) => (issue.pointer ? `  - ${issue.message} (${issue.pointer})` : `  - ${issue.message}`))
    .join("\n");
  return `Invalid ${error.target} spec:\n${details}\n`;
}

function formatChange(change: ClassifiedChange): string[] {
  const where = [change.location.method, change.location.path].filter(Boolean).join(" ");
  const lines = [`${change.severity.toUpperCase()}  ${change.ruleId}`];
  if (where) {
    lines.push(`  ${where}`);
  }
  lines.push(`  ${change.title}`);
  lines.push(`  ${change.explanation}`);
  return lines;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
