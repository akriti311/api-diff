import { parse as parseYaml } from "yaml";
import type { SpecIssue } from "../types.js";
import { detectFormat, type SpecFormat } from "./detect.js";

export type ParseDocumentResult =
  | { ok: true; value: unknown; format: SpecFormat }
  | { ok: false; format: SpecFormat; details: SpecIssue[] };

export function parseDocument(text: string): ParseDocumentResult {
  if (text.trim() === "") {
    return {
      ok: false,
      format: detectFormat(text),
      details: [{ message: "Specification is empty." }]
    };
  }

  const format = detectFormat(text);

  try {
    const value = format === "json" ? JSON.parse(text) : parseYaml(text);
    return { ok: true, value, format };
  } catch (error) {
    return {
      ok: false,
      format,
      details: [{ message: formatParseMessage(format, error) }]
    };
  }
}

function formatParseMessage(format: SpecFormat, error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown parse error.";
  return format === "json"
    ? `Invalid JSON: ${raw}`
    : `Invalid YAML: ${raw}`;
}
