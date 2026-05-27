import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Brain,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  History,
  Link2Off,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SheetShell } from "@/app/components/ui/zaki";
import {
  exportAgentArtifact,
  fetchContextDiagnostics,
  fetchAgentDiagnostics,
  fetchMemoryDoctor,
  fetchUsageQuota,
  listAgentArtifacts,
  listAgentTraces,
  revokeAgentArtifactShare,
  revokeAgentTraceShare,
  shareAgentArtifact,
  shareAgentTrace,
  type AgentArtifact,
  type AgentTrace,
  type AgentSessionMode,
  type ContextDiagnosticsResponse,
  type MemoryDoctorResponse,
  type UsageQuotaSurface,
} from "@/lib/api";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";
import {
  type ZakiRuntimeSandbox,
} from "@/stores/zakiSessionUiStore";

export type PowerUserTab =
  | "controls"
  | "approvals"
  | "browser"
  | "artifacts"
  | "trace"
  | "context"
  | "memory"
  | "usage";

export type SoftLimitState = "normal" | "warning" | "near_limit" | "unlimited";

export interface PowerUserUsageSurface {
  surface: UsageQuotaSurface;
  label: string;
  unlimited: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string | null;
  period?: "day" | "week" | string | null;
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
  activeSessionKey?: string | null;
  activeMode?: AgentSessionMode | null;
  modePending?: boolean;
  onModeChange?: (mode: AgentSessionMode) => Promise<void> | void;
  contextPressurePercent?: number | null;
  sandbox?: ZakiRuntimeSandbox | null;
  pendingApprovals?: NullalisApprovalRequest[];
  onApproveRequest?: (id: string, approved: boolean) => Promise<void> | void;
  contextSnapshot?: PowerUserContextSnapshot | null;
  memoryHealth?: PowerUserMemoryHealth | null;
  artifactEventCount?: number;
}

const TAB_ICONS: Record<PowerUserTab, typeof ShieldCheck> = {
  controls: Sparkles,
  approvals: ShieldCheck,
  browser: Globe2,
  artifacts: FileText,
  trace: History,
  context: Activity,
  memory: Brain,
  usage: Gauge,
};

const POWER_USER_TABS: PowerUserTab[] = [
  "controls",
  "approvals",
  "browser",
  "artifacts",
  "trace",
  "context",
  "memory",
  "usage",
];

const EXTENSION_TOOL_NAMES = [
  "extension_navigate",
  "extension_click",
  "extension_type",
  "extension_fill_form",
  "extension_screenshot",
  "extension_get_text",
  "extension_get_dom",
  "extension_wait_for",
  "extension_scroll",
  "extension_list_tabs",
];

const ARTIFACT_EXPORT_FORMATS = ["pdf", "docx", "pptx", "html", "xlsx"];

const USAGE_SURFACES: Array<{ surface: UsageQuotaSurface; labelKey: string }> = [
  { surface: "app_chat", labelKey: "zakiControls.powerUser.usage.surfaces.app_chat" },
  { surface: "zaki_bot", labelKey: "zakiControls.powerUser.usage.surfaces.zaki_bot" },
  { surface: "learning", labelKey: "zakiControls.powerUser.usage.surfaces.learning" },
];

type AgentDiagnosticsSurface = Awaited<ReturnType<typeof fetchAgentDiagnostics>>["data"];

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

function formatTs(value?: string | number | null) {
  if (!value) return "—";
  const parsed =
    typeof value === "number"
      ? new Date(value < 10_000_000_000 ? value * 1000 : value)
      : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

function normalizeList<T>(data: { items?: T[] } & Record<string, unknown>, key: string): T[] {
  const keyed = data[key];
  if (Array.isArray(keyed)) return keyed as T[];
  return Array.isArray(data.items) ? data.items : [];
}

function getArtifactId(artifact: AgentArtifact): string {
  return artifact.id || artifact.artifact_id || "";
}

function getArtifactTitle(artifact: AgentArtifact): string {
  return artifact.title || artifact.type || artifact.mime_type || getArtifactId(artifact) || "Artifact";
}

function getTraceId(trace: AgentTrace): string {
  return trace.run_id || trace.id || "";
}

function getPublicShareUrl(item: Record<string, unknown>): string | null {
  const candidates = [
    item.public_url,
    item.publicUrl,
    item.share_url,
    item.shareUrl,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof match === "string" ? match : null;
}

function getExportDownloadUrl(item: Record<string, unknown>): string | null {
  const candidates = [
    item.download_url,
    item.downloadUrl,
    item.url,
    item.public_url,
    item.publicUrl,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return typeof match === "string" ? match : null;
}

function getBooleanRecordValue(data: unknown, key: string): boolean | null {
  if (!data || typeof data !== "object") return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : null;
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
      className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card"
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
 * ZAKI power-user surface. Controls stay first; diagnostics stay available
 * without burying the live session posture.
 */
export function PowerUserSheet({
  isOpen,
  onClose,
  initialTab = "controls",
  activeSessionKey = null,
  activeMode = null,
  modePending = false,
  onModeChange,
  contextPressurePercent = null,
  sandbox = null,
  pendingApprovals = [],
  onApproveRequest,
  contextSnapshot = null,
  memoryHealth = null,
  artifactEventCount = 0,
}: PowerUserSheetProps) {
  const { t } = useTranslation();
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
  const [agentDiagnostics, setAgentDiagnostics] =
    useState<AgentDiagnosticsSurface | null>(null);
  const [agentDiagnosticsLoading, setAgentDiagnosticsLoading] = useState(false);
  const [agentDiagnosticsError, setAgentDiagnosticsError] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<AgentArtifact[] | null>(null);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [traces, setTraces] = useState<AgentTrace[] | null>(null);
  const [tracesLoading, setTracesLoading] = useState(false);
  const [tracesError, setTracesError] = useState<string | null>(null);

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
    if (!isOpen || tab !== "memory") return;
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
    if (!isOpen || tab !== "browser") return;
    let active = true;
    setAgentDiagnosticsLoading(true);
    setAgentDiagnosticsError(null);
    void (async () => {
      try {
        const { response, data } = await fetchAgentDiagnostics();
        if (!active) return;
        if (!response.ok) {
          setAgentDiagnosticsError(data?.error || "unavailable");
          setAgentDiagnostics(null);
        } else {
          setAgentDiagnostics(data);
        }
      } catch {
        if (!active) return;
        setAgentDiagnosticsError("network_error");
        setAgentDiagnostics(null);
      } finally {
        if (active) setAgentDiagnosticsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== "artifacts") return;
    let active = true;
    setArtifactsLoading(true);
    setArtifactsError(null);
    void (async () => {
      try {
        const { response, data } = await listAgentArtifacts({
          limit: 20,
          session_key: activeSessionKey || undefined,
        });
        if (!active) return;
        if (!response.ok) {
          setArtifactsError((data as { error?: string | null })?.error || "unavailable");
          setArtifacts(null);
        } else {
          setArtifacts(normalizeList<AgentArtifact>(data, "artifacts"));
        }
      } catch {
        if (!active) return;
        setArtifactsError("network_error");
        setArtifacts(null);
      } finally {
        if (active) setArtifactsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [activeSessionKey, artifactEventCount, isOpen, tab]);

  useEffect(() => {
    if (!isOpen || tab !== "trace") return;
    let active = true;
    setTracesLoading(true);
    setTracesError(null);
    void (async () => {
      try {
        const { response, data } = await listAgentTraces({ limit: 20 });
        if (!active) return;
        if (!response.ok) {
          setTracesError((data as { error?: string | null })?.error || "unavailable");
          setTraces(null);
        } else {
          setTraces(normalizeList<AgentTrace>(data, "traces"));
        }
      } catch {
        if (!active) return;
        setTracesError("network_error");
        setTraces(null);
      } finally {
        if (active) setTracesLoading(false);
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
      USAGE_SURFACES.map(async ({ surface, labelKey }) => {
        const { response, data } = await fetchUsageQuota(surface);
        const unlimited = Boolean(data?.unlimited);
        const limit = typeof data?.limit === "number" ? data.limit : null;
        const used = typeof data?.used === "number" ? data.used : 0;
        const remaining =
          typeof data?.remaining === "number" ? data.remaining : null;
        const resetAt = typeof data?.resetAt === "string" ? data.resetAt : null;
        const period = typeof data?.period === "string" ? data.period : null;
        const state = deriveSoftLimitState(used, limit, unlimited);
        const error = response.ok ? null : data?.error || "unavailable";
        return {
          surface,
          label: t(labelKey),
          unlimited,
          limit,
          used,
          remaining,
          resetAt,
          period,
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
  }, [isOpen, tab, t]);

  const pendingCount = pendingApprovals.length;

  const header = (
    <div
      className="zaki-agent-power-tabs"
      role="tablist"
      aria-label={t("zakiControls.powerUser.tabsAria")}
    >
      {POWER_USER_TABS.map((tabId) => {
        const Icon = TAB_ICONS[tabId];
        const active = tab === tabId;
        const badge =
          tabId === "approvals" && pendingCount > 0 ? pendingCount : null;
        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`power-user-tab-${tabId}`}
            onClick={() => setTab(tabId)}
            className={cn(
              "zaki-agent-power-tab",
              active && "is-active"
            )}
          >
            <Icon className="size-3.5" />
            {t(`zakiControls.powerUser.tabs.${tabId}`)}
            {badge ? (
              <span className="zaki-agent-power-tab__badge">
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
    <div className="zaki-agent-power-pane" data-testid="power-user-approvals">
      {pendingApprovals.length === 0 ? (
        <div className="zaki-agent-power-empty">
          {t("zakiControls.powerUser.approvals.empty")}
        </div>
      ) : (
        pendingApprovals.map((request) => {
          const isBusy = busyId === request.id;
          return (
            <div
              key={request.id}
              className="zaki-agent-power-approval"
              data-testid="power-user-approval-item"
            >
              <div className="zaki-agent-power-approval__head">
                <ShieldCheck className="size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="zaki-agent-power-approval__title">
                    {request.tool || t("zakiControls.powerUser.approvals.toolFallback")} —{" "}
                    {request.riskLevel || t("zakiControls.powerUser.approvals.riskUnknown")}
                  </div>
                  <div className="zaki-agent-power-approval__reason">
                    {request.reason || t("zakiControls.powerUser.approvals.reasonFallback")}
                  </div>
                </div>
              </div>
              <div className="zaki-agent-power-approval__actions">
                <button
                  type="button"
                  disabled={isBusy || !onApproveRequest}
                  onClick={() => void handleAction(request.id, false)}
                  data-testid={`power-user-approval-deny-${request.id}`}
                  className="zaki-agent-power-button"
                >
                  {t("zakiControls.powerUser.approvals.deny")}
                </button>
                <button
                  type="button"
                  disabled={isBusy || !onApproveRequest}
                  onClick={() => void handleAction(request.id, true)}
                  data-testid={`power-user-approval-approve-${request.id}`}
                  className="zaki-agent-power-button is-primary"
                >
                  {isBusy ? "..." : t("zakiControls.powerUser.approvals.approve")}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderControls = () => {
    const modeButtons: AgentSessionMode[] = ["plan", "execute", "review"];
    const modeValue = activeMode ?? "execute";
    // 2026-05-08 — Pressure renders as a plain percent; FE no longer
    // colors it by tier. The real compaction trigger is per-session
    // (report.compaction_threshold_pct, surfaced in the diagnostics tab),
    // not anything this control panel can derive locally.
    const contextTone = "text-zaki-secondary";
    const sandboxLabel =
      sandbox?.enabled === true
        ? sandbox.backend
          ? t("zakiControls.sandbox.activeWithBackend", { backend: sandbox.backend })
          : t("zakiControls.sandbox.active")
        : "—";

    return (
      <div className="zaki-agent-power-controls" data-testid="power-user-controls">
        <div className="zaki-agent-power-panel">
          <div className="zaki-agent-power-panel__head">
            <div>
              <div className="zaki-agent-power-section-title">
                {t("zakiControls.powerUser.controls.sessionModeTitle")}
              </div>
              <div className="zaki-agent-power-section-helper">
                {t("zakiControls.powerUser.controls.sessionModeHelper")}
              </div>
            </div>
            {activeSessionKey ? (
              <span className="zaki-agent-power-session-key">
                {activeSessionKey.split(":").slice(-2).join(":")}
              </span>
            ) : null}
          </div>
          <div className="zaki-agent-power-mode">
            {modeButtons.map((mode) => {
              const active = modeValue === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={modePending || !onModeChange}
                  onClick={() => void onModeChange?.(mode)}
                  className={cn(
                    "zaki-agent-power-mode__button",
                    active && "is-active",
                    (modePending || !onModeChange) && "opacity-70"
                  )}
                >
                  {t(`zakiControls.modes.${mode}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="zaki-agent-power-metric-grid">
          <div className="zaki-agent-power-metric">
            <div className="zaki-agent-power-metric__label">
              {t("zakiControls.powerUser.controls.sandboxTitle")}
            </div>
            <div className="zaki-agent-power-metric__value">
              {sandbox?.enabled === true ? t("zakiControls.sandbox.active") : "—"}
            </div>
            <div className="zaki-agent-power-metric__meta">
              {sandboxLabel}
            </div>
          </div>

          <div className="zaki-agent-power-metric">
            <div className="zaki-agent-power-metric__label">
              {t("zakiControls.powerUser.controls.approvalsTitle")}
            </div>
            <div className="zaki-agent-power-metric__value">
              {pendingCount}
            </div>
            <div className="zaki-agent-power-metric__meta">
              {pendingCount > 0
                ? t("zakiControls.powerUser.controls.approvalsPending")
                : t("zakiControls.powerUser.controls.approvalsClear")}
            </div>
          </div>

          <div className="zaki-agent-power-metric">
            <div className="zaki-agent-power-metric__label">
              {t("zakiControls.powerUser.controls.contextTitle")}
            </div>
            <div className={cn("zaki-agent-power-metric__value", contextTone)}>
              {typeof contextPressurePercent === "number" ? `${Math.round(contextPressurePercent)}%` : "—"}
            </div>
            <div className="zaki-agent-power-metric__meta">
              {t("zakiControls.context.normal")}
            </div>
          </div>
        </div>

        <div className="zaki-agent-power-note">
          {t("zakiControls.powerUser.controls.footer")}
        </div>
      </div>
    );
  };

  const renderContext = () => {
    if (contextDiagLoading && !contextDiag) {
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card"
          data-testid="power-user-context"
        >
          {t("zakiControls.powerUser.context.loading")}
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
          {t("zakiControls.powerUser.context.unavailable", { error: contextDiagError })}
        </div>
      );
    }
    if (contextDiag && !contextDiag.active) {
      const reason = contextDiag.reason || "no_active_session";
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card"
          data-testid="power-user-context"
          data-state="inactive"
        >
          {reason === "no_active_session"
            ? t("zakiControls.powerUser.context.noActiveSession")
            : t("zakiControls.powerUser.context.noDiagnostics", { reason })}
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
        <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">Model</span>
            <span className="font-mono-ui text-xs">{report?.model || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">
              {t("zakiControls.powerUser.context.windowPressure")}
            </span>
            <span className="font-mono-ui">
              {formatPct(pressurePct)} · {formatCount(usedTokens)} /{" "}
              {formatCount(totalTokens)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">
              {t("zakiControls.powerUser.context.historyMessages")}
            </span>
            <span className="font-mono-ui">
              {formatCount(history)}
              {historyTrim != null
                ? t("zakiControls.powerUser.context.historyTrimSuffix", {
                    count: Number(historyTrim),
                  })
                : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">
              {t("zakiControls.powerUser.context.compaction")}
            </span>
            <span
              className={cn(
                "font-mono-ui",
                compactionTriggered === true && "text-amber-500"
              )}
            >
              {compactionTriggered === true
                ? t("zakiControls.powerUser.context.compactionTriggered")
                : t("zakiControls.powerUser.context.compactionNone")}
              {compactionThreshold != null
                ? t("zakiControls.powerUser.context.compactionThresholdSuffix", {
                    count: Number(compactionThreshold),
                  })
                : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zaki-secondary">
              {t("zakiControls.powerUser.context.toolsLoaded")}
            </span>
            <span className="font-mono-ui">{formatCount(tools)}</span>
          </div>
        </div>

        {roles ? (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
              {t("zakiControls.powerUser.context.roleBreakdown")}
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

        {renderNestedSection(t("zakiControls.powerUser.context.sections.memory"), report?.memory)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.prompt"), report?.prompt)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.retrieval"), report?.retrieval)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.continuity"), report?.continuity)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.cache"), report?.cache)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.buckets"), report?.buckets)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.runtime"), report?.runtime)}
        {renderNestedSection(t("zakiControls.powerUser.context.sections.lastTurn"), report?.last_turn)}

        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          {t("zakiControls.powerUser.context.footer")}
        </div>
      </div>
    );
  };

  const renderLegacyMemoryHealth = () =>
    memoryHealth ? (
      <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
          {t("zakiControls.powerUser.memory.snapshotTitle")}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">
            {t("zakiControls.powerUser.memory.savedMemories")}
          </span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.savedCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">
            {t("zakiControls.powerUser.memory.pendingReview")}
          </span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.pendingCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">{t("zakiControls.powerUser.memory.conflicts")}</span>
          <span className="font-mono-ui">
            {formatCount(memoryHealth?.conflictCount)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">{t("zakiControls.powerUser.memory.lastSave")}</span>
          <span className="font-mono-ui">{formatTs(memoryHealth?.lastSaveAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">{t("zakiControls.powerUser.memory.storage")}</span>
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
                ? t("zakiControls.powerUser.memory.storageOk")
                : t("zakiControls.powerUser.memory.storageDegraded")}
          </span>
        </div>
      </div>
    ) : null;

  const renderMemory = () => {
    if (memoryDiagLoading && !memoryDiag) {
      return (
        <div
          className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card"
          data-testid="power-user-memory"
        >
          {t("zakiControls.powerUser.memory.loading")}
        </div>
      );
    }
    if (memoryDiagError) {
      return (
        <div
          className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100"
          data-testid="power-user-memory"
          data-state="error"
        >
          {t("zakiControls.powerUser.memory.unavailable", { error: memoryDiagError })}
        </div>
      );
    }
    if (memoryDiag && !memoryDiag.active) {
      const reason = memoryDiag.reason || "no_active_session";
      return (
        <div
          className="space-y-3"
          data-testid="power-user-memory"
          data-state="inactive"
        >
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            {reason === "no_active_session"
              ? t("zakiControls.powerUser.memory.noActiveSession")
              : t("zakiControls.powerUser.memory.noDiagnostics", { reason })}
          </div>
          {renderLegacyMemoryHealth()}
        </div>
      );
    }
    if (memoryDiag && memoryDiag.active && memoryDiag.runtime === false) {
      return (
        <div
          className="space-y-3"
          data-testid="power-user-memory"
          data-state="no-runtime"
        >
          <div className="rounded-zaki-lg border border-amber-400/40 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
            {t("zakiControls.powerUser.memory.noRuntime", {
              reason: memoryDiag.reason ? ` (${memoryDiag.reason})` : "",
            })}
          </div>
          {renderLegacyMemoryHealth()}
        </div>
      );
    }
    const reportText = (memoryDiag?.report_text || "").trim();
    return (
      <div className="space-y-3" data-testid="power-user-memory">
        {reportText ? (
          <pre
            data-testid="power-user-memory-report"
            className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-zaki-lg border border-zaki bg-zaki-raised p-4 font-mono-ui text-xs leading-relaxed text-zaki-primary dark:bg-zaki-dark-card dark:border-zaki-dark-card"
          >
            {reportText}
          </pre>
        ) : (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            {t("zakiControls.powerUser.memory.noText")}
          </div>
        )}
        {renderLegacyMemoryHealth()}
        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          {t("zakiControls.powerUser.memory.footer")}
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
      normal: t("zakiControls.powerUser.usage.states.normal"),
      warning: t("zakiControls.powerUser.usage.states.warning"),
      near_limit: t("zakiControls.powerUser.usage.states.near_limit"),
      unlimited: t("zakiControls.powerUser.usage.states.unlimited"),
    };
    return (
      <div className="space-y-3" data-testid="power-user-usage">
        {usageLoading && !usageSurfaces ? (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            {t("zakiControls.powerUser.usage.loading")}
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
              className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card"
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
                <div className="text-xs text-rose-500">
                  {t("zakiControls.powerUser.usage.unavailable")}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-zaki-secondary">
                      {row.period === "week"
                        ? t("zakiControls.powerUser.usage.requestsThisWeek")
                        : t("zakiControls.powerUser.usage.requestsToday")}
                    </span>
                    <span className="font-mono-ui">
                      {row.unlimited
                        ? t("zakiControls.powerUser.usage.usedUnlimited", {
                            used: formatCount(row.used),
                          })
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
                    <span className="text-zaki-secondary">
                      {t("zakiControls.powerUser.usage.resets")}
                    </span>
                    <span className="font-mono-ui">{formatTs(row.resetAt)}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          {t("zakiControls.powerUser.usage.footer", {
            warning: Math.round(SOFT_LIMIT_WARNING_THRESHOLD * 100),
            near: Math.round(SOFT_LIMIT_NEAR_THRESHOLD * 100),
          })}
        </div>
      </div>
    );
  };

  const mergeArtifact = (artifactId: string, patch: AgentArtifact) => {
    setArtifacts((current) =>
      (current || []).map((artifact) =>
        getArtifactId(artifact) === artifactId ? { ...artifact, ...patch } : artifact
      )
    );
  };

  const mergeTrace = (traceId: string, patch: AgentTrace | Record<string, unknown>) => {
    setTraces((current) =>
      (current || []).map((trace) =>
        getTraceId(trace) === traceId ? { ...trace, ...patch } : trace
      )
    );
  };

  const handleArtifactShare = async (artifact: AgentArtifact) => {
    const artifactId = getArtifactId(artifact);
    if (!artifactId) return;
    setBusyId(`artifact-share:${artifactId}`);
    try {
      const { response, data } = await shareAgentArtifact(artifactId);
      if (!response.ok)
        throw new Error(String((data as { error?: unknown })?.error || "share_failed"));
      mergeArtifact(artifactId, data);
      toast.success(t("zakiControls.powerUser.artifacts.shareSuccess"));
    } catch {
      toast.error(t("zakiControls.powerUser.artifacts.shareFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleArtifactRevoke = async (artifact: AgentArtifact) => {
    const artifactId = getArtifactId(artifact);
    if (!artifactId) return;
    setBusyId(`artifact-revoke:${artifactId}`);
    try {
      const { response, data } = await revokeAgentArtifactShare(artifactId);
      if (!response.ok) throw new Error(data?.error || "revoke_failed");
      mergeArtifact(artifactId, { public_url: null, share_code: null });
      toast.success(t("zakiControls.powerUser.artifacts.revokeSuccess"));
    } catch {
      toast.error(t("zakiControls.powerUser.artifacts.revokeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleArtifactExport = async (artifact: AgentArtifact, format: string) => {
    const artifactId = getArtifactId(artifact);
    if (!artifactId) return;
    setBusyId(`artifact-export:${artifactId}:${format}`);
    try {
      const { response, data } = await exportAgentArtifact(artifactId, format);
      if (!response.ok) throw new Error(String(data?.error || "export_failed"));
      const url = getExportDownloadUrl(data);
      if (url && typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      toast.success(t("zakiControls.powerUser.artifacts.exportSuccess", { format: format.toUpperCase() }));
    } catch {
      toast.error(t("zakiControls.powerUser.artifacts.exportFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleTraceShare = async (trace: AgentTrace) => {
    const traceId = getTraceId(trace);
    if (!traceId) return;
    setBusyId(`trace-share:${traceId}`);
    try {
      const { response, data } = await shareAgentTrace(traceId);
      if (!response.ok)
        throw new Error(String((data as { error?: unknown })?.error || "share_failed"));
      mergeTrace(traceId, data);
      toast.success(t("zakiControls.powerUser.trace.shareSuccess"));
    } catch {
      toast.error(t("zakiControls.powerUser.trace.shareFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleTraceRevoke = async (trace: AgentTrace) => {
    const traceId = getTraceId(trace);
    if (!traceId) return;
    setBusyId(`trace-revoke:${traceId}`);
    try {
      const { response, data } = await revokeAgentTraceShare(traceId);
      if (!response.ok) throw new Error(data?.error || "revoke_failed");
      mergeTrace(traceId, { public_url: null, share_code: null });
      toast.success(t("zakiControls.powerUser.trace.revokeSuccess"));
    } catch {
      toast.error(t("zakiControls.powerUser.trace.revokeFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const renderBrowser = () => {
    const controlPlane = agentDiagnostics?.upstreamControlPlane || null;
    const extensionEnabled =
      getBooleanRecordValue(controlPlane, "extension_ws_enabled") ??
      getBooleanRecordValue(agentDiagnostics, "extension_ws_enabled");
    const upstreamReady = agentDiagnostics?.upstreamReady?.ok;
    const upstreamHealth = agentDiagnostics?.upstreamHealth?.ok;
    const latency =
      agentDiagnostics?.upstreamReady?.latencyMs ??
      agentDiagnostics?.upstreamHealth?.latencyMs ??
      null;

    return (
      <div className="space-y-3" data-testid="power-user-browser">
        {agentDiagnosticsLoading && !agentDiagnostics ? (
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            {t("zakiControls.powerUser.browser.loading")}
          </div>
        ) : null}
        {agentDiagnosticsError ? (
          <div className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100">
            {t("zakiControls.powerUser.browser.unavailable", { error: agentDiagnosticsError })}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
              {t("zakiControls.powerUser.browser.serverLane")}
            </div>
            <div className="mt-2 text-lg font-semibold text-zaki-primary">
              {upstreamReady === true
                ? t("zakiControls.powerUser.browser.ready")
                : upstreamReady === false
                  ? t("zakiControls.powerUser.browser.degraded")
                  : "—"}
            </div>
            <div className="mt-1 text-xs text-zaki-muted">
              {latency != null
                ? t("zakiControls.powerUser.browser.latency", { count: Math.round(latency) })
                : t("zakiControls.powerUser.browser.publicWeb")}
            </div>
          </div>
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
              {t("zakiControls.powerUser.browser.extensionLane")}
            </div>
            <div className="mt-2 text-lg font-semibold text-zaki-primary">
              {extensionEnabled === false
                ? t("zakiControls.powerUser.browser.disabled")
                : t("zakiControls.powerUser.browser.pairingRequired")}
            </div>
            <div className="mt-1 text-xs text-zaki-muted">
              {t("zakiControls.powerUser.browser.loggedInSessions")}
            </div>
          </div>
          <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zaki-muted">
              {t("zakiControls.powerUser.browser.approvalGate")}
            </div>
            <div className="mt-2 text-lg font-semibold text-zaki-primary">
              {pendingCount > 0 ? pendingCount : t("zakiControls.powerUser.browser.supervised")}
            </div>
            <div className="mt-1 text-xs text-zaki-muted">
              {t("zakiControls.powerUser.browser.approvalHelper")}
            </div>
          </div>
        </div>
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zaki-primary">
                {t("zakiControls.powerUser.browser.toolSurface")}
              </div>
              <div className="text-xs text-zaki-muted">
                {t("zakiControls.powerUser.browser.toolSurfaceHelper")}
              </div>
            </div>
            <span className="font-mono-ui text-xs text-zaki-muted">
              {EXTENSION_TOOL_NAMES.length}/10
            </span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {EXTENSION_TOOL_NAMES.map((toolName) => (
              <span
                key={toolName}
                className="min-w-0 rounded-zaki-md border border-zaki-subtle bg-zaki-hover px-2 py-1 font-mono-ui text-[11px] text-zaki-secondary"
              >
                {toolName}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
          {upstreamHealth === false
            ? t("zakiControls.powerUser.browser.healthDegraded")
            : t("zakiControls.powerUser.browser.footer")}
        </div>
      </div>
    );
  };

  const renderArtifacts = () => (
    <div className="space-y-3" data-testid="power-user-artifacts">
      <div className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zaki-primary">
              {t("zakiControls.powerUser.artifacts.deliverables")}
            </div>
            <div className="text-xs text-zaki-muted">
              {t("zakiControls.powerUser.artifacts.deliverablesHelper")}
            </div>
          </div>
          <FileText className="size-4 text-zaki-muted" aria-hidden />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ARTIFACT_EXPORT_FORMATS.map((format) => (
            <span
              key={format}
              className="rounded-zaki-md border border-zaki-subtle bg-zaki-hover px-2 py-1 font-mono-ui text-[11px] uppercase text-zaki-secondary"
            >
              {format}
            </span>
          ))}
        </div>
      </div>
      {artifactsLoading && !artifacts ? (
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          {t("zakiControls.powerUser.artifacts.loading")}
        </div>
      ) : null}
      {artifactsError ? (
        <div className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100">
          {t("zakiControls.powerUser.artifacts.unavailable", { error: artifactsError })}
        </div>
      ) : null}
      {artifacts && artifacts.length === 0 ? (
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          {t("zakiControls.powerUser.artifacts.empty")}
        </div>
      ) : null}
      {(artifacts || []).map((artifact, index) => {
        const artifactId = getArtifactId(artifact);
        const shareUrl = getPublicShareUrl(artifact);
        const title = getArtifactTitle(artifact);
        return (
          <article
            key={artifactId || index}
            className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card"
            data-testid="power-user-artifact-item"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-zaki-primary">
                  {title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 font-mono-ui text-[11px] text-zaki-muted">
                  <span>{artifact.type || artifact.mime_type || "artifact"}</span>
                  <span>v{formatScalar(artifact.version ?? "—")}</span>
                  <span>{formatTs(artifact.updated_at || artifact.created_at)}</span>
                </div>
              </div>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-zaki-md border border-zaki-subtle text-zaki-secondary hover:text-zaki-primary"
                  aria-label={t("zakiControls.powerUser.artifacts.openShared")}
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!artifactId || busyId === `artifact-share:${artifactId}`}
                onClick={() => void handleArtifactShare(artifact)}
                data-testid={`power-user-artifact-share-${artifactId || index}`}
                className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-subtle px-2.5 py-1.5 text-xs font-semibold text-zaki-primary hover:bg-zaki-hover disabled:opacity-50"
              >
                <Share2 className="size-3.5" aria-hidden />
                {t("zakiControls.powerUser.artifacts.share")}
              </button>
              <button
                type="button"
                disabled={!artifactId || !shareUrl || busyId === `artifact-revoke:${artifactId}`}
                onClick={() => void handleArtifactRevoke(artifact)}
                data-testid={`power-user-artifact-revoke-${artifactId || index}`}
                className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-subtle px-2.5 py-1.5 text-xs font-semibold text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary disabled:opacity-50"
              >
                <Link2Off className="size-3.5" aria-hidden />
                {t("zakiControls.powerUser.artifacts.revoke")}
              </button>
              {ARTIFACT_EXPORT_FORMATS.slice(0, 3).map((format) => (
                <button
                  key={format}
                  type="button"
                  disabled={!artifactId || busyId === `artifact-export:${artifactId}:${format}`}
                  onClick={() => void handleArtifactExport(artifact, format)}
                  data-testid={`power-user-artifact-export-${format}-${artifactId || index}`}
                  className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-subtle px-2.5 py-1.5 font-mono-ui text-[11px] font-semibold uppercase text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary disabled:opacity-50"
                >
                  <Download className="size-3.5" aria-hidden />
                  {format}
                </button>
              ))}
            </div>
          </article>
        );
      })}
      <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
        {t("zakiControls.powerUser.artifacts.footer")}
      </div>
    </div>
  );

  const renderTrace = () => (
    <div className="space-y-3" data-testid="power-user-trace">
      {tracesLoading && !traces ? (
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          {t("zakiControls.powerUser.trace.loading")}
        </div>
      ) : null}
      {tracesError ? (
        <div className="rounded-zaki-lg border border-rose-400/40 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-100">
          {t("zakiControls.powerUser.trace.unavailable", { error: tracesError })}
        </div>
      ) : null}
      {traces && traces.length === 0 ? (
        <div className="rounded-zaki-lg border border-zaki bg-zaki-raised px-4 py-6 text-center text-sm text-zaki-muted dark:bg-zaki-dark-card dark:border-zaki-dark-card">
          {t("zakiControls.powerUser.trace.empty")}
        </div>
      ) : null}
      {(traces || []).map((trace, index) => {
        const traceId = getTraceId(trace);
        const shareUrl = getPublicShareUrl(trace);
        const eventCount = Array.isArray(trace.events) ? trace.events.length : null;
        return (
          <article
            key={traceId || index}
            className="rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-zaki-dark-card dark:border-zaki-dark-card"
            data-testid="power-user-trace-item"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-mono-ui text-xs font-semibold text-zaki-primary">
                  {traceId || t("zakiControls.powerUser.trace.unknownRun")}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zaki-muted">
                  <span>{trace.status || "unknown"}</span>
                  <span>{formatTs(trace.started_at)}</span>
                  {eventCount != null ? (
                    <span>
                      {t("zakiControls.powerUser.trace.events", { count: eventCount })}
                    </span>
                  ) : null}
                </div>
              </div>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-zaki-md border border-zaki-subtle text-zaki-secondary hover:text-zaki-primary"
                  aria-label={t("zakiControls.powerUser.trace.openShared")}
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!traceId || busyId === `trace-share:${traceId}`}
                onClick={() => void handleTraceShare(trace)}
                data-testid={`power-user-trace-share-${traceId || index}`}
                className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-subtle px-2.5 py-1.5 text-xs font-semibold text-zaki-primary hover:bg-zaki-hover disabled:opacity-50"
              >
                <Share2 className="size-3.5" aria-hidden />
                {t("zakiControls.powerUser.trace.share")}
              </button>
              <button
                type="button"
                disabled={!traceId || !shareUrl || busyId === `trace-revoke:${traceId}`}
                onClick={() => void handleTraceRevoke(trace)}
                data-testid={`power-user-trace-revoke-${traceId || index}`}
                className="inline-flex items-center gap-1.5 rounded-zaki-md border border-zaki-subtle px-2.5 py-1.5 text-xs font-semibold text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary disabled:opacity-50"
              >
                <Link2Off className="size-3.5" aria-hidden />
                {t("zakiControls.powerUser.trace.revoke")}
              </button>
            </div>
          </article>
        );
      })}
      <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
        {t("zakiControls.powerUser.trace.footer")}
      </div>
    </div>
  );

  const body = useMemo(() => {
    if (tab === "controls") return renderControls();
    if (tab === "approvals") return renderApprovals();
    if (tab === "browser") return renderBrowser();
    if (tab === "artifacts") return renderArtifacts();
    if (tab === "trace") return renderTrace();
    if (tab === "context") return renderContext();
    if (tab === "usage") return renderUsage();
    return renderMemory();
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
    agentDiagnostics,
    agentDiagnosticsLoading,
    agentDiagnosticsError,
    artifacts,
    artifactsLoading,
    artifactsError,
    traces,
    tracesLoading,
    tracesError,
    artifactEventCount,
    activeSessionKey,
    activeMode,
    modePending,
    onModeChange,
    contextPressurePercent,
    sandbox,
    pendingCount,
  ]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title={t("zakiControls.powerUser.title")}
      icon={<Sparkles className="size-4" />}
      subtitle={t("zakiControls.powerUser.subtitle")}
      width="lg"
      padded={false}
    >
      <div className="zaki-agent-power-sheet">
        {header}
        {body}
      </div>
    </SheetShell>
  );
}
