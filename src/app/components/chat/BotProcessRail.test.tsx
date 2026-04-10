import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { BotProcessRail } from "./BotProcessRail";

describe("BotProcessRail", () => {
  it("shows a transcript-first ack state before richer detail arrives", () => {
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
          currentActionText: "Getting started",
          currentActionMeta: null,
          currentActionKind: "transition",
          transcriptEntries: [],
          workStartedAt: Date.now() - 1200,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getByText(/Working for/)).toBeInTheDocument();
    expect(screen.getByText("Getting started")).toBeInTheDocument();
    expect(screen.queryByText("Researching")).not.toBeInTheDocument();
    expect(screen.queryByText("Writing")).not.toBeInTheDocument();
  });

  it("uses a reasoning summary as the current self-narration", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="thinking"
        toolCalls={[]}
        statusEvents={[]}
        reasoningSummary={{
          id: "summary-1",
          text: "Checking context and memory",
          timestamp: Date.now() - 1000,
          phase: "thinking",
        }}
        snapshot={{
          phase: "working",
          summaryText: "Checking context and memory",
          latestStatusText: "Preparing model request",
          latestStatusMeta: null,
          latestToolName: null,
          currentActionText: "Checking context and memory",
          currentActionMeta: "Thinking",
          currentActionKind: "narration",
          transcriptEntries: [
            {
              id: "entry-1",
              kind: "status",
              text: "Checking context and shaping the answer",
              timestamp: Date.now() - 900,
              meta: "Thinking",
              state: "active",
            },
          ],
          workStartedAt: Date.now() - 1000,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getByText("Checking context and memory")).toBeInTheDocument();
    expect(screen.getByText("Checking context and shaping the answer")).toBeInTheDocument();
    expect(screen.getAllByText("Thinking").length).toBeGreaterThan(0);
  });

  it("renders task activity as concrete transcript language", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="researching"
        toolCalls={[]}
        statusEvents={[]}
        snapshot={{
          phase: "tooling",
          summaryText: null,
          latestStatusText: "Task task_00000000001: running",
          latestStatusMeta: "Task • task_00000000001 • 840ms",
          latestToolName: "task_00000000001",
          currentActionText: "Running task task_00000000001",
          currentActionMeta: "Task • task_00000000001 • 840ms",
          currentActionKind: "task",
          transcriptEntries: [
            {
              id: "task-1",
              kind: "task",
              text: "Running task task_00000000001",
              timestamp: Date.now() - 800,
              meta: "Task • 840ms",
              state: "active",
            },
          ],
          workStartedAt: Date.now() - 1200,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getAllByText("Running task task_00000000001").length).toBeGreaterThan(0);
    expect(screen.getByText("Task • task_00000000001 • 840ms")).toBeInTheDocument();
    expect(screen.getByText("Task • 840ms")).toBeInTheDocument();
  });

  it("collapses to a minimal handoff during final reply reveal", () => {
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
          currentActionText: "Preparing the final reply",
          currentActionMeta: "Final reply",
          currentActionKind: "transition",
          transcriptEntries: [],
          workStartedAt: Date.now() - 1800,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: true,
          replyRevealStarted: true,
        }}
      />
    );

    expect(screen.getByText("Preparing the final reply")).toBeInTheDocument();
    expect(screen.queryByText(/Working for/)).not.toBeInTheDocument();
  });

  it("keeps cache hits explicit in the transcript", () => {
    render(
      <BotProcessRail
        isStreaming={false}
        stage="writing"
        toolCalls={[]}
        statusEvents={[]}
        snapshot={{
          phase: "reply_ready",
          summaryText: "Reusing a cached answer",
          latestStatusText: "Using cached response",
          latestStatusMeta: null,
          latestToolName: null,
          currentActionText: "Reusing a cached answer",
          currentActionMeta: "Final reply",
          currentActionKind: "transition",
          transcriptEntries: [
            {
              id: "cache-1",
              kind: "transition",
              text: "Using cached response",
              timestamp: Date.now() - 1000,
              meta: "Completed",
              state: "done",
            },
          ],
          workStartedAt: Date.now() - 1200,
          hasTools: false,
          isCacheHit: true,
          isReplyReplay: true,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getByText("Reusing a cached answer")).toBeInTheDocument();
    expect(screen.getByText("Using cached response")).toBeInTheDocument();
  });

  it("shows compact error handoff without implying a final reply", () => {
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
          currentActionText: "Something interrupted the reply.",
          currentActionMeta: "Needs attention",
          currentActionKind: "status",
          transcriptEntries: [],
          workStartedAt: Date.now() - 1000,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: true,
          replyRevealStarted: true,
        }}
      />
    );

    expect(screen.getByText("Something interrupted the reply.")).toBeInTheDocument();
    expect(screen.queryByText("Preparing the final reply")).not.toBeInTheDocument();
  });
});
