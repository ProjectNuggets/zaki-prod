/**
 * ChatArea Component Tests
 * Focused smoke tests aligned with current ChatArea architecture.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ChatArea,
  buildZakiProcessSnapshot,
  buildLatestStatusMeta,
  extractProgressPayload,
  extractNullalisNarrationFrame,
  extractNullalisReasoningNarrationFrame,
  extractNullalisTranscriptEntry,
  extractNullalisTaskItem,
  extractNullalisUsageSummary,
  inferStreamingModeFromProgress,
} from "./ChatArea";
import { useNavigationStore, useAuthStore, useZakiSessionUiStore } from "@/stores";
import { useMessages } from "@/queries/useThreads";
import {
  apiRequest,
  approveAgentSession,
  fetchAgentHistory,
  fetchAgentMe,
  fetchAgentSession,
  fetchAgentSessionContext,
  fetchBotRuntimeStatus,
  fetchMemoryActivity,
  listAgentSessions,
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
  listAgentCron: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ jobs: [] }),
      headers: new Headers(),
    },
    data: { jobs: [] },
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
  goToThread: (spaceId: string, threadId: string) => void;
  clearThread: () => void;
  setZakiSessionKey: (sessionKey: string | null) => void;
};

type TestZakiSessionUiState = {
  sessions: Record<
    string,
    {
      mode: "plan" | "execute" | "review";
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
    (apiRequest as jest.Mock).mockClear();
    (fetchAgentHistory as jest.Mock).mockClear();
    (fetchAgentMe as jest.Mock).mockClear();
    (fetchAgentSession as jest.Mock).mockClear();
    (fetchAgentSessionContext as jest.Mock).mockClear();
    (fetchBotRuntimeStatus as jest.Mock).mockClear();
    (fetchMemoryActivity as jest.Mock).mockClear();
    (listAgentSessions as jest.Mock).mockClear();
    (provisionAgent as jest.Mock).mockClear();
    (setAgentSessionMode as jest.Mock).mockClear();
    (approveAgentSession as jest.Mock).mockClear();
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
      goToThread: jest.fn(),
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
      data: [{ id: "m1", role: "assistant", content: "Hello from history" }],
      isLoading: false,
    });

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByText("Hello from history")).toBeInTheDocument();
    });
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
    expect(fetchAgentHistory).not.toHaveBeenCalled();

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

  it("does not auto-title ZAKI bot threads", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("zakiAgent.empty.kicker")).toBeInTheDocument();
  });

  it("opens the canonical Agent controls sheet from the global controls event", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.queryByTestId("power-user-controls")).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(
        new CustomEvent("zaki:open-power-user", {
          detail: { tab: "controls" },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("power-user-controls")).toBeInTheDocument();
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

  it("hands off from the Agent mobile inspector to backend-backed power surfaces", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    act(() => {
      window.dispatchEvent(new CustomEvent("zaki:open-agent-mobile-inspector"));
    });

    const inspector = await screen.findByTestId("agent-mobile-inspector");
    fireEvent.click(within(inspector).getByRole("tab", { name: /Artifacts/i }));
    fireEvent.click(within(inspector).getByRole("button", { name: "Open artifacts manager" }));

    await waitFor(() => {
      expect(screen.getByTestId("power-user-tab-artifacts")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
    expect(screen.queryByTestId("agent-mobile-inspector")).not.toBeInTheDocument();
  });

  it("opens a pending Agent controls tab after route handoff", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    window.sessionStorage.setItem("zaki:pendingPowerUserTab", "approvals");

    await renderChatAreaAndWaitForEffects();

    await waitFor(() => {
      expect(screen.getByTestId("power-user-tab-approvals")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });
    expect(window.sessionStorage.getItem("zaki:pendingPowerUserTab")).toBeNull();
  });

  it("opens exact Agent power tabs from composer control actions", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";
    authState = { user: { username: "agent@example.com" }, isLoading: false };
    window.sessionStorage.setItem("zaki:agentUserId", "agent@example.com");

    await renderChatAreaAndWaitForEffects();

    fireEvent.click(screen.getByTestId("zaki-composer-open-approvals"));
    await waitFor(() => {
      expect(screen.getByTestId("power-user-tab-approvals")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    fireEvent.click(screen.getByTestId("zaki-composer-open-browser"));
    await waitFor(() => {
      expect(screen.getByTestId("power-user-tab-browser")).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    fireEvent.click(screen.getByTestId("zaki-composer-open-output"));
    await waitFor(() => {
      expect(screen.getByTestId("power-user-tab-artifacts")).toHaveAttribute(
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

  it("normalizes nullalis task, approval, and done events into worklog entries", () => {
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
        "artifact_event",
        {
          event: "created",
          title: "Launch plan",
          artifact_type: "docx",
        },
        556
      )
    ).toMatchObject({
      kind: "tool",
      intent: "file",
      text: "Artifact created: Launch plan",
      tool: "artifact",
      status: "created",
      resultSummary: "docx",
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
});
