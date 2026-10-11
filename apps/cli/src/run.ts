import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareSpecs } from "@apidiff/engine";
import {
  USAGE,
  formatIoError,
  formatIoErrorJson,
  formatQuietReport,
  formatReport,
  formatValidationError,
  formatValidationErrorJson
} from "./format.js";

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const FLAGS = new Set(["--json", "--quiet", "--fail-on-warning"]);

export const CLI_VERSION = (
  JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8")
  ) as { version: string }
).version;

/**
 * CLI adapter around compareSpecs(). Does not change engine behavior.
 * 0 = no breaking changes, 1 = breaking (or warning with --fail-on-warning),
 * 2 = usage / IO / invalid spec.
 */
export function run(args: string[]): RunResult {
  const raw = args[0] === "--" ? args.slice(1) : args;
  const output = takeOption(raw, "--output");
  if (output.missing) {
    return { exitCode: 2, stdout: "", stderr: USAGE };
  }

  const json = output.rest.includes("--json");
  const quiet = output.rest.includes("--quiet");
  const failOnWarning = output.rest.includes("--fail-on-warning");
  const argv = output.rest.filter((arg) => !FLAGS.has(arg));

  if (argv.includes("--version") || argv.includes("-v")) {
    return { exitCode: 0, stdout: `${CLI_VERSION}\n`, stderr: "" };
  }

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

  const oldText = readSpecFile(oldPath, "old", json);
  if (!oldText.ok) {
    return oldText.result;
  }

  const newText = readSpecFile(newPath, "new", json);
  if (!newText.ok) {
    return newText.result;
  }

  const compared = compareSpecs(oldText.text, newText.text);
  if (!compared.ok) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: json ? formatValidationErrorJson(compared.error) : formatValidationError(compared.error)
    };
  }

  const { breaking, warnings } = compared.report.summary;
  const failed = breaking > 0 || (failOnWarning && warnings > 0);
  const reportJson = `${JSON.stringify(compared.report, null, 2)}\n`;

  if (output.value) {
    try {
      writeFileSync(output.value, reportJson, "utf8");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 2,
        stdout: "",
        stderr: `Cannot write report ${output.value}: ${reason}\n`
      };
    }
  }

  return {
    exitCode: failed ? 1 : 0,
    stdout: json
      ? reportJson
      : quiet
        ? formatQuietReport(compared.report)
        : formatReport(compared.report, oldPath, newPath),
    stderr: ""
  };
}

function takeOption(
  args: string[],
  name: string
): { value: string | undefined; rest: string[]; missing: boolean } {
  const rest: string[] = [];
  let value: string | undefined;
  let missing = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== name) {
      if (arg) {
        rest.push(arg);
      }
      continue;
    }

    const next = args[index + 1];
    if (!next || next.startsWith("-")) {
      missing = true;
      continue;
    }

    value = next;
    index += 1;
  }

  return { value, rest, missing };
}

function readSpecFile(
  path: string,
  target: "old" | "new",
  json: boolean
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
        stderr: json ? formatIoErrorJson(target, path, reason) : formatIoError(target, path, reason)
      }
    };
  }
}
