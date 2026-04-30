import { create } from "zustand";
import { persist } from "zustand/middleware";

export const CONTEXT_PRESSURE_WARNING = 70;
export const CONTEXT_PRESSURE_NEAR_LIMIT = 90;

export type AgentSessionMode = "plan" | "execute" | "review";

export type BotSandboxBackend = "docker" | "e2b" | "daytona" | string;

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
  mode: AgentSessionMode;
  approvalCount: number;
  pendingApprovals: ZakiSessionApprovalRequest[];
  lastChannel: string | null;
  contextPressurePercent: number | null;
  contextPressureState: ZakiContextPressureState;
};

type PersistedSessionUi = Pick<ZakiSessionUi, "mode" | "lastChannel">;

type ZakiSessionUiState = {
  sessions: Record<string, ZakiSessionUi>;
  sandbox: ZakiRuntimeSandbox | null;
};

type ZakiSessionUiStore = ZakiSessionUiState & {
  ensureSession: (sessionKey: string) => void;
  setMode: (sessionKey: string, mode: AgentSessionMode) => void;
  setApprovalCount: (sessionKey: string, approvalCount: number) => void;
  incrementApprovalCount: (sessionKey: string, approval?: ZakiSessionApprovalRequest | null) => void;
  decrementApprovalCount: (sessionKey: string, approvalId?: string | null) => void;
  setLastChannel: (sessionKey: string, lastChannel: string | null) => void;
  setContextPressure: (sessionKey: string, contextPressurePercent: number | null) => void;
  setSandbox: (sandbox: ZakiRuntimeSandbox | null) => void;
};

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
    mode: "execute",
    approvalCount: 0,
    pendingApprovals: [],
    lastChannel: null,
    contextPressurePercent: null,
    contextPressureState: null,
    ...overrides,
  };
}

function normalizeSessionKey(sessionKey: string): string {
  const raw = String(sessionKey || "").trim();
  // Normalize agent session keys: agent:zaki-bot:user:N:thread:X -> canonical form
  return raw;
}

export const useZakiSessionUiStore = create<ZakiSessionUiStore>()(
  persist(
    (set, get) => ({
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

      setApprovalCount: (sessionKey, approvalCount) => {
        const normalized = normalizeSessionKey(sessionKey);
        if (!normalized) return;
        set((state) => ({
          sessions: {
            ...state.sessions,
            [normalized]: createDefaultSessionUi({
              ...state.sessions[normalized],
              approvalCount: Math.max(0, approvalCount),
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
                approvalCount: Math.max(0, (current?.approvalCount ?? 0) + 1),
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
            : (current?.pendingApprovals ?? []).slice(1);
          return {
            sessions: {
              ...state.sessions,
              [normalized]: createDefaultSessionUi({
                ...current,
                approvalCount: Math.max(0, (current?.approvalCount ?? 0) - 1),
                pendingApprovals: nextPendingApprovals,
              }),
            },
          };
        });
      },

      setLastChannel: (sessionKey, lastChannel) => {
        const normalized = normalizeSessionKey(sessionKey);
        if (!normalized) return;
        set((state) => ({
          sessions: {
            ...state.sessions,
            [normalized]: createDefaultSessionUi({
              ...state.sessions[normalized],
              lastChannel,
            }),
          },
        }));
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
    }),
    {
      name: "zaki-session-ui-storage",
      partialize: (state) => ({
        sessions: Object.fromEntries(
          Object.entries(state.sessions).map(([key, value]) => [
            key,
            {
              mode: value.mode,
              lastChannel: value.lastChannel,
            } satisfies PersistedSessionUi,
          ])
        ),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ZakiSessionUiState>;
        const persistedSessions = persistedState.sessions || {};
        return {
          ...current,
          sessions: Object.fromEntries(
            Object.entries(persistedSessions).map(([key, value]) => [
              key,
              createDefaultSessionUi(value as Partial<ZakiSessionUi>),
            ])
          ),
        };
      },
    }
  )
);
