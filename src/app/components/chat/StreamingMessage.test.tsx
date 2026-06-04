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
