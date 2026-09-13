import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { compareSpecs } from "./api";
import { EXAMPLE_NEW, EXAMPLE_OLD } from "./examples";
import type { ChangeAction, ClassifiedChange, CompareError, Report, Severity } from "./types";

type Filter = "all" | "breaking" | "non-breaking" | "warning" | "added" | "removed" | "modified";

const SEVERITY_ORDER: Record<Severity, number> = {
  breaking: 0,
  warning: 1,
  "non-breaking": 2
};

export function App() {
  const [oldSpec, setOldSpec] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<CompareError | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<number | null>(null);
  const oldRef = useRef<HTMLTextAreaElement>(null);
  const newRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const requestId = useRef(0);
  const specsRef = useRef({ oldSpec: "", newSpec: "" });
  specsRef.current = { oldSpec, newSpec };

  const filtered = useMemo(() => {
    if (!report) {
      return [];
    }
    return report.changes
      .filter((change) => matchesFilter(change, filter))
      .sort((left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]);
  }, [report, filter]);

  async function runCompare(oldText: string, newText: string) {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setSelected(null);
    setFilter("all");
    try {
      const result = await compareSpecs(oldText, newText);
      if (id !== requestId.current) {
        return;
      }
      if (!result.ok) {
        setReport(null);
        setError(result.error);
        return;
      }
      setReport(result.report);
      const first = [...result.report.changes].sort(
        (left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
      )[0];
      if (first) {
        setSelected(0);
        jumpTo(oldRef.current, first.location.path);
        jumpTo(newRef.current, first.location.path);
      }
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      if (id !== requestId.current) {
        return;
      }
      setReport(null);
      setError("Could not reach the API. Start it with pnpm dev:api (http://localhost:3001).");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") {
        return;
      }
      event.preventDefault();
      const { oldSpec: oldText, newSpec: newText } = specsRef.current;
      if (!oldText.trim() || !newText.trim()) {
        return;
      }
      void runCompare(oldText, newText);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function loadExample() {
    setOldSpec(EXAMPLE_OLD);
    setNewSpec(EXAMPLE_NEW);
    void runCompare(EXAMPLE_OLD, EXAMPLE_NEW);
  }

  function swapSpecs() {
    setOldSpec(newSpec);
    setNewSpec(oldSpec);
    setReport(null);
    setError(null);
    setSelected(null);
  }

  function clearSpecs() {
    setOldSpec("");
    setNewSpec("");
    setReport(null);
    setError(null);
    setSelected(null);
    setFilter("all");
  }

  function onUpload(side: "old" | "new", file: File | undefined) {
    if (!file) {
      return;
    }
    void file.text().then((text) => {
      if (side === "old") {
        setOldSpec(text);
      } else {
        setNewSpec(text);
      }
    });
  }

  function onSelectChange(change: ClassifiedChange, index: number) {
    setSelected(index);
    jumpTo(oldRef.current, change.location.path);
    jumpTo(newRef.current, change.location.path);
  }

  const canCompare = Boolean(oldSpec.trim() && newSpec.trim());

  return (
    <div className="min-h-screen font-sans text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-sky-400/80">
              Contract compatibility
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              API <span className="text-sky-400">Diff</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Compare two OpenAPI 3.0 specs. Find what may break existing clients.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={clearSpecs} className="btn-ghost">
              Clear
            </button>
            <button type="button" onClick={loadExample} className="btn-ghost">
              Load example
            </button>
            <button
              type="button"
              onClick={() => void runCompare(oldSpec, newSpec)}
              disabled={loading || !canCompare}
              title="⌘/Ctrl + Enter"
              className="btn-primary"
            >
              {loading ? "Comparing…" : "Compare"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <section className="relative grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <SpecPanel
            label="Old spec"
            hint="What clients already use"
            value={oldSpec}
            onChange={setOldSpec}
            onUpload={(file) => onUpload("old", file)}
            textareaRef={oldRef}
            highlight={typeof error !== "string" && error?.target === "old"}
          />
          <div className="flex items-center justify-center md:flex-col">
            <button
              type="button"
              onClick={swapSpecs}
              disabled={!oldSpec && !newSpec}
              title="Swap old and new"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:border-sky-500/60 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⇄ Swap
            </button>
          </div>
          <SpecPanel
            label="New spec"
            hint="What you want to ship"
            value={newSpec}
            onChange={setNewSpec}
            onUpload={(file) => onUpload("new", file)}
            textareaRef={newRef}
            highlight={typeof error !== "string" && error?.target === "new"}
          />
        </section>

        {error ? <ErrorBanner error={error} /> : null}

        {!report && !error && !loading ? <EmptyState onExample={loadExample} /> : null}

        {report ? (
          <ReportView
            report={report}
            filter={filter}
            onFilter={setFilter}
            filtered={filtered}
            selected={selected}
            onSelect={onSelectChange}
            resultsRef={resultsRef}
          />
        ) : null}
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs leading-5 text-zinc-500">
        Contract only — OpenAPI 3.0.x, internal <span className="font-mono text-zinc-400">$ref</span>.
        Composed schemas (<span className="font-mono">allOf</span> / <span className="font-mono">oneOf</span> /{" "}
        <span className="font-mono">anyOf</span>) are flagged, not fully merged. Shortcut:{" "}
        <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
          ⌘/Ctrl + Enter
        </kbd>
      </footer>
    </div>
  );
}

function EmptyState(props: { onExample: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-900/30 px-6 py-10 text-center">
      <p className="text-sm font-medium text-zinc-200">Paste two specs, or try the example in one click</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
        The sample removes <span className="font-mono text-zinc-400">name</span> from{" "}
        <span className="font-mono text-zinc-400">GET /users/{"{id}"}</span> — a breaking response-property
        change.
      </p>
      <ol className="mx-auto mt-6 flex max-w-xl flex-col gap-2 text-left text-sm text-zinc-400 sm:flex-row sm:gap-6 sm:text-center">
        <li className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
          <span className="block text-[11px] uppercase tracking-wide text-zinc-500">1</span>
          Old and new OpenAPI
        </li>
        <li className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
          <span className="block text-[11px] uppercase tracking-wide text-zinc-500">2</span>
          Compare the contract
        </li>
        <li className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
          <span className="block text-[11px] uppercase tracking-wide text-zinc-500">3</span>
          Breaking, warning, or safe
        </li>
      </ol>
      <button type="button" onClick={props.onExample} className="btn-primary mt-6">
        Load example
      </button>
    </div>
  );
}

function SpecPanel(props: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File | undefined) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  highlight?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-zinc-900/60 ${
        props.highlight ? "border-red-500/70 ring-1 ring-red-500/30" : "border-zinc-800"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">{props.label}</h2>
          <p className="text-[11px] text-zinc-500">{props.hint}</p>
        </div>
        <label className="cursor-pointer rounded-lg border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 hover:border-zinc-500 hover:text-white">
          Upload
          <input
            type="file"
            accept=".yaml,.yml,.json,application/json,text/yaml"
            className="hidden"
            onChange={(event) => {
              props.onUpload(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <textarea
        ref={props.textareaRef}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        spellCheck={false}
        placeholder="Paste OpenAPI 3.0 YAML or JSON"
        className="h-80 w-full resize-y bg-transparent p-4 font-mono text-xs leading-5 text-zinc-200 outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}

function ErrorBanner(props: { error: CompareError | string }) {
  if (typeof props.error === "string") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100"
      >
        {props.error}
      </div>
    );
  }

  const title =
    props.error.error === "INVALID_SPEC"
      ? `Invalid ${props.error.target ?? "specification"}`
      : "Invalid request";

  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100"
    >
      <p className="font-medium">{title}</p>
      {props.error.message ? <p className="mt-1 text-red-200/90">{props.error.message}</p> : null}
      {props.error.details?.map((detail) => (
        <p key={`${detail.pointer ?? ""}-${detail.message}`} className="mt-1 font-mono text-xs text-red-300">
          {detail.pointer ? `${detail.pointer}: ` : ""}
          {detail.message}
        </p>
      ))}
    </div>
  );
}

function ReportView(props: {
  report: Report;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  filtered: ClassifiedChange[];
  selected: number | null;
  onSelect: (change: ClassifiedChange, index: number) => void;
  resultsRef: RefObject<HTMLElement>;
}) {
  const { report } = props;
  const verdict = verdictFor(report);

  return (
    <section ref={props.resultsRef} className="space-y-4 scroll-mt-24">
      <div className={`rounded-2xl border px-5 py-4 ${verdict.className}`}>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">{verdict.kicker}</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{verdict.title}</p>
        <p className="mt-1 text-sm opacity-80">
          {report.meta.oldTitle} {report.meta.oldVersion}
          <span className="mx-2 opacity-50">→</span>
          {report.meta.newTitle} {report.meta.newVersion}
          <span className="mx-2 opacity-40">·</span>
          {report.meta.durationMs} ms
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="Total" value={report.summary.total} active={props.filter === "all"} onClick={() => props.onFilter("all")} />
        <Stat label="Added" value={report.summary.added} active={props.filter === "added"} onClick={() => props.onFilter("added")} />
        <Stat label="Removed" value={report.summary.removed} active={props.filter === "removed"} onClick={() => props.onFilter("removed")} />
        <Stat label="Modified" value={report.summary.modified} active={props.filter === "modified"} onClick={() => props.onFilter("modified")} />
        <Stat
          label="Breaking"
          value={report.summary.breaking}
          tone="breaking"
          active={props.filter === "breaking"}
          onClick={() => props.onFilter("breaking")}
        />
        <Stat
          label="Non-breaking"
          value={report.summary.nonBreaking}
          tone="non-breaking"
          active={props.filter === "non-breaking"}
          onClick={() => props.onFilter("non-breaking")}
        />
        <Stat
          label="Warnings"
          value={report.summary.warnings}
          tone="warning"
          active={props.filter === "warning"}
          onClick={() => props.onFilter("warning")}
        />
      </div>

      {report.meta.notes.length > 0 ? (
        <ul className="rounded-2xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-100">
          {report.meta.notes.map((note) => (
            <li key={note} className="leading-5">
              {note}
            </li>
          ))}
        </ul>
      ) : null}

      {report.summary.total === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
          No contract changes detected. Normalized operations and JSON schemas match.
        </p>
      ) : props.filtered.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
          No changes match this filter.
        </p>
      ) : (
        <ul className="space-y-2">
          {props.filtered.map((change, index) => (
            <li key={`${change.ruleId}-${change.location.pointer}-${index}`}>
              <button
                type="button"
                title={change.location.pointer}
                onClick={() => props.onSelect(change, index)}
                className={`w-full rounded-2xl border px-4 py-3.5 text-left transition ${
                  props.selected === index
                    ? "border-sky-400/50 bg-zinc-900 shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${dotFor(change.severity)}`} />
                  <SeverityBadge severity={change.severity} />
                  <ActionBadge action={change.action} />
                  {change.location.method ? (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">
                      {change.location.method}
                    </span>
                  ) : null}
                  {change.location.path ? (
                    <span className="font-mono text-zinc-400">{change.location.path}</span>
                  ) : null}
                  <span className="ml-auto font-mono text-[11px] text-zinc-600">{change.ruleId}</span>
                </div>
                <p className="mt-2.5 text-sm font-medium text-zinc-50">{change.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-400">{change.explanation}</p>
                {change.oldValue !== undefined || change.newValue !== undefined ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="rounded-md bg-red-950/60 px-2 py-1 text-red-200">
                      {formatValue(change.oldValue)}
                    </span>
                    <span className="text-zinc-600">→</span>
                    <span className="rounded-md bg-emerald-950/60 px-2 py-1 text-emerald-200">
                      {formatValue(change.newValue)}
                    </span>
                  </div>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat(props: {
  label: string;
  value: number;
  tone?: Severity;
  active?: boolean;
  onClick: () => void;
}) {
  const color =
    props.tone === "breaking"
      ? "text-red-400"
      : props.tone === "warning"
        ? "text-amber-400"
        : props.tone === "non-breaking"
          ? "text-emerald-400"
          : "text-zinc-100";
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        props.active ? "border-sky-400/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-600"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{props.label}</p>
      <p className={`text-lg font-semibold tabular-nums ${color}`}>{props.value}</p>
    </button>
  );
}

function SeverityBadge(props: { severity: Severity }) {
  const className =
    props.severity === "breaking"
      ? "bg-red-500/15 text-red-300"
      : props.severity === "warning"
        ? "bg-amber-500/15 text-amber-200"
        : "bg-emerald-500/15 text-emerald-300";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${className}`}>
      {props.severity}
    </span>
  );
}

function ActionBadge(props: { action: ChangeAction }) {
  return (
    <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
      {props.action}
    </span>
  );
}

function verdictFor(report: Report): { kicker: string; title: string; className: string } {
  if (report.summary.breaking > 0) {
    return {
      kicker: "Breaking",
      title: `${report.summary.breaking} breaking ${plural(report.summary.breaking, "change")} — existing clients may fail`,
      className: "border-red-500/35 bg-red-950/35 text-red-50"
    };
  }
  if (report.summary.warnings > 0) {
    return {
      kicker: "Needs review",
      title: `${report.summary.warnings} ${plural(report.summary.warnings, "warning")} — a human should check these`,
      className: "border-amber-500/35 bg-amber-950/30 text-amber-50"
    };
  }
  if (report.summary.total === 0) {
    return {
      kicker: "Compatible",
      title: "No contract changes detected",
      className: "border-emerald-500/25 bg-emerald-950/25 text-emerald-50"
    };
  }
  return {
    kicker: "Compatible",
    title: "Only non-breaking changes — existing clients should keep working",
    className: "border-emerald-500/25 bg-emerald-950/25 text-emerald-50"
  };
}

function matchesFilter(change: ClassifiedChange, filter: Filter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "breaking" || filter === "non-breaking" || filter === "warning") {
    return change.severity === filter;
  }
  return change.action === filter;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "—";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function jumpTo(textarea: HTMLTextAreaElement | null, path: string | undefined) {
  if (!textarea || !path) {
    return;
  }
  const index = textarea.value.indexOf(path);
  if (index < 0) {
    return;
  }
  textarea.focus();
  textarea.setSelectionRange(index, index + path.length);
}

function dotFor(severity: Severity): string {
  if (severity === "breaking") {
    return "bg-red-400";
  }
  if (severity === "warning") {
    return "bg-amber-400";
  }
  return "bg-emerald-400";
}

function plural(count: number, noun: string): string {
  return count === 1 ? noun : `${noun}s`;
}
