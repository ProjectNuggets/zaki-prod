import { create } from "zustand";
import type { AgentSession, AgentSessionMode, BotSandboxBackend } from "@/lib/api";
import { normalizeZakiSessionKey } from "@/lib/zakiSessions";

export const CONTEXT_PRESSURE_WARNING = 70;
export const CONTEXT_PRESSURE_NEAR_LIMIT = 90;

export type ZakiContextPressureState = "normal" | "warning" | "near_limit" | null;

export type ZakiRuntimeSandbox = {
  enabled: boolean;
  backend: BotSandboxBackend | null;
};

export type ZakiSessionApprovalRequest = {
  id: string;
  tool: string;
  reason: string;
  riskLevel: string;
  timestamp: number;
};

export type ZakiSessionUi = {
  mode: AgentSessionMode | null;
  approvalCount: number;
  pendingApprovals: ZakiSessionApprovalRequest[];
  lastChannel: string | null;
  contextPressurePercent: number | null;
  contextPressureState: ZakiContextPressureState;
  live: boolean | null;
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
  // 2026-05-08 — Only include fields when the source response actually
  // returns them. The session list response (every 30s tick) historically
  // omitted context_pressure_percent and pending_approvals for non-live
  // sessions, so spreading default values here was wiping live state that
  // other endpoints had already written. Authoritative sources own each
  // field; let the list ticks be additive only.
  if (typeof session.context_pressure_percent === "number") {
    patch.contextPressurePercent = session.context_pressure_percent;
    patch.contextPressureState = getContextPressureState(session.context_pressure_percent);
  }
  if (typeof session.pending_approval_count === "number") {
    patch.approvalCount = Math.max(0, session.pending_approval_count);
  }
  if (Array.isArray(session.pending_approvals)) {
    patch.pendingApprovals = session.pending_approvals
      .map((approval) => {
        const id = String(approval?.id || "").trim();
        if (!id) return null;
        return {
          id,
          tool: String(approval?.tool || "").trim(),
          reason: String(approval?.reason || "").trim(),
          riskLevel: String(approval?.risk_level || "").trim(),
          timestamp: Date.now(),
        } satisfies ZakiSessionApprovalRequest;
      })
      .filter((approval): approval is ZakiSessionApprovalRequest => approval != null);
  }
  return patch;
}

export function getContextPressureState(
  contextPressurePercent: number | null | undefined
): ZakiContextPressureState {
  if (typeof contextPressurePercent !== "number" || Number.isNaN(contextPressurePercent)) {
    return null;
  }
  if (contextPressurePercent >= CONTEXT_PRESSURE_NEAR_LIMIT) return "near_limit";
  if (contextPressurePercent >= CONTEXT_PRESSURE_WARNING) return "warning";
  return "normal";
}

function createDefaultSessionUi(overrides?: Partial<ZakiSessionUi>): ZakiSessionUi {
  return {
    mode: null,
    approvalCount: 0,
    pendingApprovals: [],
    lastChannel: null,
    contextPressurePercent: null,
    contextPressureState: null,
    live: null,
    ...overrides,
  };
}

function normalizeSessionKey(sessionKey: string) {
  return normalizeZakiSessionKey(String(sessionKey || "").trim());
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
    set((state) => ({
      sessions: {
        ...state.sessions,
        [normalized]: createDefaultSessionUi({
          ...state.sessions[normalized],
          ...patch,
          contextPressureState: getContextPressureState(
            patch.contextPressurePercent ?? state.sessions[normalized]?.contextPressurePercent ?? null
          ),
        }),
      },
    }));
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
      const nextPendingApprovals =
        approval && !pendingApprovals.some((entry) => entry.id === approval.id)
          ? [...pendingApprovals, approval]
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
          contextPressureState: getContextPressureState(contextPressurePercent),
        }),
      },
    }));
  },

  setSandbox: (sandbox) => {
    set({ sandbox });
  },
}));
