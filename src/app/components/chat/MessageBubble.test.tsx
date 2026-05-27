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
