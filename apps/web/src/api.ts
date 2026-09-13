import type { CompareError, Report } from "./types";

export async function compareSpecs(
  oldSpec: string,
  newSpec: string
): Promise<{ ok: true; report: Report } | { ok: false; error: CompareError }> {
  const response = await fetch("/api/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldSpec, newSpec })
  });

  const body = (await response.json()) as Report | CompareError;

  if (!response.ok) {
    return { ok: false, error: body as CompareError };
  }

  return { ok: true, report: body as Report };
}
