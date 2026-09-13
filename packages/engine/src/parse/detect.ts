export type SpecFormat = "json" | "yaml";

/**
 * JSON objects/arrays start with { or [.
 * Everything else is treated as YAML (including empty text, which fails later).
 */
export function detectFormat(text: string): SpecFormat {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return "json";
  }
  return "yaml";
}
