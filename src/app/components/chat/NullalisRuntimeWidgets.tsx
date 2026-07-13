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
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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

type ApprovalT = (key: string, options?: Record<string, unknown>) => string;

type ApprovalDetailRow = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type ApprovalAction = "approve" | "approve-session" | "modify" | "deny";
type ApprovalGrantAction = Extract<ApprovalAction, "approve" | "approve-session">;

const MACHINE_APPROVAL_REASONS = new Set([
  "approval_required",
  "supervised_mutating_requires_approval",
  "mutating_operation_requires_approval",
]);

const SENSITIVE_PARAM_RE = /(api[_-]?key|authorization|bearer|credential|password|secret|token)/i;
const SENSITIVE_TEXT_RE =
  /(["']?(?:api[_-]?key|authorization|credential|password|secret|token)["']?\s*[:=]\s*)(["'])([^"']{1,240})(["'])/giu;
const SENSITIVE_BARE_TEXT_RE =
  /(\b(?:api[_-]?key|authorization|credential|password|secret|token)\b\s*[:=]\s*)([^\s,;&}]+)/giu;
const BEARER_TEXT_RE = /\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gu;

function normalizeRiskLevel(riskLevel: string | null | undefined) {
  const normalized = String(riskLevel || "unknown").trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }
  return "unknown";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hiddenApprovalValue(t: ApprovalT) {
  return t("zakiControls.approval.hiddenValue", { defaultValue: "Hidden" });
}

function redactSensitiveText(value: string, t: ApprovalT) {
  const hidden = hiddenApprovalValue(t);
  return value
    .replace(SENSITIVE_TEXT_RE, (_match, prefix: string, quote: string, _secret: string, close: string) => {
      const endQuote = close || quote;
      return `${prefix}${quote}${hidden}${endQuote}`;
    })
    .replace(SENSITIVE_BARE_TEXT_RE, (_match, prefix: string) => `${prefix}${hidden}`)
    .replace(BEARER_TEXT_RE, (_match, prefix: string) => `${prefix} ${hidden}`);
}

function sanitizeApprovalValue(
  value: unknown,
  t: ApprovalT,
  key = "",
  seen = new WeakSet<object>(),
  depth = 0
): unknown {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_PARAM_RE.test(key)) return hiddenApprovalValue(t);
  if (typeof value === "string") return redactSensitiveText(value.trim(), t);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth > 5) return "[Object]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeApprovalValue(item, t, "", seen, depth + 1));
  }
  if (isPlainRecord(value)) {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [
        childKey,
        sanitizeApprovalValue(childValue, t, childKey, seen, depth + 1),
      ])
    );
  }
  return String(value);
}

function stringifyApprovalValue(
  value: unknown,
  t: ApprovalT,
  key = "",
  maxLength = 180
): string | null {
  if (value === null || value === undefined) return null;
  if (SENSITIVE_PARAM_RE.test(key)) return hiddenApprovalValue(t);
  let text = "";
  if (typeof value === "string") {
    text = redactSensitiveText(value.trim(), t);
  } else if (typeof value === "number" || typeof value === "boolean") {
    text = String(value);
  } else if (Array.isArray(value)) {
    text = value
      .map((item) => stringifyApprovalValue(item, t, "", Math.max(32, Math.floor(maxLength / 2))))
      .filter((item): item is string => Boolean(item))
      .join(", ");
  } else {
    try {
      text = JSON.stringify(sanitizeApprovalValue(value, t, key));
    } catch {
      text = String(value);
    }
  }
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function valueFromParams(params: unknown, keys: string[], t: ApprovalT) {
  if (!isPlainRecord(params)) return null;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = stringifyApprovalValue(params[key], t, key);
      if (value) return value;
    }
  }
  return null;
}

function paramRowsFromRecord(params: Record<string, unknown>, t: ApprovalT): ApprovalDetailRow[] {
  const preferredKeys = [
    "command",
    "cmd",
    "url",
    "href",
    "path",
    "file",
    "filename",
    "target",
    "selector",
    "recipient",
    "to",
    "channel",
    "group",
    "method",
    "amount",
    "currency",
  ];
  const keys = [
    ...preferredKeys.filter((key) => Object.prototype.hasOwnProperty.call(params, key)),
    ...Object.keys(params).filter((key) => !preferredKeys.includes(key)),
  ];
  return keys.slice(0, 5).flatMap((key) => {
    const value = stringifyApprovalValue(params[key], t, key);
    if (!value) return [];
    return [{
      label: key.replace(/[_-]+/gu, " "),
      value,
      emphasis: key === "command" || key === "cmd" || key === "path" || key === "url",
    }];
  });
}

function isMachineReason(reason: string | null | undefined) {
  const normalized = String(reason || "").trim();
  if (!normalized) return true;
  if (MACHINE_APPROVAL_REASONS.has(normalized)) return true;
  return /^[a-z0-9_:.:-]+$/u.test(normalized) && normalized.includes("_");
}

function classifyApprovalTool(tool: string, request: NullalisApprovalRequest) {
  const normalized = String(tool || "").toLowerCase();
  if (
    normalized.includes("extension") ||
    normalized.includes("browser") ||
    normalized.includes("playwright") ||
    normalized.includes("web_") ||
    normalized.includes("web.") ||
    normalized.includes("navigate") ||
    normalized.includes("click") ||
    normalized.includes("screenshot") ||
    normalized.includes("dom")
  ) return "browser";
  if (
    normalized.includes("telegram") ||
    normalized.includes("slack") ||
    normalized.includes("discord") ||
    normalized.includes("email") ||
    normalized.includes("mail") ||
    normalized.includes("whatsapp") ||
    normalized.includes("send_message") ||
    normalized.includes("message") ||
    normalized.includes("post") ||
    normalized.includes("external")
  ) return "external";
  if (
    normalized.includes("spend") ||
    normalized.includes("billing") ||
    normalized.includes("payment") ||
    normalized.includes("checkout") ||
    normalized.includes("purchase") ||
    normalized.includes("invoice") ||
    normalized.includes("stripe") ||
    normalized.includes("subscription")
  ) return "spend";
  if (
    normalized.includes("file") ||
    normalized.includes("write") ||
    normalized.includes("delete") ||
    normalized.includes("remove") ||
    normalized.includes("move") ||
    normalized.includes("rename") ||
    normalized.includes("patch") ||
    normalized.includes("artifact_share") ||
    normalized.includes("produce_document") ||
    normalized.includes("export")
  ) return "file";
  if (request.command || /\b(shell|exec|terminal|command|bash|zsh|sh)\b/u.test(normalized)) return "shell";
  return "tool";
}

function buildApprovalTitle(request: NullalisApprovalRequest, t: ApprovalT) {
  if (request.intent?.trim()) return request.intent.trim();
  const toolType = classifyApprovalTool(request.tool, request);
  if (toolType === "shell") {
    return t("zakiControls.approval.intent.shell", { defaultValue: "Run a shell command" });
  }
  if (toolType === "browser") {
    return t("zakiControls.approval.intent.browser", { defaultValue: "Control the browser" });
  }
  if (toolType === "external") {
    return t("zakiControls.approval.intent.external", { defaultValue: "Send something outside this chat" });
  }
  if (toolType === "spend") {
    return t("zakiControls.approval.intent.spend", { defaultValue: "Use a billing or spending action" });
  }
  if (toolType === "file") {
    return t("zakiControls.approval.intent.file", { defaultValue: "Change or share a file" });
  }
  return t("zakiControls.approval.intent.tool", {
    defaultValue: "Run a gated tool action",
  });
}

function buildApprovalExplanation(request: NullalisApprovalRequest, t: ApprovalT) {
  if (!isMachineReason(request.reason)) return request.reason;
  const toolType = classifyApprovalTool(request.tool, request);
  if (toolType === "external") {
    return t("zakiControls.approval.explain.external", {
      defaultValue: "Supervised mode pauses before ZAKI posts or sends anything outside this thread.",
    });
  }
  if (toolType === "browser") {
    return t("zakiControls.approval.explain.browser", {
      defaultValue: "Supervised mode pauses before ZAKI acts in a browser session.",
    });
  }
  if (toolType === "spend") {
    return t("zakiControls.approval.explain.spend", {
      defaultValue: "Review the amount, destination, and account before approving.",
    });
  }
  if (toolType === "file") {
    return t("zakiControls.approval.explain.file", {
      defaultValue: "Review the target and effect before ZAKI changes or shares files.",
    });
  }
  return t("zakiControls.approval.defaultReason", {
    defaultValue: "Supervised mode paused before this action. Review the details, then approve once or deny.",
  });
}

function buildApprovalRows(request: NullalisApprovalRequest, t: ApprovalT): ApprovalDetailRow[] {
  const rows: ApprovalDetailRow[] = [];
  const what = request.effectPreview;
  if (what) {
    rows.push({
      label: t("zakiControls.approval.whatPreview", { defaultValue: "What" }),
      value: what,
      emphasis: true,
    });
  }
  if (request.command) {
    rows.push({
      label: t("zakiControls.approval.commandPreview", { defaultValue: "Command" }),
      value: request.command,
      emphasis: true,
    });
  }
  if (request.files?.length) {
    rows.push({
      label: t("zakiControls.approval.filesPreview", { defaultValue: "Files" }),
      value: request.files.join(", "),
      emphasis: true,
    });
  }

  if (isPlainRecord(request.params)) {
    rows.push(...paramRowsFromRecord(request.params, t));
  } else if (request.params !== undefined) {
    const value = stringifyApprovalValue(request.params, t, "params");
    if (value) {
      rows.push({
        label: t("zakiControls.approval.paramsPreview", { defaultValue: "Params" }),
        value,
      });
    }
  }

  if (request.inputPreview) {
    rows.push({
      label: t("zakiControls.approval.inputPreview", { defaultValue: "Input" }),
      value: redactSensitiveText(request.inputPreview, t),
    });
  }

  const deduped: ApprovalDetailRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.label}:${row.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped.slice(0, 7);
}

function buildApprovalAuditMeta(request: NullalisApprovalRequest, t: ApprovalT) {
  const params = request.params;
  const destination =
    valueFromParams(params, ["to", "recipient", "channel", "group", "url", "path", "file", "filename", "target"], t) ||
    (request.files?.[0] ?? null);
  return {
    tool: request.tool,
    destination,
    approvalId: request.approvalId,
  };
}

export function TaskChecklist({ tasks }: { tasks: NullalisTaskItem[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(() => tasks.some((t) => t.status === "running"));
  const hasRunningTask = tasks.some((task) => task.status === "running");

  useEffect(() => {
    if (hasRunningTask) setOpen(true);
  }, [hasRunningTask]);

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
  onApproveForSession,
  onModify,
  onDeny,
}: {
  request: NullalisApprovalRequest | null;
  onApprove?: (requestId: string, request: NullalisApprovalRequest) => void | Promise<void>;
  onApproveForSession?: (requestId: string, request: NullalisApprovalRequest) => void | Promise<void>;
  onModify?: (requestId: string, request: NullalisApprovalRequest) => void | Promise<void>;
  onDeny?: (requestId: string, request: NullalisApprovalRequest) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState<ApprovalAction | null>(null);
  const [decided, setDecided] = useState<"approved" | "modified" | "denied" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<ApprovalGrantAction | null>(null);
  // Set when the approve POST failed because nullalis was briefly unreachable
  // (connection-class outage). The click is NOT lost — the card shows a
  // "retrying" banner and offers a one-click retry of the SAME approval_id.
  const [retryable, setRetryable] = useState(false);

  useEffect(() => {
    setSubmitting(null);
    setDecided(null);
    setActionError(null);
    setRetryable(false);
    setRetryAction(null);
  }, [request?.id]);

  // P0-4 f/g: the approval card is DURABLE. It is re-hydrated from the session
  // GET (pending_approvals) on every mount/reconnect and must stay pinned until
  // the user approves or denies. There is intentionally NO countdown and NO
  // client-side expiry: expires_at is always null server-side, so any timer
  // here would only ever be a false deadline. The card never auto-dismisses.

  const handleAction = useCallback(
    async (action: ApprovalAction) => {
      if (!request || submitting || decided) return;
      const isGrantAction = action === "approve" || action === "approve-session";
      const cb =
        action === "approve"
          ? onApprove
          : action === "approve-session"
            ? onApproveForSession
            : action === "modify"
              ? onModify
              : onDeny;
      if (!cb) return;
      setActionError(null);
      setRetryable(false);
      setRetryAction(null);
      setSubmitting(action);
      if (isGrantAction) {
        setDecided("approved");
      }
      try {
        await cb(request.id, request);
        if (!isGrantAction) {
          setDecided(action === "modify" ? "modified" : "denied");
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        const isRetryable =
          (error as { retryable?: boolean } | null)?.retryable === true ||
          code === "agent_unreachable";
        setDecided(null);
        setSubmitting(null);
        // The retrying banner's only affordance re-POSTs an APPROVE, so it is
        // valid solely for the approve action. Backend retry-with-backoff is
        // scoped to /approve too. For a deny/modify outage we must NOT show the
        // approve-only retry UX (that would invert the user's intent and could
        // silently convert a denial into an approval of a security-sensitive
        // gate). Fall back to the hard-error path so the full action row
        // (Approve/Modify/Deny) stays available and the user can re-decide.
        if (isRetryable && isGrantAction) {
          // Connection-class outage — the click is preserved. Render the
          // retrying banner + a one-click "Retry approval" instead of a hard
          // error, so a brief agent restart never silently drops the approval.
          setRetryable(true);
          setRetryAction(action);
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
    [request, submitting, decided, t, onApprove, onApproveForSession, onModify, onDeny]
  );

  if (!request) return null;

  const riskLevel = normalizeRiskLevel(request.riskLevel);
  const title = buildApprovalTitle(request, t);
  const explanation = buildApprovalExplanation(request, t);
  const previewRows = buildApprovalRows(request, t);
  const auditMeta = buildApprovalAuditMeta(request, t);

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
  const approveSessionLabel = t("zakiControls.approval.approveSessionAria", {
    defaultValue: "Allow {{tool}} for this session",
    tool: request.tool,
  });
  const modifyLabel = t("zakiControls.approval.modifyAria", {
    defaultValue: "Modify {{tool}} action",
    tool: request.tool,
  });
  const denyLabel = t("zakiControls.approval.denyAria", { tool: request.tool });
  const primaryAction: ApprovalGrantAction = retryable && retryAction ? retryAction : "approve";
  const isRetryingSessionApproval = retryable && retryAction === "approve-session";
  const isPrimarySubmitting = submitting === primaryAction;
  const primaryActionAvailable = primaryAction === "approve" ? Boolean(onApprove) : Boolean(onApproveForSession);
  const showSessionApproval =
    request.allowForSessionSafe === true && Boolean(onApproveForSession) && !isRetryingSessionApproval;

  return (
    <div
      role="alertdialog"
      aria-labelledby={`approval-title-${request.id}`}
      aria-describedby={`approval-reason-${request.id}`}
      className={cn("zaki-approval-card", `zaki-approval-card--risk-${riskLevel}`)}
    >
      <div className="zaki-approval-card__layout">
        <ShieldAlert className="zaki-approval-card__icon" aria-hidden />
        <div className="zaki-approval-card__body">
          <header className="zaki-approval-card__head">
            <div>
              <p>{t("zakiControls.approval.kicker", { defaultValue: "Approval required" })}</p>
              <h3 id={`approval-title-${request.id}`}>
                {title}
              </h3>
            </div>
            <span className={cn("zaki-approval-card__risk", `is-${riskLevel}`)}>
              {t("zakiControls.approval.riskBadge", {
                defaultValue: "Risk · {{risk}}",
                risk: t(`zakiControls.approval.risk.${riskLevel}`, {
                  defaultValue: riskLevel,
                }),
              })}
            </span>
          </header>
          <div
            id={`approval-reason-${request.id}`}
            className="zaki-approval-card__reason"
          >
            {explanation}
          </div>
          {actionError ? (
            <div role="status" className="zaki-approval-card__error">
              {actionError}
            </div>
          ) : null}
          {retryable ? (
            // Wave A (P1-12 follow-up / MINOR): show the "agent restarting" status,
            // but the Retry / Modify / Deny affordances live in the always-rendered
            // actions row below — so if the agent stays unreachable the user can
            // still pivot to Deny (or Modify) and is never stuck on Retry alone.
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
            </div>
          ) : null}
          {previewRows.length ? (
            <dl className="zaki-approval-card__preview" aria-label={t("zakiControls.approval.previewAria", { defaultValue: "Approval preview" })}>
              {previewRows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd className={row.emphasis ? "is-emphasis" : undefined}>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="zaki-approval-card__meta">
            <span>{t("zakiControls.approval.toolLabel", { defaultValue: "Tool" })} · {auditMeta.tool}</span>
            {auditMeta.destination ? (
              <span>{t("zakiControls.approval.destinationLabel", { defaultValue: "Target" })} · {auditMeta.destination}</span>
            ) : null}
            {auditMeta.approvalId ? (
              <span>{t("zakiControls.approval.idLabel", { defaultValue: "ID" })} · {auditMeta.approvalId}</span>
            ) : null}
          </div>
          {/* Wave A (P1-12 follow-up / MINOR): always render the actions row. When
              retryable, the primary button becomes "Retry approval" (re-POSTs the
              same approve), but Modify + Deny stay available so the user can always
              pivot away from a stuck retry. */}
          {(
            <div className="zaki-approval-card__actions">
              <button
                type="button"
                disabled={!!submitting || !primaryActionAvailable}
                onClick={() => handleAction(primaryAction)}
                aria-label={
                  retryable
                    ? t(isRetryingSessionApproval ? "zakiControls.approval.retrySessionAria" : "zakiControls.approval.retryAria", {
                        defaultValue: isRetryingSessionApproval
                          ? "Retry session approval for {{tool}}"
                          : "Retry approval for {{tool}}",
                        tool: request.tool,
                      })
                    : approveLabel
                }
                className={cn(
                  "zaki-approval-card__button is-primary",
                  isPrimarySubmitting && "is-loading"
                )}
              >
                {isPrimarySubmitting ? (
                  <span>
                    <Loader2 className="size-3 animate-spin" aria-hidden /> {t("zakiControls.approval.approvingState")}
                  </span>
                ) : retryable && isRetryingSessionApproval ? (
                  t("zakiControls.approval.retrySessionBtn", {
                    defaultValue: "Retry session approval",
                  })
                ) : retryable ? (
                  t("zakiControls.approval.retryBtn", { defaultValue: "Retry approval" })
                ) : (
                  t("zakiControls.approval.approveBtn", {
                    defaultValue: "Approve once",
                  })
                )}
              </button>
              {showSessionApproval ? (
                <button
                  type="button"
                  disabled={!!submitting || !onApproveForSession}
                  onClick={() => handleAction("approve-session")}
                  aria-label={approveSessionLabel}
                  className={cn("zaki-approval-card__button is-session", submitting === "approve-session" && "is-loading")}
                >
                  {submitting === "approve-session" ? (
                    <span>
                      <Loader2 className="size-3 animate-spin" aria-hidden />{" "}
                      {t("zakiControls.approval.approvingState")}
                    </span>
                  ) : (
                    t("zakiControls.approval.approveSessionBtn", {
                      defaultValue: "Allow for this session",
                    })
                  )}
                </button>
              ) : null}
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
