import { readFileSync } from "node:fs";
import { compareSpecs } from "@apidiff/engine";
import { USAGE, formatReport, formatValidationError } from "./format.js";

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * CLI adapter around compareSpecs(). Does not change engine behavior.
 * 0 = no breaking changes, 1 = breaking, 2 = usage / IO / invalid spec.
 */
export function run(args: string[]): RunResult {
  const raw = args[0] === "--" ? args.slice(1) : args;
  const json = raw.includes("--json");
  const argv = raw.filter((arg) => arg !== "--json");

  if (argv.length === 1 && (argv[0] === "-h" || argv[0] === "--help")) {
    return { exitCode: 0, stdout: USAGE, stderr: "" };
  }

  if (argv.length !== 2) {
    return { exitCode: 2, stdout: "", stderr: USAGE };
  }

  const oldPath = argv[0];
  const newPath = argv[1];
  if (!oldPath || !newPath) {
    return { exitCode: 2, stdout: "", stderr: USAGE };
  }

  const oldText = readSpecFile(oldPath, "old");
  if (!oldText.ok) {
    return oldText.result;
  }

  const newText = readSpecFile(newPath, "new");
  if (!newText.ok) {
    return newText.result;
  }

  const compared = compareSpecs(oldText.text, newText.text);
  if (!compared.ok) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: formatValidationError(compared.error)
    };
  }

  return {
    exitCode: compared.report.summary.breaking > 0 ? 1 : 0,
    stdout: json
      ? `${JSON.stringify(compared.report, null, 2)}\n`
      : formatReport(compared.report, oldPath, newPath),
    stderr: ""
  };
}

function readSpecFile(
  path: string,
  target: "old" | "new"
): { ok: true; text: string } | { ok: false; result: RunResult } {
  try {
    return { ok: true, text: readFileSync(path, "utf8") };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      result: {
        exitCode: 2,
        stdout: "",
        stderr: `Cannot read ${target} spec ${path}: ${reason}\n`
      }
    };
  }
}
