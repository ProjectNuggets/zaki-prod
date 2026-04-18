import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  Gauge,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetShell } from "@/app/components/ui/zaki";
import {
  fetchContextDiagnostics,
  fetchMemoryDoctor,
  fetchUsageQuota,
  type ContextDiagnosticsResponse,
  type MemoryDoctorResponse,
  type UsageQuotaSurface,
} from "@/lib/api";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

export type PowerUserTab = "approvals" | "context" | "memory_doctor" | "usage";

export type SoftLimitState = "normal" | "warning" | "near_limit" | "unlimited";

export interface PowerUserUsageSurface {
  surface: UsageQuotaSurface;
  label: string;
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string | null;
  state: SoftLimitState;
  error?: string | null;
}

export interface PowerUserContextSnapshot {
  turnsInContext?: number | null;
  usedTokens?: number | null;
  totalTokens?: number | null;
  usagePct?: number | null;
  compactedTurns?: number | null;
  lastCompactionAt?: string | null;
  providerFallbackCount?: number | null;
}

export interface PowerUserMemoryHealth {
  savedCount?: number | null;
  pendingCount?: number | null;
  conflictCount?: number | null;
  lastSaveAt?: string | null;
  lastConflictAt?: string | null;
  storageOk?: boolean | null;
}

export interface PowerUserSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PowerUserTab;
  pendingApprovals?: NullalisApprovalRequest[];
  onApproveRequest?: (id: string, approved: boolean) => Promise<void> | void;
  contextSnapshot?: PowerUserContextSnapshot | null;
  memoryHealth?: PowerUserMemoryHealth | null;
}

const TABS: Array<{ id: PowerUserTab; label: string; icon: typeof ShieldCheck }> = [
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "context", label: "Context", icon: Activity },
  { id: "memory_doctor", label: "Memory doctor", icon: Brain },
  { id: "usage", label: "Usage", icon: Gauge },
];

const USAGE_SURFACES: Array<{ surface: UsageQuotaSurface; label: string }> = [
  { surface: "app_chat", label: "Web chat" },
  { surface: "zaki_bot", label: "Telegram" },
];

const SOFT_LIMIT_WARNING_THRESHOLD = 0.7;
const SOFT_LIMIT_NEAR_THRESHOLD = 0.9;

export function deriveSoftLimitState(
  used: number,
  limit: number | null,
  unlimited: boolean
): SoftLimitState {
  if (unlimited || limit == null || limit <= 0) return "unlimited";
  const ratio = used / limit;
  if (ratio >= SOFT_LIMIT_NEAR_THRESHOLD) return "near_limit";
  if (ratio >= SOFT_LIMIT_WARNING_THRESHOLD) return "warning";
  return "normal";
}

function formatPct(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const clamped = Math.max(0, Math.min(100, value));
  return `${Math.round(clamped)}%`;
}

function formatCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Intl.NumberFormat().format(Math.max(0, Math.round(value)));
}

function formatTs(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function formatScalar(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "string") return value.length > 0 ? value : "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderNestedSection(title: string, data: unknown) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) return null;
  return (
    <div
      key={title}
      className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
      data-testid={`power-user-context-section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
        {title}
      </div>
      <div className="grid gap-1.5">
        {entries.map(([key, value]) => {
          const scalar =
            value === null ||
            typeof value === "boolean" ||
            typeof value === "number" ||
            typeof value === "string";
          return (
            <div key={key} className="flex items-start justify-between gap-3">
              <span className="text-zaki-secondary">{key}</span>
              <span className="font-mono-ui text-xs break-all text-right">
                {scalar ? formatScalar(value) : formatScalar(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * W3.7: Power-user controls, visible by default (first-class tab).
 *
 * Approval queue is the default tab. Context and Memory Doctor tabs expose
 * the same truth rendered in the thread rail and memory pane, as a single
 * power-user control surface. Not hidden behind "advanced".
 */
export function PowerUserSheet({
  isOpen,
  onClose,
  initialTab = "approvals",
  pendingApprovals = [],
  onApproveRequest,
  contextSnapshot = null,
  memoryHealth = null,
}: PowerUserSheetProps) {
  const [tab, setTab] = useState<PowerUserTab>(initialTab);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [usageSurfaces, setUsageSurfaces] = useState<PowerUserUsageSurface[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [contextDiag, setContextDiag] =
    useState<ContextDiagnosticsResponse | null>(null);
  const [contextDiagLoading, setContextDiagLoading] = useState(false);
  const [contextDiagError, setContextDiagError] = useState<string | null>(null);
  const [memoryDiag, setMemoryDiag] = useState<MemoryDoctorResponse | null>(null);
  const [memoryDiagLoading, setMemoryDiagLoading] = useState(false);
  const [memoryDiagError, setMemoryDiagError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || tab !== "context") return;
    let active = true;
    setContextDiagLoading(true);
    setContextDiagError(null);
    void (async () => {
      try {
        const { response, data } = await fetchContextDiagnostics();
        if (!active) return;
        if (!response.ok) {
          setContextDiagError(data?.error || data?.reason || "unavailable");
          setContextDiag(null);
        } else {
          setContextDiag(data);
        }
      } catch {
        if (!active) return;
        setContextDiagError("network_error");
        setContextDiag(null);
      } finally {
        if (active) setContextDiagLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== "memory_doctor") return;
    let active = true;
    setMemoryDiagLoading(true);
    setMemoryDiagError(null);
    void (async () => {
      try {
        const { response, data } = await fetchMemoryDoctor();
        if (!active) return;
        if (!response.ok) {
          setMemoryDiagError(data?.error || data?.reason || "unavailable");
          setMemoryDiag(null);
        } else {
          setMemoryDiag(data);
        }
      } catch {
        if (!active) return;
        setMemoryDiagError("network_error");
        setMemoryDiag(null);
      } finally {
        if (active) setMemoryDiagLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== "usage") return;
    let active = true;
    setUsageLoading(true);
    void Promise.all(
      USAGE_SURFACES.map(async ({ surface, label }) => {
        const { response, data } = await fetchUsageQuota(surface);
        const unlimited = Boolean(data?.unlimited);
        const limit = typeof data?.limit === "number" ? data.limit : null;
        const used = typeof data?.used === "number" ? data.used : 0;
        const remaining =
          typeof data?.remaining === "number" ? data.remaining : null;
        const resetAt = typeof data?.resetAt === "string" ? data.resetAt : null;
        const state = deriveSoftLimitState(used, limit, unlimited);
        const error = response.ok ? null : data?.error || "unavailable";
        return {
          surface,
          label,
          unlimited,
          limit,
          used,
          remaining,
          resetAt,
          state,
          error,
        } satisfies PowerUserUsageSurface;
      })
    ).then((rows) => {
      if (!active) return;
      setUsageSurfaces(rows);
      setUsageLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, tab]);

  const pendingCount = pendingApprovals.length;

  const header = (
    <div className="flex items-center gap-1 rounded-full bg-zaki-hover p-1" role="tablist">
      {TABS.map((tabDef) => {
        const Icon = tabDef.icon;
        const active = tab === tabDef.id;
        const badge =
          tabDef.id === "approvals" && pendingCount > 0 ? pendingCount : null;
        return (
          <button
            key={tabDef.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`power-user-tab-${tabDef.id}`}
            onClick={() => setTab(tabDef.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-zaki-raised text-zaki-primary shadow-zaki-sm"
                : "text-zaki-secondary hover:text-zaki-primary"
            )}
          >
            <Icon className="size-3.5" />
            {tabDef.label}
            {badge ? (
              <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-zaki-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const handleAction = async (id: string, approved: boolean) => {
    if (!onApproveRequest) return;
    setBusyId(id);
    try {
      await onApproveRequest(id, approved);
    } finally {
      setBusyId(null);
    }
  };

  const renderApprovals = () => (
    <div className="space-y-3" data-testid="power-user-approvals">
      {pendingApprovals.length === 0 ? (
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
          No approvals pending.
        </div>
      ) : (
        pendingApprovals.map((request) => {
          const isBusy = busyId === request.id;
          return (
            <div
              key={request.id}
              className="rounded-zaki-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100"
              data-testid="power-user-approval-item"
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {request.tool || "Tool"} — {request.riskLevel || "risk: unknown"}
                  </div>
                  <div className="mt-0.5 leading-relaxed opacity-90">
                    {request.reason || "Approval required before running this tool."}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleAction(request.id, false)}
                  className="rounded-full border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleAction(request.id, true)}
                  className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {isBusy ? "..." : "Approve"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderContext = () => {
    if (contextDiagLoading && !contextDiag) {
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
          data-testid="power-user-context"
        >
          Loading diagnostics...
        </div>
      );
    }
    if (contextDiagError) {
      return (
        <div
          className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100"
          data-testid="power-user-context"
          data-state="error"
        >
          Diagnostics unavailable: {contextDiagError}
        </div>
      );
    }
    if (contextDiag && !contextDiag.active) {
      const reason = contextDiag.reason || "no_active_session";
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
          data-testid="power-user-context"
          data-state="inactive"
        >
          {reason === "no_active_session"
            ? "Start a conversation to see context diagnostics."
            : `No context diagnostics available (${reason}).`}
        </div>
      );
    }
    const report = contextDiag?.report ?? null;
    const legacy = contextSnapshot ?? null;
    const pressurePct =
      report?.context_pressure_percent ?? legacy?.usagePct ?? null;
    const usedTokens = report?.token_estimate ?? legacy?.usedTokens ?? null;
    const totalTokens =
      report?.context_window_tokens ?? legacy?.totalTokens ?? null;
    const history = report?.history_messages ?? legacy?.turnsInContext ?? null;
    const compactionTriggered = report?.token_compaction_triggered;
    const compactionThreshold = report?.token_compaction_threshold ?? null;
    const historyTrim = report?.history_trim_limit_messages ?? null;
    const tools = report?.tools ?? null;
    const roles = report?.roles ?? null;

    return (
      <div className="space-y-3" data-testid="power-user-context">
        <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">Model</span>
            <span className="font-mono-ui text-xs">{report?.model || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">Window pressure</span>
            <span className="font-mono-ui">
              {formatPct(pressurePct)} · {formatCount(usedTokens)} /{" "}
              {formatCount(totalTokens)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">History messages</span>
            <span className="font-mono-ui">
              {formatCount(history)}
              {historyTrim != null ? ` / ${formatCount(historyTrim)} trim` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">Compaction</span>
            <span
              className={cn(
                "font-mono-ui",
                compactionTriggered === true && "text-amber-500"
              )}
            >
              {compactionTriggered === true ? "triggered" : "none"}
              {compactionThreshold != null
                ? ` · ≥ ${formatCount(compactionThreshold)} tok`
                : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">Tools loaded</span>
            <span className="font-mono-ui">{formatCount(tools)}</span>
          </div>
        </div>

        {roles ? (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
              Role breakdown
            </div>
            <div className="grid gap-1.5">
              {Object.entries(roles).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-zaki-secondary">{role}</span>
                  <span className="font-mono-ui">{formatCount(count)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {renderNestedSection("Memory", report?.memory)}
        {renderNestedSection("Prompt", report?.prompt)}
        {renderNestedSection("Retrieval", report?.retrieval)}
        {renderNestedSection("Continuity", report?.continuity)}
        {renderNestedSection("Cache", report?.cache)}
        {renderNestedSection("Buckets", report?.buckets)}
        {renderNestedSection("Runtime", report?.runtime)}
        {renderNestedSection("Last turn", report?.last_turn)}

        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          Read-only. Compaction and fallback events also appear as banners
          above the thread (see W3.5).
        </div>
      </div>
    );
  };

  const renderLegacyMemoryHealth = () =>
    memoryHealth ? (
      <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
          Memory snapshot
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Saved memories</span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.savedCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Pending review</span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.pendingCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Conflicts</span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.conflictCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Last save</span>
          <span className="font-mono-ui">{formatTs(memoryHealth?.lastSaveAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Storage</span>
          <span
            className={cn(
              "font-mono-ui",
              memoryHealth?.storageOk === false && "text-rose-500",
              memoryHealth?.storageOk === true && "text-emerald-500"
            )}
          >
            {memoryHealth?.storageOk == null
              ? "—"
              : memoryHealth.storageOk
                ? "ok"
                : "degraded"}
          </span>
        </div>
      </div>
    ) : null;

  const renderMemoryDoctor = () => {
    if (memoryDiagLoading && !memoryDiag) {
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
          data-testid="power-user-memory-doctor"
        >
          Loading memory doctor...
        </div>
      );
    }
    if (memoryDiagError) {
      return (
        <div
          className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100"
          data-testid="power-user-memory-doctor"
          data-state="error"
        >
          Memory doctor unavailable: {memoryDiagError}
        </div>
      );
    }
    if (memoryDiag && !memoryDiag.active) {
      const reason = memoryDiag.reason || "no_active_session";
      return (
        <div
          className="space-y-3"
          data-testid="power-user-memory-doctor"
          data-state="inactive"
        >
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
            {reason === "no_active_session"
              ? "Start a conversation to see memory doctor output."
              : `Memory doctor unavailable (${reason}).`}
          </div>
          {renderLegacyMemoryHealth()}
        </div>
      );
    }
    if (memoryDiag && memoryDiag.active && memoryDiag.runtime === false) {
      return (
        <div
          className="space-y-3"
          data-testid="power-user-memory-doctor"
          data-state="no-runtime"
        >
          <div className="rounded-zaki-lg border border-amber-400/40 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
            Memory runtime is not configured on the backend
            {memoryDiag.reason ? ` (${memoryDiag.reason})` : ""}.
          </div>
          {renderLegacyMemoryHealth()}
        </div>
      );
    }
    const reportText = (memoryDiag?.report_text || "").trim();
    return (
      <div className="space-y-3" data-testid="power-user-memory-doctor">
        {reportText ? (
          <pre
            data-testid="power-user-memory-doctor-report"
            className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-zaki-lg border border-zaki bg-zaki-raised p-4 font-mono-ui text-xs leading-relaxed text-zaki-primary dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
          >
            {reportText}
          </pre>
        ) : (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
            Memory doctor returned no text.
          </div>
        )}
        {renderLegacyMemoryHealth()}
        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          For edit/forget, open the Memory pane. This tab is diagnostic only.
        </div>
      </div>
    );
  };

  const renderUsage = () => {
    const stateTone: Record<SoftLimitState, string> = {
      normal: "text-emerald-600 dark:text-emerald-400",
      warning: "text-amber-600 dark:text-amber-400",
      near_limit: "text-rose-600 dark:text-rose-400",
      unlimited: "text-zaki-secondary",
    };
    const stateLabel: Record<SoftLimitState, string> = {
      normal: "OK",
      warning: "Warning",
      near_limit: "Near limit",
      unlimited: "Unlimited",
    };
    return (
      <div className="space-y-3" data-testid="power-user-usage">
        {usageLoading && !usageSurfaces ? (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
            Loading usage...
          </div>
        ) : null}
        {(usageSurfaces || []).map((row) => {
          const pct =
            row.unlimited || !row.limit
              ? null
              : Math.max(0, Math.min(100, (row.used / row.limit) * 100));
          return (
            <div
              key={row.surface}
              data-testid={`power-user-usage-surface-${row.surface}`}
              data-soft-limit-state={row.state}
              className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{row.label}</span>
                <span
                  className={cn("font-mono-ui text-xs", stateTone[row.state])}
                  data-testid={`power-user-usage-state-${row.surface}`}
                >
                  {stateLabel[row.state]}
                </span>
              </div>
              {row.error ? (
                <div className="text-xs text-rose-500">Usage unavailable.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-zaki-secondary">Requests today</span>
                    <span className="font-mono-ui">
                      {row.unlimited
                        ? `${formatCount(row.used)} · unlimited`
                        : `${formatCount(row.used)} / ${formatCount(row.limit)}`}
                    </span>
                  </div>
                  {pct != null ? (
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-zaki-hover"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          row.state === "near_limit"
                            ? "bg-rose-500"
                            : row.state === "warning"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-zaki-secondary">Resets</span>
                    <span className="font-mono-ui">{formatTs(row.resetAt)}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          Soft-limit warning at {Math.round(SOFT_LIMIT_WARNING_THRESHOLD * 100)}% used; near-limit at
          {" "}
          {Math.round(SOFT_LIMIT_NEAR_THRESHOLD * 100)}%. Hard stops still apply on hit.
        </div>
      </div>
    );
  };

  const body = useMemo(() => {
    if (tab === "approvals") return renderApprovals();
    if (tab === "context") return renderContext();
    if (tab === "usage") return renderUsage();
    return renderMemoryDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    pendingApprovals,
    contextSnapshot,
    memoryHealth,
    busyId,
    usageSurfaces,
    usageLoading,
    contextDiag,
    contextDiagLoading,
    contextDiagError,
    memoryDiag,
    memoryDiagLoading,
    memoryDiagError,
  ]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Controls"
      icon={<Sparkles className="size-4" />}
      subtitle="Approvals, context, memory, usage"
      width="md"
      padded={false}
    >
      <div className="flex flex-col gap-3 px-4 py-4">
        {header}
        {body}
      </div>
    </SheetShell>
  );
}

export { Terminal as _Terminal };
