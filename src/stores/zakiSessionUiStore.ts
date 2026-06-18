import { create } from "zustand";
import type { AgentSession, AgentSessionMode, BotSandboxBackend } from "@/lib/api";
import { normalizeZakiSessionKey } from "@/lib/zakiSessions";
import type { BrowserFrame } from "@/types";

// 2026-05-08 — Removed FE-side pressure buckets (CONTEXT_PRESSURE_WARNING /
// CONTEXT_PRESSURE_NEAR_LIMIT and getContextPressureState).
//
// The buckets were arbitrary thresholds (50/75 originally, bumped to 70/90
// in commit dae57e1) with no relationship to the actual compaction trigger.
// The real trigger lives in nullalis (the upstream agent runtime) and is
// reported per-session as `compaction_threshold_pct` in the diagnostics
// report. The Express BFF (backend/src/index.js:10200) is a transparent
// proxy to /api/v1/users/{userId}/sessions/{key}/context — it does not
// compute pressure, it forwards whatever nullalis returns.
//
// Per Nova: meter mirrors token pressure 1:1. No FE-derived tiers.
// PowerUserSheet diagnostics still want a coarse signal; if needed it can
// be re-added there using report.compaction_threshold_pct as the source of
// truth, not a hardcoded constant in this store.

export type ZakiRuntimeSandbox = {
  enabled: boolean;
  backend: BotSandboxBackend | null;
};

export type ZakiSessionApprovalRequest = {
  id: string;
  approvalId?: string | null;
  numericId?: number | string | null;
  toolCallId?: string | null;
  tool: string;
  reason: string;
  riskLevel: string;
  timestamp: number;
  intent?: string | null;
  params?: unknown;
  allowForSessionSafe?: boolean;
  inputPreview?: string | null;
  effectPreview?: string | null;
  command?: string | null;
  files?: string[];
  expiresAt?: string | null;
};

export type ZakiSessionUi = {
  mode: AgentSessionMode | null;
  approvalCount: number;
  pendingApprovals: ZakiSessionApprovalRequest[];
  lastChannel: string | null;
  contextPressurePercent: number | null;
  live: boolean | null;
  browserFrame: BrowserFrame | null;
};

type ZakiSessionUiState = {
  sessions: Record<string, ZakiSessionUi>;
  sandbox: ZakiRuntimeSandbox | null;
};

type ZakiSessionUiStore = ZakiSessionUiState & {
  ensureSession: (sessionKey: string) => void;
  hydrateSession: (sessionKey: string, patch: Partial<ZakiSessionUi>) => void;
  setMode: (sessionKey: string, mode: AgentSessionMode) => void;
  incrementApprovalCount: (sessionKey: string, approval?: ZakiSessionApprovalRequest | null) => void;
  decrementApprovalCount: (sessionKey: string, approvalId?: string | null) => void;
  setContextPressure: (sessionKey: string, contextPressurePercent: number | null) => void;
  setBrowserFrame: (sessionKey: string, frame: BrowserFrame | null) => void;
  setSandbox: (sandbox: ZakiRuntimeSandbox | null) => void;
};

export function mapAgentSessionToZakiSessionUi(session: Partial<AgentSession>): Partial<ZakiSessionUi> {
  const mode =
    session.mode === "plan" || session.mode === "execute" || session.mode === "review"
      ? session.mode
      : null;
  const patch: Partial<ZakiSessionUi> = {
    mode,
    lastChannel:
      typeof session.last_channel === "string" && session.last_channel.trim().length > 0
        ? session.last_channel.trim()
        : null,
    live: typeof session.live === "boolean" ? session.live : null,
  };
  // Session list/detail hydration owns posture and approval cards, not context
  // pressure. `/api/agent/sessions/:key/context` is the only store writer for
  // exact pressure, so stale summaries cannot masquerade as live context.
  if (typeof session.pending_approval_count === "number") {
    patch.approvalCount = Math.max(0, session.pending_approval_count);
  }
  if (Array.isArray(session.pending_approvals)) {
    patch.pendingApprovals = session.pending_approvals
      .map((approval) => {
        const approvalId = String(approval?.approval_id || "").trim();
        const numericId =
          typeof approval?.id === "number" || typeof approval?.id === "string"
            ? approval.id
            : null;
        const displayId = approvalId || (numericId != null ? `legacy:${String(numericId)}` : "");
        if (!displayId) return null;
        const createdAtRaw =
          typeof approval?.created_at === "number" || typeof approval?.created_at === "string"
            ? Number(approval.created_at)
            : null;
        const createdAtMs =
          createdAtRaw != null && Number.isFinite(createdAtRaw) && createdAtRaw > 0
            ? createdAtRaw * 1000
            : 0;
        const mapped: ZakiSessionApprovalRequest = {
          id: displayId,
          approvalId: approvalId || null,
          numericId,
          toolCallId:
            typeof approval?.tool_call_id === "string" && approval.tool_call_id.trim()
              ? approval.tool_call_id.trim()
              : null,
          tool: String(approval?.tool || "").trim(),
          reason: String(approval?.reason || "").trim(),
          riskLevel: String(approval?.risk_level || "").trim(),
          intent:
            typeof approval?.intent === "string" && approval.intent.trim()
              ? approval.intent.trim()
              : typeof approval?.human_intent === "string" && approval.human_intent.trim()
                ? approval.human_intent.trim()
                : null,
          params:
            approval && typeof approval === "object" && "params" in approval
              ? (approval as Record<string, unknown>).params
              : approval && typeof approval === "object" && "arguments" in approval
                ? (approval as Record<string, unknown>).arguments
                : approval && typeof approval === "object" && "args" in approval
                  ? (approval as Record<string, unknown>).args
                  : undefined,
          allowForSessionSafe:
            approval?.allow_for_session === true ||
            approval?.allowForSession === true ||
            approval?.session_allow_safe === true ||
            approval?.sessionAllowSafe === true,
          // Sentinel: 0 means "use the existing in-store timestamp if any,
          // otherwise stamp now". hydrateSession resolves this — keeping
          // the mapper pure (no store reads) while still preserving the
          // original approval-creation time across re-hydrations.
          timestamp: createdAtMs,
          expiresAt:
            typeof approval?.expires_at === "number"
              ? new Date(approval.expires_at * 1000).toISOString()
              : typeof approval?.expires_at === "string" && approval.expires_at.trim()
                ? approval.expires_at
                : null,
        };
        return mapped;
      })
      .filter((approval): approval is ZakiSessionApprovalRequest => approval != null);
  }
  return patch;
}

function createDefaultSessionUi(overrides?: Partial<ZakiSessionUi>): ZakiSessionUi {
  return {
    mode: null,
    approvalCount: 0,
    pendingApprovals: [],
    lastChannel: null,
    contextPressurePercent: null,
    live: null,
    browserFrame: null,
    ...overrides,
  };
}

function normalizeSessionKey(sessionKey: string) {
  return normalizeZakiSessionKey(String(sessionKey || "").trim());
}

// Resolve sentinel timestamps (0) on incoming approvals: prefer the existing
// store timestamp if the same id is already known, otherwise stamp now.
function resolveApprovalTimestamps(
  incoming: ZakiSessionApprovalRequest[],
  existing: ZakiSessionApprovalRequest[] | undefined
): ZakiSessionApprovalRequest[] {
  if (!existing || existing.length === 0) {
    const now = Date.now();
    return incoming.map((a) => (a.timestamp === 0 ? { ...a, timestamp: now } : a));
  }
  const byId = new Map(existing.map((a) => [a.id, a]));
  const now = Date.now();
  return incoming.map((a) => {
    if (a.timestamp !== 0) return a;
    const prior = byId.get(a.id);
    return { ...a, timestamp: prior?.timestamp ?? now };
  });
}

export const useZakiSessionUiStore = create<ZakiSessionUiStore>()((set, get) => ({
  sessions: {},
  sandbox: null,

  ensureSession: (sessionKey) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    const existing = get().sessions[normalized];
    if (existing) return;
    set((state) => ({
      sessions: {
        ...state.sessions,
        [normalized]: createDefaultSessionUi(),
      },
    }));
  },

  hydrateSession: (sessionKey, patch) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => {
      const current = state.sessions[normalized];
      const merged = createDefaultSessionUi({
        ...current,
        ...patch,
      });
      // Resolve approval timestamp sentinels against the prior in-store
      // entries so the original approval-creation time is preserved across
      // list refetches and detail refreshes.
      if (patch.pendingApprovals) {
        merged.pendingApprovals = resolveApprovalTimestamps(
          patch.pendingApprovals,
          current?.pendingApprovals
        );
      }
      return {
        sessions: {
          ...state.sessions,
          [normalized]: merged,
        },
      };
    });
  },

  setMode: (sessionKey, mode) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => ({
      sessions: {
        ...state.sessions,
        [normalized]: createDefaultSessionUi({
          ...state.sessions[normalized],
          mode,
        }),
      },
    }));
  },

  incrementApprovalCount: (sessionKey, approval = null) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => {
      const current = state.sessions[normalized];
      const pendingApprovals = current?.pendingApprovals ?? [];
      // Honor the timestamp-0 sentinel here too, so any caller that
      // forwards an approval shaped by mapAgentSessionToZakiSessionUi
      // gets a real timestamp (existing prior wins, otherwise stamp now).
      // Today only the SSE path calls this with a real Date.now(); the
      // resolution is defensive against future drift.
      const resolvedApproval =
        approval && approval.timestamp === 0
          ? {
              ...approval,
              timestamp:
                pendingApprovals.find((entry) => entry.id === approval.id)?.timestamp ??
                Date.now(),
            }
          : approval;
      const nextPendingApprovals =
        resolvedApproval && !pendingApprovals.some((entry) => entry.id === resolvedApproval.id)
          ? [...pendingApprovals, resolvedApproval]
          : pendingApprovals;
      return {
        sessions: {
          ...state.sessions,
          [normalized]: createDefaultSessionUi({
            ...current,
            approvalCount: nextPendingApprovals.length,
            pendingApprovals: nextPendingApprovals,
          }),
        },
      };
    });
  },

  decrementApprovalCount: (sessionKey, approvalId = null) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => {
      const current = state.sessions[normalized];
      const nextPendingApprovals = approvalId
        ? (current?.pendingApprovals ?? []).filter((entry) => entry.id !== approvalId)
        : [];
      return {
        sessions: {
          ...state.sessions,
          [normalized]: createDefaultSessionUi({
            ...current,
            approvalCount: Math.max(0, nextPendingApprovals.length),
            pendingApprovals: nextPendingApprovals,
          }),
        },
      };
    });
  },

  setContextPressure: (sessionKey, contextPressurePercent) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => ({
      sessions: {
        ...state.sessions,
        [normalized]: createDefaultSessionUi({
          ...state.sessions[normalized],
          contextPressurePercent,
        }),
      },
    }));
  },

  setBrowserFrame: (sessionKey, frame) => {
    const normalized = normalizeSessionKey(sessionKey);
    if (!normalized) return;
    set((state) => ({
      sessions: {
        ...state.sessions,
        [normalized]: createDefaultSessionUi({
          ...state.sessions[normalized],
          browserFrame: frame,
        }),
      },
    }));
  },

  setSandbox: (sandbox) => {
    set({ sandbox });
  },
}));
