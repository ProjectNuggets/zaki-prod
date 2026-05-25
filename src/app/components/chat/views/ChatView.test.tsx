import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.mock("../index", () => ({
  MessageBubble: ({ message }: { message: { content: string } }) => <div>{message.content}</div>,
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

    expect(screen.getByText("Thinking")).toBeInTheDocument();
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
    expect(screen.getByText(/Working for/)).toBeInTheDocument();
  });
});
