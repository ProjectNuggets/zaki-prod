import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";

jest.mock("../index", () => ({
  MessageBubble: ({
    message,
    showSourceChip,
    botMode,
  }: {
    message: { id?: string; content: string };
    showSourceChip?: boolean;
    botMode?: boolean;
  }) => (
    <div
      data-testid={message.id ? `message-bubble-${message.id}` : undefined}
      data-show-source-chip={String(showSourceChip)}
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

  it("hides source chips for bot mode messages because provenance lives in the Agent panel", () => {
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
      "data-show-source-chip",
      "false"
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

  it("renders artifact and source evidence under agent replies with wired panel actions", () => {
    const openArtifacts = jest.fn();
    const openSources = jest.fn();

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
          ],
        }}
        isHistoryLoading={false}
        isStreaming={false}
        botMode
        firstMessageTransition={false}
        onOpenAgentArtifacts={openArtifacts}
        onOpenAgentSources={openSources}
      />
    );

    expect(
      within(screen.getByTestId("agent-reply-artifact")).getByText("launch-brief.md")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-reply-touched")).getByText("docs/ui-handoff.md")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-reply-touched")).getByText("sources")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-reply-touched")).getByText("example.com")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("agent-reply-touched")).getByText("website")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open in panel/i }));
    fireEvent.click(
      within(screen.getByTestId("agent-reply-touched")).getByRole("button", {
        name: /docs\/ui-handoff\.md/i,
      })
    );

    expect(openArtifacts).toHaveBeenCalledTimes(1);
    expect(openSources).toHaveBeenCalledTimes(1);
  });
});
