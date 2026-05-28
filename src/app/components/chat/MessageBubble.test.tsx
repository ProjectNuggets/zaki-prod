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

  it("renders a Web chip by default for web-app messages", () => {
    const message: Message = {
      id: "1",
      role: "user",
      content: "hello",
    };
    render(<MessageBubble message={message} animate={false} />);
    const chip = document.querySelector('[data-testid="source-chip"]');
    expect(chip).not.toBeNull();
    expect(chip?.getAttribute("data-channel")).toBe("web");
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

    expect(screen.getByText("ZAKI")).toBeInTheDocument();
    expect(screen.getByText("v2 · final")).toBeInTheDocument();
    expect(document.querySelector(".zaki-message-rune")).not.toBeNull();
    expect(document.querySelector('[data-testid="source-chip"]')).toBeNull();
  });

  it("renders a Telegram chip when message originated from Telegram", () => {
    const message: Message = {
      id: "2",
      role: "user",
      content: "from phone",
      channel: "telegram",
      lane: "main",
      createdAt: new Date().toISOString(),
    };
    render(<MessageBubble message={message} animate={false} />);
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
