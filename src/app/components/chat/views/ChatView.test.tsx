import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("../index", () => ({
  MessageBubble: ({ message }: { message: { content: string } }) => <div>{message.content}</div>,
}));

import { ChatView } from "./ChatView";

describe("ChatView", () => {
  it("renders the bot process rail inline while ZAKI is streaming without reply text", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Help me with this task." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
        showBotTimeline
        botMode
        streamingMode="researching"
        firstMessageTransition={false}
        botStatusEvents={[
          {
            id: "status-1",
            text: "Task task_00000000001: running",
            timestamp: Date.now() - 1400,
            phase: "task",
            state: "update",
            taskId: "task_00000000001",
            source: "progress",
            durationMs: 840,
          },
        ]}
        botProcessSnapshot={{
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
              timestamp: Date.now() - 1000,
              meta: "Task • 840ms",
              state: "active",
            },
          ],
          workStartedAt: Date.now() - 1400,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getAllByText("Running task task_00000000001").length).toBeGreaterThan(0);
    expect(screen.getByText(/Working for|Worked for/)).toBeInTheDocument();
    expect(screen.queryByText("Task task_00000000001: running")).not.toBeInTheDocument();
  });

  it("does not keep a detached process panel visible once answer text is streaming", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Help me with this task." },
          { id: "assistant-1", role: "assistant", content: "Here is the answer." },
        ]}
        isHistoryLoading={false}
        isStreaming
        showBotTimeline
        botMode
        botProcessCompact={false}
        streamingMode="researching"
        firstMessageTransition={false}
        botStatusEvents={[]}
        botProcessSnapshot={{
          phase: "working",
          summaryText: null,
          latestStatusText: "Checking context and memory",
          latestStatusMeta: null,
          latestToolName: null,
          currentActionText: "Checking context and memory",
          currentActionMeta: "Thinking",
          currentActionKind: "narration",
          transcriptEntries: [],
          workStartedAt: Date.now() - 1400,
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.queryByText(/Working for|Worked for/)).not.toBeInTheDocument();
  });

  it("renders nullalis narration inline instead of the old process rail", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Do it." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
        showBotTimeline
        botMode
        nullalisMode
        nullalisNarrationFrame={{
          id: "n1",
          phase: "thinking",
          label: "Analyzing request...",
          timestamp: Date.now(),
        }}
        nullalisTranscriptEntries={[
          {
            id: "e1",
            kind: "narration",
            text: "Analyzing request",
            timestamp: Date.now(),
            phase: "thinking",
            source: "progress",
          },
        ]}
        nullalisTranscriptEntryCount={1}
        streamingMode="thinking"
        firstMessageTransition={false}
      />
    );

    expect(screen.getAllByText("Analyzing request").length).toBeGreaterThan(0);
    expect(screen.getByText(/Working for|Worked for/)).toBeInTheDocument();
  });
});
