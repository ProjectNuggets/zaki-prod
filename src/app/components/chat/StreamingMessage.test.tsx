import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { StreamingMessage } from "./StreamingMessage";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("StreamingMessage", () => {
  it("renders a pre-content assistant shell for final reply reveal in bot mode", () => {
    render(
      <StreamingMessage
        content=""
        isStreaming
        botMode
        streamingModeVariant="final_reply_reveal"
        streamingBadgeLabel="Final reply"
        streamingHelperText="Answer is ready"
      />
    );

    expect(screen.getByText("Final reply")).toBeInTheDocument();
    expect(screen.getByText("Answer is ready")).toBeInTheDocument();
    expect(screen.queryByText("ZAKI")).not.toBeInTheDocument();
    expect(screen.queryByText("v2 · live")).not.toBeInTheDocument();
  });

  it("keeps the final-reply badge visible while buffered content is revealed", () => {
    const { container } = render(
      <StreamingMessage
        content="Here is the answer."
        isStreaming
        botMode
        streamingModeVariant="final_reply_reveal"
        streamingBadgeLabel="Final reply"
        streamingHelperText="Answer is ready"
      />
    );

    expect(screen.getByText("Final reply")).toBeInTheDocument();
    expect(screen.queryByText("Answer is ready")).not.toBeInTheDocument();
    expect(container.textContent).toContain("Final reply");
  });

  it("does not leak runtime JSON while an Agent reply is streaming", () => {
    render(
      <StreamingMessage
        content={'{"type":"tool_result","tool":"shell","output_preview":"raw terminal output"}'}
        isStreaming
        botMode
        streamingModeVariant="final_reply_reveal"
        streamingBadgeLabel="Final reply"
      />
    );

    expect(screen.getByTestId("agent-runtime-suppressed")).toHaveTextContent("No final reply");
    expect(screen.queryByText(/tool_result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw terminal output/i)).not.toBeInTheDocument();
  });

  it("preserves generic thinking mode for non-bot streaming", () => {
    render(
      <StreamingMessage
        content=""
        isStreaming
        thinkingLabel="Thinking"
        thinkingPillLabel="Thinking"
      />
    );

    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });
});
