import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { hasAnsi, stripAnsi } from "@/lib/ansi";
import { AnsiText } from "./AnsiText";

type ToolFamily =
  | "shell"
  | "read"
  | "write"
  | "edit"
  | "search"
  | "list"
  | "fetch"
  | "schedule"
  | "memory"
  | "generic";

export function toolFamily(tool?: string | null): ToolFamily {
  const name = String(tool || "").trim().toLowerCase();
  if (name === "bash" || name === "shell" || name === "powershell") return "shell";
  if (name === "file_read" || name === "read") return "read";
  if (name === "file_write" || name === "write" || name === "write_file") return "write";
  if (name === "file_edit" || name === "edit") return "edit";
  if (name === "grep" || name === "search" || name === "web_search") return "search";
  if (name === "glob" || name === "list" || name === "ls") return "list";
  if (name === "web_fetch" || name === "fetch" || name === "http") return "fetch";
  if (name === "schedule" || name === "cron_create" || name === "scheduled_task") return "schedule";
  if (name === "memory_store" || name === "memory_recall" || name === "remember") return "memory";
  return "generic";
}

function tryParseJson(raw: string | null | undefined): unknown | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function tryPrettyJson(raw: string | null | undefined): string | null {
  const parsed = tryParseJson(raw);
  return parsed ? JSON.stringify(parsed, null, 2) : null;
}

function tryExtractFirstUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/https?:\/\/[^\s"'<>]+/);
  return match?.[0] ?? null;
}

const CRON_HUMAN: Array<[RegExp, string]> = [
  [/^\s*\*\s+\*\s+\*\s+\*\s+\*\s*$/, "Every minute"],
  [/^\s*0\s+\*\s+\*\s+\*\s+\*\s*$/, "Every hour"],
  [/^\s*0\s+0\s+\*\s+\*\s+\*\s*$/, "Every day at midnight"],
  [/^\s*\*\/(\d+)\s+\*\s+\*\s+\*\s+\*\s*$/, "Every $1 minutes"],
  [/^\s*0\s+\*\/(\d+)\s+\*\s+\*\s+\*\s*$/, "Every $1 hours"],
  [/^\s*0\s+0\s+\*\/(\d+)\s+\*\s+\*\s*$/, "Every $1 days"],
  [/^\s*0\s+0\s+\*\s+\*\s+0\s*$/, "Every Sunday at midnight"],
];

function humanizeCron(expression: string | null | undefined): string | null {
  if (!expression) return null;
  const trimmed = expression.trim();
  if (!trimmed || !/\s/.test(trimmed)) return null;
  for (const [pattern, template] of CRON_HUMAN) {
    const match = trimmed.match(pattern);
    if (match) return template.replace(/\$1/g, match[1] ?? "");
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length < 5) return null;
  return `Cron: ${parts.slice(0, 5).join(" ")}`;
}

function formatEpochIshTime(value: string | number | undefined | null): string | null {
  if (value == null) return null;
  let d: Date | null = null;
  if (typeof value === "number") {
    d = new Date(value > 1e12 ? value : value * 1000);
  } else {
    const num = Number(value);
    if (!Number.isNaN(num) && num > 1e9) {
      d = new Date(num > 1e12 ? num : num * 1000);
    } else {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) d = new Date(parsed);
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:text-zaki-dark-muted">
      {children}
    </div>
  );
}

function CodeBlock({
  children,
  wrap = true,
  maxHeight = "16em",
  className,
}: {
  children: React.ReactNode;
  wrap?: boolean;
  maxHeight?: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        "overflow-auto rounded-md bg-zaki-elevated px-2 py-1.5 font-mono-ui text-[12px] text-zaki-primary dark:bg-[#1a1714] dark:text-zaki-dark-primary",
        wrap && "whitespace-pre-wrap break-words",
        className
      )}
      style={{ maxHeight }}
    >
      {children}
    </pre>
  );
}

function ShellOutput({ text }: { text: string }) {
  const ansi = hasAnsi(text);
  return (
    <CodeBlock wrap={false}>
      {ansi ? <AnsiText text={text} /> : text}
    </CodeBlock>
  );
}

function FileContent({ text }: { text: string }) {
  const lines = useMemo(() => text.split(/\r?\n/), [text]);
  const gutterWidth = String(lines.length).length;
  return (
    <pre className="max-h-[20em] overflow-auto rounded-md bg-zaki-elevated font-mono-ui text-[12px] text-zaki-primary dark:bg-[#1a1714] dark:text-zaki-dark-primary">
      <div className="grid" style={{ gridTemplateColumns: `${gutterWidth + 1}ch 1fr` }}>
        {lines.map((line, idx) => (
          <div key={idx} className="contents">
            <span className="select-none pr-2 pl-2 text-right text-zaki-muted/60 dark:text-zaki-dark-muted/60">
              {idx + 1}
            </span>
            <span className="whitespace-pre pr-2">{line || " "}</span>
          </div>
        ))}
      </div>
    </pre>
  );
}

type GrepMatch = { file: string; line?: number; snippet: string };

function parseGrepMatches(text: string): GrepMatch[] {
  const matches: GrepMatch[] = [];
  const lines = text.split(/\r?\n/).slice(0, 50);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const withLine = line.match(/^([^\s:]+):(\d+):(.*)$/);
    if (withLine) {
      matches.push({
        file: withLine[1] ?? "",
        line: Number(withLine[2] ?? 0),
        snippet: withLine[3] ?? "",
      });
      continue;
    }
    const withoutLine = line.match(/^([^\s:]+):(.*)$/);
    if (withoutLine) {
      matches.push({ file: withoutLine[1] ?? "", snippet: withoutLine[2] ?? "" });
      continue;
    }
    matches.push({ file: "", snippet: line });
  }
  return matches;
}

function GrepMatches({ text }: { text: string }) {
  const matches = useMemo(() => parseGrepMatches(text), [text]);
  if (matches.length === 0) return <CodeBlock>{text}</CodeBlock>;
  return (
    <div className="max-h-[20em] overflow-auto rounded-md bg-zaki-elevated dark:bg-[#1a1714]">
      {matches.map((m, idx) => (
        <div
          key={`${m.file}:${m.line ?? idx}:${idx}`}
          className="flex items-baseline gap-2 border-b border-zaki/40 px-2 py-1 font-mono-ui text-[12px] last:border-b-0 dark:border-[rgba(240,236,230,0.06)]"
        >
          {m.file ? (
            <span className="shrink-0 text-zaki-brand">
              {m.file}
              {m.line != null ? (
                <span className="text-zaki-muted dark:text-zaki-dark-muted">:{m.line}</span>
              ) : null}
            </span>
          ) : null}
          <span className="truncate text-zaki-primary dark:text-zaki-dark-primary">
            {m.snippet}
          </span>
        </div>
      ))}
    </div>
  );
}

function UrlHeader({ url }: { url: string }) {
  return (
    <div className="mb-1 flex items-center gap-1.5 truncate rounded-md bg-zaki-elevated px-2 py-1 font-mono-ui text-[11px] text-zaki-brand dark:bg-[#1a1714]">
      <span className="text-zaki-muted dark:text-zaki-dark-muted">GET</span>
      <span className="truncate">{url}</span>
    </div>
  );
}

function ScheduleCard({
  cron,
  nextRun,
  description,
}: {
  cron?: string | null;
  nextRun?: string | number | null;
  description?: string | null;
}) {
  const human = humanizeCron(cron);
  const next = formatEpochIshTime(nextRun);
  return (
    <div className="rounded-md border border-zaki bg-zaki-elevated px-2 py-1.5 text-[12px] text-zaki-primary dark:border-[rgba(240,236,230,0.08)] dark:bg-[#1a1714] dark:text-zaki-dark-primary">
      {description ? <div className="font-medium">{description}</div> : null}
      {human ? (
        <div className="font-mono-ui text-[12px] text-zaki-secondary dark:text-zaki-dark-subtle">
          {human}
          {cron ? (
            <span className="ml-1.5 text-zaki-muted dark:text-zaki-dark-muted">({cron})</span>
          ) : null}
        </div>
      ) : cron ? (
        <div className="font-mono-ui text-[12px] text-zaki-muted dark:text-zaki-dark-muted">
          {cron}
        </div>
      ) : null}
      {next ? (
        <div className="mt-1 text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
          Next run: {next}
        </div>
      ) : null}
    </div>
  );
}

function MemoryQuote({ text }: { text: string }) {
  return (
    <blockquote className="rounded-md border-l-2 border-zaki-brand bg-zaki-elevated px-2 py-1.5 font-mono-ui text-[12px] italic text-zaki-secondary dark:bg-[#1a1714] dark:text-zaki-dark-subtle whitespace-pre-wrap break-words">
      {text}
    </blockquote>
  );
}

export function ToolResultBody({
  tool,
  input,
  inputPreview,
  command,
  files,
  output,
  outputTruncated,
  resultSummary,
  exitCode,
  status,
}: {
  tool?: string | null;
  input?: string | null;
  inputPreview?: string | null;
  command?: string | null;
  files?: string[];
  output?: string | null;
  outputTruncated?: boolean;
  resultSummary?: string | null;
  exitCode?: number | null;
  status?: "running" | "done" | "failed" | "queued" | "blocked" | null;
}) {
  const family = toolFamily(tool);
  const showInput = Boolean(command || (files && files.length) || inputPreview || input);
  const outputBody = output ?? resultSummary ?? null;
  const prettyInput = tryPrettyJson(input);
  const prettyOutput = tryPrettyJson(outputBody);

  const inputJson = tryParseJson(input);

  const renderInputArea = () => {
    if (!showInput) return null;
    if (family === "fetch") {
      const url =
        (inputJson && typeof inputJson === "object"
          ? ((inputJson as Record<string, unknown>).url as string | undefined)
          : undefined) || tryExtractFirstUrl(inputPreview || input || "");
      return (
        <div>
          <SectionLabel>Request</SectionLabel>
          {url ? <UrlHeader url={url} /> : null}
          {!url && (inputPreview || input) ? (
            <CodeBlock>{prettyInput ?? inputPreview ?? input}</CodeBlock>
          ) : null}
        </div>
      );
    }

    if (family === "schedule") {
      const obj = (inputJson ?? {}) as Record<string, unknown>;
      const cron =
        (obj.cron as string | undefined) ||
        (obj.schedule as string | undefined) ||
        (obj.expression as string | undefined) ||
        null;
      const description =
        (obj.description as string | undefined) ||
        (obj.task as string | undefined) ||
        (obj.name as string | undefined) ||
        null;
      const nextRun =
        (obj.next_run as string | number | undefined) ||
        (obj.nextRun as string | number | undefined) ||
        (obj.run_at as string | number | undefined) ||
        null;
      return (
        <div>
          <SectionLabel>Schedule</SectionLabel>
          <ScheduleCard cron={cron} nextRun={nextRun ?? null} description={description} />
        </div>
      );
    }

    if (family === "memory" && (inputPreview || input)) {
      const obj = (inputJson ?? {}) as Record<string, unknown>;
      const content =
        (obj.content as string | undefined) ||
        (obj.text as string | undefined) ||
        (obj.query as string | undefined) ||
        inputPreview ||
        input ||
        "";
      return (
        <div>
          <SectionLabel>Memory</SectionLabel>
          <MemoryQuote text={String(content)} />
        </div>
      );
    }

    return (
      <div>
        <SectionLabel>Input</SectionLabel>
        {command ? (
          <CodeBlock wrap={family !== "shell"}>{command}</CodeBlock>
        ) : null}
        {files && files.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {files.map((file) => (
              <span
                key={file}
                className="rounded-md bg-zaki-elevated px-1.5 py-0.5 font-mono-ui text-[11px] text-zaki-secondary dark:bg-[#1a1714] dark:text-zaki-dark-subtle"
              >
                {file}
              </span>
            ))}
          </div>
        ) : null}
        {!command && !files?.length && (inputPreview || input) ? (
          <CodeBlock>{prettyInput ?? inputPreview ?? input}</CodeBlock>
        ) : null}
      </div>
    );
  };

  const renderOutputArea = () => {
    if (!outputBody) return null;
    const header = (
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:text-zaki-dark-muted">
        <span>Output</span>
        {typeof exitCode === "number" && exitCode !== 0 ? (
          <span className="rounded bg-zaki-brand-10 px-1 py-0.5 text-zaki-brand">exit {exitCode}</span>
        ) : null}
        {outputTruncated ? <span className="italic">truncated</span> : null}
      </div>
    );

    if (family === "shell") {
      return (
        <div>
          {header}
          <div className={cn(status === "failed" && "rounded-md ring-1 ring-zaki-brand/40")}>
            <ShellOutput text={outputBody} />
          </div>
        </div>
      );
    }

    if (family === "read") {
      return (
        <div>
          {header}
          <FileContent text={stripAnsi(outputBody)} />
        </div>
      );
    }

    if (family === "search") {
      return (
        <div>
          {header}
          <GrepMatches text={stripAnsi(outputBody)} />
        </div>
      );
    }

    if (family === "memory") {
      return (
        <div>
          {header}
          <MemoryQuote text={stripAnsi(outputBody)} />
        </div>
      );
    }

    return (
      <div>
        {header}
        <CodeBlock className={cn(status === "failed" && "ring-1 ring-zaki-brand/40")}>
          {prettyOutput ?? stripAnsi(outputBody)}
        </CodeBlock>
      </div>
    );
  };

  const inputNode = renderInputArea();
  const outputNode = renderOutputArea();

  return (
    <div className="space-y-2 border-t border-zaki pt-2 text-[12px] leading-5 dark:border-[rgba(240,236,230,0.08)]">
      {inputNode}
      {outputNode}
      {!inputNode && !outputNode ? (
        <div className="text-[12px] italic text-zaki-muted dark:text-zaki-dark-muted">
          No input or output captured yet.
        </div>
      ) : null}
    </div>
  );
}
