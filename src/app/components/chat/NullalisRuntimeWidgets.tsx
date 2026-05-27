import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  PencilLine,
  ShieldAlert,
  TimerReset,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type {
  NullalisApprovalRequest,
  NullalisTaskItem,
  NullalisTaskStatus,
} from "./BotStatusRail";

const APPROVAL_DECISION_WINDOW_SECONDS = 60;

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
  const { t } = useTranslation();
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
        aria-label={`${t("task.plan")}, ${sortedTasks.length} ${sortedTasks.length === 1 ? t("task.task") : t("task.tasks")}`}
      >
        {t("task.plan")}
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
  onModify,
  onDeny,
}: {
  request: NullalisApprovalRequest | null;
  onApprove?: (requestId: string) => void | Promise<void>;
  onModify?: (requestId: string, request: NullalisApprovalRequest) => void | Promise<void>;
  onDeny?: (requestId: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<"approve" | "modify" | "deny" | null>(null);
  const [decided, setDecided] = useState<"approved" | "modified" | "denied" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setSubmitting(null);
    setDecided(null);
    setNow(Date.now());
  }, [request?.id]);

  useEffect(() => {
    if (!request || decided) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [request, decided]);

  const secondsRemaining = useMemo(() => {
    if (!request?.timestamp) return APPROVAL_DECISION_WINDOW_SECONDS;
    const elapsed = Math.max(0, Math.floor((now - request.timestamp) / 1000));
    return Math.max(0, APPROVAL_DECISION_WINDOW_SECONDS - elapsed);
  }, [now, request?.timestamp]);

  const handleAction = useCallback(
    async (action: "approve" | "modify" | "deny") => {
      if (!request || submitting || decided) return;
      const cb =
        action === "approve" ? onApprove : action === "modify" ? onModify : onDeny;
      if (!cb) return;
      setSubmitting(action);
      try {
        await cb(request.id, request);
        setDecided(
          action === "approve" ? "approved" : action === "modify" ? "modified" : "denied"
        );
      } catch {
        setSubmitting(null);
      }
    },
    [request, submitting, decided, onApprove, onModify, onDeny]
  );

  if (!request) return null;

  if (decided) {
    const isApproved = decided === "approved";
    const isModified = decided === "modified";
    const Icon = isApproved ? CheckCircle2 : isModified ? PencilLine : XCircle;
    return (
      <div
        role="status"
        className={cn("zaki-approval-card zaki-approval-card--decided", {
          "is-approved": isApproved,
          "is-modified": isModified,
          "is-denied": decided === "denied",
        })}
      >
        <div className="zaki-approval-card__decided-row">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span>
            {request.tool} .{" "}
            {isApproved
              ? t("zakiControls.approval.decidedApproved")
              : isModified
                ? t("zakiControls.approval.decidedModified", {
                    defaultValue: "Revision requested",
                  })
                : t("zakiControls.approval.decidedDenied")}
          </span>
        </div>
      </div>
    );
  }

  const approveLabel = t("zakiControls.approval.approveAria", { tool: request.tool });
  const modifyLabel = t("zakiControls.approval.modifyAria", {
    defaultValue: "Modify {{tool}} action",
    tool: request.tool,
  });
  const denyLabel = t("zakiControls.approval.denyAria", { tool: request.tool });
  const previewRows = [
    request.effectPreview
      ? {
          label: t("zakiControls.approval.effectPreview", {
            defaultValue: "Effect",
          }),
          value: request.effectPreview,
        }
      : null,
    request.inputPreview
      ? {
          label: t("zakiControls.approval.inputPreview", {
            defaultValue: "Input",
          }),
          value: request.inputPreview,
        }
      : null,
    request.command
      ? {
          label: t("zakiControls.approval.commandPreview", {
            defaultValue: "Command",
          }),
          value: request.command,
        }
      : null,
    request.files?.length
      ? {
          label: t("zakiControls.approval.filesPreview", {
            defaultValue: "Files",
          }),
          value: request.files.join(", "),
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row != null && row.value.trim().length > 0);
  const timerLabel =
    secondsRemaining > 0
      ? t("zakiControls.approval.timer", {
          defaultValue: "{{seconds}}s to decide",
          seconds: secondsRemaining,
        })
      : t("zakiControls.approval.timerElapsed", {
          defaultValue: "Decision overdue",
        });

  return (
    <div
      role="alertdialog"
      aria-labelledby={`approval-title-${request.id}`}
      aria-describedby={`approval-reason-${request.id}`}
      className="zaki-approval-card"
    >
      <div className="zaki-approval-card__layout">
        <ShieldAlert className="zaki-approval-card__icon" aria-hidden />
        <div className="zaki-approval-card__body">
          <header className="zaki-approval-card__head">
            <div>
              <p>{t("zakiControls.approval.kicker", { defaultValue: "Approval gate" })}</p>
              <h3 id={`approval-title-${request.id}`}>
                {t("zakiControls.approval.title", { tool: request.tool })}
              </h3>
            </div>
            <span
              className="zaki-approval-card__timer"
              aria-label={timerLabel}
            >
              <TimerReset className="size-3" aria-hidden />
              {timerLabel}
            </span>
          </header>
          <div
            id={`approval-reason-${request.id}`}
            className="zaki-approval-card__reason"
          >
            {request.reason || t("zakiControls.approval.defaultReason")}
          </div>
          {previewRows.length ? (
            <dl className="zaki-approval-card__preview" aria-label={t("zakiControls.approval.previewAria", { defaultValue: "Approval preview" })}>
              {previewRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="zaki-approval-card__meta">
            <span>{t("zakiControls.approval.riskLabel")} {request.riskLevel || "unknown"}</span>
            <span>{request.tool}</span>
            {request.expiresAt ? <span>{request.expiresAt}</span> : null}
          </div>
          <div className="zaki-approval-card__actions">
            <button
              type="button"
              disabled={!!submitting || !onApprove}
              onClick={() => handleAction("approve")}
              aria-label={approveLabel}
              className={cn("zaki-approval-card__button is-primary", submitting === "approve" && "is-loading")}
            >
              {submitting === "approve" ? (
                <span>
                  <Loader2 className="size-3 animate-spin" aria-hidden /> {t("zakiControls.approval.approvingState")}
                </span>
              ) : (
                t("zakiControls.approval.approveBtn")
              )}
            </button>
            <button
              type="button"
              disabled={!!submitting || !onModify}
              onClick={() => handleAction("modify")}
              aria-label={modifyLabel}
              className={cn("zaki-approval-card__button", submitting === "modify" && "is-loading")}
            >
              {submitting === "modify" ? (
                <span>
                  <Loader2 className="size-3 animate-spin" aria-hidden />{" "}
                  {t("zakiControls.approval.modifyingState", {
                    defaultValue: "Preparing...",
                  })}
                </span>
              ) : (
                t("zakiControls.approval.modifyBtn", { defaultValue: "Modify" })
              )}
            </button>
            <button
              type="button"
              disabled={!!submitting || !onDeny}
              onClick={() => handleAction("deny")}
              aria-label={denyLabel}
              className={cn("zaki-approval-card__button is-danger", submitting === "deny" && "is-loading")}
            >
              {submitting === "deny" ? (
                <span>
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
  tokenCount?: number;
  contextMax: number;
  messageCount?: number;
  context_pressure_percent?: number | null;
};

export function ContextGauge({
  data,
  compact = false,
}: {
  data: ContextGaugeData | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!data || !data.contextMax || data.contextMax <= 0) return null;

  // L4: back-derive tokenCount from context_pressure_percent when tokenCount is missing
  const tokenCount = data.tokenCount ?? Math.round(((data.context_pressure_percent ?? 0) / 100) * (data.contextMax ?? 0));
  const pct = Math.min(100, Math.max(0, (tokenCount / data.contextMax) * 100));
  const pctLabel = pct.toFixed(0);
  const tokenLabel = new Intl.NumberFormat("en-US").format(tokenCount);
  const maxLabel = new Intl.NumberFormat("en-US").format(data.contextMax);
  const ariaLabel = `Context window ${tokenLabel} of ${maxLabel} tokens, ${pctLabel} percent used`;

  // 2026-05-08 — Single color, no FE-side tier buckets. Pressure is the
  // raw signal nullalis emits; the actual compaction trigger lives in
  // backend report.compaction_threshold_pct (per-session, dynamic), not
  // in any constant defined here. Mirror only — no FE opinion.
  const barColor = "bg-zaki-accent";
  const textColor = "text-zaki-muted dark:text-zaki-dark-muted";

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
        <span className="text-zaki-muted dark:text-zaki-dark-muted">{t("contextGauge.label")}</span>
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
          {t("contextGauge.messageCount", { count: data.messageCount })}
        </div>
      )}
    </div>
  );
}
