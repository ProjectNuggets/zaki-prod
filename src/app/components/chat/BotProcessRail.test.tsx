import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { BotProcessRail } from "./BotProcessRail";

describe("BotProcessRail", () => {
  it("shows a live fallback pulse while streaming with no status or tool events", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="thinking"
        toolCalls={[]}
        statusEvents={[]}
      />
    );

    expect(screen.getByText("Live Process")).toBeInTheDocument();
    expect(screen.getByText("Listening for live status from agent…")).toBeInTheDocument();
  });

  it("shows one-line latest progress while hiding the full status list when tool calls are present", () => {
    render(
      <BotProcessRail
        isStreaming
        stage="researching"
        statusEvents={[
          {
            id: "status-1",
            text: "Searching web",
            timestamp: Date.now(),
          },
        ]}
        toolCalls={[
          {
            id: "tool-1",
            requestId: "req-1",
            name: "web.search",
            arguments: { q: "latest news" },
            timestamp: Date.now(),
            startedAt: Date.now() - 120,
          },
        ]}
      />
    );

    expect(screen.getByText("Latest:")).toBeInTheDocument();
    expect(screen.getByText(/Searching web/)).toBeInTheDocument();
    expect(screen.getByText("web.search")).toBeInTheDocument();
  });
});
