import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MessageBubble, type Message } from "./MessageBubble";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

describe("MessageBubble source chip", () => {
  it("marks assistant rows while the response is streaming", () => {
    const message: Message = {
      id: "streaming-1",
      role: "assistant",
      content: "working",
    };
    const { container } = render(<MessageBubble message={message} isStreaming animate={false} />);
    const row = container.querySelector(".zaki-message-row");
    expect(row).toHaveClass("is-streaming");
    expect(row).toHaveAttribute("data-streaming", "true");
  });

  it("does not render per-message source chips by default", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "hello",
    };
    render(<MessageBubble message={message} animate={false} />);
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("can hide source chips on product surfaces that carry provenance elsewhere", () => {
    const message: Message = {
      id: "agent-1",
      role: "assistant",
      content: "done",
    };
    render(<MessageBubble message={message} showSourceChip={false} animate={false} />);
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("renders Agent lane metadata without leaking web/main provenance chips", () => {
    const message: Message = {
      id: "agent-2",
      role: "assistant",
      content: "Done.",
      createdAt: "2026-05-27T09:30:00.000Z",
    };
    render(
      <MessageBubble
        message={message}
        botMode
        showSourceChip={false}
        animate={false}
      />
    );

    expect(screen.queryByText("ZAKI")).not.toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("v2 · final")).not.toBeInTheDocument();
    expect(document.querySelector(".zaki-message-rune")).not.toBeNull();
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("renders persisted Agent approval instructions as operational approval rows", () => {
    const message: Message = {
      id: "approval-1",
      role: "assistant",
      content:
        "Approval required for tool artifact_create (id=2, risk=low, reason=supervised_mutating_requires_approval). Use /approve 2 allow-once|deny",
    };

    render(
      <MessageBubble
        message={message}
        botMode
        showSourceChip={false}
        animate={false}
      />
    );

    expect(screen.getByTestId("approval-history-2")).toHaveTextContent("Approval requested");
    expect(screen.getByTestId("approval-history-2")).toHaveTextContent("artifact_create");
    expect(screen.queryByText(/Use \/approve/)).not.toBeInTheDocument();
  });

  it("does not leak malformed tool-call tag fragments in assistant replies", () => {
    const message: Message = {
      id: "tool-fragment-1",
      role: "assistant",
      content:
        "I created the report. (ool call>) <tool_result>{\"ok\":true}</tool_result> The document is ready.",
    };

    render(
      <MessageBubble
        message={message}
        botMode
        showSourceChip={false}
        animate={false}
      />
    );

    expect(screen.getByText(/I created the report/)).toBeInTheDocument();
    expect(screen.queryByText(/ool call/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tool_result/i)).not.toBeInTheDocument();
  });

  it("suppresses standalone runtime JSON in persisted Agent replies", () => {
    const message: Message = {
      id: "json-leak-1",
      role: "assistant",
      content: '{"type":"tool_result","tool":"shell","output_preview":"raw terminal output"}',
    };

    render(
      <MessageBubble
        message={message}
        botMode
        showSourceChip={false}
        animate={false}
      />
    );

    expect(screen.getByTestId("agent-runtime-suppressed")).toHaveTextContent("No final reply");
    expect(screen.queryByText(/tool_result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/raw terminal output/i)).not.toBeInTheDocument();
  });

  it("renders an explicit Telegram chip when a surface opts into source chips", () => {
    const message: Message = {
      id: "2",
      role: "user",
      content: "from phone",
      channel: "telegram",
      lane: "main",
      createdAt: new Date().toISOString(),
    };
    render(<MessageBubble message={message} showSourceChip animate={false} />);
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
