import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CONTEXT_PRESSURE_WARNING, CONTEXT_PRESSURE_NEAR_LIMIT } from "@/stores/zakiSessionUiStore";
import type {
  NullalisApprovalRequest,
  NullalisTaskItem,
  NullalisTaskStatus,
} from "./BotStatusRail";

function taskStatusCopy(status: NullalisTaskStatus) {
  if (status === "succeeded") return "done";
  return status;
}

function taskStatusIcon(status: NullalisTaskStatus) {
  if (status === "done" || status === "succeeded") {
    return <CheckCircle2 className="size-3.5 text-zaki-accent" />;
  }
  if (status === "running") {
    return <Loader2 className="size-3.5 animate-spin text-zaki-brand" />;
  }
  if (status === "failed" || status === "blocked" || status === "cancelled") {
    return <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-300" />;
  }
  return <Circle className="size-3.5 text-zaki-muted dark:text-zaki-dark-muted" />;
}

export function TaskChecklist({ tasks }: { tasks: NullalisTaskItem[] }) {
  const [open, setOpen] = useState(() => tasks.some((t) => t.status === "running"));
  if (!tasks.length) return null;

  const sortedTasks = [...tasks].sort((a, b) => a.updatedAt - b.updatedAt);

  return (
    <details
      className="mt-2 max-w-[88%] rounded-zaki-xl border border-zaki bg-zaki-raised p-3 text-xs shadow-sm dark:border-[rgba(240,236,230,0.08)] dark:bg-[#141210]"
      open={open}
      onToggle={(event) =>
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <summary
        className="cursor-pointer select-none text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary"
        aria-expanded={open}
        aria-label={`Task plan, ${sortedTasks.length} ${sortedTasks.length === 1 ? "task" : "tasks"}`}
      >
        Task Plan
      </summary>
      <ul className="mt-2 space-y-2 list-none p-0">
        {sortedTasks.map((task) => (
          <li
            key={task.taskId}
            className="flex items-center gap-2 text-zaki-secondary dark:text-zaki-dark-subtle"
          >
            <span aria-hidden>{taskStatusIcon(task.status)}</span>
            <span className="sr-only">Status: {taskStatusCopy(task.status)}. </span>
            <span className="min-w-0 flex-1 truncate">
              {task.description || task.taskId}
            </span>
            {typeof task.progressPct === "number" && task.status === "running" ? (
              <span
                className="shrink-0 text-[11px] text-zaki-muted dark:text-zaki-dark-muted"
                aria-label={`${Math.round(task.progressPct)} percent complete`}
              >
                {Math.round(task.progressPct)}%
              </span>
            ) : null}
            <span
              aria-hidden
              className="shrink-0 rounded-full bg-zaki-elevated px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zaki-muted dark:bg-[#1a1714] dark:text-zaki-dark-muted"
            >
              {taskStatusCopy(task.status)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ApprovalRequiredCard({
  request,
  onApprove,
  onDeny,
}: {
  request: NullalisApprovalRequest | null;
  onApprove?: (requestId: string) => void | Promise<void>;
  onDeny?: (requestId: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [decided, setDecided] = useState<"approved" | "denied" | null>(null);

  const handleAction = useCallback(
    async (action: "approve" | "deny") => {
      if (!request || submitting || decided) return;
      setSubmitting(action);
      try {
        const cb = action === "approve" ? onApprove : onDeny;
        await cb?.(request.id);
        setDecided(action === "approve" ? "approved" : "denied");
      } catch {
        setSubmitting(null);
      }
    },
    [request, submitting, decided, onApprove, onDeny]
  );

  if (!request) return null;

  if (decided) {
    return (
      <div
        role="status"
        className={cn(
          "mt-2 max-w-[88%] rounded-zaki-xl border p-3 text-xs shadow-sm",
          decided === "approved"
            ? "border-zaki-accent/40 bg-zaki-accent-10 text-zaki-accent"
            : "border-zaki-brand/40 bg-zaki-brand-10 text-zaki-brand"
        )}
      >
        <div className="flex items-center gap-2">
          {decided === "approved" ? (
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          ) : (
            <ShieldAlert className="size-4 shrink-0" aria-hidden />
          )}
          <span className="font-semibold font-mono-ui">
            {request.tool} . {decided === "approved" ? t("zakiControls.approval.decidedApproved") : t("zakiControls.approval.decidedDenied")}
          </span>
        </div>
      </div>
    );
  }

  const approveLabel = t("zakiControls.approval.approveAria", { tool: request.tool });
  const denyLabel = t("zakiControls.approval.denyAria", { tool: request.tool });

  return (
    <div
      role="alertdialog"
      aria-labelledby={`approval-title-${request.id}`}
      aria-describedby={`approval-reason-${request.id}`}
      className="mt-2 max-w-[88%] rounded-zaki-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/35 dark:text-amber-100"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <div id={`approval-title-${request.id}`} className="font-semibold">
            {t("zakiControls.approval.title", { tool: request.tool })}
          </div>
          <div
            id={`approval-reason-${request.id}`}
            className="mt-1 text-amber-900/80 dark:text-amber-100/80"
          >
            {request.reason || t("zakiControls.approval.defaultReason")}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.1em] text-amber-800/70 dark:text-amber-100/70">
            {t("zakiControls.approval.riskLabel")} {request.riskLevel || "unknown"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!submitting}
              onClick={() => handleAction("approve")}
              aria-label={approveLabel}
              className={cn(
                "rounded-full border border-zaki-accent bg-zaki-accent px-3 py-1 text-[11px] font-semibold text-white transition-colors",
                "hover:bg-zaki-accent-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-accent focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-offset-amber-950",
                submitting === "approve" && "opacity-70"
              )}
            >
              {submitting === "approve" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> {t("zakiControls.approval.approvingState")}
                </span>
              ) : (
                t("zakiControls.approval.approveBtn")
              )}
            </button>
            <button
              type="button"
              disabled={!!submitting}
              onClick={() => handleAction("deny")}
              aria-label={denyLabel}
              className={cn(
                "rounded-full border border-zaki-brand bg-zaki-brand px-3 py-1 text-[11px] font-semibold text-white transition-colors",
                "hover:bg-zaki-brand-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-offset-amber-950",
                submitting === "deny" && "opacity-70"
              )}
            >
              {submitting === "deny" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> {t("zakiControls.approval.denyingState")}
                </span>
              ) : (
                t("zakiControls.approval.denyBtn")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export type ContextGaugeData = {
  tokenCount: number;
  contextMax: number;
  messageCount?: number;
};

export function ContextGauge({
  data,
  compact = false,
}: {
  data: ContextGaugeData | null;
  compact?: boolean;
}) {
  if (!data || !data.contextMax || data.contextMax <= 0) return null;

  const pct = Math.min(100, Math.max(0, (data.tokenCount / data.contextMax) * 100));
  const pctLabel = pct.toFixed(0);
  const tokenLabel = new Intl.NumberFormat("en-US").format(data.tokenCount);
  const maxLabel = new Intl.NumberFormat("en-US").format(data.contextMax);
  const ariaLabel = `Context window ${tokenLabel} of ${maxLabel} tokens, ${pctLabel} percent used`;

  const barColor =
    pct >= CONTEXT_PRESSURE_NEAR_LIMIT
      ? "bg-zaki-brand"
      : pct >= CONTEXT_PRESSURE_WARNING
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-zaki-accent";

  const textColor =
    pct >= CONTEXT_PRESSURE_NEAR_LIMIT
      ? "text-zaki-brand"
      : pct >= CONTEXT_PRESSURE_WARNING
        ? "text-amber-700 dark:text-amber-300"
        : "text-zaki-muted dark:text-zaki-dark-muted";

  const trackColor = "bg-zaki-elevated dark:bg-[#1a1714]";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono-ui text-[11px]">
        <div
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn("h-1 w-12 rounded-full", trackColor)}
        >
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={textColor}>{pctLabel}%</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 max-w-[88%] text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-zaki-muted dark:text-zaki-dark-muted">Context</span>
        <span className={cn("font-mono-ui", textColor)}>
          {tokenLabel} / {maxLabel} ({pctLabel}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("h-1.5 w-full rounded-full", trackColor)}
      >
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {typeof data.messageCount === "number" && (
        <div className="mt-0.5 text-zaki-muted dark:text-zaki-dark-muted">
          {data.messageCount} message{data.messageCount !== 1 ? "s" : ""} in session
        </div>
      )}
    </div>
  );
}
