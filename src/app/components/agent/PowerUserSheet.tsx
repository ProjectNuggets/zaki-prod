import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Brain,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetShell } from "@/app/components/ui/zaki";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

export type PowerUserTab = "approvals" | "context" | "memory_doctor";

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
];

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

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

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

  const renderContext = () => (
    <div className="space-y-3" data-testid="power-user-context">
      <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Window usage</span>
          <span className="font-mono-ui">
            {formatPct(contextSnapshot?.usagePct)} ·{" "}
            {formatCount(contextSnapshot?.usedTokens)} /{" "}
            {formatCount(contextSnapshot?.totalTokens)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Turns in context</span>
          <span className="font-mono-ui">
            {formatCount(contextSnapshot?.turnsInContext)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Compacted turns</span>
          <span className="font-mono-ui">
            {formatCount(contextSnapshot?.compactedTurns)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Last compaction</span>
          <span className="font-mono-ui">
            {formatTs(contextSnapshot?.lastCompactionAt)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zaki-secondary">Provider fallbacks (session)</span>
          <span className="font-mono-ui">
            {formatCount(contextSnapshot?.providerFallbackCount)}
          </span>
        </div>
      </div>
      <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
        Context detail is read-only. Compaction and fallback events also appear
        as banners above the thread (see W3.5).
      </div>
    </div>
  );

  const renderMemoryDoctor = () => (
    <div className="space-y-3" data-testid="power-user-memory-doctor">
      <div className="grid gap-2 rounded-zaki-lg border border-zaki bg-zaki-raised p-4 text-sm dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]">
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
          <span className="text-zaki-secondary">Last conflict</span>
          <span className="font-mono-ui">
            {formatTs(memoryHealth?.lastConflictAt)}
          </span>
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
      <div className="rounded-zaki-lg border border-dashed border-zaki bg-transparent p-3 text-2xs leading-relaxed text-zaki-muted">
        For edit/forget, open the Memory pane. This tab is diagnostic only.
      </div>
    </div>
  );

  const body = useMemo(() => {
    if (tab === "approvals") return renderApprovals();
    if (tab === "context") return renderContext();
    return renderMemoryDoctor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pendingApprovals, contextSnapshot, memoryHealth, busyId]);

  return (
    <SheetShell
      isOpen={isOpen}
      onClose={onClose}
      title="Controls"
      icon={<Sparkles className="size-4" />}
      subtitle="Approvals, context, memory health"
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
