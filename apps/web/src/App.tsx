import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { compareSpecs } from "./api";
import { EXAMPLE_NEW, EXAMPLE_OLD } from "./examples";
import type { ChangeAction, ClassifiedChange, CompareError, Report, Severity } from "./types";

type Filter = "all" | "breaking" | "non-breaking" | "warning" | "added" | "removed" | "modified";

const FILTERS: Filter[] = [
  "all",
  "breaking",
  "non-breaking",
  "warning",
  "added",
  "removed",
  "modified"
];

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

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              Developer tool
            </p>
            <h1 className="text-xl font-semibold">API Diff</h1>
            <p className="text-sm text-zinc-400">
              OpenAPI 3.0 contract compatibility — not a source-code reviewer.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadExample}
              className="border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Load example
            </button>
            <button
              type="button"
              onClick={() => void runCompare(oldSpec, newSpec)}
              disabled={loading || !oldSpec.trim() || !newSpec.trim()}
              title="⌘/Ctrl + Enter"
              className="bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {loading ? "Comparing…" : "Compare"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-2">
          <SpecPanel
            label="Old specification"
            value={oldSpec}
            onChange={setOldSpec}
            onUpload={(file) => onUpload("old", file)}
            textareaRef={oldRef}
            highlight={typeof error !== "string" && error?.target === "old"}
          />
          <SpecPanel
            label="New specification"
            value={newSpec}
            onChange={setNewSpec}
            onUpload={(file) => onUpload("new", file)}
            textareaRef={newRef}
            highlight={typeof error !== "string" && error?.target === "new"}
          />
        </section>

        {error ? <ErrorBanner error={error} /> : null}

        {!report && !error && !loading ? (
          <p className="border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Paste or upload two OpenAPI 3.0 files, or load the example. Compare with the button or
            ⌘/Ctrl + Enter.
          </p>
        ) : null}

        {report ? (
          <ReportView
            report={report}
            filter={filter}
            onFilter={setFilter}
            filtered={filtered}
            selected={selected}
            onSelect={onSelectChange}
          />
        ) : null}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 text-xs text-zinc-600">
        Contract only. OpenAPI 3.0.x. Internal <span className="font-mono">$ref</span> only.
        Composed schemas (<span className="font-mono">allOf</span> / <span className="font-mono">oneOf</span> /{" "}
        <span className="font-mono">anyOf</span>) are flagged, not fully merged.
      </footer>
    </div>
  );
}

function SpecPanel(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File | undefined) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
  highlight?: boolean;
}) {
  return (
    <div className={`border ${props.highlight ? "border-red-700" : "border-zinc-800"} bg-zinc-900/40`}>
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <h2 className="text-sm font-medium">{props.label}</h2>
        <label className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">
          Upload YAML/JSON
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
        className="h-72 w-full resize-y bg-transparent p-3 font-mono text-xs leading-5 text-zinc-200 outline-none"
      />
    </div>
  );
}

function ErrorBanner(props: { error: CompareError | string }) {
  if (typeof props.error === "string") {
    return (
      <div role="alert" className="border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
        {props.error}
      </div>
    );
  }

  const title =
    props.error.error === "INVALID_SPEC"
      ? `Invalid ${props.error.target ?? "specification"}`
      : "Invalid request";

  return (
    <div role="alert" className="border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
      <p className="font-medium">{title}</p>
      {props.error.message ? <p>{props.error.message}</p> : null}
      {props.error.details?.map((detail) => (
        <p key={`${detail.pointer ?? ""}-${detail.message}`} className="font-mono text-xs text-red-300">
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
}) {
  const { report } = props;

  return (
    <section className="space-y-4">
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

      <p className="text-xs text-zinc-500">
        {report.meta.oldTitle} {report.meta.oldVersion} → {report.meta.newTitle}{" "}
        {report.meta.newVersion} · {report.meta.durationMs} ms
      </p>

      {report.meta.notes.length > 0 ? (
        <ul className="border border-amber-900/60 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
          {report.meta.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => props.onFilter(item)}
            className={`px-3 py-1 text-xs uppercase tracking-wide ${
              props.filter === item
                ? "bg-zinc-100 text-zinc-950"
                : "border border-zinc-700 text-zinc-300"
            }`}
          >
            {item} {countForFilter(report, item)}
          </button>
        ))}
      </div>

      {report.summary.total === 0 ? (
        <p className="border border-zinc-800 px-4 py-6 text-sm text-zinc-400">
          No contract changes detected. The normalized operations and JSON schemas match.
        </p>
      ) : props.filtered.length === 0 ? (
        <p className="border border-zinc-800 px-4 py-6 text-sm text-zinc-400">
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
                className={`w-full border px-4 py-3 text-left ${
                  props.selected === index ? "border-zinc-400 bg-zinc-900" : "border-zinc-800"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <SeverityBadge severity={change.severity} />
                  <ActionBadge action={change.action} />
                  {change.location.method ? (
                    <span className="font-mono text-zinc-300">{change.location.method}</span>
                  ) : null}
                  {change.location.path ? (
                    <span className="font-mono text-zinc-400">{change.location.path}</span>
                  ) : null}
                  <span className="font-mono text-zinc-600">{change.ruleId}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{change.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{change.explanation}</p>
                {change.oldValue !== undefined || change.newValue !== undefined ? (
                  <p className="mt-2 font-mono text-xs text-zinc-500">
                    {formatValue(change.oldValue)} → {formatValue(change.newValue)}
                  </p>
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
      className={`border px-3 py-2 text-left ${props.active ? "border-zinc-400 bg-zinc-900" : "border-zinc-800"}`}
    >
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{props.label}</p>
      <p className={`text-lg font-medium ${color}`}>{props.value}</p>
    </button>
  );
}

function SeverityBadge(props: { severity: Severity }) {
  const className =
    props.severity === "breaking"
      ? "bg-red-950 text-red-300"
      : props.severity === "warning"
        ? "bg-amber-950 text-amber-300"
        : "bg-emerald-950 text-emerald-300";
  return <span className={`px-1.5 py-0.5 text-[10px] uppercase ${className}`}>{props.severity}</span>;
}

function ActionBadge(props: { action: ChangeAction }) {
  return (
    <span className="border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
      {props.action}
    </span>
  );
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

function countForFilter(report: Report, filter: Filter): number {
  if (filter === "all") {
    return report.summary.total;
  }
  if (filter === "breaking") {
    return report.summary.breaking;
  }
  if (filter === "non-breaking") {
    return report.summary.nonBreaking;
  }
  if (filter === "warning") {
    return report.summary.warnings;
  }
  if (filter === "added") {
    return report.summary.added;
  }
  if (filter === "removed") {
    return report.summary.removed;
  }
  return report.summary.modified;
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
