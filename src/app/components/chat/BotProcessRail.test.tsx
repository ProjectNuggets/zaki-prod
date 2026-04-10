import "@testing-library/jest-dom";
import { act } from "@testing-library/react";
import { describe, expect, it, jest, afterEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { BotProcessRail } from "./BotProcessRail";

describe("BotProcessRail", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the deliberate ack state before backend detail arrives", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="thinking"
        toolCalls={[]}
        statusEvents={[]}
        snapshot={{
          phase: "ack",
          summaryText: null,
          latestStatusText: null,
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getByText("On it")).toBeInTheDocument();
    expect(screen.getByText("Processing request")).toBeInTheDocument();
    expect(screen.queryByText("Thinking")).not.toBeInTheDocument();
  });

  it("uses reasoning summaries as the primary what-im-doing signal", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="thinking"
        reasoningSummary={{
          id: "summary-1",
          text: "Reviewing memory and shaping the answer",
          timestamp: Date.now(),
          phase: "thinking",
        }}
        snapshot={{
          phase: "working",
          summaryText: "Reviewing memory and shaping the answer",
          latestStatusText: "Preparing model request",
          latestStatusMeta: "Model • 420ms",
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
        statusEvents={[
          {
            id: "status-1",
            text: "Preparing model request",
            timestamp: Date.now() + 1,
            phase: "thinking",
          },
        ]}
        toolCalls={[]}
      />
    );

    expect(screen.getByText("What I'm doing")).toBeInTheDocument();
    expect(screen.getByText("Reviewing memory and shaping the answer")).toBeInTheDocument();
    expect(screen.getByText("Preparing model request")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("keeps semantically repetitive summaries stable instead of thrashing", () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <BotProcessRail
        isStreaming
        stage="thinking"
        toolCalls={[]}
        statusEvents={[]}
        snapshot={{
          phase: "working",
          summaryText: "Reviewing memory and shaping the answer",
          latestStatusText: "Preparing model request",
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    rerender(
      <BotProcessRail
        isStreaming
        stage="thinking"
        toolCalls={[]}
        statusEvents={[]}
        snapshot={{
          phase: "working",
          summaryText: "Reviewing memory and shaping the answer (iteration 2).",
          latestStatusText: "Preparing model request",
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(screen.getByText("Reviewing memory and shaping the answer")).toBeInTheDocument();
    expect(
      screen.queryByText("Reviewing memory and shaping the answer (iteration 2).")
    ).not.toBeInTheDocument();
  });

  it("lets reply_start override reasoning summary as the primary headline", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="writing"
        reasoningSummary={{
          id: "summary-1",
          text: "Preparing the final answer",
          timestamp: Date.now(),
          phase: "compose",
        }}
        replyStart={{
          id: "reply-1",
          timestamp: Date.now(),
          streamKind: "final_reply",
          deliveryMode: "buffered_replay",
          live: false,
        }}
        snapshot={{
          phase: "reply_ready",
          summaryText: "Preparing the final answer",
          latestStatusText: "Preparing final reply",
          latestStatusMeta: "Compose • 1.1s",
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: true,
          replyRevealStarted: false,
        }}
        statusEvents={[
          {
            id: "status-1",
            text: "Preparing final reply",
            timestamp: Date.now(),
            phase: "compose",
          },
        ]}
        toolCalls={[]}
      />
    );

    expect(screen.getByText("Final reply")).toBeInTheDocument();
    expect(screen.getByText("Answer ready. Revealing final reply.")).toBeInTheDocument();
    expect(screen.getByText("Preparing the final answer")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders a compact handoff rail after reply reveal starts", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="writing"
        toolCalls={[]}
        statusEvents={[]}
        compact
        snapshot={{
          phase: "revealing",
          summaryText: "Preparing the final answer",
          latestStatusText: "Preparing final reply",
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: true,
          replyRevealStarted: true,
        }}
      />
    );

    expect(screen.getByText("Final reply")).toBeInTheDocument();
    expect(screen.getByText("Answer ready. Revealing final reply.")).toBeInTheDocument();
    expect(screen.queryByText("Tools")).not.toBeInTheDocument();
  });

  it("does not label compact error state as a final reply", () => {
    render(
      <BotProcessRail
        isStreaming={false}
        stage="writing"
        toolCalls={[]}
        statusEvents={[]}
        compact
        snapshot={{
          phase: "error",
          summaryText: null,
          latestStatusText: "Something interrupted the reply.",
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: true,
          replyRevealStarted: true,
        }}
      />
    );

    expect(screen.getByText("Need attention")).toBeInTheDocument();
    expect(screen.getByText("Something interrupted the reply.")).toBeInTheDocument();
    expect(screen.queryByText("Final reply")).not.toBeInTheDocument();
  });

  it("keeps recent non-tool progress visible when tool calls are present without showing a full log", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="researching"
        snapshot={{
          phase: "tooling",
          summaryText: "Using web_search to verify the answer",
          latestStatusText: "Using web_search",
          latestStatusMeta: "Tool: web_search • 840ms",
          latestToolName: "web_search",
          hasTools: true,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
        statusEvents={[
          {
            id: "status-1",
            text: "Running tools",
            timestamp: Date.now(),
            phase: "tools",
          },
          {
            id: "status-2",
            text: "Reflecting on tool results",
            timestamp: Date.now() + 1,
            phase: "reflection",
          },
          {
            id: "status-3",
            text: "Preparing final reply",
            timestamp: Date.now() + 2,
            phase: "compose",
          },
        ]}
        toolCalls={[
          {
            id: "tool-1",
            requestId: "req-1",
            name: "web_search",
            arguments: { q: "latest news" },
            timestamp: Date.now(),
            startedAt: Date.now() - 120,
          },
        ]}
      />
    );

    expect(screen.getByText("Using web_search to verify the answer")).toBeInTheDocument();
    expect(screen.getByText("Using web_search")).toBeInTheDocument();
    expect(screen.getByText("Reflecting on tool results")).toBeInTheDocument();
    expect(screen.getByText("Running tools")).toBeInTheDocument();
    expect(screen.queryByText("Preparing final reply")).not.toBeInTheDocument();
    expect(screen.getAllByText("Tools").length).toBeGreaterThan(0);
    expect(screen.getByText("web_search")).toBeInTheDocument();
  });

  it("limits completed tool cards to the last two when nothing is running", () => {
    render(
      <BotProcessRail
        isStreaming={false}
        stage="writing"
        toolCalls={[
          {
            id: "tool-1",
            name: "memory_lookup",
            arguments: {},
            timestamp: Date.now(),
            startedAt: Date.now() - 3000,
            finishedAt: Date.now() - 2900,
            result: { ok: true, result: { ok: true } },
          },
          {
            id: "tool-2",
            name: "web_search",
            arguments: { q: "latest" },
            timestamp: Date.now(),
            startedAt: Date.now() - 2000,
            finishedAt: Date.now() - 1900,
            result: { ok: true, result: { ok: true } },
          },
          {
            id: "tool-3",
            name: "web_fetch",
            arguments: { url: "https://example.com" },
            timestamp: Date.now(),
            startedAt: Date.now() - 1000,
            finishedAt: Date.now() - 900,
            result: { ok: true, result: { ok: true } },
          },
        ]}
        statusEvents={[]}
      />
    );

    expect(screen.queryByText("memory_lookup")).not.toBeInTheDocument();
    expect(screen.getByText("web_search")).toBeInTheDocument();
    expect(screen.getByText("web_fetch")).toBeInTheDocument();
  });

  it("makes cache hits visible and prefers the cached summary text", () => {
    render(
      <BotProcessRail
        isStreaming={false}
        stage="writing"
        reasoningSummary={{
          id: "summary-1",
          text: "Reusing a cached answer",
          timestamp: Date.now(),
        }}
        snapshot={{
          phase: "reply_ready",
          summaryText: "Reusing a cached answer",
          latestStatusText: "Using cached response",
          latestStatusMeta: null,
          latestToolName: null,
          hasTools: false,
          isCacheHit: true,
          isReplyReplay: true,
          replyRevealStarted: false,
        }}
        statusEvents={[
          {
            id: "status-1",
            text: "Using cached response",
            timestamp: Date.now(),
            phase: "reply",
          },
        ]}
        toolCalls={[]}
      />
    );

    expect(screen.getByText("Cache hit")).toBeInTheDocument();
    expect(screen.getByText("Reusing a cached answer")).toBeInTheDocument();
    expect(screen.getByText("Reused")).toBeInTheDocument();
  });

  it("renders task progress metadata without collapsing it into generic thinking", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="researching"
        snapshot={{
          phase: "working",
          summaryText: null,
          latestStatusText: "Task task_00000000001: running",
          latestStatusMeta: "Task • task_00000000001 • 840ms",
          latestToolName: "task_00000000001",
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
        statusEvents={[
          {
            id: "status-1",
            text: "Task task_00000000001: running",
            timestamp: Date.now(),
            phase: "task",
            state: "update",
            taskId: "task_00000000001",
            durationMs: 840,
          },
        ]}
        toolCalls={[]}
      />
    );

    expect(screen.getByText("Task task_00000000001: running")).toBeInTheDocument();
    expect(screen.getByText("Task • task_00000000001 • 840ms")).toBeInTheDocument();
    expect(screen.getAllByText("Researching").length).toBeGreaterThan(0);
    expect(screen.queryByText("Thinking")).not.toBeNull();
  });
});
