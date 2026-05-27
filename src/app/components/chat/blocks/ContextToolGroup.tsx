import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "./TextShimmer";
import { CompactToolRow, type CompactToolRowProps } from "./CompactToolRow";

export type ContextGroupChild = CompactToolRowProps & { id: string };

export type ContextToolGroupProps = {
  children: ContextGroupChild[];
  isStreaming?: boolean;
  defaultOpen?: boolean;
};

const READ_LIKE = new Set([
  "file_read",
  "read",
  "grep",
  "glob",
  "list",
  "search",
  "web_search",
  "web_fetch",
  "browser",
  "context_snapshot",
  "transcript_read",
  "memory_list",
  "memory_recall",
  "memory_timeline",
  "task_list",
  "task_get",
  "cron_list",
  "cron_runs",
  "runtime_info",
]);

export function isContextGroupTool(tool: string): boolean {
  return READ_LIKE.has(tool.toLowerCase());
}

function countKind(children: ContextGroupChild[]) {
  let reads = 0;
  let searches = 0;
  let fetches = 0;
  let memory = 0;
  let tasks = 0;
  for (const c of children) {
    const n = c.tool.toLowerCase();
    if (n === "file_read" || n === "read" || n === "transcript_read" || n === "context_snapshot") reads += 1;
    else if (n === "grep" || n === "glob" || n === "list" || n === "search" || n === "web_search") searches += 1;
    else if (n === "web_fetch" || n === "browser" || n === "http_request") fetches += 1;
    else if (n.startsWith("memory_")) memory += 1;
    else if (n.startsWith("task_") || n === "cron_list" || n === "cron_runs") tasks += 1;
    else reads += 1;
  }
  return { reads, searches, fetches, memory, tasks };
}

function summary(children: ContextGroupChild[], running: boolean): string {
  const { reads, searches, fetches, memory, tasks } = countKind(children);
  const parts: string[] = [];
  if (reads > 0) parts.push(`${reads} ${reads === 1 ? "read" : "reads"}`);
  if (searches > 0) parts.push(`${searches} ${searches === 1 ? "search" : "searches"}`);
  if (fetches > 0) parts.push(`${fetches} ${fetches === 1 ? "fetch" : "fetches"}`);
  if (memory > 0) parts.push(`${memory} memory`);
  if (tasks > 0) parts.push(`${tasks} ${tasks === 1 ? "task" : "tasks"}`);
  const body = parts.join(", ") || `${children.length} items`;
  return `${running ? "Exploring" : "Explored"} ${body}`;
}

export function ContextToolGroup({
  children,
  isStreaming = false,
  defaultOpen = false,
}: ContextToolGroupProps) {
  const anyRunning = useMemo(
    () => children.some((c) => c.status === "running"),
    [children]
  );
  const anyFailed = useMemo(
    () => children.some((c) => c.status === "failed"),
    [children]
  );
  const running = isStreaming && anyRunning;
  const [open, setOpen] = useState(defaultOpen || anyFailed);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [running]);

  const startedAt = useMemo(() => {
    if (children.length === 0) return null;
    return children.reduce(
      (min, c) => (c.startedAt < min ? c.startedAt : min),
      children[0]!.startedAt
    );
  }, [children]);
  const endedAt = useMemo(() => {
    let max: number | null = null;
    for (const c of children) {
      const end = c.endedAt ?? (c.durationMs != null ? c.startedAt + c.durationMs : null);
      if (end != null && (max == null || end > max)) max = end;
    }
    return max;
  }, [children]);
  const durationMs =
    running && startedAt != null
      ? Math.max(0, now - startedAt)
      : startedAt != null && endedAt != null
        ? Math.max(0, endedAt - startedAt)
        : null;
  const formatMs = (ms: number) => {
    if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
    const secs = ms / 1000;
    if (secs < 60) return `${secs.toFixed(secs < 10 ? 1 : 0)}s`;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  const title = summary(children, running);

  return (
    <div className={cn("zaki-cot-group flex flex-col", running && "is-running")}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="zaki-cot-group__head flex w-full items-center gap-2 py-1 text-left text-[14px] leading-6"
        aria-expanded={open}
      >
        {running ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-zaki-muted dark:text-zaki-dark-muted" />
        ) : (
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-zaki-muted dark:bg-zaki-dark-muted" aria-hidden />
        )}
        {running ? (
          <TextShimmer text={title} />
        ) : (
          <span className="text-zaki-muted dark:text-zaki-dark-muted">{title}</span>
        )}
        {durationMs != null && !running ? (
          <span className="shrink-0 font-mono-ui text-[12px] text-zaki-muted dark:text-zaki-dark-muted">
            for {formatMs(durationMs)}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-3 shrink-0 text-zaki-muted transition-transform dark:text-zaki-dark-muted",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="pl-5">
          {children.map((child) => (
            <CompactToolRow key={child.id} {...child} isStreaming={isStreaming} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
