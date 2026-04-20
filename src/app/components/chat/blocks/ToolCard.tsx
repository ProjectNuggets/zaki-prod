import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolResultBody } from "./ToolResultBody";

export type ToolBlockStatus = "running" | "done" | "failed" | "queued" | "blocked";

export type ToolBlockProps = {
  tool: string;
  label?: string | null;
  status: ToolBlockStatus;
  startedAt: number;
  endedAt?: number | null;
  durationMs?: number | null;
  command?: string | null;
  files?: string[];
  inputPreview?: string | null;
  input?: string | null;
  output?: string | null;
  outputTruncated?: boolean;
  resultSummary?: string | null;
  exitCode?: number | null;
  isStreaming?: boolean;
  defaultOpen?: boolean;
};

function toolIcon(tool: string) {
  const name = tool.trim().toLowerCase();
  if (
    name === "bash" ||
    name === "shell" ||
    name === "powershell" ||
    name.startsWith("git ") ||
    name === "git" ||
    name === "test"
  ) {
    return Terminal;
  }
  if (
    name === "file_read" ||
    name === "read" ||
    name === "file_write" ||
    name === "write" ||
    name === "file_edit" ||
    name === "edit"
  ) {
    return FileText;
  }
  if (
    name === "grep" ||
    name === "search" ||
    name === "glob" ||
    name === "list" ||
    name === "web_search"
  ) {
    return Search;
  }
  return Wrench;
}

function statusIcon(status: ToolBlockStatus) {
  if (status === "running") return <Loader2 className="size-3.5 animate-spin" />;
  if (status === "done") return <CheckCircle2 className="size-3.5" />;
  if (status === "failed") return <AlertTriangle className="size-3.5" />;
  if (status === "blocked") return <AlertTriangle className="size-3.5" />;
  return <Clock3 className="size-3.5" />;
}

function statusBadgeClass(status: ToolBlockStatus) {
  if (status === "running") return "bg-zaki-brand-10 text-zaki-brand";
  if (status === "done") return "bg-zaki-accent-10 text-zaki-accent";
  if (status === "failed") return "bg-zaki-brand-10 text-zaki-brand";
  if (status === "blocked") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-zaki-elevated text-zaki-muted dark:bg-[#1a1714] dark:text-zaki-dark-muted";
}

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(secs < 10 ? 1 : 0)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s}s`;
}

export function ToolCard({
  tool,
  label,
  status,
  startedAt,
  endedAt,
  durationMs,
  command,
  files,
  inputPreview,
  input,
  output,
  outputTruncated,
  resultSummary,
  exitCode,
  isStreaming = false,
  defaultOpen = false,
}: ToolBlockProps) {
  const [open, setOpen] = useState(defaultOpen || status === "failed");
  const [now, setNow] = useState(() => Date.now());
  const active = isStreaming && status === "running";

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [active]);

  const elapsed =
    status === "running"
      ? Math.max(0, now - startedAt)
      : typeof durationMs === "number"
        ? durationMs
        : typeof endedAt === "number"
          ? Math.max(0, endedAt - startedAt)
          : null;
  const elapsedLabel = elapsed != null ? formatMs(elapsed) : null;
  const Icon = toolIcon(tool);
  const headerLabel = label || tool;

  const hintParts: string[] = [];
  if (command) hintParts.push(command);
  else if (files && files.length > 0) hintParts.push(files.slice(0, 3).join(", "));
  else if (inputPreview) hintParts.push(inputPreview);
  const hint = hintParts.filter(Boolean).join(" ").slice(0, 160);

  const hasBody = Boolean(
    command || (files && files.length > 0) || inputPreview || input || output || resultSummary
  );

  return (
    <div
      className={cn(
        "rounded-zaki-xl border bg-zaki-raised transition-colors dark:bg-[#141210]",
        status === "failed"
          ? "border-zaki-brand/30"
          : "border-zaki dark:border-[rgba(240,236,230,0.08)]",
        active && "shadow-[0_0_0_1px_var(--zaki-brand-10)]"
      )}
    >
      <button
        type="button"
        onClick={() => hasBody && setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-zaki-xl px-3 py-2 text-left",
          hasBody ? "cursor-pointer" : "cursor-default"
        )}
        aria-expanded={open}
      >
        <span
          className={cn(
            "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
            statusBadgeClass(status)
          )}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono-ui text-[13px] font-medium text-zaki-primary dark:text-zaki-dark-primary">
              {headerLabel}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em]",
                statusBadgeClass(status)
              )}
            >
              {statusIcon(status)}
              <span>{status}</span>
            </span>
            {elapsedLabel ? (
              <span className="font-mono-ui text-[11px] text-zaki-muted dark:text-zaki-dark-muted">
                {elapsedLabel}
              </span>
            ) : null}
            {hasBody ? (
              <ChevronDown
                className={cn(
                  "ml-auto size-3 shrink-0 text-zaki-muted transition-transform dark:text-zaki-dark-muted",
                  open && "rotate-180"
                )}
                aria-hidden
              />
            ) : null}
          </div>
          {hint ? (
            <div className="mt-0.5 truncate font-mono-ui text-[12px] leading-5 text-zaki-muted dark:text-zaki-dark-muted">
              {hint}
            </div>
          ) : null}
        </div>
      </button>
      {open && hasBody ? (
        <div className="px-3 pb-2.5">
          <ToolResultBody
            tool={tool}
            input={input}
            inputPreview={inputPreview}
            command={command}
            files={files}
            output={output}
            outputTruncated={outputTruncated}
            resultSummary={resultSummary}
            exitCode={exitCode}
            status={status}
          />
        </div>
      ) : null}
    </div>
  );
}
