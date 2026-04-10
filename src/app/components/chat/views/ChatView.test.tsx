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
          hasTools: false,
          isCacheHit: false,
          isReplyReplay: false,
          replyRevealStarted: false,
        }}
      />
    );

    expect(screen.getByText("Running task")).toBeInTheDocument();
    expect(screen.getByText(/Working for|Worked for/)).toBeInTheDocument();
    expect(screen.getByText("Task task_00000000001: running")).toBeInTheDocument();
  });
});
