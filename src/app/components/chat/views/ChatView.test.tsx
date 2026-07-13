import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("../index", () => ({
  MessageBubble: ({
    message,
    botMode,
  }: {
    message: { id?: string; content: string };
    botMode?: boolean;
  }) => (
    <div
      data-testid={message.id ? `message-bubble-${message.id}` : undefined}
      data-bot-mode={String(botMode)}
    >
      {message.content}
    </div>
  ),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

import { ChatView } from "./ChatView";

describe("ChatView", () => {
  it("renders a Thinking shimmer while streaming with no timeline content", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Help me with this task." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.getAllByText("Thinking").length).toBeGreaterThan(0);
  });

  it("surfaces the active agent narration frame when the turn has no concrete tool rows yet", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Check the repo." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
        botMode
        nullalisNarrationFrame={{
          id: "n1",
          phase: "thinking",
          label: "Reading backend contract",
          tool: "agent_bff",
          timestamp: Date.now(),
        }}
        firstMessageTransition={false}
      />
    );

    expect(screen.getByText("Reading backend contract")).toBeInTheDocument();
    expect(screen.getAllByText("agent_bff").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("thinking: Reading backend contract");
  });

  it("threads bot mode through to the message bubble", () => {
    render(
      <ChatView
        messages={[
          { id: "assistant-1", role: "assistant", content: "Done." },
        ]}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.getByTestId("message-bubble-assistant-1")).toHaveAttribute(
      "data-bot-mode",
      "true"
    );
  });

  it("collapses the trail into 'Worked for' once final reply starts", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Help me with this task." },
          { id: "assistant-1", role: "assistant", content: "Here is the answer." },
        ]}
        isHistoryLoading={false}
        isStreaming
        botMode
        botReplyStart={{ id: "1", timestamp: Date.now() }}
        turnStartedAt={Date.now() - 5000}
        nullalisTranscriptEntries={[
          {
            id: "e1",
            kind: "narration",
            text: "I checked the repo layout and identified the failing test file.",
            timestamp: Date.now() - 2000,
            phase: "thinking",
            source: "reasoning_summary",
          },
        ]}
        firstMessageTransition={false}
      />
    );

    expect(screen.getByText(/Worked for/)).toBeInTheDocument();
  });

  it("keeps completed active narration before the final Agent reply", () => {
    const now = Date.now();
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Schedule a reminder." },
          { id: "assistant-1", role: "assistant", content: "Done. I scheduled it." },
        ]}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        turnStartedAt={now - 5000}
        nullalisTranscriptEntries={[
          {
            id: "tool-1",
            kind: "tool",
            text: "schedule completed",
            timestamp: now - 2000,
            tool: "schedule",
            inputPreview: "structured input",
            resultState: "done",
            source: "tool",
          },
        ]}
        firstMessageTransition={false}
      />
    );

    const timeline = screen.getByText(/Worked for/).closest(".zaki-agent-timeline");
    const reply = screen.getByTestId("message-bubble-assistant-1");

    expect(timeline).toBeInTheDocument();
    expect(
      Boolean(timeline && (timeline.compareDocumentPosition(reply) & Node.DOCUMENT_POSITION_FOLLOWING))
    ).toBe(true);
  });

  it("does not render a second expandable narration trail after a completed Agent reply", () => {
    const now = Date.now();
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Schedule a reminder." },
          { id: "assistant-1", role: "assistant", content: "Done. I scheduled it." },
        ]}
        replayTimelines={{
          "assistant-1": [
            {
              id: "tool-replay-1",
              kind: "tool",
              text: "schedule completed",
              timestamp: now - 1000,
              tool: "schedule",
              inputPreview: "structured input",
              resultState: "done",
              source: "tool",
            },
          ],
        }}
        nullalisTranscriptEntries={[
          {
            id: "tool-active-1",
            kind: "tool",
            text: "schedule completed",
            timestamp: now,
            tool: "schedule",
            inputPreview: "structured input",
            resultState: "done",
            source: "tool",
          },
        ]}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    const timelines = document.querySelectorAll(".zaki-agent-timeline");
    expect(timelines).toHaveLength(1);
    expect(screen.getAllByText(/Worked for/)).toHaveLength(1);
  });

  it("keeps active background tasks visible beside a replayed turn timeline", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Research this in the background." },
          {
            id: "assistant-1",
            role: "assistant",
            content: "I started the background research.",
          },
        ]}
        replayTimelines={{
          "assistant-1": [
            {
              id: "tool-replay-1",
              kind: "tool",
              text: "Delegated research started.",
              timestamp: Date.now(),
              tool: "delegate",
              resultState: "done",
              source: "tool",
            },
          ],
        }}
        nullalisTaskItems={[
          {
            taskId: "task-background-1",
            status: "running",
            description: "Waiting for delegated research result",
            progressPct: 55,
            updatedAt: Date.now(),
          },
        ]}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.getByText("Waiting for delegated research result")).toBeVisible();
    expect(screen.getByText("55%")).toBeVisible();
  });

  it("renders the nullalis turn timeline with reasoning block inline", () => {
    const longReasoning =
      "I need to read the repo structure, identify the failing test, and then decide whether the fix belongs in the controller or the service layer before making changes.";
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Do it." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
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
            text: longReasoning,
            timestamp: Date.now(),
            phase: "thinking",
            source: "reasoning_summary",
          },
        ]}
        firstMessageTransition={false}
      />
    );

    expect(screen.getByText(longReasoning)).toBeInTheDocument();
    expect(screen.getByText("Analyzing request...")).toBeInTheDocument();
    expect(screen.getByText(/1 step/)).toBeInTheDocument();
  });

  it("keeps collapsed Agent tool rows display-safe while Trace can retain raw payload detail", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Click the send button." },
          { id: "assistant-1", role: "assistant", content: "" },
        ]}
        isHistoryLoading={false}
        isStreaming
        botMode
        nullalisMode
        nullalisTranscriptEntries={[
          {
            id: "tool-1",
            kind: "tool",
            text: "Extension click completed.",
            timestamp: Date.now(),
            tool: "extension_click",
            inputPreview: '{"eventType":"tool_start","tool":"extension_click","selector":"#send"}',
            outputPreview: '{"type":"tool_result","tool":"extension_click","success":true}',
            resultState: "done",
            source: "tool",
          },
        ]}
        firstMessageTransition={false}
      />
    );

    expect(screen.getByText("Ran extension_click")).toBeInTheDocument();
    expect(screen.queryByText(/selector/)).not.toBeInTheDocument();
    expect(screen.queryByText(/tool_result/)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("thinking:");
  });

  it("keeps artifact, source, and memory evidence out of the Agent reply footer", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Create the brief." },
          { id: "assistant-1", role: "assistant", content: "Done." },
        ]}
        replayTimelines={{
          "assistant-1": [
            {
              id: "artifact-1",
              kind: "tool",
              intent: "final",
              text: "Generated the brief.",
              timestamp: 2,
              phase: "artifact_event",
              tool: "produce_document",
              files: ["launch-brief.md"],
              resultSummary: "Created a launch brief for review.",
              resultState: "done",
            },
            {
              id: "source-1",
              kind: "tool",
              intent: "context",
              text: "Read source file.",
              timestamp: 1,
              tool: "read_file",
              files: ["docs/ui-handoff.md"],
              resultSummary: "Loaded the UI handoff.",
              resultState: "done",
            },
            {
              id: "source-2",
              kind: "tool",
              intent: "context",
              text: "Searched the web.",
              timestamp: 3,
              tool: "web_search",
              outputPreview: "Relevant source: https://example.com/research",
              resultSummary: "Relevant source: https://example.com/research",
              resultState: "done",
            },
            {
              id: "memory-1",
              kind: "tool",
              intent: "memory",
              text: "Loaded durable user memory.",
              timestamp: 4,
              resultSummary: "User prefers short answers.",
              resultState: "done",
            },
          ],
        }}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.getByTestId("message-bubble-assistant-1")).toHaveTextContent("Done.");
    expect(screen.queryByTestId("agent-reply-artifact")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-reply-sources")).not.toBeInTheDocument();
  });

  it("does not show internal context or runtime events as reply sources", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Check runtime." },
          { id: "assistant-1", role: "assistant", content: "Done." },
        ]}
        replayTimelines={{
          "assistant-1": [
            {
              id: "context-1",
              kind: "tool",
              intent: "context",
              text: "Gathering context",
              timestamp: 1,
              resultState: "done",
            },
            {
              id: "runtime-1",
              kind: "tool",
              intent: "context",
              tool: "runtime_info",
              text: "Completed",
              timestamp: 2,
              resultSummary: "Runtime info completed.",
              resultState: "done",
            },
            {
              id: "memory-1",
              kind: "tool",
              intent: "memory",
              text: "Retrieving memory",
              timestamp: 3,
              resultState: "done",
            },
          ],
        }}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.queryByTestId("agent-reply-sources")).not.toBeInTheDocument();
  });

  it("does not render quick replies inside the transcript", () => {
    render(
      <ChatView
        messages={[
          { id: "user-1", role: "user", content: "Review this GTM strategy." },
          {
            id: "assistant-1",
            role: "assistant",
            content: "The strategy needs a sharper beachhead, clearer pricing, and a lower-risk GTM plan.",
          },
        ]}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
      />
    );

    expect(screen.queryByTestId("quick-reply-chips")).not.toBeInTheDocument();
  });
});
