/**
 * ChatArea Component Tests
 * Focused smoke tests aligned with current ChatArea architecture.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { act } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ChatArea,
  buildZakiProcessSnapshot,
  buildLatestStatusMeta,
  extractProgressPayload,
  extractNullalisNarrationFrame,
  extractNullalisReasoningNarrationFrame,
  extractNullalisApprovalRequest,
  extractNullalisTranscriptEntry,
  extractNullalisTaskItem,
  extractNullalisTodoTaskItemsFromToolPayload,
  extractNullalisUsageSummary,
  inferStreamingModeFromContext,
  inferStreamingModeFromProgress,
  buildNullalisContextGauge,
  resolveContextGaugePercent,
} from "./ChatArea";
import { useNavigationStore, useAuthStore, useZakiSessionUiStore } from "@/stores";
import { useMessages } from "@/queries/useThreads";
import {
  apiRequest,
  approveAgentSession,
  cancelAgentSession,
  fetchAgentExtensionDiagnostics,
  fetchAgentDiagnostics,
  fetchAgentMe,
  fetchAgentSession,
  fetchAgentSessionContext,
  fetchAgentSessionHistory,
  fetchContextDiagnostics,
  fetchBotRuntimeStatus,
  fetchMemoryActivity,
  listAgentSessions,
  listAgentJobs,
  provisionAgent,
  setAgentSessionMode,
} from "@/lib/api";
import { ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY } from "./ZakiExperimentalNotice";

jest.mock("@/lib/api", () => ({
  apiRequest: jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({}),
    headers: new Headers(),
  })),
  provisionAgent: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ status: "provisioned" }),
    },
    data: { status: "provisioned" },
  })),
  fetchAgentHistory: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ history: [] }),
    },
    data: { history: [] },
  })),
  fetchAgentSessionHistory: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ messages: [] }),
      headers: new Headers(),
    },
    data: { messages: [] },
  })),
  fetchAgentSessionTodos: jest.fn(async () => ({
    response: { ok: true, status: 200, json: async () => ({ lists: [] }), headers: new Headers() },
    data: { lists: [] },
  })),
  fetchAgentSessionPlan: jest.fn(async () => ({
    response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
    data: {},
  })),
  fetchAgentTrace: jest.fn(async () => ({
    response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
    data: {},
  })),
  fetchAgentTask: jest.fn(async () => ({
    response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
    data: {},
  })),
  updateAgentSessionTodoItem: jest.fn(async () => ({
    response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
    data: {},
  })),
  fetchAgentMe: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ userId: null }),
    },
    data: { userId: null },
  })),
  fetchMemoryActivity: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ activities: [] }),
    },
    data: { activities: [] },
  })),
  fetchBotRuntimeStatus: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ sandbox: { enabled: false, backend: null } }),
      headers: new Headers(),
    },
    data: { sandbox: { enabled: false, backend: null } },
  })),
  fetchAgentSessionContext: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ session_key: "agent:zaki-bot:user:1:thread:main" }),
      headers: new Headers(),
    },
    data: { session_key: "agent:zaki-bot:user:1:thread:main" },
  })),
  fetchContextDiagnostics: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ report: null }),
      headers: new Headers(),
    },
    data: { report: null },
  })),
  fetchAgentSession: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({
        session_key: "agent:zaki-bot:user:1:thread:main",
        live: true,
        mode: "execute",
        pending_approval_count: 0,
        context_pressure_percent: null,
      }),
      headers: new Headers(),
    },
    data: {
      session_key: "agent:zaki-bot:user:1:thread:main",
      live: true,
      mode: "execute",
      pending_approval_count: 0,
      context_pressure_percent: null,
    },
  })),
  deleteAgentSession: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    },
    data: { ok: true },
  })),
  listAgentSessions: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ sessions: [] }),
      headers: new Headers(),
    },
    data: { sessions: [] },
  })),
  setAgentSessionMode: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, mode: "execute" }),
      headers: new Headers(),
    },
    data: { ok: true, mode: "execute" },
  })),
  approveAgentSession: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    },
    data: { ok: true },
  })),
  appendAgentHistoryMessage: jest.fn(async () => ({
    response: {
      ok: true,
      status: 201,
      json: async () => ({ ok: true, status: "inserted" }),
      headers: new Headers(),
    },
    data: { ok: true, status: "inserted" },
  })),
  cancelAgentSession: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ status: "cancellation_signalled", was_active: true }),
      headers: new Headers(),
    },
    data: { status: "cancellation_signalled", was_active: true },
  })),
  fetchAgentExtensionDiagnostics: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({
        user_id: "1",
        paired: false,
        connected_at_unix: 0,
        last_command_at_unix: 0,
        last_command_tool: "",
        last_command_result: "",
      }),
      headers: new Headers(),
    },
    data: {
      user_id: "1",
      paired: false,
      connected_at_unix: 0,
      last_command_at_unix: 0,
      last_command_tool: "",
      last_command_result: "",
    },
  })),
  fetchAgentDiagnostics: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({
        agentBackendEnabled: true,
        upstreamReady: { ok: true, latencyMs: 20 },
        upstreamHealth: { ok: true, latencyMs: 18 },
        upstreamControlPlane: { extension_ws_enabled: true },
      }),
      headers: new Headers(),
    },
    data: {
      agentBackendEnabled: true,
      upstreamReady: { ok: true, latencyMs: 20 },
      upstreamHealth: { ok: true, latencyMs: 18 },
      upstreamControlPlane: { extension_ws_enabled: true },
    },
  })),
  listAgentCron: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ jobs: [] }),
      headers: new Headers(),
    },
    data: { jobs: [] },
  })),
  listAgentTasks: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ tasks: [] }),
      headers: new Headers(),
    },
    data: { tasks: [] },
  })),
  listAgentJobs: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ jobs: [] }),
      headers: new Headers(),
    },
    data: { jobs: [] },
  })),
  listAgentArtifacts: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ artifacts: [] }),
      headers: new Headers(),
    },
    data: { artifacts: [] },
  })),
  createAgentCron: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      headers: new Headers(),
    },
    data: { ok: true },
  })),
  fetchUsageQuota: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        unlimited: false,
        limit: 10,
        used: 0,
        remaining: 10,
        resetAt: "2026-05-10T00:00:00.000Z",
        bucket: "app_chat",
        surface: "app_chat",
        period: "day",
      }),
      headers: new Headers(),
    },
    data: {
      success: true,
      unlimited: false,
      limit: 10,
      used: 0,
      remaining: 10,
      resetAt: "2026-05-10T00:00:00.000Z",
      bucket: "app_chat",
      surface: "app_chat",
      period: "day",
    },
  })),
}));

jest.mock("@/stores", () => ({
  useNavigationStore: jest.fn(),
  useAuthStore: jest.fn(),
  useZakiSessionUiStore: jest.fn(),
}));

jest.mock("@/queries/useThreads", () => ({
  useMessages: jest.fn(),
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: {
      data: {
        plan: { tier: "free", status: "inactive" },
      },
    },
  }),
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
  }),
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
}));

jest.mock("@/queries/useBrainSearch", () => ({
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? [key] : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

type NavState = {
  view: "home" | "spaces" | "space-detail" | "chat";
  spaceId: string | null;
  threadId: string | null;
  zakiSessionKey: string | null;
  goHome: () => void;
  goToSpaces: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (
    spaceId: string,
    threadId: string,
    options?: { zakiSessionKey?: string | null }
  ) => void;
  clearThread: () => void;
  setZakiSessionKey: (sessionKey: string | null) => void;
};

type TestZakiSessionUiState = {
  sessions: Record<
    string,
    {
      mode: "plan" | "execute" | "review";
      live?: boolean;
      approvalCount: number;
      pendingApprovals: Array<{
        id: string;
        tool: string;
        reason: string;
        riskLevel: string;
        timestamp: number;
      }>;
      lastChannel: string | null;
      contextPressurePercent: number | null;
    }
  >;
  sandbox: { enabled: boolean; backend: string | null } | null;
};

function renderChatArea() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ChatArea />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...view, queryClient };
}

async function renderChatAreaAndWaitForEffects() {
  const result = renderChatArea();
  await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/api/documents/accepted-file-types"));
  return result;
}

describe("ChatArea Component", () => {
  let navState: NavState;
  let authState: { user: { username: string } | null; isLoading: boolean };
  let zakiSessionUiState: TestZakiSessionUiState;

  beforeEach(() => {
    cleanup();
    (apiRequest as jest.Mock).mockClear();
    (fetchAgentSessionHistory as jest.Mock).mockReset();
    (fetchAgentSessionHistory as jest.Mock).mockImplementation(async () => ({
      response: {
        ok: true,
        status: 200,
        json: async () => ({ messages: [] }),
        headers: new Headers(),
      },
      data: { messages: [] },
    }));
    (fetchAgentMe as jest.Mock).mockClear();
    (fetchAgentSession as jest.Mock).mockReset();
    (fetchAgentSession as jest.Mock).mockImplementation(async () => ({
      response: {
        ok: true,
        status: 200,
        json: async () => ({
          session_key: "agent:zaki-bot:user:1:thread:main",
          live: true,
          mode: "execute",
          pending_approval_count: 0,
          context_pressure_percent: null,
        }),
        headers: new Headers(),
      },
      data: {
        session_key: "agent:zaki-bot:user:1:thread:main",
        live: true,
        mode: "execute",
        pending_approval_count: 0,
        context_pressure_percent: null,
      },
    }));
    (fetchAgentSessionContext as jest.Mock).mockClear();
    (fetchBotRuntimeStatus as jest.Mock).mockClear();
    (fetchMemoryActivity as jest.Mock).mockClear();
    (listAgentSessions as jest.Mock).mockClear();
    (listAgentJobs as jest.Mock).mockClear();
    (provisionAgent as jest.Mock).mockClear();
    (setAgentSessionMode as jest.Mock).mockClear();
    (approveAgentSession as jest.Mock).mockClear();
    (cancelAgentSession as jest.Mock).mockClear();
    (fetchAgentExtensionDiagnostics as jest.Mock).mockClear();
    (fetchAgentDiagnostics as jest.Mock).mockClear();
    window.sessionStorage.clear();
    window.localStorage.clear();
    navState = {
      view: "chat",
      spaceId: null,
      threadId: null,
      zakiSessionKey: null,
      goHome: jest.fn(),
      goToSpaces: jest.fn(),
      goToSpace: jest.fn(),
      goToThread: jest.fn(
        (
          spaceId: string,
          threadId: string,
          options?: { zakiSessionKey?: string | null }
        ) => {
          navState.view = "chat";
          navState.spaceId = spaceId;
          navState.threadId = threadId;
          navState.zakiSessionKey = options?.zakiSessionKey ?? null;
        }
      ),
      clearThread: jest.fn(),
      setZakiSessionKey: jest.fn((sessionKey: string | null) => {
        navState.zakiSessionKey = sessionKey;
      }),
    };

    (useNavigationStore as jest.Mock).mockImplementation((selector?: (state: NavState) => unknown) =>
      selector ? selector(navState) : navState
    );

    authState = { user: null, isLoading: false };

    (useAuthStore as jest.Mock).mockImplementation(
      (selector?: (state: { user: { username: string } | null; isLoading: boolean }) => unknown) =>
        selector ? selector(authState) : authState
    );

    zakiSessionUiState = {
      sessions: {},
      sandbox: null,
    };
    const ensureSession = (sessionKey: string) => {
      if (!zakiSessionUiState.sessions[sessionKey]) {
        zakiSessionUiState.sessions[sessionKey] = {
          mode: "execute",
          live: false,
          approvalCount: 0,
          pendingApprovals: [],
          lastChannel: "Web",
          contextPressurePercent: null,
        };
      }
    };
    (useZakiSessionUiStore as jest.Mock).mockImplementation(
      (
        selector?: (state: {
          sessions: TestZakiSessionUiState["sessions"];
          sandbox: TestZakiSessionUiState["sandbox"];
          ensureSession: typeof ensureSession;
          hydrateSession: (
            sessionKey: string,
            patch: Partial<TestZakiSessionUiState["sessions"][string]>
          ) => void;
          setMode: (sessionKey: string, mode: "plan" | "execute" | "review") => void;
          incrementApprovalCount: (sessionKey: string, approval?: unknown) => void;
          decrementApprovalCount: (sessionKey: string) => void;
          setLastChannel: (sessionKey: string, channel: string | null) => void;
          setContextPressure: (sessionKey: string, pressure: number | null) => void;
          setSandbox: (sandbox: TestZakiSessionUiState["sandbox"]) => void;
        }) => unknown
      ) => {
        const state = {
          sessions: zakiSessionUiState.sessions,
          sandbox: zakiSessionUiState.sandbox,
          ensureSession,
          hydrateSession: (
            sessionKey: string,
            patch: Partial<TestZakiSessionUiState["sessions"][string]>
          ) => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey] = {
              ...zakiSessionUiState.sessions[sessionKey],
              ...patch,
            };
          },
          setMode: (sessionKey: string, mode: "plan" | "execute" | "review") => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey].mode = mode;
          },
          incrementApprovalCount: (sessionKey: string, approval?: unknown) => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey].approvalCount += 1;
            if (approval) {
              zakiSessionUiState.sessions[sessionKey].pendingApprovals.push(
                approval as TestZakiSessionUiState["sessions"][string]["pendingApprovals"][number]
              );
            }
          },
          decrementApprovalCount: (sessionKey: string) => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey].approvalCount = Math.max(
              0,
              zakiSessionUiState.sessions[sessionKey].approvalCount - 1
            );
          },
          setLastChannel: (sessionKey: string, channel: string | null) => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey].lastChannel = channel;
          },
          setContextPressure: (sessionKey: string, pressure: number | null) => {
            ensureSession(sessionKey);
            zakiSessionUiState.sessions[sessionKey].contextPressurePercent = pressure;
          },
          setSandbox: (sandbox: TestZakiSessionUiState["sandbox"]) => {
            zakiSessionUiState.sandbox = sandbox;
          },
        };
        return selector ? selector(state) : state;
      }
    );

    (useMessages as jest.Mock).mockReturnValue({ data: [], isLoading: false });
  });

  afterEach(() => {
    cleanup();
  });

  it("normalizes Nullalis session context fields into the context meter model", () => {
    const gauge = buildNullalisContextGauge({
      history_len: 43,
      tokens_used: 33_771,
      token_estimate: 33_771,
      token_limit: 460_000,
      context_window_tokens: 460_000,
      context_pressure_percent: 7.3,
    });

    expect(gauge).toMatchObject({
      tokenCount: 33_771,
      contextMax: 460_000,
      messageCount: 43,
      pressurePercent: 7.3,
    });
    expect(resolveContextGaugePercent(gauge)).toBe(7.3);
  });

  it("does not derive pressure from token counts when backend pressure is absent", () => {
    const gauge = buildNullalisContextGauge({
      history_len: 43,
      token_estimate: 33_771,
      context_window_tokens: 460_000,
    });

    expect(gauge).toMatchObject({
      tokenCount: 33_771,
      contextMax: 460_000,
      messageCount: 43,
      pressurePercent: null,
    });
    expect(resolveContextGaugePercent(gauge)).toBeNull();
  });

  it("does not build a context meter from legacy cumulative token totals", () => {
    const gauge = buildNullalisContextGauge({
      tokens_used: 999_999,
      token_limit: 100_000,
      context_pressure_percent: 100,
    });

    expect(gauge).toBeNull();
  });

  it("does not trust active/live flags as proof that legacy token totals are context-window totals", () => {
    const gauge = buildNullalisContextGauge({
      active: true,
      live: true,
      tokens_used: 999_999,
      token_limit: 100_000,
      context_pressure_percent: 100,
    });

    expect(gauge).toBeNull();
  });

  it("lets a canonical report override legacy top-level token totals", () => {
    const gauge = buildNullalisContextGauge({
      tokens_used: 999_999,
      token_limit: 100_000,
      context_pressure_percent: 100,
      report: {
        history_len: 3,
        token_estimate: 6_000,
        context_window_tokens: 120_000,
        context_pressure_percent: 5,
      },
    });

    expect(gauge).toMatchObject({
      tokenCount: 6_000,
      contextMax: 120_000,
      messageCount: 3,
      pressurePercent: 5,
    });
  });

  it("uses canonical pressure_percent and backend compaction metadata", () => {
    const gauge = buildNullalisContextGauge({
      status: "live",
      sampled_at_ms: 1770000000000,
      model: "openai/gpt-5.2",
      token_estimate: 6_400,
      context_window_tokens: 128_000,
      pressure_percent: 5,
      remaining_tokens: 121_600,
      context_window_source: "model_capability",
      token_compaction_recommended: false,
      compaction: {
        nudge_percent: 50,
        pass_a_percent: 70,
        pass_c_percent: 90,
        recommended: false,
      },
    });

    expect(gauge).toMatchObject({
      tokenCount: 6_400,
      contextMax: 128_000,
      pressurePercent: 5,
      model: "openai/gpt-5.2",
      remainingTokens: 121_600,
      contextWindowSource: "model_capability",
      compaction: {
        nudgePercent: 50,
        passAPercent: 70,
        passCPercent: 90,
        recommended: false,
      },
    });
  });

  it("does not build a context meter from inactive/unavailable context payloads", () => {
    expect(
      buildNullalisContextGauge({
        active: false,
        reason: "session_manager_unavailable",
      })
    ).toBeNull();
  });

  it("prefers backend context_pressure_percent over a recomputed token ratio", () => {
    const gauge = buildNullalisContextGauge({
      token_count: 10_000,
      context_window_max: 100_000,
      context_pressure_percent: 42,
    });

    expect(resolveContextGaugePercent(gauge)).toBe(42);
  });

  it("keeps pressure-only runtime context samples when token max is omitted", () => {
    const gauge = buildNullalisContextGauge({
      history_len: 3,
      max_history: 0,
      context_pressure_percent: 21,
    });

    expect(gauge).toMatchObject({
      messageCount: 3,
      pressurePercent: 21,
    });
    expect(resolveContextGaugePercent(gauge)).toBe(21);
  });

  it("rejects cumulative-only legacy context samples instead of showing false pressure", () => {
    const gauge = buildNullalisContextGauge({
      history_len: 3,
      tokens_used: 999_999,
      token_limit: 100_000,
      context_pressure_percent: 100,
    });

    expect(gauge).toBeNull();
  });

  it("keeps nested token metadata but does not treat context_window_used_pct as pressure", () => {
    const gauge = buildNullalisContextGauge({
      active: true,
      report: {
        history_messages: 12,
        used_tokens: 25_000,
        context_window_tokens: 200_000,
        context_window_used_pct: 12.5,
      },
    });

    expect(gauge).toMatchObject({
      tokenCount: 25_000,
      contextMax: 200_000,
      messageCount: 12,
      pressurePercent: null,
    });
    expect(resolveContextGaugePercent(gauge)).toBeNull();
  });

  it("surfaces canonical nested context pressure and ignores legacy fallback labels", () => {
    const gauge = buildNullalisContextGauge({
      context_source: "diagnostics_fallback",
      context_confidence: "fallback",
      report: {
        token_estimate: 101_000,
        context_window_tokens: 200_000,
        context_pressure_percent: 50.5,
        token_compaction_threshold: 160_000,
        token_compaction_triggered: true,
        last_turn: {
          auto_compaction_events: 2,
          durable_continuity_refreshed: true,
          memory_context_injected: true,
        },
      },
    });

    expect(gauge).toMatchObject({
      tokenCount: 101_000,
      contextMax: 200_000,
      pressurePercent: 50.5,
    });
  });

  it("renders Agent context pressure from the live session context endpoint", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (fetchAgentSessionContext as jest.Mock).mockResolvedValue({
      response: { ok: true, status: 200, headers: new Headers() },
      data: {
        history_len: 43,
        tokens_used: 33_771,
        token_estimate: 33_771,
        token_limit: 460_000,
        context_window_tokens: 460_000,
        context_pressure_percent: 7.3,
      },
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(fetchAgentSessionContext).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main"
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("zaki-context-meter")).toHaveTextContent("7%");
    });
    expect(
      zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"]?.contextPressurePercent
    ).toBe(7.3);
  });

  it("keeps the trusted live context sample visible while a same-session turn is running", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    window.sessionStorage.setItem("zaki:agentUserId", "1");
    const streamResponsePromise = new Promise<never>(() => {});
    (fetchAgentSessionContext as jest.Mock).mockResolvedValue({
      response: { ok: true, status: 200, headers: new Headers() },
      data: {
        status: "live",
        active: true,
        live: true,
        token_estimate: 67_285,
        context_window_tokens: 262_144,
        pressure_percent: 25,
        context_pressure_percent: 25,
      },
    });
    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (path === "/api/agent/chat/stream") {
        return streamResponsePromise;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers(),
      };
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByTestId("zaki-context-meter")).toHaveTextContent("25%");
    });
    await waitFor(() => {
      expect(fetchAgentSessionHistory).toHaveBeenCalledWith("agent:zaki-bot:user:1:thread:main");
    });
    (fetchAgentSessionHistory as jest.Mock).mockClear();
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "continue this task" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    await waitFor(() => {
      expect(
        (apiRequest as jest.Mock).mock.calls.some(
          ([path]) => path === "/api/agent/chat/stream"
        )
      ).toBe(true);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchAgentSessionHistory).not.toHaveBeenCalled();
    expect(
      zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"]?.contextPressurePercent
    ).toBe(25);
    expect(screen.getByTestId("zaki-context-meter")).toHaveTextContent("25%");
  });

  it("does not fall back to diagnostics context when session context is unavailable", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (fetchAgentSessionContext as jest.Mock).mockResolvedValue({
      response: { ok: false, status: 404, headers: new Headers() },
      data: { active: false, live: false, code: "session_manager_unavailable" },
    });
    (fetchContextDiagnostics as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, headers: new Headers() },
      data: {
        report: {
          history_messages: 12,
          used_tokens: 25_000,
          context_window_tokens: 200_000,
          context_window_used_pct: 12.5,
        },
      },
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(fetchAgentSessionContext).toHaveBeenCalled();
    });
    expect(fetchContextDiagnostics).not.toHaveBeenCalled();
    expect(screen.getByTestId("zaki-context-meter")).toHaveTextContent("--");
    expect(
      zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"]?.contextPressurePercent
    ).toBeNull();
  });

  it("still uses the live context endpoint for inactive listed Agent sessions", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (listAgentSessions as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ sessions: [] }), headers: new Headers() },
      data: {
        sessions: [
          {
            session_key: "agent:zaki-bot:user:1:thread:main",
            title: "Main",
            live: false,
            mode: null,
            message_count: 24,
            last_active: "2026-05-27T17:56:49.377Z",
          },
        ],
      },
    });
    (fetchAgentSessionContext as jest.Mock).mockResolvedValue({
      response: { ok: true, status: 200, headers: new Headers() },
      data: {
        active: false,
        live: false,
        code: "no_active_session",
      },
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(fetchAgentSessionContext).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main"
      );
    });
    expect(fetchContextDiagnostics).not.toHaveBeenCalled();
    expect(screen.getByTestId("zaki-context-meter")).toHaveTextContent("--");
  });

  it("routes first Agent prompt from ZAKI home to the generated live session key", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1779626993472);
    navState.view = "home";
    navState.spaceId = "zaki-bot";
    navState.threadId = null;
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    window.sessionStorage.setItem("zaki:agentUserId", "1");
    (fetchAgentSessionContext as jest.Mock).mockResolvedValue({
      response: { ok: true, status: 200, headers: new Headers() },
      data: {
        token_estimate: 67_285,
        context_window_tokens: 262_144,
        pressure_percent: 25,
      },
    });
    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (path === "/api/agent/chat/stream") {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ type: "done", message: "done" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers(),
      };
    });

    try {
      await renderChatAreaAndWaitForEffects();

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "show me the current context pressure" },
      });
      fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

      const generatedThreadId = "thread-1779626993472";
      const generatedSessionKey =
        "agent:zaki-bot:user:1:thread:thread-1779626993472";
      await waitFor(() => {
        expect(navState.goToThread).toHaveBeenCalledWith("zaki-bot", generatedThreadId, {
          zakiSessionKey: generatedSessionKey,
        });
      });
      await waitFor(() => {
        expect(apiRequest).toHaveBeenCalledWith(
          "/api/agent/chat/stream",
          expect.objectContaining({
            body: expect.stringContaining(`"threadId":"${generatedThreadId}"`),
          })
        );
      });
      await waitFor(() => {
        expect(fetchAgentSession).toHaveBeenCalledWith(generatedSessionKey);
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("renders ready state for a new chat", async () => {
    navState.view = "chat";
    navState.threadId = null;

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("empty.headline")).toBeInTheDocument();
  });

  it("renders ZAKI home view when view=home", async () => {
    navState.view = "home";

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("home.quickStartLabel")).toBeInTheDocument();
  });

  it("renders loaded messages for an active thread", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";

    (useMessages as jest.Mock).mockReturnValue({
      data: [
        {
          id: "m1",
          role: "assistant",
          content: "Hello from history",
          created_at: "2026-05-27T09:30:00.000Z",
        },
      ],
      isLoading: false,
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("Hello from history")).toBeInTheDocument();
    });
    expect(screen.getByTestId("message-timestamp")).toHaveAttribute(
      "dateTime",
      "2026-05-27T09:30:00.000Z"
    );
    expect(screen.getByTestId("message-timestamp")).not.toHaveTextContent(/just now/i);
  });

  it("strips versioned injected memory envelope from user history messages", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";

    (useMessages as jest.Mock).mockReturnValue({
      data: [
        {
          id: "m1",
          role: "user",
          content:
            "[[ZAKI_MEMORY_CONTEXT_V2]]\nAbout this person:\n- Likes tea\n[[/ZAKI_MEMORY_CONTEXT_V2]]\nWhat should I do today?",
        },
      ],
      isLoading: false,
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("What should I do today?")).toBeInTheDocument();
    });
    expect(screen.queryByText("[[ZAKI_MEMORY_CONTEXT_V2]]")).not.toBeInTheDocument();
  });

  it("does not show the legacy experimental notice in the V2 Agent surface", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.queryByText("zakiExperimentalNotice.title")).not.toBeInTheDocument();
    window.sessionStorage.setItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY, "1");
  });

  it("keeps signed-in users on the V2 Agent thread without the legacy bootstrap card", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    (useAuthStore as jest.Mock).mockImplementation(
      (selector?: (state: { user: { username: string } | null }) => unknown) => {
        const state = { user: { username: "nova@test.com" } };
        return selector ? selector(state) : state;
      }
    );

    await renderChatAreaAndWaitForEffects();

    expect(screen.queryByText("zakiBootstrapCard.title")).not.toBeInTheDocument();
    expect(screen.queryByText("zakiExperimentalNotice.title")).not.toBeInTheDocument();
  });

  it("waits for auth hydration before auto-provisioning the ZAKI bot route", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = {
      user: { username: "nova@test.com" },
      isLoading: true,
    };

    const view = await renderChatAreaAndWaitForEffects();

    expect(provisionAgent).not.toHaveBeenCalled();
    expect(fetchAgentSessionHistory).not.toHaveBeenCalled();

    authState = {
      user: { username: "nova@test.com" },
      isLoading: false,
    };
    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <MemoryRouter>
          <ChatArea />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(provisionAgent).toHaveBeenCalledWith({
        spaceId: "zaki-bot",
        threadId: "main",
      });
    });
  });

  it("hydrates the active persisted Agent session detail even when the list marks it inactive", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (listAgentSessions as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ sessions: [] }), headers: new Headers() },
      data: {
        sessions: [
          {
            session_key: "agent:zaki-bot:user:1:thread:main",
            title: "Main",
            live: false,
            mode: null,
            message_count: 24,
            last_active: "2026-05-27T17:56:49.377Z",
          },
        ],
      },
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(provisionAgent).toHaveBeenCalledWith({
        spaceId: "zaki-bot",
        threadId: "main",
      });
    });
    await waitFor(() => {
      expect(fetchAgentSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main"
      );
    });
  });

  it("hydrates inactive Agent session detail when a pending approval exists", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (listAgentSessions as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ sessions: [] }), headers: new Headers() },
      data: {
        sessions: [
          {
            session_key: "agent:zaki-bot:user:1:thread:main",
            title: "Main",
            live: false,
            mode: "execute",
            pending_approval_count: 1,
            message_count: 24,
            last_active: "2026-05-27T17:56:49.377Z",
          },
        ],
      },
    });
    (fetchAgentSession as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
      data: {
        session_key: "agent:zaki-bot:user:1:thread:main",
        live: false,
        mode: "execute",
        pending_approval_count: 1,
        pending_approvals: [
          {
            approval_id: "apr-7",
            id: 7,
            tool: "artifact_create",
            reason: "supervised_mutating_requires_approval",
            risk_level: "low",
            created_at: 1_779_904_000,
            expires_at: null,
          },
        ],
      },
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(fetchAgentSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main"
      );
    });
    expect(
      zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"].pendingApprovals
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "apr-7",
          approvalId: "apr-7",
          tool: "artifact_create",
          reason: "supervised_mutating_requires_approval",
          riskLevel: "low",
        }),
      ])
    );
  });

  it("appends the synchronous approval continuation into the active Agent chat", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    navState.zakiSessionKey = "agent:zaki-bot:user:1:thread:main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    let approvalPending = true;

    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (fetchAgentSessionHistory as jest.Mock)
      .mockResolvedValueOnce({
        response: { ok: true, status: 200, json: async () => ({ messages: [] }) },
        data: { messages: [] },
      })
      .mockRejectedValueOnce(new Error("history_unavailable"));
    (fetchAgentSession as jest.Mock).mockImplementation(async () => ({
      response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
      data: approvalPending
        ? {
            session_key: "agent:zaki-bot:user:1:thread:main",
            live: true,
            mode: "execute",
            pending_approval_count: 1,
            pending_approvals: [
              {
                approval_id: "approval-shell-1",
                id: 91,
                tool: "shell",
                reason: "supervised_mutating_requires_approval",
                risk_level: "high",
                command: "pwd",
                created_at: 1_779_904_000,
              },
            ],
          }
        : {
            session_key: "agent:zaki-bot:user:1:thread:main",
            live: true,
            mode: "execute",
            pending_approval_count: 0,
            pending_approvals: [],
          },
    }));
    (approveAgentSession as jest.Mock).mockImplementation(async () => {
      approvalPending = false;
      return {
        response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
        data: {
          status: "approved",
          message: "Shell completed and I am continuing with the result.",
        },
      };
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("zakiControls.approval.approveBtn")).toBeInTheDocument();
    });
    const sessionFetchCountBeforeApproval = (fetchAgentSession as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByText("zakiControls.approval.approveBtn"));

    await waitFor(() => {
      expect(approveAgentSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main",
        expect.objectContaining({
          approved: true,
          tool: "shell",
          approval_id: "approval-shell-1",
        })
      );
    });
    await waitFor(() => {
      expect(fetchAgentSessionHistory).toHaveBeenCalledWith("agent:zaki-bot:user:1:thread:main");
    });
    await waitFor(() => {
      expect(screen.getByText("Shell completed and I am continuing with the result.")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect((fetchAgentSession as jest.Mock).mock.calls.length).toBeGreaterThan(
        sessionFetchCountBeforeApproval
      );
    });
  });

  it("reconciles merged history when approval succeeds without an inline continuation", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    navState.zakiSessionKey = "agent:zaki-bot:user:1:thread:main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };
    let approvalPending = true;

    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (fetchAgentSessionHistory as jest.Mock).mockImplementation(async () => {
      return {
        response: { ok: true, status: 200, json: async () => ({ messages: [] }) },
        data: !approvalPending
          ? {
              messages: [
                {
                  id: "nullalis-continuation-1",
                  role: "assistant",
                  content: "Recovered from merged history after approval.",
                },
              ],
            }
          : { messages: [] },
      };
    });
    (fetchAgentSession as jest.Mock).mockImplementation(async () => ({
      response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
      data: approvalPending
        ? {
            session_key: "agent:zaki-bot:user:1:thread:main",
            live: true,
            mode: "execute",
            pending_approval_count: 1,
            pending_approvals: [
              {
                approval_id: "approval-shell-2",
                tool: "shell",
                reason: "supervised_mutating_requires_approval",
                risk_level: "high",
              },
            ],
          }
        : {
            session_key: "agent:zaki-bot:user:1:thread:main",
            live: true,
            mode: "execute",
            pending_approval_count: 0,
            pending_approvals: [],
          },
    }));
    (approveAgentSession as jest.Mock).mockImplementation(async () => {
      approvalPending = false;
      return {
        response: { ok: true, status: 200, json: async () => ({}), headers: new Headers() },
        data: { status: "approved", message: "" },
      };
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("zakiControls.approval.approveBtn")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("zakiControls.approval.approveBtn"));

    await waitFor(() => {
      expect(approveAgentSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main",
        expect.objectContaining({
          approved: true,
          approval_id: "approval-shell-2",
        })
      );
    });
    await waitFor(() => {
      expect(fetchAgentSessionHistory).toHaveBeenCalledWith("agent:zaki-bot:user:1:thread:main");
    });
    await waitFor(() => {
      expect(screen.getByText("Recovered from merged history after approval.")).toBeInTheDocument();
    });
  });

  it("keeps Agent mode changes local when the selected session is not live yet", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    navState.zakiSessionKey = "agent:zaki-bot:user:1:thread:main";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    (fetchAgentMe as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ userId: "1" }) },
      data: { userId: "1" },
    });
    (listAgentSessions as jest.Mock).mockResolvedValueOnce({
      response: { ok: true, status: 200, json: async () => ({ sessions: [] }), headers: new Headers() },
      data: {
        sessions: [
          {
            session_key: "agent:zaki-bot:user:1:thread:main",
            title: "Main",
            live: false,
            mode: null,
            message_count: 24,
            last_active: "2026-05-27T17:56:49.377Z",
          },
        ],
      },
    });
    (fetchAgentSession as jest.Mock).mockImplementation(async () => ({
      response: { ok: true, status: 200, json: async () => ({}) },
      data: {
        session_key: "agent:zaki-bot:user:1:thread:main",
        live: false,
        mode: null,
        pending_approval_count: 0,
      },
    }));

    await renderChatAreaAndWaitForEffects();
    await waitFor(() => {
      expect(fetchAgentSession).toHaveBeenCalledWith(
        "agent:zaki-bot:user:1:thread:main"
      );
    });
    await waitFor(() => expect(screen.getByTestId("zaki-composer-mode")).toBeInTheDocument());
    expect(zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"]?.live).toBe(false);

    (setAgentSessionMode as jest.Mock).mockClear();
    fireEvent.click(screen.getByTestId("zaki-composer-mode"));

    expect(setAgentSessionMode).not.toHaveBeenCalled();
    expect(zakiSessionUiState.sessions["agent:zaki-bot:user:1:thread:main"]?.mode).toBe("plan");
  });

  it("does not auto-title ZAKI bot threads", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("zakiAgent.empty.kicker")).toBeInTheDocument();
  });

  it("opens the canonical Agent inspector from the global controls event", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:open-power-user", {
          detail: { tab: "controls" },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Plan/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });

  it("opens and closes the Agent mobile inspector from the mobile panel event", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.queryByTestId("agent-mobile-inspector")).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:open-agent-mobile-inspector"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("agent-mobile-inspector")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "agent.mobilePanel.closeAria" }));
    await waitFor(() => {
      expect(screen.queryByTestId("agent-mobile-inspector")).not.toBeInTheDocument();
    });
  });

  it("keeps backend-backed browser controls in the Agent inspector", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:open-agent-mobile-inspector"));
    });

    const inspector = await screen.findByTestId("agent-mobile-inspector");
    fireEvent.click(within(inspector).getByRole("tab", { name: /Browser/i }));

    expect(within(inspector).getByRole("tab", { name: /Browser/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByTestId("power-user-tab-browser")).not.toBeInTheDocument();
  });

  it("opens a pending Agent controls tab after route handoff", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    window.sessionStorage.setItem("zaki:pendingPowerUserTab", "approvals");

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Plan/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
    expect(window.sessionStorage.getItem("zaki:pendingPowerUserTab")).toBeNull();
  });

  it("keeps Agent power tabs out of the composer and opens them through the canonical handoff", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "agent@example.com" }, isLoading: false };
    window.sessionStorage.setItem("zaki:agentUserId", "agent@example.com");

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByTestId("zaki-turn-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-open-approvals")).not.toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-open-browser")).not.toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-open-output")).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:open-power-user", {
          detail: { tab: "approvals" },
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Plan/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:open-power-user", {
          detail: { tab: "browser" },
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Browser/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:open-power-user", {
          detail: { tab: "artifacts" },
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
  });

  it("parses task progress events as structured live execution", () => {
    const progress = extractProgressPayload({
      type: "progress",
      phase: "task",
      state: "update",
      label: "Task task_00000000001: running",
      duration_ms: 840,
    });

    expect(progress).not.toBeNull();
    expect(progress?.taskId).toBe("task_00000000001");
    expect(progress?.text).toBe("Task task_00000000001: running");
    expect(inferStreamingModeFromProgress(progress || {})).toBe("researching");
    expect(
      buildLatestStatusMeta({
        id: "status-1",
        text: progress?.text || "",
        timestamp: Date.now(),
        phase: progress?.phase,
        state: progress?.state,
        label: progress?.label,
        taskId: progress?.taskId,
        durationMs: progress?.durationMs,
      })
    ).toBe("Task • task_00000000001 • 840ms");
  });

  it("builds transcript-first current action from a reasoning summary", () => {
    const snapshot = buildZakiProcessSnapshot({
      statusEvents: [
        {
          id: "status-1",
          text: "Preparing model request",
          timestamp: Date.now() - 900,
          phase: "thinking",
        },
      ],
      reasoningSummary: {
        id: "summary-1",
        text: "Checking context and memory",
        timestamp: Date.now() - 1000,
        phase: "thinking",
      },
      replyStart: null,
      toolCalls: [],
      latestAssistantMessageContent: "",
      progressTerminalReason: null,
    });

    expect(snapshot.currentActionText).toBe("Checking context and memory");
    expect(snapshot.transcriptEntries.map((entry) => entry.text)).toContain(
      "Checking context and shaping the answer"
    );
  });

  it("prioritizes active tool work over generic status when no summary exists", () => {
    const snapshot = buildZakiProcessSnapshot({
      statusEvents: [
        {
          id: "status-1",
          text: "Running tools",
          timestamp: Date.now() - 900,
          phase: "tools",
          tool: "web_search",
        },
      ],
      reasoningSummary: null,
      replyStart: null,
      toolCalls: [
        {
          id: "tool-1",
          name: "web_search",
          arguments: { q: "latest news" },
          timestamp: Date.now() - 900,
          startedAt: Date.now() - 900,
        },
      ],
      latestAssistantMessageContent: "",
      progressTerminalReason: null,
    });

    expect(snapshot.currentActionText).toBe("Using web_search");
    expect(snapshot.transcriptEntries).toHaveLength(0);
  });

  it("does not treat approval-blocked tools as active work", () => {
    const snapshot = buildZakiProcessSnapshot({
      statusEvents: [
        {
          id: "status-1",
          text: "Waiting for approval",
          timestamp: Date.now() - 900,
          phase: "waiting",
        },
      ],
      reasoningSummary: null,
      replyStart: null,
      toolCalls: [
        {
          id: "tool-1",
          requestId: "call_artifact",
          name: "artifact_create",
          arguments: {},
          timestamp: Date.now() - 900,
          startedAt: Date.now() - 900,
          finishedAt: Date.now() - 800,
          durationMs: 100,
          status: "blocked",
          result: {
            ok: false,
            error: "Approval required",
            result: "Approval required",
          },
        },
      ],
      latestAssistantMessageContent: "",
      progressTerminalReason: null,
    });

    expect(snapshot.currentActionText).toBe("Waiting for approval");
    expect(snapshot.latestToolName).toBe("artifact_create");
  });

  it("turns reply_start into a final-reply transition state", () => {
    const snapshot = buildZakiProcessSnapshot({
      statusEvents: [],
      reasoningSummary: {
        id: "summary-1",
        text: "Preparing the final answer",
        timestamp: Date.now() - 1000,
        phase: "compose",
      },
      replyStart: {
        id: "reply-1",
        timestamp: Date.now() - 800,
        streamKind: "final_reply",
        deliveryMode: "buffered_replay",
        live: false,
      },
      toolCalls: [],
      latestAssistantMessageContent: "",
      progressTerminalReason: null,
    });

    expect(snapshot.phase).toBe("reply_ready");
    expect(snapshot.currentActionText).toBe("Preparing the final reply");
    expect(snapshot.transcriptEntries).toHaveLength(0);
  });

  it("maps nullalis narration progress into a narration frame", () => {
    const frame = extractNullalisNarrationFrame(
      {
        type: "progress",
        phase: "tool_start",
        label: "Running bash...",
        tool: "bash",
      },
      123
    );

    expect(frame).toMatchObject({
      phase: "tool_start",
      label: "Running bash...",
      tool: "bash",
      timestamp: 123,
    });
  });

  it("maps nullalis task updates into checklist items", () => {
    expect(
      extractNullalisTaskItem(
        {
          task_id: "t1",
          status: "succeeded",
          description: "Build component",
          progress_pct: 100,
        },
        456
      )
    ).toMatchObject({
      taskId: "t1",
      status: "succeeded",
      description: "Build component",
      progressPct: 100,
      updatedAt: 456,
    });
  });

  it("maps Nullalis todo tool create/list/update payloads into Plan checklist items", () => {
    expect(
      extractNullalisTodoTaskItemsFromToolPayload(
        {
          type: "toolCallInvocation",
          name: "todo",
          request_id: "call-todo",
          arguments: {
            action: "create",
            title: "Production closeout",
            items: [
              { title: "Verify approvals" },
              { title: "Download artifact" },
            ],
          },
        },
        500
      )
    ).toEqual([
      {
        taskId: "todo:draft:call-todo:item:1",
        status: "queued",
        description: "Verify approvals",
        progressPct: null,
        updatedAt: 500,
      },
      {
        taskId: "todo:draft:call-todo:item:2",
        status: "queued",
        description: "Download artifact",
        progressPct: null,
        updatedAt: 500,
      },
    ]);

    expect(
      extractNullalisTodoTaskItemsFromToolPayload(
        {
          type: "tool_result",
          tool: "todo",
          output: JSON.stringify({
            id: "list-1",
            items: [
              { id: 1, title: "Verify approvals", status: "completed" },
              { id: 2, title: "Download artifact", status: "in_progress" },
            ],
          }),
        },
        600
      )
    ).toEqual([
      {
        taskId: "todo:list-1:item:1",
        status: "done",
        description: "Verify approvals",
        progressPct: 100,
        updatedAt: 600,
      },
      {
        taskId: "todo:list-1:item:2",
        status: "running",
        description: "Download artifact",
        progressPct: null,
        updatedAt: 600,
      },
    ]);

    expect(
      extractNullalisTodoTaskItemsFromToolPayload(
        {
          type: "toolCallInvocation",
          tool: "todo",
          arguments: {
            action: "update",
            list_id: "list-1",
            item_id: 2,
            status: "completed",
          },
        },
        700
      )
    ).toEqual([
      {
        taskId: "todo:list-1:item:2",
        status: "done",
        description: "Todo item 2",
        progressPct: 100,
        updatedAt: 700,
      },
    ]);
  });

  it("uses stable wire correlation for nullalis approval requests", () => {
    expect(
      extractNullalisApprovalRequest(
        {
          approval_id: "approval-123",
          tool: "write_file",
          risk_level: "high",
        },
        456
      )
    ).toMatchObject({
      id: "approval-123",
      approvalId: "approval-123",
      numericId: null,
      tool: "write_file",
      riskLevel: "high",
    });

    expect(
      extractNullalisApprovalRequest(
        {
          id: 12,
          run_id: "run-789",
          tool: "browser_click",
          tool_call_id: "call-browser",
        },
        456
      )
    ).toMatchObject({
      id: "legacy:12",
      approvalId: null,
      numericId: 12,
      toolCallId: "call-browser",
      tool: "browser_click",
    });
  });

  it("captures nullalis usage and cost from done events", () => {
    expect(
      extractNullalisUsageSummary({
        usage_tokens: 1500,
        cost_usd: 0.003,
        turn_weight: 0.7,
        session_weight: 3.2,
      })
    ).toEqual({ usageTokens: 1500, costUsd: 0.003, turnWeight: 0.7, sessionWeight: 3.2 });
  });

  it("maps nullalis reasoning summaries into visible narration frames", () => {
    expect(
      extractNullalisReasoningNarrationFrame(
        {
          type: "reasoning_summary",
          summary: "Comparing saved memories",
          phase: "thinking",
        },
        789
      )
    ).toMatchObject({
      phase: "thinking",
      label: "Comparing saved memories",
      timestamp: 789,
    });
  });

  it("normalizes nullalis progress into worklog entries", () => {
    expect(
      extractNullalisTranscriptEntry(
        "progress",
        {
          type: "progress",
          phase: "thinking",
          label: "Retrieving memory",
        },
        111
      )
    ).toMatchObject({
      kind: "narration",
      text: "Searching saved memory",
      phase: "thinking",
      source: "progress",
      timestamp: 111,
    });
  });

  it("keeps nullalis progress group metadata and heartbeat flags", () => {
    expect(
      extractNullalisTranscriptEntry(
        "progress",
        {
          type: "progress",
          phase: "thinking",
          label: "Still working on the reply",
          tool_use_id: "call_1",
          task_id: "task_1",
          group_id: "group_1",
          heartbeat: true,
        },
        111
      )
    ).toMatchObject({
      kind: "narration",
      toolUseId: "call_1",
      taskId: "task_1",
      heartbeat: true,
      groupKey: "tool-use:call_1",
    });
  });

  it("normalizes nullalis status responses into worklog entries", () => {
    expect(
      extractNullalisTranscriptEntry(
        "status",
        {
          type: "statusResponse",
          label: "Gathering context",
          phase: "thinking",
        },
        112
      )
    ).toMatchObject({
      kind: "status",
      text: "Checking context and memory",
      phase: "thinking",
      source: "progress",
      timestamp: 112,
    });
  });

  it("keeps reasoning summaries verbatim in worklog entries", () => {
    expect(
      extractNullalisTranscriptEntry(
        "reasoning_summary",
        {
          type: "reasoning_summary",
          summary: "Comparing saved memories",
          phase: "thinking",
        },
        222
      )
    ).toMatchObject({
      kind: "narration",
      text: "Comparing saved memories",
      phase: "thinking",
      source: "reasoning_summary",
      timestamp: 222,
    });
  });

  it("normalizes nullalis tool events into worklog entries with files", () => {
    expect(
      extractNullalisTranscriptEntry(
        "tool_result",
        {
          tool: "bash",
          tool_use_id: "call_1",
          success: true,
          duration_ms: 120,
          command: "npm run typecheck",
          output_preview: "edited src/app/components/ChatArea.tsx",
          result_summary: "completed",
        },
        333
      )
    ).toMatchObject({
      kind: "tool",
      text: "bash completed · 120ms",
      tool: "bash",
      toolUseId: "call_1",
      durationMs: 120,
      status: "done",
      command: "npm run typecheck",
      files: ["src/app/components/ChatArea.tsx"],
      outputPreview: "edited src/app/components/ChatArea.tsx",
      resultSummary: "completed",
      groupKey: "tool-use:call_1",
    });
  });

  it("renders legacy approval checkpoints as blocked instead of failed tool results", () => {
    expect(
      extractNullalisTranscriptEntry(
        "tool_result",
        {
          tool: "artifact_create",
          tool_use_id: "call_artifact",
          success: false,
          output_preview: "Approval required. Use /approve allow-once|deny",
          result_summary: "supervised_mutating_requires_approval",
        },
        334
      )
    ).toMatchObject({
      kind: "tool",
      text: "Approval required for artifact_create",
      tool: "artifact_create",
      toolUseId: "call_artifact",
      status: "blocked",
      resultState: "blocked",
      source: "approval",
      groupKey: "tool-use:call_artifact",
    });
  });

  it("normalizes nullalis task, approval, and done events into worklog entries", () => {
    expect(inferStreamingModeFromContext("turn_auto_compaction")).toBe("thinking");

    expect(
      extractNullalisTranscriptEntry(
        "task_update",
        {
          task_id: "t1",
          status: "running",
          description: "Build component",
        },
        444
      )
    ).toMatchObject({
      kind: "task",
      text: "Running task: Build component",
      taskId: "t1",
      status: "running",
    });

    expect(
      extractNullalisTranscriptEntry(
        "approval_required",
        {
          tool: "write_file",
          risk_level: "high",
          input_preview: '{ "path": "docs/brief.md" }',
          effect_preview: "Writes the launch brief.",
          command: "write docs/brief.md",
          files: ["docs/brief.md"],
        },
        555
      )
    ).toMatchObject({
      kind: "approval",
      text: "Approval required for write_file",
      tool: "write_file",
      status: "high",
      inputPreview: '{ "path": "docs/brief.md" }',
      resultSummary: "Writes the launch brief.",
      command: "write docs/brief.md",
      files: ["docs/brief.md"],
    });

    expect(
      extractNullalisTranscriptEntry(
        "progress",
        {
          phase: "turn_auto_compaction",
          state: "running",
        },
        556
      )
    ).toMatchObject({
      text: "Auto-compacting context",
    });

    expect(
      extractNullalisTranscriptEntry(
        "progress",
        {
          phase: "history_maintenance_after_tools",
          state: "done",
        },
        557
      )
    ).toMatchObject({
      text: "Updating history",
    });

    expect(
      extractNullalisTranscriptEntry(
        "artifact_event",
        {
          op: "created",
          artifact_id: "artifact_123",
          title: "Launch plan",
          kind: "docx",
          version: 2,
          url: "/api/v1/artifacts/artifact_123",
          change_summary: "Drafted the launch plan.",
        },
        556
      )
    ).toMatchObject({
      kind: "tool",
      intent: "file",
      text: "Artifact created: Launch plan",
      tool: "artifact",
      status: "created",
      files: ["/api/v1/artifacts/artifact_123"],
      activityLabel: "Launch plan",
      inputPreview: "v2",
      outputPreview: "Drafted the launch plan.",
      resultSummary: "Drafted the launch plan.",
      groupKey: "artifact:artifact_123",
    });

    expect(
      extractNullalisTranscriptEntry(
        "tool_only_turn",
        {
          tool_calls_executed: 4,
          spawned_task_ids: ["task-a", "task-b"],
          iterations_used: 2,
        },
        557
      )
    ).toMatchObject({
      kind: "task",
      intent: "planning",
      text: "4 tools ran · 2 background tasks spawned · 2 iterations",
      phase: "tool_only_turn",
      status: "background",
      resultSummary: "task-a, task-b",
      resultState: "running",
    });

    expect(
      extractNullalisTranscriptEntry(
        "tool_only_summary",
        {
          toolCallsExecuted: 2,
          spawnedTaskIds: ["task-c"],
        },
        558
      )
    ).toMatchObject({
      kind: "task",
      text: "2 tools ran · 1 background task spawned",
      phase: "tool_only_summary",
      status: "background",
    });

    expect(
      extractNullalisTranscriptEntry(
        "subagent_completion",
        {
          task_id: "worker-1",
          summary: "Research finished",
          success: true,
        },
        559
      )
    ).toMatchObject({
      kind: "task",
      text: "Completed subagent: Research finished",
      phase: "subagent_completion",
      taskId: "worker-1",
      status: "done",
      resultState: "done",
    });

    expect(extractNullalisTranscriptEntry("audio_reply", {}, 560)).toMatchObject({
      kind: "status",
      text: "Audio reply generated",
      phase: "audio_reply",
      status: "done",
    });

    expect(extractNullalisTranscriptEntry("done", {}, 666)).toMatchObject({
      kind: "transition",
      text: "Finalized the response",
      status: "done",
    });
  });

  // --- Normal Spaces always-agent narration + generated-file chip (BUG 1/2) ---
  // Builds a streaming Response whose body yields the exact SSE bytes the BFF
  // relays for a normal `mode:"chat"` turn: agentThought status lines + text
  // chunks + a fileDownload event + the finalize frame.
  function makeSseStreamResponse(blocks: string[]) {
    const encoder = new TextEncoder();
    // jsdom does not provide ReadableStream; use Node's web-streams impl so the
    // `response.body.getReader()` consumer in ChatArea behaves like a browser.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReadableStream: NodeReadableStream } = require("stream/web");
    const stream = new NodeReadableStream({
      start(controller: { enqueue: (c: Uint8Array) => void; close: () => void }) {
        for (const block of blocks) {
          controller.enqueue(encoder.encode(block));
        }
        controller.close();
      },
    });
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/event-stream" }),
      body: stream,
    } as unknown as Response;
  }

  // A stream that stays OPEN so the assistant message is rendered through the
  // `isStreaming === true` branch of ChatView. Returns the Response plus a
  // controller to push more SSE blocks and to close the stream.
  function makeOpenSseStreamResponse() {
    const encoder = new TextEncoder();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ReadableStream: NodeReadableStream } = require("stream/web");
    let ctrl: { enqueue: (c: Uint8Array) => void; close: () => void } | null = null;
    const stream = new NodeReadableStream({
      start(controller: { enqueue: (c: Uint8Array) => void; close: () => void }) {
        ctrl = controller;
      },
    });
    return {
      response: {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: stream,
      } as unknown as Response,
      push: (block: string) => ctrl?.enqueue(encoder.encode(block)),
      close: () => ctrl?.close(),
    };
  }

  it("shows the narration disclosure + file chip WHILE the turn is still streaming", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    const open = makeOpenSseStreamResponse();
    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.includes("/stream-chat")) {
        return open.response;
      }
      return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
    });

    await renderChatAreaAndWaitForEffects();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "weather?" } });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    // Mid-stream: emit a tool-fire thought + a generated file, but DO NOT close.
    await act(async () => {
      open.push(
        'data: {"type":"agentThought","thought":"@agent is executing `web-browsing` tool {}"}\n\n'
      );
      open.push(
        'data: {"type":"fileDownload","fileDownload":{"filename":"live.csv","storageFilename":"text-2.csv","fileSize":5}}\n\n'
      );
      await Promise.resolve();
    });

    // The disclosure is open ("Working…") and the step + chip are visible while
    // isStreaming is still true.
    await waitFor(() => expect(screen.getByText(/Searching the web/i)).toBeInTheDocument());
    expect(screen.getByText("live.csv")).toBeInTheDocument();

    // Finish the turn — the collected steps + chip persist.
    await act(async () => {
      open.push('data: {"type":"textResponseChunk","textResponse":"sunny"}\n\n');
      open.push('data: {"type":"finalizeResponseStream"}\n\n');
      open.close();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText("sunny")).toBeInTheDocument());
    expect(screen.getByText("live.csv")).toBeInTheDocument();
  });

  it("renders agent narration steps + a generated-file chip for a normal Spaces turn", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    const sseBlocks = [
      ': zaki-stream-open\n\n',
      'data: {"type":"agentThought","thought":"@agent is executing `web-browsing` tool {\\"q\\":\\"weather\\"}"}\n\n',
      'data: {"type":"textResponseChunk","textResponse":"The weather "}\n\n',
      'data: {"type":"agentThought","thought":"@agent: Successfully created text file \\"report.txt\\""}\n\n',
      'data: {"type":"textResponseChunk","textResponse":"is sunny."}\n\n',
      'data: {"type":"fileDownload","fileDownload":{"filename":"report.txt","storageFilename":"text-1.txt","fileSize":2048}}\n\n',
      'data: {"type":"finalizeResponseStream"}\n\n',
    ];

    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.includes("/stream-chat")) {
        return makeSseStreamResponse(sseBlocks);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        headers: new Headers(),
      };
    });

    await renderChatAreaAndWaitForEffects();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "what is the weather" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    // The answer text streams in.
    await waitFor(() => {
      expect(screen.getByText(/is sunny\./)).toBeInTheDocument();
    });

    // BUG 1: the narration disclosure surfaces the auto-decided tool steps.
    await waitFor(() => {
      expect(screen.getByText(/Searching the web/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Creating a file/i)).toBeInTheDocument();

    // BUG 2: the generated file is surfaced as a download chip and persists.
    expect(screen.getByText("report.txt")).toBeInTheDocument();
  });

  it("handles agentThought events framed with an SSE event: line", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    const sseBlocks = [
      'event: agentThought\ndata: {"type":"agentThought","thought":"Using DuckDuckGo to search for \\"x\\""}\n\n',
      'data: {"type":"textResponseChunk","textResponse":"done."}\n\n',
      'data: {"type":"finalizeResponseStream"}\n\n',
    ];
    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.includes("/stream-chat")) {
        return makeSseStreamResponse(sseBlocks);
      }
      return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
    });

    await renderChatAreaAndWaitForEffects();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    await waitFor(() => expect(screen.getByText(/done\./)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Searching the web/i)).toBeInTheDocument());
  });

  it("accumulates agentThought steps when events are split across network chunks", async () => {
    navState.view = "chat";
    navState.spaceId = "space-1";
    navState.threadId = "thread-1";
    authState = { user: { username: "nova@test.com" }, isLoading: false };

    // One logical SSE stream, chopped at arbitrary byte boundaries (mid-event,
    // mid-JSON) — exactly how a real network delivers bytes.
    const full =
      'data: {"type":"agentThought","thought":"@agent is executing `web-browsing` tool {}"}\n\n' +
      'data: {"type":"textResponseChunk","textResponse":"answer"}\n\n' +
      'data: {"type":"fileDownload","fileDownload":{"filename":"out.csv","storageFilename":"text-9.csv","fileSize":10}}\n\n' +
      'data: {"type":"finalizeResponseStream"}\n\n';
    const mid = Math.floor(full.length / 3);
    const chunks = [full.slice(0, 20), full.slice(20, mid), full.slice(mid, mid + 40), full.slice(mid + 40)];

    (apiRequest as jest.Mock).mockImplementation(async (path: string) => {
      if (typeof path === "string" && path.includes("/stream-chat")) {
        return makeSseStreamResponse(chunks);
      }
      return { ok: true, status: 200, json: async () => ({}), headers: new Headers() };
    });

    await renderChatAreaAndWaitForEffects();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "go" } });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    await waitFor(() => expect(screen.getByText("answer")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Searching the web/i)).toBeInTheDocument());
    expect(screen.getByText("out.csv")).toBeInTheDocument();
  });
});
