/**
 * ChatArea Component Tests
 * Focused smoke tests aligned with current ChatArea architecture.
 */

import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { useNavigationStore, useAuthStore } from "@/stores";
import { useMessages } from "@/queries/useThreads";
import {
  apiRequest,
  fetchAgentHistory,
  fetchMemoryActivity,
  provisionAgent,
} from "@/lib/api";
import { ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY } from "./ZakiExperimentalNotice";
import { getZakiBootstrapCardStorageKey } from "./ZakiBootstrapCard";

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
  fetchMemoryActivity: jest.fn(async () => ({
    response: {
      ok: true,
      status: 200,
      json: async () => ({ activities: [] }),
    },
    data: { activities: [] },
  })),
}));

jest.mock("@/lib/nullalisEnv", () => ({
  buildNullalisStreamUrl: () => "/api/v1/chat/stream",
  getNullalisToken: () => "dev-token",
  getNullalisUserId: () => "1",
  isNullalisModeEnabled: () => false,
}));

jest.mock("@/stores", () => ({
  useNavigationStore: jest.fn(),
  useAuthStore: jest.fn(),
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
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
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
  goHome: () => void;
  goToSpaces: () => void;
  goToSpace: (spaceId: string) => void;
  goToThread: (spaceId: string, threadId: string) => void;
  clearThread: () => void;
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

  beforeEach(() => {
    (apiRequest as jest.Mock).mockClear();
    (fetchAgentHistory as jest.Mock).mockClear();
    (fetchMemoryActivity as jest.Mock).mockClear();
    (provisionAgent as jest.Mock).mockClear();
    window.sessionStorage.clear();
    window.localStorage.clear();
    navState = {
      view: "chat",
      spaceId: null,
      threadId: null,
      goHome: jest.fn(),
      goToSpaces: jest.fn(),
      goToSpace: jest.fn(),
      goToThread: jest.fn(),
      clearThread: jest.fn(),
    };

    (useNavigationStore as jest.Mock).mockImplementation((selector?: (state: NavState) => unknown) =>
      selector ? selector(navState) : navState
    );

    authState = { user: null, isLoading: false };

    (useAuthStore as jest.Mock).mockImplementation(
      (selector?: (state: { user: { username: string } | null; isLoading: boolean }) => unknown) =>
        selector ? selector(authState) : authState
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

  it("shows the experimental notice in the ZAKI space until dismissed for the session", async () => {
    navState.view = "chat";
    navState.spaceId = "zaki-bot";
    navState.threadId = "main";

    await renderChatAreaAndWaitForEffects();

    expect(screen.getByText("zakiExperimentalNotice.title")).toBeInTheDocument();
    window.sessionStorage.setItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY, "1");
  });

  it("shows the first-time ZAKI bootstrap card before the experimental notice for signed-in users", async () => {
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

    expect(screen.getByText("zakiBootstrapCard.title")).toBeInTheDocument();
    expect(screen.queryByText("zakiExperimentalNotice.title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "zakiBootstrapCard.actions.continue" }));

    expect(
      window.localStorage.getItem(getZakiBootstrapCardStorageKey("nova@test.com"))
    ).toBe("done");
    expect(screen.getByText("zakiExperimentalNotice.title")).toBeInTheDocument();
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

    expect(screen.getByText("zakiExperimentalNotice.title")).toBeInTheDocument();
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
      })
    ).toEqual({ usageTokens: 1500, costUsd: 0.003 });
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
        },
        555
      )
    ).toMatchObject({
      kind: "approval",
      text: "Approval required for write_file",
      tool: "write_file",
      status: "high",
    });

    expect(extractNullalisTranscriptEntry("done", {}, 666)).toMatchObject({
      kind: "transition",
      text: "Finalized the response",
      status: "done",
    });
  });
});
