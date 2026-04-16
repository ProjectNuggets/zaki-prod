type ToolResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type BotToolCall = {
  id: string;
  requestId?: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: ToolResult;
  timestamp: number;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
};

interface BotToolCallBlockProps {
  toolCall: BotToolCall;
}

export function BotToolCallBlock({ toolCall }: BotToolCallBlockProps) {
  const status = toolCall.result
    ? toolCall.result.ok
      ? "ok"
      : "fail"
    : "pending";

  const durationMs =
    typeof toolCall.durationMs === "number"
      ? toolCall.durationMs
      : typeof toolCall.finishedAt === "number"
        ? Math.max(0, toolCall.finishedAt - toolCall.startedAt)
        : null;

  const durationLabel =
    durationMs == null
      ? ""
      : durationMs >= 1000
        ? `${(durationMs / 1000).toFixed(1)}s`
        : `${durationMs}ms`;

  const requestLabel =
    typeof toolCall.requestId === "string" && toolCall.requestId.trim()
      ? toolCall.requestId.slice(0, 16)
      : null;

  const statusDotClass =
    status === "ok"
      ? "bg-zaki-accent"
      : status === "fail"
        ? "bg-zaki-brand"
        : "bg-amber-500 animate-pulse";

  return (
    <details
      className="max-w-[80%] rounded-zaki-xl border border-zaki bg-zaki-raised px-3 py-2 text-xs shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]"
      open={status === "pending"}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-zaki-secondary">
        <span
          className={["inline-block size-2 shrink-0 rounded-full", statusDotClass].join(" ")}
          aria-hidden
        />
        <span className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-zaki-muted">tool</span>
        <span className="font-semibold text-zaki-primary font-mono-ui">{toolCall.name}</span>
        {requestLabel ? (
          <span className="rounded-full border border-zaki px-1.5 py-0.5 font-mono-ui text-[10px] text-zaki-muted">
            {requestLabel}
          </span>
        ) : null}
        {durationLabel ? (
          <span className="rounded-full border border-zaki px-1.5 py-0.5 font-mono-ui text-[10px] text-zaki-muted">
            {durationLabel}
          </span>
        ) : null}
        <span
          className={
            status === "ok"
              ? "ml-auto rounded-full bg-zaki-accent-10 px-2 py-0.5 text-[10px] font-semibold text-zaki-accent"
              : status === "fail"
                ? "ml-auto rounded-full bg-zaki-brand-10 px-2 py-0.5 text-[10px] font-semibold text-zaki-brand"
                : "ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          }
        >
          {status === "ok" ? "OK" : status === "fail" ? "FAIL" : "RUNNING"}
        </span>
      </summary>
      <div className="mt-2 space-y-2 rounded-zaki-lg border border-zaki bg-zaki-elevated p-2 dark:border-[rgba(240,236,230,0.08)] dark:bg-[#1a1714]">
        <div>
          <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-zaki-muted">Arguments</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono-ui text-[11px] text-zaki-secondary">
            {JSON.stringify(toolCall.arguments, null, 2)}
          </pre>
        </div>
        {toolCall.result ? (
          <div>
            <div className="mb-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-zaki-muted">Result</div>
            {toolCall.result.error ? (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono-ui text-[11px] text-zaki-brand">
                {toolCall.result.error}
              </pre>
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono-ui text-[11px] text-zaki-secondary">
                {JSON.stringify(toolCall.result.result ?? {}, null, 2)}
              </pre>
            )}
          </div>
        ) : null}
      </div>
    </details>
  );
}
