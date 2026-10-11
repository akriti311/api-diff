import type { ClassifiedChange, Report, ValidationError } from "@apidiff/engine";

export const USAGE = `Usage: apidiff [--json] [--quiet] [--fail-on-warning] [--output <file>] <old-spec> <new-spec>
       apidiff --version

Compare two OpenAPI 3.0 YAML or JSON files.
--json prints the classified report, INVALID_SPEC, or IO_ERROR as JSON.
--quiet prints only the summary line.
--output <file> writes the classified report JSON to a file.
--fail-on-warning exits 1 on warnings as well as breaking changes.
--version prints the CLI version.
Exits 1 if any change is breaking (or a warning, with --fail-on-warning), 2 on usage or invalid specs.
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

  lines.push(summaryLine(summary));
  lines.push("");

  for (const change of report.changes) {
    lines.push(...formatChange(change), "");
  }

  return `${lines.join("\n")}\n`;
}

export function formatQuietReport(report: Report): string {
  if (report.summary.total === 0) {
    return "No contract changes.\n";
  }
  return `${summaryLine(report.summary)}\n`;
}

export function formatValidationError(error: ValidationError): string {
  const details = error.details
    .map((issue) => (issue.pointer ? `  - ${issue.message} (${issue.pointer})` : `  - ${issue.message}`))
    .join("\n");
  return `Invalid ${error.target} spec:\n${details}\n`;
}

export function formatValidationErrorJson(error: ValidationError): string {
  return `${JSON.stringify(error, null, 2)}\n`;
}

export function formatIoError(target: "old" | "new", path: string, reason: string): string {
  return `Cannot read ${target} spec ${path}: ${reason}\n`;
}

export function formatIoErrorJson(target: "old" | "new", path: string, reason: string): string {
  return `${JSON.stringify({ error: "IO_ERROR", target, path, message: reason }, null, 2)}\n`;
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

function summaryLine(summary: Report["summary"]): string {
  return `${summary.total} ${plural(summary.total, "change")}: ${summary.breaking} breaking, ${summary.nonBreaking} non-breaking, ${summary.warnings} ${plural(summary.warnings, "warning")}`;
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
