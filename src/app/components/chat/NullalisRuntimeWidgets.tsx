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
      className="zaki-agent-plan-inline"
      open={open}
      onToggle={(event) =>
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <summary
        className="zaki-agent-plan-inline__summary"
        aria-expanded={open}
        aria-label={`${t("task.plan")}, ${sortedTasks.length} ${sortedTasks.length === 1 ? t("task.task") : t("task.tasks")}`}
      >
        <span>{t("task.plan")}</span>
        <span>{sortedTasks.length}</span>
      </summary>
      <ul className="zaki-agent-plan-inline__list">
        {sortedTasks.map((task) => (
          <li
            key={task.taskId}
            className="zaki-agent-plan-inline__item"
          >
            <span aria-hidden>{taskStatusIcon(task.status)}</span>
            <span className="sr-only">Status: {taskStatusCopy(task.status)}. </span>
            <span className="zaki-agent-plan-inline__text">
              {task.description || task.taskId}
            </span>
            {typeof task.progressPct === "number" && task.status === "running" ? (
              <span
                className="zaki-agent-plan-inline__progress"
                aria-label={`${Math.round(task.progressPct)} percent complete`}
              >
                {Math.round(task.progressPct)}%
              </span>
            ) : null}
            <span
              aria-hidden
              className="zaki-agent-plan-inline__status"
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
  const [actionError, setActionError] = useState<string | null>(null);
  // Set when the approve POST failed because nullalis was briefly unreachable
  // (connection-class outage). The click is NOT lost — the card shows a
  // "retrying" banner and offers a one-click retry of the SAME approval_id.
  const [retryable, setRetryable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setSubmitting(null);
    setDecided(null);
    setActionError(null);
    setRetryable(false);
    setNow(Date.now());
  }, [request?.id]);

  useEffect(() => {
    if (!request || decided) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [request, decided]);

  const expiresAtMs = useMemo(() => {
    if (!request?.expiresAt) return null;
    const parsed = Date.parse(request.expiresAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [request?.expiresAt]);

  const secondsRemaining = useMemo(() => {
    if (expiresAtMs != null) {
      return Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
    }
    if (!request?.timestamp) return APPROVAL_DECISION_WINDOW_SECONDS;
    const elapsed = Math.max(0, Math.floor((now - request.timestamp) / 1000));
    return Math.max(0, APPROVAL_DECISION_WINDOW_SECONDS - elapsed);
  }, [expiresAtMs, now, request?.timestamp]);

  const isExpired = expiresAtMs != null && now >= expiresAtMs;

  const handleAction = useCallback(
    async (action: "approve" | "modify" | "deny") => {
      if (!request || submitting || decided) return;
      if (isExpired) {
        setActionError(
          t("zakiControls.approval.expiredMessage", {
            defaultValue: "Approval expired. Refresh the session to load the latest card.",
          })
        );
        return;
      }
      const cb =
        action === "approve" ? onApprove : action === "modify" ? onModify : onDeny;
      if (!cb) return;
      setActionError(null);
      setRetryable(false);
      setSubmitting(action);
      if (action === "approve") {
        setDecided("approved");
      }
      try {
        await cb(request.id, request);
        if (action !== "approve") {
          setDecided(action === "modify" ? "modified" : "denied");
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const isRetryable =
          (error as { retryable?: boolean } | null)?.retryable === true ||
          code === "agent_unreachable";
        setDecided(null);
        setSubmitting(null);
        if (isRetryable) {
          // Connection-class outage — the click is preserved. Render the
          // retrying banner + a one-click "Retry approval" instead of a hard
          // error, so a brief agent restart never silently drops the approval.
          setRetryable(true);
          setActionError(null);
        } else {
          setRetryable(false);
          setActionError(
            code === "approval_id_mismatch"
              ? t("zakiControls.approval.changedMessage", {
                  defaultValue: "Approval changed. Review the latest approval card.",
                })
              : t("zakiControls.approval.resolveFailed", {
                  defaultValue: "Approval could not be resolved. Try again.",
                })
          );
        }
      }
    },
    [request, submitting, decided, isExpired, t, onApprove, onModify, onDeny]
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
              ? t("zakiControls.approval.decidedApproved", {
                  defaultValue: "Approved. ZAKI is continuing...",
                })
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
    isExpired
      ? t("zakiControls.approval.expired", {
          defaultValue: "Approval expired",
        })
      : secondsRemaining > 0
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
          {actionError ? (
            <div role="status" className="zaki-approval-card__error">
              {actionError}
            </div>
          ) : null}
          {retryable ? (
            <div role="status" className="zaki-approval-card__retrying">
              <span className="zaki-approval-card__retrying-msg">
                {submitting === "approve" ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <TimerReset className="size-3" aria-hidden />
                )}
                {t("zakiControls.approval.retrying", {
                  defaultValue: "Agent restarting — retrying your approval...",
                })}
              </span>
              <button
                type="button"
                disabled={!!submitting || !onApprove}
                onClick={() => handleAction("approve")}
                aria-label={t("zakiControls.approval.retryAria", {
                  defaultValue: "Retry approval for {{tool}}",
                  tool: request.tool,
                })}
                className={cn(
                  "zaki-approval-card__button is-primary",
                  submitting === "approve" && "is-loading"
                )}
              >
                {submitting === "approve" ? (
                  <span>
                    <Loader2 className="size-3 animate-spin" aria-hidden />{" "}
                    {t("zakiControls.approval.approvingState")}
                  </span>
                ) : (
                  t("zakiControls.approval.retryBtn", {
                    defaultValue: "Retry approval",
                  })
                )}
              </button>
            </div>
          ) : null}
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
          {retryable ? null : (
            <div className="zaki-approval-card__actions">
              <button
                type="button"
                disabled={isExpired || !!submitting || !onApprove}
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
                disabled={isExpired || !!submitting || !onModify}
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
                disabled={isExpired || !!submitting || !onDeny}
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
          )}
        </div>
      </div>
    </div>
  );
}

export type ContextGaugeData = {
  tokenCount?: number;
  contextMax?: number;
  messageCount?: number;
  source?: "live_session" | "diagnostics_fallback" | "inactive_session" | "unknown";
  confidence?: "exact" | "fallback" | "inactive" | "unknown";
  pressureTokenSource?: string | null;
  localTokenEstimate?: number | null;
  providerPromptTokens?: number | null;
  providerCachedPromptTokens?: number | null;
  compactionThresholdPct?: number | null;
  compactionThresholdTokens?: number | null;
  tokenCompactionTriggered?: boolean | null;
  lastTurn?: {
    autoCompactionEvents?: number | null;
    durableContinuityRefreshed?: boolean | null;
    memoryContextInjected?: boolean | null;
  } | null;
  pressurePercent?: number | null;
  sampledAtMs?: number | null;
  status?: string | null;
  reason?: string | null;
  model?: string | null;
  modelProvider?: string | null;
  contextWindowSource?: string | null;
  remainingTokens?: number | null;
  compaction?: {
    nudgePercent?: number | null;
    passAPercent?: number | null;
    passCPercent?: number | null;
    recommended?: boolean | null;
  } | null;
};

export function ContextGauge({
  data,
  compact = false,
}: {
  data: ContextGaugeData | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (!data) return null;

  // Backend pressure is the only pressure signal. Token counts are supporting
  // detail and must never be converted into a frontend percentage.
  const hasContextMax = typeof data.contextMax === "number" && data.contextMax > 0;
  const pct =
    typeof data.pressurePercent === "number"
      ? Math.min(100, Math.max(0, data.pressurePercent))
      : null;
  const pctKnown = typeof pct === "number";
  const tokenCount =
    pctKnown && typeof data.tokenCount === "number" && Number.isFinite(data.tokenCount)
      ? data.tokenCount
      : null;
  const pctLabel = pctKnown ? pct.toFixed(0) : "--";
  const tokenLabel = tokenCount != null ? new Intl.NumberFormat("en-US").format(tokenCount) : null;
  const maxLabel =
    hasContextMax && data.contextMax
      ? new Intl.NumberFormat("en-US").format(data.contextMax)
      : null;
  const ariaLabel =
    !pctKnown
      ? "Context pressure unknown"
      : tokenLabel && maxLabel
      ? `Context window ${tokenLabel} of ${maxLabel} tokens, ${pctLabel} percent used`
      : `Context pressure ${pctLabel} percent`;
  const sourceLabel =
    data.source === "live_session"
      ? "live session"
      : data.source === "diagnostics_fallback"
        ? "diagnostics fallback"
        : data.source === "inactive_session"
          ? "inactive session"
          : null;
  const thresholdLabel =
    typeof data.compactionThresholdPct === "number"
      ? `compact @ ${Math.round(data.compactionThresholdPct)}%`
      : typeof data.compactionThresholdTokens === "number"
        ? `compact @ ${new Intl.NumberFormat("en-US").format(data.compactionThresholdTokens)} tokens`
      : null;
  const lastTurnBits = [
    data.tokenCompactionTriggered ? "token trigger" : null,
    data.lastTurn?.autoCompactionEvents ? `${data.lastTurn.autoCompactionEvents} compactions` : null,
    data.lastTurn?.durableContinuityRefreshed ? "continuity refreshed" : null,
    data.lastTurn?.memoryContextInjected ? "memory injected" : null,
  ].filter((bit): bit is string => typeof bit === "string" && bit.length > 0);

  // 2026-05-08 — Single color, no FE-side tier buckets. Pressure is the
  // raw signal nullalis emits; compaction policy lives in the backend
  // report metadata, not in any constant defined here. Mirror only — no
  // FE opinion.
  const barColor = "bg-zaki-accent";
  const textColor = "text-zaki-muted dark:text-zaki-dark-muted";

  const trackColor = "bg-zaki-elevated dark:bg-[#1a1714]";

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono-ui text-[11px]">
        <div
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={pctKnown ? Math.round(pct) : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn("h-1 w-12 rounded-full", trackColor)}
        >
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: pctKnown ? `${pct}%` : "0%" }}
          />
        </div>
        <span className={textColor}>{pctKnown ? `${pctLabel}%` : pctLabel}</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 max-w-[88%] text-[11px]">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-zaki-muted dark:text-zaki-dark-muted">{t("contextGauge.label")}</span>
        <span className={cn("font-mono-ui", textColor)}>
          {pctKnown && tokenLabel && maxLabel ? `${tokenLabel} / ${maxLabel} (${pctLabel}%)` : pctKnown ? `${pctLabel}%` : pctLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={pctKnown ? Math.round(pct) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("h-1.5 w-full rounded-full", trackColor)}
      >
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: pctKnown ? `${pct}%` : "0%" }}
        />
      </div>
      {typeof data.messageCount === "number" && (
        <div className="mt-0.5 text-zaki-muted dark:text-zaki-dark-muted">
          {t("contextGauge.messageCount", { count: data.messageCount })}
        </div>
      )}
      {(sourceLabel || thresholdLabel || lastTurnBits.length > 0) ? (
        <div className={cn("mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono-ui text-[10px]", textColor)}>
          {sourceLabel ? <span>{sourceLabel}</span> : null}
          {thresholdLabel ? <span>{thresholdLabel}</span> : null}
          {lastTurnBits.slice(0, 2).map((bit) => (
            <span key={bit}>{bit}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
