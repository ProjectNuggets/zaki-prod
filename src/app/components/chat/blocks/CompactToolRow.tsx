import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  FilePen,
  Globe,
  Hammer,
  Image as ImageIcon,
  Loader2,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TextShimmer } from "./TextShimmer";
import { ToolResultBody } from "./ToolResultBody";
import { displaySafeRuntimePreview } from "../rendering/agentReplyPresentation";

export type ToolRowStatus = "running" | "done" | "failed" | "queued" | "blocked";

export type CompactToolRowProps = {
  tool: string;
  label?: string | null;
  status: ToolRowStatus;
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
  hint?: string | null;
};

const READ_VERB = (tool: string, running: boolean) => {
  switch (tool) {
    case "file_read":
    case "read":
      return running ? "Reading" : "Read";
    case "grep":
    case "search":
      return running ? "Searching" : "Searched";
    case "glob":
    case "list":
      return running ? "Listing" : "Listed";
    case "web_search":
      return running ? "Searching web" : "Searched web";
    case "web_fetch":
      return running ? "Fetching" : "Fetched";
    case "context_snapshot":
      return running ? "Loading context" : "Loaded context";
    case "memory_list":
    case "memory_recall":
    case "memory_timeline":
      return running ? "Recalling memory" : "Recalled memory";
    case "task_list":
    case "task_get":
      return running ? "Reading tasks" : "Read tasks";
    case "transcript_read":
      return running ? "Reading transcript" : "Read transcript";
    case "file_write":
      return running ? "Writing" : "Wrote";
    case "file_edit":
      return running ? "Editing" : "Edited";
    case "file_append":
      return running ? "Appending to" : "Appended to";
    case "shell":
    case "bash":
      return running ? "Running" : "Ran";
    case "git":
    case "git_operations":
      return running ? "Running git" : "Ran git";
    case "http_request":
      return running ? "Requesting" : "Requested";
    case "image_generate":
      return running ? "Generating image" : "Generated image";
    case "screenshot":
      return running ? "Taking screenshot" : "Took screenshot";
    case "browser":
    case "browser_open":
      return running ? "Opening browser" : "Opened browser";
    case "memory_store":
      return running ? "Saving memory" : "Saved memory";
    case "memory_edit":
      return running ? "Editing memory" : "Edited memory";
    case "memory_forget":
    case "memory_purge_topic":
      return running ? "Forgetting memory" : "Forgot memory";
    case "message":
      return running ? "Sending message" : "Sent message";
    case "pushover":
      return running ? "Notifying" : "Notified";
    default:
      return running ? `Running ${tool}` : `Ran ${tool}`;
  }
};

function toolIcon(tool: string) {
  const n = tool.toLowerCase();
  if (n === "shell" || n === "bash" || n === "git" || n === "git_operations") return Terminal;
  if (n === "file_write" || n === "file_edit" || n === "file_append") return FilePen;
  if (n === "file_read" || n === "read" || n === "transcript_read") return FileText;
  if (n === "grep" || n === "glob" || n === "list" || n === "search") return Search;
  if (n === "web_search" || n === "web_fetch" || n === "http_request" || n === "browser" || n === "browser_open")
    return Globe;
  if (n === "image_generate" || n === "screenshot") return ImageIcon;
  if (n.startsWith("memory_")) return Hammer;
  if (n.startsWith("task_") || n === "schedule" || n.startsWith("cron_")) return Clock3;
  return Wrench;
}

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  const secs = ms / 1000;
  if (secs < 60) return `${secs.toFixed(secs < 10 ? 1 : 0)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}m ${s}s`;
}

function primaryTarget(props: CompactToolRowProps): string | null {
  const label = displaySafeRuntimePreview(props.label);
  if (label) return label;
  if (props.files && props.files.length > 0) {
    const head = props.files[0]!;
    const more = props.files.length - 1;
    return more > 0 ? `${head} +${more}` : head;
  }
  const command = displaySafeRuntimePreview(props.command);
  if (command) return command;
  const inputPreview = displaySafeRuntimePreview(props.inputPreview);
  if (inputPreview) return inputPreview;
  return null;
}

export function CompactToolRow(props: CompactToolRowProps) {
  const {
    tool,
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
  } = props;

  const [open, setOpen] = useState(defaultOpen || status === "failed");
  const [now, setNow] = useState(() => Date.now());
  const running = status === "running";
  const active = isStreaming && running;

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [active]);

  const elapsed =
    running
      ? Math.max(0, now - startedAt)
      : typeof durationMs === "number"
        ? durationMs
        : typeof endedAt === "number"
          ? Math.max(0, endedAt - startedAt)
          : null;
  const elapsedLabel = elapsed != null ? formatMs(elapsed) : null;

  const verb = READ_VERB(tool, running);
  const target = primaryTarget(props);
  const Icon = toolIcon(tool);

  const hasBody = Boolean(
    command || (files && files.length > 0) || inputPreview || input || output || resultSummary
  );

  const trailing =
    status === "failed" ? (
      <AlertTriangle className="size-3.5 shrink-0 text-zaki-brand" />
    ) : status === "blocked" ? (
      <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
    ) : running ? (
      <Loader2 className="size-3.5 shrink-0 animate-spin text-zaki-muted dark:text-zaki-dark-muted" />
    ) : (
      <CheckCircle2 className="size-3.5 shrink-0 text-zaki-muted dark:text-zaki-dark-muted" />
    );

  return (
    <div className={cn("zaki-cot-tool flex flex-col", `is-${status}`)}>
      <button
        type="button"
        onClick={() => hasBody && setOpen((p) => !p)}
        className={cn(
          "zaki-cot-tool__row flex w-full items-center gap-2 py-1 text-left text-[14px] leading-6",
          hasBody ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
        aria-expanded={hasBody ? open : undefined}
      >
        <Icon className="zaki-cot-tool__icon size-3.5 shrink-0 text-zaki-muted dark:text-zaki-dark-muted" aria-hidden />
        <span className="zaki-cot-tool__verb shrink-0 text-zaki-muted dark:text-zaki-dark-muted">
          {active ? <TextShimmer text={verb} /> : verb}
        </span>
        {target ? (
          <span className="zaki-cot-tool__target truncate font-mono-ui text-zaki-primary dark:text-zaki-dark-primary">
            {target}
          </span>
        ) : null}
        {elapsedLabel && !running ? (
          <span className="zaki-cot-tool__duration shrink-0 font-mono-ui text-[12px] text-zaki-muted dark:text-zaki-dark-muted">
            for {elapsedLabel}
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
        ) : (
          <span className="ml-auto" aria-hidden>
            {trailing}
          </span>
        )}
      </button>
      {open && hasBody ? (
        <div className="pl-5">
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
