import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  Layers3,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { HireHealth, HireReadiness } from "@/lib/hireApi";
import {
  HIRE_VIEWS,
  type HireView,
  extractError,
  hireProductState,
  isHealthy,
  readinessLabel,
  readinessTone,
} from "./hireUi";

function viewTitle(view: HireView) {
  if (view === "dashboard") return "Today command center";
  return HIRE_VIEWS.find((item) => item.view === view)?.label || "Hire";
}

function HeaderMetric({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  tone?: "default" | "brand" | "success" | "warning";
}) {
  const toneClass =
    tone === "brand"
      ? "zaki-hire-score-mid"
      : tone === "success"
        ? "zaki-hire-score-high"
        : tone === "warning"
          ? "zaki-hire-score-mid"
          : "zaki-hire-muted";
  return (
    <div className="zaki-hire-panel min-w-[136px] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="zaki-hire-label">{label}</span>
        <span className={cn("zaki-hire-icon-button size-7 border-0", toneClass)}>{icon}</span>
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span className="zaki-hire-num text-xl font-semibold leading-none">{value}</span>
        <span className="zaki-hire-muted truncate pb-0.5 text-[11px]">{detail}</span>
      </div>
    </div>
  );
}

export function HireShellHeader({
  activeView,
  leadsCount,
  approvedCount,
  generatedCount,
  profileSignals,
  readiness,
  readinessLoading,
  readinessError,
  scanPending,
  stopPending,
  actionsDisabled,
  onRefresh,
  onStop,
  onScan,
}: {
  activeView: HireView;
  leadsCount: number;
  approvedCount: number;
  generatedCount: number;
  profileSignals: number;
  readiness: HireReadiness | undefined;
  readinessLoading: boolean;
  readinessError: unknown;
  scanPending: boolean;
  stopPending: boolean;
  actionsDisabled: boolean;
  onRefresh: () => void;
  onStop: () => void;
  onScan: () => void;
}) {
  const state = hireProductState(readiness, readinessLoading, readinessError);
  return (
    <header className="zaki-hire-panel-strong p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="zaki-hire-label flex items-center gap-2">
            <BriefcaseBusiness className="size-4" style={{ color: "var(--v2-accent)" }} />
            ZAKI Hire
          </div>
          <h1 className="zaki-hire-title mt-2">
            {viewTitle(activeView)}
          </h1>
          <p className="zaki-hire-subtitle mt-2 max-w-2xl">
            Profile evidence, opportunity fit, generated packages, and apply consent in one operations console.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            <a className="zaki-hire-link" href="/settings#settings-account">account</a>
            <a className="zaki-hire-link" href="/settings#settings-billing">billing</a>
            <a className="zaki-hire-link" href="/settings#settings-usage">usage</a>
            <a className="zaki-hire-link" href="/settings#settings-privacy">privacy</a>
            <a className="zaki-hire-link" href="/settings#settings-connections">OAuth</a>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="zaki-hire-button" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            Refresh
          </button>
          <button
            type="button"
            className="zaki-hire-button"
            disabled={actionsDisabled || stopPending}
            onClick={onStop}
          >
            <Square className="size-4" />
            Stop
          </button>
          <button
            type="button"
            className="zaki-hire-button zaki-hire-button-primary"
            disabled={actionsDisabled || scanPending}
            onClick={onScan}
          >
            {scanPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run scan
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <HeaderMetric label="Leads" value={leadsCount} detail={`${approvedCount} active`} icon={<Layers3 className="size-3.5" />} />
        <HeaderMetric label="Ready" value={generatedCount} detail="packages" icon={<FileCheck2 className="size-3.5" />} tone="success" />
        <HeaderMetric label="Profile" value={`${profileSignals}/8`} detail="signals" icon={<Target className="size-3.5" />} tone={profileSignals >= 6 ? "success" : "warning"} />
        <HeaderMetric
          label="Meter"
          value="central"
          detail={state === "operational" ? "grant required" : state}
          icon={<Gauge className="size-3.5" />}
          tone="brand"
        />
      </div>
    </header>
  );
}

function StatusPill({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("zaki-hire-status", className)}>
      {icon}
      {label}
    </span>
  );
}

export function HireStatusBand({
  readiness,
  readinessLoading,
  readinessError,
  health,
  healthLoading,
  healthError,
  status,
  dueFollowups,
}: {
  readiness: HireReadiness | undefined;
  readinessLoading: boolean;
  readinessError: unknown;
  health: HireHealth | undefined;
  healthLoading: boolean;
  healthError: unknown;
  status: { scanning?: boolean; reevaluating?: boolean } | undefined;
  dueFollowups: number;
}) {
  const state = hireProductState(readiness, readinessLoading, readinessError);
  return (
    <section className="zaki-hire-panel p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill
            icon={
              readinessLoading && !readiness
                ? <Loader2 className="size-3.5 animate-spin" />
                : readiness?.available
                  ? <CheckCircle2 className="size-3.5" />
                  : <AlertCircle className="size-3.5" />
            }
            label={readinessLabel(readiness, readinessLoading)}
            className={readinessTone(readiness, readinessLoading, readinessError)}
          />
          <StatusPill
            icon={isHealthy(health) ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
            label={healthLoading ? "Checking engine" : isHealthy(health) ? "Engine online" : "Engine needs attention"}
            className={
              isHealthy(health)
                ? "zaki-hire-status-success"
                : "zaki-hire-status-warn"
            }
          />
          <StatusPill
            icon={<Activity className="size-3.5" />}
            label={`Scan ${status?.scanning ? "running" : "idle"}`}
            className={status?.scanning ? "zaki-hire-status-success" : "zaki-hire-status-muted"}
          />
          <StatusPill
            icon={<RefreshCw className="size-3.5" />}
            label={`Re-eval ${status?.reevaluating ? "running" : "idle"}`}
            className={status?.reevaluating ? "zaki-hire-status-success" : "zaki-hire-status-muted"}
          />
          {dueFollowups > 0 ? (
            <StatusPill
              icon={<Clock3 className="size-3.5" />}
              label={`${dueFollowups} due follow-up${dueFollowups === 1 ? "" : "s"}`}
              className="zaki-hire-status-warn"
            />
          ) : null}
        </div>
        <div className="zaki-hire-text min-w-0 text-xs">
          {state !== "operational" ? <span className="zaki-hire-label mr-2">state: {readinessLabel(readiness, readinessLoading)}</span> : null}
          {healthError ? <span style={{ color: "var(--v2-accent)" }}>{extractError(healthError)}</span> : null}
          {readiness?.message || readinessError ? (
            <span>{readiness?.message || extractError(readinessError)}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HireMobileViewNav({ activeView, onView }: { activeView: HireView; onView: (view: HireView) => void }) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Hire views">
      {HIRE_VIEWS.map((item) => (
        <button
          key={item.view}
          type="button"
          onClick={() => onView(item.view)}
          className={cn(
            "zaki-hire-nav-button inline-flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors",
            activeView === item.view && "is-active",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
